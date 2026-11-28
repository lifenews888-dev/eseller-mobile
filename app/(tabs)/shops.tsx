import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { get } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import { encodeRouteParam } from '../../src/shared/routeParams';
import { getShopName } from '../../src/shared/shopIdentity';
import { AppButton, AppCard, AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';
import { EmptyState } from '../../src/shared/ui/EmptyState';

type ShopFilter = 'all' | 'store' | 'service';
type ShopSort = 'rating' | 'reviews' | 'newest';
type ShopsRoutePatch = {
  search?: string;
  filter?: ShopFilter;
  sort?: ShopSort;
};

const FILTERS: Array<{ key: ShopFilter; label: string }> = [
  { key: 'all', label: 'Бүгд' },
  { key: 'store', label: 'Дэлгүүр' },
  { key: 'service', label: 'Үйлчилгээ' },
];

const SORTS: Array<{ key: ShopSort; label: string }> = [
  { key: 'rating', label: 'Үнэлгээгээр' },
  { key: 'reviews', label: 'Сэтгэгдлээр' },
  { key: 'newest', label: 'Шинээр' },
];

const SHOP_TRUST_BADGES = [
  { icon: 'checkmark-circle' as const, label: 'Баталгаат', color: C.secondary },
  { icon: 'star' as const, label: 'Үнэлгээтэй', color: C.gold },
  { icon: 'chatbubble-ellipses-outline' as const, label: 'Сэтгэгдэлтэй', color: C.primary },
];

function isShopFilter(value: unknown): value is ShopFilter {
  return value === 'all' || value === 'store' || value === 'service';
}

function isShopSort(value: unknown): value is ShopSort {
  return value === 'rating' || value === 'reviews' || value === 'newest';
}

export default function ShopsScreen() {
  const params = useLocalSearchParams<{ q?: string; type?: ShopFilter; sort?: ShopSort }>();
  const layout = useAppLayoutMetrics();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ShopFilter>('all');
  const [sort, setSort] = useState<ShopSort>('rating');
  const appliedSearch = typeof params.q === 'string' ? params.q : '';

  useEffect(() => {
    setSearch(appliedSearch);
    setFilter(isShopFilter(params.type) ? params.type : 'all');
    setSort(isShopSort(params.sort) ? params.sort : 'rating');
  }, [appliedSearch, params.type, params.sort]);

  const replaceShopsRoute = (patch: ShopsRoutePatch) => {
    const nextSearch = patch.search ?? search;
    const nextFilter = patch.filter ?? filter;
    const nextSort = patch.sort ?? sort;
    const routeParams: Record<string, string> = {};

    if (nextSearch.trim()) routeParams.q = nextSearch.trim();
    if (nextFilter !== 'all') routeParams.type = nextFilter;
    if (nextSort !== 'rating') routeParams.sort = nextSort;

    router.replace(
      Object.keys(routeParams).length
        ? ({ pathname: '/shops' as any, params: routeParams } as any)
        : ('/shops' as any),
    );
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleSearchClear = () => {
    setSearch('');
    replaceShopsRoute({ search: '' });
  };

  const submitSearch = () => {
    replaceShopsRoute({ search });
  };

  const handleFilterPress = (nextFilter: ShopFilter) => {
    setFilter(nextFilter);
    replaceShopsRoute({ filter: nextFilter });
  };

  const handleSortPress = (nextSort: ShopSort) => {
    setSort(nextSort);
    replaceShopsRoute({ sort: nextSort });
  };

  const clearShopsFilters = () => {
    setSearch('');
    setFilter('all');
    setSort('rating');
    router.replace('/shops' as any);
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['shops', appliedSearch, filter, sort],
    queryFn: async ({ pageParam = 1 }) =>
      unwrap<any>(await get('/stores', {
        page: pageParam,
        limit: 20,
        q: appliedSearch,
        type: filter === 'all' ? '' : filter,
        sort,
      })),
    getNextPageParam: (last: any) => {
      const page = Number(last?.page ?? 1);
      const limit = Number(last?.limit ?? 20);
      const total = Number(last?.total ?? 0);
      return page * limit < total ? page + 1 : undefined;
    },
    initialPageParam: 1,
    retry: false,
  });

  const rawShops: any[] = data?.pages.flatMap((page: any) => page?.stores ?? page?.items ?? page?.entities ?? []) ?? [];
  const totalFromApi = Number(data?.pages?.[0]?.total ?? rawShops.length);
  const storeCount = rawShops.filter((shop) => !isServiceShop(shop)).length;
  const serviceCount = rawShops.filter(isServiceShop).length;

  const shops = useMemo(() => {
    const scoped = rawShops.filter((shop) => {
      if (filter === 'service') return isServiceShop(shop);
      if (filter === 'store') return !isServiceShop(shop);
      return true;
    });

    return scoped.slice().sort((a, b) => {
      if (sort === 'reviews') {
        return Number(b.reviewCount ?? b.reviewsCount ?? 0) - Number(a.reviewCount ?? a.reviewsCount ?? 0);
      }
      if (sort === 'newest') {
        return new Date(b.createdAt ?? b.updatedAt ?? 0).getTime() - new Date(a.createdAt ?? a.updatedAt ?? 0).getTime();
      }
      return Number(b.rating ?? 0) - Number(a.rating ?? 0);
    });
  }, [rawShops, filter, sort]);

  const visibleTotal = filter === 'all' ? totalFromApi : shops.length;
  const hasActiveShopsQuery = Boolean(search.trim() || appliedSearch || filter !== 'all' || sort !== 'rating');
  const hasPendingSearch = search.trim() !== appliedSearch.trim();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={shops}
        keyExtractor={(item: any, index) => item.id ?? item._id ?? item.slug ?? item.storefrontSlug ?? String(index)}
        contentContainerStyle={{
          padding: UI.screenPad,
          paddingTop: layout.screenTop,
          paddingBottom: layout.screenBottom,
        }}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage && !isLoading && !isError) fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.brand} />}
        ListHeaderComponent={
          <>
            <AppTopBar eyebrow="eSeller" title="Дэлгүүрүүд" showBack={false} />
            <AppHeader
              title="Дэлгүүрүүд"
              subtitle="Баталгаат дэлгүүр, үйлчилгээ үзүүлэгчдийг нэг дороос сонгоорой."
              icon="storefront-outline"
              accent={C.brand}
              style={{ marginBottom: R.md }}
            />

            <AppCard elevated style={{ gap: R.md, marginBottom: R.md, borderColor: C.brand + '24' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.md }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: UI.controlRadius,
                    backgroundColor: C.brandDim,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="storefront" size={23} color={C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...F.h4, color: C.text }}>Бизнесээ eseller.mn дээр нээгээрэй</Text>
                  <Text style={{ ...F.small, color: C.textSub, marginTop: 2 }}>
                    Бараа, үйлчилгээ, захиалгаа нэг системээр удирдах боломжтой.
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: R.sm }}>
                {SHOP_TRUST_BADGES.map((badge) => (
                  <View
                    key={badge.label}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: R.xs,
                      backgroundColor: badge.color + '14',
                      borderRadius: R.full,
                      paddingHorizontal: R.sm,
                      paddingVertical: 5,
                    }}
                  >
                    <Ionicons name={badge.icon} size={13} color={badge.color} />
                    <Text style={{ ...F.tiny, color: badge.color, fontWeight: '900' }}>{badge.label}</Text>
                  </View>
                ))}
              </View>
              <AppButton
                label="Дэлгүүр нээх"
                icon="add"
                onPress={() => router.push('/open-shop' as any)}
              />
            </AppCard>

            <AppCard style={{ padding: R.md, marginBottom: R.md }}>
              <View
                style={{
                  minHeight: 46,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: C.bgSection,
                  borderRadius: UI.controlRadius,
                  paddingHorizontal: R.md,
                  gap: R.xs,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <Ionicons name="search-outline" size={18} color={C.textMuted} />
                <TextInput
                  value={search}
                  onChangeText={handleSearchChange}
                  placeholder="Дэлгүүр, үйлчилгээ хайх..."
                  placeholderTextColor={C.textMuted}
                  returnKeyType="search"
                  onSubmitEditing={submitSearch}
                  accessibilityLabel="Дэлгүүр хайх"
                  accessibilityHint="Дэлгүүр эсвэл үйлчилгээний нэрээр хайна уу"
                  style={{ flex: 1, fontSize: 14, color: C.text, paddingVertical: R.sm }}
                />
                {search.length > 0 ? (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={handleSearchClear}
                    accessibilityRole="button"
                    accessibilityLabel="Дэлгүүрийн хайлт цэвэрлэх"
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                ) : null}
                {hasPendingSearch ? (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={submitSearch}
                    accessibilityRole="button"
                    accessibilityLabel="Дэлгүүр хайх"
                    hitSlop={8}
                    style={{ marginLeft: 4 }}
                  >
                    <Ionicons name="arrow-forward-circle" size={22} color={C.primary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </AppCard>

            <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.md }}>
              {FILTERS.map((item) => {
                const active = filter === item.key;
                const count = item.key === 'all' ? totalFromApi : item.key === 'store' ? storeCount : serviceCount;
                return (
                  <TouchableOpacity
                    key={item.key}
                    activeOpacity={0.84}
                    onPress={() => handleFilterPress(item.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.label} дэлгүүрийн төрөл сонгох`}
                    accessibilityState={{ selected: active }}
                    style={{
                      flex: 1,
                      backgroundColor: active ? C.primary : C.bgSection,
                      borderRadius: UI.controlRadius,
                      paddingVertical: R.sm,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: active ? C.primary : C.border,
                    }}
                  >
                    <Text style={{ ...F.small, color: active ? C.bgCard : C.textSub, fontWeight: '900' }}>
                      {item.label}
                    </Text>
                    <Text style={{ ...F.tiny, color: active ? C.bgCard : C.textMuted, marginTop: 2 }}>
                      {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.md }}>
              {SORTS.map((item) => {
                const active = sort === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    activeOpacity={0.84}
                    onPress={() => handleSortPress(item.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.label} эрэмбэлэх`}
                    accessibilityState={{ selected: active }}
                    style={{
                      flex: 1,
                      borderRadius: R.full,
                      paddingVertical: R.sm,
                      alignItems: 'center',
                      backgroundColor: active ? C.brandDim : C.bgSection,
                      borderWidth: 1,
                      borderColor: active ? C.brand : C.border,
                    }}
                  >
                    <Text style={{ ...F.tiny, color: active ? C.brand : C.textSub, fontWeight: '900' }}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: R.sm, gap: R.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...F.h4, color: C.text }}>{visibleTotal} дэлгүүр олдлоо</Text>
                <Text style={{ ...F.tiny, color: C.textMuted, marginTop: 2 }}>
                  {filter === 'all' ? 'Бүх баталгаат бизнес' : filter === 'store' ? 'Бараатай дэлгүүрүүд' : 'Үйлчилгээ үзүүлэгчид'}
                </Text>
              </View>
              {hasActiveShopsQuery ? (
                <TouchableOpacity
                  activeOpacity={0.84}
                  accessibilityRole="button"
                  accessibilityLabel="Дэлгүүрийн шүүлтүүр цэвэрлэх"
                  onPress={clearShopsFilters}
                >
                  <Text style={{ ...F.tiny, color: C.primary, fontWeight: '900' }}>Цэвэрлэх</Text>
                </TouchableOpacity>
              ) : isLoading ? <Text style={{ ...F.tiny, color: C.textMuted }}>Ачааллаж байна...</Text> : null}
            </View>
          </>
        }
        renderItem={({ item }) => <ShopCard item={item} />}
        ListEmptyComponent={
          <AppCard style={{ marginTop: R.lg }}>
            {isLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: R.xl, gap: R.sm }}>
                <ActivityIndicator color={C.brand} />
                <Text style={{ ...F.small, color: C.textMuted }}>Дэлгүүрүүд ачаалж байна...</Text>
              </View>
            ) : (
              <EmptyState
                icon={isError ? 'cloud-offline-outline' : 'storefront-outline'}
                title={isError ? 'Дэлгүүрүүд ачаалж чадсангүй' : 'Дэлгүүр олдсонгүй'}
                subtitle={
                  isError
                    ? ((error as Error)?.message || 'Сүлжээ эсвэл серверийн алдаа гарлаа.')
                    : 'Хайлтын үгээ өөрчилж эсвэл шүүлтүүрээ цэвэрлээд дахин үзнэ үү.'
                }
                cta={isError ? {
                  label: 'Дахин оролдох',
                  icon: 'refresh-outline',
                  accent: C.brand,
                  onPress: () => refetch(),
                } : hasActiveShopsQuery ? {
                  label: 'Шүүлтүүр цэвэрлэх',
                  icon: 'refresh-outline',
                  accent: C.brand,
                  onPress: clearShopsFilters,
                } : undefined}
                compact
              />
            )}
          </AppCard>
        }
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={C.brand} style={{ margin: R.md }} /> : null}
      />
    </View>
  );
}

function ShopCard({ item }: { item: any }) {
  const service = isServiceShop(item);
  const rating = Number(item.rating ?? 0);
  const reviews = Number(item.reviewCount ?? item.reviewsCount ?? 0);
  const productCount = Number(item.productCount ?? item.productsCount ?? item.products?.length ?? 0);
  const slug = item.slug ?? item.storefrontSlug ?? item.id ?? item._id;
  const routeSlug = encodeRouteParam(slug);
  const name = getShopName(item);
  const accent = service ? C.secondary : C.primary;
  const description = item.description || item.tagline || item.address || (service ? 'Үйлчилгээ үзүүлэгч' : 'Онлайн дэлгүүр');

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      disabled={!slug}
      accessibilityRole="button"
      accessibilityLabel={`${name} дэлгүүр нээх`}
      accessibilityState={{ disabled: !slug }}
      onPress={() => {
        if (routeSlug) router.push(`/storefront/${routeSlug}` as any);
      }}
    >
      <AppCard style={{ flexDirection: 'row', alignItems: 'center', gap: R.md, padding: R.md, marginBottom: R.sm }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: UI.controlRadius,
            backgroundColor: accent + '18',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Text style={{ ...F.h4, color: accent }}>{getLogoLabel(item)}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.xs, marginBottom: 2 }}>
            <Text style={{ ...F.tiny, color: accent, fontWeight: '900' }}>
              {service ? 'Үйлчилгээ' : 'Дэлгүүр'}
            </Text>
            {item.verified || item.isVerified ? <Ionicons name="checkmark-circle" size={12} color={C.secondary} /> : null}
          </View>
          <Text numberOfLines={1} style={{ ...F.body, color: C.text, fontWeight: '900' }}>
            {name}
          </Text>
          <Text numberOfLines={1} style={{ ...F.tiny, color: C.textSub, marginTop: 2 }}>
            {description}
          </Text>
          <Text numberOfLines={1} style={{ ...F.tiny, color: C.textMuted, marginTop: 3 }}>
            {rating ? `★ ${rating.toFixed(1)} · ${reviews} сэтгэгдэл · ` : 'Шинэ · '}{productCount} бараа
          </Text>
          <Text numberOfLines={1} style={{ ...F.small, color: accent, fontWeight: '800', marginTop: R.xs }}>
            Дэлгүүрээр зочлох
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
      </AppCard>
    </TouchableOpacity>
  );
}

function unwrap<T = any>(res: any): T {
  return (res?.data ?? res) as T;
}

function isServiceShop(item: any) {
  const raw = String(item.type ?? item.kind ?? item.category ?? '').toLowerCase();
  return raw.includes('service') || raw.includes('үйлчилгээ');
}

function getLogoLabel(item: any) {
  const name = getShopName(item);
  return name.trim().slice(0, 2).toLocaleUpperCase('mn-MN');
}
