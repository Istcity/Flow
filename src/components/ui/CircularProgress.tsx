import Svg, { Circle } from 'react-native-svg';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/constants/theme';
import { Text } from './Text';

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function CircularProgress({
  progress,
  size = 88,
  strokeWidth = 8,
  label,
}: CircularProgressProps) {
  const colors = useThemeColors();
  const clamped = Math.max(0, Math.min(100, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.progressTrack}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.progressFill}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text variant="subtitle" style={{ fontSize: 18 }}>
          %{clamped}
        </Text>
        {label ? (
          <Text variant="caption" muted>
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
});
