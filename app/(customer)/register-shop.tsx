import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { post } from '../../src/services/api';
import { uploadImageToCloudinary } from '../../src/lib/uploadImage';
import { C, F, R, UI } from '../../src/shared/design';
import { useMalchnaasEnabled } from '../../src/config/remoteFlags';
import { useAuth } from '../../src/store/auth';
import { AuthValueIntro } from '../../src/components/AuthValueIntro';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

const REGISTER_SHOP_RETURN_TO = '/register-shop';

const TYPES_BASE = [
  { key: 'GENERAL', icon: 'storefront-outline' as const, label: 'Ерөнхий' },
  { key: 'PREORDER', icon: 'time-outline' as const, label: 'Preorder' },
  { key: 'REAL_ESTATE', icon: 'home-outline' as const, label: 'Үл хөдлөх' },
  { key: 'CONSTRUCTION', icon: 'construct-outline' as const, label: 'Барилга' },
  { key: 'AUTO', icon: 'car-outline' as const, label: 'Авто' },
  { key: 'SERVICE', icon: 'briefcase-outline' as const, label: 'Үйлчилгээ' },
  { key: 'DIGITAL', icon: 'cloud-outline' as const, label: 'Дижитал' },
];

const HERDER_TYPE = { key: 'HERDER', icon: 'leaf-outline' as const, label: 'Малчин' };

const BANKS = [
  'Хаан банк',
  'Голомт банк',
  'ХХБ',
  'Төрийн банк',
  'Богд банк',
  'Капитрон банк',
];

const STEP_COPY = [
  {
    title: 'Дэлгүүрийн төрөл',
    subtitle: 'Таны бизнесийн төрөлд тохирох урсгалыг сонгоно.',
    icon: 'storefront-outline' as const,
  },
  {
    title: 'Үндсэн мэдээлэл',
    subtitle: 'Хэрэглэгчдэд харагдах нэр, холбоо барих дугаарыг бөглөнө.',
    icon: 'document-text-outline' as const,
  },
  {
    title: 'Лого ба тайлбар',
    subtitle: 'Дэлгүүрийн таних тэмдэг болон богино танилцуулгаа нэмнэ.',
    icon: 'image-outline' as const,
  },
  {
    title: 'Банкны мэдээлэл',
    subtitle: 'Төлбөр хүлээн авах банкны дансаа баталгаажуулна.',
    icon: 'card-outline' as const,
  },
];

export default function RegisterShopScreen() {
  const { user } = useAuth();
  const malchnaasEnabled = useMalchnaasEnabled();
  const types = useMemo(
    () => (malchnaasEnabled ? [...TYPES_BASE, HERDER_TYPE] : TYPES_BASE),
    [malchnaasEnabled],
  );

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [shopType, setShopType] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [logo, setLogo] = useState('');
  const [about, setAbout] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');

  useEffect(() => {
    const userPhone = (user as any)?.phone;
    if (!phone && userPhone) setPhone(userPhone);
  }, [phone, user]);

  const goToLogin = () => {
    router.push({ pathname: '/login', params: { returnTo: REGISTER_SHOP_RETURN_TO } } as any);
  };

  const goToRegister = () => {
    router.push({ pathname: '/register', params: { role: 'seller', returnTo: REGISTER_SHOP_RETURN_TO } } as any);
  };

  const pickImg = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;

    setSubmitting(true);
    try {
      const cloudUrl = await uploadImageToCloudinary(result.assets[0].uri);
      setLogo(cloudUrl);
    } catch {
      Alert.alert('Алдаа', 'Зураг хуулахад алдаа гарлаа.');
    } finally {
      setSubmitting(false);
    }
  };

  const canNext = () => {
    if (step === 1) return !!shopType;
    if (step === 2) return !!name.trim() && !!phone.trim();
    if (step === 3) return true;
    if (step === 4) return !!bankName && !!bankAccount.trim();
    return false;
  };

  const handleNext = () => {
    if (step === 1 && shopType === 'HERDER') {
      router.replace('/register-herder' as never);
      return;
    }
    setStep((value) => Math.min(4, value + 1));
  };

  const handleSubmit = async () => {
    if (!user) {
      goToLogin();
      return;
    }

    setSubmitting(true);
    try {
      await post('/shops', {
        type: shopType,
        name: name.trim(),
        slug: slug || name.trim().toLowerCase().replace(/\s+/g, '-'),
        phone: phone.trim(),
        about: about.trim(),
        bankName,
        bankAccount: bankAccount.trim(),
        logo: logo || undefined,
      });
      Alert.alert('Амжилттай', 'Дэлгүүр үүслээ.', [
        { text: 'OK', onPress: () => router.replace('/profile' as never) },
      ]);
    } catch (e: any) {
      Alert.alert('Алдаа', e?.message || 'Дэлгүүр үүсгэж чадсангүй.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <AppScreen showsVerticalScrollIndicator={false}>
        <AppTopBar eyebrow="Дэлгүүр" title="Дэлгүүр нээх" showBack={false} />
        <AppHeader
          title="Нэвтэрч үргэлжлүүлнэ"
          subtitle="Нэвтэрсний дараа энэ бүртгэлийн хуудсанд автоматаар буцаж ирнэ."
          icon="storefront-outline"
          accent={C.store}
        />

        <AuthValueIntro />

        <AppCard style={styles.authCard}>
          <View style={styles.authIcon}>
            <Ionicons name="storefront-outline" size={30} color={C.store} />
          </View>
          <Text style={styles.authTitle}>Дэлгүүр нээхэд бүртгэл шаардлагатай</Text>
          <Text style={styles.authCopy}>
            eSeller аккаунтаараа нэвтрээд дэлгүүрийн мэдээллээ үргэлжлүүлэн бөглөнө үү.
          </Text>
          <AppButton label="Нэвтрэх" icon="log-in-outline" onPress={goToLogin} style={styles.authButton} />
          <AppButton
            label="Шинээр бүртгүүлэх"
            icon="person-add-outline"
            onPress={goToRegister}
            variant="secondary"
            style={styles.authButton}
          />
        </AppCard>
      </AppScreen>
    );
  }

  const current = STEP_COPY[step - 1];

  return (
    <AppScreen keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <AppTopBar eyebrow="Дэлгүүр" title="Дэлгүүр нээх" showBack={false} />
      <AppHeader
        title={current.title}
        subtitle={current.subtitle}
        icon={current.icon}
        accent={C.store}
      />

      <StepProgress step={step} />

      <AppCard style={styles.stepCard}>
        {step === 1 ? (
          <>
            <Text style={styles.sectionTitle}>Төрөл сонгох</Text>
            <View style={styles.typeGrid}>
              {types.map((type) => {
                const selected = shopType === type.key;
                return (
                  <TouchableOpacity
                    key={type.key}
                    activeOpacity={0.86}
                    onPress={() => setShopType(type.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.typeCard, selected && styles.typeCardActive]}
                  >
                    <Ionicons name={type.icon} size={26} color={selected ? C.store : C.textMuted} />
                    <Text style={[styles.typeLabel, selected && { color: C.text }]} numberOfLines={1}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Field label="Дэлгүүрийн нэр">
              <TextInput
                style={styles.input}
                placeholder="Дэлгүүрийн нэр *"
                placeholderTextColor={C.textMuted}
                value={name}
                onChangeText={setName}
              />
            </Field>
            <Field label="Slug">
              <TextInput
                style={styles.input}
                placeholder="my-shop"
                placeholderTextColor={C.textMuted}
                value={slug}
                onChangeText={(text) => setSlug(text.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                autoCapitalize="none"
              />
            </Field>
            <Field label="Утас">
              <TextInput
                style={styles.input}
                placeholder="99XXXXXX *"
                placeholderTextColor={C.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </Field>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text style={styles.sectionTitle}>Лого</Text>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.logoPick}
              onPress={pickImg}
              disabled={submitting}
            >
              {logo ? (
                <Image source={{ uri: logo }} style={styles.logoImage} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={28} color={C.textMuted} />
                  <Text style={styles.logoText}>{submitting ? 'Хуулж байна' : 'Лого нэмэх'}</Text>
                </>
              )}
            </TouchableOpacity>
            <Field label="Тайлбар">
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Дэлгүүрийн танилцуулга"
                placeholderTextColor={C.textMuted}
                value={about}
                onChangeText={setAbout}
                multiline
              />
            </Field>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <Text style={styles.sectionTitle}>Банк сонгох</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bankList}
            >
              {BANKS.map((bank) => {
                const selected = bankName === bank;
                return (
                  <TouchableOpacity
                    key={bank}
                    activeOpacity={0.86}
                    style={[styles.bankChip, selected && styles.bankChipActive]}
                    onPress={() => setBankName(bank)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.bankText, selected && { color: C.bgCard }]} numberOfLines={1}>
                      {bank}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Field label="Дансны дугаар">
              <TextInput
                style={styles.input}
                placeholder="Дансны дугаар *"
                placeholderTextColor={C.textMuted}
                value={bankAccount}
                onChangeText={setBankAccount}
                keyboardType="number-pad"
              />
            </Field>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={18} color={C.primary} />
              <Text style={styles.infoText}>Эхний 3 сар 0% комисс.</Text>
            </View>
          </>
        ) : null}
      </AppCard>

      <View style={styles.navRow}>
        {step > 1 ? (
          <AppButton
            label="Буцах"
            icon="arrow-back"
            onPress={() => setStep((value) => Math.max(1, value - 1))}
            variant="secondary"
            style={styles.backButton}
          />
        ) : null}
        <AppButton
          label={step === 4 ? (submitting ? 'Нээж байна' : 'Дэлгүүр нээх') : 'Дараах'}
          icon={step === 4 ? 'checkmark-circle-outline' : 'arrow-forward'}
          onPress={step === 4 ? handleSubmit : handleNext}
          disabled={!canNext() || submitting}
          style={styles.nextButton}
        />
      </View>
    </AppScreen>
  );
}

function StepProgress({ step }: { step: number }) {
  return (
    <View style={styles.progressWrap}>
      {[1, 2, 3, 4].map((item) => {
        const active = item <= step;
        const done = item < step;
        return (
          <View key={item} style={styles.progressItem}>
            <View style={[styles.progressDot, active && styles.progressDotActive]}>
              {done ? (
                <Ionicons name="checkmark" size={14} color={C.bgCard} />
              ) : (
                <Text style={[styles.progressText, active && { color: C.bgCard }]}>{item}</Text>
              )}
            </View>
            {item < 4 ? <View style={[styles.progressLine, done && styles.progressLineDone]} /> : null}
          </View>
        );
      })}
    </View>
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
  authCard: { alignItems: 'center' },
  authIcon: {
    width: 58,
    height: 58,
    borderRadius: UI.controlRadius,
    backgroundColor: `${C.store}14`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: R.md,
  },
  authTitle: { ...F.h3, color: C.text, textAlign: 'center' },
  authCopy: { ...F.small, color: C.textSub, textAlign: 'center', lineHeight: 20, marginTop: R.xs },
  authButton: { alignSelf: 'stretch', marginTop: R.sm },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: R.lg,
  },
  progressItem: { flexDirection: 'row', alignItems: 'center' },
  progressDot: {
    width: 30,
    height: 30,
    borderRadius: R.full,
    backgroundColor: C.bgSection,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  progressDotActive: {
    backgroundColor: C.store,
    borderColor: C.store,
  },
  progressText: { ...F.small, color: C.textMuted, fontWeight: '900' },
  progressLine: { width: 34, height: 2, backgroundColor: C.border, marginHorizontal: 4 },
  progressLineDone: { backgroundColor: C.store },
  stepCard: { gap: R.md },
  sectionTitle: { ...F.h3, color: C.text },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: R.sm },
  typeCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 92,
    backgroundColor: C.bgSection,
    borderRadius: UI.controlRadius,
    padding: R.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  typeCardActive: { borderColor: C.store, backgroundColor: `${C.store}12` },
  typeLabel: { ...F.small, color: C.textSub, fontWeight: '900', marginTop: R.sm },
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
  textArea: { minHeight: 104, textAlignVertical: 'top' },
  logoPick: {
    width: 126,
    height: 126,
    borderRadius: UI.controlRadius,
    backgroundColor: C.bgSection,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
    alignSelf: 'center',
  },
  logoImage: { width: '100%', height: '100%', borderRadius: UI.controlRadius },
  logoText: { ...F.tiny, color: C.textMuted, fontWeight: '800', marginTop: R.xs },
  bankList: { gap: R.sm, paddingBottom: R.xs },
  bankChip: {
    minHeight: 38,
    backgroundColor: C.bgSection,
    borderRadius: R.full,
    paddingHorizontal: R.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  bankChipActive: { backgroundColor: C.store, borderColor: C.store },
  bankText: { ...F.small, color: C.textSub, fontWeight: '800' },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
    backgroundColor: C.primaryDim,
    borderRadius: UI.controlRadius,
    padding: R.md,
  },
  infoText: { ...F.small, color: C.primary, flex: 1, fontWeight: '800' },
  navRow: { flexDirection: 'row', gap: R.sm, marginTop: R.lg },
  backButton: { flex: 0.42 },
  nextButton: { flex: 1 },
});
