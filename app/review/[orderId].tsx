import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { OrderAPI, post } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

const RATING_LABELS = ['', 'Муу', 'Дунд', 'Боломжийн', 'Сайн', 'Маш сайн'];

export default function ReviewScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const layout = useAppLayoutMetrics();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const { data: orderData, isLoading } = useQuery<any>({
    queryKey: ['order', orderId],
    queryFn: () => OrderAPI.detail(orderId!),
    enabled: !!orderId,
  });

  const submitMut = useMutation({
    mutationFn: () =>
      post('/reviews', {
        orderId,
        rating,
        comment: comment.trim(),
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Амжилттай', 'Үнэлгээ илгээгдлээ', [
        { text: 'За', onPress: () => router.back() },
      ]);
    },
    onError: (error: any) => Alert.alert('Алдаа', error?.message || 'Илгээж чадсангүй'),
  });

  function selectStar(value: number) {
    Haptics.selectionAsync().catch(() => {});
    setRating(value);
  }

  function handleSubmit() {
    if (rating === 0) {
      Alert.alert('Анхаар', 'Одоор үнэлгээ өгнө үү.');
      return;
    }
    submitMut.mutate();
  }

  if (isLoading) {
    return (
      <AppScreen contentContainerStyle={{ flexGrow: 1 }}>
        <AppTopBar eyebrow="Захиалга" title={`#${shortId(orderId, 6)}`} />
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={C.brand} />
          <Text style={styles.loadingText}>Үнэлгээний мэдээлэл ачаалж байна...</Text>
        </View>
      </AppScreen>
    );
  }

  const order: any = (orderData as any)?.data?.order || (orderData as any)?.order || orderData;
  const items: any[] = Array.isArray(order?.items) ? order.items : [];
  const firstItem = items[0];
  const title = firstItem?.name ?? firstItem?.productName ?? firstItem?.product?.name ?? `Захиалга #${shortId(orderId, 6)}`;

  return (
    <View style={styles.screen}>
      <AppScreen keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: layout.screenBottom + 96 }}>
        <AppTopBar eyebrow="Захиалга" title={`#${shortId(orderId, 6)}`} />

        <AppHeader
          title="Үнэлгээ өгөх"
          subtitle="Бараа, хүргэлт, үйлчилгээний туршлагаа үнэлнэ үү."
          icon="star-outline"
          accent={C.gold}
        />

        <AppCard style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Ionicons name="cube-outline" size={22} color={C.primary} />
        </View>
        <View style={styles.summaryText}>
          <Text style={styles.orderTitle} numberOfLines={2}>{title}</Text>
          {items.length > 1 ? <Text style={styles.mutedText}>+ {items.length - 1} бусад</Text> : null}
        </View>
        </AppCard>

        <AppCard style={styles.ratingCard}>
        <Text style={styles.question}>Үйлчилгээг хэрхэн үнэлэх вэ?</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((value) => (
            <TouchableOpacity
              key={value}
              activeOpacity={0.78}
              onPress={() => selectStar(value)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${value} од`}
              accessibilityHint={`${value} одоор үнэлэх`}
              accessibilityState={{ selected: value === rating }}
              style={styles.starButton}
            >
              <Ionicons
                name={value <= rating ? 'star' : 'star-outline'}
                size={38}
                color={value <= rating ? C.gold : C.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingLabel}>{rating > 0 ? RATING_LABELS[rating] : 'Одоор үнэлнэ үү'}</Text>
        </AppCard>

        <View style={styles.commentBlock}>
          <Text style={styles.commentTitle}>Сэтгэгдэл (сонголттой)</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Хариулт бичих..."
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            accessibilityLabel="Сэтгэгдэл бичих"
            style={styles.commentInput}
          />
        </View>
      </AppScreen>

      <View style={[styles.fixedActions, { paddingBottom: layout.insets.bottom + R.lg }]}>
        <AppButton
          label={submitMut.isPending ? 'Илгээж байна' : 'Илгээх'}
          icon="send-outline"
          disabled={submitMut.isPending || rating === 0}
          onPress={handleSubmit}
        />
      </View>
    </View>
  );
}

function shortId(value: any, size: number) {
  const id = String(value ?? '').trim();
  return id ? id.slice(-size).toLocaleUpperCase('en-US') : 'ORDER';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...F.small, color: C.textSub, marginTop: R.md },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: R.md, marginBottom: R.md },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: UI.controlRadius,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: { flex: 1 },
  orderTitle: { ...F.small, color: C.text, fontWeight: '900' },
  mutedText: { ...F.tiny, color: C.textMuted, marginTop: 3 },
  ratingCard: { alignItems: 'center', gap: R.md, marginBottom: R.md },
  question: { ...F.small, color: C.textSub, fontWeight: '800', textAlign: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  starButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  ratingLabel: { ...F.body, color: C.gold, fontWeight: '900', minHeight: 22 },
  commentBlock: { marginBottom: R.md },
  commentTitle: { ...F.small, color: C.textSub, fontWeight: '900', marginBottom: R.sm },
  commentInput: {
    minHeight: 124,
    backgroundColor: C.bgCard,
    borderRadius: UI.cardRadius,
    padding: R.md,
    color: C.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  fixedActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.bgCard,
    padding: UI.screenPad,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
});
