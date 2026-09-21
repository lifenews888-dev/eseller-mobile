import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { get } from '../../services/api';
import { C, R } from '../../shared/design';
import { filterPublicProducts, getProductName } from '../../shared/productQuality';
import { encodeRouteParam } from '../../shared/routeParams';
import { H } from './tokens';
import { SectionHeader } from './SectionHeader';

interface FlashItem {
  id?: string;
  _id?: string;
  name?: string;
  title?: string;
  productName?: string;
  salePrice?: number;
  originalPrice?: number;
  price?: number;
  discountPct?: number;
  images?: string[];
  emoji?: string;
}

function unwrap<T = any>(res: any): T {
  return (res?.data ?? res) as T;
}

function useCountdown(endsAt?: string | null) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setLabel('Дууссан');
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setLabel(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      );
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [endsAt]);
  return label;
}

export function FlashSaleRow() {
  const { data } = useQuery({
    queryKey: ['flash-sales-home'],
    queryFn: async () => {
      const res = await get('/search', { flashSale: true, limit: 8 });
      return unwrap<any>(res);
    },
    staleTime: 60_000,
    retry: false,
  });

  const items: FlashItem[] = filterPublicProducts(data?.items ?? data?.products ?? []);
  const countdown = useCountdown(data?.endsAt);

  if (!items.length) return null;

  return (
    <View style={{ marginBottom: 16 }}>
      <SectionHeader
        title="Хямдралтай бараа"
        icon="flash-outline"
        badge={countdown || undefined}
        badgeBg={C.errorDim}
        badgeColor={C.error}
        onMore={() =>
          router.push({ pathname: '/store', params: { sale: 'true' } } as never)
        }
        moreColor={C.error}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: H.mx, gap: H.gap2 }}
      >
        {items.map((item) => {
          const id = item.id ?? item._id;
          const routeId = encodeRouteParam(id);
          const name = getProductName(item) || 'Бараа';
          const sale = item.salePrice ?? item.price ?? 0;
          const original = item.originalPrice ?? 0;
          const pct =
            item.discountPct ??
            (original > 0 && sale > 0 ? Math.round((1 - sale / original) * 100) : 0);
          return (
            <TouchableOpacity
              key={id || name}
              accessibilityRole="button"
              accessibilityLabel={`${name} барааны дэлгэрэнгүй`}
              accessibilityState={{ disabled: !routeId }}
              disabled={!routeId}
              onPress={() => {
                if (routeId) router.push(`/product/${routeId}` as never)
              }}
              activeOpacity={0.85}
              style={{
                width: 118,
                backgroundColor: H.card,
                borderRadius: H.cardRadiusSm,
                overflow: 'hidden',
                borderWidth: 0.5,
                borderColor: H.cardBorder,
                opacity: routeId ? 1 : 0.55,
                ...H.shadow,
              }}
            >
              <View
                style={{
                  height: 88,
                  backgroundColor: C.bgSection,
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {item.images?.[0] ? (
                  <Image
                    source={{ uri: item.images[0] }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ fontSize: 32 }}>{item.emoji ?? '□'}</Text>
                )}
                {pct > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 6,
                      left: 6,
                      backgroundColor: C.error,
                      borderRadius: R.xs,
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                    }}
                  >
                    <Text style={{ color: C.bgCard, fontSize: 9, fontWeight: '900' }}>
                      -{pct}%
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ padding: 9 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 10, color: H.textSub, marginBottom: 3 }}
                >
                  {name}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '900', color: C.error }}>
                  {sale.toLocaleString()}₮
                </Text>
                {original > sale && (
                  <Text
                    style={{
                      fontSize: 9,
                      color: C.border2,
                      textDecorationLine: 'line-through',
                    }}
                  >
                    {original.toLocaleString()}₮
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
