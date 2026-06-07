import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { spacing, palette } from '@/constants/theme';
import { useFatalErrorStore } from '@/store/fatalErrorStore';

export function FatalErrorOverlay() {
  const error = useFatalErrorStore((s) => s.error);
  const clearFatalError = useFatalErrorStore((s) => s.clearFatalError);

  if (!error) return null;

  return (
    <View style={styles.overlay}>
      <Text variant="hero" style={styles.title}>
        Beklenmeyen hata
      </Text>
      <Text style={styles.message}>{error.message}</Text>
      <Button title="Devam Et" onPress={clearFatalError} fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: palette.deepNavy,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
    zIndex: 9999,
  },
  title: { color: palette.white, textAlign: 'center' },
  message: { color: palette.slateLight, textAlign: 'center' },
});
