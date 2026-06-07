import {
  Pressable,
  StyleSheet,
  ActivityIndicator,
  View,
  type PressableProps,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { palette, radius, spacing, typography } from '@/constants/theme';

interface GoogleSignInButtonProps extends Omit<PressableProps, 'children'> {
  loading?: boolean;
}

export function GoogleSignInButton({ loading = false, disabled, style, ...props }: GoogleSignInButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Google ile Giriş Yap"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          opacity: isDisabled ? 0.6 : pressed ? 0.9 : 1,
        },
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={palette.white} />
      ) : (
        <View style={styles.content}>
          <View style={styles.iconBadge}>
            <Text style={styles.iconText}>G</Text>
          </View>
          <Text style={styles.label}>Google ile Giriş Yap</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: palette.navyLight,
    borderWidth: 1,
    borderColor: palette.slateDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    ...typography.label,
    color: palette.accent,
    fontSize: 16,
  },
  label: {
    ...typography.label,
    color: palette.white,
    fontSize: 16,
  },
});
