import React, { useState } from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { Stack, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { C, R, F, UI } from '../src/shared/design'
import { AppHeader, AppTopBar, useAppLayoutMetrics } from '../src/shared/ui/AppUI'

type Feature = {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  text: string
}

const FEATURES: Feature[] = [
  {
    icon: 'cash-outline',
    title: 'Эхний 3 сар 0% комисс',
    text: 'Орлогоо бүрэн авна',
  },
  {
    icon: 'car-outline',
    title: 'Өөрийн жолоочтой',
    text: 'Хүргэлт санаа зовохгүй',
  },
  {
    icon: 'megaphone-outline',
    title: 'Борлуулагч сүлжээ',
    text: 'Борлуулагчид тарааж өгнө',
  },
  {
    icon: 'chatbubble-ellipses-outline',
    title: 'AI чат дэмжлэг',
    text: '24/7 хэрэглэгчийн асуулт',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Дундын данс',
    text: 'Мөнгө аюулгүй хамгаалагдана',
  },
  {
    icon: 'stats-chart-outline',
    title: 'Дашбоард + аналитик',
    text: 'Борлуулалт realtime харна',
  },
]

const FAQ = [
  {
    q: 'Хэдэн мөнгө төлөх вэ?',
    a: 'Дэлгүүр нээхэд кредит карт шаардахгүй. Одоо бүртгүүлсэн дэлгүүрүүдэд эхний 3 сар 0% комисс автоматаар хамаарна.',
  },
  {
    q: 'Хэдэн бараа нэмж болох вэ?',
    a: 'Дэлгүүрийн төрлөөс хамааран бараа, үйлчилгээ, зар болон дижитал бүтээгдэхүүнээ dashboard-аас удирдана.',
  },
  {
    q: 'Хүргэлтийг хэрхэн зохицуулах вэ?',
    a: 'Захиалга баталгаажсаны дараа Eseller.mn-ийн жолоочийн сүлжээ болон өөрийн хүргэлтийн сонголтуудыг ашиглаж болно.',
  },
  {
    q: 'Төлбөрийг хэзээ авах вэ?',
    a: 'Захиалга амжилттай биелсний дараа дундын дансны хамгаалалт дуусмагц орлого таны бүртгэлтэй данс руу шилжинэ.',
  },
]

export default function OpenShopScreen() {
  const layout = useAppLayoutMetrics()
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  function start() {
    router.push('/become-seller' as never)
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ padding: R.lg, paddingTop: layout.screenTop, paddingBottom: layout.screenBottom }}
      >
        <AppTopBar eyebrow="Бизнес" title="Дэлгүүр нээх" />
        <AppHeader
          title="Дэлгүүр нээх"
          subtitle="5 минутад дэлгүүрээ нээж, бараа нэмэх, захиалга авах, хүргэлтээ нэг дор удирдана."
          icon="storefront-outline"
          accent={C.brand}
        />

        <View
          style={{
            borderRadius: R.xl,
            borderWidth: 1,
            borderColor: C.brand + '4D',
            padding: 22,
            alignItems: 'center',
            marginBottom: 22,
            backgroundColor: C.brandDim,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <Ionicons name="time-outline" size={16} color={C.brand} />
            <Text
              style={{
                color: C.brand,
                fontSize: 12,
                fontWeight: '900',
              }}
            >
              ХЯЗГААРЛАГДМАЛ САНАЛ
            </Text>
          </View>
          <Text style={{ color: C.text, fontSize: 24, fontWeight: '900', textAlign: 'center' }}>
            Эхний 3 сар — 0% комисс
          </Text>
          <Text style={{ color: C.textSub, fontSize: 13, marginTop: 7, textAlign: 'center' }}>
            Одоо бүртгүүлсэн дэлгүүрүүдэд автоматаар хамаарна
          </Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
          {FEATURES.map((feature) => (
            <View
              key={feature.title}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${feature.title}. ${feature.text}`}
              style={{
                width: '47%',
                backgroundColor: C.bgCard,
                borderRadius: R.lg,
                borderWidth: 1,
                borderColor: C.border,
                padding: 14,
                minHeight: 132,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: R.md,
                  backgroundColor: C.brandDim,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <Ionicons name={feature.icon} size={20} color={C.brand} />
              </View>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: '900', lineHeight: 18 }}>
                {feature.title}
              </Text>
              <Text style={{ color: C.textSub, fontSize: 12, lineHeight: 17, marginTop: 5 }}>
                {feature.text}
              </Text>
            </View>
          ))}
        </View>

        <Text style={{ ...F.h3, color: C.text, marginBottom: 12 }}>Түгээмэл асуулт</Text>
        <View style={{ gap: 9, marginBottom: 24 }}>
          {FAQ.map((item, index) => {
            const expanded = openFaq === index
            return (
              <TouchableOpacity
                key={item.q}
                activeOpacity={0.86}
                accessibilityRole="button"
                accessibilityLabel={`${item.q} ${expanded ? 'хаах' : 'нээх'}`}
                accessibilityState={{ expanded }}
                onPress={() => setOpenFaq(expanded ? null : index)}
                style={{
                  backgroundColor: C.bgCard,
                  borderRadius: R.lg,
                  borderWidth: 1,
                  borderColor: C.border,
                  padding: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: '800', flex: 1 }}>
                    {item.q}
                  </Text>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={C.brand}
                  />
                </View>
                {expanded ? (
                  <Text style={{ color: C.textSub, fontSize: 13, lineHeight: 20, marginTop: 10 }}>
                    {item.a}
                  </Text>
                ) : null}
              </TouchableOpacity>
            )
          })}
        </View>

        <View
          style={{
            backgroundColor: C.bgCard,
            borderRadius: R.xxl,
            borderWidth: 1,
            borderColor: C.border,
            padding: 22,
            alignItems: 'center',
          }}
        >
          <Text style={{ ...F.h2, color: C.text, textAlign: 'center' }}>Өнөөдөр эхлэ</Text>
          <Text style={{ color: C.textSub, fontSize: 13, textAlign: 'center', marginTop: 7 }}>
            5 минутад дэлгүүрээ нээж, эхний бараагаа нэм
          </Text>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={start}
            accessibilityRole="button"
            accessibilityLabel="Дэлгүүр нээх үнэгүй"
            accessibilityHint="Борлуулагчийн бүртгэлийн дэлгэц нээнэ"
            style={{
              backgroundColor: C.primary,
              borderRadius: R.lg,
              minHeight: 54,
              paddingHorizontal: 24,
              marginTop: 18,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              alignSelf: 'stretch',
            }}
          >
            <Ionicons name="storefront-outline" size={19} color={C.bgCard} />
            <Text style={{ color: C.bgCard, fontSize: 15, fontWeight: '900' }}>
              Дэлгүүр нээх — үнэгүй
            </Text>
          </TouchableOpacity>
          <Text style={{ color: C.textMuted, fontSize: 11, textAlign: 'center', marginTop: 10 }}>
            Кредит карт шаардахгүй · Хугацааны бэхэлгээ байхгүй
          </Text>
        </View>
      </ScrollView>
    </>
  )
}
