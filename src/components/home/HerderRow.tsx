import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { HerderAPI, HomeRowSkeleton } from '../../features/herder';
import { useMalchnaasEnabled } from '../../config/remoteFlags';
import { C } from '../../shared/design';
import {
  filterPublicProducts,
  firstProductImage,
  getPublicProductPrice,
} from '../../shared/productQuality';
import { H } from './tokens';
import { SectionHeader } from './SectionHeader';

export function HerderRow({ showHeader = true }: { showHeader?: boolean } = {}) {
  const malchnaasEnabled = useMalchnaasEnabled();
  const { data, isLoading } = useQuery({
    queryKey: ['herder-home'],
    queryFn:  () => HerderAPI.list({ limit: 6 }),
    staleTime: 120_000,
    retry:     false,
    enabled:   malchnaasEnabled,
  });

  if (!malchnaasEnabled) return null;

  const products = filterPublicProducts(data?.products ?? []);

  if (!isLoading && !products.length) return null;

  return (
    <View style={{ marginBottom: 16 }}>
      {showHeader && <SectionHeader
        title="Малчны булан"
        icon="leaf-outline"
        badge="Шинэ"
        badgeBg={C.secondaryDim}
        badgeColor={C.secondary}
        onMore={() => router.push('/herder' as never)}
        moreColor={C.secondary}
      />}
      {isLoading ? (
        <HomeRowSkeleton count={4} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: H.mx, gap: H.gap2 }}
        >
          {products.map((item) => {
            const image = firstProductImage(item, '');
            const price = getPublicProductPrice(item);

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push(`/herder-product/${item.id}` as never)}
                activeOpacity={0.85}
                style={{
                  width: 134,
                  backgroundColor: H.card,
                  borderRadius: H.cardRadius,
                  overflow: 'hidden',
                  borderWidth: 0.5,
                  borderColor: H.cardBorder,
                  ...H.shadow,
                }}
              >
                <View
                  style={{
                    height: 88,
                    backgroundColor: C.secondaryDim,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {image ? (
                    <Image
                      source={{ uri: image }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={{ fontSize: 34 }}>□</Text>
                  )}
                </View>
                <View style={{ padding: 10 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: H.textPrimary,
                      marginBottom: 3,
                    }}
                  >
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: C.secondary }}>
                    {price.toLocaleString()}₮
                  </Text>
                  {item.herder?.provinceName && (
                    <Text style={{ fontSize: 9, color: H.textHint, marginTop: 2 }}>
                      {item.herder.provinceName}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
