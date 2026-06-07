import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { exchangeCodeAsync, makeRedirectUri, type AuthRequest, type AuthSessionResult } from 'expo-auth-session';
import { signInWithGoogle } from '@/services/firebase/auth';

WebBrowser.maybeCompleteAuthSession();

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

function getPlatformClientId(): string {
  if (Platform.OS === 'ios' && iosClientId) return iosClientId;
  if (Platform.OS === 'android' && androidClientId) return androidClientId;
  return webClientId ?? '';
}

function getGoogleRedirectUri(): string {
  if (Platform.OS === 'ios' && iosClientId) {
    const clientPart = iosClientId.replace('.apps.googleusercontent.com', '');
    return `com.googleusercontent.apps.${clientPart}:/oauthredirect`;
  }
  return makeRedirectUri({
    scheme: 'flow',
    native: 'com.sinannergiz.flow:/oauthredirect',
  });
}

function extractIdToken(result: AuthSessionResult): string | null {
  if (result.type !== 'success') return null;
  const fromParams = result.params?.id_token;
  const fromAuth = result.authentication?.idToken;
  if (typeof fromParams === 'string' && fromParams.length > 0) return fromParams;
  if (typeof fromAuth === 'string' && fromAuth.length > 0) return fromAuth;
  return null;
}

async function resolveIdToken(
  result: AuthSessionResult,
  request: AuthRequest | null
): Promise<string> {
  const immediate = extractIdToken(result);
  if (immediate) return immediate;

  if (result.type !== 'success' || !result.params?.code) {
    throw new Error('Google idToken alınamadı.');
  }

  if (!request?.codeVerifier) {
    throw new Error('OAuth code verifier eksik. Uygulamayı yeniden başlatın.');
  }

  const clientId = getPlatformClientId();
  if (!clientId) {
    throw new Error('Google client ID tanımlı değil.');
  }

  const tokenResponse = await exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri: getGoogleRedirectUri(),
      extraParams: {
        code_verifier: request.codeVerifier,
      },
    },
    Google.discovery
  );

  const idToken = tokenResponse.idToken;
  if (!idToken) {
    throw new Error('Google idToken alınamadı (kod değişimi sonrası).');
  }

  return idToken;
}

export function useGoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, , promptAsync] = Google.useIdTokenAuthRequest(
    {
      clientId: webClientId,
      iosClientId,
      androidClientId,
      redirectUri: getGoogleRedirectUri(),
    },
    { native: getGoogleRedirectUri() }
  );

  const signIn = useCallback(async (): Promise<boolean> => {
    setError(null);

    if (!webClientId) {
      setError('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID tanımlı değil.');
      return false;
    }

    if (!request) {
      setError('Google auth isteği hazır değil.');
      return false;
    }

    setLoading(true);
    try {
      const result = await promptAsync();

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return false;
      }

      if (result.type === 'error') {
        throw new Error(result.error?.message ?? 'Google girişi başarısız.');
      }

      if (result.type !== 'success') {
        throw new Error('Google girişi tamamlanamadı.');
      }

      const idToken = await resolveIdToken(result, request);
      await signInWithGoogle(idToken);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Giriş başarısız.';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [request, promptAsync]);

  return {
    signIn,
    loading,
    error,
    isReady: Boolean(request),
  };
}
