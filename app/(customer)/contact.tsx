import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

type MessageType = {
  id: MessageTypeId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type MessageTypeId = 'question' | 'bug' | 'idea' | 'complaint';

const MESSAGE_TYPES: MessageType[] = [
  { id: 'question', label: 'Асуулт', icon: 'help-circle-outline' },
  { id: 'bug', label: 'Алдаа мэдээлэх', icon: 'bug-outline' },
  { id: 'idea', label: 'Санал', icon: 'bulb-outline' },
  { id: 'complaint', label: 'Гомдол', icon: 'chatbox-ellipses-outline' },
];

function isMessageTypeId(value: unknown): value is MessageTypeId {
  return value === 'question' || value === 'bug' || value === 'idea' || value === 'complaint';
}

const CONTACTS = [
  {
    icon: 'call-outline' as const,
    label: 'Утас',
    value: '7700-XXXX',
    sub: 'Даваа-Баасан 9:00-18:00',
    accent: C.primary,
    onPress: () => Linking.openURL('tel:7700XXXX'),
  },
  {
    icon: 'mail-outline' as const,
    label: 'Имэйл',
    value: 'info@eseller.mn',
    sub: '24 цагийн дотор хариулна',
    accent: C.secondary,
    onPress: () => Linking.openURL('mailto:info@eseller.mn'),
  },
  {
    icon: 'logo-facebook' as const,
    label: 'Facebook',
    value: '@eseller.mn',
    sub: 'Мессеж илгээх',
    accent: C.primary,
    onPress: () => Linking.openURL('https://facebook.com/eseller.mn'),
  },
  {
    icon: 'logo-instagram' as const,
    label: 'Instagram',
    value: '@eseller.mn',
    sub: 'Шинэ мэдээ, урамшуулал',
    accent: C.seller,
    onPress: () => Linking.openURL('https://instagram.com/eseller.mn'),
  },
  {
    icon: 'location-outline' as const,
    label: 'Хаяг',
    value: 'Улаанбаатар хот',
    sub: 'Чингэлтэй дүүрэг',
    accent: C.driver,
    onPress: () => Linking.openURL('https://maps.google.com/'),
  },
];

export default function ContactScreen() {
  const params = useLocalSearchParams<{ type?: string; plan?: string }>();
  const layout = useAppLayoutMetrics();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<MessageTypeId>(MESSAGE_TYPES[0].id);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setType(isMessageTypeId(params.type) ? params.type : MESSAGE_TYPES[0].id);
  }, [params.type]);

  const handleTypePress = (nextType: MessageTypeId) => {
    setType(nextType);
    router.replace(
      nextType === MESSAGE_TYPES[0].id
        ? ('/contact' as any)
        : ({ pathname: '/contact' as any, params: { type: nextType } } as any),
    );
  };

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert('Анхаар', 'Нэр, имэйл, мессежээ бүрэн бөглөнө үү.');
      return;
    }

    const selectedType = MESSAGE_TYPES.find((item) => item.id === type)?.label ?? type;
    const plan = typeof params.plan === 'string' ? params.plan : '';
    const body = encodeURIComponent(
      [
        `Нэр: ${name.trim()}`,
        `Имэйл: ${email.trim()}`,
        `Төрөл: ${selectedType}`,
        '',
        message.trim(),
      ].filter(Boolean).join('\n'),
    );
    const recipient = type === 'idea' ? 'feedback@eseller.mn' : 'info@eseller.mn';
    const subject = type === 'idea'
      ? 'Санал хүсэлт'
      : `eSeller ${selectedType}`;

    setSending(true);
    try {
      await Linking.openURL(
        `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${body}`,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setName('');
      setEmail('');
      setMessage('');
    } catch (e: any) {
      Alert.alert('Алдаа', e?.message || 'Мэйл апп нээх боломжгүй байна.');
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <AppScreen keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: layout.screenBottom + 96 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <AppTopBar eyebrow="Дэмжлэг" title="Холбоо барих" showBack={false} />
        <AppHeader
          title="Холбоо барих"
          subtitle="Асуулт, санал, алдаа эсвэл гомдлоо дэмжлэгийн багт илгээнэ."
          icon="call-outline"
          accent={C.secondary}
        />

      <View style={st.contactList}>
        {CONTACTS.map((item) => (
          <ContactCard key={item.label} {...item} />
        ))}
      </View>

      <AppCard elevated style={st.formCard}>
        <View style={st.formHead}>
          <View style={st.formIcon}>
            <Ionicons name="paper-plane-outline" size={21} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.sectionTitle}>Санал хүсэлт илгээх</Text>
            <Text style={st.sectionSub}>Мэдээллээ бөглөөд мэйл апп-аар илгээнэ.</Text>
          </View>
        </View>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Нэр"
          accessibilityLabel="Нэр"
          textContentType="name"
          returnKeyType="next"
          placeholderTextColor={C.textMuted}
          style={st.input}
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Имэйл"
          accessibilityLabel="Имэйл"
          placeholderTextColor={C.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          style={st.input}
        />

        <Text style={st.fieldLabel}>Төрөл</Text>
        <View style={st.typeGrid}>
          {MESSAGE_TYPES.map((item) => {
            const active = type === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.86}
                onPress={() => handleTypePress(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${item.label} төрөл сонгох`}
                accessibilityState={{ selected: active }}
                style={[st.typeButton, active && st.typeButtonActive]}
              >
                <Ionicons name={item.icon} size={18} color={active ? C.primary : C.textMuted} />
                <Text style={[st.typeText, active && st.typeTextActive]} numberOfLines={1}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Мессеж"
          accessibilityLabel="Мессеж"
          placeholderTextColor={C.textMuted}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          style={[st.input, st.messageInput]}
        />

      </AppCard>
      </AppScreen>

      <View style={[st.fixedActions, { paddingBottom: layout.insets.bottom + R.lg }]}>
        <AppButton
          label={sending ? 'Илгээж байна...' : 'Илгээх'}
          icon="arrow-forward"
          disabled={sending}
          onPress={handleSubmit}
        />
      </View>
    </View>
  );
}

function ContactCard({
  icon,
  label,
  value,
  sub,
  accent,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub: string;
  accent: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      <AppCard style={st.contactCard}>
        <View style={[st.contactIcon, { backgroundColor: accent + '18' }]}>
          <Ionicons name={icon} size={21} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.contactLabel}>{label}</Text>
          <Text style={st.contactValue}>{value}</Text>
          <Text style={st.contactSub}>{sub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
      </AppCard>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  contactList: {
    gap: R.sm,
    marginBottom: R.lg,
  },
  contactCard: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
    padding: R.md,
  },
  contactIcon: {
    width: UI.iconBox,
    height: UI.iconBox,
    borderRadius: UI.controlRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    ...F.tiny,
    color: C.textMuted,
  },
  contactValue: {
    ...F.body,
    color: C.text,
    fontWeight: '800',
    marginTop: 1,
  },
  contactSub: {
    ...F.tiny,
    color: C.textSub,
    marginTop: 2,
  },
  formCard: {
    gap: R.sm,
  },
  fixedActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.bgCard,
    padding: UI.screenPad,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  formHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
    marginBottom: R.xs,
  },
  formIcon: {
    width: UI.iconBox,
    height: UI.iconBox,
    borderRadius: UI.controlRadius,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...F.h4,
    color: C.text,
  },
  sectionSub: {
    ...F.small,
    color: C.textSub,
    marginTop: 3,
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
  messageInput: {
    minHeight: 118,
    paddingTop: R.md,
    textAlignVertical: 'top',
  },
  fieldLabel: {
    ...F.small,
    color: C.textSub,
    fontWeight: '800',
    marginTop: R.xs,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: R.sm,
  },
  typeButton: {
    width: '48%',
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.xs,
    backgroundColor: C.bgCard,
    borderRadius: UI.controlRadius,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: R.sm,
  },
  typeButtonActive: {
    backgroundColor: C.primaryDim,
    borderColor: C.primary,
  },
  typeText: {
    ...F.small,
    color: C.textSub,
    fontWeight: '700',
    flex: 1,
  },
  typeTextActive: {
    color: C.primary,
  },
});
