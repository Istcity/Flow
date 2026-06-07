import { FlatList, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useThemeColors, spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import type { AuditLogEntry } from '@/types';

interface AuditLogListProps {
  logs: AuditLogEntry[];
  loading?: boolean;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function AuditLogItem({ item }: { item: AuditLogEntry }) {
  const colors = useThemeColors();

  return (
    <Card style={styles.item} padding="md">
      <View style={styles.row}>
        <Text variant="caption" style={{ color: colors.accent }}>
          {item.action === 'insert' ? 'Ekleme' : 'Güncelleme'}
        </Text>
        <Text variant="caption" muted>
          {formatTimestamp(item.timestamp)}
        </Text>
      </View>
      <Text variant="body" style={styles.message}>
        <Text variant="label">{item.userDisplayName}</Text>
        {' · '}
        {item.targetCollection}/{item.targetField}
      </Text>
      {item.newValue != null && (
        <Text variant="caption" muted numberOfLines={2}>
          Yeni: {String(item.newValue)}
        </Text>
      )}
    </Card>
  );
}

export function AuditLogList({ logs, loading }: AuditLogListProps) {
  const colors = useThemeColors();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (logs.length === 0) {
    return (
      <Card padding="lg">
        <Text muted>Henüz audit kaydı yok.</Text>
      </Card>
    );
  }

  return (
    <FlatList
      data={logs}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <AuditLogItem item={item} />}
      scrollEnabled={false}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  item: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  message: {
    marginTop: spacing.xs,
  },
  center: {
    padding: spacing.lg,
    alignItems: 'center',
  },
});
