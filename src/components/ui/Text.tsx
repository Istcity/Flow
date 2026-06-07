import { Text as RNText, type TextProps, StyleSheet } from 'react-native';
import { useThemeColors, typography } from '@/constants/theme';

type TextVariant = 'hero' | 'title' | 'subtitle' | 'body' | 'caption' | 'label';

interface FlowTextProps extends TextProps {
  variant?: TextVariant;
  muted?: boolean;
}

export function Text({ variant = 'body', muted = false, style, ...props }: FlowTextProps) {
  const colors = useThemeColors();

  return (
    <RNText
      style={[
        typography[variant],
        { color: muted ? colors.textMuted : colors.text },
        style,
      ]}
      {...props}
    />
  );
}

export const styles = StyleSheet.create({});
