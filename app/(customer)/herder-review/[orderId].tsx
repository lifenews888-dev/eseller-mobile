import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { HERDER_BRAND as BRAND, HerderAPI } from '../../../src/features/herder';
import { C, F, R, UI } from '../../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from '../../../src/shared/ui/AppUI';

const MAX_TEXT = 500;

const RATING_LABELS: Record<number, string> = {
  1: 'Маш муу',
  2: 'Муу',
  3: 'Дунд',
  4: 'Сайн',
  5: 'Маш сайн',
};

export default function HerderReviewScreen() {
  const { orderId, herderName, herderId } = useLocalSearchParams<{
    orderId: string;
    herderName?: string;
    herderId?: string;
  }>();
  const oid = String(orderId ?? '');
  const qc = useQueryClient();

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');

  const submit = useMutation({
    mutationFn: () => HerderAPI.submitReview({
      orderId: oid,
      rating,
      text: text.trim() || undefined,
    }),
    onSuccess: async () => {
      if (herderId) {
        await Promise.all([
          qc.invalidateQueries({ queryKey: ['herder-profile', String(herderId)] }),
          qc.invalidateQueries({ queryKey: ['herder-reviews', String(herderId)] }),
        ]);
      }
      Alert.alert('Амжилттай', 'Таны үнэлгээг хүлээн авлаа. Баярлалаа!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Үнэлгээ илгээхэд алдаа гарлаа';
      Alert.alert('Алдаа', String(msg));
    },
  });

  const canSubmit = rating >= 1 && rating <= 5 && !submit.isPending;

  return (
    <AppScreen keyboardShouldPersistTaps="handled">
      <AppTopBar eyebrow="Малчнаас" title="Үнэлгээ" />
      <AppHeader
        title="Малчныг үнэлэх"
        subtitle={herderName ? String(herderName) : 'Хүргэгдсэн захиалгад үнэлгээ өгнө.'}
        icon="star-outline"
        accent={BRAND}
      />

      <AppCard style={s.card}>
        <Text style={s.label}>Таны оноо</Text>
        <View style={s.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => setRating(n)}
              activeOpacity={0.75}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${n} од`}
            >
              <Ionicons
                name={n <= rating ? 'star' : 'star-outline'}
                size={36}
                color={n <= rating ? C.gold : C.border2}
              />
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 ? <Text style={s.ratingHint}>{RATING_LABELS[rating]}</Text> : null}
      </AppCard>

      <AppCard style={s.card}>
        <View style={s.commentHead}>
          <Text style={s.label}>Сэтгэгдэл</Text>
          <Text style={s.counter}>{text.length} / {MAX_TEXT}</Text>
        </View>
        <TextInput
          style={s.textArea}
          multiline
          placeholder="Бараа, үйлчилгээний талаар бусдад хэлэх зүйл..."
          placeholderTextColor={C.textMuted}
          value={text}
          onChangeText={(value) => setText(value.slice(0, MAX_TEXT))}
          textAlignVertical="top"
        />
      </AppCard>

      <AppButton
        label={submit.isPending ? 'Илгээж байна' : 'Үнэлгээ илгээх'}
        icon="send-outline"
        disabled={!canSubmit}
        onPress={() => submit.mutate()}
        style={{ backgroundColor: BRAND, borderColor: BRAND, marginTop: R.sm }}
      />
      {submit.isPending ? <ActivityIndicator color={BRAND} style={{ marginTop: R.sm }} /> : null}

      <Text style={s.helper}>
        Зөвхөн хүргэгдсэн захиалга дээр үнэлгээ өгөх боломжтой. Нэг захиалгад нэг л үнэлгээ бүртгэгдэнэ.
      </Text>
    </AppScreen>
  );
}

const s = StyleSheet.create({
  card: {
    gap: R.sm,
    marginBottom: R.md,
  },
  label: {
    ...F.small,
    color: C.text,
    fontWeight: '900',
  },
  stars: {
    flexDirection: 'row',
    gap: R.sm,
    alignItems: 'center',
  },
  ratingHint: {
    ...F.small,
    color: C.textSub,
  },
  commentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: R.md,
  },
  textArea: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: UI.controlRadius,
    padding: R.md,
    minHeight: 126,
    fontSize: 15,
    color: C.text,
    backgroundColor: C.bgSection,
  },
  counter: {
    ...F.tiny,
    color: C.textMuted,
    fontWeight: '800',
  },
  helper: {
    ...F.tiny,
    color: C.textSub,
    marginTop: R.md,
    lineHeight: 18,
    textAlign: 'center',
  },
});
