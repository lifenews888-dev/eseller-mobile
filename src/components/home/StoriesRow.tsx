import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { get } from '../../services/api';
import { C, R } from '../../shared/design';
import { H } from './tokens';

interface Story {
  id: string;
  shopName?: string;
  shopLogo?: string | null;
  thumbnailUrl?: string | null;
  seen?: boolean;
}

function unwrap<T = any>(res: any): T {
  return (res?.data ?? res) as T;
}

export function StoriesRow() {
  const { data } = useQuery({
    queryKey: ['stories-home'],
    queryFn: async () => {
      const res = await get('/stories');
      return unwrap<{ stories?: Story[] } | Story[]>(res);
    },
    staleTime: 30_000,
    retry: false,
  });

  const stories: Story[] = Array.isArray(data)
    ? data
    : (data as any)?.stories ?? [];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: H.mx,
        gap: 14,
        paddingVertical: 4,
      }}
      style={{ marginBottom: 4 }}
    >
      {/* Add */}
      <TouchableOpacity
        onPress={() => router.push('/feed/create' as never)}
        style={{ alignItems: 'center', gap: 5, width: 64 }}
      >
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: R.full,
            backgroundColor: C.bgCard,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: H.primary,
            borderStyle: 'dashed',
          }}
        >
          <Ionicons name="add" size={24} color={H.primary} />
        </View>
        <Text
          style={{
            fontSize: 10,
            color: C.textSub,
            fontWeight: '600',
          }}
        >
          Нэмэх
        </Text>
      </TouchableOpacity>

      {stories.map((s) => (
        <TouchableOpacity
          key={s.id}
          onPress={() => router.push(`/feed/${s.id}` as never)}
          style={{ alignItems: 'center', gap: 5, width: 64 }}
        >
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: R.full,
              borderWidth: 2.5,
              borderColor: s.seen ? C.border2 : H.primary,
              padding: 2,
            }}
          >
            <View
              style={{
                flex: 1,
                borderRadius: R.full,
                backgroundColor: C.bgSection,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {s.thumbnailUrl ? (
                <Image
                  source={{ uri: s.thumbnailUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : s.shopLogo && /^https?:\/\//.test(s.shopLogo) ? (
                <Image
                  source={{ uri: s.shopLogo }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : s.shopLogo ? (
                <Text style={{ fontSize: 22 }}>{s.shopLogo}</Text>
              ) : (
                <Ionicons name="storefront-outline" size={24} color={C.textMuted} />
              )}
            </View>
          </View>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 10,
              color: C.textSub,
              fontWeight: '600',
              maxWidth: 60,
              textAlign: 'center',
            }}
          >
            {s.shopName ?? 'Дэлгүүр'}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
