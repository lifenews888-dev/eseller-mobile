import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../../src/store/auth';
import { routeByRole } from '../../src/shared/routing';
import { post } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import { OTP_ENABLED_DEFAULT } from '../../src/config/flags';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

export default function OtpScreen() {
  if (!OTP_ENABLED_DEFAULT) {
    return <Redirect href={'/login' as never} />;
  }

  const { loginWithOTP } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const sendOtp = async () => {
    if (phone.trim().length < 8) {
      Alert.alert('Анхаар', 'Утасны дугаар оруулна уу.');
      return;
    }

    setLoading(true);
    try {
      await post('/auth/otp-send', { phone: phone.trim() });
      setSent(true);
      setTimer(60);
    } catch (e: any) {
      Alert.alert('Алдаа', e?.message || 'OTP код илгээж чадсангүй.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.trim().length < 4) {
      Alert.alert('Анхаар', 'OTP код оруулна уу.');
      return;
    }

    setLoading(true);
    try {
      await loginWithOTP(phone.trim(), otp.trim());
      const currentUser = useAuth.getState().user;
      routeByRole(currentUser?.role || 'buyer');
    } catch (e: any) {
      Alert.alert('Алдаа', e?.message || 'OTP код буруу байна.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <AppTopBar eyebrow="Нэвтрэлт" title="OTP код" />
      <AppHeader
        title="Утсаар нэвтрэх"
        subtitle={sent ? `${phone} дугаар руу илгээсэн кодыг оруулна уу.` : 'Утасны дугаараа оруулаад нэг удаагийн код авна.'}
        icon="phone-portrait-outline"
        accent={C.primary}
      />

      <AppCard style={styles.card}>
        <Text style={styles.label}>Утасны дугаар</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="99XXXXXX"
          placeholderTextColor={C.textMuted}
          keyboardType="phone-pad"
          maxLength={8}
          editable={!sent}
          style={[styles.input, styles.phoneInput, sent && styles.inputDisabled]}
        />

        {!sent ? (
          <AppButton
            label={loading ? 'Илгээж байна' : 'OTP илгээх'}
            icon="send-outline"
            onPress={sendOtp}
            disabled={loading}
          />
        ) : (
          <>
            <Text style={styles.successText}>Код илгээгдлээ.</Text>
            <Text style={styles.label}>OTP код</Text>
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
            <AppButton
              label={timer > 0 ? `Дахин илгээх (${timer}с)` : 'Дахин илгээх'}
              icon="refresh-outline"
              onPress={timer === 0 ? sendOtp : undefined}
              disabled={timer > 0 || loading}
              variant="ghost"
              style={styles.resend}
            />
          </>
        )}
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: R.sm },
  label: { ...F.small, color: C.textSub, fontWeight: '800' },
  input: {
    minHeight: 50,
    backgroundColor: C.bgSection,
    borderRadius: UI.controlRadius,
    paddingHorizontal: R.md,
    paddingVertical: R.sm,
    color: C.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: C.border,
  },
  inputDisabled: { color: C.textMuted },
  phoneInput: { fontSize: 20, letterSpacing: 4 },
  codeInput: { fontSize: 24, letterSpacing: 8, textAlign: 'center', borderColor: C.primary },
  successText: { ...F.small, color: C.success, fontWeight: '800' },
  resend: { marginTop: R.xs },
});
