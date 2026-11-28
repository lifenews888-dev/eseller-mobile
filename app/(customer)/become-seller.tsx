import React, { useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Stack, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { C, R, UI } from '../../src/shared/design'
import { AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI'

type SellerType = {
  id: string
  icon: keyof typeof Ionicons.glyphMap
  title: string
  desc: string
  badge?: string
  tags: string[]
}

const SELLER_TYPES: SellerType[] = [
  {
    id: 'shop',
    icon: 'storefront-outline',
    title: 'Дэлгүүр',
    desc: 'Бараа бүтээгдэхүүн зарах онлайн дэлгүүр',
    tags: ['Бараа удирдлага', 'Захиалгын систем', 'Хүргэлт', 'Хямдрал & купон'],
  },
  {
    id: 'preorder',
    icon: 'time-outline',
    title: 'Захиалгын дэлгүүр',
    desc: 'Гадаадаас захиалж оруулдаг бараа',
    badge: 'Шинэ',
    tags: ['Урьдчилсан захиалга', 'Хүлээх хугацаа', 'Минимум захиалга', 'Урьдчилгаа төлбөр'],
  },
  {
    id: 'real_estate',
    icon: 'home-outline',
    title: 'Үл хөдлөхийн агент',
    desc: 'Орон сууц, газар, оффисийн зуучлал',
    tags: ['Зар байршуулах', 'Мэргэжлийн профайл', 'Харилцагч удирдлага', 'Аналитик'],
  },
  {
    id: 'construction',
    icon: 'construct-outline',
    title: 'Барилгын компани',
    desc: 'Шинэ барилга, орон сууцны төсөл',
    tags: ['Төслийн удирдлага', 'Галерей', 'Баримт бичиг', 'VIP байршил'],
  },
  {
    id: 'auto',
    icon: 'car-outline',
    title: 'Авто худалдаа',
    desc: 'Шинэ болон хуучин автомашин',
    tags: ['Машины жагсаалт', 'Техник тодорхойлолт', 'Үнийн харьцуулалт', 'Тест драйв'],
  },
  {
    id: 'service',
    icon: 'briefcase-outline',
    title: 'Үйлчилгээ',
    desc: 'Салон, засвар, хэвлэл, сургалт г.м.',
    tags: ['Цаг захиалга', 'Үйлчилгээний жагсаалт', 'Хуанли', 'Портфолио'],
  },
  {
    id: 'digital',
    icon: 'cloud-download-outline',
    title: 'Файл / Дижитал бараа',
    desc: 'Татаж авах дижитал контент зарах',
    badge: 'Шинэ',
    tags: ['PDF, ZIP, видео', 'Шууд татах', 'Сарын захиалга', 'Лицензийн түлхүүр'],
  },
]

const STEP_TITLES = [
  'Төрөл сонгох',
  'Бизнес мэдээлэл',
  'Холбоо барих',
  'Төлбөрийн мэдээлэл',
  'Баталгаажуулах',
]

const BANKS = ['Хаан банк', 'Голомт банк', 'ХХБ', 'Төрийн банк', 'Богд банк', 'Капитрон банк']

export default function BecomeSeller() {
  const layout = useAppLayoutMetrics()
  const [step, setStep] = useState(0)
  const [sellerType, setSellerType] = useState(SELLER_TYPES[0].id)
  const [businessName, setBusinessName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('Улаанбаатар')
  const [experience, setExperience] = useState('')
  const [bankName, setBankName] = useState(BANKS[0])
  const [bankAccount, setBankAccount] = useState('')
  const [accepted, setAccepted] = useState(false)

  const selectedType = useMemo(
    () => SELLER_TYPES.find((item) => item.id === sellerType) ?? SELLER_TYPES[0],
    [sellerType],
  )

  const canContinue = useMemo(() => {
    if (step === 0) return !!sellerType
    if (step === 1) return !!businessName.trim() && !!ownerName.trim()
    if (step === 2) return !!phone.trim() && !!email.trim()
    if (step === 3) return !!bankName.trim() && !!bankAccount.trim()
    return accepted
  }, [accepted, bankAccount, bankName, businessName, email, ownerName, phone, sellerType, step])

  function next() {
    if (!canContinue) return
    if (step < STEP_TITLES.length - 1) {
      setStep(step + 1)
      return
    }

    Alert.alert(
      'Бүртгэл эхлүүлэх',
      'Сонгосон мэдээллээр борлуулагчийн бүртгэл үүсгэх хэсэг рүү шилжинэ.',
      [
        { text: 'Буцах', style: 'cancel' },
        {
          text: 'Үргэлжлүүлэх',
          onPress: () => router.push('/register?role=seller' as never),
        },
      ],
    )
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: C.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: R.lg, paddingTop: layout.screenTop, paddingBottom: layout.screenBottom }}>
          <AppTopBar eyebrow="Бизнес" title="Борлуулагч болох" showBack={false} />
          <AppHeader
            title="Борлуулагч бүртгэл"
            subtitle="Дэлгүүр, үйлчилгээ, үл хөдлөх, авто болон дижитал бараагаа нэг платформ дээр борлуулна."
            icon="storefront-outline"
            accent={C.store}
          />

          <View
            style={{
              backgroundColor: C.bgCard,
              borderRadius: R.xl,
              borderWidth: 1,
              borderColor: C.border,
              padding: 14,
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: C.store, fontSize: 12, fontWeight: '900', flex: 1 }}>
                Алхам {step + 1}/5
              </Text>
              <Text style={{ color: C.textSub, fontSize: 12, fontWeight: '800' }}>
                {STEP_TITLES[step]}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {STEP_TITLES.map((title, index) => (
                <View
                  key={title}
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: R.full,
                    backgroundColor: index <= step ? C.store : C.bgSection,
                  }}
                />
              ))}
            </View>
          </View>

          {step === 0 ? (
            <View style={{ gap: 10 }}>
              {SELLER_TYPES.map((item) => {
                const active = sellerType === item.id
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setSellerType(item.id)}
                    style={{
                      backgroundColor: active ? C.store + '10' : C.bgCard,
                      borderRadius: R.lg,
                      borderWidth: 1.5,
                      borderColor: active ? C.store : C.border,
                      padding: 14,
                    }}
                  >
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: R.md,
                          backgroundColor: active ? C.store + '18' : C.bgSection,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons
                          name={item.icon}
                          size={21}
                          color={active ? C.store : C.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ color: C.text, fontSize: 15, fontWeight: '900' }}>
                            {item.title}
                          </Text>
                          {item.badge ? (
                            <View
                              style={{
                                backgroundColor: C.goldDim,
                                borderRadius: R.full,
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                              }}
                            >
                              <Text style={{ color: C.gold, fontSize: 10, fontWeight: '900' }}>
                                {item.badge}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={{ color: C.textSub, fontSize: 12, lineHeight: 18, marginTop: 3 }}>
                          {item.desc}
                        </Text>
                      </View>
                      {active ? <Ionicons name="checkmark-circle" size={22} color={C.store} /> : null}
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                      {item.tags.map((tag) => (
                        <View
                          key={tag}
                          style={{
                            backgroundColor: C.bgSection,
                            borderRadius: R.full,
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                          }}
                        >
                          <Text style={{ color: C.textSub, fontSize: 11, fontWeight: '700' }}>
                            {tag}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                )
              })}
              <View
                style={{
                  backgroundColor: C.store + '12',
                  borderRadius: R.lg,
                  borderWidth: 1,
                  borderColor: C.store + '24',
                  padding: 12,
                  flexDirection: 'row',
                  gap: 10,
                }}
              >
                <Ionicons name="information-circle-outline" size={19} color={C.store} />
                <Text style={{ color: C.store, fontSize: 12, lineHeight: 18, flex: 1 }}>
                  Самбараас хүссэн үедээ нэмэлт дэлгүүрийн төрөл нэмж болно
                </Text>
              </View>
            </View>
          ) : null}

          {step === 1 ? (
            <View>
              <Input
                label="Бизнесийн нэр"
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Жишээ: Nomad Fashion"
              />
              <Input
                label="Хариуцагчийн нэр"
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="Таны нэр"
              />
              <Input
                label="Байршил"
                value={city}
                onChangeText={setCity}
                placeholder="Хот / дүүрэг"
              />
            </View>
          ) : null}

          {step === 2 ? (
            <View>
              <Input
                label="Утас"
                value={phone}
                onChangeText={setPhone}
                placeholder="99112233"
                keyboardType="phone-pad"
              />
              <Input
                label="Имэйл"
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label="Туршлага / суваг"
                value={experience}
                onChangeText={setExperience}
                placeholder="Facebook, Instagram, дэлгүүрийн хаяг..."
                multiline
                height={96}
              />
            </View>
          ) : null}

          {step === 3 ? (
            <View>
              <Text style={{ color: C.textSub, fontSize: 13, fontWeight: '800', marginBottom: 8 }}>
                Банк
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {BANKS.map((bank) => {
                  const active = bankName === bank
                  return (
                    <TouchableOpacity
                      key={bank}
                      onPress={() => setBankName(bank)}
                      style={{
                        backgroundColor: active ? C.store : C.bgCard,
                        borderRadius: R.full,
                        borderWidth: 1,
                        borderColor: active ? C.store : C.border,
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        marginRight: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: active ? C.bgCard : C.textSub,
                          fontSize: 12,
                          fontWeight: '800',
                        }}
                      >
                        {bank}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
              <Input
                label="Дансны дугаар"
                value={bankAccount}
                onChangeText={setBankAccount}
                placeholder="Орлого авах данс"
                keyboardType="number-pad"
              />
              <View
                style={{
                  backgroundColor: C.goldDim,
                  borderRadius: R.lg,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Ionicons name="gift-outline" size={19} color={C.gold} />
                <Text style={{ color: C.text, fontSize: 12, fontWeight: '800', flex: 1 }}>
                  Эхний 1 сар 0% комисс автоматаар хамаарна
                </Text>
              </View>
            </View>
          ) : null}

          {step === 4 ? (
            <View style={{ gap: 10 }}>
              <SummaryRow icon="business-outline" label="Төрөл" value={selectedType.title} />
              <SummaryRow icon="storefront-outline" label="Бизнес" value={businessName || '-'} />
              <SummaryRow icon="person-outline" label="Хариуцагч" value={ownerName || '-'} />
              <SummaryRow icon="call-outline" label="Холбоо" value={phone || '-'} />
              <SummaryRow icon="mail-outline" label="Имэйл" value={email || '-'} />
              <SummaryRow icon="card-outline" label="Банк" value={`${bankName} · ${bankAccount || '-'}`} />

              <TouchableOpacity
                onPress={() => setAccepted(!accepted)}
                style={{
                  backgroundColor: accepted ? C.store + '12' : C.bgCard,
                  borderRadius: R.lg,
                  borderWidth: 1,
                  borderColor: accepted ? C.store : C.border,
                  padding: 14,
                  flexDirection: 'row',
                  gap: 10,
                }}
              >
                <Ionicons
                  name={accepted ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={accepted ? C.store : C.textMuted}
                />
                <Text style={{ color: C.textSub, fontSize: 13, lineHeight: 19, flex: 1 }}>
                  Мэдээллээ үнэн зөв оруулсан бөгөөд Eseller.mn-ийн нөхцөлтэй танилцсан.
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            {step > 0 ? (
              <TouchableOpacity
                onPress={() => setStep(step - 1)}
                style={{
                  backgroundColor: C.bgSection,
                  borderRadius: R.lg,
                  paddingHorizontal: 18,
                  minHeight: 52,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: C.text, fontSize: 14, fontWeight: '900' }}>Буцах</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={next}
              disabled={!canContinue}
              style={{
                flex: 1,
                backgroundColor: canContinue ? C.store : C.textMuted,
                borderRadius: R.lg,
                minHeight: 52,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <Text style={{ color: C.bgCard, fontSize: 15, fontWeight: '900' }}>
                {step === STEP_TITLES.length - 1 ? 'Бүртгэл үүсгэх' : 'Дараах'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={C.bgCard} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}

type InputProps = React.ComponentProps<typeof TextInput> & {
  label: string
  height?: number
}

function Input({ label, height, style, ...props }: InputProps) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: C.textSub, fontSize: 13, fontWeight: '800', marginBottom: 8 }}>
        {label}
      </Text>
      <TextInput
        {...props}
        placeholderTextColor={C.textMuted}
        style={[
          {
            minHeight: height ?? 50,
            backgroundColor: C.bgCard,
            borderRadius: R.lg,
            borderWidth: 1,
            borderColor: C.border,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: C.text,
            fontSize: 14,
            textAlignVertical: props.multiline ? 'top' : 'center',
          },
          style,
        ]}
      />
    </View>
  )
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
}) {
  return (
    <View
      style={{
        backgroundColor: C.bgCard,
        borderRadius: R.lg,
        borderWidth: 1,
        borderColor: C.border,
        padding: 13,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: R.md,
          backgroundColor: C.store + '14',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={18} color={C.store} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '800' }}>{label}</Text>
        <Text style={{ color: C.text, fontSize: 14, fontWeight: '800', marginTop: 2 }}>
          {value}
        </Text>
      </View>
    </View>
  )
}
