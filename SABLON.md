# FLOW — Uygulama Şablonu

Tekstil fason üretim takip uygulamasının mimari, veri modeli ve iş akışı referansı.

---

## Genel Bakış

| Alan | Değer |
|------|-------|
| Uygulama adı | FLOW |
| Amaç | Sipariş bazlı Kesim / Dikim / Ütü / Paket üretim takibi |
| Platform | iOS + Android (Expo SDK 56, React Native 0.85) |
| Backend | Firebase Auth + Cloud Firestore |
| Bundle ID | `com.sinannergiz.flow` |
| Durum yönetimi | Zustand |
| Navigasyon | Expo Router (file-based) |

---

## Kullanıcı Rolleri

| Rol | Kod | Yetkiler |
|-----|-----|----------|
| Yönetici | `admin` | Sipariş oluşturma, personel atama, rehber, tüm kayıtları görme/düzenleme |
| Atölye | `workshop` | Atanan siparişleri görme, üretim girişi (10 dk düzenleme) |
| Takip elemanı | `tracker` | Atölye ile aynı |

---

## Kimlik Doğrulama Akışları

### 1. Yönetici kaydı (ilk kurulum)

```
Hesap Oluştur → Firebase Auth (email/şifre)
              → organizations koleksiyonu (firma)
              → users koleksiyonu (role: admin, orgId)
              → AsyncStorage oturum
              → Dashboard
```

### 2. Yönetici girişi

```
Yönetici Girişi → signInWithEmailAndPassword
                → users/{uid} role === admin doğrulama
                → Dashboard
```

### 3. Personel davet girişi

```
Davet Kodu → orderAssignments (email + 6 haneli kod)
           → Firebase Auth (kod = ilk şifre)
           → users profili oluştur/güncelle
           → assignedOrderIds senkron
           → Dashboard (yalnızca atanan siparişler)
```

### 4. Şifre sıfırlama (yeni)

```
Şifremi unuttum → requestPasswordReset(email)
                → Firebase sendPasswordResetEmail
                → Kullanıcı e-postadaki bağlantı ile yeni şifre belirler

Yönetici  → Yönetici Girişi sekmesinde yeni şifre ile girer
Personel  → Davet Kodu sekmesinde e-posta + yeni şifre ile girer
            (davet kodu hâlâ geçerli; şifre sıfırlandıysa yeni şifre kullanılır)
```

---

## Ekran Haritası

```
/login                          Giriş (3 sekme + şifre sıfırlama)
/(app)/dashboard                Sipariş listesi
/(app)/orders/create            Yeni sipariş (admin)
/(app)/orders/[id]              Sipariş detay + üretim girişi + atama
/(app)/personnel                Personel rehberi + gruplar (admin)
```

---

## Üretim İş Akışı

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│ Admin       │────▶│ Sipariş      │────▶│ Personel atama      │
│ hesap açar  │     │ oluşturur    │     │ (email + davet kodu)│
└─────────────┘     └──────────────┘     └─────────────────────┘
                                                    │
                                                    ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│ İlerleme    │◀────│ Dashboard    │◀────│ Personel giriş yapar│
│ % görünür   │     │ sipariş list │     │ (davet kodu/şifre)  │
└─────────────┘     └──────────────┘     └─────────────────────┘
       ▲
       │  Kesim / Dikim / Ütü / Paket girişleri
       │  (10 dk içinde düzenlenebilir, sonra admin)
       └──────────────────────────────────────────
```

**Aşamalar:** Kesim → Dikim → Ütü → Paket (KDP yok)

**Kilit kuralı:** Personel kendi girişini oluşturduktan sonra 10 dakika düzenleyebilir; sonrasında yalnızca admin.

---

## Firestore Veri Modeli

### `organizations/{orgId}`

```typescript
{
  name: string;           // Firma / atölye adı
  createdBy: string;      // admin uid
  createdAt: Timestamp;
}
```

### `users/{userId}`

```typescript
{
  email: string;
  displayName: string;
  role: 'admin' | 'workshop' | 'tracker';
  orgId: string;
  organizationName?: string;
  assignedOrderIds?: string[];  // personel için
  createdAt?: Timestamp;
}
```

### `orders/{orderId}`

```typescript
{
  orgId: string;
  orderName: string;
  workshopName: string;
  startDate: string;              // YYYY-MM-DD
  responsiblePersonName: string;
  targetQuantity: number;
  expectedDeliveryDate?: string;
  status: 'kesim' | 'dikim' | 'utu' | 'paket';
  stageTotals: { kesim, dikim, utu, paket: number };
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `orders/{orderId}/productionEntries/{entryId}`

```typescript
{
  operationType: 'Kesim' | 'Dikim' | 'Ütü' | 'Paket';
  quantity: number;
  date: Timestamp;
  note?: string;
  userId: string;
  userDisplayName: string;
  userRole: UserRole;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### `orderAssignments/{assignmentId}`

```typescript
{
  orgId: string;
  orderId: string;
  orderName: string;
  email: string;
  displayName: string;
  role: 'workshop' | 'tracker';
  inviteCode: string;       // 6 haneli, ilk şifre
  createdBy: string;
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
  userId?: string;
}
```

### `savedContacts/{contactId}`

```typescript
{
  orgId: string;
  email: string;
  displayName: string;
  defaultRole: 'workshop' | 'tracker';
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `contactGroups/{groupId}`

```typescript
{
  orgId: string;
  name: string;
  contactIds: string[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Dosya Yapısı

```
flow/
├── app/                          # Expo Router rotaları
│   ├── _layout.tsx               # Root layout, auth guard, global hata yakalama
│   ├── login.tsx
│   ├── index.tsx
│   └── (app)/
│       ├── _layout.tsx
│       ├── dashboard.tsx
│       ├── personnel.tsx
│       └── orders/
│           ├── create.tsx
│           └── [id].tsx
├── src/
│   ├── screens/                  # Ekran bileşenleri
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── OrderCreateScreen.tsx
│   │   ├── OrderDetailScreen.tsx
│   │   └── PersonnelScreen.tsx
│   ├── components/
│   │   ├── ui/                   # Button, Input, Card, Text, ProgressBar
│   │   ├── personnel/            # PersonnelPicker
│   │   ├── AppErrorBoundary.tsx
│   │   └── FatalErrorOverlay.tsx
│   ├── services/
│   │   ├── firebase/
│   │   │   ├── config.ts         # Firebase init
│   │   │   ├── inviteAuth.ts     # Kayıt, giriş, şifre sıfırlama
│   │   │   ├── orders.ts
│   │   │   ├── assignments.ts
│   │   │   ├── productionEntries.ts
│   │   │   ├── contacts.ts
│   │   │   ├── contactGroups.ts
│   │   │   └── auditLog.ts
│   │   ├── rbac.ts               # Yetki kontrolleri
│   │   └── productionProgress.ts # İlerleme hesaplama
│   ├── store/
│   │   ├── authStore.ts          # Zustand auth state
│   │   └── fatalErrorStore.ts
│   ├── constants/
│   │   ├── theme.ts
│   │   ├── roles.ts
│   │   └── production.ts
│   ├── types/index.ts
│   └── utils/globalErrorHandlers.ts
├── firestore.rules
├── firestore.indexes.json
├── app.config.js                 # Firebase fallback config (Release)
├── app.json
└── scripts/
    ├── ios-prepare.sh
    ├── ios-open-xcode.sh
    └── ios-archive.sh
```

---

## Servis Katmanı Özeti

| Servis | Sorumluluk |
|--------|------------|
| `inviteAuth.ts` | Kayıt, admin girişi, davet girişi, oturum, şifre sıfırlama |
| `orders.ts` | CRUD + `subscribeOrdersForUser` (orgId filtreli) |
| `assignments.ts` | Davet oluşturma, gruplu atama, mailto davet |
| `productionEntries.ts` | Aşama girişleri, toplam güncelleme |
| `contacts.ts` | Personel rehberi |
| `contactGroups.ts` | Toplu atama grupları |
| `rbac.ts` | Rol bazlı erişim kuralları |

---

## Multi-Tenant İzolasyon

- Her kayıtta `orgId` zorunlu
- Firestore sorguları `where('orgId', '==', profile.orgId)` ile filtrelenir
- Kurallar `userOrgId()` ile çapraz org erişimini engeller
- Personel yalnızca `assignedOrderIds` içindeki siparişleri görür

---

## Firebase Kurulum Checklist

1. Firebase Console → Authentication → **Email/Password** etkin
2. Firestore Database oluştur
3. `firebase deploy --only firestore` (rules + indexes)
4. `GoogleService-Info.plist` (iOS) ve `google-services.json` (Android)
5. `.env` veya `app.config.js` → `EXPO_PUBLIC_FIREBASE_*` değişkenleri

---

## iOS TestFlight Build

```bash
cd ~/Projects/flow
npm run ios:prepare      # pod install, native sync
npm run ios:xcode        # Xcode aç
# Product → Archive → Distribute → TestFlight
```

---

## npm Scriptleri

| Komut | Açıklama |
|-------|----------|
| `npm start` | Expo dev server |
| `npm run ios` | Simulator build |
| `npm run ios:prepare` | Native proje hazırlığı |
| `npm run ios:xcode` | Xcode workspace aç |
| `npm run ios:archive` | Archive script |

---

## Yeni Özellik Ekleme Rehberi

### Yeni ekran

1. `src/screens/YeniEkran.tsx` oluştur
2. `app/(app)/yeni-ekran.tsx` → ekranı export et
3. Gerekirse `rbac.ts`'e yetki ekle
4. Firestore koleksiyonu varsa `firestore.rules` güncelle

### Yeni Firestore koleksiyonu

1. `src/types/index.ts` → interface
2. `src/services/firebase/` → CRUD + subscribe
3. `firestore.rules` → orgId izolasyonu
4. `firestore.indexes.json` → composite index (gerekirse)
5. `firebase deploy --only firestore`

---

## Versiyon Geçmişi (özet)

| Versiyon | Build | Notlar |
|----------|-------|--------|
| 1.0.1 | 2 | İlk TestFlight |
| 1.0.2 | 3 | Crash hardening |
| 1.0.3 | 4 | Global error handler, şifre sıfırlama |

---

*Bu dosya FLOW uygulamasının canlı şablonudur. Kod değiştikçe güncellenmelidir.*
