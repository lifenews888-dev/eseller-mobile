import { useEffect } from 'react'
import { ActivityIndicator, Text } from 'react-native'
import { router, Stack } from 'expo-router'
import { C, F, R } from '../src/shared/design'
import { AppScreen, AppTopBar } from '../src/shared/ui/AppUI'

export default function FeedbackRoute() {
  useEffect(() => {
    router.replace({ pathname: '/contact', params: { type: 'idea' } } as any)
  }, [])

  return (
    <AppScreen>
      <Stack.Screen options={{ headerShown: false }} />
      <AppTopBar eyebrow="Дэмжлэг" title="Санал хүсэлт" />
      <ActivityIndicator color={C.brand} />
      <Text style={{ ...F.small, color: C.textMuted, textAlign: 'center', marginTop: R.sm }}>
        Санал хүсэлтийн маягт руу шилжүүлж байна...
      </Text>
    </AppScreen>
  )
}
