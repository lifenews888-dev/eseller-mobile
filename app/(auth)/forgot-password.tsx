import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { post } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import { OTP_ENABLED_DEFAULT } from '../../src/config/flags';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

type Step = 1 | 2 | 3;

const STEP_COPY: Record<Step, { title: string; subtitle: string }> = {
  1: {
    title: 'Утасны дугаар',
    subtitle: 'Бүртгэлтэй утасны дугаараа оруулж OTP код авна.',
  },
  2: {
    title: 'Код баталгаажуулах',
    subtitle: 'Ирсэн 4-6 оронтой кодыг оруулна уу.',
  },
  3: {
    title: 'Шинэ нууц үг',
    subtitle: 'Дараагийн нэвтрэлтэд ашиглах нууц үгээ тохируулна.',
  },
};

export default function ForgotPasswordScreen() {
  if (!OTP_ENABLED_DEFAULT) {
    return <Redirect href={'/login' as never} />;
  }

  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    if (!/^\d{8,}$/.test(phone.trim())) {
      Alert.alert('Анхаар', '8-аас дээш оронтой утасны дугаар оруулна уу.');
      return;
    }

    setLoading(true);
    try {
      await post('/auth/otp/send', { phone: phone.trim() });
      setStep(2);
      Alert.alert('Амжилттай', 'OTP код илгээгдлээ.');
    } catch (e: any) {
      Alert.alert('Алдаа', e?.message || 'OTP илгээж чадсангүй.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!/^\d{4,6}$/.test(otp.trim())) {
      Alert.alert('Анхаар', '4-6 оронтой код оруулна уу.');
      return;
    }

    setLoading(true);
    try {
      const res: any = await post('/auth/otp/verify', {
        phone: phone.trim(),
        code: otp.trim(),
      });
      const body = res?.data ?? res;
      const token = body?.token ?? body?.resetToken ?? '';
      if (!token) {
        Alert.alert('Алдаа', 'Баталгаажуулах токен олдсонгүй.');
        return;
      }
      setResetToken(token);
      setStep(3);
    } catch (e: any) {
      Alert.alert('Алдаа', e?.message || 'OTP код буруу байна.');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (newPassword.length < 8) {
      Alert.alert('Анхаар', 'Нууц үг хамгийн багадаа 8 тэмдэгт байна.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Анхаар', 'Нууц үг давталттайгаа таарахгүй байна.');
      return;
    }

    setLoading(true);
    try {
      await post('/auth/reset-password', {
        token: resetToken,
        phone: phone.trim(),
        newPassword,
      });
      Alert.alert('Амжилттай', 'Нууц үг шинэчлэгдлээ. Одоо нэвтэрнэ үү.', [
        { text: 'OK', onPress: () => router.replace('/login' as never) },
      ]);
    } catch (e: any) {
      Alert.alert('Алдаа', e?.message || 'Нууц үг шинэчилж чадсангүй.');
    } finally {
      setLoading(false);
    }
  }

  const current = STEP_COPY[step];

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppScreen keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <AppTopBar eyebrow="Нэвтрэлт" title="Нууц үг сэргээх" />
        <AppHeader
          title={current.title}
          subtitle={current.subtitle}
          icon="key-outline"
          accent={C.primary}
        />

        <View style={styles.progressRow}>
          {[1, 2, 3].map((item) => (
            <View
              key={item}
              style={[styles.progressDot, step >= item && styles.progressDotActive]}
            />
          ))}
        </View>

        <AppCard style={styles.card}>
          {step === 1 ? (
            <>
              <FieldLabel>Утасны дугаар</FieldLabel>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="99XXXXXX"
                placeholderTextColor={C.textMuted}
                keyboardType="phone-pad"
                style={styles.input}
              />
              <AppButton
                label={loading ? 'Илгээж байна' : 'OTP илгээх'}
                icon="send-outline"
                onPress={sendOtp}
                disabled={loading}
              />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <FieldLabel>Баталгаажуулах код</FieldLabel>
              <Text style={styles.helper}>{phone} дугаар руу илгээсэн кодыг оруулна уу.</Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                placeholder="000000"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                style={[styles.input, styles.codeInput]}
              />
              <AppButton
                label={loading ? 'Шалгаж байна' : 'Баталгаажуулах'}
                icon="checkmark-circle-outline"
                onPress={verifyOtp}
                disabled={loading}
              />
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => setStep(1)}
                style={styles.backStep}
              >
                <Text style={styles.backStepText}>Утасны дугаар солих</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <FieldLabel>Шинэ нууц үг</FieldLabel>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="8+ тэмдэгт"
                placeholderTextColor={C.textMuted}
                secureTextEntry
                style={styles.input}
              />
              <FieldLabel>Нууц үг давтах</FieldLabel>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Дахин оруулна уу"
                placeholderTextColor={C.textMuted}
                secureTextEntry
                style={styles.input}
              />
              <AppButton
                label={loading ? 'Хадгалж байна' : 'Нууц үг хадгалах'}
                icon="save-outline"
                onPress={resetPassword}
                disabled={loading}
              />
            </>
          ) : null}
        </AppCard>
      </AppScreen>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  progressRow: { flexDirection: 'row', gap: R.sm, marginBottom: R.lg },
  progressDot: {
    flex: 1,
    height: 5,
    borderRadius: R.full,
    backgroundColor: C.bgSection,
  },
  progressDotActive: { backgroundColor: C.primary },
  card: { gap: R.sm },
  label: { ...F.small, color: C.textSub, fontWeight: '800' },
  helper: { ...F.tiny, color: C.textMuted, marginTop: -2 },
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
    marginBottom: R.sm,
  },
  codeInput: { letterSpacing: 6, textAlign: 'center', fontSize: 20 },
  backStep: { alignItems: 'center', paddingVertical: R.xs },
  backStepText: { ...F.small, color: C.textSub, fontWeight: '800' },
});
