import { View, StyleSheet } from 'react-native';
import { useThemeColors, radius, spacing } from '@/constants/theme';
import { Text } from './Text';

interface ProgressBarProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  height?: number;
}

export function ProgressBar({
  progress,
  label,
  showPercentage = true,
  height = 10,
}: ProgressBarProps) {
  const colors = useThemeColors();
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <View style={styles.wrapper}>
      {(label || showPercentage) && (
        <View style={styles.header}>
          {label ? (
            <Text variant="caption" muted>
              {label}
            </Text>
          ) : (
            <View />
          )}
          {showPercentage ? (
            <Text variant="caption" style={{ color: colors.accent }}>
              %{clamped}
            </Text>
          ) : null}
        </View>
      )}
      <View
        style={[
          styles.track,
          {
            height,
            backgroundColor: colors.progressTrack,
            borderRadius: radius.full,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${clamped}%`,
              backgroundColor: colors.progressFill,
              borderRadius: radius.full,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
