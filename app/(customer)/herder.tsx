import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Alert, View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';

import {
  HERDER_BRAND as BRAND,
  PROVINCES,
  CATEGORIES,
  HerderAPI,
  ProductListSkeleton,
  buildHerderCartItem,
  useProvinceDays,
  type HerderProduct,
} from '../../src/features/herder';
import { useAimagDeliveryMap } from '../../src/config/remoteFlags';
import { useCart } from '../../src/store/cart';
import { C, R, UI } from '../../src/shared/design';
import {
  filterPublicProducts,
  firstProductImage,
  getPublicProductPrice,
  getPublicProductQualityIssue,
} from '../../src/shared/productQuality';
import { useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

function fmt(n: number) { return n.toLocaleString() + '₮'; }

const FILTER_DEBOUNCE_MS = 300;

function normalizeProvinceParam(value?: string | string[] | null) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return PROVINCES.some((province) => province.code === normalized) ? normalized : null;
}

function normalizeCategoryParam(value?: string | string[] | null) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return (CATEGORIES as readonly string[]).includes(normalized) ? normalized : null;
}

export default function HerderScreen() {
  const params = useLocalSearchParams<{ province?: string; category?: string }>();
  const layout = useAppLayoutMetrics();
  const [province, setProvince]         = useState<string | null>(() => normalizeProvinceParam(params.province));
  const [category, setCategory]         = useState<string | null>(() => normalizeCategoryParam(params.category));
  const [products, setProducts]         = useState<HerderProduct[]>([]);
  const [loading, setLoading]           = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [showProvinces, setShowProvinces] = useState(() => !normalizeProvinceParam(params.province));

  const addToCart = useCart((s) => s.add);

  useEffect(() => {
    setProvince(normalizeProvinceParam(params.province));
    setCategory(normalizeCategoryParam(params.category));
  }, [params.province, params.category]);

  const replaceHerderRoute = (patch: { province?: string | null; category?: string | null }) => {
    const nextProvince = patch.province !== undefined ? patch.province : province;
    const nextCategory = patch.category !== undefined ? patch.category : category;
    const routeParams: Record<string, string> = {};

    if (nextProvince) routeParams.province = nextProvince;
    if (nextCategory) routeParams.category = nextCategory;

    router.replace(
      Object.keys(routeParams).length
        ? ({ pathname: '/herder' as any, params: routeParams } as any)
        : ('/herder' as any),
    );
  };

  const selectProvince = (nextProvince: string | null) => {
    setProvince(nextProvince);
    replaceHerderRoute({ province: nextProvince });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const selectCategory = (nextCategory: string | null) => {
    setCategory(nextCategory);
    replaceHerderRoute({ category: nextCategory });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await HerderAPI.list({
        limit:    20,
        province: province ?? undefined,
        category: category ?? undefined,
      });
      setProducts(filterPublicProducts(data.products));
    } catch (e: any) {
      setError(e?.message || 'Сүлжээний алдаа');
    }
    setLoading(false);
    setRefreshing(false);
  }, [province, category]);

  // Debounce filter-triggered refetches so rapid chip taps don't spam the API.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; load(); return; }
    const t = setTimeout(() => load(), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [load]);

  const selectedProvince = PROVINCES.find((p) => p.code === province);
  const selectedProvinceDays = useProvinceDays(province);
  const deliveryMap = useAimagDeliveryMap();

  const buyNow = (product: HerderProduct) => {
    const issue = getPublicProductQualityIssue(product);
    if (issue) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      Alert.alert('Бараа шалгалтад байна', issue.message);
      return;
    }

    const cartItem = buildHerderCartItem(product);
    if (!cartItem) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }

    addToCart(cartItem, 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push('/cart' as never);
  };

  const openDetail = (product: HerderProduct) => {
    Haptics.selectionAsync().catch(() => {});
    router.push(`/herder-product/${product.id}` as never);
  };

  return (
    <View style={s.root}>
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={BRAND} />}
    >
      <View style={[s.hero, { paddingTop: layout.screenTop }]}>
        <Text style={s.heroTitle}>Малчнаас шууд</Text>
        <Text style={s.heroSub}>Байгалийн бүтээгдэхүүнийг шууд захиалаарай</Text>
      </View>

      <View style={s.section}>
        <TouchableOpacity style={s.sectionHeader} onPress={() => setShowProvinces(!showProvinces)} activeOpacity={0.7}>
          <View style={s.row}>
            <Ionicons name="location-outline" size={20} color={BRAND} />
            <Text style={s.sectionTitle}>{selectedProvince ? selectedProvince.name : 'Аймаг сонгох'}</Text>
          </View>
          <Ionicons name={showProvinces ? 'chevron-up' : 'chevron-down'} size={20} color={C.textMuted} />
        </TouchableOpacity>

        {showProvinces && (
          <View style={s.provinceGrid}>
            <TouchableOpacity
              style={[s.provinceChip, !province && s.provinceChipActive]}
              onPress={() => selectProvince(null)}
              activeOpacity={0.7}
            >
              <Text style={[s.provinceText, !province && s.provinceTextActive]}>Бүгд</Text>
            </TouchableOpacity>
            {PROVINCES.map((p) => (
              <TouchableOpacity
                key={p.code}
                style={[s.provinceChip, province === p.code && s.provinceChipActive]}
                onPress={() => {
                  selectProvince(province === p.code ? null : p.code);
                  setShowProvinces(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[s.provinceText, province === p.code && s.provinceTextActive]}>{p.name}</Text>
                <Text style={[s.provinceDays, province === p.code && s.provinceDaysActive]}>{deliveryMap[p.code] ?? p.days} хоног</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Ангилал</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
          <TouchableOpacity
            style={[s.chip, !category && s.chipActive]}
            onPress={() => selectCategory(null)}
          >
            <Text style={[s.chipText, !category && s.chipTextActive]}>Бүгд</Text>
          </TouchableOpacity>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[s.chip, category === cat && s.chipActive]}
              onPress={() => {
                selectCategory(category === cat ? null : cat);
              }}
            >
              <Text style={[s.chipText, category === cat && s.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {error && products.length > 0 && (
        <View style={s.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color={C.gold} />
          <Text style={s.offlineText}>Сүлжээгүй — хадгалсан мэдээлэл харуулж байна</Text>
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionTitle}>Бүтээгдэхүүн</Text>
        {loading ? (
          <ProductListSkeleton count={3} />
        ) : error && products.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="cloud-offline-outline" size={48} color={C.textMuted} />
            <Text style={s.emptyText}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => load()} activeOpacity={0.85}>
              <Ionicons name="refresh" size={16} color={C.bgCard} />
              <Text style={s.retryText}>Дахин оролдох</Text>
            </TouchableOpacity>
          </View>
        ) : products.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="leaf-outline" size={48} color={C.textMuted} />
            <Text style={s.emptyText}>Одоогоор бүтээгдэхүүн байхгүй</Text>
          </View>
        ) : (
          <View style={s.productGrid}>
            {products.map((product) => {
              const image = firstProductImage(product, '');
              const price = getPublicProductPrice(product);
              const showOriginalPrice = Number(product.salePrice || 0) > 0 && price < product.price;

              return (
                <TouchableOpacity
                  key={product.id}
                  style={s.productCard}
                  onPress={() => openDetail(product)}
                  activeOpacity={0.85}
                >
                  <View style={s.productImage}>
                    {image ? (
                      <Image source={{ uri: image }} style={s.productImg} resizeMode="cover" />
                    ) : (
                      <View style={s.productImgPlaceholder}>
                        <Ionicons name="leaf-outline" size={32} color={C.textMuted} />
                      </View>
                    )}
                    {product.herder?.isVerified && (
                      <View style={s.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={C.bgCard} />
                        <Text style={s.verifiedText}>Баталгаатай</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.productInfo}>
                    <Text style={s.productName} numberOfLines={2}>{product.name}</Text>
                    {product.herder && (
                      <View style={s.herderRow}>
                        <Ionicons name="location-outline" size={12} color={C.textMuted} />
                        <Text style={s.herderText} numberOfLines={1}>
                          {product.herder.herderName} — {product.herder.provinceName}
                        </Text>
                      </View>
                    )}
                    <View style={s.priceRow}>
                      <Text style={s.salePrice}>{fmt(price)}</Text>
                      {showOriginalPrice ? <Text style={s.oldPrice}>{fmt(product.price)}</Text> : null}
                    </View>
                    {product.herder && selectedProvince && selectedProvinceDays && (
                      <View style={s.deliveryRow}>
                        <Ionicons name="car-outline" size={12} color={C.textMuted} />
                        <Text style={s.deliveryText}>{selectedProvinceDays} хоногт хүргэнэ</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={s.orderBtn}
                      onPress={(e) => { e.stopPropagation?.(); buyNow(product); }}
                      activeOpacity={0.8}
                    >
                      <Text style={s.orderBtnText}>Шууд захиалах</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ height: layout.screenBottom }} />
    </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hero: { backgroundColor: BRAND, paddingHorizontal: UI.screenPad, paddingBottom: R.xxl, borderBottomLeftRadius: R.xxl, borderBottomRightRadius: R.xxl },
  heroTitle: { fontSize: 28, fontWeight: '800', color: C.bgCard, marginBottom: 4 },
  heroSub: { fontSize: 15, color: C.secondaryDim, lineHeight: 22 },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  provinceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  provinceChip: { backgroundColor: C.bgCard, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.border, minWidth: 100 },
  provinceChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  provinceText: { fontSize: 14, fontWeight: '600', color: C.textSub },
  provinceTextActive: { color: C.bgCard },
  provinceDays: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  provinceDaysActive: { color: C.secondaryDim },
  chipScroll: { marginTop: 4 },
  chip: { backgroundColor: C.bgCard, borderRadius: R.full, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: C.border, marginRight: 8 },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { fontSize: 14, fontWeight: '600', color: C.textSub },
  chipTextActive: { color: C.bgCard },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, color: C.textMuted, marginTop: 12, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BRAND, paddingHorizontal: 16, paddingVertical: 10, borderRadius: R.md, marginTop: 16 },
  retryText: { color: C.bgCard, fontSize: 14, fontWeight: '700' },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.goldDim, paddingHorizontal: 16, paddingVertical: 8, marginTop: 12, marginHorizontal: 16, borderRadius: R.sm },
  offlineText: { fontSize: 12, color: C.gold, fontWeight: '600' },
  productGrid: { gap: 12 },
  productCard: { backgroundColor: C.bgCard, borderRadius: R.lg, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  productImage: { height: 180, backgroundColor: C.bgSection, position: 'relative' },
  productImg: { width: '100%', height: '100%' },
  productImgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  verifiedBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: BRAND, borderRadius: R.full, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 10, color: C.bgCard, fontWeight: '600' },
  productInfo: { padding: 14 },
  productName: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 },
  herderRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  herderText: { fontSize: 12, color: C.textSub, flex: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  salePrice: { fontSize: 17, fontWeight: '800', color: BRAND },
  oldPrice: { fontSize: 13, color: C.textMuted, textDecorationLine: 'line-through' },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  deliveryText: { fontSize: 12, color: C.textSub },
  orderBtn: { backgroundColor: BRAND, borderRadius: R.md, paddingVertical: 10, alignItems: 'center' },
  orderBtnText: { color: C.bgCard, fontSize: 14, fontWeight: '700' },
});
