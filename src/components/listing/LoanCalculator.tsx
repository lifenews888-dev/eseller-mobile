import React, { useMemo, useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C, F, R } from '../../shared/design'
import { AppCard } from '../../shared/ui/AppUI'
import { monthlyPayment } from '../../services/listings'

type Kind = 'auto' | 'home'

const PRESETS: Record<Kind, { downPct: number; months: number; rate: number; terms: number[] }> = {
  auto: { downPct: 30, months: 36, rate: 2.0, terms: [12, 24, 36, 48, 60] },
  home: { downPct: 30, months: 240, rate: 1.5, terms: [60, 120, 180, 240, 360] },
}
const DOWN_STEPS = [10, 20, 30, 40, 50]

const fmt = (n: number) => `${Math.round(n).toLocaleString('en-US')}₮`
const termLabel = (m: number) => (m % 12 === 0 ? `${m / 12} жил` : `${m} сар`)

/** Машин, үл хөдлөх (худалдах) зарын зээлийн ойролцоо тооцоо — вэбийн тооцоолууртай ижил */
export function LoanCalculator({ price, kind }: { price: number; kind: Kind }) {
  const preset = PRESETS[kind]
  const [open, setOpen] = useState(false)
  const [downPct, setDownPct] = useState(preset.downPct)
  const [months, setMonths] = useState(preset.months)
  const [rate, setRate] = useState(String(preset.rate))

  const calc = useMemo(() => {
    const down = Math.round((price * downPct) / 100)
    const principal = Math.max(0, price - down)
    const r = Math.max(0, Math.min(10, Number(rate.replace(',', '.')) || 0))
    const pay = monthlyPayment(principal, r, months)
    const total = pay * months
    return { down, principal, pay, interest: Math.max(0, total - principal), total: total + down }
  }, [price, downPct, months, rate])

  return (
    <AppCard style={st.card}>
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.8} style={st.head} onPress={() => setOpen((v) => !v)}>
        <View style={st.icon}><Ionicons name="calculator-outline" size={18} color={C.brand} /></View>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>Зээлийн тооцоолуур</Text>
          <Text style={st.sub}>Сард ойролцоогоор <Text style={{ color: C.brand, fontWeight: '900' }}>{fmt(calc.pay)}</Text> · {termLabel(months)}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
      </TouchableOpacity>

      {open ? (
        <View style={{ marginTop: R.md, gap: R.md }}>
          <View>
            <Text style={st.label}>Урьдчилгаа · {fmt(calc.down)}</Text>
            <View style={st.chips}>
              {DOWN_STEPS.map((p) => (
                <Chip key={p} label={`${p}%`} on={downPct === p} onPress={() => setDownPct(p)} />
              ))}
            </View>
          </View>
          <View>
            <Text style={st.label}>Хугацаа</Text>
            <View style={st.chips}>
              {preset.terms.map((m) => (
                <Chip key={m} label={termLabel(m)} on={months === m} onPress={() => setMonths(m)} />
              ))}
            </View>
          </View>
          <View>
            <Text style={st.label}>Сарын хүү (%)</Text>
            <TextInput
              value={rate}
              onChangeText={(v) => setRate(v.replace(/[^\d.,]/g, '').slice(0, 5))}
              keyboardType="decimal-pad"
              style={st.input}
            />
            <Text style={st.hint}>Жилийн хүүтэй бол 12-т хуваана (жилийн 12% = сарын 1%).</Text>
          </View>
          <View style={st.result}>
            <Text style={st.hint}>Сарын төлбөр</Text>
            <Text style={st.big}>{fmt(calc.pay)}</Text>
            <View style={{ flexDirection: 'row', gap: R.lg, marginTop: R.sm }}>
              <View><Text style={st.hint}>Зээлийн дүн</Text><Text style={st.val}>{fmt(calc.principal)}</Text></View>
              <View><Text style={st.hint}>Нийт хүү</Text><Text style={st.val}>{fmt(calc.interest)}</Text></View>
            </View>
            <Text style={[st.hint, { marginTop: R.sm }]}>Нийт төлөх (урьдчилгаа орсон): {fmt(calc.total)}</Text>
          </View>
          <Text style={st.hint}>Энэ бол ойролцоо тооцоо. Бодит хүү, нөхцөл нь банк, ББСБ болон таны орлогоос хамаарна.</Text>
        </View>
      ) : null}
    </AppCard>
  )
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={[st.chip, on && { borderColor: C.brand, backgroundColor: C.brandDim }]}>
      <Text style={{ fontSize: 12, fontWeight: '800', color: on ? C.brand : C.textSub }}>{label}</Text>
    </TouchableOpacity>
  )
}

/** Зарын төрлөөс тооцоолуурын төрлийг тодорхойлно — түрээс, бартер, 3 саяас доош үнэд харуулахгүй */
export function loanKindFor(item: { price?: number; category?: string; subcategory?: string; entityType?: string; title?: string; metadata?: Record<string, unknown> }): Kind | null {
  if (typeof item.price !== 'number' || item.price < 3_000_000) return null
  const lt = String(item.metadata?.listingType || '')
  if (lt && lt !== 'Худалдах') return null
  const text = `${item.category || ''} ${item.subcategory || ''} ${item.title || ''}`.toLowerCase()
  if (/түрээс|rent|хөлс/.test(text)) return null
  const cat = String(item.category || '').toLowerCase()
  const et = String(item.entityType || '').toLowerCase()
  if (cat.startsWith('vehicles') || et === 'auto' || et === 'auto_dealer') return 'auto'
  if (cat.startsWith('real-estate') || cat.startsWith('new-buildings') || et === 'real_estate' || et === 'agent' || et === 'company') return 'home'
  return null
}

const st = StyleSheet.create({
  card: { padding: R.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: R.sm },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.brandDim, alignItems: 'center', justifyContent: 'center' },
  title: { ...F.body, color: C.text, fontWeight: '900' },
  sub: { ...F.tiny, color: C.textSub, marginTop: 2 },
  label: { ...F.tiny, color: C.textSub, fontWeight: '800', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: C.border2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  input: { borderWidth: 1, borderColor: C.border2, borderRadius: R.md, paddingHorizontal: 12, height: 44, color: C.text, backgroundColor: C.bgInput },
  hint: { ...F.tiny, color: C.textMuted },
  result: { backgroundColor: C.bgSection, borderRadius: R.md, padding: R.md },
  big: { fontSize: 22, fontWeight: '900', color: C.brand },
  val: { ...F.small, color: C.text, fontWeight: '800' },
})
