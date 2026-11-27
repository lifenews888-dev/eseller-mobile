import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';
import { RequireAuthScreen } from '../../src/shared/ui/RequireAuthScreen';
import {
  authenticateWithBiometric,
  disableBiometric,
  enableBiometric,
  isBiometricAvailable,
  isBiometricEnabled,
} from '../../src/shared/biometric';
import { useAuth } from '../../src/store/auth';

export default function SecurityScreen() {
  const user = useAuth((s) => s.user);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioReason, setBioReason] = useState<string | undefined>(undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');

  useEffect(() => {
    let mounted = true;

    (async () => {
      const status = await isBiometricAvailable();
      const enabled = await isBiometricEnabled();

      if (!mounted) return;
      setBioAvailable(status.available);
      setBioReason(status.reason);
      setBioEnabled(enabled);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const unavailableMessage = bioReason === 'not-enrolled'
    ? 'Хурууны хээ / Face ID-аа эхлээд утсандаа бүртгээрэй.'
    : 'Энэ төхөөрөмж дээр биометр боломжгүй.';

  const toggleBio = async () => {
    if (bioEnabled) {
      await disableBiometric();
      setBioEnabled(false);
      return;
    }

    if (!bioAvailable) {
      Alert.alert('Боломжгүй', unavailableMessage);
      return;
    }

    const phone = user?.phone;
    if (!phone) {
      Alert.alert('Алдаа', 'Биометр идэвхжүүлэхийн тулд утасны дугаартай профайл хэрэгтэй.');
      return;
    }

    const auth = await authenticateWithBiometric('Биометр баталгаажуулах');
    if (!auth.success) return;

    await enableBiometric(phone);
    setBioEnabled(true);
  };

  const savePassword = () => {
    if (newPw.length < 6) {
      Alert.alert('Анхаар', 'Шинэ нууц үг 6-аас дээш тэмдэгттэй байна.');
      return;
    }

    Alert.alert('Амжилттай', 'Нууц үг солигдлоо.');
    setShowPassword(false);
    setOldPw('');
    setNewPw('');
  };

  if (!user) {
    return (
      <RequireAuthScreen
        title="Аюулгүй байдал"
        subtitle="Нэвтрэлт, биометр болон нууц үгийн тохиргоогоо удирдахын тулд нэвтэрнэ үү."
        icon="shield-checkmark-outline"
        accent={C.primary}
        returnTo="/security"
      />
    );
  }

  return (
    <AppScreen keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ headerShown: false }} />
      <AppTopBar eyebrow="Профайл" title="Аюулгүй байдал" showBack={false} />
      <AppHeader
        title="Аюулгүй байдал"
        subtitle="Нэвтрэлт, биометр болон нууц үгийн тохиргоогоо удирдана."
        icon="shield-checkmark-outline"
        accent={C.primary}
      />

      <AppCard elevated style={st.summary}>
        <View style={st.summaryIcon}>
          <Ionicons name="lock-closed-outline" size={22} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>Бүртгэлийн хамгаалалт</Text>
          <Text style={st.sub}>
            Нууц үгээ тогтмол шинэчилж, боломжтой үед биометр нэвтрэлтийг асаагаарай.
          </Text>
        </View>
      </AppCard>

      <AppCard style={st.card}>
        <View style={st.row}>
          <View style={[st.iconBox, { backgroundColor: C.primary + '18' }]}>
            <Ionicons name="finger-print-outline" size={22} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.label}>Биометр нэвтрэлт</Text>
            <Text style={st.sub}>
              {bioAvailable ? 'Хурууны хээ / Face ID ашиглана.' : unavailableMessage}
            </Text>
          </View>
          <Switch
            value={bioEnabled}
            disabled={!bioAvailable}
            onValueChange={toggleBio}
            accessibilityLabel="Биометр нэвтрэлт асаах"
            accessibilityState={{ checked: bioEnabled, disabled: !bioAvailable }}
            trackColor={{ false: C.bgSection, true: C.primary + '55' }}
                thumbColor={bioEnabled ? C.bgCard : C.textMuted}
          />
        </View>
      </AppCard>

      <TouchableOpacity
        activeOpacity={0.86}
        accessibilityRole="button"
        accessibilityLabel="Нууц үг солих хэсэг нээх"
        accessibilityState={{ expanded: showPassword }}
        onPress={() => setShowPassword((v) => !v)}
      >
        <AppCard style={st.card}>
          <View style={st.row}>
            <View style={[st.iconBox, { backgroundColor: C.seller + '18' }]}>
              <Ionicons name="key-outline" size={21} color={C.seller} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.label}>Нууц үг солих</Text>
              <Text style={st.sub}>Шинэ нууц үг 6-аас дээш тэмдэгттэй байх хэрэгтэй.</Text>
            </View>
            <Ionicons name={showPassword ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
          </View>
        </AppCard>
      </TouchableOpacity>

      {showPassword ? (
        <AppCard style={st.formCard}>
          <TextInput
            style={st.input}
            placeholder="Хуучин нууц үг"
            accessibilityLabel="Хуучин нууц үг"
            placeholderTextColor={C.textMuted}
            secureTextEntry
            value={oldPw}
            onChangeText={setOldPw}
            autoCapitalize="none"
          />
          <TextInput
            style={st.input}
            placeholder="Шинэ нууц үг"
            accessibilityLabel="Шинэ нууц үг"
            placeholderTextColor={C.textMuted}
            secureTextEntry
            value={newPw}
            onChangeText={setNewPw}
            autoCapitalize="none"
          />
          <AppButton label="Хадгалах" icon="checkmark-circle-outline" onPress={savePassword} />
        </AppCard>
      ) : null}
    </AppScreen>
  );
}

const st = StyleSheet.create({
  summary: {
    marginBottom: R.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
  },
  summaryIcon: {
    width: UI.iconBox,
    height: UI.iconBox,
    borderRadius: UI.controlRadius,
    backgroundColor: C.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginBottom: R.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
  },
  iconBox: {
    width: UI.iconBox,
    height: UI.iconBox,
    borderRadius: UI.controlRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...F.h4,
    color: C.text,
  },
  label: {
    ...F.body,
    color: C.text,
    fontWeight: '700',
  },
  sub: {
    ...F.small,
    color: C.textSub,
    marginTop: 3,
    lineHeight: 18,
  },
  formCard: {
    gap: R.sm,
  },
  input: {
    minHeight: 48,
    backgroundColor: C.bgInput,
    borderRadius: UI.controlRadius,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: R.md,
    color: C.text,
    ...F.body,
  },
});
