import React, { useCallback, useState } from 'react'
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { C, F, R } from '../../src/shared/design'
import { AppButton, AppCard, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI'
import { useAuth } from '../../src/store/auth'
import { ListingAPI, readGuestChats } from '../../src/services/listings'

type Row = { id: string; guest: boolean; title: string; otherName: string; lastMessage?: string | null; lastAt?: string; unread: number }

function timeLabel(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('mn-MN')
}

/** Зарын эзэдтэй хийсэн чатууд — нэвтэрсэн бол аккаунтын чатууд, үгүй бол энэ утсан дээрх зочин чатууд */
export default function ListingMessagesScreen() {
  const token = useAuth((s) => s.token)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const out: Row[] = []
    if (token) {
      const list = await ListingAPI.chats().catch(() => [])
      for (const c of list || []) {
        out.push({ id: c.id, guest: false, title: c.title || 'Зар', otherName: c.otherName || 'Зарын эзэн', lastMessage: c.lastMessage, lastAt: c.lastAt, unread: c.unread || 0 })
      }
    }
    const guests = await readGuestChats()
    if (guests.length) {
      const info = await ListingAPI.guestUnread(guests).catch(() => null)
      const byId = new Map((info?.chats || []).map((c) => [c.id, c]))
      for (const g of guests) {
        if (out.some((r) => r.id === g.chatId)) continue
        const i = byId.get(g.chatId)
        if (info && !i) continue // устсан эсвэл хүчингүй чат
        out.push({ id: g.chatId, guest: true, title: g.title || 'Зар', otherName: 'Зарын эзэн', lastMessage: i?.lastMessage, lastAt: i?.lastAt, unread: i?.unread || 0 })
      }
    }
    out.sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || ''))
    setRows(out)
  }, [token])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  return (
    <AppScreen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <AppTopBar eyebrow="Зарын булан" title="Зарын чат" />
      {rows === null ? (
        <Text style={{ color: C.textMuted }}>Ачаалж байна...</Text>
      ) : rows.length === 0 ? (
        <AppCard style={{ alignItems: 'center', padding: R.xl }}>
          <Ionicons name="chatbubbles-outline" size={40} color={C.textMuted} />
          <Text style={{ ...F.body, color: C.text, fontWeight: '800', marginTop: R.md }}>Чат алга</Text>
          <Text style={{ ...F.small, color: C.textMuted, textAlign: 'center', marginTop: R.xs }}>
            Зарын хуудсан дээрх «Чатлах» товчоор зарын эзэнд бичнэ үү — нэвтрэхгүйгээр ч болно.
          </Text>
          <AppButton label="Зарын булан" icon="megaphone-outline" onPress={() => router.push('/feed' as never)} style={{ marginTop: R.lg }} />
        </AppCard>
      ) : (
        <View style={{ gap: R.sm }}>
          {rows.map((r) => (
            <TouchableOpacity
              key={r.id}
              accessibilityRole="button"
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/messages/[id]', params: { id: r.id, guest: r.guest ? '1' : '0' } } as never)}
            >
              <AppCard style={st.row}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm }}>
                    <Text style={st.name} numberOfLines={1}>{r.otherName}</Text>
                    <Text style={st.time}>{timeLabel(r.lastAt)}</Text>
                  </View>
                  <Text style={st.title} numberOfLines={1}>{r.title}</Text>
                  {r.lastMessage ? <Text style={st.last} numberOfLines={1}>{r.lastMessage}</Text> : null}
                </View>
                {r.unread > 0 ? (
                  <View style={st.badge}><Text style={st.badgeText}>{r.unread}</Text></View>
                ) : null}
              </AppCard>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </AppScreen>
  )
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: R.sm, padding: R.md },
  name: { ...F.body, color: C.text, fontWeight: '800', flex: 1 },
  time: { ...F.tiny, color: C.textMuted },
  title: { ...F.tiny, color: C.textMuted, marginTop: 2 },
  last: { ...F.small, color: C.textSub, marginTop: 2 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: C.bgCard, fontSize: 11, fontWeight: '900' },
})
