import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { spacing, useThemeColors, radius, palette } from '@/constants/theme';
import { ALERT_SEVERITY_LABELS, ALERT_TYPE_LABELS } from '@/constants/alerts';
import type { ProductionAlert, ProductionAlertDraft } from '@/types';

type AlertRow = ProductionAlert | ProductionAlertDraft;

interface Props {
  alerts: AlertRow[];
  title?: string;
  emptyMessage?: string;
}

function severityColor(severity: AlertRow['severity'], colors: ReturnType<typeof useThemeColors>) {
  return severity === 'critical' ? colors.error : palette.warning;
}

export function ProductionAlertsTable({ alerts, title = 'Uyarılar & Sapma Tablosu', emptyMessage }: Props) {
  const colors = useThemeColors();
  const active = alerts.filter((a) => a.active !== false);

  return (
    <Card padding="lg" style={styles.card}>
      <Text variant="subtitle">{title}</Text>
      {active.length === 0 ? (
        <Text muted>{emptyMessage ?? 'Aktif uyarı yok — hedefler takipte.'}</Text>
      ) : (
        <>
          <View style={[styles.headerRow, { borderColor: colors.border }]}>
            <Text variant="caption" muted style={styles.colType}>
              Tür
            </Text>
            <Text variant="caption" muted style={styles.colStatus}>
              Durum
            </Text>
            <Text variant="caption" muted style={styles.colNum}>
              Hedef
            </Text>
            <Text variant="caption" muted style={styles.colNum}>
              Gerçek
            </Text>
            <Text variant="caption" muted style={styles.colNum}>
              Sapma
            </Text>
          </View>
          {active.map((alert) => {
            const typeLabel = ALERT_TYPE_LABELS[alert.type] ?? alert.title;
            const sevColor = severityColor(alert.severity, colors);
            const key = 'id' in alert ? alert.id : alert.alertKey;
            return (
              <View key={key} style={styles.alertBlock}>
                <View style={[styles.row, { borderColor: colors.border }]}>
                  <View style={styles.colType}>
                    <Text variant="caption" style={{ color: sevColor }}>
                      {typeLabel}
                    </Text>
                  </View>
                  <View style={styles.colStatus}>
                    <View style={[styles.badge, { backgroundColor: sevColor }]}>
                      <Text variant="caption" style={styles.badgeText}>
                        {ALERT_SEVERITY_LABELS[alert.severity]}
                      </Text>
                    </View>
                  </View>
                  <Text variant="caption" style={styles.colNum}>
                    {alert.targetValue != null ? alert.targetValue : '—'}
                  </Text>
                  <Text variant="caption" style={styles.colNum}>
                    {alert.actualValue != null ? alert.actualValue : '—'}
                  </Text>
                  <Text variant="caption" style={[styles.colNum, { color: sevColor }]}>
                    {alert.deltaValue != null
                      ? alert.deltaValue > 0
                        ? `+${alert.deltaValue}`
                        : String(alert.deltaValue)
                      : '—'}
                  </Text>
                </View>
                <View style={[styles.messageRow, { backgroundColor: colors.inputBackground }]}>
                  <Text variant="caption" muted>
                    {alert.referenceDate} · {alert.message}
                  </Text>
                </View>
              </View>
            );
          })}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colType: { flex: 2.2 },
  colStatus: { flex: 1.2, alignItems: 'flex-start' },
  colNum: { flex: 1, textAlign: 'right' },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  messageRow: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  alertBlock: { gap: spacing.xs },
});
