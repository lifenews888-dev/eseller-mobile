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
import { AppButton, AppCard, AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

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

  useEffect(() => {
    setSearch(typeof params.q === 'string' ? params.q : '');
    setFilter(isShopFilter(params.type) ? params.type : 'all');
    setSort(isShopSort(params.sort) ? params.sort : 'rating');
  }, [params.q, params.type, params.sort]);

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

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['shops', search, filter, sort],
    queryFn: async ({ pageParam = 1 }) =>
      unwrap<any>(await get('/stores', {
        page: pageParam,
        limit: 20,
        q: search,
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

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={shops}
        keyExtractor={(item: any, index) => item.id ?? item._id ?? item.slug ?? String(index)}
        contentContainerStyle={{
          padding: UI.screenPad,
          paddingTop: layout.screenTop,
          paddingBottom: layout.screenBottom,
        }}
        onEndReached={() => {
          if (hasNextPage) fetchNextPage();
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

            <AppButton
              label="Дэлгүүр нээх"
              icon="add"
              onPress={() => router.push('/open-shop' as any)}
              style={{ marginBottom: R.md }}
            />

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

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: R.sm }}>
              <Text style={{ ...F.small, color: C.text, fontWeight: '900' }}>{visibleTotal} дэлгүүр олдлоо</Text>
              {isLoading ? <Text style={{ ...F.tiny, color: C.textMuted }}>Ачааллаж байна...</Text> : null}
            </View>
          </>
        }
        renderItem={({ item }) => <ShopCard item={item} />}
        ListEmptyComponent={
          <AppCard style={{ alignItems: 'center', gap: R.sm, marginTop: R.lg }}>
            {isLoading ? (
              <>
                <ActivityIndicator color={C.brand} />
                <Text style={{ ...F.small, color: C.textMuted }}>Дэлгүүрүүд ачааллаж байна...</Text>
              </>
            ) : (
              <>
                <Ionicons name="storefront-outline" size={44} color={C.textMuted} />
                <Text style={{ ...F.body, color: C.textSub }}>Дэлгүүр олдсонгүй</Text>
              </>
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
  const accent = service ? C.secondary : C.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      disabled={!slug}
      accessibilityRole="button"
      accessibilityLabel={`${item.name ?? 'Дэлгүүр'} дэлгүүр нээх`}
      accessibilityState={{ disabled: !slug }}
      onPress={() => {
        if (slug) router.push(`/${slug}` as any);
      }}
    >
      <AppCard style={{ flexDirection: 'row', alignItems: 'center', gap: R.md, padding: R.md, marginBottom: R.sm }}>
        <View
          style={{
            width: 52,
            height: 52,
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
            {item.name}
          </Text>
          <Text numberOfLines={1} style={{ ...F.tiny, color: C.textMuted, marginTop: 3 }}>
            ★ {rating ? rating.toFixed(1) : '-'} - {reviews} сэтгэгдэл - {productCount} бараа
          </Text>
          <Text numberOfLines={1} style={{ ...F.small, color: C.primary, fontWeight: '800', marginTop: R.xs }}>
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
  const name = String(item.name ?? item.title ?? 'Д');
  return name.trim().slice(0, 2).toLocaleUpperCase('mn-MN');
}
