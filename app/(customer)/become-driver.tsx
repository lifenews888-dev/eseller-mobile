import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { C, R, F, UI } from '../../src/shared/design'
import { AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI'

const VEHICLE_TYPES = [
  { id: 'car', label: 'Машин', icon: 'car-outline' },
  { id: 'motorbike', label: 'Мото', icon: 'bicycle-outline' },
  { id: 'bike', label: 'Дугуй', icon: 'walk-outline' },
]

const REQUIREMENTS = [
  'Монгол иргэний үнэмлэх',
  'Тээврийн хэрэгсэл',
  'Ухаалаг утас',
  '18 нас хүрсэн',
  'Цагдаагийн тодорхойлолт',
]

const STATS = [
  { value: '3,000₮', label: 'Хүргэлт бүрт' },
  { value: '10+', label: 'Хүргэлт/өдөр' },
  { value: '900,000₮', label: 'Сарын боломжит орлого' },
]

export default function BecomeDriver() {
  const layout = useAppLayoutMetrics()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [plate, setPlate] = useState('')
  const [vehicle, setVehicle] = useState(VEHICLE_TYPES[0].id)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!name.trim() || !phone.trim() || !email.trim() || !plate.trim()) {
      Alert.alert('Анхаар', 'Нэр, утас, имэйл, улсын дугаараа бөглөнө үү.')
      return
    }

    const selectedVehicle =
      VEHICLE_TYPES.find((item) => item.id === vehicle)?.label ?? vehicle
    const body = encodeURIComponent(
      [
        `Нэр: ${name.trim()}`,
        `Утас: ${phone.trim()}`,
        `Имэйл: ${email.trim()}`,
        `Улсын дугаар: ${plate.trim().toUpperCase()}`,
        `Тээврийн хэрэгсэл: ${selectedVehicle}`,
      ].join('\n'),
    )

    setSubmitting(true)
    try {
      await Linking.openURL(
        `mailto:info@eseller.mn?subject=eSeller%20жолооч%20болох%20хүсэлт&body=${body}`,
      )
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      setName('')
      setPhone('')
      setEmail('')
      setPlate('')
      setVehicle(VEHICLE_TYPES[0].id)
    } catch (e: any) {
      Alert.alert('Алдаа', e?.message || 'Хүсэлт илгээх боломжгүй байна.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: C.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: R.lg, paddingTop: layout.screenTop, paddingBottom: layout.screenBottom }}
        >
          <AppTopBar eyebrow="Хүргэлт" title="Жолооч болох" showBack={false} />
          <AppHeader
            title="Жолооч болох"
            subtitle="Чөлөөт цагтаа хүргэлт хийж нэмэлт орлого олох хүсэлт илгээнэ."
            icon="car-outline"
            accent={C.driver}
          />

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {STATS.map((item) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  backgroundColor: C.bgCard,
                  borderRadius: R.lg,
                  borderWidth: 1,
                  borderColor: C.border,
                  padding: 12,
                }}
              >
                <Text style={{ color: C.driver, fontSize: 15, fontWeight: '900' }}>
                  {item.value}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 3 }}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          <Text style={{ ...F.h3, color: C.text, marginBottom: 10 }}>Шаардлага</Text>
          <View style={{ gap: 8, marginBottom: 18 }}>
            {REQUIREMENTS.map((item) => (
              <View
                key={item}
                style={{
                  backgroundColor: C.bgCard,
                  borderRadius: R.lg,
                  borderWidth: 1,
                  borderColor: C.border,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Ionicons name="checkmark-circle" size={19} color={C.driver} />
                <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>
                  {item}
                </Text>
              </View>
            ))}
          </View>

          <Text style={{ ...F.h3, color: C.text, marginBottom: 10 }}>
            Жолооч болох хүсэлт
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Нэр"
            placeholderTextColor={C.textMuted}
            style={inputStyle}
          />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Утас"
            placeholderTextColor={C.textMuted}
            keyboardType="phone-pad"
            maxLength={8}
            style={inputStyle}
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Имэйл"
            placeholderTextColor={C.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={inputStyle}
          />
          <TextInput
            value={plate}
            onChangeText={setPlate}
            placeholder="Улсын дугаар"
            placeholderTextColor={C.textMuted}
            autoCapitalize="characters"
            style={inputStyle}
          />

          <Text style={{ color: C.textSub, fontSize: 13, fontWeight: '800', marginBottom: 8 }}>
            Тээврийн хэрэгсэл
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {VEHICLE_TYPES.map((item) => {
              const active = vehicle === item.id
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setVehicle(item.id)}
                  style={{
                    flex: 1,
                    backgroundColor: active ? C.driver + '18' : C.bgCard,
                    borderRadius: R.lg,
                    borderWidth: 1,
                    borderColor: active ? C.driver : C.border,
                    padding: 12,
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={active ? C.driver : C.textMuted}
                  />
                  <Text
                    style={{
                      color: active ? C.driver : C.textSub,
                      fontSize: 12,
                      fontWeight: '800',
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={{
              backgroundColor: submitting ? C.textMuted : C.driver,
              borderRadius: R.lg,
              minHeight: 52,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
            }}
          >
            {submitting ? (
              <ActivityIndicator color={C.bgCard} />
            ) : (
              <>
                <Text style={{ color: C.bgCard, fontSize: 15, fontWeight: '900' }}>
                  Хүсэлт илгээх
                </Text>
                <Ionicons name="arrow-forward" size={18} color={C.bgCard} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}

const inputStyle = {
  backgroundColor: C.bgCard,
  borderRadius: R.lg,
  padding: 14,
  color: C.text,
  fontSize: 14,
  borderWidth: 1,
  borderColor: C.border,
  marginBottom: 10,
}
