import { View, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { spacing, useThemeColors, radius, palette } from '@/constants/theme';
import { ALERT_TYPE_LABELS } from '@/constants/alerts';
import type { ProductionAlert } from '@/types';
import { registerAdTap } from '@/services/adMobService';

interface Props {
  alerts: ProductionAlert[];
  maxItems?: number;
}

export function AlertsPanel({ alerts, maxItems = 8 }: Props) {
  const colors = useThemeColors();
  const visible = alerts.slice(0, maxItems);

  if (visible.length === 0) return null;

  return (
    <Card padding="lg" style={styles.card}>
      <View style={styles.header}>
        <Text variant="subtitle">Bildirimler</Text>
        <View style={[styles.countBadge, { backgroundColor: colors.error }]}>
          <Text variant="caption" style={styles.countText}>
            {alerts.length}
          </Text>
        </View>
      </View>
      <Text variant="caption" muted>
        Yönetici, takip elemanı ve atölye kullanıcılarına iletilir.
      </Text>
      {visible.map((alert) => (
        <Pressable
          key={alert.id}
          onPress={() => {
            registerAdTap();
            router.push(`/(app)/orders/${alert.orderId}`);
          }}
          style={[styles.item, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}
        >
          <View style={styles.itemTop}>
            <Text variant="label">{alert.orderName}</Text>
            <View
              style={[
                styles.dot,
                { backgroundColor: alert.severity === 'critical' ? colors.error : palette.warning },
              ]}
            />
          </View>
          <Text variant="caption" style={{ color: colors.textSecondary }}>
            {ALERT_TYPE_LABELS[alert.type]} · {alert.message}
          </Text>
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  item: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
