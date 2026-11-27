import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import { LIVE_SEARCH_KEYWORDS } from '../../src/shared/liveCategories';
import {
  filterPublicProducts,
  firstProductImage,
  getProductName,
  getPublicProductPrice,
} from '../../src/shared/productQuality';
import { encodeRouteParam } from '../../src/shared/routeParams';
import { getShopName } from '../../src/shared/shopIdentity';
import { AppButton, AppCard, AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

type SearchScope = 'all' | 'products' | 'shops' | 'feed';
type SearchRoutePatch = {
  query?: string;
  scope?: SearchScope;
};
type SearchResult =
  | { kind: 'product'; item: any }
  | { kind: 'shop'; item: any }
  | { kind: 'feed'; item: any };

const SCOPES: Array<{ key: SearchScope; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'all', label: 'Бүгд', icon: 'grid-outline' },
  { key: 'products', label: 'Бараа', icon: 'bag-outline' },
  { key: 'shops', label: 'Дэлгүүр', icon: 'storefront-outline' },
  { key: 'feed', label: 'Зар', icon: 'megaphone-outline' },
];

const TRUST_CHIPS = [
  { icon: 'car-outline' as const, label: '50,000₮+ үнэгүй хүргэлт', route: '/help', color: C.success },
  { icon: 'card-outline' as const, label: 'QPay аюулгүй төлбөр', route: '/help', color: C.primary },
];

function isSearchScope(value: unknown): value is SearchScope {
  return value === 'all' || value === 'products' || value === 'shops' || value === 'feed';
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; type?: SearchScope }>();
  const layout = useAppLayoutMetrics();
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');

  useEffect(() => {
    setQ(typeof params.q === 'string' ? params.q : '');
    setScope(isSearchScope(params.type) ? params.type : 'all');
  }, [params.q, params.type]);

  useEffect(() => {
    const timer = setTimeout(() => setDq(q.trim()), 350);
    return () => clearTimeout(timer);
  }, [q]);

  const enabled = dq.length > 1;

  const productsQ = useQuery({
    queryKey: ['search-products', dq],
    queryFn: () => get('/search', { q: dq, limit: 12 }),
    enabled,
    retry: false,
  });

  const shopsQ = useQuery({
    queryKey: ['search-shops', dq],
    queryFn: () => get('/stores', { q: dq, limit: 8 }),
    enabled,
    retry: false,
  });

  const feedQ = useQuery({
    queryKey: ['search-feed', dq],
    queryFn: () => get('/feed', { q: dq, limit: 8 }),
    enabled,
    retry: false,
  });

  const products = filterPublicProducts(asArray(productsQ.data, ['products', 'items']));
  const shops = asArray(shopsQ.data, ['stores', 'entities', 'items']);
  const feed = filterPublicProducts(asArray(feedQ.data, ['posts', 'items']));

  const results = useMemo<SearchResult[]>(() => {
    const productResults = products.map((item: any) => ({ kind: 'product' as const, item }));
    const shopResults = shops.map((item: any) => ({ kind: 'shop' as const, item }));
    const feedResults = feed.map((item: any) => ({ kind: 'feed' as const, item }));

    if (scope === 'products') return productResults;
    if (scope === 'shops') return shopResults;
    if (scope === 'feed') return feedResults;
    return [...productResults.slice(0, 8), ...shopResults.slice(0, 4), ...feedResults.slice(0, 4)];
  }, [products, shops, feed, scope]);

  const isLoading = enabled && (productsQ.isLoading || shopsQ.isLoading || feedQ.isLoading);
  const isError = enabled && (productsQ.isError || shopsQ.isError || feedQ.isError);
  const total = products.length + shops.length + feed.length;
  const visibleTotal = results.length;
  const hasScopedResultsElsewhere = enabled && scope !== 'all' && visibleTotal === 0 && total > 0;

  const refetchSearch = () => {
    productsQ.refetch();
    shopsQ.refetch();
    feedQ.refetch();
  };

  const replaceSearchRoute = (patch: SearchRoutePatch) => {
    const nextQuery = patch.query ?? q;
    const nextScope = patch.scope ?? scope;
    const routeParams: Record<string, string> = {};

    if (nextQuery.trim()) routeParams.q = nextQuery.trim();
    if (nextScope !== 'all') routeParams.type = nextScope;

    router.replace(
      Object.keys(routeParams).length
        ? ({ pathname: '/search' as any, params: routeParams } as any)
        : ('/search' as any),
    );
  };

  const handleQueryChange = (value: string) => {
    setQ(value);
  };

  const clearQuery = () => {
    setQ('');
    setDq('');
    replaceSearchRoute({ query: '' });
  };

  const handleScopePress = (nextScope: SearchScope) => {
    setScope(nextScope);
    replaceSearchRoute({ scope: nextScope });
  };

  const showAllResults = () => {
    setScope('all');
    replaceSearchRoute({ scope: 'all' });
  };

  const runSearch = () => {
    setDq(q.trim());
    replaceSearchRoute({ query: q });
  };

  const runKeyword = (keyword: string) => {
    setQ(keyword);
    setDq(keyword);
    replaceSearchRoute({ query: keyword });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={results}
        keyExtractor={(row, index) => `${row.kind}-${row.item.id ?? row.item._id ?? row.item.slug ?? row.item.storefrontSlug ?? index}`}
        contentContainerStyle={{
          padding: UI.screenPad,
          paddingTop: layout.screenTop,
          paddingBottom: layout.screenBottom,
        }}
        ListHeaderComponent={
          <>
            <AppTopBar eyebrow="Хайлт" title="Нэгдсэн цахим зах" onBack={() => router.back()} />

            <AppHeader
              title="Хайлт"
              subtitle="Бараа, дэлгүүр, үйлчилгээ, заруудыг нэг дороос хайна."
              icon="search-outline"
              accent={C.brand}
              style={{ marginBottom: R.md }}
            />

            <AppCard style={{ padding: R.md, marginBottom: R.md }}>
              <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.md }}>
                {SCOPES.map((item) => {
                  const active = scope === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      activeOpacity={0.84}
                      onPress={() => handleScopePress(item.key)}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.label} хайлтын төрөл сонгох`}
                      accessibilityState={{ selected: active }}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: active ? C.primary : C.bgSection,
                        borderRadius: UI.controlRadius,
                        paddingVertical: R.sm,
                        borderWidth: 1,
                        borderColor: active ? C.primary : C.border,
                      }}
                    >
                      <Ionicons name={item.icon} size={15} color={active ? C.bgCard : C.textSub} />
                      <Text style={{ ...F.tiny, color: active ? C.bgCard : C.textSub, fontWeight: '900' }}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View
                style={{
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
                  placeholder="Бараа, дэлгүүр, үйлчилгээ хайх..."
                  placeholderTextColor={C.textMuted}
                  value={q}
                  onChangeText={handleQueryChange}
                  autoFocus
                  returnKeyType="search"
                  onSubmitEditing={runSearch}
                  accessibilityLabel="Нэгдсэн хайлт"
                  accessibilityHint="Бараа, дэлгүүр, үйлчилгээ эсвэл зар хайх үгээ оруулна уу"
                  style={{ flex: 1, color: C.text, padding: R.sm, fontSize: 15 }}
                />
                {q.length > 0 ? (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={clearQuery}
                    accessibilityRole="button"
                    accessibilityLabel="Хайлт цэвэрлэх"
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={runSearch}
                  accessibilityRole="button"
                  accessibilityLabel="Хайх"
                  style={{
                    backgroundColor: C.brandDim,
                    borderRadius: R.sm,
                    paddingHorizontal: R.sm,
                    paddingVertical: 7,
                    marginLeft: R.sm,
                  }}
                >
                  <Text style={{ ...F.tiny, color: C.brand, fontWeight: '900' }}>Хайх</Text>
                </TouchableOpacity>
              </View>
            </AppCard>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: R.sm, marginBottom: R.md }}>
              {LIVE_SEARCH_KEYWORDS.map((keyword) => (
                <TouchableOpacity
                  key={keyword}
                  activeOpacity={0.84}
                  onPress={() => runKeyword(keyword)}
                  accessibilityRole="button"
                  accessibilityLabel={`${keyword} гэж хайх`}
                  style={{
                    backgroundColor: C.bgSection,
                    borderRadius: R.full,
                    paddingHorizontal: R.md,
                    paddingVertical: R.sm,
                    borderWidth: 1,
                    borderColor: C.border,
                  }}
                >
                  <Text style={{ ...F.small, color: C.textSub, fontWeight: '800' }}>{keyword}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: R.sm, marginBottom: R.md }}>
              {TRUST_CHIPS.map((chip) => (
                <TouchableOpacity
                  key={chip.label}
                  activeOpacity={0.84}
                  onPress={() => router.push(chip.route as any)}
                  accessibilityRole="button"
                  accessibilityLabel={`${chip.label} нээх`}
                  style={{ width: '48%' }}
                >
                  <AppCard style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm, padding: R.md }}>
                    <Ionicons name={chip.icon} size={16} color={chip.color} />
                    <Text numberOfLines={1} style={{ ...F.tiny, color: C.text, fontWeight: '900', flex: 1 }}>
                      {chip.label}
                    </Text>
                  </AppCard>
                </TouchableOpacity>
              ))}
            </View>

            {enabled ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: R.sm, gap: R.md }}>
                <Text style={{ ...F.small, color: C.text, fontWeight: '900' }}>
                  {scope === 'all' ? total : visibleTotal} үр дүн
                </Text>
                <Text style={{ ...F.tiny, color: C.textMuted, textAlign: 'right', flex: 1 }}>
                  {products.length} бараа - {shops.length} дэлгүүр - {feed.length} зар
                </Text>
              </View>
            ) : null}
          </>
        }
        renderItem={({ item }) => <SearchResultCard result={item} />}
        ListEmptyComponent={
          <AppCard style={{ alignItems: 'center', gap: R.sm, marginTop: R.lg }}>
            {isError ? (
              <>
                <Ionicons name="cloud-offline-outline" size={44} color={C.textMuted} />
                <Text style={{ ...F.body, color: C.text, fontWeight: '800', textAlign: 'center' }}>
                  Хайлт ачаалж чадсангүй
                </Text>
                <Text style={{ ...F.small, color: C.textMuted, textAlign: 'center' }}>
                  Сүлжээ эсвэл серверийн алдаа гарлаа.
                </Text>
                <AppButton
                  label="Дахин оролдох"
                  icon="refresh"
                  variant="secondary"
                  onPress={refetchSearch}
                  style={{ minWidth: 160 }}
                />
              </>
            ) : isLoading ? (
              <>
                <ActivityIndicator color={C.brand} />
                <Text style={{ ...F.small, color: C.textMuted }}>Хайж байна...</Text>
              </>
            ) : (
              <>
                <Ionicons name={enabled ? 'sad-outline' : 'search-outline'} size={44} color={C.textMuted} />
                <Text style={{ ...F.body, color: C.textSub, textAlign: 'center' }}>
                  {enabled
                    ? hasScopedResultsElsewhere
                      ? `"${dq}" энэ төрөлд олдсонгүй`
                      : `"${dq}" олдсонгүй`
                    : 'Хайх үгээ оруулна уу'}
                </Text>
                {hasScopedResultsElsewhere ? (
                  <AppButton
                    label="Бүгдээс хайх"
                    icon="grid-outline"
                    variant="secondary"
                    onPress={showAllResults}
                    style={{ minWidth: 160 }}
                  />
                ) : null}
              </>
            )}
          </AppCard>
        }
      />
    </View>
  );
}

function SearchResultCard({ result }: { result: SearchResult }) {
  if (result.kind === 'shop') return <ShopResult item={result.item} />;
  if (result.kind === 'feed') return <FeedResult item={result.item} />;
  return <ProductResult item={result.item} />;
}

function ProductResult({ item }: { item: any }) {
  const id = item.id ?? item._id;
  const routeId = encodeRouteParam(id);
  const image = firstProductImage(item, '');
  const price = getPublicProductPrice(item);
  const name = getProductName(item) || 'Бараа';

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      disabled={!id}
      accessibilityRole="button"
      accessibilityLabel={`${name} дэлгэрэнгүй нээх`}
      accessibilityState={{ disabled: !id }}
      onPress={() => {
        if (routeId) router.push(`/product/${routeId}` as any);
      }}
    >
      <ResultCard>
        <Thumb image={image} label={`${name} зураг`} fallbackIcon="bag-outline" />
        <View style={{ flex: 1 }}>
          <KindLabel color={C.brand}>Бараа</KindLabel>
          <Text numberOfLines={2} style={{ ...F.small, color: C.text, fontWeight: '900', marginTop: 2 }}>
            {name}
          </Text>
          <Text style={{ ...F.small, color: C.brand, fontWeight: '900', marginTop: R.xs }}>
            {formatMoney(price)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
      </ResultCard>
    </TouchableOpacity>
  );
}

function ShopResult({ item }: { item: any }) {
  const slug = item.slug ?? item.storefrontSlug ?? item.id ?? item._id;
  const routeSlug = encodeRouteParam(slug);
  const name = getShopName(item);
  const label = initials(name);

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
      <ResultCard>
        <InitialThumb label={label} color={C.secondary} />
        <View style={{ flex: 1 }}>
          <KindLabel color={C.secondary}>Дэлгүүр</KindLabel>
          <Text numberOfLines={1} style={{ ...F.small, color: C.text, fontWeight: '900', marginTop: 2 }}>
            {name}
          </Text>
          <Text numberOfLines={1} style={{ ...F.tiny, color: C.textMuted, marginTop: R.xs }}>
            ★ {item.rating ?? '-'} - {item.productCount ?? 0} бараа
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
      </ResultCard>
    </TouchableOpacity>
  );
}

function FeedResult({ item }: { item: any }) {
  const id = item.id ?? item._id;
  const routeId = encodeRouteParam(id);
  const image = firstProductImage(item, '');
  const name = getProductName(item) || 'Зар';
  const price = getPublicProductPrice(item);

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      disabled={!id}
      accessibilityRole="button"
      accessibilityLabel={`${name} дэлгэрэнгүй нээх`}
      accessibilityState={{ disabled: !id }}
      onPress={() => {
        if (routeId) router.push(`/feed/${routeId}` as any);
      }}
    >
      <ResultCard>
        <Thumb image={image} label={`${name} зураг`} fallbackIcon="megaphone-outline" />
        <View style={{ flex: 1 }}>
          <KindLabel color={C.primary}>Зар</KindLabel>
          <Text numberOfLines={2} style={{ ...F.small, color: C.text, fontWeight: '900', marginTop: 2 }}>
            {name}
          </Text>
          <Text style={{ ...F.small, color: C.brand, fontWeight: '900', marginTop: R.xs }}>
            {price > 0 ? formatMoney(price) : 'Үнэ тохиролцоно'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
      </ResultCard>
    </TouchableOpacity>
  );
}

function ResultCard({ children }: { children: React.ReactNode }) {
  return (
    <AppCard style={{ flexDirection: 'row', alignItems: 'center', gap: R.md, padding: R.md, marginBottom: R.sm }}>
      {children}
    </AppCard>
  );
}

function Thumb({ image, label, fallbackIcon }: { image?: string; label: string; fallbackIcon: keyof typeof Ionicons.glyphMap }) {
  if (image) {
    return (
      <Image
        source={{ uri: image }}
        resizeMode="cover"
        style={{ width: 64, height: 64, borderRadius: UI.controlRadius, backgroundColor: C.bgSection }}
        accessibilityLabel={label}
      />
    );
  }

  return (
    <View
      style={{
        width: 64,
        height: 64,
        borderRadius: UI.controlRadius,
        backgroundColor: C.bgSection,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={fallbackIcon} size={24} color={C.textMuted} />
    </View>
  );
}

function InitialThumb({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        width: 64,
        height: 64,
        borderRadius: UI.controlRadius,
        backgroundColor: `${color}18`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ ...F.h3, color }}>{label}</Text>
    </View>
  );
}

function KindLabel({ color, children }: { color: string; children: React.ReactNode }) {
  return <Text style={{ ...F.tiny, color, fontWeight: '900' }}>{children}</Text>;
}

function asArray(data: any, keys: string[]) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function initials(name?: string) {
  return String(name ?? 'Д').trim().slice(0, 2).toLocaleUpperCase('mn-MN');
}

function formatMoney(value?: number) {
  return `${Number(value || 0).toLocaleString()}₮`;
}
