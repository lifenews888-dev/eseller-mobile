import React, { useCallback, useState } from 'react'
import { RefreshControl, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { C, F, R } from '../src/shared/design'
import { AppButton, AppCard, AppScreen, AppTopBar } from '../src/shared/ui/AppUI'
import { useAuth } from '../src/store/auth'
import { SavedSearchAPI, type SavedSearch } from '../src/services/listings'

/** Хадгалсан хайлтууд — нээхэд "шинэ" тоо тэглэгдэнэ (?ss=<id>) */
export default function SavedSearchesScreen() {
  const token = useAuth((s) => s.token)
  const [items, setItems] = useState<SavedSearch[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!token) { setItems([]); return }
    const d = await SavedSearchAPI.list().catch(() => null)
    setItems(d?.items || [])
  }, [token])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  const open = (s: SavedSearch) => {
    const params: Record<string, string> = { ss: s.id }
    // RN-ийн URLSearchParams бүрэн биш тул гараар задална
    for (const part of s.query.split('&')) {
      const [k, v = ''] = part.split('=')
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '))
    }
    router.push({ pathname: '/feed', params } as never)
  }

  const remove = async (id: string) => {
    setItems((l) => (l || []).filter((i) => i.id !== id))
    await SavedSearchAPI.remove(id).catch(() => null)
  }

  return (
    <AppScreen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} />}>
      <AppTopBar eyebrow="Зарын булан" title="Хадгалсан хайлт" />
      {!token ? (
        <AppCard style={{ padding: R.lg, gap: R.md }}>
          <Text style={{ ...F.small, color: C.textSub }}>Хайлт хадгалж, шинэ зар гарахад мэдэгдэл авахын тулд нэвтэрнэ үү.</Text>
          <AppButton label="Нэвтрэх" icon="log-in-outline" onPress={() => router.push({ pathname: '/login', params: { returnTo: '/saved-searches' } } as never)} />
        </AppCard>
      ) : items === null ? (
        <Text style={{ color: C.textMuted }}>Ачаалж байна...</Text>
      ) : items.length === 0 ? (
        <AppCard style={{ padding: R.lg, alignItems: 'center', gap: R.sm }}>
          <Ionicons name="notifications-outline" size={36} color={C.textMuted} />
          <Text style={{ ...F.small, color: C.textSub, textAlign: 'center' }}>
            Хадгалсан хайлт алга. Зарын буланд ангилал, шүүлтүүрээ сонгоод «Хайлт хадгалах» дарвал тохирох шинэ зар гарахад энд тоо нь гарна.
          </Text>
          <AppButton label="Зарын булан" icon="megaphone-outline" onPress={() => router.push('/feed' as never)} />
        </AppCard>
      ) : (
        <View style={{ gap: R.sm }}>
          {items.map((s) => (
            <AppCard key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm, padding: R.md }}>
              <TouchableOpacity accessibilityRole="button" style={{ flex: 1 }} onPress={() => open(s)}>
                <Text style={{ ...F.body, color: C.text, fontWeight: '800' }} numberOfLines={1}>{s.name}</Text>
                {s.summary !== s.name ? <Text style={{ ...F.tiny, color: C.textMuted }} numberOfLines={1}>{s.summary}</Text> : null}
              </TouchableOpacity>
              {s.newCount > 0 ? (
                <View style={{ backgroundColor: C.brand, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ color: C.bgCard, fontSize: 11, fontWeight: '900' }}>{s.newCount} шинэ</Text>
                </View>
              ) : (
                <Text style={{ ...F.tiny, color: C.textMuted }}>Шинэ зар алга</Text>
              )}
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Устгах" hitSlop={8} onPress={() => remove(s.id)}>
                <Ionicons name="trash-outline" size={18} color={C.textMuted} />
              </TouchableOpacity>
            </AppCard>
          ))}
        </View>
      )}
    </AppScreen>
  )
}
