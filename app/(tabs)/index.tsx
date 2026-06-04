import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, Dimensions, FlatList, RefreshControl,
  Animated, Easing, Linking,
} from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useAuth } from '../../src/store/auth'
import { useCart } from '../../src/store/cart'
import { get } from '../../src/services/api'
import { C, R, F, S, UI } from '../../src/shared/design'
import { shadowStyle } from '../../src/shared/shadow'
import { LIVE_HOME_CATEGORIES, LIVE_SEARCH_KEYWORDS } from '../../src/shared/liveCategories'
import {
  filterPublicProducts,
  firstProductImage,
  getPublicProductPrice,
} from '../../src/shared/productQuality'

import { Skeleton } from '../../src/shared/ui/Skeleton'
import { FlashSaleRow } from '../../src/components/home/FlashSaleRow'
import { GoldCta } from '../../src/components/home/GoldCta'
import { AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI'

const { width } = Dimensions.get('window')
const CARD_W = 156

type HomeProduct = {
  id: string;
  name?: string;
  entityName?: string;
  price?: number;
  rating?: number;
  images?: string[];
  media?: Array<{ url?: string }>;
};

const QA_ITEMS = [
  { icon: 'bag-outline' as const, label: 'Дэлгүүр', color: C.brand, bg: C.brandDim, route: '/store' },
  { icon: 'megaphone-outline' as const, label: 'Зар', color: C.primary, bg: C.primaryDim, route: '/feed' },
  { icon: 'storefront-outline' as const, label: 'Дэлгүүрүүд', color: C.herder, bg: C.herder + '14', route: '/shops' },
  { icon: 'star-outline' as const, label: 'Gold', color: C.gold, bg: C.goldDim, route: '/gold' },
  { icon: 'cube-outline' as const, label: 'Захиалга', color: C.store, bg: C.store + '14', route: '/orders' },
  { icon: 'cart-outline' as const, label: 'Сагс', color: C.seller, bg: C.seller + '14', route: '/cart' },
  { icon: 'car-outline' as const, label: 'Хүргэлт', color: C.driver, bg: C.driver + '14', route: '/track/search' },
  { icon: 'heart-outline' as const, label: 'Хадгалсан', color: C.error, bg: C.errorDim, route: '/wishlist' },
]

const HOME_SERVICE_ITEMS = [
  {
    icon: 'checkmark-done' as const,
    color: C.brand,
    name: 'Яагаад бид?',
    sub: 'eSeller давуу тал',
    route: '/compare',
  },
  {
    icon: 'storefront' as const,
    color: C.store,
    name: 'Дэлгүүр нээх',
    sub: 'Өөрийн дэлгүүр',
    route: '/open-shop',
  },
  {
    icon: 'people' as const,
    color: C.seller,
    name: 'Борлуулагч болох',
    sub: 'Орлого олох',
    route: '/become-seller',
  },
  {
    icon: 'car-outline' as const,
    color: C.driver,
    name: 'Жолооч болох',
    sub: 'Хүргэлтийн баг',
    route: '/become-driver',
  },
  {
    icon: 'link-outline' as const,
    color: C.herder,
    name: 'Хамтрах',
    sub: 'Бизнес санал',
    route: '/partner',
  },
  {
    icon: 'help-circle-outline' as const,
    color: C.primary,
    name: 'Тусламж',
    sub: 'FAQ, холбоо барих',
    route: '/help',
  },
]

const SEARCH_KEYWORDS = LIVE_SEARCH_KEYWORDS

const PLATFORM_FEATURES = [
  { icon: 'star-outline' as const, label: 'Gold гишүүнчлэл', route: '/gold', color: C.gold, bg: C.goldDim },
  { icon: 'megaphone-outline' as const, label: 'Борлуулагч комисс', route: '/become-seller', color: C.seller, bg: C.seller + '14' },
  { icon: 'car-outline' as const, label: 'Өөрийн жолооч', route: '/become-driver', color: C.driver, bg: C.driver + '14' },
  { icon: 'lock-closed-outline' as const, label: 'Дундын данс', route: '/compare', color: C.herder, bg: C.herder + '14' },
  { icon: 'cube-outline' as const, label: '50,000₮+ үнэгүй хүргэлт', route: '/help', color: C.brand, bg: C.brandDim },
  { icon: 'refresh-outline' as const, label: '48 цагийн буцаалт', route: '/returns', color: C.primary, bg: C.primaryDim },
  { icon: 'qr-code-outline' as const, label: 'QPay аюулгүй төлбөр', route: '/help', color: C.seller, bg: C.seller + '14' },
  { icon: 'shield-checkmark-outline' as const, label: 'Баталгаат бараа', route: '/compare', color: C.success, bg: C.secondaryDim },
]

const HOME_STATS = [
  { value: '10,000+', label: 'бараа' },
  { value: '500+', label: 'дэлгүүр' },
  { value: '50,000+', label: 'хэрэглэгч' },
]

const HOME_FOOTER_GROUPS = [
  {
    title: 'Платформ',
    links: [
      { label: 'Дэлгүүрүүд', route: '/shops' },
      { label: 'Зарын булан', route: '/feed' },
      { label: 'Бараанууд', route: '/store' },
      { label: 'Gold', route: '/gold' },
    ],
  },
  {
    title: 'Дэмжлэг',
    links: [
      { label: 'Нөхцөл', route: '/terms' },
      { label: 'Нууцлал', route: '/privacy' },
      { label: 'Холбоо барих', route: '/contact' },
      { label: 'Тусламж', route: '/help' },
    ],
  },
  {
    title: 'Бизнес',
    links: [
      { label: 'Дэлгүүр нээх', route: '/open-shop' },
      { label: 'Борлуулагч болох', route: '/become-seller' },
      { label: 'Жолооч болох', route: '/become-driver' },
      { label: 'Хамтрах', route: '/partner' },
    ],
  },
]

const HOME_SOCIAL_LINKS = [
  { label: 'Facebook', icon: 'logo-facebook' as const, url: 'https://facebook.com/eseller.mn' },
  { label: 'Instagram', icon: 'logo-instagram' as const, url: 'https://instagram.com/eseller.mn' },
]

const ENTITY_TYPES = LIVE_HOME_CATEGORIES

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', paddingHorizontal: 16, marginBottom: 12,
    }}>
      <Text style={{ ...F.h3, color: C.text }}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={{
          flexDirection: 'row', alignItems: 'center', gap: 2,
        }}>
          <Text style={{ color: C.primary, fontSize: 13, fontWeight: '600' }}>
            Бүгдийг харах
          </Text>
          <Ionicons name="chevron-forward" size={14} color={C.primary} />
        </TouchableOpacity>
      )}
    </View>
  )
}

function PromotedBadge() {
  return (
    <View style={{
      position: 'absolute', top: 8, left: 8, zIndex: 1,
      backgroundColor: C.gold, borderRadius: R.sm,
      paddingHorizontal: 6, paddingVertical: 2,
      flexDirection: 'row', alignItems: 'center', gap: 3,
    }}>
      <Ionicons name="flash" size={9} color={C.text} />
      <Text style={{ color: C.text, fontSize: 9, fontWeight: '800' }}>
        ОНЦГОЙ
      </Text>
    </View>
  )
}

// ═══════════════════════════════════
// STORE OWNER — Dashboard
// ═══════════════════════════════════

function StoreDashboard() {
  const layout = useAppLayoutMetrics()
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['store-dashboard'],
    queryFn: () => get('/seller/analytics'),
  })

  const stats = (data as any) || {}

  const CARDS = [
    { icon: 'cash' as const, label: 'Борлуулалт', value: (stats.totalRevenue || 0).toLocaleString() + '₮', color: C.brand },
    { icon: 'receipt' as const, label: 'Захиалга', value: String(stats.totalOrders || 0), color: C.primary },
    { icon: 'cube' as const, label: 'Бараа', value: String(stats.totalProducts || 0), color: C.secondary },
    { icon: 'star' as const, label: 'Үнэлгээ', value: (stats.rating || 0).toFixed(1), color: C.gold },
  ]

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.store} />}>
      <View style={{ padding: UI.screenPad, paddingTop: layout.screenTop }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: C.text }}>
          Дэлгүүрийн самбар
        </Text>
        <Text style={{ color: C.textSub, fontSize: 13, marginTop: 4 }}>Хяналтын самбар</Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 10 }}>
        {CARDS.map((c) => (
          <View key={c.label} style={{ width: '47%', backgroundColor: C.bgCard, borderRadius: R.lg, padding: 16, borderLeftWidth: 3, borderLeftColor: c.color, borderWidth: 1, borderColor: C.border }}>
            <Ionicons name={c.icon} size={24} color={c.color} />
            <Text style={{ color: c.color, fontSize: 22, fontWeight: '900', marginTop: 8 }}>{c.value}</Text>
            <Text style={{ color: C.textSub, fontSize: 12, marginTop: 4 }}>{c.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ margin: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 12 }}>Хурдан үйлдэл</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[
            { icon: 'add-circle' as const, label: 'Бараа нэмэх', color: C.store, route: '/store' },
            { icon: 'receipt' as const, label: 'Захиалгууд', color: C.primary, route: '/orders' },
            { icon: 'people' as const, label: 'Борлуулагчид', color: C.seller, route: '/seller/products' },
            { icon: 'bar-chart' as const, label: 'Тайлан', color: C.gold, route: '/seller/earnings' },
          ].map((a) => (
            <TouchableOpacity key={a.route} onPress={() => router.push(a.route as any)}
              style={{ width: '47%', backgroundColor: a.color + '15', borderRadius: R.lg, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: a.color + '30' }}>
              <Ionicons name={a.icon} size={26} color={a.color} />
              <Text style={{ color: C.text, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  )
}

// ═══════════════════════════════════
// ROUTER — Role-аар ялгах (STORE-only legacy;
// DRIVER/SELLER now route to their own groups)
// ═══════════════════════════════════

export default function HomeScreen() {
  const { role } = useAuth()

  // STORE → store dashboard (legacy; STORE usually routes to /(owner))
  if (role === 'STORE') return <StoreDashboard />

  // BUYER / default → home feed
  return <BuyerHome />
}

function PulseDot({ color = C.error, size = 8 }: { color?: string; size?: number }) {
  const anim = React.useRef(new Animated.Value(1)).current
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.2, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()
  }, [])
  return (
    <Animated.View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, opacity: anim,
    }} />
  )
}

function CountdownTimer({ endsAt }: { endsAt?: string }) {
  const [label, setLabel] = React.useState('')
  React.useEffect(() => {
    if (!endsAt) return
    let id: ReturnType<typeof setInterval> | null = null
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) {
        setLabel('Дууслаа')
        if (id) { clearInterval(id); id = null }
        return
      }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setLabel(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    id = setInterval(tick, 1_000)
    return () => { if (id) clearInterval(id) }
  }, [endsAt])
  if (!label) return null
  return (
    <View style={{
      backgroundColor: C.errorDim, borderRadius: R.full,
      paddingHorizontal: 8, paddingVertical: 2,
      flexDirection: 'row', alignItems: 'center', gap: 4,
    }}>
      <PulseDot color={C.error} size={6} />
      <Text style={{ fontSize: 10, fontWeight: '800', color: C.error, fontVariant: ['tabular-nums'] }}>
        {label}
      </Text>
    </View>
  )
}

function CategoryGrid() {
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
      <SectionHeader title="Ангилалаар хайх" />
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        {ENTITY_TYPES.map((e) => (
          <TouchableOpacity
            key={e.slug}
            onPress={() => router.push({ pathname: e.screen as any, params: { category: e.slug } })}
            style={{
              width: '23%',
              minHeight: 86,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.bgSection,
              borderRadius: R.lg,
              borderWidth: 1,
              borderColor: e.color + '28',
              paddingHorizontal: 6,
              paddingVertical: 10,
            }}
          >
            <Ionicons name={e.icon as any} size={22} color={e.color} />
            <Text
              numberOfLines={2}
              style={{
                color: C.textSub,
                fontSize: 10,
                fontWeight: '600',
                textAlign: 'center',
                marginTop: 7,
                minHeight: 24,
              }}
            >
              {e.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

function SearchKeywordChips() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
      style={{ marginTop: -10, marginBottom: 16 }}
    >
      {SEARCH_KEYWORDS.map((keyword) => (
        <TouchableOpacity
          key={keyword}
          onPress={() => router.push({ pathname: '/search' as any, params: { q: keyword } })}
          style={{
            backgroundColor: C.bgSection,
            borderRadius: R.full,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Text style={{ color: C.textSub, fontSize: 12, fontWeight: '700' }}>
            {keyword}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

function MarketplaceCategoryChips() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
      style={{ marginBottom: 12 }}
    >
      <TouchableOpacity
        onPress={() => router.push('/store' as any)}
        style={{
          backgroundColor: C.primary,
          borderRadius: R.full,
          paddingHorizontal: 12,
          paddingVertical: 7,
        }}
      >
        <Text style={{ color: C.bgCard, fontSize: 12, fontWeight: '900' }}>
          Бүгд
        </Text>
      </TouchableOpacity>
      {ENTITY_TYPES.map((category) => (
        <TouchableOpacity
          key={category.slug}
          onPress={() => router.push({ pathname: category.screen as any, params: { category: category.slug } })}
          style={{
            backgroundColor: C.bgSection,
            borderRadius: R.full,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Text style={{ color: C.textSub, fontSize: 12, fontWeight: '800' }}>
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        onPress={() => router.push('/search' as any)}
        style={{
          backgroundColor: C.bgSection,
          borderRadius: R.full,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderWidth: 1,
          borderColor: C.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <Ionicons name="search" size={13} color={C.textSub} />
        <Text style={{ color: C.textSub, fontSize: 12, fontWeight: '900' }}>
          Хайх
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function MarketplaceSearchBlock() {
  return (
    <>
      <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '900' }}>
          Монголын нэгдсэн цахим зах
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {['10,000+ бараа', '500+ дэлгүүр', 'Хурдан хүргэлт'].map((item) => (
            <View
              key={item}
              style={{
                backgroundColor: C.bgSection,
                borderRadius: R.full,
                borderWidth: 1,
                borderColor: C.border,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: C.textSub, fontSize: 12, fontWeight: '800' }}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <MarketplaceCategoryChips />

      <TouchableOpacity
        onPress={() => router.push('/search' as any)}
        style={{
          flexDirection: 'row', alignItems: 'center',
          marginHorizontal: 12, marginBottom: 20,
          backgroundColor: C.bgSection, borderRadius: R.xl,
          padding: 14, gap: 10, borderWidth: 1, borderColor: C.border,
        }}
      >
        <Ionicons name="search" size={18} color={C.textMuted} />
        <Text style={{ color: C.textMuted, fontSize: 14, flex: 1 }}>
          Бараа, дэлгүүр хайх...
        </Text>
      </TouchableOpacity>

      <SearchKeywordChips />
    </>
  )
}

function PlatformFeatureStrip() {
  return (
    <View style={{ marginBottom: 14 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {PLATFORM_FEATURES.map((feature) => (
          <TouchableOpacity
            key={feature.label}
            onPress={() => router.push(feature.route as any)}
            style={{
              width: 148,
              minHeight: 74,
              backgroundColor: C.bgCard,
              borderRadius: R.lg,
              padding: 12,
              borderWidth: 1,
              borderColor: C.border,
              justifyContent: 'space-between',
              ...shadowStyle({ y: 1, blur: 4, opacity: 0.05, elevation: 1 }),
            }}
          >
            <View style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              backgroundColor: feature.bg,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
            }}>
              <Ionicons name={feature.icon} size={16} color={feature.color} />
            </View>
            <Text
              numberOfLines={2}
              style={{
                color: C.text,
                fontSize: 12,
                fontWeight: '800',
                lineHeight: 16,
              }}
            >
              {feature.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

function HomeStatsStrip() {
  return (
    <View style={{
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 24,
      backgroundColor: C.bgCard,
      borderRadius: R.lg,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
      ...shadowStyle({ y: 1, blur: 4, opacity: 0.05, elevation: 1 }),
    }}>
      {HOME_STATS.map((item, idx) => (
        <View
          key={item.label}
          style={{
            flex: 1,
            paddingVertical: 14,
            alignItems: 'center',
            borderLeftWidth: idx === 0 ? 0 : 1,
            borderLeftColor: C.border,
          }}
        >
          <Text style={{ color: C.brand, fontSize: 18, fontWeight: '900' }}>
            {item.value}
          </Text>
          <Text style={{ color: C.textSub, fontSize: 11, fontWeight: '700', marginTop: 3 }}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

function SellerBusinessCta({ bottom = 24 }: { bottom?: number }) {
  return (
    <View style={{ paddingHorizontal: 12, marginBottom: bottom }}>
      <View
        style={{
          backgroundColor: C.gold + '10', borderRadius: R.xl,
          padding: 20, borderWidth: 1, borderColor: C.gold + '30',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{
            width: 48, height: 48, borderRadius: R.xxl,
            backgroundColor: C.gold + '20',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="rocket" size={24} color={C.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.gold, fontWeight: '700', fontSize: 15 }}>
              Борлуулагч болж орлого олоорой
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
              Бараа share хийж 10-20% комисс аваарай. Бараа нөөц, хүргэлт шаардлагагүй.
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <TouchableOpacity
            onPress={() => router.push('/become-seller' as any)}
            style={{
              flex: 1,
              minHeight: 38,
              borderRadius: R.full,
              backgroundColor: C.gold,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: C.text, fontWeight: '900', fontSize: 12, flexShrink: 1 }}>
              Борлуулагч болох →
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/open-shop' as any)}
            style={{
              flex: 1,
              minHeight: 38,
              borderRadius: R.full,
              borderWidth: 1,
              borderColor: C.gold + '50',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: C.gold, fontWeight: '900', fontSize: 12, flexShrink: 1 }}>
              Дэлгүүр нээх →
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

function HomeAppShortcutSections() {
  return (
    <>
      <View style={{
        marginHorizontal: 16,
        marginBottom: 14,
        backgroundColor: C.bgCard,
        borderRadius: R.xl,
        padding: 12,
        borderWidth: 1,
        borderColor: C.border,
        ...shadowStyle({ y: 2, blur: 6, opacity: 0.06, elevation: 2 }),
      }}>
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
        }}>
          {QA_ITEMS.map(item => (
            <TouchableOpacity
              key={item.route}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch {}
                router.push(item.route as any)
              }}
              style={{
                width: '25%',
                alignItems: 'center',
                paddingVertical: 10,
                paddingHorizontal: 4,
              }}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: R.md,
                backgroundColor: item.bg,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 5,
              }}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={{
                fontSize: 11,
                fontWeight: '600',
                color: C.textSub,
                textAlign: 'center',
              }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{
        marginHorizontal: 16,
        marginBottom: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        {HOME_SERVICE_ITEMS.map(svc => (
          <TouchableOpacity
            key={svc.route}
            onPress={() => router.push(svc.route as any)}
            style={{
              width: '48%',
              backgroundColor: C.bgCard,
              borderRadius: R.lg,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              borderWidth: 1,
              borderColor: C.border,
              ...shadowStyle({ y: 1, blur: 4, opacity: 0.05, elevation: 1 }),
            }}
          >
            <View style={{
              width: 38, height: 38,
              borderRadius: R.md,
              backgroundColor: svc.color + '18',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Ionicons name={svc.icon} size={20} color={svc.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 13,
                fontWeight: '700',
                color: C.text,
              }}>
                {svc.name}
              </Text>
              <Text style={{
                fontSize: 10,
                color: C.textMuted,
                marginTop: 1,
              }}>
                {svc.sub}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => router.push('/services' as any)}
        style={{
          marginHorizontal: 16,
          marginBottom: 24,
          backgroundColor: C.bgCard,
          borderRadius: R.lg,
          paddingVertical: 14,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <Text style={{
          fontSize: 14,
          fontWeight: '600',
          color: C.textSub,
        }}>
          Бүх үйлчилгээ
        </Text>
      </TouchableOpacity>
    </>
  )
}

function HomeLiveFooterLinks() {
  return (
    <View style={{
      marginHorizontal: 16,
      marginTop: 4,
      marginBottom: 16,
      borderTopWidth: 1,
      borderTopColor: C.border,
      paddingTop: 18,
    }}>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '900' }}>
          eseller<Text style={{ color: C.brand }}>.mn</Text>
        </Text>
        <Text style={{ color: C.textSub, fontSize: 12, fontWeight: '700', marginTop: 4 }}>
          Монголын нэгдсэн цахим зах
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 6 }}>
          7XXX-XXXX info@eseller.mn
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {HOME_SOCIAL_LINKS.map((social) => (
            <TouchableOpacity
              key={social.label}
              onPress={() => Linking.openURL(social.url)}
              style={{
                minHeight: 34,
                borderRadius: R.full,
                backgroundColor: C.bgSection,
                borderWidth: 1,
                borderColor: C.border,
                paddingHorizontal: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 6,
              }}
            >
              <Ionicons name={social.icon} size={15} color={C.textSub} />
              <Text style={{ color: C.textSub, fontSize: 12, fontWeight: '800' }}>
                {social.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {HOME_FOOTER_GROUPS.map((group) => (
          <View key={group.title} style={{ width: '31%', minWidth: 96 }}>
            <Text style={{ color: C.text, fontSize: 12, fontWeight: '900', marginBottom: 8 }}>
              {group.title}
            </Text>
            <View style={{ gap: 7 }}>
              {group.links.map((link) => (
                <TouchableOpacity
                  key={`${group.title}-${link.label}`}
                  onPress={() => router.push(link.route as any)}
                >
                  <Text style={{ color: C.textSub, fontSize: 12, fontWeight: '700' }}>
                    {link.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>

      <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '700', marginTop: 18 }}>
        © 2026 eseller.mn — Бүх эрх хуулиар хамгаалагдсан
      </Text>

      <TouchableOpacity
        onPress={() => router.push('/feedback' as any)}
        style={{
          marginTop: 14,
          alignSelf: 'flex-start',
          minHeight: 36,
          borderRadius: R.full,
          backgroundColor: C.primary,
          paddingHorizontal: 14,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 7,
        }}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={15} color={C.bgCard} />
        <Text style={{ color: C.bgCard, fontSize: 12, fontWeight: '900' }}>
          Санал хүсэлт илгээх
        </Text>
      </TouchableOpacity>
    </View>
  )
}

function FeaturedStoresSection({ loadingStores, stores }: { loadingStores: boolean; stores: any[] }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <SectionHeader
        title="Онцлох дэлгүүрүүд"
        onSeeAll={() => router.push('/shops' as any)}
      />
      {loadingStores ? (
        <ScrollView horizontal contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} width={200} height={120} borderRadius={R.lg} />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={stores}
          keyExtractor={(s: any) => s.id || s._id}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
          renderItem={({ item: s }: any) => (
            <TouchableOpacity
              onPress={() => router.push(`/${s.storefrontSlug || s.slug || s.id}` as any)}
              style={{
                width: 200, backgroundColor: C.bgCard, borderRadius: R.lg,
                overflow: 'hidden', borderWidth: 1,
                borderColor: C.gold + '30', ...S.card,
              }}
            >
              <View
                style={{
                  height: 60, justifyContent: 'center',
                  alignItems: 'center', position: 'relative',
                  backgroundColor: C.primaryDim,
                }}
              >
                <View style={{
                  position: 'absolute', top: 6, right: 6,
                  backgroundColor: C.gold, borderRadius: R.sm,
                  paddingHorizontal: 5, paddingVertical: 1,
                  flexDirection: 'row', alignItems: 'center', gap: 2,
                }}>
                  <Ionicons name="flash" size={8} color={C.text} />
                  <Text style={{ color: C.text, fontSize: 8, fontWeight: '800' }}>
                    ОНЦГОЙ
                  </Text>
                </View>
                <View style={{
                  width: 44, height: 44, borderRadius: R.full,
                  backgroundColor: C.primary,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 2, borderColor: C.bgCard,
                }}>
                  {s.logoUrl ? (
                    <Image source={{ uri: s.logoUrl }}
                      style={{ width: 44, height: 44, borderRadius: R.full }} />
                  ) : (
                    <Text style={{ color: C.bgCard, fontSize: 18, fontWeight: '700' }}>
                      {s.name?.[0]}
                    </Text>
                  )}
                </View>
              </View>

              <View style={{ padding: 10, alignItems: 'center' }}>
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                  {s.name}
                </Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  gap: 4, marginTop: 4,
                }}>
                  <Ionicons name="star" size={11} color={C.gold} />
                  <Text style={{ color: C.textMuted, fontSize: 11 }}>
                    {s.rating?.toFixed(1) || '5.0'}
                  </Text>
                  <Text style={{ color: C.border2, fontSize: 11 }}>·</Text>
                  <Text style={{ color: C.textMuted, fontSize: 11 }}>
                    {s.productCount || 0} бараа
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{
              width: width - 24, alignItems: 'center', padding: 24,
              backgroundColor: C.bgCard, borderRadius: R.lg,
              borderWidth: 1, borderColor: C.border, marginHorizontal: 0,
            }}>
              <Ionicons name="storefront-outline" size={36} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 8 }}>
                Дэлгүүрээ онцлоорой
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>
                Нүүр хуудсанд гарч борлуулалтаа нэмэгдүүл
              </Text>
            </View>
          }
        />
      )}
    </View>
  )
}

function LatestListingsSection({ feedPosts }: { feedPosts: any[] }) {
  const visibleFeedPosts = filterPublicProducts<any>(feedPosts);

  return (
    <View style={{ marginBottom: 24 }}>
      <SectionHeader
        title="Сүүлийн зарууд"
        onSeeAll={() => router.push('/feed' as any)}
      />
      <View style={{ paddingHorizontal: 12 }}>
        {visibleFeedPosts.slice(0, 5).map((p: any) => {
          const image = firstProductImage(p, '');
          const price = getPublicProductPrice(p);

          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => router.push(`/feed/${p.id}` as any)}
              style={{
                flexDirection: 'row', backgroundColor: C.bgCard,
                borderRadius: R.lg, marginBottom: 10, overflow: 'hidden',
                borderWidth: 1,
                borderColor: p.featured ? C.gold + '40' : C.border,
              }}
            >
              <View style={{ position: 'relative' }}>
                <Image
                  source={{ uri: image }}
                  style={{ width: 100, height: 100, backgroundColor: C.bgSection }}
                  resizeMode="cover"
                />
                {p.featured && (
                  <View style={{
                    position: 'absolute', top: 4, left: 4,
                    backgroundColor: C.gold, borderRadius: R.xs,
                    paddingHorizontal: 4, paddingVertical: 1,
                  }}>
                    <Text style={{ color: C.text, fontSize: 8, fontWeight: '800' }}>
                      ОНЦГОЙ
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1, padding: 12, justifyContent: 'center' }}>
                <Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }} numberOfLines={2}>
                  {p.title || p.name}
                </Text>
                <Text style={{ color: C.brand, fontWeight: '800', fontSize: 15, marginTop: 5 }}>
                  {price.toLocaleString()}₮
                </Text>
                {p.district && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                    <Ionicons name="location-outline" size={11} color={C.textMuted} />
                    <Text style={{ color: C.textMuted, fontSize: 11 }}>{p.district}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  )
}

function BuyerHome() {
  const { user, role } = useAuth()
  const { count } = useCart()
  const layout = useAppLayoutMetrics()
  const [bannerIdx, setBannerIdx] = useState(0)
  const bannerRef = useRef<ScrollView>(null)

  // API queries
  const { data: featuredData, isLoading: loadingFeatured, refetch } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => get('/search?limit=10&sort=newest&featured=true'),
  })

  const { data: newData, isLoading: loadingNew } = useQuery({
    queryKey: ['new-products'],
    queryFn: () => get('/search?limit=10&sort=newest'),
  })

  const { data: storesData, isLoading: loadingStores } = useQuery({
    queryKey: ['featured-stores'],
    queryFn: () => get('/stores?limit=10'),
  })

  const { data: feedData } = useQuery({
    queryKey: ['feed-preview'],
    queryFn: () => get('/feed?limit=6'),
  })

  const featuredProducts = filterPublicProducts<HomeProduct>(((featuredData as any)?.products || []) as HomeProduct[])
  const newProducts = filterPublicProducts<HomeProduct>(((newData as any)?.products || []) as HomeProduct[])
  const stores = (storesData as any)?.stores || (storesData as any)?.entities || (Array.isArray(storesData) ? storesData : [])
  const feedPosts =
    (feedData as any)?.posts ??
    (feedData as any)?.items ??
    [
      ...((feedData as any)?.vip ?? []),
      ...((feedData as any)?.featured ?? []),
      ...((feedData as any)?.discounted ?? []),
      ...((feedData as any)?.normal ?? []),
    ]

  const displayBanners = [
    {
      id: '1', type: 'static' as const,
      title: 'Зуны мега хямдрал эхэллээ',
      subtitle: '70% хүртэл хөнгөлөлт · 10,000+ бараа',
      surface: C.brandDim,
      accent: C.brand,
      tag: 'ШИНЭ СЕЗОН',
    },
    {
      id: '2', type: 'static' as const,
      title: 'Gold гишүүн болж 200,000₮+ хэмнэнэ',
      subtitle: 'Хямдрал, оноо, давуу эрх',
      surface: C.goldDim,
      accent: C.gold,
      tag: 'GOLD',
    },
    {
      id: '3', type: 'static' as const,
      title: 'Борлуулагч болж орлого олоорой',
      subtitle: 'Дэлгүүрээ нээгээд борлуулалтаа эхлүүл',
      surface: C.secondaryDim,
      accent: C.secondary,
      tag: 'БИЗНЕС',
    },
  ]

  useEffect(() => {
    const i = setInterval(() => {
      setBannerIdx((prev) => {
        const next = (prev + 1) % displayBanners.length
        bannerRef.current?.scrollTo({ x: next * (width - 24), animated: true })
        return next
      })
    }, 3500)
    return () => clearInterval(i)
  }, [])

  const handleRefresh = () => { refetch() }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loadingFeatured} onRefresh={handleRefresh} tintColor={C.brand} />
        }
      >
        {/* ═══ HEADER ═══ */}
        <View style={{ paddingHorizontal: UI.screenPad, paddingTop: layout.screenTop, paddingBottom: R.sm }}>
          <AppTopBar
            eyebrow="Нүүр"
            title="eseller.mn"
            showBack={false}
            style={{ marginBottom: 0 }}
            right={(
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm }}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Сагс нээх"
                  onPress={() => router.push('/cart' as any)}
                  style={{ position: 'relative', width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="cart-outline" size={22} color={C.text} />
                  {count() > 0 && (
                    <View style={{
                      position: 'absolute', top: 4, right: 3,
                      backgroundColor: C.primary, borderRadius: 8,
                      minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ color: C.bgCard, fontSize: 9, fontWeight: '700' }}>{count()}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Хайлт нээх"
                  onPress={() => router.push('/search' as any)}
                  style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="search-outline" size={22} color={C.text} />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>

        {/* ═══ HERO BANNER ═══ */}
        <View style={{
          height: 170, marginHorizontal: 12, borderRadius: R.xl,
          overflow: 'hidden', marginBottom: 16,
        }}>
          <ScrollView
            ref={bannerRef} horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setBannerIdx(Math.round(e.nativeEvent.contentOffset.x / (width - 24)))
            }
          >
            {displayBanners.map((b) => (
              <View key={b.id} style={{ width: width - 24, height: 170 }}>
                <View
                  style={{ flex: 1, justifyContent: 'flex-end', padding: 20, backgroundColor: b.surface }}
                >
                  <View style={{
                    backgroundColor: C.bgCard,
                    borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2,
                    alignSelf: 'flex-start', marginBottom: 6,
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    borderWidth: 1,
                    borderColor: b.accent + '28',
                  }}>
                    <Text style={{ color: b.accent, fontSize: 8, fontWeight: '800' }}>
                      {b.tag}
                    </Text>
                  </View>
                  <Text style={{ color: C.text, fontSize: 19, fontWeight: '800' }}>
                    {b.title}
                  </Text>
                  <Text style={{ color: C.textSub, fontSize: 12, marginTop: 4 }}>
                    {b.subtitle}
                  </Text>
                  {b.id === '1' ? (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                      <TouchableOpacity
                        onPress={() => router.push('/store' as any)}
                        style={{
                          flex: 1,
                          minHeight: 34,
                          borderRadius: R.full,
                          backgroundColor: C.primary,
                          paddingHorizontal: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 6,
                        }}
                      >
                        <Ionicons name="bag-outline" size={15} color={C.bgCard} />
                        <Text
                          style={{
                            color: C.bgCard,
                            fontSize: 12,
                            fontWeight: '900',
                            flexShrink: 1,
                          }}
                        >
                          Бараа үзэх
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => router.push('/open-shop' as any)}
                        style={{
                          flex: 1,
                          minHeight: 34,
                          borderRadius: R.full,
                          borderWidth: 1,
                          borderColor: C.border,
                          backgroundColor: C.bgCard,
                          paddingHorizontal: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 6,
                        }}
                      >
                        <Ionicons name="storefront-outline" size={15} color={C.text} />
                        <Text
                          style={{
                            color: C.text,
                            fontSize: 12,
                            fontWeight: '900',
                            flexShrink: 1,
                          }}
                        >
                          Дэлгүүр нээх
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={{ position: 'absolute', bottom: 10, right: 12, flexDirection: 'row', gap: 5 }}>
            {displayBanners.map((_, i) => (
              <View key={i} style={{
                width: i === bannerIdx ? 16 : 6, height: 6, borderRadius: 3,
                backgroundColor: i === bannerIdx ? C.brand : C.border2,
              }} />
            ))}
          </View>
        </View>

        <CategoryGrid />

        <FeaturedStoresSection loadingStores={loadingStores} stores={stores} />

        <HomeStatsStrip />

        {/* ═══ FLASH SALE ═══ */}
        <FlashSaleRow />

        {/* ═══ GOLD CTA ═══ */}
        <GoldCta />

        <SellerBusinessCta />

        <MarketplaceSearchBlock />

        <PlatformFeatureStrip />

        <LatestListingsSection feedPosts={feedPosts} />

        {/* ═══ ОНЦГОЙ БАРАА (PROMOTED - ТӨЛБӨРТЭЙ) ═══ */}
        {featuredProducts.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <SectionHeader
              title="Онцгой бараа"
              onSeeAll={() => router.push('/store' as any)}
            />
            <FlatList
              horizontal showsHorizontalScrollIndicator={false}
              data={featuredProducts}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
              renderItem={({ item }) => {
                const image = firstProductImage(item, '');
                const price = getPublicProductPrice(item);

                return (
                  <TouchableOpacity
                    onPress={() => router.push(`/product/${item.id}`)}
                    style={{
                      width: CARD_W, backgroundColor: C.bgCard, borderRadius: R.lg,
                      overflow: 'hidden', borderWidth: 1,
                      borderColor: C.gold + '40', ...S.card,
                    }}
                  >
                    <PromotedBadge />
                    <Image
                      source={{ uri: image }}
                      style={{ width: CARD_W, height: CARD_W, backgroundColor: C.bgSection }}
                      resizeMode="cover"
                    />
                    <View style={{ padding: 10 }}>
                      <Text style={{ color: C.text, fontSize: 13, fontWeight: '500' }} numberOfLines={2}>
                        {item.name}
                      </Text>
                      {item.entityName && (
                        <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 3 }} numberOfLines={1}>
                          {item.entityName}
                        </Text>
                      )}
                      <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        justifyContent: 'space-between', marginTop: 6,
                      }}>
                        <Text style={{ color: C.brand, fontWeight: '800', fontSize: 14 }}>
                          {price.toLocaleString()}₮
                        </Text>
                        {Number(item.rating || 0) > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <Ionicons name="star" size={10} color={C.gold} />
                            <Text style={{ color: C.textMuted, fontSize: 10 }}>
                              {Number(item.rating || 0).toFixed(1)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {/* ═══ ШИНЭ БАРАА ═══ */}
        <View style={{ marginBottom: 24 }}>
          <SectionHeader
            title="Шинэ бараа"
            onSeeAll={() => router.push('/store' as any)}
          />
          {loadingNew ? (
            <ScrollView horizontal contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}>
              {[1, 2, 3].map(i => (
                <View key={i} style={{
                  width: CARD_W, backgroundColor: C.bgSection,
                  borderRadius: R.lg, height: 230,
                }} />
              ))}
            </ScrollView>
          ) : (
            <FlatList
              horizontal showsHorizontalScrollIndicator={false}
              data={newProducts}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
              renderItem={({ item }) => {
                const image = firstProductImage(item, '');
                const price = getPublicProductPrice(item);

                return (
                  <TouchableOpacity
                    onPress={() => router.push(`/product/${item.id}`)}
                    style={{
                      width: CARD_W, backgroundColor: C.bgCard, borderRadius: R.lg,
                      overflow: 'hidden', borderWidth: 1, borderColor: C.border, ...S.card,
                    }}
                  >
                    <Image
                      source={{ uri: image }}
                      style={{ width: CARD_W, height: CARD_W, backgroundColor: C.bgSection }}
                      resizeMode="cover"
                    />
                    <View style={{ padding: 10 }}>
                      <Text style={{ color: C.text, fontSize: 13, fontWeight: '500' }} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={{ color: C.brand, fontWeight: '800', fontSize: 14, marginTop: 6 }}>
                        {price.toLocaleString()}₮
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={{ color: C.textMuted, padding: 16 }}>Бараа байхгүй байна</Text>
              }
            />
          )}
        </View>

        <HomeAppShortcutSections />

        <HomeLiveFooterLinks />

        <View style={{ height: 76 }} />

      </ScrollView>

    </View>
  )
}


