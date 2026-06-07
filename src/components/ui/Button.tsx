import { StyleSheet, Pressable, ActivityIndicator, type PressableProps } from 'react-native';
import { useThemeColors, radius, spacing, typography } from '@/constants/theme';
import { Text } from './Text';
import { registerAdTap } from '@/services/adMobService';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  onPress,
  ...props
}: ButtonProps) {
  const colors = useThemeColors();
  const isDisabled = disabled || loading;

  const handlePress: PressableProps['onPress'] = (event) => {
    if (isDisabled) return;
    registerAdTap();
    onPress?.(event);
  };

  const variantStyles = {
    primary: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
      textColor: colors.accentText,
    },
    secondary: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
      textColor: colors.text,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: colors.accent,
    },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={handlePress}
      {...props}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.textColor} />
      ) : (
        <Text style={[styles.label, { color: variantStyles.textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    ...typography.label,
    fontSize: 16,
  },
});
