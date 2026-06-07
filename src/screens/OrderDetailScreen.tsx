import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProductionAlertsTable } from '@/components/alerts/ProductionAlertsTable';
import { ScreenWithAds } from '@/components/ads/ScreenWithAds';
import { spacing, useThemeColors, radius } from '@/constants/theme';
import { OPERATION_TYPES, PRODUCTION_STATUSES, EDIT_LOCK_MINUTES } from '@/constants/production';
import { useAuthStore } from '@/store/authStore';
import { subscribeOrder } from '@/services/firebase/orders';
import {
  subscribeProductionEntries,
  addProductionEntry,
  updateProductionEntry,
} from '@/services/firebase/productionEntries';
import {
  createAssignment,
  sendInviteEmail,
  assignContactsToOrder,
  subscribeAssignmentsForOrder,
} from '@/services/firebase/assignments';
import { PersonnelPicker } from '@/components/personnel/PersonnelPicker';
import { calculateStageProgress, getOrderOverallProgress } from '@/services/productionProgress';
import { evaluateOrderAlerts, computeBaseDailyTarget, getDailyTargetForDate, getWorkDayLabel } from '@/services/productionAlerts';
import { syncOrderAlerts, subscribeAlertsForOrder } from '@/services/firebase/alerts';
import { canAssignPeople, canEditProductionEntry, canViewOrder, isEntryLocked } from '@/services/rbac';
import type { OperationType, Order, OrderAssignment, PendingAssignment, ProductionAlert, ProductionEntry, SavedContact, UserRole } from '@/types';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const profile = useAuthStore((s) => s.profile);

  const [order, setOrder] = useState<Order | null>(null);
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [assignments, setAssignments] = useState<OrderAssignment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [operationType, setOperationType] = useState<OperationType>('Kesim');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [newAssignEmail, setNewAssignEmail] = useState('');
  const [newAssignName, setNewAssignName] = useState('');
  const [newAssignRole, setNewAssignRole] = useState<Exclude<UserRole, 'admin'>>('workshop');

  const [editEntry, setEditEntry] = useState<ProductionEntry | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [storedAlerts, setStoredAlerts] = useState<ProductionAlert[]>([]);

  useEffect(() => {
    if (!id || !profile) return;

    const denied = (order: Order | null) => {
      if (order && !canViewOrder(profile, order.id, order)) {
        setAccessDenied(true);
        Alert.alert('Erişim yok', 'Bu siparişe erişim yetkiniz yok.', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
      }
    };

    const unsubOrder = subscribeOrder(
      id,
      (next) => {
        setOrder(next);
        denied(next);
      },
      (err) => {
        setAccessDenied(true);
        Alert.alert('Bağlantı hatası', err.message, [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
      }
    );
    const unsubEntries = subscribeProductionEntries(id, setEntries, (err) => {
      Alert.alert('Bağlantı hatası', err.message);
    });
    const unsubAssignments = subscribeAssignmentsForOrder(id, setAssignments, (err) => {
      Alert.alert('Bağlantı hatası', err.message);
    });
    const unsubAlerts = subscribeAlertsForOrder(id, setStoredAlerts);

    return () => {
      unsubOrder();
      unsubEntries();
      unsubAssignments();
      unsubAlerts();
    };
  }, [id, profile]);

  useEffect(() => {
    if (!order) return;
    void syncOrderAlerts(order, entries).catch(() => {});
  }, [order, entries]);

  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshing(false);
  };

  const handleAddEntry = async () => {
    if (!profile || !order) return;
    const qty = Number.parseInt(quantity, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      Alert.alert('Hata', 'Geçerli adet girin.');
      return;
    }
    setSaving(true);
    try {
      await addProductionEntry(profile, order.id, {
        operationType,
        quantity: qty,
        date,
        note: note.trim() || undefined,
      });
      setQuantity('');
      setNote('');
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Kayıt başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const openEditEntry = (entry: ProductionEntry) => {
    if (!profile) return;
    if (isEntryLocked(profile, entry)) {
      Alert.alert('Kilitli', `Giriş ${EDIT_LOCK_MINUTES} dk sonra kilitlenir. Yönetici düzeltebilir.`);
      return;
    }
    setEditEntry(entry);
    setEditQuantity(String(entry.quantity));
  };

  const handleSaveEdit = async () => {
    if (!profile || !order || !editEntry) return;
    const qty = Number.parseInt(editQuantity, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      Alert.alert('Hata', 'Geçerli adet girin.');
      return;
    }
    setEditSaving(true);
    try {
      await updateProductionEntry(profile, order.id, editEntry.id, editEntry, { quantity: qty });
      setEditEntry(null);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Güncellenemedi.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!profile || !order) return;
    if (!canAssignPeople(profile.role)) return;
    if (!newAssignEmail.trim() || !newAssignName.trim()) {
      Alert.alert('Eksik', 'E-posta ve ad gerekli veya rehberden seçin.');
      return;
    }
    try {
      const assignment = await createAssignment(profile, {
        orderId: order.id,
        orderName: order.orderName,
        email: newAssignEmail,
        displayName: newAssignName,
        role: newAssignRole,
      });
      await sendInviteEmail(assignment);
      Alert.alert('Davet', `Kod: ${assignment.inviteCode}\nMail uygulaması açıldı.`);
      setNewAssignEmail('');
      setNewAssignName('');
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Atama başarısız.');
    }
  };

  const handleAssignGroup = async (members: PendingAssignment[], groupName: string) => {
    if (!profile || !order) return;
    try {
      const assignments = await assignContactsToOrder(profile, order.id, order.orderName, members);
      Alert.alert(
        'Grup atandı',
        `"${groupName}" — ${assignments.length} kişiye davet gönderildi.`
      );
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Grup ataması başarısız.');
    }
  };

  if (!order || accessDenied) {
    return (
      <ScreenWithAds>
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
          <Text muted style={{ padding: spacing.lg }}>Yükleniyor...</Text>
        </SafeAreaView>
      </ScreenWithAds>
    );
  }

  const progress = getOrderOverallProgress(order);
  const stages = calculateStageProgress(order);
  const liveAlerts = evaluateOrderAlerts(order, entries);
  const displayAlerts = storedAlerts.length > 0 ? storedAlerts : liveAlerts;
  const today = todayIso();
  const todayDailyTarget = getDailyTargetForDate(order, today);
  const fullDayTarget = computeBaseDailyTarget(order);
  const workDayLabel = getWorkDayLabel(today);

  return (
    <ScreenWithAds>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="hero">{order.orderName}</Text>
            <Text muted>
              {order.workshopName} · {order.responsiblePersonName}
            </Text>
          </View>
          <Button title="Geri" variant="ghost" onPress={() => router.back()} />
        </View>

        <Card padding="lg" style={styles.section}>
          <Text variant="subtitle">Özet</Text>
          <Text muted>Başlangıç: {order.startDate}</Text>
          {order.expectedDeliveryDate ? (
            <Text muted>Teslim: {order.expectedDeliveryDate}</Text>
          ) : null}
          <Text muted>Durum: {PRODUCTION_STATUSES[order.status]}</Text>
          <Text muted>
            Bugün ({workDayLabel}):{' '}
            {todayDailyTarget > 0 ? `${todayDailyTarget} adet hedef` : 'üretim beklenmiyor'} · Tam gün
            hedefi: {fullDayTarget > 0 ? `${fullDayTarget} adet` : '—'} · Toplam: {order.targetQuantity}{' '}
            adet
          </Text>
          <ProgressBar progress={progress} label={`${progress}% tamamlandı`} />
          <View style={styles.stageRow}>
            {stages.map((s) => (
              <View key={s.stage} style={styles.stageItem}>
                <Text variant="caption" muted>
                  {s.label}
                </Text>
                <Text variant="caption">{s.produced}</Text>
              </View>
            ))}
          </View>
        </Card>

        <ProductionAlertsTable
          alerts={displayAlerts}
          emptyMessage="Bu sipariş için aktif sapma uyarısı yok."
        />

        <Card padding="lg" style={styles.section}>
          <Text variant="subtitle">Aşama Girişi</Text>
          <Text variant="caption" muted>
            Kesim · Dikim · Ütü · Paket — {EDIT_LOCK_MINUTES} dk içinde düzeltilebilir
          </Text>
          <View style={styles.opRow}>
            {OPERATION_TYPES.map((op) => (
              <Pressable
                key={op}
                onPress={() => setOperationType(op)}
                style={[
                  styles.opChip,
                  {
                    backgroundColor: operationType === op ? colors.accent : colors.inputBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  style={{ color: operationType === op ? colors.accentText : colors.text }}
                >
                  {op}
                </Text>
              </Pressable>
            ))}
          </View>
          <Input label="Tarih" value={date} onChangeText={setDate} />
          <Input label="Adet" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" large />
          <Input label="Not" value={note} onChangeText={setNote} placeholder="Opsiyonel" />
          <Button title="Kaydet" onPress={handleAddEntry} loading={saving} fullWidth />
        </Card>

        <Card padding="lg" style={styles.section}>
          <Text variant="subtitle">Takip Listesi</Text>
          {entries.length === 0 ? (
            <Text muted>Henüz giriş yok.</Text>
          ) : (
            entries.map((entry) => {
              const locked = profile ? isEntryLocked(profile, entry) : true;
              const canEdit = profile ? canEditProductionEntry(profile, entry) : false;
              return (
                <Pressable
                  key={entry.id}
                  onPress={() => canEdit && openEditEntry(entry)}
                  style={[styles.entryRow, { borderColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="label">
                      {entry.operationType} · {entry.quantity} adet
                    </Text>
                    <Text variant="caption" muted>
                      {entry.date} · {entry.userDisplayName}
                    </Text>
                  </View>
                  <Text variant="caption" style={{ color: locked ? colors.textMuted : colors.accent }}>
                    {locked ? '🔒' : 'Düzenle'}
                  </Text>
                </Pressable>
              );
            })
          )}
        </Card>

        {profile && canAssignPeople(profile.role) ? (
          <Card padding="lg" style={styles.section}>
            <View style={styles.assignHeader}>
              <Text variant="subtitle">Personel Ata</Text>
              <Button title="Rehber" variant="ghost" onPress={() => router.push('/(app)/personnel')} />
            </View>
            {assignments.map((a) => (
              <Text key={a.id} variant="caption" muted>
                {a.displayName} ({a.email}) · {a.role} · Kod: {a.inviteCode}
              </Text>
            ))}
            <PersonnelPicker
              orgId={profile.orgId}
              selectedEmails={assignments.map((a) => a.email)}
              onSelectContact={(contact: SavedContact) => {
                setNewAssignEmail(contact.email);
                setNewAssignName(contact.displayName);
                setNewAssignRole(contact.defaultRole);
              }}
              onSelectGroup={(members, groupName) => void handleAssignGroup(members, groupName)}
            />
            <Input label="E-posta" value={newAssignEmail} onChangeText={setNewAssignEmail} autoCapitalize="none" />
            <Input label="Ad Soyad" value={newAssignName} onChangeText={setNewAssignName} />
            <View style={styles.roleRow}>
              <Button
                title="Atölye"
                variant={newAssignRole === 'workshop' ? 'primary' : 'secondary'}
                onPress={() => setNewAssignRole('workshop')}
                style={styles.roleBtn}
              />
              <Button
                title="Takip Elemanı"
                variant={newAssignRole === 'tracker' ? 'primary' : 'secondary'}
                onPress={() => setNewAssignRole('tracker')}
                style={styles.roleBtn}
              />
            </View>
            <Button title="Davet Gönder" variant="secondary" onPress={handleAssign} fullWidth />
          </Card>
        ) : null}
      </ScrollView>

      <Modal visible={editEntry !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text variant="subtitle">Adet Düzelt</Text>
            {editEntry ? (
              <Text muted>
                {editEntry.operationType} — mevcut: {editEntry.quantity}
              </Text>
            ) : null}
            <Input label="Yeni adet" value={editQuantity} onChangeText={setEditQuantity} keyboardType="number-pad" />
            <View style={styles.modalActions}>
              <Button title="İptal" variant="ghost" onPress={() => setEditEntry(null)} />
              <Button title="Kaydet" onPress={handleSaveEdit} loading={editSaving} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </ScreenWithAds>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  section: { gap: spacing.sm },
  stageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  stageItem: { minWidth: '20%' },
  opRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  opChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  roleRow: { flexDirection: 'row', gap: spacing.sm },
  roleBtn: { flex: 1 },
  assignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
