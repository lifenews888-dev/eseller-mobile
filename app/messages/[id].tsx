import React, { useCallback, useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { C, F, R } from '../../src/shared/design'
import { AppButton, AppCard, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI'
import { useAuth } from '../../src/store/auth'
import { ListingAPI, readGuestChats, saveGuestChat, type ListingMessage } from '../../src/services/listings'
import { encodeRouteParam } from '../../src/shared/routeParams'

const QUICK = ['Сайн байна уу, зар идэвхтэй байгаа юу?', 'Үнэ тохирох уу?', 'Хаана байрладаг вэ?', 'Нэмэлт зураг илгээх боломжтой юу?']

function time(iso: string) {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('mn-MN')
}

/**
 * Зарын эзэнтэй чат.
 *  - /messages/new?feedItemId=&title= — анхны мессеж (нэвтэрсэн эсвэл зочин нэр+утастай)
 *  - /messages/<chatId>?guest=1|0     — яриа (5 сек тутам шинэчилнэ)
 */
export default function ListingThreadScreen() {
  const params = useLocalSearchParams<{ id: string; guest?: string; feedItemId?: string; title?: string }>()
  const token = useAuth((s) => s.token)
  const layout = useAppLayoutMetrics()
  const isNew = params.id === 'new'
  const [chatId, setChatId] = useState<string | null>(isNew ? null : String(params.id))
  const [guest, setGuest] = useState(params.guest === '1')
  const [guestToken, setGuestToken] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<ListingMessage[]>([])
  const [head, setHead] = useState<{ otherName: string; title?: string | null; feedItemId?: string } | null>(
    isNew ? { otherName: 'Зарын эзэн', title: params.title, feedItemId: params.feedItemId } : null,
  )
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const sendingRef = useRef(false)
  const scrollRef = useRef<ScrollView>(null)

  // Зочин чатын токенийг утаснаас уншина
  useEffect(() => {
    if (!guest || !chatId) return
    readGuestChats().then((list) => setGuestToken(list.find((g) => g.chatId === chatId)?.token || null))
  }, [guest, chatId])

  const load = useCallback(async () => {
    if (!chatId) return
    try {
      const t = guest ? (guestToken ? await ListingAPI.guestThread(chatId, guestToken) : null) : await ListingAPI.thread(chatId)
      if (t) {
        setMsgs(t.messages)
        setHead({ otherName: t.chat.otherName, title: t.chat.title, feedItemId: t.chat.feedItemId })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Чат ачаалж чадсангүй')
    }
  }, [chatId, guest, guestToken])

  useEffect(() => {
    if (!chatId || (guest && !guestToken)) return
    void load()
    const t = setInterval(() => void load(), 5000)
    return () => clearInterval(t)
  }, [chatId, guest, guestToken, load])

  useEffect(() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50) }, [msgs.length])

  const send = async () => {
    const body = text.trim()
    if (!body || sendingRef.current) return
    sendingRef.current = true
    setSending(true)
    setError('')
    try {
      if (!chatId) {
        const feedItemId = String(params.feedItemId || '')
        if (token) {
          const r = await ListingAPI.startChat(feedItemId, body)
          setChatId(r.chatId)
        } else {
          if (name.trim().length < 2) throw new Error('Нэрээ оруулна уу')
          if (phone.replace(/\D/g, '').length < 8) throw new Error('Утасны дугаараа оруулна уу (8 оронтой)')
          const r = await ListingAPI.guestStart(feedItemId, name.trim(), phone.trim(), body)
          await saveGuestChat({ chatId: r.chatId, token: r.token, title: r.title || String(params.title || ''), feedItemId })
          setGuest(true)
          setGuestToken(r.token)
          setChatId(r.chatId)
        }
      } else if (guest && guestToken) {
        const m = await ListingAPI.guestSend(chatId, guestToken, body)
        setMsgs((list) => [...list, m])
      } else {
        const m = await ListingAPI.send(chatId, body)
        setMsgs((list) => [...list, m])
      }
      setText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Мессеж илгээж чадсангүй')
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  const needsGuestInfo = !chatId && !token

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: layout.screenTop, paddingHorizontal: R.lg }}>
        <AppTopBar eyebrow={head?.title || 'Зар'} title={head?.otherName || 'Чат'} />
        {head?.feedItemId ? (
          <TouchableOpacity onPress={() => router.push(`/feed/${encodeRouteParam(head.feedItemId)}` as never)} style={{ marginTop: -R.sm, marginBottom: R.sm }}>
            <Text style={{ ...F.tiny, color: C.brand, fontWeight: '800' }}>Зарыг харах →</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: R.lg, gap: R.sm }}>
        {!chatId ? (
          <AppCard style={{ padding: R.md, gap: R.sm }}>
            <Text style={{ ...F.small, color: C.textSub }}>Зарын эзэнд асуултаа бичнэ үү. Хариуг энэ хэсэг болон «Зарын чат» дээрээс харна.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {QUICK.map((q) => (
                <TouchableOpacity key={q} onPress={() => setText(q)} style={st.quick}>
                  <Text style={{ fontSize: 12, color: C.textSub }}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {needsGuestInfo ? (
              <>
                <Text style={{ ...F.tiny, color: C.textMuted }}>Бүртгэлгүй бичих бол нэр, утсаа оруулна уу. Эсвэл нэвтэрч бичиж болно.</Text>
                <TextInput value={name} onChangeText={setName} placeholder="Нэр" placeholderTextColor={C.textMuted} style={st.input} maxLength={40} />
                <TextInput value={phone} onChangeText={setPhone} placeholder="Утас (8 оронтой)" placeholderTextColor={C.textMuted} keyboardType="phone-pad" style={st.input} maxLength={12} />
                <AppButton
                  label="Нэвтэрч бичих"
                  icon="log-in-outline"
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/login', params: { returnTo: `/feed/${params.feedItemId}` } } as never)}
                />
              </>
            ) : null}
          </AppCard>
        ) : null}

        {msgs.map((m) => (
          <View key={m.id} style={{ alignItems: m.mine ? 'flex-end' : 'flex-start' }}>
            <View style={[st.bubble, m.mine ? st.mine : st.theirs]}>
              <Text style={{ color: m.mine ? C.bgCard : C.text, fontSize: 14 }}>{m.text}</Text>
              <Text style={{ color: m.mine ? 'rgba(255,255,255,0.7)' : C.textMuted, fontSize: 10, marginTop: 2, textAlign: 'right' }}>{time(m.createdAt)}</Text>
            </View>
          </View>
        ))}
        {chatId && msgs.length > 0 && msgs.every((m) => m.mine) ? (
          <Text style={{ ...F.tiny, color: C.textMuted, textAlign: 'center' }}>Зарын эзний хариуг хүлээж байна…</Text>
        ) : null}
      </ScrollView>

      {error ? <Text style={{ color: C.error, fontSize: 12, paddingHorizontal: R.lg }}>{error}</Text> : null}
      <View style={[st.composer, { paddingBottom: layout.insets.bottom + R.sm }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Мессеж бичих…"
          placeholderTextColor={C.textMuted}
          style={[st.input, { flex: 1, marginBottom: 0 }]}
          maxLength={1000}
          multiline
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Илгээх"
          disabled={sending || !text.trim()}
          onPress={send}
          style={[st.sendBtn, (sending || !text.trim()) && { opacity: 0.4 }]}
        >
          <Ionicons name="send" size={18} color={C.bgCard} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const st = StyleSheet.create({
  quick: { borderWidth: 1, borderColor: C.border2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  input: { borderWidth: 1, borderColor: C.border2, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 10, color: C.text, backgroundColor: C.bgInput, fontSize: 15 },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  mine: { backgroundColor: C.brand, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: C.bgCard, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: R.sm, paddingHorizontal: R.lg, paddingTop: R.sm, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bgCard },
  sendBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
})
