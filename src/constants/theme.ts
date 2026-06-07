import { useColorScheme } from 'react-native';

export const palette = {
  deepNavy: '#0A1628',
  navy: '#1B2838',
  navyLight: '#243447',
  slate: '#64748B',
  slateLight: '#94A3B8',
  slateDark: '#334155',
  white: '#F8FAFC',
  offWhite: '#E2E8F0',
  accent: '#3B82F6',
  accentMuted: '#2563EB',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  cardDark: '#1E293B',
  cardLight: '#FFFFFF',
  borderDark: '#334155',
  borderLight: '#E2E8F0',
} as const;

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  accent: string;
  accentText: string;
  success: string;
  error: string;
  progressTrack: string;
  progressFill: string;
  inputBackground: string;
  placeholder: string;
};

export const lightTheme: ThemeColors = {
  background: palette.offWhite,
  surface: palette.cardLight,
  surfaceElevated: palette.white,
  text: palette.deepNavy,
  textSecondary: palette.slateDark,
  textMuted: palette.slate,
  border: palette.borderLight,
  accent: palette.accent,
  accentText: palette.white,
  success: palette.success,
  error: palette.error,
  progressTrack: '#CBD5E1',
  progressFill: palette.accent,
  inputBackground: palette.white,
  placeholder: palette.slateLight,
};

export const darkTheme: ThemeColors = {
  background: palette.deepNavy,
  surface: palette.cardDark,
  surfaceElevated: palette.navyLight,
  text: palette.white,
  textSecondary: palette.slateLight,
  textMuted: palette.slate,
  border: palette.borderDark,
  accent: palette.accent,
  accentText: palette.white,
  success: palette.success,
  error: palette.error,
  progressTrack: palette.slateDark,
  progressFill: palette.accentMuted,
  inputBackground: palette.navy,
  placeholder: palette.slate,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

export const typography = {
  hero: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  subtitle: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  label: { fontSize: 14, fontWeight: '600' as const },
} as const;

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}

export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? darkTheme : lightTheme;
}
