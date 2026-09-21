import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LiveAPI, type LiveStreamItem } from '../services/api';
import { C, F, R } from '../shared/design';
import { encodeRouteParam } from '../shared/routeParams';
import { AppCard } from '../shared/ui/AppUI';

export function LiveCarousel() {
  const [isFocused, setIsFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  const { data, isLoading } = useQuery({
    queryKey: ['live', 'active'],
    queryFn: () => LiveAPI.getActive(),
    refetchInterval: isFocused ? 30_000 : false,
    staleTime: 20_000,
  });

  const raw: any = data ?? {};
  const list: LiveStreamItem[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.data)
      ? raw.data
      : Array.isArray(raw.streams)
        ? raw.streams
        : Array.isArray(raw?.data?.streams)
          ? raw.data.streams
          : [];

  if (!isLoading && list.length === 0) return null;

  return (
    <View style={{ marginBottom: 20 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          marginBottom: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.error }} />
          <Text style={{ ...F.h3, color: C.text }}>Одоо Live</Text>
        </View>
        <TouchableOpacity activeOpacity={0.86} onPress={() => router.push('/live' as any)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={{ color: C.error, fontSize: 13, fontWeight: '700' }}>Бүгдийг харах</Text>
            <Ionicons name="chevron-forward" size={14} color={C.error} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
      >
        {isLoading
          ? [1, 2, 3].map((item) => (
              <View
                key={item}
                style={{
                  width: 180,
                  height: 160,
                  backgroundColor: C.bgSection,
                  borderRadius: R.lg,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              />
            ))
          : list.map((stream, index) => <LiveCard key={stream.id || `${stream.title}-${index}`} stream={stream} />)}
      </ScrollView>
    </View>
  );
}

function LiveCard({ stream }: { stream: LiveStreamItem }) {
  const id = stream.id ?? (stream as any)._id;
  const routeId = encodeRouteParam(id);
  const viewerCount = stream.viewerCount ?? 0;
  const productCount = stream.products?.length ?? 0;
  const shopName = stream.shop?.name ?? 'Дэлгүүр';

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      accessibilityRole="button"
      accessibilityLabel={`${stream.title || 'Live'} live нээх`}
      accessibilityState={{ disabled: !routeId }}
      disabled={!routeId}
      onPress={() => {
        if (routeId) router.push(`/live/${routeId}` as any)
      }}
      style={!routeId ? { opacity: 0.55 } : undefined}
    >
      <AppCard style={{ width: 180, padding: 0, overflow: 'hidden' }}>
        <View
          style={{
            height: 100,
            backgroundColor: C.bgSection,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {stream.thumbnailUrl ? (
            <Image source={{ uri: stream.thumbnailUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Ionicons name="videocam-outline" size={34} color={C.textMuted} />
          )}

          <View
            style={{
              position: 'absolute',
              top: 6,
              left: 6,
              backgroundColor: C.error,
              borderRadius: R.xs,
              paddingHorizontal: 6,
              paddingVertical: 2,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.bgCard }} />
            <Text style={{ color: C.bgCard, fontSize: 9, fontWeight: '900' }}>LIVE</Text>
          </View>

          <View
            style={{
              position: 'absolute',
              bottom: 6,
              right: 6,
                  backgroundColor: C.text + '9E',
              borderRadius: R.full,
              paddingHorizontal: 6,
              paddingVertical: 2,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Ionicons name="eye" size={10} color={C.bgCard} />
            <Text style={{ color: C.bgCard, fontSize: 9, fontWeight: '700' }}>
              {viewerCount.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={{ padding: 10 }}>
          <Text style={{ ...F.small, color: C.text, fontWeight: '800' }} numberOfLines={1}>
            {stream.title}
          </Text>
          <Text style={{ ...F.tiny, color: C.textMuted, marginTop: 3 }} numberOfLines={1}>
            {shopName}
            {productCount > 0 && ` · ${productCount} бараа`}
          </Text>
        </View>
      </AppCard>
    </TouchableOpacity>
  );
}
