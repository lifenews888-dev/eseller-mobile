import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R } from '../../shared/design';
import { H } from './tokens';

interface Props {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
  onMore?: () => void;
  moreColor?: string;
}

export function SectionHeader({
  title,
  icon,
  badge,
  badgeBg,
  badgeColor,
  onMore,
  moreColor = C.primary,
}: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: H.mx,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        {!!icon && <Ionicons name={icon} size={16} color={C.primary} />}
        <Text
          style={{
            fontSize: 15,
            fontWeight: '800',
            color: C.text,
          }}
        >
          {title}
        </Text>
        {!!badge && (
          <View
            style={{
              backgroundColor: badgeBg ?? C.bgSection,
              borderRadius: R.full,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontWeight: '800',
                color: badgeColor ?? C.textSub,
              }}
            >
              {badge}
            </Text>
          </View>
        )}
      </View>
      {onMore && (
        <TouchableOpacity
          onPress={onMore}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: moreColor }}>
            Бүгд
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
