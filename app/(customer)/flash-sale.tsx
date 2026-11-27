import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import {
  filterPublicProducts,
  firstProductImage,
  getProductName,
  getPublicProductPrice,
} from '../../src/shared/productQuality';
import { encodeRouteParam } from '../../src/shared/routeParams';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

type FlashProduct = {
  id?: string;
  _id?: string;
  name?: string;
  title?: string;
  productName?: string;
  price?: number;
  salePrice?: number;
  originalPrice?: number;
  discount?: number;
  sold?: number;
  stock?: number;
  images?: string[];
};

type FlashSale = {
  title?: string;
  endsAt?: string;
  products?: FlashProduct[];
  items?: FlashProduct[];
};

function unwrap<T = unknown>(res: any): T {
  return (res?.data ?? res) as T;
}

function useCountdown(endsAt: string) {
  const calc = () => Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
  const [secs, setSecs] = useState(calc);
  const prev = useRef(secs);

  useEffect(() => {
    const timer = setInterval(() => {
      const value = calc();
      setSecs(value);
      if (value === 0 && prev.current > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }
      prev.current = value;
    }, 1000);

    return () => clearInterval(timer);
  }, [endsAt]);

  return {
    h: String(Math.floor(secs / 3600)).padStart(2, '0'),
    m: String(Math.floor((secs % 3600) / 60)).padStart(2, '0'),
    s: String(secs % 60).padStart(2, '0'),
    ended: secs === 0,
  };
}

const fmt = (n: number) => `${(n ?? 0).toLocaleString('mn-MN')}₮`;

export default function FlashSaleScreen() {
  const fallbackEndsAt = new Date(Date.now() + 4 * 3600_000).toISOString();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['flash-sale'],
    queryFn: () => get('/flash-sales/active'),
  });

  const sale = unwrap<FlashSale>(data) || {};
  const title = sale.title || 'Хямдралтай бараа';
  const products = filterPublicProducts(sale.products ?? sale.items ?? []);
  const { h, m, s, ended } = useCountdown(sale.endsAt || fallbackEndsAt);

  return (
    <AppScreen
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.primary} />}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <AppTopBar eyebrow="Дэлгүүр" title="Flash sale" showBack={false} />
      <AppHeader
        title="Flash sale"
        subtitle="Хугацаатай хямдрал, Gold гишүүний эрт нэвтрэх боломж."
        icon="flash-outline"
        accent={C.seller}
      />

      <AppCard elevated style={st.countdownCard}>
        <View style={st.countdownHead}>
          <View style={st.flashIcon}>
            <Ionicons name="flash" size={22} color={C.seller} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.saleTitle}>{title}</Text>
            <Text style={st.saleSub}>{ended ? 'Хямдрал дууссан' : 'Дуусах хүртэл'}</Text>
          </View>
        </View>
        <View style={st.timerRow}>
          {[h, m, s].map((value, index) => (
            <View key={`${value}-${index}`} style={st.timerGroup}>
              {index > 0 ? <Text style={st.timerColon}>:</Text> : null}
              <View style={st.timerBox}>
                <Text style={st.timerText}>{value}</Text>
              </View>
            </View>
          ))}
        </View>
      </AppCard>

      {isLoading ? (
        <AppCard style={st.loadingCard}>
          <ActivityIndicator color={C.primary} />
        </AppCard>
      ) : products.length === 0 ? (
        <AppCard style={st.emptyCard}>
          <Ionicons name="flash-outline" size={42} color={C.textMuted} />
          <Text style={st.emptyTitle}>Идэвхтэй хямдрал алга</Text>
          <Text style={st.emptyText}>Дараагийн flash sale эхлэхэд энд бараанууд харагдана.</Text>
          <AppButton label="Дэлгүүр үзэх" icon="bag-outline" variant="secondary" onPress={() => router.push('/store' as any)} />
        </AppCard>
      ) : (
        <View style={st.grid}>
          {products.map((product, index) => (
            <ProductCard key={`${product.id || product.name || 'flash'}-${index}`} product={product} />
          ))}
        </View>
      )}
    </AppScreen>
  );
}

function ProductCard({ product }: { product: FlashProduct }) {
  const id = product.id ?? product._id;
  const routeId = encodeRouteParam(id);
  const name = getProductName(product) || 'Хямдралтай бараа';
  const price = getPublicProductPrice(product);
  const image = firstProductImage(product, '');
  const original = product.originalPrice;
  const discount = product.discount || (original ? Math.max(0, Math.round((1 - price / original) * 100)) : 0);
  const sold = product.sold || 0;
  const stock = product.stock || 50;
  const percent = Math.min(100, Math.max(0, Math.round((sold / Math.max(1, stock)) * 100)));

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      accessibilityRole="button"
      accessibilityLabel={`${name} барааны дэлгэрэнгүй`}
      accessibilityState={{ disabled: !routeId }}
      disabled={!routeId}
      style={[st.productTap, !routeId && { opacity: 0.55 }]}
      onPress={() => {
        if (routeId) router.push(`/product/${routeId}` as any);
      }}
    >
      <AppCard style={st.productCard}>
        {discount > 0 ? (
          <View style={st.discountBadge}>
            <Text style={st.discountText}>-{discount}%</Text>
          </View>
        ) : null}
        <View style={st.imageWrap}>
          {image ? (
            <Image source={{ uri: image }} style={st.image} />
          ) : (
            <Ionicons name="flash-outline" size={34} color={C.seller} />
          )}
        </View>
        <Text style={st.productName} numberOfLines={2}>
          {name}
        </Text>
        <View style={st.priceRow}>
          <Text style={st.price}>{fmt(price)}</Text>
          {original ? <Text style={st.originalPrice}>{fmt(original)}</Text> : null}
        </View>
        <View style={st.stockBar}>
          <View style={[st.stockFill, { width: `${percent}%` }]} />
        </View>
        <Text style={st.stockText}>{sold}/{stock} зарагдсан</Text>
      </AppCard>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  countdownCard: { gap: R.md, marginBottom: R.md },
  countdownHead: { flexDirection: 'row', alignItems: 'center', gap: R.md },
  flashIcon: {
    width: UI.iconBox,
    height: UI.iconBox,
    borderRadius: UI.controlRadius,
    backgroundColor: `${C.seller}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saleTitle: { ...F.h3, color: C.text },
  saleSub: { ...F.small, color: C.textSub, marginTop: 2 },
  timerRow: { flexDirection: 'row', alignItems: 'center' },
  timerGroup: { flexDirection: 'row', alignItems: 'center' },
  timerBox: {
    minWidth: 48,
    minHeight: 42,
    borderRadius: UI.controlRadius,
    backgroundColor: C.bgSection,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 20,
    fontWeight: '900',
    color: C.text,
    fontVariant: ['tabular-nums'],
  },
  timerColon: {
    fontSize: 20,
    fontWeight: '900',
    color: C.textMuted,
    marginHorizontal: R.xs,
  },
  goldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
    borderColor: `${C.gold}30`,
    marginBottom: R.md,
  },
  goldIcon: {
    width: 40,
    height: 40,
    borderRadius: UI.controlRadius,
    backgroundColor: C.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldTitle: { ...F.small, color: C.text, fontWeight: '800' },
  goldText: { ...F.tiny, color: C.textSub, marginTop: 2 },
  loadingCard: { minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { alignItems: 'center', gap: R.sm },
  emptyTitle: { ...F.h4, color: C.text, textAlign: 'center' },
  emptyText: { ...F.small, color: C.textSub, textAlign: 'center', lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: R.sm },
  productTap: { width: '48%' },
  productCard: { minHeight: 242, padding: R.sm, position: 'relative' },
  discountBadge: {
    position: 'absolute',
    top: R.sm,
    left: R.sm,
    zIndex: 1,
    backgroundColor: C.seller,
    borderRadius: R.sm,
    paddingHorizontal: R.xs,
    paddingVertical: 2,
  },
  discountText: { ...F.tiny, color: C.bgCard, fontWeight: '900' },
  imageWrap: {
    height: 104,
    borderRadius: UI.controlRadius,
    backgroundColor: C.bgSection,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: R.sm,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  productName: { ...F.small, color: C.text, fontWeight: '800', minHeight: 36 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: R.xs, marginTop: R.xs, marginBottom: R.sm },
  price: { ...F.body, color: C.seller, fontWeight: '900' },
  originalPrice: { ...F.tiny, color: C.textMuted, textDecorationLine: 'line-through' },
  stockBar: {
    height: 5,
    backgroundColor: C.bgSection,
    borderRadius: R.full,
    overflow: 'hidden',
  },
  stockFill: { height: '100%', backgroundColor: C.gold, borderRadius: R.full },
  stockText: { ...F.tiny, color: C.textMuted, textAlign: 'center', marginTop: 4 },
});
