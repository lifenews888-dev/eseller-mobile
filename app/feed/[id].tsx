import React, { useState } from 'react'
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { get } from '../../src/services/api'
import { useCart } from '../../src/store/cart'
import { C, R, F, UI } from '../../src/shared/design'
import {
  getProductName,
  getProductImages,
  getPublicProductPrice,
  getPublicProductQualityIssue,
} from '../../src/shared/productQuality'
import { encodeRouteParam, normalizeRouteParam, safeDecodeRouteParam } from '../../src/shared/routeParams'
import { getShopName } from '../../src/shared/shopIdentity'
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI'

const W = Dimensions.get('window').width
const fmt = (n: number) => `${Math.round(n || 0).toLocaleString()}₮`

export default function FeedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { add } = useCart()
  const layout = useAppLayoutMetrics()
  const [saved, setSaved] = useState(false)
  const [imageIndex, setImageIndex] = useState(0)
  const feedRouteParam = normalizeRouteParam(id)
  const feedRouteId = encodeRouteParam(feedRouteParam)

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['feed-detail', feedRouteId],
    queryFn: () => loadFeedDetail(feedRouteParam),
    enabled: !!feedRouteId,
    retry: false,
  })

  const item = normalizeFeedDetail(data)
  const itemId = item?.id ?? item?._id
  const itemRouteId = encodeRouteParam(itemId)

  if (isLoading) {
    return (
      <AppScreen contentContainerStyle={{ flexGrow: 1 }}>
        <AppTopBar eyebrow="Зар" title="Дэлгэрэнгүй" />
        <View style={st.center}>
          <Text style={{ color: C.textMuted }}>Ачаалж байна...</Text>
        </View>
      </AppScreen>
    )
  }

  if (isError) {
    return (
      <AppScreen contentContainerStyle={{ flexGrow: 1 }}>
        <AppTopBar eyebrow="Зар" title="Дэлгэрэнгүй" />
        <View style={st.center}>
          <AppCard style={{ alignItems: 'center', width: '100%' }}>
            <Ionicons name="cloud-offline-outline" size={48} color={C.textMuted} />
            <Text style={{ ...F.body, color: C.text, fontWeight: '800', marginTop: R.md }}>Зар ачаалж чадсангүй</Text>
            <Text style={{ ...F.small, color: C.textMuted, marginTop: R.xs, textAlign: 'center' }}>
              {(error as Error)?.message || 'Сүлжээ эсвэл серверийн алдаа гарлаа.'}
            </Text>
            <View style={{ flexDirection: 'row', gap: R.sm, marginTop: R.lg }}>
              <AppButton
                label={isRefetching ? 'Шалгаж байна' : 'Дахин оролдох'}
                icon="refresh"
                onPress={() => refetch()}
                disabled={isRefetching}
                style={{ flex: 1 }}
              />
              <AppButton
                label="Буцах"
                icon="arrow-back"
                variant="secondary"
                onPress={() => router.back()}
                style={{ flex: 1 }}
              />
            </View>
          </AppCard>
        </View>
      </AppScreen>
    )
  }

  if (!itemId) {
    return (
      <AppScreen contentContainerStyle={{ flexGrow: 1 }}>
        <AppTopBar eyebrow="Зар" title="Дэлгэрэнгүй" />
        <View style={st.center}>
          <AppCard style={{ alignItems: 'center', width: '100%' }}>
            <Ionicons name="alert-circle" size={48} color={C.textMuted} />
            <Text style={{ ...F.body, color: C.text, fontWeight: '800', marginTop: R.md }}>Зар олдсонгүй</Text>
            <Text style={{ ...F.small, color: C.textMuted, marginTop: R.xs, textAlign: 'center' }}>
              Энэ зар устсан эсвэл түр хугацаанд харагдахгүй байна.
            </Text>
            <AppButton
              label="Буцах"
              icon="arrow-back"
              variant="secondary"
              onPress={() => router.back()}
              style={{ marginTop: R.lg, minWidth: 140 }}
            />
          </AppCard>
        </View>
      </AppScreen>
    )
  }

  const images = getProductImages(item)
  const title = getProductName(item) || 'Зар'
  const price = getPublicProductPrice(item)
  const qualityIssue = getPublicProductQualityIssue(item)
  const category = item.categoryName || item.category || item.type || 'Дэлгүүр'
  const seller = item.seller || item.shop || item.owner || {}
  const sellerDisplayName = getShopName(seller)
  const sellerName =
    sellerDisplayName !== 'Дэлгүүр'
      ? sellerDisplayName
      : item.sellerName || item.shopName || 'Зарлагч'
  const sellerPhone = seller.phone || item.phone || item.contactPhone
  const productId = item.productId || item.product?.id || itemId
  const district = item.district || item.location || item.address
  const views = item.views ?? item.viewCount ?? 0
  const createdAt = item.createdAt || item.updatedAt

  function handleOrder() {
    if (qualityIssue) {
      Alert.alert('Бараа шалгалтад байна', qualityIssue.message)
      return
    }

    add(
      {
        id: String(productId),
        name: title,
        price,
        image: images[0] || null,
        entityId: seller.id || item.sellerId || item.shopId || '',
        entityName: sellerName,
      },
      1,
    )
    router.push('/checkout' as any)
  }

  function handleShare() {
    Share.share({
      message: `${title} - ${fmt(price)}\nhttps://eseller.mn/feed/${itemRouteId}`,
    })
  }

  function handleAffiliate() {
    if (qualityIssue) {
      Alert.alert('Бараа шалгалтад байна', qualityIssue.message)
      return
    }

    router.push({ pathname: '/register', params: { role: 'affiliate', returnTo: `/feed/${itemRouteId}` } } as any)
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ paddingBottom: layout.screenBottom + 104 }}
      >
      <View style={[st.topBarWrap, { paddingTop: layout.screenTop }]}>
        <AppTopBar eyebrow="Зар" title={title} style={{ marginBottom: 0 }} />
      </View>

      {images.length > 0 ? (
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setImageIndex(Math.round(e.nativeEvent.contentOffset.x / W))
            }
          >
            {images.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={{ width: W, height: W * 0.75 }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          <View style={st.imageCount}>
            <Text style={{ color: C.bgCard, fontSize: 12, fontWeight: '800' }}>
              {imageIndex + 1}/{images.length}
            </Text>
          </View>
        </View>
      ) : (
        <View style={st.emptyImage}>
          <Ionicons name="image-outline" size={48} color={C.textMuted} />
        </View>
      )}

      <View style={st.content}>
        <AppHeader
          title={title}
          subtitle={sellerName}
          icon="megaphone-outline"
          accent={C.brand}
          style={st.heroCard}
        />

        <AppCard style={st.priceCard} elevated>
          <View style={{ flex: 1 }}>
            <Text style={st.priceLabel}>Үнэ</Text>
            <Text style={st.priceText}>
              {qualityIssue?.code === 'invalid-price' ? 'Үнэ шалгалтад байна' : fmt(price)}
            </Text>
          </View>
          <View style={st.categoryChip}>
            <Text style={st.categoryText} numberOfLines={1}>{category}</Text>
          </View>
        </AppCard>

        <View style={st.metaGrid}>
          <MetaPill icon="location-outline" label={district || 'Байршил ороогүй'} />
          <MetaPill icon="eye-outline" label={`${views} үзсэн`} />
          <MetaPill icon="time-outline" label={createdAt ? timeAgo(createdAt) : 'Огноо ороогүй'} />
        </View>

        {qualityIssue ? (
          <View style={st.qualityBanner}>
            <Ionicons name="shield-checkmark-outline" size={18} color={C.gold} />
            <Text style={{ ...F.small, color: C.textSub, flex: 1 }}>
              {qualityIssue.message}
            </Text>
          </View>
        ) : null}

        <AppCard style={st.sectionCard}>
          <Text style={st.sectionTitle}>Тайлбар</Text>
          <Text style={st.description}>
            {item.description || 'Энэ зард дэлгэрэнгүй тайлбар хараахан ороогүй байна.'}
          </Text>
        </AppCard>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Борлуулж эхлэх"
          activeOpacity={0.84}
          disabled={!!qualityIssue}
          style={[st.affiliateBtn, qualityIssue && st.disabledAction]}
          onPress={handleAffiliate}
        >
          <Ionicons name="megaphone-outline" size={18} color={C.brand} />
          <Text style={{ color: C.brand, fontSize: 14, fontWeight: '900' }}>
            Борлуулж эхлэх (8%)
          </Text>
        </TouchableOpacity>

        {(sellerName || sellerPhone) ? (
          <AppCard style={st.sellerCard}>
            <View style={st.sellerAvatar}>
              <Ionicons name="person" size={22} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.sellerLabel}>Зарлагч</Text>
              <Text style={st.sellerName}>{sellerName}</Text>
              {sellerPhone ? (
                <Text style={{ ...F.tiny, color: C.textMuted, marginTop: 2 }}>{sellerPhone}</Text>
              ) : null}
            </View>
            {sellerPhone ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${sellerPhone} руу залгах`}
                activeOpacity={0.84}
                style={st.callBtn}
                onPress={() => Linking.openURL(`tel:${sellerPhone}`).catch((e) => Alert.alert('Алдаа', e.message))}
              >
                <Ionicons name="call" size={18} color={C.bgCard} />
              </TouchableOpacity>
            ) : null}
          </AppCard>
        ) : null}
      </View>
      </ScrollView>

      <View style={[st.fixedActions, { paddingBottom: layout.insets.bottom + R.lg }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Зарыг хуваалцах"
          activeOpacity={0.84}
          style={st.iconAction}
          onPress={handleShare}
        >
          <Ionicons name="share-social-outline" size={20} color={C.text} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Хадгалснаас хасах' : 'Хадгалах'}
          accessibilityState={{ selected: saved }}
          activeOpacity={0.84}
          style={[st.iconAction, { backgroundColor: saved ? C.brandDim : C.bgCard }]}
          onPress={() => setSaved(!saved)}
        >
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={20} color={saved ? C.brand : C.text} />
        </TouchableOpacity>
        <AppButton
          label={qualityIssue ? 'Шалгалтад байна' : 'Захиалах'}
          icon="bag-check"
          onPress={handleOrder}
          disabled={!!qualityIssue}
          style={{ flex: 1, minHeight: 50 }}
        />
      </View>
    </View>
  )
}

const st = StyleSheet.create({
  center: {
    flexGrow: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarWrap: {
    paddingHorizontal: R.lg,
    paddingBottom: R.md,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  emptyImage: {
    height: 220,
    backgroundColor: C.bgSection,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCount: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    backgroundColor: C.text + '8C',
    borderRadius: R.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryChip: {
    maxWidth: 132,
    backgroundColor: C.bgSection,
    borderRadius: R.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryText: { ...F.small, color: C.textSub, fontWeight: '800' },
  content: {
    padding: UI.screenPad,
    gap: R.md,
  },
  heroCard: {
    marginBottom: 0,
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
  },
  priceLabel: { ...F.tiny, color: C.textMuted, fontWeight: '900', textTransform: 'uppercase' },
  priceText: { color: C.brand, fontSize: 28, fontWeight: '900', marginTop: 2 },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: R.sm,
  },
  metaPill: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.xs,
    backgroundColor: C.bgCard,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: R.md,
    paddingVertical: R.sm,
  },
  metaPillText: { ...F.small, color: C.textSub, fontWeight: '700' },
  sectionCard: { gap: R.xs },
  sectionTitle: { ...F.h4, color: C.text, fontWeight: '900' },
  description: { ...F.body, color: C.textSub, lineHeight: 22 },
  affiliateBtn: {
    marginTop: R.sm,
    borderRadius: R.lg,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: C.brandDim,
    borderWidth: 1,
    borderColor: C.brand + '35',
  },
  qualityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
    backgroundColor: C.goldDim,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.gold + '35',
    padding: R.md,
    marginBottom: R.lg,
  },
  disabledAction: {
    opacity: 0.55,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
    padding: R.md,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: UI.controlRadius,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerLabel: { ...F.tiny, color: C.textMuted, fontWeight: '900' },
  sellerName: { ...F.body, color: C.text, fontWeight: '900', marginTop: 2 },
  callBtn: {
    backgroundColor: C.secondary,
    borderRadius: R.full,
    padding: 10,
  },
  fixedActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
    backgroundColor: C.bgCard,
    padding: UI.screenPad,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  iconAction: {
    width: 50,
    height: 50,
    borderRadius: UI.controlRadius,
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

function MetaPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={st.metaPill}>
      <Ionicons name={icon} size={14} color={C.textMuted} />
      <Text style={st.metaPillText} numberOfLines={1}>{label}</Text>
    </View>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Саяхан'
  if (mins < 60) return `${mins} мин`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} цаг`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} өдөр`
  return new Date(dateStr).toLocaleDateString('mn-MN')
}

async function loadFeedDetail(id: string) {
  const routeId = encodeRouteParam(id)
  const decodedId = safeDecodeRouteParam(id)
  try {
    return await get(`/feed/${routeId}`)
  } catch (detailError) {
    const list = await get('/feed', { limit: 100 })
    const found = extractFeedItems(list).find((item: any) => matchesRouteId(item, id, routeId, decodedId))
    if (found) return found
    throw detailError
  }
}

function matchesRouteId(item: any, rawId: string, routeId: string, decodedId: string) {
  const candidate = item?.id ?? item?._id ?? item?.slug ?? item?.listingId ?? item?.postId
  if (candidate == null) return false

  const candidateId = String(candidate)
  const encodedCandidate = encodeRouteParam(candidateId)
  return (
    candidateId === rawId ||
    candidateId === decodedId ||
    encodedCandidate === rawId ||
    encodedCandidate === routeId
  )
}

function normalizeFeedDetail(data: unknown): any | null {
  const value = data as any
  return value?.listing ?? value?.post ?? value?.item ?? value?.product ?? value ?? null
}

function extractFeedItems(data: unknown): any[] {
  const value = data as any
  if (Array.isArray(value)) return value
  return [
    ...(Array.isArray(value?.posts) ? value.posts : []),
    ...(Array.isArray(value?.items) ? value.items : []),
    ...(Array.isArray(value?.vip) ? value.vip : []),
    ...(Array.isArray(value?.featured) ? value.featured : []),
    ...(Array.isArray(value?.discounted) ? value.discounted : []),
    ...(Array.isArray(value?.normal) ? value.normal : []),
  ]
}
