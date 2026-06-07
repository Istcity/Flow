import { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useColorScheme,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { spacing, getThemeColors } from '@/constants/theme';
import { ROLES } from '@/constants/roles';
import { PRODUCTION_STATUSES } from '@/constants/production';
import { useAuthStore } from '@/store/authStore';
import { subscribeOrdersForUser } from '@/services/firebase/orders';
import { subscribeAlertsForUser } from '@/services/firebase/alerts';
import { AlertsPanel } from '@/components/alerts/AlertsPanel';
import { getOrderOverallProgress } from '@/services/productionProgress';
import { countActiveAlertsByOrder } from '@/services/productionAlerts';
import { canCreateOrder } from '@/services/rbac';
import type { Order, ProductionAlert } from '@/types';
import { ScreenWithAds } from '@/components/ads/ScreenWithAds';
import { registerAdTap } from '@/services/adMobService';

export function DashboardScreen() {
  const scheme = useColorScheme();
  const colors = getThemeColors(scheme === 'dark');
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [orders, setOrders] = useState<Order[]>([]);
  const [alerts, setAlerts] = useState<ProductionAlert[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.orgId) return;

    void refreshProfile().catch((err: unknown) => {
      setSyncError(err instanceof Error ? err.message : 'Profil güncellenemedi.');
    });

    const unsubscribe = subscribeOrdersForUser(
      profile,
      (next) => {
        setOrders(next);
        setSyncError(null);
      },
      (err) => setSyncError(err.message)
    );

    const unsubAlerts = subscribeAlertsForUser(profile, setAlerts);

    return () => {
      unsubscribe();
      unsubAlerts();
    };
  }, [profile, refreshProfile]);

  const onRefresh = async () => {
    if (!profile) return;
    setRefreshing(true);
    try {
      await refreshProfile();
      setSyncError(null);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Veri yüklenemedi.');
    } finally {
      setRefreshing(false);
    }
  };

  const roleLabel = profile ? ROLES[profile.role].label : '';
  const isAdmin = profile ? canCreateOrder(profile.role) : false;
  const alertCounts = countActiveAlertsByOrder(alerts);

  return (
    <ScreenWithAds>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.topBar}>
          <View>
            <Text variant="hero">Siparişler</Text>
            <Text muted>
              {profile?.displayName} · {roleLabel}
              {profile?.organizationName ? ` · ${profile.organizationName}` : ''}
            </Text>
            {syncError ? (
              <Text variant="caption" style={{ color: colors.error }}>
                Bağlantı hatası — aşağı çekerek yenileyin
              </Text>
            ) : (
              <Text variant="caption" muted>
                Bulut senkron · iOS ve Android ortak
              </Text>
            )}
          </View>
          <Button title="Çıkış" variant="ghost" onPress={signOut} />
        </View>

        {isAdmin ? (
          <>
            <Button
              title="+ Yeni Sipariş Oluştur"
              onPress={() => router.push('/(app)/orders/create')}
              fullWidth
            />
            <Button
              title="Personel Rehberi"
              variant="secondary"
              onPress={() => router.push('/(app)/personnel')}
              fullWidth
            />
          </>
        ) : null}

        <AlertsPanel alerts={alerts} />

        {orders.length === 0 ? (
          <Card padding="lg">
            <Text muted>
              {isAdmin
                ? 'Henüz sipariş yok. Yeni sipariş oluşturun ve atölye personeli atayın.'
                : 'Size atanmış sipariş bulunmuyor.'}
            </Text>
          </Card>
        ) : (
          orders.map((order) => {
            const progress = getOrderOverallProgress(order);
            const alertCount = alertCounts[order.id] ?? 0;
            return (
              <Pressable
                key={order.id}
                onPress={() => {
                  registerAdTap();
                  router.push(`/(app)/orders/${order.id}`);
                }}
              >
                <Card elevated padding="lg" style={styles.orderCard}>
                  <View style={styles.orderTitleRow}>
                    <Text variant="label">{order.orderName}</Text>
                    {alertCount > 0 ? (
                      <View style={[styles.alertBadge, { backgroundColor: colors.error }]}>
                        <Text variant="caption" style={styles.alertBadgeText}>
                          {alertCount} uyarı
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text muted>
                    {order.workshopName} · {order.responsiblePersonName}
                  </Text>
                  <Text variant="caption" muted>
                    Başlangıç: {order.startDate} · {PRODUCTION_STATUSES[order.status]}
                  </Text>
                  <ProgressBar
                    progress={progress}
                    label={`${progress}% · ${order.targetQuantity} adet hedef`}
                  />
                  <Button
                    title="Takip Listesi & Giriş"
                    variant="secondary"
                    onPress={() => router.push(`/(app)/orders/${order.id}`)}
                  />
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
    </ScreenWithAds>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  orderCard: { gap: spacing.sm },
  orderTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  alertBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  alertBadgeText: { color: '#fff', fontWeight: '700', fontSize: 11 },
});
