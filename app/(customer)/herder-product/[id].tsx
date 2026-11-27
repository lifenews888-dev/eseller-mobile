import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  Dimensions, Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  HERDER_BRAND as BRAND,
  PROVINCES,
  HerderAPI,
  buildHerderCartItem,
  getHerderUnitPrice,
  useProvinceDays,
} from '../../../src/features/herder';
import { useMalchnaasEnabled } from '../../../src/config/remoteFlags';
import { useCart } from '../../../src/store/cart';
import { C, R, UI } from '../../../src/shared/design';
import { getPublicProductQualityIssue } from '../../../src/shared/productQuality';
import { encodeRouteParam } from '../../../src/shared/routeParams';
import { AppTopBar, useAppLayoutMetrics } from '../../../src/shared/ui/AppUI';

const { width } = Dimensions.get('window');

function fmt(n: number) { return n.toLocaleString() + '₮'; }

export default function HerderProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const layout = useAppLayoutMetrics();
  const add = useCart((s) => s.add);
  const malchnaasEnabled = useMalchnaasEnabled();

  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['herder-product', id],
    queryFn:  () => HerderAPI.detail(String(id)),
    enabled:  !!id && malchnaasEnabled,
  });

  // Hook must run before any early return — safely handles undefined code.
  const provinceDays = useProvinceDays(product?.herder?.province);

  if (!malchnaasEnabled) {
    return (
      <View style={s.centerScreen}>
        <Ionicons name="leaf-outline" size={48} color={C.textMuted} />
        <Text style={s.muted}>Малчнаас шууд одоогоор идэвхгүй байна.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={s.centerScreen}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  if (isError || !product) {
    return (
      <View style={s.centerScreen}>
        <Ionicons name="alert-circle-outline" size={48} color={C.textMuted} />
        <Text style={s.muted}>Бүтээгдэхүүн олдсонгүй.</Text>
        <TouchableOpacity style={s.secondaryBtn} onPress={() => router.back()}>
          <Text style={s.secondaryBtnText}>Буцах</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const p = product;
  const images = p.images ?? [];
  const unitPrice = getHerderUnitPrice(p) ?? 0;
  const total = unitPrice * qty;
  const province = PROVINCES.find((pr) => pr.code === p.herder?.province);
  const qualityIssue = getPublicProductQualityIssue(p);
  const herderRouteId = encodeRouteParam(p.herder?.id);

  const addToCart = () => {
    if (qualityIssue) {
      Alert.alert('Бараа шалгалтад байна', qualityIssue.message);
      return;
    }

    const cartItem = buildHerderCartItem(p);
    if (!cartItem) {
      Alert.alert('Үнэ шалгах шаардлагатай', 'Энэ барааны үнэ баталгаажаагүй байна.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    add(cartItem, qty);
    Alert.alert(
      'Сагсанд нэмлээ',
      `${p.name} × ${qty}`,
      [
        { text: 'Үргэлжлүүлэх' },
        { text: 'Сагс харах', onPress: () => router.push('/cart' as never) },
      ],
    );
  };

  const buyNow = () => {
    if (qualityIssue) {
      Alert.alert('Бараа шалгалтад байна', qualityIssue.message);
      return;
    }

    const cartItem = buildHerderCartItem(p);
    if (!cartItem) {
      Alert.alert('Үнэ шалгах шаардлагатай', 'Энэ барааны үнэ баталгаажаагүй байна.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    add(cartItem, qty);
    router.push('/cart' as never);
  };

  return (
    <View style={s.root}>
      <View style={[s.topBarWrap, { paddingTop: layout.screenTop }]}>
        <AppTopBar eyebrow="Малчнаас" title={p.name} style={{ marginBottom: 0 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: layout.screenBottom + 50 }}>
        {/* Image carousel */}
        <View style={{ height: 340, backgroundColor: C.bgSection, position: 'relative' }}>
          {images.length > 0 ? (
            <ScrollView
              horizontal pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
            >
              {images.map((uri, i) => (
                <Image key={i} source={{ uri }} style={{ width, height: 340 }} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <View style={s.imgPlaceholder}>
              <Ionicons name="leaf-outline" size={64} color={C.textMuted} />
            </View>
          )}

          {p.herder?.isVerified && (
            <View style={s.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={C.bgCard} />
              <Text style={s.verifiedText}>Баталгаажсан малчин</Text>
            </View>
          )}

          {images.length > 1 && (
            <View style={s.pager}>
              {images.map((_, i) => (
                <View key={i} style={[s.dot, i === imgIdx && s.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* Title + price */}
        <View style={s.sectionPadded}>
          <Text style={s.title}>{p.name}</Text>
          <View style={s.priceRow}>
            {p.salePrice ? (
              <>
                <Text style={s.salePrice}>{fmt(p.salePrice)}</Text>
                <Text style={s.oldPrice}>{fmt(p.price)}</Text>
              </>
            ) : (
              <Text style={s.salePrice}>{fmt(p.price)}</Text>
            )}
          </View>
          {p.category && (
            <View style={s.tagRow}>
              <View style={s.tag}><Text style={s.tagText}>{p.category}</Text></View>
              {p.requiresColdChain && (
                <View style={[s.tag, { backgroundColor: C.primaryDim }]}>
                  <Ionicons name="snow-outline" size={12} color={C.primary} />
                  <Text style={[s.tagText, { color: C.primary }]}>Хөргөлттэй</Text>
                </View>
              )}
            </View>
          )}
          {qualityIssue ? (
            <View style={s.qualityCard}>
              <Ionicons name="shield-checkmark-outline" size={16} color={C.gold} />
              <Text style={s.qualityText}>{qualityIssue.message}</Text>
            </View>
          ) : null}
        </View>

        {/* Herder card */}
        {p.herder && (
          <View style={s.sectionPadded}>
            <Text style={s.sectionTitle}>Малчин</Text>
            <TouchableOpacity
              style={[s.herderCard, !herderRouteId && { opacity: 0.55 }]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${p.herder.herderName || 'Малчин'} профайл нээх`}
              accessibilityState={{ disabled: !herderRouteId }}
              disabled={!herderRouteId}
              onPress={() => {
                if (herderRouteId) router.push(`/herder-profile/${herderRouteId}` as never);
              }}
            >
              <View style={s.herderAvatar}>
                <Ionicons name="person" size={22} color={BRAND} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.herderName}>{p.herder.herderName}</Text>
                <View style={s.herderMeta}>
                  <Ionicons name="location-outline" size={12} color={C.textSub} />
                  <Text style={s.herderMetaText}>
                    {p.herder.provinceName} · {p.herder.district}
                  </Text>
                </View>
                {typeof p.herder.rating === 'number' && (
                  <View style={s.herderMeta}>
                    <Ionicons name="star" size={12} color={C.gold} />
                    <Text style={s.herderMetaText}>
                      {p.herder.rating.toFixed(1)}
                      {p.herder.orderCount ? ` · ${p.herder.orderCount} захиалга` : ''}
                    </Text>
                  </View>
                )}
              </View>
              {herderRouteId ? (
                <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
              ) : null}
            </TouchableOpacity>
          </View>
        )}

        {/* Delivery */}
        {province && (
          <View style={s.sectionPadded}>
            <Text style={s.sectionTitle}>Хүргэлт</Text>
            <View style={s.infoRow}>
              <Ionicons name="car-outline" size={18} color={BRAND} />
              <Text style={s.infoText}>
                {province.name} → УБ · {provinceDays ?? province.days} хоног
              </Text>
            </View>
          </View>
        )}

        {/* Description */}
        {p.description && (
          <View style={s.sectionPadded}>
            <Text style={s.sectionTitle}>Тайлбар</Text>
            <Text style={s.body}>{p.description}</Text>
          </View>
        )}

        {/* Qty + stock */}
        <View style={s.sectionPadded}>
          <View style={s.qtyRow}>
            <Text style={s.sectionTitle}>Тоо хэмжээ</Text>
            <View style={s.qtyControls}>
              <TouchableOpacity
                style={s.qtyBtn}
                onPress={() => setQty(Math.max(1, qty - 1))}
              >
                <Ionicons name="remove" size={18} color={C.text} />
              </TouchableOpacity>
              <Text style={s.qtyText}>{qty}</Text>
              <TouchableOpacity
                style={s.qtyBtn}
                onPress={() => setQty(qty + 1)}
              >
                <Ionicons name="add" size={18} color={C.text} />
              </TouchableOpacity>
            </View>
          </View>
          {typeof p.stock === 'number' && (
            <Text style={s.stockText}>Үлдэгдэл: {p.stock}</Text>
          )}
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={[s.bottomBar, { paddingBottom: layout.insets.bottom + R.lg }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.totalLabel}>Нийт</Text>
          <Text style={s.totalValue}>{fmt(total)}</Text>
        </View>
        <TouchableOpacity
          style={[s.secondaryAction, qualityIssue && s.disabledAction]}
          onPress={addToCart}
          disabled={!!qualityIssue}
          accessibilityState={{ disabled: !!qualityIssue }}
          activeOpacity={0.8}
        >
          <Ionicons name="cart-outline" size={18} color={BRAND} />
          <Text style={s.secondaryActionText}>Сагсанд</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.primaryAction, qualityIssue && s.disabledAction]}
          onPress={buyNow}
          disabled={!!qualityIssue}
          accessibilityState={{ disabled: !!qualityIssue }}
          activeOpacity={0.8}
        >
          <Text style={s.primaryActionText}>{qualityIssue ? 'Шалгалтад байна' : 'Шууд захиалах'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centerScreen: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
  muted: { color: C.textSub, fontSize: 15 },

  imgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBarWrap: { paddingHorizontal: R.lg, paddingBottom: R.md, backgroundColor: C.bg },
  verifiedBadge: { position: 'absolute', top: 50, right: 16, backgroundColor: BRAND, borderRadius: R.md, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 11, color: C.bgCard, fontWeight: '700' },
  pager: { position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: R.full, backgroundColor: C.bgCard + '80' },
  dotActive: { backgroundColor: C.bgCard, width: 18 },

  sectionPadded: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.textSub, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 8 },
  salePrice: { fontSize: 26, fontWeight: '900', color: BRAND },
  oldPrice: { fontSize: 15, color: C.textMuted, textDecorationLine: 'line-through' },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.secondaryDim, borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, fontWeight: '700', color: C.secondary },
  qualityCard: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.goldDim, borderRadius: R.md, padding: 10, marginTop: 8 },
  qualityText: { flex: 1, fontSize: 12, color: C.textSub, lineHeight: 17 },

  herderCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bgCard, borderRadius: R.md, padding: 12, borderWidth: 1, borderColor: C.border },
  herderAvatar: { width: 44, height: 44, borderRadius: R.full, backgroundColor: C.secondaryDim, justifyContent: 'center', alignItems: 'center' },
  herderName: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 },
  herderMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  herderMetaText: { fontSize: 12, color: C.textSub },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, color: C.text },

  body: { fontSize: 14, color: C.textSub, lineHeight: 22 },

  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bgSection, borderRadius: R.md, padding: 4 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.bgCard, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 16, fontWeight: '700', color: C.text, minWidth: 24, textAlign: 'center' },
  stockText: { fontSize: 12, color: C.textSub, marginTop: 8 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.bgCard, borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  totalLabel: { fontSize: 11, color: C.textSub },
  totalValue: { fontSize: 18, fontWeight: '800', color: BRAND },
  secondaryAction: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: BRAND, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12 },
  secondaryActionText: { color: BRAND, fontSize: 13, fontWeight: '700' },
  primaryAction: { backgroundColor: BRAND, borderRadius: R.md, paddingHorizontal: 20, paddingVertical: 12 },
  primaryActionText: { color: C.bgCard, fontSize: 14, fontWeight: '800' },
  disabledAction: { opacity: 0.5 },
  secondaryBtn: { borderWidth: 1, borderColor: BRAND, borderRadius: R.md, paddingHorizontal: 18, paddingVertical: 10 },
  secondaryBtnText: { color: BRAND, fontWeight: '700' },
});
