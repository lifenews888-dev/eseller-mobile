import React, { useEffect, useState } from 'react'
import {
  Alert,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { C, R, F, UI } from '../src/shared/design'
import { AppButton, AppHeader, AppTopBar, useAppLayoutMetrics } from '../src/shared/ui/AppUI'

const PARTNER_TYPES = [
  { id: 'LOGISTICS', label: 'Логистик', icon: 'car-outline' },
  { id: 'WAREHOUSE', label: 'Агуулах / Очиж авах цэг', icon: 'storefront-outline' },
  { id: 'PAYMENT', label: 'Төлбөрийн систем', icon: 'card-outline' },
  { id: 'TECH', label: 'Технологи / API', icon: 'phone-portrait-outline' },
  { id: 'OTHER', label: 'Бусад', icon: 'people-outline' },
]
const DEFAULT_PARTNER_TYPE = PARTNER_TYPES[0].id

const OPPORTUNITIES = [
  {
    icon: 'storefront-outline' as const,
    title: 'Агуулахын хамтрал',
    text: 'Очиж авах цэг болох, агуулах үйлчилгээ',
  },
  {
    icon: 'bus-outline' as const,
    title: 'Логистик хамтрал',
    text: 'Хүргэлтийн компаниудтай хамтрах',
  },
  {
    icon: 'card-outline' as const,
    title: 'Төлбөрийн хамтрал',
    text: 'Банк, финтеч компаниудтай',
  },
  {
    icon: 'phone-portrait-outline' as const,
    title: 'Технологийн хамтрал',
    text: 'API интеграци, white-label',
  },
]

export default function PartnerScreen() {
  const params = useLocalSearchParams<{ type?: string }>()
  const layout = useAppLayoutMetrics()
  const [company, setCompany] = useState('')
  const [person, setPerson] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState(() => normalizePartnerType(params.type))
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedType = PARTNER_TYPES.find((item) => item.id === type)?.label ?? type

  useEffect(() => {
    setType(normalizePartnerType(params.type))
  }, [params.type])

  function selectType(nextType: string) {
    setType(nextType)
    router.replace(
      nextType === DEFAULT_PARTNER_TYPE
        ? ('/partner' as any)
        : ({ pathname: '/partner' as any, params: { type: nextType } } as any),
    )
  }

  async function submit() {
    if (!company.trim() || !person.trim() || !email.trim() || !message.trim()) {
      Alert.alert('Анхаар', 'Компани, холбоо барих хүн, имэйл, мессежээ бөглөнө үү.')
      return
    }

    const body = encodeURIComponent(
      [
        `Компанийн нэр: ${company.trim()}`,
        `Холбоо барих хүн: ${person.trim()}`,
        `Имэйл: ${email.trim()}`,
        `Утас: ${phone.trim() || '-'}`,
        `Хамтралын төрөл: ${selectedType}`,
        '',
        message.trim(),
      ].join('\n'),
    )

    setSubmitting(true)
    try {
      await Linking.openURL(
        `mailto:info@eseller.mn?subject=eSeller%20хамтралын%20хүсэлт&body=${body}`,
      )
    } catch (e: any) {
      Alert.alert('Алдаа', e?.message || 'Мэйл апп нээх боломжгүй байна.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ padding: R.lg, paddingTop: layout.screenTop, paddingBottom: layout.screenBottom }}
      >
        <AppTopBar eyebrow="Бизнес" title="Хамтрах" />
        <AppHeader
          title="Eseller.mn-тэй хамтрах"
          subtitle="Логистик, агуулах, төлбөр, технологийн хамтын ажиллагааны хүсэлт илгээнэ."
          icon="people-outline"
          accent={C.brand}
        />

        <View style={{ gap: 10, marginBottom: 18 }}>
          {OPPORTUNITIES.map((item) => (
            <View
              key={item.title}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${item.title}. ${item.text}`}
              style={{
                backgroundColor: C.bgCard,
                borderRadius: R.lg,
                borderWidth: 1,
                borderColor: C.border,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: R.md,
                  backgroundColor: C.brand + '18',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={item.icon} size={21} color={C.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>
                  {item.title}
                </Text>
                <Text style={{ color: C.textSub, fontSize: 12, marginTop: 2 }}>
                  {item.text}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={{ ...F.h3, color: C.text, marginBottom: 10 }}>Хамтралын хүсэлт</Text>
        <Field
          label="Компанийн нэр"
          value={company}
          onChangeText={setCompany}
          placeholder="ХХК нэр"
        />
        <Field
          label="Холбоо барих хүн"
          value={person}
          onChangeText={setPerson}
          placeholder="Таны нэр"
        />
        <Field
          label="Имэйл"
          value={email}
          onChangeText={setEmail}
          placeholder="email@company.mn"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <Field
          label="Утас"
          value={phone}
          onChangeText={setPhone}
          placeholder="99XXXXXX"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          returnKeyType="next"
        />

        <Text style={{ color: C.textSub, fontSize: 13, fontWeight: '800', marginBottom: 8 }}>
          Хамтралын төрөл
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {PARTNER_TYPES.map((item) => {
            const active = type === item.id
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => selectType(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${item.label} хамтралын төрөл сонгох`}
                accessibilityState={{ selected: active }}
                style={{
                  width: '48%',
                  borderRadius: R.lg,
                  borderWidth: 1,
                  borderColor: active ? C.brand : C.border,
                  backgroundColor: active ? C.brand + '14' : C.bgCard,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={active ? C.brand : C.textMuted}
                />
                <Text
                  style={{
                    color: active ? C.brand : C.textSub,
                    fontSize: 12,
                    fontWeight: '700',
                    flex: 1,
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Field
          label="Мессеж"
          value={message}
          onChangeText={setMessage}
          placeholder="Хамтрах саналаа бичнэ үү..."
          multiline
          numberOfLines={5}
          inputStyle={{ minHeight: 110, textAlignVertical: 'top' }}
        />

        <AppButton
          label={submitting ? 'Илгээж байна...' : 'Хүсэлт илгээх'}
          icon="arrow-forward"
          onPress={submit}
          disabled={submitting}
          style={{
            backgroundColor: C.brand,
            borderRadius: R.lg,
            marginTop: 4,
          }}
        />
      </ScrollView>
    </>
  )
}

function normalizePartnerType(value?: string | string[] | null) {
  if (typeof value !== 'string') return DEFAULT_PARTNER_TYPE
  const normalized = value.trim().toUpperCase()
  return PARTNER_TYPES.some((item) => item.id === normalized) ? normalized : DEFAULT_PARTNER_TYPE
}

function Field({
  label,
  inputStyle: overrideStyle,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string
  inputStyle?: React.ComponentProps<typeof TextInput>['style']
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: C.textSub, fontSize: 13, fontWeight: '800', marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={C.textMuted}
        style={[inputStyle, overrideStyle]}
      />
    </View>
  )
}

const inputStyle = {
  backgroundColor: C.bgCard,
  borderRadius: R.lg,
  borderWidth: 1,
  borderColor: C.border,
  color: C.text,
  fontSize: 14,
  padding: 14,
}
