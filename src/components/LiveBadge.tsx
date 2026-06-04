import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { C, R } from '../shared/design';

interface LiveBadgeProps {
  isLive?: boolean;
  currentLiveId?: string | null;
  size?: 'sm' | 'md';
}

export function LiveBadge({ isLive, currentLiveId, size = 'sm' }: LiveBadgeProps) {
  if (!isLive) return null;

  const badge = (
    <View style={[styles.badge, size === 'md' && styles.badgeMd]}>
      <View style={[styles.dot, size === 'md' && styles.dotMd]} />
      <Text style={[styles.text, size === 'md' && styles.textMd]}>LIVE</Text>
    </View>
  );

  if (currentLiveId) {
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={() => router.push(`/live/${currentLiveId}`)}
        activeOpacity={0.8}
      >
        {badge}
      </TouchableOpacity>
    );
  }

  return <View style={styles.container}>{badge}</View>;
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 6, left: 6, zIndex: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.error, borderRadius: R.full, paddingHorizontal: 8, paddingVertical: 3 },
  badgeMd: { paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 5, height: 5, borderRadius: R.full, backgroundColor: C.bgCard },
  dotMd: { width: 6, height: 6 },
  text: { color: C.bgCard, fontSize: 9, fontWeight: '700' },
  textMd: { fontSize: 11 },
});
