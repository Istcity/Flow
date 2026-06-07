import { View, StyleSheet, type ViewProps } from 'react-native';
import { useThemeColors, radius, spacing } from '@/constants/theme';

interface CardProps extends ViewProps {
  elevated?: boolean;
  padding?: keyof typeof spacing;
}

export function Card({
  elevated = false,
  padding = 'lg',
  style,
  children,
  ...props
}: CardProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
          borderColor: colors.border,
          padding: spacing[padding],
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
