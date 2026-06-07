import { View, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { useThemeColors, radius, spacing, typography } from '@/constants/theme';
import { Text } from './Text';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  large?: boolean;
}

export function Input({ label, error, large = false, style, ...props }: InputProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.wrapper}>
      <Text variant="label" style={styles.label}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.placeholder}
        style={[
          styles.input,
          large && styles.inputLarge,
          {
            backgroundColor: colors.inputBackground,
            borderColor: error ? colors.error : colors.border,
            color: colors.text,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text variant="caption" style={{ color: colors.error, marginTop: spacing.xs }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    marginLeft: spacing.xs,
  },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  inputLarge: {
    minHeight: 64,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
});
