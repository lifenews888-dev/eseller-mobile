import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  type KeyboardTypeOptions,
} from 'react-native';
import { Stack } from 'expo-router';
import { post } from '../../src/services/api';
import { C, F, R } from '../../src/shared/design';
import { AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

export default function CorporateOrder() {
  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [details, setDetails] = useState('');
  const [qty, setQty] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!company || !contact || !phone || !details) {
      Alert.alert('Анхаарна уу', 'Шаардлагатай талбаруудыг бөглөнө үү.');
      return;
    }
    setLoading(true);
    try {
      await post('/corporate-order', {
        company,
        contact,
        phone,
        email,
        details,
        quantity: Number(qty) || undefined,
      });
      Alert.alert('Амжилттай', 'Таны корпоратив захиалгыг хүлээн авлаа.\nАжлын 1 хоногт холбогдоно.', [
        { text: 'За' },
      ]);
    } catch {
      Alert.alert('Алдаа', 'Илгээхэд алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setLoading(false);
    }
  }

  const fields: {
    label: string;
    value: string;
    setter: (v: string) => void;
    placeholder: string;
    keyboard?: KeyboardTypeOptions;
  }[] = [
    { label: 'Байгууллагын нэр *', value: company, setter: setCompany, placeholder: 'ХК, ХХК, NGO...' },
    { label: 'Холбоо барих хүн *', value: contact, setter: setContact, placeholder: 'Таны нэр' },
    { label: 'Утасны дугаар *', value: phone, setter: setPhone, placeholder: '99112233', keyboard: 'phone-pad' },
    { label: 'Имэйл', value: email, setter: setEmail, placeholder: 'company@mail.mn', keyboard: 'email-address' },
    { label: 'Тоо хэмжээ', value: qty, setter: setQty, placeholder: '100+', keyboard: 'number-pad' },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AppScreen keyboardShouldPersistTaps="handled">
        <AppTopBar eyebrow="Бизнес" title="Корпоратив захиалга" showBack={false} />
        <AppHeader
          title="Корпоратив захиалга"
          subtitle="Байгууллагын хэмжээний захиалга, хямдрал, BNPL болон тусгай нөхцөл"
          icon="briefcase-outline"
          accent={C.primary}
        />

        <AppCard style={{ marginBottom: R.lg }}>
          <Text style={{ ...F.small, color: C.textSub, lineHeight: 21 }}>
            Байгууллагын хэрэгцээнд тохирсон бараа, тоо хэмжээ, хугацаагаа үлдээгээрэй. Манай баг
            ажлын 1 хоногт холбогдоно.
          </Text>
        </AppCard>

        <View style={{ gap: R.sm }}>
          {fields.map((field) => (
            <View key={field.label}>
              <Text style={st.label}>{field.label}</Text>
              <TextInput
                value={field.value}
                onChangeText={field.setter}
                placeholder={field.placeholder}
                placeholderTextColor={C.textMuted}
                keyboardType={field.keyboard ?? 'default'}
                style={st.input}
              />
            </View>
          ))}

          <View>
            <Text style={st.label}>Захиалгын дэлгэрэнгүй *</Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Ямар бараа, хэдэн ширхэг, хэзээ хэрэгтэй..."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={4}
              style={[st.input, { height: 112, textAlignVertical: 'top' }]}
            />
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.86} onPress={submit} disabled={loading} style={st.submitButton}>
            {loading ? <ActivityIndicator color={C.bgCard} /> : <Text style={st.submitText}>Илгээх</Text>}
        </TouchableOpacity>
      </AppScreen>
    </>
  );
}

const st = {
  label: {
    ...F.tiny,
    color: C.textSub,
    fontWeight: '800' as const,
    marginBottom: 5,
  },
  input: {
    backgroundColor: C.bgCard,
    borderRadius: R.md,
    padding: R.md,
    fontSize: 14,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
  },
  submitButton: {
    backgroundColor: C.primary,
    borderRadius: R.md,
    padding: 15,
    alignItems: 'center' as const,
    marginTop: R.lg,
  },
  submitText: { color: C.bgCard, fontSize: 14, fontWeight: '900' as const },
};
