import React, { useEffect, useRef, useState } from 'react'
import { Image, Linking, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { C, F, R } from '../src/shared/design'
import { AppButton, AppCard, AppScreen, AppTopBar } from '../src/shared/ui/AppUI'
import { WalletAPI } from '../src/services/api'
import { ListingAPI, type PromoteInvoice } from '../src/services/listings'
import { useAuth } from '../src/store/auth'
import { normalizeRouteParam } from '../src/shared/routeParams'
import { RequireAuthScreen } from '../src/shared/ui/RequireAuthScreen'

const fmt = (n: number) => `${Math.round(n).toLocaleString('en-US')}₮`

type TopupInvoice = Omit<PromoteInvoice, 'days'>

/** Хэтэвч цэнэглэх — QPay нэхэмжлэл; төлбөр баталгаажмагц сервер үлдэгдлийг нэмнэ */
export default function WalletTopupScreen() {
  const params = useLocalSearchParams<{ amount?: string }>()
  const amount = Math.round(Number(normalizeRouteParam(params.amount)) || 0)
  const { user } = useAuth()
  const qc = useQueryClient()
  const [invoice, setInvoice] = useState<TopupInvoice | null>(null)
  const [state, setState] = useState<'creating' | 'waiting' | 'paid' | 'error'>('creating')
  const [error, setError] = useState('')
  const poll = useRef<ReturnType<typeof setInterval> | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!user || started.current) return
    started.current = true
    if (amount < 1000) {
      setError('Хамгийн багадаа 1,000₮ цэнэглэнэ.')
      setState('error')
      return
    }
    WalletAPI.topUp({ amount })
      .then((res) => {
        const inv = res as unknown as TopupInvoice
        setInvoice(inv)
        setState('waiting')
        if (!inv.demo) {
          poll.current = setInterval(async () => {
            const r = await ListingAPI.checkPayment(inv.invoiceId).catch(() => null)
            if (r?.paid) {
              if (poll.current) clearInterval(poll.current)
              qc.invalidateQueries({ queryKey: ['wallet'] })
              qc.invalidateQueries({ queryKey: ['wallet-transactions'] })
              setState('paid')
            }
          }, 5000)
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Нэхэмжлэл үүсгэж чадсангүй')
        setState('error')
      })
    return () => {
      if (poll.current) clearInterval(poll.current)
    }
  }, [user, amount, qc])

  if (!user) {
    return (
      <RequireAuthScreen
        title="Хэтэвч цэнэглэх"
        subtitle="Хэтэвчээ цэнэглэхийн тулд нэвтэрнэ үү."
        icon="wallet-outline"
        accent={C.primary}
        returnTo="/wallet"
      />
    )
  }

  const qr = invoice?.qrImage ? (invoice.qrImage.startsWith('data:') ? invoice.qrImage : `data:image/png;base64,${invoice.qrImage}`) : null

  return (
    <AppScreen>
      <AppTopBar eyebrow="Хэтэвч" title="Цэнэглэх" />
      <AppCard style={{ padding: R.lg, gap: R.md }}>
        {state === 'creating' ? (
          <Text style={{ color: C.textMuted }}>Нэхэмжлэл үүсгэж байна...</Text>
        ) : state === 'error' ? (
          <>
            <Text style={{ color: C.error }}>{error}</Text>
            <AppButton label="Буцах" variant="secondary" icon="arrow-back" onPress={() => router.back()} />
          </>
        ) : state === 'paid' ? (
          <View style={{ alignItems: 'center', gap: R.sm }}>
            <Ionicons name="checkmark-circle" size={48} color={C.secondary} />
            <Text style={{ ...F.h4, color: C.text }}>{fmt(amount)} хэтэвчид орлоо</Text>
            <AppButton label="Хэтэвч рүү" onPress={() => router.replace('/wallet' as never)} style={{ marginTop: R.sm }} />
          </View>
        ) : invoice ? (
          <View style={{ alignItems: 'center', gap: R.sm }}>
            <Text style={{ ...F.h4, color: C.text }}>QPay-ээр {fmt(invoice.amount)} төлнө үү</Text>
            {invoice.demo ? (
              <Text style={{ ...F.small, color: C.gold, textAlign: 'center' }}>
                QPay холболт тохируулагдаагүй тул энэ нь туршилтын нэхэмжлэл — төлбөр хийгдэхгүй, хэтэвч цэнэглэгдэхгүй.
              </Text>
            ) : null}
            {qr ? <Image source={{ uri: qr }} style={{ width: 220, height: 220, backgroundColor: C.bgCard, borderRadius: 12 }} /> : null}
            {(invoice.urls || []).length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {(invoice.urls || []).slice(0, 10).map((u) => (
                  <TouchableOpacity
                    key={u.name}
                    onPress={() => Linking.openURL(u.link).catch(() => null)}
                    style={{ borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
                  >
                    <Text style={{ fontSize: 12, color: C.text }}>{u.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            <Text style={{ ...F.tiny, color: C.textMuted, textAlign: 'center' }}>
              Банкны аппаар төлсний дараа энэ хуудас автоматаар шинэчлэгдэнэ.
            </Text>
          </View>
        ) : null}
      </AppCard>
    </AppScreen>
  )
}
