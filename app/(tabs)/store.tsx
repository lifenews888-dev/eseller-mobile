import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { del, get } from '../../src/services/api';
import { useAuth } from '../../src/store/auth';
import { encodeApiPathSegment } from '../../src/shared/apiPath';
import { C, F, R, UI } from '../../src/shared/design';
import { LIVE_STORE_CATEGORIES, resolveLiveCategoryKey } from '../../src/shared/liveCategories';
import {
  filterPublicProducts,
  firstProductImage,
  getProductName,
  getPublicProductPrice,
} from '../../src/shared/productQuality';
import { encodeRouteParam } from '../../src/shared/routeParams';
import { getShopName } from '../../src/shared/shopIdentity';
import { ProductCardSkeleton } from '../../src/shared/ui/Skeleton';
import { FilterSheet } from '../../src/shared/ui/FilterSheet';
import { EmptyState } from '../../src/shared/ui/EmptyState';
import { AppButton, AppCard, AppHeader, AppMetricCard, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

const STORE_BENEFITS = [
  { icon: 'car-outline' as const, label: 'Үнэгүй хүргэлт', sub: '50,000₮-өөс дээш', color: C.success },
  { icon: 'shield-checkmark-outline' as const, label: 'Аюулгүй төлбөр', sub: 'QPay, карт, банк', color: C.primary },
  { icon: 'flash-outline' as const, label: 'Хурдан хүргэлт', sub: '2-4 цагийн дотор', color: C.seller },
  { icon: 'sparkles-outline' as const, label: 'Шинэ ирэлт', sub: 'Долоо хоног бүр', color: C.seller },
];

const STORE_PROMOS = [
  'Шинэ хэрэглэгчид 10,000₮ купон',
  '50,000₮-өөс дээш үнэгүй хүргэлт',
  'Gold гишүүнд 2x оноо',
  'Долоо хоног бүр шинэ ирэлт',
];

const STORE_TRUST = ['QPay төлбөр', 'Олон дэлгүүр', 'Үнэгүй зар'];
const STORE_MARKET_ACCENT = C.brand;
const STORE_MARKET_ACCENT_DIM = C.brandDim;

type StoreRoutePatch = {
  search?: string;
  category?: string;
  saleOnly?: boolean;
};

export default function StoreScreen() {
  const { role } = useAuth();

  if (role === 'STORE') return <StoreOwnerProductsScreen />;
  return <BuyerStoreScreen />;
}

function BuyerStoreScreen() {
  const params = useLocalSearchParams<{ category?: string; q?: string; sale?: string }>();
  const layout = useAppLayoutMetrics();
  const searchInputRef = useRef<TextInput>(null);
  const [search, setSearch] = useState('');
  const [searchFocusKey, setSearchFocusKey] = useState(0);
  const [category, setCategory] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<any>({});
  const saleOnly = params.sale === 'true';
  const appliedSearch = typeof params.q === 'string' ? params.q : '';

  useEffect(() => {
    setCategory(typeof params.category === 'string' ? resolveLiveCategoryKey(params.category) : '');
    setSearch(appliedSearch);
  }, [params.category, appliedSearch]);

  const activeCategory = LIVE_STORE_CATEGORIES.find((item) => item.key === category);
  const apiCategory = activeCategory?.apiCategory ?? category;
  const visibleStoreCategories = useMemo(() => {
    if (!category || !activeCategory) return LIVE_STORE_CATEGORIES;

    const allCategory = LIVE_STORE_CATEGORIES[0];
    const remainingCategories = LIVE_STORE_CATEGORIES.filter(
      (item) => item.key && item.key !== activeCategory.key,
    );

    return [allCategory, activeCategory, ...remainingCategories];
  }, [activeCategory, category]);

  const { data, isLoading, isError, error, isRefetching, refetch } = useQuery({
    queryKey: ['store-products', appliedSearch, category, filters, saleOnly],
    queryFn: () => get('/search', {
      q: appliedSearch,
      category: apiCategory,
      limit: 20,
      minPrice: filters.minPrice || '',
      maxPrice: filters.maxPrice || '',
      sort: filters.sortBy || 'newest',
      ...(saleOnly ? { flashSale: true } : {}),
    }),
    retry: false,
  });

  const products = filterPublicProducts((data as any)?.products || []);
  const hasFilters = Object.values(filters).some(Boolean);
  const hasActiveStoreQuery = Boolean(search.trim() || appliedSearch || category || hasFilters || saleOnly);
  const hasPendingSearch = search.trim() !== appliedSearch.trim();

  const replaceStoreRoute = (patch: StoreRoutePatch) => {
    const nextSearch = patch.search ?? search;
    const nextCategory = patch.category ?? category;
    const nextSaleOnly = patch.saleOnly ?? saleOnly;
    const routeParams: Record<string, string> = {};

    if (nextCategory) routeParams.category = nextCategory;
    if (nextSearch.trim()) routeParams.q = nextSearch.trim();
    if (nextSaleOnly) routeParams.sale = 'true';

    router.replace(
      Object.keys(routeParams).length
        ? ({ pathname: '/store' as any, params: routeParams } as any)
        : ('/store' as any),
    );
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const submitSearch = () => {
    replaceStoreRoute({ search });
  };

  const handleSearchClear = () => {
    Haptics.selectionAsync().catch(() => {});
    setSearch('');
    replaceStoreRoute({ search: '' });
  };

  const handleCategoryPress = (nextCategory: string) => {
    Haptics.selectionAsync().catch(() => {});
    setCategory(nextCategory);
    replaceStoreRoute({ category: nextCategory });
  };

  const clearStoreFilters = () => {
    Haptics.selectionAsync().catch(() => {});
    setSearch('');
    setCategory('');
    setFilters({});
    router.replace('/store' as any);
  };

  const focusStoreSearch = () => {
    Haptics.selectionAsync().catch(() => {});
    setSearchFocusKey((current) => current + 1);
    searchInputRef.current?.focus();
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const header = (
    <>
      <AppTopBar eyebrow="eSeller" title="Дэлгүүр" showBack={false} />
      <AppHeader
        title="Дэлгүүр"
        subtitle="Нэгдсэн marketplace-ээс бараа, үйлчилгээ, шинэ саналуудыг хайна."
        icon="storefront-outline"
        accent={STORE_MARKET_ACCENT}
        style={{ marginBottom: R.md }}
      />

      <AppCard style={{ padding: R.md, marginBottom: R.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm }}>
          <View
            style={{
              flex: 1,
              minHeight: 46,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: C.bgSection,
              borderRadius: UI.controlRadius,
              paddingHorizontal: R.md,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Ionicons name="search-outline" size={18} color={C.textMuted} />
            <TextInput
              key={searchFocusKey}
              ref={searchInputRef}
              autoFocus={searchFocusKey > 0}
              value={search}
              onChangeText={handleSearchChange}
              placeholder="Бараа хайх..."
              placeholderTextColor={C.textMuted}
              returnKeyType="search"
              onSubmitEditing={submitSearch}
              style={{ flex: 1, color: C.text, padding: R.sm, fontSize: 14 }}
            />
            {search.length > 0 ? (
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={handleSearchClear}
                accessibilityRole="button"
                accessibilityLabel="Хайлтыг цэвэрлэх"
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
                accessibilityLabel="Бараа хайх"
                hitSlop={8}
                style={{ marginLeft: 4 }}
              >
                <Ionicons name="arrow-forward-circle" size={22} color={STORE_MARKET_ACCENT} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => setFilterOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Шүүлтүүр нээх"
            style={{
              width: 46,
              height: 46,
              borderRadius: UI.controlRadius,
              backgroundColor: hasFilters ? STORE_MARKET_ACCENT_DIM : C.bgSection,
              borderWidth: 1,
              borderColor: hasFilters ? STORE_MARKET_ACCENT : C.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="options-outline" size={20} color={hasFilters ? STORE_MARKET_ACCENT : C.text} />
          </TouchableOpacity>
        </View>
      </AppCard>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: R.sm, paddingBottom: R.md }}
      >
        {visibleStoreCategories.map((item) => {
          const active = category === item.key;
          return (
            <TouchableOpacity
              key={item.key || 'all'}
              activeOpacity={0.84}
              onPress={() => handleCategoryPress(active && item.key !== '' ? '' : item.key)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name} ангилал`}
              style={{
                minHeight: 38,
                flexDirection: 'row',
                alignItems: 'center',
                gap: R.xs,
                paddingHorizontal: R.md,
                borderRadius: R.full,
                backgroundColor: active ? STORE_MARKET_ACCENT : C.bgSection,
                borderWidth: 1,
                borderColor: active ? STORE_MARKET_ACCENT : C.border,
              }}
            >
              <Ionicons name={item.icon as any} size={14} color={active ? C.bgCard : C.textSub} />
              <Text style={{ ...F.small, color: active ? C.bgCard : C.textSub, fontWeight: active ? '800' : '600' }}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <StorePromoSurface
        productCount={products.length}
        saleOnly={saleOnly}
        loading={isLoading}
        onSearchPress={focusStoreSearch}
        onSalePress={(enabled) => replaceStoreRoute({ saleOnly: enabled })}
      />
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {isLoading ? (
        <ScrollView
          contentContainerStyle={{
            padding: UI.screenPad,
            paddingTop: layout.screenTop,
            paddingBottom: layout.screenBottom,
          }}
        >
          {header}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <ProductCardSkeleton key={item} style={{ flexBasis: '47%', flexGrow: 0, flexShrink: 0 }} />
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item: any, index) => String(item._id || item.id || index)}
          contentContainerStyle={{
            padding: UI.screenPad,
            paddingTop: layout.screenTop,
            paddingBottom: layout.screenBottom + 24,
          }}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={STORE_MARKET_ACCENT} />}
          renderItem={({ item }) => <BuyerProductCard item={item} />}
          ListEmptyComponent={
            <AppCard style={{ marginTop: R.lg }}>
              <EmptyState
                icon={isError ? 'cloud-offline-outline' : 'cube-outline'}
                title={isError ? 'Дэлгүүр ачаалж чадсангүй' : 'Бараа олдсонгүй'}
                subtitle={
                  isError
                    ? ((error as Error)?.message || 'Сүлжээ эсвэл серверийн алдаа гарлаа.')
                    : 'Хайлтаа өөрчилж эсвэл шүүлтүүрээ суллаад дахин үзнэ үү.'
                }
                cta={isError ? {
                  label: 'Дахин оролдох',
                  icon: 'refresh-outline',
                  accent: STORE_MARKET_ACCENT,
                  onPress: () => refetch(),
                } : hasActiveStoreQuery ? {
                  label: 'Шүүлтүүр цэвэрлэх',
                  icon: 'refresh-outline',
                  accent: STORE_MARKET_ACCENT,
                  onPress: clearStoreFilters,
                } : undefined}
                compact
              />
            </AppCard>
          }
        />
      )}

      <FilterSheet visible={filterOpen} onClose={() => setFilterOpen(false)} onApply={setFilters} type="store" />
    </View>
  );
}

function StorePromoSurface({
  productCount,
  saleOnly,
  loading,
  onSearchPress,
  onSalePress,
}: {
  productCount: number;
  saleOnly: boolean;
  loading?: boolean;
  onSearchPress: () => void;
  onSalePress: (enabled: boolean) => void;
}) {
  const countLabel = loading ? 'Уншиж байна' : `${productCount} бараа`;

  return (
    <View style={{ gap: R.md, marginBottom: R.md }}>
      <AppCard elevated style={{ borderColor: STORE_MARKET_ACCENT + '24' }}>
        <Text style={{ ...F.tiny, color: STORE_MARKET_ACCENT, fontWeight: '900', marginBottom: R.xs }}>Онцлох</Text>
        <Text style={{ ...F.h2, color: C.text }}>Нэгдсэн дэлгүүрийн шинэ саналууд</Text>
        <Text style={{ ...F.small, color: C.textSub, marginTop: R.xs }}>
          Хямдрал, шинэ бараа, баталгаат дэлгүүрүүд нэг дор.
        </Text>

        <View style={{ flexDirection: 'row', gap: R.sm, marginTop: R.md }}>
          <AppButton
            label="Бараа хайх"
            icon="search-outline"
            onPress={onSearchPress}
            style={{ flex: 1 }}
          />
          <AppButton
            label="Хямдрал"
            icon="pricetag-outline"
            variant={saleOnly ? 'primary' : 'ghost'}
            onPress={() => onSalePress(!saleOnly)}
            style={{ flex: 1 }}
          />
        </View>
      </AppCard>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: R.sm }}>
        {STORE_BENEFITS.map((benefit) => (
          <AppCard key={benefit.label} style={{ width: '48%', padding: R.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: R.sm,
                  backgroundColor: benefit.color + '18',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={benefit.icon} size={17} color={benefit.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...F.tiny, color: C.text, fontWeight: '900' }} numberOfLines={1}>
                  {benefit.label}
                </Text>
                <Text style={{ ...F.tiny, color: C.textMuted, marginTop: 2 }} numberOfLines={1}>
                  {benefit.sub}
                </Text>
              </View>
            </View>
          </AppCard>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: R.sm }}>
        {STORE_PROMOS.map((promo) => (
          <View
            key={promo}
            style={{
              maxWidth: '100%',
              backgroundColor: C.bgSection,
              borderRadius: R.full,
              paddingHorizontal: R.md,
              paddingVertical: R.sm,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Text style={{ ...F.small, color: C.textSub, fontWeight: '700' }}>{promo}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: R.sm }}>
        {STORE_TRUST.map((trust) => (
          <View
            key={trust}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: R.xs,
              backgroundColor: C.bgCard,
              borderRadius: R.full,
              paddingHorizontal: R.md,
              paddingVertical: R.sm,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Ionicons name="checkmark-circle" size={13} color={C.secondary} />
            <Text style={{ ...F.tiny, color: C.textSub, fontWeight: '800' }}>{trust}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: R.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...F.h3, color: C.text }}>Нэгдсэн бараанууд</Text>
          <Text style={{ ...F.small, color: C.textMuted, marginTop: 2 }}>{countLabel}</Text>
        </View>
        <Text style={{ ...F.tiny, color: C.textMuted, fontWeight: '700' }}>Эрэмбэ: шинэ эхэндээ</Text>
      </View>
    </View>
  );
}

function StoreOwnerProductsScreen() {
  const { user } = useAuth();
  const layout = useAppLayoutMetrics();
  const [tab, setTab] = useState<'active' | 'inactive'>('active');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['my-products', tab],
    queryFn: () => get('/seller/products', { status: tab }),
    enabled: !!user,
  });

  const products = useMemo(() => (data as any)?.products || (Array.isArray(data) ? data : []), [data]);

  const stats = {
    total: products.length,
    active: products.filter((item: any) => item.isActive).length,
    outStock: products.filter((item: any) => (item.stock || 0) <= 0).length,
    revenue: products.reduce((sum: number, item: any) => sum + (item.soldCount || 0) * (item.price || 0), 0),
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Устгах', `"${name}" барааг устгах уу?`, [
      { text: 'Болих', style: 'cancel' },
      {
        text: 'Устгах',
        style: 'destructive',
        onPress: async () => {
          try {
            await del(`/products/${encodeApiPathSegment(id)}`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            refetch();
          } catch (error: any) {
            Alert.alert('Алдаа', error.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={isLoading ? [] : products}
        keyExtractor={(item: any) => item._id || item.id}
        contentContainerStyle={{
          padding: UI.screenPad,
          paddingTop: layout.screenTop,
          paddingBottom: layout.screenBottom,
        }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.store} />}
        ListHeaderComponent={
          <>
            <AppHeader
              title="Миний бараа"
              subtitle="Дэлгүүрийн бараа, үлдэгдэл, борлуулалтын төлөв."
              icon="cube-outline"
              accent={C.store}
              style={{ marginBottom: R.md }}
            />

            <AppButton
              label="Бараа нэмэх"
              icon="add"
              variant="success"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({ pathname: '/owner/products', params: { create: '1' } } as any);
              }}
              style={{ backgroundColor: C.store, borderColor: C.store, marginBottom: R.md }}
            />

            <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.md }}>
              <AppMetricCard label="Нийт" value={stats.total} icon="apps-outline" accent={C.primary} />
              <AppMetricCard label="Идэвхтэй" value={stats.active} icon="checkmark-circle-outline" accent={C.secondary} />
              <AppMetricCard label="Дууссан" value={stats.outStock} icon="alert-circle-outline" accent={C.error} />
            </View>

            <AppCard style={{ marginBottom: R.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: R.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm, flex: 1 }}>
                  <Ionicons name="trending-up-outline" size={20} color={C.store} />
                  <Text style={{ ...F.small, color: C.textSub }}>Нийт борлуулалт</Text>
                </View>
                <Text style={{ ...F.h4, color: C.store }}>{formatMoney(stats.revenue)}</Text>
              </View>
            </AppCard>

            <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.md }}>
              {(['active', 'inactive'] as const).map((item) => {
                const active = tab === item;
                return (
                  <TouchableOpacity
                    key={item}
                    activeOpacity={0.84}
                    onPress={() => setTab(item)}
                    style={{
                      flex: 1,
                      minHeight: 42,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: UI.controlRadius,
                      backgroundColor: active ? C.store + '18' : C.bgSection,
                      borderWidth: 1,
                      borderColor: active ? C.store : C.border,
                    }}
                  >
                    <Text style={{ ...F.small, color: active ? C.store : C.textMuted, fontWeight: '800' }}>
                      {item === 'active' ? 'Идэвхтэй' : 'Идэвхгүй'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        }
        renderItem={({ item }) => <OwnerProductRow item={item} onDelete={handleDelete} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingTop: R.md }}>
              {[1, 2, 3].map((item) => <ProductCardSkeleton key={item} />)}
            </View>
          ) : (
            <AppCard style={{ marginTop: R.lg }}>
              <EmptyState
                icon="cube-outline"
                title="Бараа байхгүй байна"
                subtitle="Дэлгүүрийн эхний бараагаа нэмээд захиалга авч эхлээрэй."
                cta={{
                  label: 'Эхний бараагаа нэмэх',
                  icon: 'add',
                  accent: C.store,
                  onPress: () => router.push({ pathname: '/owner/products', params: { create: '1' } } as any),
                }}
              />
            </AppCard>
          )
        }
      />
    </View>
  );
}

function BuyerProductCard({ item }: { item: any }) {
  const id = item._id || item.id;
  const routeId = encodeRouteParam(id);
  const image = firstProductImage(item);
  const price = getPublicProductPrice(item);
  const name = getProductName(item) || 'Бараа';
  const originalPrice = getOriginalProductPrice(item);
  const discount = getDiscountPercent(originalPrice, price);
  const shopName = getProductShopName(item);
  const rating = Number(item.rating ?? item.avgRating ?? 0);
  const stockLabel = getStockLabel(item);

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      disabled={!id}
      accessibilityRole="button"
      accessibilityLabel={`${name} барааны дэлгэрэнгүй`}
      accessibilityState={{ disabled: !id }}
      onPress={() => {
        if (routeId) router.push(`/product/${routeId}` as any);
      }}
      style={{ flex: 1, margin: R.xs }}
    >
      <AppCard style={{ padding: 0, overflow: 'hidden' }}>
        <View>
          <Image
            source={{ uri: image }}
            style={{ width: '100%', aspectRatio: 1, backgroundColor: C.bgSection }}
            resizeMode="cover"
          />
          {discount ? (
            <View
              style={{
                position: 'absolute',
                top: R.sm,
                left: R.sm,
                backgroundColor: C.brand,
                borderRadius: R.full,
                paddingHorizontal: R.sm,
                paddingVertical: 4,
              }}
            >
              <Text style={{ ...F.tiny, color: C.bgCard, fontWeight: '900' }}>-{discount}%</Text>
            </View>
          ) : null}
        </View>
        <View style={{ padding: R.sm, gap: R.xs }}>
          {shopName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="storefront-outline" size={11} color={C.textMuted} />
              <Text style={{ ...F.tiny, color: C.textMuted, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                {shopName}
              </Text>
            </View>
          ) : null}
          <Text style={{ ...F.small, color: C.text, fontWeight: '700' }} numberOfLines={2}>
            {name}
          </Text>
          {price > 0 ? (
            <View>
              <Text style={{ ...F.small, color: C.brand, fontWeight: '900' }}>
                {formatMoney(price)}
              </Text>
              {discount ? (
                <Text style={{ ...F.tiny, color: C.textMuted, textDecorationLine: 'line-through', marginTop: 1 }}>
                  {formatMoney(originalPrice)}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={{ ...F.tiny, color: C.seller, fontWeight: '800' }}>
              Үнэ тохируулаагүй
            </Text>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
            {rating > 0 ? <StatusPill label={`★ ${rating.toFixed(1)}`} color={C.gold} /> : null}
            {stockLabel ? <StatusPill label={stockLabel} color={stockLabel === 'Дууссан' ? C.error : C.secondary} /> : null}
          </View>
        </View>
      </AppCard>
    </TouchableOpacity>
  );
}

function OwnerProductRow({ item, onDelete }: { item: any; onDelete: (id: string, name: string) => void }) {
  const id = item._id || item.id;
  const routeId = encodeRouteParam(id);
  const stock = Number(item.stock || 0);

  return (
    <AppCard style={{ flexDirection: 'row', padding: 0, overflow: 'hidden', marginBottom: R.sm }}>
      <Image
        source={{ uri: firstImage(item) }}
        style={{ width: 92, height: 92, backgroundColor: C.bgSection }}
        resizeMode="cover"
      />
      <View style={{ flex: 1, padding: R.md, justifyContent: 'center' }}>
        <Text style={{ ...F.small, color: C.text, fontWeight: '800' }} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm, marginTop: R.xs, flexWrap: 'wrap' }}>
          {Number(item.price || 0) > 0 ? (
            <Text style={{ ...F.small, color: C.brand, fontWeight: '900' }}>{formatMoney(item.price)}</Text>
          ) : (
            <Text style={{ ...F.tiny, color: C.seller, fontWeight: '800' }}>Үнэ тохируулаагүй</Text>
          )}
          <StatusPill
            label={stock > 0 ? `${stock} ширхэг` : 'Дууссан'}
            color={stock > 0 ? C.secondary : C.error}
          />
        </View>
        <Text style={{ ...F.tiny, color: C.textMuted, marginTop: R.xs }}>
          {item.soldCount || 0} зарагдсан
        </Text>
      </View>
      <View style={{ justifyContent: 'center', paddingRight: R.sm, gap: R.sm }}>
        <IconAction
          icon="eye-outline"
          color={C.primary}
          disabled={!routeId}
          onPress={() => {
            if (routeId) router.push(`/product/${routeId}` as any);
          }}
        />
        <IconAction icon="trash-outline" color={C.error} onPress={() => onDelete(id, item.name)} />
      </View>
    </AppCard>
  );
}

function IconAction({
  icon,
  color,
  onPress,
  disabled = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 34,
        height: 34,
        borderRadius: R.sm,
        backgroundColor: color + '15',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Ionicons name={icon} size={16} color={color} />
    </TouchableOpacity>
  );
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        backgroundColor: color + '18',
        borderRadius: R.full,
        paddingHorizontal: R.sm,
        paddingVertical: 3,
      }}
    >
      <Text style={{ ...F.tiny, color, fontWeight: '900' }}>{label}</Text>
    </View>
  );
}

function firstImage(item: any) {
  const image = typeof item?.images?.[0] === 'string'
    ? item.images[0]
    : item?.images?.[0]?.url ?? item?.media?.[0]?.url;
  return image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop';
}

function getOriginalProductPrice(item: any) {
  const candidates = [
    item?.originalPrice,
    item?.compareAtPrice,
    item?.regularPrice,
    item?.price,
  ];
  const value = candidates.map(Number).find((price) => Number.isFinite(price) && price > 0);
  return value || 0;
}

function getDiscountPercent(originalPrice: number, displayPrice: number) {
  if (!originalPrice || !displayPrice || displayPrice >= originalPrice) return 0;
  return Math.max(1, Math.round((1 - displayPrice / originalPrice) * 100));
}

function getProductShopName(item: any) {
  if (item?.shop || item?.store || item?.entity) return getShopName(item.shop || item.store || item.entity);
  return item?.entityName || item?.shopName || item?.storeName || '';
}

function getStockLabel(item: any) {
  const stock = Number(item?.stock ?? item?.inventory ?? item?.quantity);
  if (!Number.isFinite(stock)) return '';
  if (stock <= 0) return 'Дууссан';
  if (stock <= 5) return `Үлдсэн ${stock}`;
  return 'Бэлэн';
}

function formatMoney(value?: number) {
  return `${Number(value || 0).toLocaleString()}₮`;
}
