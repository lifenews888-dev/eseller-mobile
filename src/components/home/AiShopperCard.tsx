import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { C, R } from '../../shared/design';
import { H } from './tokens';

export function AiShopperCard() {
  return (
    <TouchableOpacity
      onPress={() => router.push('/ai-shopper' as never)}
      activeOpacity={0.85}
      style={{
        marginHorizontal: H.mx,
        marginBottom: 14,
        backgroundColor: H.card,
        borderRadius: H.cardRadius,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 0.5,
        borderColor: H.cardBorder,
        ...H.shadow,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: R.md,
          backgroundColor: H.primaryTint,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Ionicons name="sparkles-outline" size={22} color={C.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '800',
            color: H.textPrimary,
            marginBottom: 3,
          }}
        >
          AI худалдан авалтын туслах
        </Text>
        <Text
          style={{ fontSize: 11, color: H.textHint, lineHeight: 16 }}
          numberOfLines={1}
        >
          Надад iPhone-тай тохирох кейс хайж өгөөч
        </Text>
      </View>

      <View
        style={{
          backgroundColor: H.primary,
          borderRadius: R.md,
          paddingHorizontal: 12,
          paddingVertical: 7,
          flexShrink: 0,
        }}
      >
        <Text style={{ color: C.bgCard, fontSize: 11, fontWeight: '800' }}>Асуух</Text>
      </View>
    </TouchableOpacity>
  );
}
