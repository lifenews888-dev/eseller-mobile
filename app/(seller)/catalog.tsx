import React, { useEffect, useState } from 'react';
import { Image, RefreshControl, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { get } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import { getProductName } from '../../src/shared/productQuality';
import { encodeRouteParam, normalizeRouteParam } from '../../src/shared/routeParams';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

const fmt = (n: number) => `${Number(n || 0).toLocaleString()}₮`;

type CatalogSort = 'clicks' | 'earnings';
type CatalogRoutePatch = {
  search?: string;
  sort?: CatalogSort;
};

function normalizeSortParam(value?: string | string[] | null): CatalogSort {
  return value === 'earnings' ? 'earnings' : 'clicks';
}

export default function CatalogScreen() {
  const params = useLocalSearchParams<{ q?: string; sort?: CatalogSort }>();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['seller-catalog'],
    queryFn: () => get('/affiliate/links'),
  });
  const products = (data as any)?.links || (data as any)?.products || [];
  const [search, setSearch] = useState(() => normalizeRouteParam(params.q));
  const [sort, setSort] = useState<CatalogSort>(() => normalizeSortParam(params.sort));

  useEffect(() => {
    setSearch(normalizeRouteParam(params.q));
    setSort(normalizeSortParam(params.sort));
  }, [params.q, params.sort]);

  const replaceCatalogRoute = (patch: CatalogRoutePatch) => {
    const nextSearch = patch.search ?? search;
    const nextSort = patch.sort ?? sort;
    const routeParams: Record<string, string> = {};

    if (nextSearch.trim()) routeParams.q = nextSearch.trim();
    if (nextSort !== 'clicks') routeParams.sort = nextSort;

    router.replace(
      Object.keys(routeParams).length
        ? ({ pathname: '/seller/catalog' as any, params: routeParams } as any)
        : ('/seller/catalog' as any),
    );
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    replaceCatalogRoute({ search: value });
  };

  const handleSearchClear = () => {
    setSearch('');
    replaceCatalogRoute({ search: '' });
  };

  const handleSortPress = (nextSort: CatalogSort) => {
    setSort(nextSort);
    replaceCatalogRoute({ sort: nextSort });
  };

  const filtered = products
    .filter((product: any) => !search || product.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) =>
      sort === 'clicks' ? (b.clicks || 0) - (a.clicks || 0) : (b.earnings || 0) - (a.earnings || 0),
    );

  return (
    <AppScreen
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.seller} />
      }
    >
      <AppTopBar eyebrow="Борлуулагч" title="Каталог" showBack={false} />
      <AppHeader
        title="Каталог"
        subtitle="Бараагаа сонгоод referral линк үүсгэнэ."
        icon="cube-outline"
        accent={C.seller}
      />

      <View style={st.searchBox}>
        <Ionicons name="search" size={18} color={C.textMuted} />
        <TextInput
          style={st.searchInput}
          placeholder="Бараа хайх..."
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={handleSearchChange}
        />
        {search ? (
          <TouchableOpacity
            activeOpacity={0.84}
            accessibilityLabel="Хайлтыг цэвэрлэх"
            onPress={handleSearchClear}
            style={st.clearButton}
          >
            <Ionicons name="close-circle" size={18} color={C.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={st.sortRow}>
        {(['clicks', 'earnings'] as const).map((key) => (
          <TouchableOpacity
            key={key}
            activeOpacity={0.86}
            accessibilityLabel={key === 'clicks' ? 'Кликээр эрэмбэлэх' : 'Орлогоор эрэмбэлэх'}
            style={[st.sortChip, sort === key && st.sortChipActive]}
            onPress={() => handleSortPress(key)}
          >
            <Text style={[st.sortText, sort === key && st.sortTextActive]}>
              {key === 'clicks' ? 'Клик' : 'Орлого'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <AppCard style={st.emptyCard}>
          <Ionicons name="hourglass-outline" size={22} color={C.seller} />
          <Text style={st.emptyText}>Каталог ачаалж байна...</Text>
        </AppCard>
      ) : null}

      {!isLoading && filtered.length === 0 ? (
        <AppCard style={st.emptyCard}>
          <Ionicons name="cube-outline" size={24} color={C.textMuted} />
          <Text style={st.emptyText}>Одоогоор тохирох бараа алга.</Text>
          {search ? (
            <AppButton
              label="Хайлтыг цэвэрлэх"
              icon="close"
              variant="ghost"
              onPress={handleSearchClear}
            />
          ) : null}
        </AppCard>
      ) : null}

      {filtered.map((product: any, index: number) => {
        const id = product.id ?? product._id ?? product.productId;
        const routeId = encodeRouteParam(id);
        const name = getProductName(product) || 'Бараа';
        const shareUrl = product.shareUrl || (routeId ? `https://eseller.mn/product/${routeId}` : 'https://eseller.mn/store');

        return (
          <AppCard key={product.id ?? `${product.name}-${index}`} style={st.card}>
            <View style={st.productTop}>
              <View style={st.cardImg}>
                {product.image ? (
                  <Image source={{ uri: product.image }} style={st.image} />
                ) : (
                  <Ionicons name="cube" size={24} color={C.textMuted} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.productName} numberOfLines={2}>
                  {name}
                </Text>
                <Text style={st.commissionText}>
                  {product.commissionRate || product.commission || 10}% комисс
                </Text>
              </View>
            </View>

            <View style={st.metricsRow}>
              {[
                { v: product.clicks || 0, l: 'Клик' },
                { v: product.conversions || 0, l: 'Хөрвөлт' },
                { v: fmt(product.earnings || 0), l: 'Орлого' },
              ].map((metric, i) => (
                <View key={metric.l} style={st.metricCell}>
                  <Text style={[st.metricValue, i === 2 && { color: C.seller }]} numberOfLines={1}>
                    {metric.v}
                  </Text>
                  <Text style={st.metricLabel}>{metric.l}</Text>
                </View>
              ))}
            </View>

            <View style={st.actionRow}>
              <AppButton
                label="Хуулах"
                icon="copy-outline"
                variant="ghost"
                style={{ flex: 1 }}
                textStyle={{ color: C.primary }}
                onPress={() => Clipboard.setStringAsync(shareUrl)}
              />
              <AppButton
                label="Хуваалцах"
                icon="share-social-outline"
                variant="seller"
                style={{ flex: 1 }}
                onPress={() => Share.share({ message: `${name}\n${shareUrl}` })}
              />
            </View>
          </AppCard>
        );
      })}
    </AppScreen>
  );
}

const st = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
    backgroundColor: C.bgCard,
    minHeight: 46,
    borderRadius: UI.controlRadius,
    paddingHorizontal: 14,
    marginBottom: R.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, color: C.text, paddingVertical: R.md },
  clearButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortRow: { flexDirection: 'row', gap: R.sm, marginBottom: R.lg },
  sortChip: {
    backgroundColor: C.bgCard,
    minHeight: 38,
    borderRadius: R.full,
    paddingHorizontal: R.lg,
    paddingVertical: R.sm,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortChipActive: { backgroundColor: C.seller, borderColor: C.seller },
  sortText: { ...F.tiny, color: C.textSub, fontWeight: '700' },
  sortTextActive: { color: C.bgCard },
  card: { marginBottom: R.sm },
  productTop: { flexDirection: 'row', gap: R.md, marginBottom: R.md },
  cardImg: {
    width: 56,
    height: 56,
    borderRadius: UI.controlRadius,
    backgroundColor: C.bgSection,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  productName: { ...F.body, color: C.text, fontWeight: '800' },
  commissionText: { ...F.small, color: C.seller, fontWeight: '700', marginTop: 2 },
  metricsRow: { flexDirection: 'row', gap: R.sm, marginBottom: R.md },
  metricCell: {
    flex: 1,
    minHeight: 58,
    backgroundColor: C.bgSection,
    borderRadius: R.sm,
    padding: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: { ...F.body, color: C.text, fontWeight: '900' },
  metricLabel: { ...F.tiny, color: C.textMuted, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: R.sm },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: R.sm,
    marginBottom: R.md,
  },
  emptyText: { ...F.small, color: C.textSub, textAlign: 'center' },
});
