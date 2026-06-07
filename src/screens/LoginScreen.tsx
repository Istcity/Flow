import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { spacing, palette } from '@/constants/theme';
import { APP_NAME } from '@/constants/roles';
import { useAuthStore } from '@/store/authStore';
import { ScreenWithAds } from '@/components/ads/ScreenWithAds';
import { registerAdTap } from '@/services/adMobService';

type LoginMode = 'invite' | 'login' | 'register';

export function LoginScreen() {
  const loginInvite = useAuthStore((s) => s.loginInvite);
  const loginAdmin = useAuthStore((s) => s.loginAdmin);
  const registerAdmin = useAuthStore((s) => s.registerAdmin);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const error = useAuthStore((s) => s.error);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setError = useAuthStore((s) => s.setError);

  const [mode, setMode] = useState<LoginMode>('register');
  const [showForgot, setShowForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [organizationName, setOrganizationName] = useState('');

  const handleSubmit = async () => {
    setError(null);
    let ok = false;
    if (mode === 'invite') {
      ok = await loginInvite(email, code);
    } else if (mode === 'login') {
      ok = await loginAdmin(email, password);
    } else {
      ok = await registerAdmin(email, password, displayName, organizationName);
    }
    if (ok) router.replace('/(app)/dashboard');
  };

  const handleForgotPassword = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Sıfırlama için e-posta adresinizi girin.');
      return;
    }
    const ok = await resetPassword(email);
    if (ok) {
      Alert.alert(
        'E-posta gönderildi',
        `${email.trim()} adresine şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.`,
        [{ text: 'Tamam', onPress: () => setShowForgot(false) }]
      );
    }
  };

  const switchMode = (key: LoginMode) => {
    setMode(key);
    setShowForgot(false);
    setError(null);
  };

  const tab = (key: LoginMode, label: string) => (
    <Pressable
      onPress={() => {
        registerAdTap();
        switchMode(key);
      }}
      style={[styles.tab, mode === key && styles.tabActive]}
    >
      <Text style={[styles.tabText, mode === key && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );

  return (
    <ScreenWithAds>
      <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text variant="hero" style={styles.title}>
            {APP_NAME}
          </Text>
          <Text style={styles.subtitle}>Tekstil fason üretim takibi</Text>
        </View>

        <View style={styles.tabs}>
          {tab('register', 'Hesap Oluştur')}
          {tab('login', 'Yönetici Girişi')}
          {tab('invite', 'Davet Kodu')}
        </View>

        {showForgot ? (
          <View style={styles.form}>
            <Text style={styles.forgotTitle}>Şifre Sıfırlama</Text>
            <Text style={styles.forgotHint}>
              Kayıtlı e-posta adresinize sıfırlama bağlantısı gönderilir. Personel iseniz yeni
              şifrenizle Davet Kodu sekmesinden giriş yapabilirsiniz.
            </Text>
            <Input
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="ornek@firma.com"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              title="Sıfırlama Bağlantısı Gönder"
              onPress={handleForgotPassword}
              loading={isLoading}
              fullWidth
            />
            <Pressable onPress={() => setShowForgot(false)}>
              <Text style={styles.link}>← Giriş ekranına dön</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            {mode === 'register' ? (
              <>
                <Input
                  label="Firma / Atölye Adı"
                  value={organizationName}
                  onChangeText={setOrganizationName}
                  placeholder="Örn: ABC Tekstil"
                />
                <Input label="Ad Soyad" value={displayName} onChangeText={setDisplayName} placeholder="Adınız" />
              </>
            ) : null}

            <Input
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={mode === 'invite' ? 'ornek@atolye.com' : 'sizin@firma.com'}
            />

            {mode === 'invite' ? (
              <Input
                label="Davet Kodu veya Şifre"
                value={code}
                onChangeText={setCode}
                secureTextEntry
                placeholder="6 haneli kod veya şifreniz"
                large
              />
            ) : (
              <Input
                label="Şifre"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder={mode === 'register' ? 'En az 6 karakter' : 'Şifreniz'}
              />
            )}

            {mode === 'login' || mode === 'invite' ? (
              <Pressable onPress={() => { registerAdTap(); setShowForgot(true); }}>
                <Text style={styles.link}>Şifremi unuttum</Text>
              </Pressable>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              title={
                mode === 'invite'
                  ? 'Siparişe Giriş Yap'
                  : mode === 'login'
                    ? 'Giriş Yap'
                    : 'Yönetici Hesabı Oluştur'
              }
              onPress={handleSubmit}
              loading={isLoading}
              fullWidth
            />
          </View>
        )}

        {!showForgot ? (
          <Text style={styles.footer}>
            {mode === 'invite'
              ? 'Yalnızca yöneticinizin atadığı e-posta ve davet kodu ile giriş yapın. Şifre sıfırladıysanız yeni şifrenizi kullanın.'
              : mode === 'login'
                ? 'Daha önce oluşturduğunuz yönetici hesabı ile giriş yapın.'
                : 'İlk kez kullanıyorsanız hesap oluşturun. Ardından personel atayabilirsiniz.'}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
    </ScreenWithAds>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.deepNavy },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: { alignItems: 'center', gap: spacing.sm },
  title: { color: palette.white },
  subtitle: { color: palette.slateLight, textAlign: 'center' },
  tabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: palette.navyLight,
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabActive: { backgroundColor: palette.accent },
  tabText: { color: palette.slateLight, fontWeight: '600', fontSize: 11, textAlign: 'center' },
  tabTextActive: { color: palette.white },
  form: { gap: spacing.md },
  forgotTitle: { color: palette.white, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  forgotHint: { color: palette.slateLight, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  error: { color: palette.error, textAlign: 'center', fontSize: 13 },
  link: { color: palette.accent, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  footer: { color: palette.slate, textAlign: 'center', fontSize: 13 },
});
