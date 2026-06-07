import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { getThemeColors } from '@/constants/theme';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { FatalErrorOverlay } from '@/components/FatalErrorOverlay';
import { installGlobalErrorHandlers } from '@/utils/globalErrorHandlers';
import { initializeAds } from '@/services/adMobService';

installGlobalErrorHandlers();

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = getThemeColors(scheme === 'dark');
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const profile = useAuthStore((s) => s.profile);
  const segments = useSegments();

  useEffect(() => {
    const unsubscribe = initialize();
    void initializeAds();
    return unsubscribe;
  }, [initialize]);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(app)';

    if (!profile && inAuthGroup) {
      router.replace('/login');
    } else if (profile && segments[0] === 'login') {
      router.replace('/(app)/dashboard');
    }
  }, [profile, segments, isInitialized]);

  return (
    <AppErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      />
      <FatalErrorOverlay />
    </AppErrorBoundary>
  );
}
