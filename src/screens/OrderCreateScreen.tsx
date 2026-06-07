import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PersonnelPicker } from '@/components/personnel/PersonnelPicker';
import { spacing, useThemeColors } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { createOrder } from '@/services/firebase/orders';
import { assignContactsToOrder } from '@/services/firebase/assignments';
import type { PendingAssignment, SavedContact, UserRole } from '@/types';
import { ScreenWithAds } from '@/components/ads/ScreenWithAds';

function mergePending(list: PendingAssignment[], next: PendingAssignment): PendingAssignment[] {
  const email = next.email.trim().toLowerCase();
  if (list.some((p) => p.email === email)) return list;
  return [...list, { ...next, email }];
}

export function OrderCreateScreen() {
  const colors = useThemeColors();
  const profile = useAuthStore((s) => s.profile);

  const [orderName, setOrderName] = useState('');
  const [workshopName, setWorkshopName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [responsiblePersonName, setResponsiblePersonName] = useState('');
  const [targetQuantity, setTargetQuantity] = useState('');
  const [dailyQuantityTarget, setDailyQuantityTarget] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');

  const [assignEmail, setAssignEmail] = useState('');
  const [assignName, setAssignName] = useState('');
  const [assignRole, setAssignRole] = useState<Exclude<UserRole, 'admin'>>('workshop');
  const [pendingAssigns, setPendingAssigns] = useState<PendingAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  const addManualToPending = () => {
    if (!assignEmail.trim() || !assignName.trim()) {
      Alert.alert('Eksik', 'E-posta ve ad girin veya listeden seçin.');
      return;
    }
    setPendingAssigns((prev) =>
      mergePending(prev, {
        email: assignEmail.trim().toLowerCase(),
        displayName: assignName.trim(),
        role: assignRole,
      })
    );
    setAssignEmail('');
    setAssignName('');
  };

  if (!profile) {
    return (
      <ScreenWithAds>
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
          <Text muted style={{ padding: spacing.lg }}>Oturum gerekli.</Text>
        </SafeAreaView>
      </ScreenWithAds>
    );
  }

  const handleCreate = async () => {
    if (!profile) return;

    const qty = Number.parseInt(targetQuantity, 10);
    if (!orderName.trim() || !workshopName.trim() || !responsiblePersonName.trim()) {
      Alert.alert('Eksik bilgi', 'Sipariş adı, atölye ve sorumlu kişi zorunludur.');
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      Alert.alert('Eksik bilgi', 'Geçerli bir hedef adet girin.');
      return;
    }

    let toAssign = [...pendingAssigns];
    if (assignEmail.trim() && assignName.trim()) {
      toAssign = mergePending(toAssign, {
        email: assignEmail.trim().toLowerCase(),
        displayName: assignName.trim(),
        role: assignRole,
      });
    }

    setLoading(true);
    try {
      const dailyTarget = dailyQuantityTarget.trim()
        ? Number.parseInt(dailyQuantityTarget, 10)
        : undefined;

      const orderId = await createOrder(profile, {
        orderName,
        workshopName,
        startDate,
        responsiblePersonName,
        targetQuantity: qty,
        dailyQuantityTarget:
          dailyTarget != null && Number.isFinite(dailyTarget) && dailyTarget > 0
            ? dailyTarget
            : undefined,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
      });

      if (toAssign.length > 0) {
        const assignments = await assignContactsToOrder(
          profile,
          orderId,
          orderName.trim(),
          toAssign
        );
        Alert.alert(
          'Sipariş oluşturuldu',
          `${toAssign.length} kişiye davet gönderildi.\n\nİlk kod: ${assignments[0]?.inviteCode ?? ''}`
        );
      }

      router.replace(`/(app)/orders/${orderId}`);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Sipariş oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWithAds>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text variant="hero">Yeni Sipariş</Text>
          <Button title="Geri" variant="ghost" onPress={() => router.back()} />
        </View>

        <Card padding="lg" style={styles.section}>
          <Text variant="subtitle">Sipariş Bilgileri</Text>
          <Input label="Sipariş Adı" value={orderName} onChangeText={setOrderName} placeholder="Örn: U 3650" />
          <Input label="Atölye Adı" value={workshopName} onChangeText={setWorkshopName} placeholder="Atölye" />
          <Input label="Başlama Tarihi" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
          <Input
            label="Sorumlu Kişi"
            value={responsiblePersonName}
            onChangeText={setResponsiblePersonName}
            placeholder="Ad Soyad"
          />
          <Input
            label="Hedef Adet"
            value={targetQuantity}
            onChangeText={setTargetQuantity}
            keyboardType="number-pad"
            placeholder="2500"
          />
          <Input
            label="Günlük Hedef Adet (opsiyonel)"
            value={dailyQuantityTarget}
            onChangeText={setDailyQuantityTarget}
            keyboardType="number-pad"
            placeholder="Tam iş günü hedefi; cumartesi yarım, pazar/tatil hariç"
          />
          <Input
            label="Teslim Tarihi (opsiyonel)"
            value={expectedDeliveryDate}
            onChangeText={setExpectedDeliveryDate}
            placeholder="YYYY-MM-DD"
          />
        </Card>

        <Card padding="lg" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="subtitle">Personel Ata (opsiyonel)</Text>
            <Button title="Rehber" variant="ghost" onPress={() => router.push('/(app)/personnel')} />
          </View>
          <PersonnelPicker
            orgId={profile.orgId}
            selectedEmails={pendingAssigns.map((p) => p.email)}
            onSelectContact={(contact: SavedContact) => {
              setAssignEmail(contact.email);
              setAssignName(contact.displayName);
              setAssignRole(contact.defaultRole);
            }}
            onSelectGroup={(members) => {
              setPendingAssigns((prev) => {
                let next = [...prev];
                for (const m of members) {
                  next = mergePending(next, m);
                }
                return next;
              });
            }}
          />
          <Input label="E-posta" value={assignEmail} onChangeText={setAssignEmail} autoCapitalize="none" />
          <Input label="Ad Soyad" value={assignName} onChangeText={setAssignName} />
          <View style={styles.roleRow}>
            <Button
              title="Atölye"
              variant={assignRole === 'workshop' ? 'primary' : 'secondary'}
              onPress={() => setAssignRole('workshop')}
              style={styles.roleBtn}
            />
            <Button
              title="Takip Elemanı"
              variant={assignRole === 'tracker' ? 'primary' : 'secondary'}
              onPress={() => setAssignRole('tracker')}
              style={styles.roleBtn}
            />
          </View>
          <Button title="Listeye Ekle" variant="secondary" onPress={addManualToPending} fullWidth />
          {pendingAssigns.length > 0 ? (
            <View style={styles.pendingBox}>
              <Text variant="caption" muted>
                Atanacaklar ({pendingAssigns.length})
              </Text>
              {pendingAssigns.map((p) => (
                <View key={p.email} style={styles.pendingRow}>
                  <Text variant="caption">
                    {p.displayName} · {p.email}
                  </Text>
                  <Button
                    title="Kaldır"
                    variant="ghost"
                    onPress={() =>
                      setPendingAssigns((prev) => prev.filter((x) => x.email !== p.email))
                    }
                  />
                </View>
              ))}
            </View>
          ) : null}
        </Card>

        <Button title="Siparişi Kaydet" onPress={handleCreate} loading={loading} fullWidth />
      </ScrollView>
    </SafeAreaView>
    </ScreenWithAds>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: { gap: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleRow: { flexDirection: 'row', gap: spacing.sm },
  roleBtn: { flex: 1 },
  pendingBox: { gap: spacing.xs },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
