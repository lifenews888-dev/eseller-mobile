import React, { useEffect, useState } from 'react';
import { FlatList, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../src/services/api';
import { useAuth } from '../../src/store/auth';
import { C, F, R, S, UI } from '../../src/shared/design';
import { shadowStyle } from '../../src/shared/shadow';
import { LIVE_FEED_CATEGORIES } from '../../src/shared/liveCategories';
import { filterPublicProducts, firstProductImage, getProductName, getPublicProductPrice } from '../../src/shared/productQuality';
import { encodeRouteParam } from '../../src/shared/routeParams';
import { AppButton, AppCard, AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';
import { FeedItemSkeleton } from '../../src/shared/ui/Skeleton';
import { ListingFilterPanel } from '../../src/components/listing/ListingFilterPanel';
import { filtersForCategory, metaParams } from '../../src/shared/listingFilters';
import { SavedSearchAPI } from '../../src/services/listings';

const LazyStoreOrders = React.lazy(() => import('../(owner)/orders'));

type FeedSort = 'newest' | 'price_asc' | 'price_desc' | 'popular';
type IconName = keyof typeof Ionicons.glyphMap;

const DISTRICTS = [
  { key: '', label: 'Бүх байршил' },
  { key: 'СБД', label: 'СБД' },
  { key: 'ХУД', label: 'ХУД' },
  { key: 'БЗД', label: 'БЗД' },
  { key: 'ЧД', label: 'ЧД' },
  { key: 'БГД', label: 'БГД' },
  { key: 'СХД', label: 'СХД' },
  { key: 'НД', label: 'НД' },
  { key: 'БНД', label: 'БНД' },
];

const SORTS: Array<{ key: FeedSort; label: string; icon: IconName }> = [
  { key: 'newest', label: 'Шинэ', icon: 'time-outline' },
  { key: 'popular', label: 'Эрэлттэй', icon: 'trending-up-outline' },
  { key: 'price_asc', label: 'Үнэ бага', icon: 'arrow-down-outline' },
  { key: 'price_desc', label: 'Үнэ өндөр', icon: 'arrow-up-outline' },
];


function isFeedSort(value: unknown): value is FeedSort {
  return value === 'newest' || value === 'price_asc' || value === 'price_desc' || value === 'popular';
}

function extractFeedItems(data: unknown): any[] {
  const value = data as any;
  if (Array.isArray(value)) return value;
  return [
    ...(Array.isArray(value?.posts) ? value.posts : []),
    ...(Array.isArray(value?.items) ? value.items : []),
    ...(Array.isArray(value?.vip) ? value.vip : []),
    ...(Array.isArray(value?.featured) ? value.featured : []),
    ...(Array.isArray(value?.discounted) ? value.discounted : []),
    ...(Array.isArray(value?.normal) ? value.normal : []),
  ];
}

function getFeedBadge(item: any) {
  if (item?.vip || item?.isVip || item?.tier === 'VIP') return { label: 'VIP', bg: C.gold, color: C.text };
  if (item?.discountPercent || item?.salePrice || item?.discounted) {
    return { label: item.discountPercent ? `-${item.discountPercent}%` : 'Хямдрал', bg: C.brand, color: C.bgCard };
  }
  if (item?.featured) return { label: 'Онцлох', bg: C.primary, color: C.bgCard };
  return null;
}

export default function FeedScreen() {
  const { role } = useAuth();

  if (role === 'STORE') {
    return (
      <React.Suspense fallback={<View style={styles.screen} />}>
        <LazyStoreOrders />
      </React.Suspense>
    );
  }

  return <BuyerFeedScreen />;
}

function BuyerFeedScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const token = useAuth((st) => st.token);
  const layout = useAppLayoutMetrics();
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [sort, setSort] = useState<FeedSort>('newest');
  const appliedSearch = typeof params.q === 'string' ? params.q : '';
  // m_* нарийн шүүлтүүр (вэбтэй ижил) — route параметрээс уншина
  const metaKey = Object.keys(params).filter((k) => k.startsWith('m_') && params[k]).sort().map((k) => `${k}=${params[k]}`).join('&');
  const metaValues: Record<string, string> = {};
  for (const k of Object.keys(params)) if (k.startsWith('m_') && typeof params[k] === 'string' && params[k]) metaValues[k.slice(2)] = params[k];
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  useEffect(() => { setSaveState('idle'); }, [params.category, appliedSearch, params.district, metaKey]);

  // Хадгалсан хайлтаас орж ирвэл "шинэ" тоог тэглэнэ
  useEffect(() => {
    if (token && typeof params.ss === 'string' && params.ss) SavedSearchAPI.seen(params.ss).catch(() => null);
  }, [token, params.ss]);

  useEffect(() => {
    setCategory(typeof params.category === 'string' ? params.category : '');
    setSearch(appliedSearch);
    setDistrict(typeof params.district === 'string' ? params.district : '');
    setSort(isFeedSort(params.sort) ? params.sort : 'newest');
  }, [appliedSearch, params.category, params.district, params.sort]);

  const replaceFeedRoute = (patch: { category?: string; search?: string; district?: string; sort?: FeedSort; meta?: Record<string, string> }) => {
    const nextCategory = patch.category ?? category;
    const nextSearch = patch.search ?? search;
    const nextDistrict = patch.district ?? district;
    const nextSort = patch.sort ?? sort;
    const routeParams: Record<string, string> = {};

    if (nextCategory) routeParams.category = nextCategory;
    if (nextSearch.trim()) routeParams.q = nextSearch.trim();
    if (nextDistrict) routeParams.district = nextDistrict;
    if (nextSort !== 'newest') routeParams.sort = nextSort;
    // Ангилал солигдвол нарийн шүүлтүүр цэвэрлэгдэнэ
    const nextMeta = patch.meta ?? (patch.category !== undefined && patch.category !== category ? {} : metaValues);
    Object.assign(routeParams, metaParams(nextMeta));

    router.replace(Object.keys(routeParams).length ? ({ pathname: '/feed' as any, params: routeParams } as any) : ('/feed' as any));
  };

  const { data, isLoading, isError, error, isRefetching, refetch } = useQuery({
    queryKey: ['feed', category, appliedSearch, district, sort, metaKey],
    queryFn: () => get('/feed', { category, q: appliedSearch, district, sort, limit: 20, ...metaParams(metaValues) }),
    retry: false,
  });

  const posts = filterPublicProducts<any>(extractFeedItems(data));
  const vipCount = posts.filter((post: any) => post.vip || post.isVip || String(post.tier || '').toLowerCase() === 'vip').length;
  const hasActiveFeedQuery = Boolean(category || appliedSearch || district || sort !== 'newest' || metaKey);
  const canSaveSearch = Boolean(category || appliedSearch || district || metaKey);

  const saveSearch = async () => {
    if (!token) {
      router.push({ pathname: '/login', params: { returnTo: '/saved-searches' } } as any);
      return;
    }
    const parts: string[] = [];
    if (category) parts.push(`category=${encodeURIComponent(category)}`);
    if (appliedSearch) parts.push(`q=${encodeURIComponent(appliedSearch)}`);
    if (district) parts.push(`district=${encodeURIComponent(district)}`);
    for (const [k, v] of Object.entries(metaParams(metaValues))) parts.push(`${k}=${encodeURIComponent(v)}`);
    setSaveState('saving');
    try {
      await SavedSearchAPI.create(parts.join('&'));
      setSaveState('saved');
    } catch {
      setSaveState('idle');
    }
  };
  const hasPendingSearch = search.trim() !== appliedSearch.trim();

  const submitSearch = () => replaceFeedRoute({ search });
  const clearFeedFilters = () => {
    Haptics.selectionAsync().catch(() => {});
    setCategory('');
    setSearch('');
    setDistrict('');
    setSort('newest');
    router.replace('/feed' as any);
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={isLoading ? [] : posts}
        keyExtractor={(item: any, index) => String(item.id || item._id || item.slug || index)}
        contentContainerStyle={{ paddingHorizontal: UI.screenPad, paddingBottom: layout.screenBottom + 24 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.brand} />}
        ListHeaderComponent={
          <View style={{ paddingTop: layout.screenTop }}>
            <AppTopBar
              eyebrow="eSeller"
              title="Зарын булан"
              showBack={false}
              right={
                <View style={{ flexDirection: 'row', gap: R.sm }}>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Хадгалсан хайлт" hitSlop={8} onPress={() => router.push('/saved-searches' as any)}>
                    <Ionicons name="notifications-outline" size={22} color={C.text} />
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Зарын чат" hitSlop={8} onPress={() => router.push('/messages' as any)}>
                    <Ionicons name="chatbubbles-outline" size={22} color={C.text} />
                  </TouchableOpacity>
                </View>
              }
            />
            <AppHeader
              title="Зарын булан"
              subtitle="Бараа, үйлчилгээ, авто, үл хөдлөх болон өдөр тутмын хэрэгцээг нэг дороос хайна."
              icon="megaphone-outline"
              accent={C.brand}
              style={{ marginBottom: R.md }}
            />

            <AppCard style={styles.searchCard}>
              <View style={styles.searchRow}>
                <Ionicons name="search" size={19} color={C.textMuted} />
                <TextInput
                  accessibilityLabel="Зар хайх"
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Зар хайх..."
                  placeholderTextColor={C.textMuted}
                  returnKeyType="search"
                  onSubmitEditing={submitSearch}
                  style={styles.searchInput}
                />
                {search.length > 0 ? (
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Хайлтыг цэвэрлэх" hitSlop={8} onPress={() => { setSearch(''); replaceFeedRoute({ search: '' }); }}>
                    <Ionicons name="close-circle" size={19} color={C.textMuted} />
                  </TouchableOpacity>
                ) : null}
                {hasPendingSearch ? (
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Хайх" hitSlop={8} onPress={submitSearch}>
                    <Ionicons name="arrow-forward-circle" size={24} color={C.primary} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.locationRow}>
                <Ionicons name="navigate-outline" size={15} color={C.textMuted} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {district ? `${district} байршлаар шүүж байна` : 'Байршил сонгоогүй'}
                </Text>
                {district ? (
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Байршлын шүүлтүүр цэвэрлэх" onPress={() => { setDistrict(''); replaceFeedRoute({ district: '' }); }}>
                    <Text style={styles.inlineAction}>Цэвэрлэх</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </AppCard>

            <SectionTitle title="Ангилал" action={hasActiveFeedQuery ? 'Цэвэрлэх' : undefined} onAction={clearFeedFilters} />
            <HorizontalChips
              items={LIVE_FEED_CATEGORIES.map((item) => ({ key: item.slug, label: item.name, icon: item.icon as IconName }))}
              value={category}
              onChange={(value) => { setCategory(value); replaceFeedRoute({ category: value }); }}
            />

            <SectionTitle title="Байршил" />
            <HorizontalChips
              items={DISTRICTS}
              value={district}
              onChange={(value) => { setDistrict(value); replaceFeedRoute({ district: value }); }}
            />

            <SectionTitle title="Эрэмбэлэх" />
            <HorizontalChips
              items={SORTS}
              value={sort}
              onChange={(value) => {
                if (!isFeedSort(value)) return;
                setSort(value);
                replaceFeedRoute({ sort: value });
              }}
            />

            {filtersForCategory(category).length > 0 ? (
              <View style={{ marginTop: R.md }}>
                <ListingFilterPanel key={category} category={category} values={metaValues} onApply={(next) => replaceFeedRoute({ meta: next })} />
              </View>
            ) : null}

            {canSaveSearch ? (
              <AppButton
                label={saveState === 'saved' ? 'Хадгалсан · шинэ зар гарвал мэдэгдэнэ' : saveState === 'saving' ? 'Хадгалж байна...' : 'Хайлт хадгалах · шинэ зар мэдэгдэх'}
                icon={saveState === 'saved' ? 'notifications' : 'notifications-outline'}
                variant="secondary"
                disabled={saveState !== 'idle'}
                onPress={saveSearch}
                style={{ marginTop: R.md }}
              />
            ) : null}

            <View style={styles.resultHeader}>
              <View>
                <Text style={styles.resultTitle}>{posts.length} зар олдлоо</Text>
                <Text style={styles.resultMeta}>{vipCount} VIP зар байна</Text>
              </View>
              <AppButton label="Зар нэмэх" icon="add" onPress={() => router.push('/feed/create' as any)} style={styles.addButton} />
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletonWrap}>{[1, 2, 3, 4].map((item) => <FeedItemSkeleton key={item} />)}</View>
          ) : (
            <EmptyFeedState
              isError={isError}
              message={(error as Error)?.message}
              hasActiveFeedQuery={hasActiveFeedQuery}
              onRetry={() => refetch()}
              onClear={clearFeedFilters}
            />
          )
        }
        renderItem={({ item }) => <FeedCard item={item} />}
      />

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Шинэ зар нэмэх"
        activeOpacity={0.84}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          router.push('/feed/create' as any);
        }}
        style={[styles.fab, { bottom: layout.floatingBottom }]}
      >
        <Ionicons name="add" size={28} color={C.bgCard} />
      </TouchableOpacity>
    </View>
  );
}

function HorizontalChips({
  items,
  value,
  onChange,
}: {
  items: Array<{ key: string; label: string; icon?: IconName }>;
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {items.map((item) => {
        const active = value === item.key;
        return (
          <TouchableOpacity
            key={item.key || 'all'}
            activeOpacity={0.84}
            accessibilityRole="button"
            accessibilityLabel={`${item.label} сонгох`}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.key)}
            style={[styles.chip, active && styles.chipActive]}
          >
            {item.icon ? <Ionicons name={item.icon} size={14} color={active ? C.bgCard : C.textSub} /> : null}
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={action} onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}


function FeedCard({ item }: { item: any }) {
  const itemId = item.id || item._id || item.slug;
  const itemRouteId = encodeRouteParam(itemId);
  const badge = getFeedBadge(item);
  const price = getPublicProductPrice(item);
  const image = firstProductImage(item);
  const productName = getProductName(item) || 'Зар';
  const originalPrice = item.salePrice ? item.price : item.originalPrice;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${productName} зарын дэлгэрэнгүй`}
      accessibilityState={{ disabled: !itemRouteId }}
      activeOpacity={0.86}
      disabled={!itemRouteId}
      onPress={() => itemRouteId && router.push(`/feed/${itemRouteId}` as any)}
      style={styles.card}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        {badge ? (
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        ) : null}
        {item.imageCount > 1 ? (
          <View style={styles.imageCount}>
            <Ionicons name="images" size={10} color={C.bgCard} />
            <Text style={styles.imageCountText}>{item.imageCount}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{productName}</Text>
        <Text style={styles.price}>{formatPrice(price)}</Text>
        {originalPrice && originalPrice > price ? <Text style={styles.oldPrice}>{formatPrice(originalPrice)}</Text> : null}
        <View style={styles.metaRow}>
          {item.district ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color={C.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>{item.district}</Text>
            </View>
          ) : null}
          {item.createdAt ? <Text style={styles.metaText}>{timeAgo(item.createdAt)}</Text> : null}
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.metaItem}>
            <Ionicons name="eye-outline" size={12} color={C.textMuted} />
            <Text style={styles.metaText}>{item.views ?? item.viewCount ?? 0}</Text>
          </View>
          <View style={styles.detailLink}>
            <Text style={styles.detailText}>Дэлгэрэнгүй</Text>
            <Ionicons name="arrow-forward" size={13} color={C.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EmptyFeedState({
  isError,
  message,
  hasActiveFeedQuery,
  onRetry,
  onClear,
}: {
  isError: boolean;
  message?: string;
  hasActiveFeedQuery: boolean;
  onRetry: () => void;
  onClear: () => void;
}) {
  const actionLabel = isError ? 'Дахин оролдох' : hasActiveFeedQuery ? 'Шүүлтүүр цэвэрлэх' : 'Зар нэмэх';

  return (
    <AppCard style={styles.emptyCard}>
      <Ionicons name={isError ? 'cloud-offline-outline' : 'megaphone-outline'} size={46} color={C.textMuted} />
      <Text style={styles.emptyTitle}>{isError ? 'Зарууд ачаалж чадсангүй' : 'Зар олдсонгүй'}</Text>
      <Text style={styles.emptyText}>
        {isError ? (message || 'Сүлжээ эсвэл серверийн алдаа гарлаа.') : 'Шүүлтүүрээ өөрчлөх эсвэл шинэ зар нэмээрэй.'}
      </Text>
      <AppButton
        label={actionLabel}
        icon={isError ? 'refresh' : hasActiveFeedQuery ? 'close-circle-outline' : 'add'}
        onPress={isError ? onRetry : hasActiveFeedQuery ? onClear : () => router.push('/feed/create' as any)}
        style={{ marginTop: R.md, minWidth: 180 }}
      />
    </AppCard>
  );
}

function formatPrice(value: number) {
  return `${Math.round(value || 0).toLocaleString()}₮`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Саяхан';
  if (mins < 60) return `${mins} мин`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} цаг`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} өдөр`;
  return new Date(dateStr).toLocaleDateString('mn-MN');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  searchCard: { gap: R.md, marginBottom: R.lg },
  searchRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
    backgroundColor: C.bgSection,
    borderRadius: UI.controlRadius,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: R.md,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 15, paddingVertical: R.sm },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: R.sm },
  locationText: { ...F.small, color: C.textSub, flex: 1, fontWeight: '700' },
  inlineAction: { ...F.small, color: C.primary, fontWeight: '800' },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: R.sm,
    marginTop: R.xs,
  },
  sectionTitle: { ...F.h4, color: C.text },
  sectionAction: { ...F.small, color: C.primary, fontWeight: '800' },
  chipRow: { gap: R.sm, paddingBottom: R.md },
  chip: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.xs,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgSection,
    paddingHorizontal: R.md,
    paddingVertical: R.sm,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { ...F.small, color: C.textSub, fontWeight: '700' },
  chipTextActive: { color: C.bgCard, fontWeight: '900' },
  featuredRow: { gap: R.sm, paddingBottom: R.lg },
  featuredCard: {
    width: 232,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
    backgroundColor: C.bgCard,
    borderRadius: UI.cardRadius,
    borderWidth: 1,
    borderColor: C.border,
    padding: R.md,
  },
  featuredLogo: {
    width: UI.iconBox,
    height: UI.iconBox,
    borderRadius: UI.controlRadius,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredLogoText: { ...F.h4, color: C.primary, fontWeight: '900' },
  featuredType: { ...F.tiny, color: C.textMuted, fontWeight: '900' },
  featuredName: { ...F.small, color: C.text, fontWeight: '900', marginTop: 2 },
  featuredMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  featuredMeta: { ...F.tiny, color: C.textMuted, flex: 1 },
  featuredRating: { ...F.tiny, color: C.textMuted, fontWeight: '800' },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: R.md,
    marginTop: R.xs,
    marginBottom: R.sm,
  },
  resultTitle: { ...F.h4, color: C.text, fontWeight: '900' },
  resultMeta: { ...F.tiny, color: C.textMuted, marginTop: 2 },
  addButton: { minHeight: 40, paddingHorizontal: R.md },
  skeletonWrap: { paddingTop: R.sm },
  card: {
    flexDirection: 'row',
    backgroundColor: C.bgCard,
    borderRadius: UI.cardRadius,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: R.sm,
    overflow: 'hidden',
    ...S.card,
  },
  imageWrap: { position: 'relative', width: 112, minHeight: 116, backgroundColor: C.bgSection },
  image: { width: 112, height: 116, backgroundColor: C.bgSection },
  badge: {
    position: 'absolute',
    top: R.xs,
    left: R.xs,
    borderRadius: R.xs,
    paddingHorizontal: R.xs,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 9, fontWeight: '900' },
  imageCount: {
    position: 'absolute',
    right: R.xs,
    bottom: R.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: `${C.text}B0`,
    borderRadius: R.sm,
    paddingHorizontal: R.xs,
    paddingVertical: 2,
  },
  imageCountText: { color: C.bgCard, fontSize: 9, fontWeight: '800' },
  cardBody: { flex: 1, padding: R.md },
  cardTitle: { ...F.body, color: C.text, fontWeight: '800', lineHeight: 20 },
  price: { color: C.brand, fontSize: 18, fontWeight: '900', marginTop: R.xs },
  oldPrice: { ...F.tiny, color: C.textMuted, textDecorationLine: 'line-through', marginTop: 1 },
  metaRow: { minHeight: 20, flexDirection: 'row', alignItems: 'center', gap: R.sm, marginTop: R.xs },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { ...F.tiny, color: C.textMuted },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: R.sm },
  detailLink: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  detailText: { ...F.small, color: C.primary, fontWeight: '900' },
  emptyCard: { alignItems: 'center', marginTop: R.lg, paddingVertical: R.xxxl },
  emptyTitle: { ...F.h3, color: C.text, marginTop: R.md, textAlign: 'center' },
  emptyText: { ...F.small, color: C.textSub, textAlign: 'center', lineHeight: 20, marginTop: R.xs },
  fab: {
    position: 'absolute',
    right: R.lg,
    width: 56,
    height: 56,
    borderRadius: R.full,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...S.elevated,
    ...shadowStyle({ color: C.brand, y: 4, blur: 16, opacity: 0.42, elevation: 12 }),
  },
});
