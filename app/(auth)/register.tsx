import React, { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { post } from '../../src/services/api';
import { useAuth } from '../../src/store/auth';
import { C, F, R, UI } from '../../src/shared/design';
import { inferAuthRoleFromReturnTo, normalizeAuthRoleParam, routeAfterAuth } from '../../src/shared/routing';
import { AuthValueIntro } from '../../src/components/AuthValueIntro';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

const ROLE_OPTIONS = [
  {
    key: 'buyer',
    icon: 'cart-outline' as const,
    label: 'Худалдан авагч',
    desc: 'Бараа захиалах',
    color: C.primary,
  },
  {
    key: 'seller',
    icon: 'storefront-outline' as const,
    label: 'Дэлгүүр эзэн',
    desc: 'Дэлгүүр удирдах',
    color: C.store,
  },
  {
    key: 'affiliate',
    icon: 'megaphone-outline' as const,
    label: 'Борлуулагч',
    desc: 'Комисс олох',
    color: C.seller,
  },
  {
    key: 'delivery',
    icon: 'car-outline' as const,
    label: 'Жолооч',
    desc: 'Хүргэлт хийх',
    color: C.driver,
  },
];

function normalizeRoleParam(role?: string | string[], returnTo?: string | string[] | null) {
  return normalizeAuthRoleParam(role) ?? inferAuthRoleFromReturnTo(returnTo) ?? 'buyer';
}

export default function RegisterScreen() {
  const params = useLocalSearchParams<{ role?: string; returnTo?: string; next?: string }>();
  const authReturnTo = params.returnTo || params.next;
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [role, setRole] = useState(normalizeRoleParam(params.role, authReturnTo));
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const authLinkParams = {
    ...(authReturnTo ? { returnTo: authReturnTo } : {}),
    ...(role !== 'buyer' ? { role } : {}),
  };

  useEffect(() => {
    setRole(normalizeRoleParam(params.role, authReturnTo));
  }, [authReturnTo, params.role]);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !pass) {
      Alert.alert('Анхаар', 'Нэр, имэйл болон нууц үгээ оруулна уу.');
      return;
    }
    if (pass !== pass2) {
      Alert.alert('Анхаар', 'Нууц үг давталттайгаа таарахгүй байна.');
      return;
    }
    if (pass.length < 6) {
      Alert.alert('Анхаар', 'Нууц үг хамгийн багадаа 6 тэмдэгт байна.');
      return;
    }

    setLoading(true);
    try {
      const res: any = await post('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password: pass,
        role,
      });

      if (res?.token) {
        await useAuth.getState().restoreSession(res.token);
      } else {
        await login(email.trim(), pass);
      }

      const user = useAuth.getState().user;
      routeAfterAuth(user?.role, authReturnTo);
    } catch (e: any) {
      Alert.alert('Алдаа', e?.message || 'Бүртгэл үүсгэхэд алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <AppTopBar eyebrow="eSeller" title="Бүртгүүлэх" />
      <AppHeader
        title="Шинэ бүртгэл"
        subtitle="Өөрийн үүргээ сонгоод нэг аккаунтаар бүх боломжийг ашиглаарай."
        icon="person-add-outline"
        accent={C.brand}
      />

      <AuthValueIntro />

      <Text style={styles.sectionLabel}>Үүрэг сонгох</Text>
      <View style={styles.roleGrid}>
        {ROLE_OPTIONS.map((option) => {
          const selected = role === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.86}
              onPress={() => setRole(option.key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.roleCard,
                selected && {
                  borderColor: option.color,
                  backgroundColor: `${option.color}14`,
                },
              ]}
            >
              <Ionicons
                name={option.icon}
                size={20}
                color={selected ? option.color : C.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.roleTitle, selected && { color: C.text }]} numberOfLines={1}>
                  {option.label}
                </Text>
                <Text style={styles.roleDesc} numberOfLines={1}>
                  {option.desc}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <AppCard style={styles.formCard}>
        <Field label="Нэр">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Таны нэр"
            placeholderTextColor={C.textMuted}
            style={styles.input}
          />
        </Field>
        <Field label="Имэйл">
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="example@gmail.com"
            placeholderTextColor={C.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
        </Field>
        <Field label="Утасны дугаар">
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="99XXXXXX"
            placeholderTextColor={C.textMuted}
            keyboardType="phone-pad"
            style={styles.input}
          />
        </Field>

        <Field label="Нууц үг">
          <View style={styles.passwordBox}>
            <TextInput
              value={pass}
              onChangeText={setPass}
              placeholder="••••••••"
              placeholderTextColor={C.textMuted}
              secureTextEntry={!showPass}
              style={styles.passwordInput}
            />
            <TouchableOpacity
              onPress={() => setShowPass((v) => !v)}
              hitSlop={8}
              accessibilityLabel={showPass ? 'Нууц үг нуух' : 'Нууц үг харах'}
              style={styles.eyeButton}
            >
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>
        </Field>

        <Field label="Нууц үг давтах">
          <TextInput
            value={pass2}
            onChangeText={setPass2}
            placeholder="••••••••"
            placeholderTextColor={C.textMuted}
            secureTextEntry={!showPass}
            style={styles.input}
          />
        </Field>

        <AppButton
          label={loading ? 'Бүртгэж байна' : 'Бүртгүүлэх'}
          icon="person-add-outline"
          onPress={handleRegister}
          disabled={loading}
          style={styles.submit}
        />
      </AppCard>

      <View style={styles.inlineLinkRow}>
        <Text style={styles.inlineText}>Бүртгэл байгаа юу?</Text>
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => router.push({ pathname: '/login', params: authLinkParams } as any)}
        >
          <Text style={styles.inlineLink}>Нэвтрэх</Text>
        </TouchableOpacity>
      </View>
    </AppScreen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { ...F.small, color: C.textSub, fontWeight: '900', marginBottom: R.sm },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: R.sm, marginBottom: R.lg },
  roleCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
    backgroundColor: C.bgCard,
    borderRadius: UI.controlRadius,
    padding: R.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  roleTitle: { ...F.tiny, color: C.textSub, fontWeight: '900' },
  roleDesc: { ...F.tiny, color: C.textMuted, marginTop: 2 },
  formCard: { gap: R.sm },
  field: { gap: R.xs },
  fieldLabel: { ...F.small, color: C.textSub, fontWeight: '800' },
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
  },
  passwordBox: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgSection,
    borderRadius: UI.controlRadius,
    borderWidth: 1,
    borderColor: C.border,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: R.md,
    paddingVertical: R.sm,
    color: C.text,
    fontSize: 15,
  },
  eyeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  submit: { marginTop: R.sm },
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
});
