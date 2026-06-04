import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { apiUrl } from '../config/apiBase';
import * as SecureStore from '../shared/secureStore';
import { shadowStyle } from '../shared/shadow';
import { C, F, R } from '../shared/design';
import {
  firstProductImage,
  getPublicProductPrice,
  getPublicProductQualityIssue,
} from '../shared/productQuality';

interface GroupBuy {
  id: string;
  product: { id: string; name: string; price: number; salePrice?: number | null; images: string[] };
  targetCount: number;
  currentCount: number;
  discount: number;
  expiresAt: string;
}

export function GroupBuyCard({
  group, onJoin,
}: {
  group: GroupBuy;
  onJoin: (id: string) => void;
}) {
  const [joining, setJoining] = useState(false);
  const progress = Math.min(100, (group.currentCount / group.targetCount) * 100);
  const remaining = Math.max(0, group.targetCount - group.currentCount);
  const basePrice = getPublicProductPrice(group.product);
  const discountedPrice = Math.floor(basePrice * (1 - group.discount));
  const qualityIssue = getPublicProductQualityIssue({
    ...group.product,
    salePrice: discountedPrice,
  });

  const diff = new Date(group.expiresAt).getTime() - Date.now();
  const hours = Math.max(0, Math.floor(diff / 3600000));
  const minutes = Math.max(0, Math.floor((diff % 3600000) / 60000));

  async function handleJoin() {
    if (qualityIssue) {
      Alert.alert('Бараа шалгалтад байна', qualityIssue.message);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setJoining(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const res = await fetch(apiUrl(`/group-buy/${group.id}/join`), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        Alert.alert('Алдаа', data.error || 'Алдаа гарлаа');
        return;
      }
      onJoin(group.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      Alert.alert('Алдаа', 'Сүлжээний алдаа');
    } finally {
      setJoining(false);
    }
  }

  if (qualityIssue) {
    return null;
  }

  return (
    <View style={s.card}>
      <View style={s.badge}>
        <Ionicons name="people-outline" size={13} color={C.seller} />
        <Text style={s.badgeText}>Хамтарч авах · {Math.round(group.discount * 100)}% хямд</Text>
      </View>

      <View style={s.row}>
        <Image source={{ uri: firstProductImage(group.product) }} style={s.thumb} />
        <View style={s.info}>
          <Text style={s.name} numberOfLines={2}>{group.product.name}</Text>
          <View style={s.priceRow}>
            <Text style={s.newPrice}>{discountedPrice.toLocaleString()}₮</Text>
            <Text style={s.oldPrice}>{basePrice.toLocaleString()}₮</Text>
          </View>
          <View style={s.timerRow}>
            <Ionicons name="time-outline" size={11} color={C.seller} />
            <Text style={s.timer}>{hours}ц {minutes}мин үлдлээ</Text>
          </View>
        </View>
      </View>

      <View style={s.progressSection}>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${progress}%` as any }]} />
        </View>
        <View style={s.progressLabels}>
          <Text style={s.progressText}>{group.currentCount}/{group.targetCount} хүн нэгдсэн</Text>
          <Text style={s.remainText}>{remaining} хүн дутуу</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleJoin}
        disabled={joining || remaining === 0}
        style={[s.joinBtn, (joining || remaining === 0) && s.joinBtnDisabled]}
      >
        <Ionicons
          name={remaining === 0 ? 'checkmark-circle-outline' : 'flash-outline'}
          size={16}
          color={C.bgCard}
        />
        <Text style={s.joinBtnText}>
          {remaining === 0
            ? 'Бүрэн нэгдсэн'
            : joining
              ? 'Нэгдэж байна...'
              : `Нэгдэх · ${discountedPrice.toLocaleString()}₮`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.bgCard, borderRadius: R.lg, marginBottom: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border,
    ...shadowStyle({ y: 2, blur: 8, opacity: 0.06, elevation: 2 }),
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.xs,
    backgroundColor: C.goldDim,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: { ...F.tiny, fontWeight: '800', color: C.seller },
  row: { flexDirection: 'row', gap: 12, padding: 12 },
  thumb: { width: 80, height: 80, borderRadius: R.md, backgroundColor: C.bgSection },
  info: { flex: 1, justifyContent: 'center' },
  name: { ...F.small, fontWeight: '800', color: C.text, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  newPrice: { ...F.h4, color: C.brand },
  oldPrice: { ...F.tiny, color: C.textMuted, textDecorationLine: 'line-through' },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  timer: { fontSize: 10, color: C.seller },
  progressSection: { paddingHorizontal: 12, paddingBottom: 8 },
  progressBar: { height: 6, backgroundColor: C.bgSection, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.seller, borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressText: { fontSize: 10, color: C.textSub },
  remainText: { fontSize: 10, color: C.seller, fontWeight: '800' },
  joinBtn: {
    flexDirection: 'row', justifyContent: 'center', gap: R.xs,
    backgroundColor: C.seller, margin: 12, marginTop: 4, borderRadius: R.md,
    padding: 13, alignItems: 'center',
  },
  joinBtnDisabled: { opacity: 0.6 },
  joinBtnText: { color: C.bgCard, fontSize: 14, fontWeight: '800' },
});
