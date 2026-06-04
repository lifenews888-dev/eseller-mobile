import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { C, R } from '../../shared/design';
import { H } from './tokens';

export function BnplBanner() {
  return (
    <TouchableOpacity
      onPress={() => router.push('/bnpl' as never)}
      activeOpacity={0.88}
      style={{
        marginHorizontal: H.mx,
        marginBottom: 14,
        backgroundColor: C.primaryDim,
        borderRadius: H.cardRadius,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: C.primary + '24',
      }}
    >
      <Ionicons
        name="card-outline"
        size={58}
        color={C.primary}
        style={{
          position: 'absolute',
          right: 14,
          top: 10,
          opacity: 0.16,
        }}
      />

      <View style={{ flex: 1 }}>
        <View
          style={{
            backgroundColor: C.bgCard,
            borderRadius: R.sm,
            paddingHorizontal: 8,
            paddingVertical: 2,
            alignSelf: 'flex-start',
            marginBottom: 7,
            borderWidth: 1,
            borderColor: C.primary + '24',
          }}
        >
          <Text style={{ color: C.primary, fontSize: 9, fontWeight: '900' }}>
            BNPL · ШИНЭ
          </Text>
        </View>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: '900', lineHeight: 20 }}>
          0% хүүтэй{'\n'}4 хуваан төлөх
        </Text>
        <Text style={{ color: C.textSub, fontSize: 10, marginTop: 4 }}>
          Одоо авч, дараа төл
        </Text>
      </View>

      <View
        style={{
          backgroundColor: C.primary,
          borderRadius: R.md,
          paddingHorizontal: 14,
          paddingVertical: 9,
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Text style={{ color: C.bgCard, fontSize: 11, fontWeight: '800' }}>Мэдэх</Text>
      </View>
    </TouchableOpacity>
  );
}
