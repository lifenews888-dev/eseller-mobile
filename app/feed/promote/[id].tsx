import React, { useEffect, useRef, useState } from 'react'
import { Image, Linking, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { C, F, R } from '../../../src/shared/design'
import { AppButton, AppCard, AppScreen, AppTopBar } from '../../../src/shared/ui/AppUI'
import { ListingAPI, type PromoteInvoice } from '../../../src/services/listings'
import { encodeRouteParam } from '../../../src/shared/routeParams'

const fmt = (n: number) => `${Math.round(n).toLocaleString('en-US')}₮`

/** Зарыг VIP болгох — QPay нэхэмжлэл, төлөгдмөгц вэбтэй адил серверт баталгаажна */
export default function PromoteListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const feedItemId = String(id || '')
  const [info, setInfo] = useState<{ price: number; days: number; vipUntil?: string | null } | null>(null)
  const [invoice, setInvoice] = useState<PromoteInvoice | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'creating' | 'waiting' | 'paid' | 'error'>('loading')
  const [error, setError] = useState('')
  const poll = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    ListingAPI.promoteInfo(feedItemId)
      .then((d) => {
        const until = d.item?.tier === 'vip' && d.item.tierExpiresAt && new Date(d.item.tierExpiresAt) > new Date() ? d.item.tierExpiresAt : null
        setInfo({ price: d.price, days: d.days, vipUntil: until })
        setState(until ? 'paid' : 'ready')
      })
      .catch((e) => { setError(e instanceof Error ? e.message : 'Зар олдсонгүй'); setState('error') })
    return () => { if (poll.current) clearInterval(poll.current) }
  }, [feedItemId])

  const create = async () => {
    setState('creating')
    setError('')
    try {
      const inv = await ListingAPI.promote(feedItemId)
      setInvoice(inv)
      setState('waiting')
      if (!inv.demo) {
        poll.current = setInterval(async () => {
          const r = await ListingAPI.checkPayment(inv.invoiceId).catch(() => null)
          if (r?.paid) {
            if (poll.current) clearInterval(poll.current)
            setState('paid')
          }
        }, 5000)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Нэхэмжлэл үүсгэж чадсангүй')
      setState('error')
    }
  }

  const qr = invoice?.qrImage ? (invoice.qrImage.startsWith('data:') ? invoice.qrImage : `data:image/png;base64,${invoice.qrImage}`) : null

  return (
    <AppScreen>
      <AppTopBar eyebrow="Зар" title="VIP болгох" />
      <AppCard style={{ padding: R.lg, gap: R.md }}>
        {state === 'loading' ? (
          <Text style={{ color: C.textMuted }}>Ачаалж байна...</Text>
        ) : state === 'error' ? (
          <>
            <Text style={{ color: C.error }}>{error}</Text>
            <AppButton label="Буцах" variant="secondary" icon="arrow-back" onPress={() => router.back()} />
          </>
        ) : state === 'paid' ? (
          <View style={{ alignItems: 'center', gap: R.sm }}>
            <Ionicons name="checkmark-circle" size={48} color={C.secondary} />
            <Text style={{ ...F.h4, color: C.text }}>Таны зар VIP боллоо</Text>
            <Text style={{ ...F.small, color: C.textMuted, textAlign: 'center' }}>Зарын булангийн дээд хэсэгт харагдана.</Text>
            <AppButton label="Зараа харах" onPress={() => router.replace(`/feed/${encodeRouteParam(feedItemId)}` as never)} style={{ marginTop: R.sm }} />
          </View>
        ) : !invoice ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm }}>
              <Ionicons name="trophy" size={28} color={C.gold} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...F.h4, color: C.text }}>{info ? fmt(info.price) : ''} · {info?.days} хоног</Text>
                <Text style={{ ...F.small, color: C.textMuted }}>Зар тань зарын булангийн хамгийн дээд хэсэгт харагдана.</Text>
              </View>
            </View>
            <AppButton label={state === 'creating' ? 'Үүсгэж байна...' : 'QPay-ээр төлөх'} icon="qr-code-outline" onPress={create} disabled={state === 'creating'} />
          </>
        ) : (
          <View style={{ alignItems: 'center', gap: R.sm }}>
            <Text style={{ ...F.h4, color: C.text }}>QPay-ээр {fmt(invoice.amount)} төлнө үү</Text>
            {invoice.demo ? (
              <Text style={{ ...F.small, color: C.gold, textAlign: 'center' }}>QPay холболт тохируулагдаагүй тул энэ нь туршилтын нэхэмжлэл — төлбөр хийгдэхгүй.</Text>
            ) : null}
            {qr ? <Image source={{ uri: qr }} style={{ width: 220, height: 220, backgroundColor: '#fff', borderRadius: 12 }} /> : null}
            {(invoice.urls || []).length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {(invoice.urls || []).slice(0, 10).map((u) => (
                  <TouchableOpacity key={u.name} onPress={() => Linking.openURL(u.link).catch(() => null)} style={{ borderWidth: 1, borderColor: C.border2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 12, color: C.text }}>{u.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            <Text style={{ ...F.tiny, color: C.textMuted, textAlign: 'center' }}>Банкны аппаар төлсний дараа энэ хуудас автоматаар шинэчлэгдэнэ.</Text>
          </View>
        )}
      </AppCard>
    </AppScreen>
  )
}
