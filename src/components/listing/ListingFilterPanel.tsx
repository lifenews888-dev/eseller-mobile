import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C, F, R } from '../../shared/design'
import { AppButton, AppCard } from '../../shared/ui/AppUI'
import { get } from '../../services/api'
import { filtersForCategory } from '../../shared/listingFilters'

type Facets = Record<string, { value: string; count: number }[]>

/** Машин / үл хөдлөх / утасны нарийн шүүлтүүр — values нь m_ угтваргүй ({ brand, yearMin, ... }) */
export function ListingFilterPanel({ category, values, onApply }: { category: string; values: Record<string, string>; onApply: (next: Record<string, string>) => void }) {
  const defs = filtersForCategory(category)
  const [open, setOpen] = useState(Object.keys(values).length > 0)
  const [draft, setDraft] = useState<Record<string, string>>(values)
  const [facets, setFacets] = useState<Facets>({})

  useEffect(() => { setDraft(values) }, [values])

  useEffect(() => {
    if (!defs.some((d) => d.kind === 'facet')) return
    let cancelled = false
    ;(get('/feed/facets', { category }) as unknown as Promise<Facets>)
      .then((d) => { if (!cancelled && d && typeof d === 'object') setFacets(d) })
      .catch(() => null)
    return () => { cancelled = true }
  }, [category]) // eslint-disable-line react-hooks/exhaustive-deps

  if (defs.length === 0) return null
  const active = Object.values(values).filter(Boolean).length

  const set = (key: string, v: string, apply = false) => {
    const next = { ...draft, [key]: v }
    if (!v) delete next[key]
    setDraft(next)
    if (apply) onApply(next)
  }

  return (
    <AppCard style={{ padding: R.md, marginBottom: R.md }}>
      <TouchableOpacity accessibilityRole="button" onPress={() => setOpen((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm }}>
        <Ionicons name="options-outline" size={18} color={C.text} />
        <Text style={{ ...F.body, color: C.text, fontWeight: '800', flex: 1 }}>Дэлгэрэнгүй шүүлтүүр</Text>
        {active > 0 ? <View style={st.count}><Text style={st.countText}>{active}</Text></View> : null}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
      </TouchableOpacity>

      {open ? (
        <View style={{ marginTop: R.md, gap: R.md }}>
          {defs.map((d) => {
            if (d.kind === 'facet') {
              const list = facets[d.key] || []
              if (list.length === 0) return null
              return (
                <View key={d.key}>
                  <Text style={st.label}>{d.label}</Text>
                  <View style={st.chips}>
                    {list.map((f) => {
                      const on = (draft[d.key] || '').toLowerCase() === f.value.toLowerCase()
                      return <Chip key={f.value} label={`${f.value} ${f.count}`} on={on} onPress={() => set(d.key, on ? '' : f.value, true)} />
                    })}
                  </View>
                </View>
              )
            }
            if (d.kind === 'select') {
              return (
                <View key={d.key}>
                  <Text style={st.label}>{d.label}</Text>
                  <View style={st.chips}>
                    {d.options.map((o) => {
                      const on = draft[d.key] === o
                      return <Chip key={o} label={o} on={on} onPress={() => set(d.key, on ? '' : o, true)} />
                    })}
                  </View>
                </View>
              )
            }
            return (
              <View key={d.key}>
                <Text style={st.label}>{d.label}</Text>
                <TextInput
                  value={draft[d.key] || ''}
                  onChangeText={(v) => set(d.key, d.kind === 'contains' ? v : v.replace(/[^\d]/g, ''))}
                  placeholder={d.placeholder}
                  placeholderTextColor={C.textMuted}
                  keyboardType={d.kind === 'contains' ? 'default' : 'number-pad'}
                  returnKeyType="search"
                  onSubmitEditing={() => onApply(draft)}
                  style={st.input}
                />
              </View>
            )
          })}
          <View style={{ flexDirection: 'row', gap: R.sm }}>
            <AppButton label="Шүүх" icon="search" onPress={() => onApply(draft)} style={{ flex: 1 }} />
            {active > 0 ? <AppButton label="Цэвэрлэх" variant="secondary" onPress={() => { setDraft({}); onApply({}) }} /> : null}
          </View>
        </View>
      ) : null}
    </AppCard>
  )
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={[st.chip, on && { borderColor: C.brand, backgroundColor: C.brand }]}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: on ? C.bgCard : C.textSub }}>{label}</Text>
    </TouchableOpacity>
  )
}

const st = StyleSheet.create({
  label: { ...F.tiny, color: C.textSub, fontWeight: '800', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: C.border2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  input: { borderWidth: 1, borderColor: C.border2, borderRadius: R.md, paddingHorizontal: 12, height: 42, color: C.text, backgroundColor: C.bgInput },
  count: { backgroundColor: C.brand, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
  countText: { color: C.bgCard, fontSize: 11, fontWeight: '900' },
})
