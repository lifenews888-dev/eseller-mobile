import React, { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, Image, ActivityIndicator, Alert,
} from 'react-native'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { get, post } from '../../src/services/api'
import { C, R, UI } from '../../src/shared/design'
import {
  MIN_PUBLIC_PRODUCT_PRICE_MNT,
  isPlaceholderProductName,
} from '../../src/shared/productQuality'
import { AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI'

const SOURCES = [
  { id: 'aliexpress', label: 'AliExpress' },
  { id: 'cj',        label: 'CJ Drop' },
]

const MARGINS = [10, 20, 30, 50]
const DEFAULT_SOURCE = SOURCES[0].id
const DEFAULT_MARGIN = 20

function sourceAccent(id: string) {
  return id.toLowerCase().includes('cj') ? C.primary : C.seller
}

function normalizeQueryParam(value?: string | string[] | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeSourceParam(value?: string | string[] | null) {
  if (typeof value !== 'string') return DEFAULT_SOURCE
  const normalized = value.trim().toLowerCase()
  return SOURCES.some((source) => source.id === normalized) ? normalized : DEFAULT_SOURCE
}

function normalizeMarginParam(value?: string | string[] | null) {
  if (typeof value !== 'string') return DEFAULT_MARGIN
  const normalized = Number(value)
  return MARGINS.includes(normalized) ? normalized : DEFAULT_MARGIN
}

function estimateSellPriceMnt(supplierPrice: number, margin: number) {
  const usdToMnt = 3450
  const mnt = supplierPrice * usdToMnt
  return Math.ceil(mnt * (1 + margin / 100))
}

function dropshipQualityIssue(product: DropProduct, margin: number): string | null {
  const name = product?.name?.trim() ?? ''
  const supplierPrice = Number(product?.supplierPrice ?? 0)
  const images = Array.isArray(product?.images) ? product.images : []
  const estimatedPrice = estimateSellPriceMnt(supplierPrice, margin)

  if (!name || isPlaceholderProductName(name)) {
    return 'Барааны нэр баталгаажаагүй байна.'
  }
  if (!Number.isFinite(supplierPrice) || supplierPrice <= 0 || estimatedPrice < MIN_PUBLIC_PRODUCT_PRICE_MNT) {
    return 'Нийлүүлэгчийн үнэ MNT рүү зөв хөрвөөгүй байна.'
  }
  if (!images.some((image) => typeof image === 'string' && /^https?:/i.test(image))) {
    return 'Барааны зураг баталгаажаагүй байна.'
  }

  return null
}

interface DropProduct {
  supplierId:    string
  supplierName:  string
  name:          string
  supplierPrice: number
  supplierCurrency: string
  images:        string[]
  supplierUrl:   string
  supplierStock: number
  rating:        number
  orders:        number
  shipping:      string
}

export default function DropshipScreen() {
  const params = useLocalSearchParams<{ q?: string; source?: string; margin?: string }>()
  const layout = useAppLayoutMetrics()
  const [query,    setQuery]    = useState(() => normalizeQueryParam(params.q))
  const [search,   setSearch]   = useState(() => normalizeQueryParam(params.q))
  const [source,   setSource]   = useState(() => normalizeSourceParam(params.source))
  const [margin,   setMargin]   = useState(() => normalizeMarginParam(params.margin))
  const [importing, setImporting] = useState<string | null>(null)

  useEffect(() => {
    const nextQuery = normalizeQueryParam(params.q)
    setQuery(nextQuery)
    setSearch(nextQuery)
    setSource(normalizeSourceParam(params.source))
    setMargin(normalizeMarginParam(params.margin))
  }, [params.q, params.source, params.margin])

  const replaceDropshipRoute = (
    patch: { q?: string; source?: string; margin?: number },
  ) => {
    const nextSearch = patch.q !== undefined ? patch.q.trim() : search
    const nextSource = patch.source ?? source
    const nextMargin = patch.margin ?? margin
    const routeParams: Record<string, string> = {}

    if (nextSearch) routeParams.q = nextSearch
    if (nextSource !== DEFAULT_SOURCE) routeParams.source = nextSource
    if (nextMargin !== DEFAULT_MARGIN) routeParams.margin = String(nextMargin)

    router.replace(
      Object.keys(routeParams).length
        ? ({ pathname: '/dropship' as any, params: routeParams } as any)
        : ('/dropship' as any),
    )
  }

  const submitSearch = () => {
    const nextSearch = query.trim()
    setQuery(nextSearch)
    setSearch(nextSearch)
    replaceDropshipRoute({ q: nextSearch })
  }

  const clearSearch = () => {
    setQuery('')
    setSearch('')
    replaceDropshipRoute({ q: '' })
  }

  const selectSource = (nextSource: string) => {
    setSource(nextSource)
    replaceDropshipRoute({ source: nextSource })
  }

  const selectMargin = (nextMargin: number) => {
    setMargin(nextMargin)
    replaceDropshipRoute({ margin: nextMargin })
  }

  const { data, isLoading } = useQuery<{ products: DropProduct[] }>({
    queryKey:  ['dropship', search, source],
    queryFn:   () => get(`/dropship/search?q=${encodeURIComponent(search)}&source=${source}`) as any,
    enabled:   search.length > 0,
    retry:     false,
    staleTime: 60_000,
  })

  const rawProducts = Array.isArray((data as any)?.products) ? (data as any).products : []
  const products = rawProducts.filter((product: DropProduct) => !dropshipQualityIssue(product, margin))

  function sellPrice(supplierPrice: number, selectedMargin = margin) {
    return estimateSellPriceMnt(supplierPrice, selectedMargin)
  }

  async function importProduct(product: DropProduct) {
    const issue = dropshipQualityIssue(product, margin)
    if (issue) {
      Alert.alert('Бараа шалгалтад байна', issue)
      return
    }
    setImporting(product.supplierId)
    try {
      await post('/dropship/import', {
        supplierId:    product.supplierId,
        supplierName:  product.supplierName,
        name:          product.name,
        supplierPrice: product.supplierPrice,
        sellPrice:     sellPrice(product.supplierPrice),
        images:        product.images,
        supplierUrl:   product.supplierUrl,
      })
      Alert.alert('Амжилттай', `"${product.name.slice(0, 30)}..." таны дэлгүүрт нэмэгдлээ.`)
    } catch (e: any) {
      Alert.alert('Алдаа', e?.message || 'Import амжилтгүй')
    } finally {
      setImporting(null)
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ paddingHorizontal: R.lg, paddingTop: layout.screenTop }}>
          <AppTopBar eyebrow="Нэмэлт" title="Dropship" showBack={false} style={{ marginBottom: R.md }} />
          <AppHeader
            title="Dropship"
            subtitle="AliExpress болон CJ-ээс бараа хайж, дэлгүүртээ импортлоно."
            icon="earth-outline"
            accent={C.seller}
            style={{ marginBottom: 0 }}
          />
        </View>

        {/* Search */}
        <View style={{ padding: 12, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{
              flex: 1, flexDirection: 'row', alignItems: 'center',
              backgroundColor: C.bgCard, borderRadius: R.lg,
              paddingHorizontal: 12, height: 46, gap: 8,
              borderWidth: 0.5, borderColor: C.border,
            }}>
              <Ionicons name="search" size={16} color={C.textMuted} />
              <TextInput
                accessibilityLabel="Dropship бараа хайх"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={submitSearch}
                placeholder="Бараа хайх..."
                placeholderTextColor={C.textMuted}
                style={{ flex: 1, color: C.text, fontSize: 14 }}
                returnKeyType="search"
              />
              {query.length > 0 ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Хайлтыг цэвэрлэх"
                  hitSlop={8}
                  activeOpacity={0.82}
                  onPress={clearSearch}
                >
                  <Ionicons name="close-circle" size={18} color={C.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Dropship хайх"
              activeOpacity={0.84}
              onPress={submitSearch}
              style={{
                backgroundColor: C.primary, borderRadius: R.lg,
                width: 46, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="search" size={20} color={C.bgCard} />
            </TouchableOpacity>
          </View>

          {/* Source switcher */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SOURCES.map(s => (
              <TouchableOpacity
                key={s.id}
                accessibilityRole="button"
                accessibilityLabel={`${s.label} эх сурвалж сонгох`}
                accessibilityState={{ selected: source === s.id }}
                activeOpacity={0.84}
                onPress={() => selectSource(s.id)}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: R.md,
                  backgroundColor: source === s.id ? sourceAccent(s.id) : C.bgCard,
                  alignItems: 'center', borderWidth: 0.5,
                  borderColor: source === s.id ? sourceAccent(s.id) : C.border,
                }}
              >
                <Text style={{
                  fontSize: 12, fontWeight: '700',
                  color: source === s.id ? C.bgCard : C.textSub,
                }}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Margin */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, color: C.textSub }}>Ашиг %:</Text>
            {MARGINS.map(m => (
              <TouchableOpacity
                key={m}
                accessibilityRole="button"
                accessibilityLabel={`${m} хувь ашиг сонгох`}
                accessibilityState={{ selected: margin === m }}
                activeOpacity={0.84}
                onPress={() => selectMargin(m)}
                style={{
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.full,
                  backgroundColor: margin === m ? C.primary : C.bgCard,
                  borderWidth: 0.5, borderColor: margin === m ? C.primary : C.border,
                }}
              >
                <Text style={{
                  fontSize: 11, fontWeight: '700',
                  color: margin === m ? C.bgCard : C.textSub,
                }}>
                  {m}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Results */}
        {isLoading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
        ) : products.length === 0 && search ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Ionicons name="search-outline" size={40} color={C.textMuted} />
            <Text style={{ color: C.textMuted, marginTop: 12 }}>Бараа олдсонгүй</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Ionicons name="earth-outline" size={48} color={C.primary} />
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '700', marginTop: 12 }}>
              Dropship
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
              AliExpress болон CJ-ээс бараа хайж, дэлгүүртээ нэмнэ үү
            </Text>
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={p => p.supplierId}
            numColumns={2}
            contentContainerStyle={{ padding: 10, paddingBottom: layout.screenBottom, gap: 10 }}
            columnWrapperStyle={{ gap: 10 }}
            renderItem={({ item: p }) => (
              <View style={{
                flex: 1, backgroundColor: C.bgCard, borderRadius: R.lg,
                overflow: 'hidden', borderWidth: 0.5, borderColor: C.border,
              }}>
                {/* Image */}
                <View style={{ height: 140, backgroundColor: C.bgSection }}>
                  {p.images?.[0] ? (
                    <Image
                      source={{ uri: p.images[0] }}
                      style={{ width: '100%', height: 140 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="cube-outline" size={36} color={C.textMuted} />
                    </View>
                  )}
                  <View style={{
                    position: 'absolute', top: 6, left: 6,
                    backgroundColor: sourceAccent(p.supplierName),
                    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
                  }}>
                    <Text style={{ color: C.bgCard, fontSize: 8, fontWeight: '800' }}>
                      {p.supplierName.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={{ padding: 8, gap: 4 }}>
                  <Text numberOfLines={2} style={{
                    fontSize: 11, color: C.text, fontWeight: '500', lineHeight: 15,
                  }}>
                    {p.name}
                  </Text>

                  <View style={{ gap: 2 }}>
                    <Text style={{ fontSize: 10, color: C.textMuted }}>
                      Нийлүүлэгч: ${p.supplierPrice.toFixed(2)}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: C.primary }}>
                      {sellPrice(p.supplierPrice).toLocaleString()}₮
                    </Text>
                  </View>

                  {(p.rating > 0 || p.orders > 0) && (
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      {p.rating > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <Ionicons name="star" size={10} color={C.gold} />
                          <Text style={{ fontSize: 9, color: C.textMuted }}>{p.rating.toFixed(1)}</Text>
                        </View>
                      )}
                      {p.orders > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <Ionicons name="cube-outline" size={10} color={C.textMuted} />
                          <Text style={{ fontSize: 9, color: C.textMuted }}>{p.orders}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`${p.name} дэлгүүрт нэмэх`}
                    activeOpacity={0.84}
                    onPress={() => importProduct(p)}
                    disabled={importing === p.supplierId}
                    style={{
                      backgroundColor: importing === p.supplierId ? C.border : C.primary,
                      borderRadius: 8, paddingVertical: 7,
                      alignItems: 'center', marginTop: 4,
                    }}
                  >
                    {importing === p.supplierId ? (
                      <ActivityIndicator size="small" color={C.bgCard} />
                    ) : (
                      <Text style={{ color: C.bgCard, fontSize: 11, fontWeight: '700' }}>
                        + Дэлгүүрт нэмэх
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </>
  )
}
