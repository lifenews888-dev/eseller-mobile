import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/store/auth';
import { inferAuthRoleFromReturnTo, normalizeAuthRoleParam, routeAfterAuth } from '../../src/shared/routing';
import { C, F, R, UI } from '../../src/shared/design';
import * as SecureStore from '../../src/shared/secureStore';
import {
  authenticateWithBiometric,
  disableBiometric,
  enableBiometric,
  getBiometricSession,
  isBiometricAvailable,
  isBiometricEnabled,
} from '../../src/shared/biometric';
import { OTP_ENABLED_DEFAULT } from '../../src/config/flags';
import { SESSION_INVALIDATED_KEY } from '../../src/services/api';
import { signInWithProvider } from '../../src/lib/oauthHandoff';
import { AuthValueIntro } from '../../src/components/AuthValueIntro';
import { AppButton, AppCard, AppHeader, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

const TEST_USERS = [
  { label: 'Худалдан авагч', phone: '99000001', color: C.buyer },
  { label: 'Дэлгүүр эзэн', phone: '99000002', color: C.store },
  { label: 'Жолооч', phone: '99000003', color: C.driver },
  { label: 'Борлуулагч', phone: '99000004', color: C.seller },
];

const TEST_PASSWORD = 'test1234';

export default function LoginScreen() {
  const { login, loading } = useAuth();
  const layout = useAppLayoutMetrics();
  const params = useLocalSearchParams<{ role?: string; returnTo?: string; next?: string; redirect?: string }>();
  const authReturnTo = params.returnTo || params.next || params.redirect;
  const authRole = normalizeAuthRoleParam(params.role) || inferAuthRoleFromReturnTo(authReturnTo);
  const authLinkParams = {
    ...(authReturnTo ? { returnTo: authReturnTo } : {}),
    ...(authRole ? { role: authRole } : {}),
  };

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioType, setBioType] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined') return;
    if (window.location.hash === '#register') {
      router.replace({
        pathname: '/register',
        params: {
          ...(authReturnTo ? { returnTo: authReturnTo } : {}),
          role: authRole || 'affiliate',
        },
      } as any);
    }
  }, [authReturnTo, authRole]);

  useEffect(() => {
    (async () => {
      const { available, type } = await isBiometricAvailable();
      const enabled = await isBiometricEnabled();
      const token = await SecureStore.getItemAsync('token');

      setBioAvailable(available);
      setBioEnabled(enabled && !!token);
      setBioType(type);

      try {
        const flag = await AsyncStorage.getItem(SESSION_INVALIDATED_KEY);
        if (flag === '1') {
          await AsyncStorage.removeItem(SESSION_INVALIDATED_KEY);
          Alert.alert(
            'Сессийн хугацаа дууссан',
            'Аюулгүй байдлын үүднээс дахин нэвтэрнэ үү.',
          );
        }
      } catch {}
    })();
  }, []);

  async function quickLogin(testPhone: string) {
    if (!__DEV__) return;
    if (useAuth.getState().loading) return;

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await login(testPhone, TEST_PASSWORD);
      const currentUser = useAuth.getState().user;
      routeAfterAuth(currentUser?.role || 'buyer', authReturnTo);
    } catch (e: any) {
      Alert.alert('Алдаа', e?.message || 'Нэвтрэх үед алдаа гарлаа.');
    }
  }

  const finishLogin = (role: string) => {
    routeAfterAuth(role, authReturnTo);
  };

  const offerBioSave = (phone: string, role: string) => {
    if (!bioAvailable || bioEnabled) {
      finishLogin(role);
      return;
    }

    Alert.alert(
      `${bioType || 'Биометр'} идэвхжүүлэх үү?`,
      'Дараагийн удаа илүү хурдан нэвтрэх боломжтой болно.',
      [
        { text: 'Болих', style: 'cancel', onPress: () => finishLogin(role) },
        {
          text: 'Идэвхжүүлэх',
          onPress: async () => {
            try {
              await enableBiometric(phone);
            } catch {}
            finishLogin(role);
          },
        },
      ],
    );
  };

  const handleLogin = async () => {
    if (loading) return;
    if (!email.trim() || !pass) {
      Alert.alert('Анхаар', 'Имэйл эсвэл утас болон нууц үгээ оруулна уу.');
      return;
    }

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const phone = email.trim();
      await login(phone, pass);
      const currentUser = useAuth.getState().user;
      offerBioSave(phone, currentUser?.role || 'buyer');
    } catch (e: any) {
      Alert.alert('Алдаа', e?.message || 'Нэвтрэх үед алдаа гарлаа.');
    }
  };

  const handleBio = async () => {
    const result = await authenticateWithBiometric(`${bioType || 'Биометр'}-ээр нэвтрэх`);
    if (!result.success) {
      if (result.error && result.error !== 'user_cancel' && result.error !== 'system_cancel') {
        Alert.alert('Биометр амжилтгүй', `Код: ${result.error}`);
      }
      return;
    }

    const session = await getBiometricSession();
    if (!session) {
      try {
        await disableBiometric();
      } catch {}
      setBioEnabled(false);
      Alert.alert(
        'Биометр дахин тохируулах',
        'Биометр нэвтрэлт ашиглахын өмнө утас/имэйл болон нууц үгээр нэг удаа нэвтэрнэ үү.',
      );
      return;
    }

    try {
      await useAuth.getState().restoreSession(session.token);
      const currentUser = useAuth.getState().user;
      routeAfterAuth(currentUser?.role || 'buyer', authReturnTo);
    } catch (e: any) {
      Alert.alert('Алдаа', e?.message || 'Биометр нэвтрэлт амжилтгүй.');
    }
  };

  const [providerBusy, setProviderBusy] = useState<'google' | 'dan' | null>(null);

  // Google/ДАН-аар апп дотроо нэвтэрнэ: хөтчийн цонх нээгдээд, дуусахад апп руу буцаж сесс үүснэ
  const openAuthProvider = async (provider: 'google' | 'dan') => {
    if (providerBusy) return;
    setProviderBusy(provider);
    try {
      const role = await signInWithProvider(provider, provider === 'google' ? authRole || 'buyer' : null);
      if (role) routeAfterAuth(role, authReturnTo);
    } catch (e: any) {
      Alert.alert('Нэвтрэх', e?.message || 'Нэвтрэх үед алдаа гарлаа.');
    } finally {
      setProviderBusy(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: layout.screenTop, paddingBottom: layout.screenBottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandWrap}>
          <Text style={styles.brandText}>
            eseller<Text style={{ color: C.brand }}>.mn</Text>
          </Text>
          <Text style={styles.brandSub}>Монголын нэгдсэн худалдааны платформ</Text>
        </View>

        <AppHeader
          title="Нэвтрэх"
          subtitle="Захиалга, дэлгүүр, борлуулалт, хүргэлтээ нэг апп дээр удирдана."
          icon="log-in-outline"
          accent={C.brand}
        />

        <AuthValueIntro />

        {__DEV__ ? (
          <AppCard style={styles.quickCard}>
            <Text style={styles.quickTitle}>Хурдан нэвтрэх (тест)</Text>
            <View style={styles.quickGrid}>
              {TEST_USERS.map((u) => (
                <TouchableOpacity
                  key={u.phone}
                  activeOpacity={0.86}
                  onPress={() => quickLogin(u.phone)}
                  disabled={loading}
                  style={[styles.quickButton, { borderColor: u.color }]}
                >
                  <Text style={[styles.quickLabel, { color: u.color }]} numberOfLines={1}>
                    {u.label}
                  </Text>
                  <Text style={styles.quickPhone}>{u.phone}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </AppCard>
        ) : null}

        <AppCard style={styles.formCard}>
          <FieldLabel>Имэйл эсвэл утас</FieldLabel>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="example@gmail.com эсвэл 99XXXXXX"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <FieldLabel>Нууц үг</FieldLabel>
          <TextInput
            value={pass}
            onChangeText={setPass}
            placeholder="••••••••"
            placeholderTextColor={C.textMuted}
            secureTextEntry
            style={styles.input}
          />

          <AppButton
            label={loading ? 'Нэвтэрч байна' : 'Нэвтрэх'}
            icon="log-in-outline"
            onPress={handleLogin}
            disabled={loading}
            style={styles.primaryAction}
          />

          {bioAvailable && bioEnabled ? (
            <AppButton
              label={Platform.OS === 'ios' ? 'Face ID-ээр нэвтрэх' : 'Хурууны хээгээр нэвтрэх'}
              icon={Platform.OS === 'ios' ? 'lock-closed-outline' : 'finger-print-outline'}
              onPress={handleBio}
              variant="secondary"
              style={styles.secondaryAction}
            />
          ) : null}
        </AppCard>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>эсвэл</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.oauthStack}>
          <AppButton
            label={providerBusy === 'google' ? 'Google-ээр нэвтэрч байна...' : 'Google-ээр нэвтрэх'}
            icon="logo-google"
            disabled={!!providerBusy}
            onPress={() => openAuthProvider('google')}
            variant="secondary"
          />
          <AppButton
            label={providerBusy === 'dan' ? 'ДАН-аар нэвтэрч байна...' : 'ДАН-аар нэвтрэх'}
            icon="id-card-outline"
            disabled={!!providerBusy}
            onPress={() => openAuthProvider('dan')}
            style={{ backgroundColor: C.primary, borderColor: C.primary }}
          />
          <Text style={styles.oauthHint}>E-Mongolia иргэний нэвтрэлт</Text>
        </View>

        {OTP_ENABLED_DEFAULT ? (
          <View style={styles.otpStack}>
            <AppButton
              label="Утсаар нэвтрэх"
              icon="phone-portrait-outline"
              onPress={() => router.push('/otp')}
              variant="ghost"
            />
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => router.push('/forgot-password' as never)}
              style={styles.centerLink}
            >
              <Text style={styles.centerLinkText}>Нууц үгээ мартсан уу?</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.inlineLinkRow}>
          <Text style={styles.inlineText}>Бүртгэл байхгүй юу?</Text>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => router.push({ pathname: '/register', params: authLinkParams } as any)}
          >
            <Text style={styles.inlineLink}>Бүртгүүлэх</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => router.replace('/' as any)}
          style={styles.guestLink}
        >
          <Text style={styles.guestText}>Нэвтрэлгүй үргэлжлүүлэх</Text>
          <Ionicons name="arrow-forward" size={15} color={C.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: {
    padding: UI.screenPad,
  },
  brandWrap: { alignItems: 'center', marginBottom: R.lg },
  brandText: { fontSize: 40, fontWeight: '900', color: C.text, letterSpacing: 0 },
  brandSub: { ...F.small, color: C.textMuted, marginTop: R.xs },
  quickCard: { marginBottom: R.lg },
  quickTitle: { ...F.small, color: C.textSub, fontWeight: '800', textAlign: 'center', marginBottom: R.md },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: R.sm },
  quickButton: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 56,
    backgroundColor: C.bgSection,
    borderRadius: UI.controlRadius,
    padding: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  quickLabel: { ...F.tiny, fontWeight: '900' },
  quickPhone: { ...F.tiny, color: C.textMuted, marginTop: 2 },
  formCard: { gap: R.xs, marginBottom: R.lg },
  label: { ...F.small, color: C.textSub, fontWeight: '800', marginBottom: R.xs },
  input: {
    minHeight: 48,
    backgroundColor: C.bgSection,
    borderRadius: UI.controlRadius,
    paddingHorizontal: R.md,
    paddingVertical: R.sm,
    color: C.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: R.md,
  },
  primaryAction: { marginTop: R.xs },
  secondaryAction: { marginTop: R.sm },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: R.md },
  divider: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { ...F.tiny, color: C.textMuted, marginHorizontal: R.md, fontWeight: '800' },
  oauthStack: { gap: R.sm },
  oauthHint: { ...F.tiny, color: C.textMuted, textAlign: 'center' },
  otpStack: { gap: R.sm, marginTop: R.md },
  centerLink: { alignItems: 'center', paddingVertical: R.xs },
  centerLinkText: { ...F.small, color: C.textSub, fontWeight: '700' },
  inlineLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: R.xs,
    marginTop: R.lg,
  },
  inlineText: { ...F.small, color: C.textMuted },
  inlineLink: { ...F.small, color: C.primary, fontWeight: '900' },
  guestLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: R.xs,
    marginTop: R.md,
  },
  guestText: { ...F.small, color: C.textMuted, fontWeight: '700' },
});
