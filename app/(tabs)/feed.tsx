import React from 'react'
import {
  View, Text, FlatList,
  TouchableOpacity, Image, ScrollView,
  TextInput,
  RefreshControl,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { get }      from '../../src/services/api'
import { useAuth }  from '../../src/store/auth'
import { C, R, F, S, UI } from '../../src/shared/design'
import { shadowStyle } from '../../src/shared/shadow'
import { LIVE_FEED_CATEGORIES } from '../../src/shared/liveCategories'
import {
  filterPublicProducts,
  firstProductImage,
  getPublicProductPrice,
} from '../../src/shared/productQuality'
import { FeedItemSkeleton } from '../../src/shared/ui/Skeleton'
import { AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI'

// Lazy import for STORE variant — DRIVER/SELLER now live in their own groups
const LazyStoreOrders = React.lazy(() => import('../(owner)/orders'))

const FEED_CATS = LIVE_FEED_CATEGORIES

type FeedSort = 'newest' | 'price_asc' | 'price_desc' | 'popular'
type FeedRoutePatch = {
  category?: string
  search?: string
  district?: string
  sort?: FeedSort
}

const DISTRICTS = [
  { key: '', label: 'Бүх дүүрэг' },
  { key: 'СБД', label: 'СБД' },
  { key: 'ХУД', label: 'ХУД' },
  { key: 'БЗД', label: 'БЗД' },
  { key: 'ЧД', label: 'ЧД' },
  { key: 'БГД', label: 'БГД' },
  { key: 'СХД', label: 'СХД' },
  { key: 'НД', label: 'НД' },
  { key: 'БНД', label: 'БНД' },
]

const SORTS: Array<{ key: FeedSort; label: string }> = [
  { key: 'newest', label: 'Шинэ' },
  { key: 'price_asc', label: 'Үнэ ↑' },
  { key: 'price_desc', label: 'Үнэ ↓' },
  { key: 'popular', label: 'Эрэлттэй' },
]

function isFeedSort(value: unknown): value is FeedSort {
  return value === 'newest' || value === 'price_asc' || value === 'price_desc' || value === 'popular'
}

const FEATURED_BUSINESSES = [
  { initials: 'AM', type: 'Авто', name: 'AutoCity Mongolia', meta: 'Toyota, BMW, Hyundai · 48 машин', rating: '4.8', route: '/shops?q=AutoCity' },
  { initials: 'MP', type: 'Барилга', name: 'Монголиан Пропертиз', meta: '15+ төсөл · 3,200+ айл', rating: '4.7', route: '/shops?q=property' },
  { initials: 'RE', type: 'Агент', name: 'Б. Эрдэнэбат', meta: '12 жил туршлага · 800+ хэлцэл', rating: '4.9', route: '/shops?q=agent' },
]

function FeedChipRow<T extends { key: string; label: string }>({
  items,
  value,
  onChange,
}: {
  items: T[]
  value: string
  onChange: (key: string) => void
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8, gap: 6 }}
    >
      {items.map((item) => {
        const active = value === item.key
        return (
          <TouchableOpacity
            key={item.key || 'all'}
            activeOpacity={0.84}
            accessibilityRole="button"
            accessibilityLabel={`${item.label} сонгох`}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.key)}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 8,
              borderRadius: R.full,
              backgroundColor: active ? C.primary : C.bgSection,
              borderWidth: 1,
              borderColor: active ? C.primary : C.border,
            }}
          >
            <Text style={{
              color: active ? C.bgCard : C.textSub,
              fontSize: 12,
              fontWeight: active ? '800' : '600',
            }}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

function getFeedBadge(item: any) {
  if (item?.vip || item?.isVip || item?.tier === 'VIP') {
    return { label: 'ВИП', bg: C.gold, color: C.text }
  }
  if (item?.discountPercent || item?.salePrice || item?.discounted) {
    return {
      label: item.discountPercent ? `-${item.discountPercent}%` : 'Хямдрал',
      bg: C.brand,
      color: C.bgCard,
    }
  }
  if (item?.featured) {
    return { label: 'Онцлох', bg: C.gold, color: C.text }
  }
  return null
}

export default function FeedScreen() {
  const { role } = useAuth()

  if (role === 'STORE') {
    return (
      <React.Suspense fallback={<View style={{ flex: 1, backgroundColor: C.bg }} />}>
        <LazyStoreOrders />
      </React.Suspense>
    )
  }

  // BUYER / default — DRIVER/SELLER now have their own groups
  return <BuyerFeedScreen />
}

function BuyerFeedScreen() {
  const params = useLocalSearchParams<{ category?: string; q?: string; district?: string; sort?: string }>()
  const layout = useAppLayoutMetrics()
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [district, setDistrict] = useState('')
  const [sort, setSort] = useState<FeedSort>('newest')

  useEffect(() => {
    setCategory(typeof params.category === 'string' ? params.category : '')
    setSearch(typeof params.q === 'string' ? params.q : '')
    setDistrict(typeof params.district === 'string' ? params.district : '')
    setSort(isFeedSort(params.sort) ? params.sort : 'newest')
  }, [params.category, params.q, params.district, params.sort])

  const replaceFeedRoute = (patch: FeedRoutePatch) => {
    const nextCategory = patch.category ?? category
    const nextSearch = patch.search ?? search
    const nextDistrict = patch.district ?? district
    const nextSort = patch.sort ?? sort
    const routeParams: Record<string, string> = {}

    if (nextCategory) routeParams.category = nextCategory
    if (nextSearch.trim()) routeParams.q = nextSearch.trim()
    if (nextDistrict) routeParams.district = nextDistrict
    if (nextSort !== 'newest') routeParams.sort = nextSort

    router.replace(
      Object.keys(routeParams).length
        ? ({ pathname: '/feed' as any, params: routeParams } as any)
        : ('/feed' as any),
    )
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    replaceFeedRoute({ search: value })
  }

  const handleSearchClear = () => {
    setSearch('')
    replaceFeedRoute({ search: '' })
  }

  const handleDistrictChange = (nextDistrict: string) => {
    setDistrict(nextDistrict)
    replaceFeedRoute({ district: nextDistrict })
  }

  const handleSortChange = (nextSort: string) => {
    if (!isFeedSort(nextSort)) return
    setSort(nextSort)
    replaceFeedRoute({ sort: nextSort })
  }

  const handleCategoryChange = (nextCategory: string) => {
    setCategory(nextCategory)
    replaceFeedRoute({ category: nextCategory })
  }

  const { data, isLoading, isError, error, isRefetching, refetch } = useQuery({
    queryKey: ['feed', category, search, district, sort],
    queryFn:  () =>
      get('/feed', { category, q: search, district, sort, limit: 20 }),
    retry: false,
  })

  const rawPosts = Array.isArray(data)
    ? data
    : (data as any)?.posts ??
      (data as any)?.items ??
      [
        ...((data as any)?.vip ?? []),
        ...((data as any)?.featured ?? []),
        ...((data as any)?.discounted ?? []),
        ...((data as any)?.normal ?? []),
      ]
  const posts = filterPublicProducts<any>(rawPosts)
  const totalCount = posts.length
  const vipCount = posts.filter((p: any) => p.vip || p.isVip || p.tier === 'VIP').length

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* Header */}
      <View style={{
        paddingTop: layout.screenTop, paddingHorizontal: R.lg, paddingBottom: R.md,
      }}>
        <AppTopBar eyebrow="eSeller" title="Зарын булан" showBack={false} />
        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...F.h2, color: C.text }}>
              Зарын булан
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 3, lineHeight: 18 }}>
              Бараа, үйлчилгээ, орон сууц, авто — бүгдийг нэг дор
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Зар оруулах"
            onPress={() => router.push('/feed/create' as any)}
            style={{
              backgroundColor: C.brand,
              borderRadius: R.lg,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              ...shadowStyle({ color: C.brand, y: 3, blur: 12, opacity: 0.35, elevation: 8 }),
            }}
          >
            <Ionicons name="add" size={17} color={C.bgCard} />
            <Text style={{ color: C.bgCard, fontSize: 12, fontWeight: '900' }}>
              Зар оруулах
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: C.bgSection, borderRadius: R.xl,
          paddingHorizontal: 14, borderWidth: 1, borderColor: C.border,
        }}>
          <Ionicons name="search" size={18} color={C.textMuted} />
          <TextInput
            accessibilityLabel="Зар хайх"
            value={search}
            onChangeText={handleSearchChange}
            placeholder="Зар хайх..."
            placeholderTextColor={C.textMuted}
            style={{ flex: 1, color: C.text, padding: 12, fontSize: 14 }}
          />
          {search.length > 0 && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Хайлтыг цэвэрлэх"
              hitSlop={8}
              onPress={handleSearchClear}
            >
              <Ionicons name="close-circle" size={18} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 10,
          gap: 8,
        }}>
          <View style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            backgroundColor: C.bgCard,
            borderRadius: R.lg,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: C.border,
          }}>
            <Ionicons name="navigate-outline" size={15} color={C.textMuted} />
            <Text style={{ color: C.textSub, fontSize: 12, fontWeight: '700' }}>
              {district || 'Байршил тодорхойлж байна...'}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Байршлын шүүлтүүр цэвэрлэх"
            onPress={() => handleDistrictChange('')}
            style={{
              backgroundColor: C.bgSection,
              borderRadius: R.full,
              paddingHorizontal: 12,
              paddingVertical: 9,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Text style={{ color: C.primary, fontSize: 12, fontWeight: '800' }}>
              Өөрчлөх
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Featured businesses */}
      <View style={{ marginBottom: 8 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          marginBottom: 10,
        }}>
          <Text style={{ color: C.text, fontSize: 16, fontWeight: '900' }}>
            Онцлох бизнесүүд
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Бүх дэлгүүрийг харах"
            onPress={() => router.push('/shops' as any)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
          >
            <Text style={{ color: C.primary, fontSize: 12, fontWeight: '800' }}>
              Бүгдийг харах
            </Text>
            <Ionicons name="arrow-forward" size={13} color={C.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
        >
          {FEATURED_BUSINESSES.map((business) => (
            <TouchableOpacity
              key={business.name}
              accessibilityRole="button"
              accessibilityLabel={`${business.name} бизнесийг нээх`}
              activeOpacity={0.84}
              onPress={() => router.push(business.route as any)}
              style={{
                width: 228,
                backgroundColor: C.bgCard,
                borderRadius: R.lg,
                padding: 12,
                borderWidth: 1,
                borderColor: C.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <View style={{
                width: 44,
                height: 44,
                borderRadius: R.md,
                backgroundColor: C.primary + '18',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ color: C.primary, fontSize: 14, fontWeight: '900' }}>
                  {business.initials}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '800' }}>
                    {business.type}
                  </Text>
                  <Ionicons name="checkmark-circle" size={11} color={C.secondary} />
                </View>
                <Text numberOfLines={1} style={{ color: C.text, fontSize: 13, fontWeight: '900', marginTop: 2 }}>
                  {business.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Text numberOfLines={1} style={{ flex: 1, color: C.textMuted, fontSize: 10 }}>
                    {business.meta}
                  </Text>
                  <Ionicons name="star" size={10} color={C.gold} />
                  <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '700' }}>
                    {business.rating}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FeedChipRow items={DISTRICTS} value={district} onChange={handleDistrictChange} />
      <FeedChipRow items={SORTS} value={sort} onChange={handleSortChange} />

      {/* Categories */}
      <View>
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 12, paddingBottom: 10, gap: 6,
          }}
        >
          {FEED_CATS.map(c => {
            const active = category === c.slug
            return (
              <TouchableOpacity
                key={c.slug || 'all'}
                activeOpacity={0.84}
                accessibilityRole="button"
                accessibilityLabel={`${c.name} ангилал сонгох`}
                accessibilityState={{ selected: active }}
                onPress={() => handleCategoryChange(c.slug)}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 14, paddingVertical: 9,
                  borderRadius: R.full, gap: 6,
                  backgroundColor: active ? C.primary : C.bgSection,
                  borderWidth: 1,
                  borderColor: active ? C.primary : C.border,
                }}
              >
                <Ionicons
                  name={c.icon as any}
                  size={14}
                  color={active ? C.bgCard : C.textSub}
                />
                <Text style={{
                  color: active ? C.bgCard : C.textSub,
                  fontSize: 13, fontWeight: active ? '700' : '500',
                }}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Feed list */}
      {isLoading ? (
        <View style={{ padding: 10 }}>
          {[1, 2, 3, 4].map(i => (
            <FeedItemSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p: any, index) => String(p.id || p._id || index)}
          contentContainerStyle={{ padding: 10, paddingBottom: layout.screenBottom + 24 }}
          ListHeaderComponent={
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              paddingHorizontal: 2,
            }}>
              <Text style={{ color: C.text, fontSize: 14, fontWeight: '900' }}>
                {totalCount} зар олдлоо · {vipCount} ВИП
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Зар оруулах"
                onPress={() => router.push('/feed/create' as any)}
              >
                <Text style={{ color: C.primary, fontSize: 12, fontWeight: '800' }}>
                  Зар оруулах
                </Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={C.brand}
            />
          }
          renderItem={({ item }: any) => {
            const itemId = item.id || item._id
            const badge = getFeedBadge(item)
            const price = getPublicProductPrice(item)
            const image = firstProductImage(item)
            const originalPrice = item.salePrice ? item.price : item.originalPrice
            return (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${item.title || item.name || 'Зар'} зарын дэлгэрэнгүй`}
                activeOpacity={0.86}
                disabled={!itemId}
                accessibilityState={{ disabled: !itemId }}
                onPress={() => router.push(`/feed/${itemId}` as any)}
                style={{
                  flexDirection: 'row', backgroundColor: C.bgCard,
                  borderRadius: R.lg, marginBottom: 10, overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: badge ? `${badge.bg}55` : C.border,
                }}
              >
              {/* Image */}
              <View style={{ position: 'relative' }}>
                <Image
                  source={{ uri: image }}
                  style={{
                    width: 110, height: 110, backgroundColor: C.bgSection,
                  }}
                  resizeMode="cover"
                />
                {badge && (
                  <View style={{
                    position: 'absolute', top: 4, left: 4,
                    backgroundColor: badge.bg, borderRadius: R.xs,
                    paddingHorizontal: 4, paddingVertical: 1,
                    flexDirection: 'row', alignItems: 'center', gap: 2,
                  }}>
                    <Ionicons name="flash" size={8} color={badge.color} />
                    <Text style={{ color: badge.color, fontSize: 8, fontWeight: '900' }}>
                      {badge.label}
                    </Text>
                  </View>
                )}
                {item.imageCount > 1 && (
                  <View style={{
                    position: 'absolute', bottom: 4, right: 4,
                    backgroundColor: `${C.text}B0`, borderRadius: R.sm,
                    paddingHorizontal: 5, paddingVertical: 2,
                    flexDirection: 'row', alignItems: 'center', gap: 2,
                  }}>
                    <Ionicons name="images" size={10} color={C.bgCard} />
                    <Text style={{ color: C.bgCard, fontSize: 9, fontWeight: '600' }}>
                      {item.imageCount}
                    </Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={{ flex: 1, padding: 12, justifyContent: 'center' }}>
                <Text
                  style={{ color: C.text, fontWeight: '600', fontSize: 14 }}
                  numberOfLines={2}
                >
                  {item.title || item.name}
                </Text>
                <Text style={{
                  color: C.brand, fontWeight: '800', fontSize: 16, marginTop: 5,
                }}>
                  {price.toLocaleString() + '₮'}
                </Text>
                {originalPrice && originalPrice > price && (
                  <Text style={{
                    color: C.textMuted,
                    fontSize: 11,
                    textDecorationLine: 'line-through',
                    marginTop: 1,
                  }}>
                    {originalPrice.toLocaleString()}₮
                  </Text>
                )}
                <View style={{
                  flexDirection: 'row', gap: 10, marginTop: 5, alignItems: 'center',
                }}>
                  {item.district && (
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 3,
                    }}>
                      <Ionicons name="location-outline" size={11} color={C.textMuted} />
                      <Text style={{ color: C.textMuted, fontSize: 11 }}>
                        {item.district}
                      </Text>
                    </View>
                  )}
                  {item.createdAt && (
                    <Text style={{ color: C.textMuted, fontSize: 11 }}>
                      {timeAgo(item.createdAt)}
                    </Text>
                  )}
                </View>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 8,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="eye-outline" size={11} color={C.textMuted} />
                    <Text style={{ color: C.textMuted, fontSize: 11 }}>
                      {item.views ?? item.viewCount ?? 0}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={{ color: C.primary, fontSize: 12, fontWeight: '800' }}>
                      Дэлгэрэнгүй
                    </Text>
                    <Ionicons name="arrow-forward" size={12} color={C.primary} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Ionicons name={isError ? 'cloud-offline-outline' : 'megaphone-outline'} size={64} color={C.border} />
              <Text style={{ color: C.textMuted, marginTop: 12, fontSize: 16, fontWeight: '800' }}>
                {isError ? 'Зарууд ачаалж чадсангүй' : 'Зар байхгүй байна'}
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                {isError ? ((error as Error)?.message || 'Сүлжээ эсвэл серверийн алдаа гарлаа.') : 'Эхний зараа нэмээрэй!'}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={isError ? 'Заруудыг дахин ачаалах' : 'Шинэ зар нэмэх'}
                onPress={() => {
                  if (isError) {
                    refetch()
                    return
                  }
                  router.push('/feed/create' as any)
                }}
                style={{
                  backgroundColor: isError ? C.primary : C.brand, borderRadius: R.lg,
                  paddingHorizontal: 24, paddingVertical: 12, marginTop: 20,
                }}
              >
                <Text style={{ color: C.bgCard, fontWeight: '700' }}>
                  {isError ? 'Дахин оролдох' : 'Зар нэмэх'}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Floating + button */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Шинэ зар нэмэх"
        activeOpacity={0.84}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          router.push('/feed/create' as any)
        }}
        style={{
          position: 'absolute', bottom: layout.floatingBottom, right: R.lg,
          width: 56, height: 56, borderRadius: R.full,
          backgroundColor: C.brand,
          alignItems: 'center', justifyContent: 'center',
          ...S.elevated,
          ...shadowStyle({ color: C.brand, y: 4, blur: 16, opacity: 0.5, elevation: 12 }),
        }}
      >
        <Ionicons name="add" size={28} color={C.bgCard} />
      </TouchableOpacity>
    </View>
  )
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  const diff = now - d
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Саяхан'
  if (mins < 60) return `${mins} мин`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} цаг`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} өдөр`
  return new Date(dateStr).toLocaleDateString('mn-MN')
}
