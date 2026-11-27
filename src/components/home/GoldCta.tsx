import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { C, R } from '../../shared/design';
import { H } from './tokens';

const BENEFITS = ['Үнэгүй хүргэлт', '5% нэмэлт хямдрал', '2x оноо', 'VIP дэмжлэг'];

export function GoldCta() {
  return (
    <TouchableOpacity
      onPress={() => router.push('/gold' as never)}
      activeOpacity={0.9}
      style={{
        marginHorizontal: H.mx,
        marginBottom: 16,
        backgroundColor: C.goldDim,
        borderRadius: H.cardRadius,
        padding: 16,
        borderWidth: 1,
        borderColor: C.gold + '35',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{
          backgroundColor: C.gold,
          borderRadius: R.sm,
          paddingHorizontal: 7,
          paddingVertical: 3,
          marginRight: 8,
        }}>
        <Text style={{ color: C.text, fontSize: 10, fontWeight: '900' }}>
            GOLD
          </Text>
        </View>
      </View>

      <Text style={{ color: C.text, fontSize: 18, fontWeight: '900', lineHeight: 24 }}>
        Gold гишүүн болж 200,000₮+ хэмнэнэ
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {BENEFITS.map((benefit) => (
          <View
            key={benefit}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: C.bgCard,
              borderRadius: R.full,
              paddingHorizontal: 8,
              paddingVertical: 5,
            }}
          >
            <Ionicons name="checkmark-circle" size={12} color={C.gold} />
            <Text style={{ color: C.textSub, fontSize: 11, fontWeight: '700' }}>
              {benefit}
            </Text>
          </View>
        ))}
      </View>

      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 14,
      }}>
        <Text
          numberOfLines={2}
          style={{ color: C.gold, fontSize: 13, fontWeight: '900', flex: 1, lineHeight: 17 }}
        >
          30 хоног үнэгүй турших
        </Text>
      </View>
    </TouchableOpacity>
  );
}
