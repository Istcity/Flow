import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { useThemeColors } from '@/constants/theme';

export default function Index() {
  const colors = useThemeColors();
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const profile = useAuthStore((s) => s.profile);

  if (!isInitialized) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (profile) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
