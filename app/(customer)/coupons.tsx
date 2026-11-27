import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../../src/services/api';
import { useAuth } from '../../src/store/auth';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';
import { RequireAuthScreen } from '../../src/shared/ui/RequireAuthScreen';

export default function CouponsScreen() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => get('/buyer/coupons'),
    enabled: !!user,
  });
  const coupons = (data as any)?.coupons || [];
  const [code, setCode] = useState('');

  const redeemMut = useMutation({
    mutationFn: (couponCode: string) => post('/buyer/coupons/redeem', { code: couponCode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
      setCode('');
      Alert.alert('Амжилттай', 'Купон нэмэгдлээ.');
    },
    onError: (error: any) => Alert.alert('Алдаа', error?.message || 'Купон идэвхжүүлж чадсангүй.'),
  });

  const submit = () => {
    const value = code.trim();
    if (value.length < 3) {
      Alert.alert('Код оруулна уу', 'Промо код дор хаяж 3 тэмдэгттэй байна.');
      return;
    }
    redeemMut.mutate(value);
  };

  if (!user) {
    return (
      <RequireAuthScreen
        title="Купон"
        subtitle="Купон, промо кодоо харах болон идэвхжүүлэхийн тулд нэвтэрнэ үү."
        icon="ticket-outline"
        accent={C.seller}
        returnTo="/coupons"
      />
    );
  }

  return (
    <AppScreen>
      <Stack.Screen options={{ headerShown: false }} />
      <AppTopBar eyebrow="Профайл" title="Купон" showBack={false} />
      <AppHeader
        title="Купон"
        subtitle="Промо кодоо идэвхжүүлээд дараагийн захиалгадаа хөнгөлөлт эдлээрэй."
        icon="ticket-outline"
        accent={C.seller}
      />

      <AppCard style={styles.inputCard}>
        <Text style={styles.inputLabel}>Промо код</Text>
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <Ionicons name="ticket-outline" size={18} color={C.textMuted} />
            <TextInput
              style={styles.input}
              accessibilityLabel="Промо код"
              placeholder="Жишээ: WELCOME10"
              placeholderTextColor={C.textMuted}
              value={code}
              onChangeText={(value) => setCode(value.toLocaleUpperCase('en-US'))}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={submit}
            />
          </View>
          <AppButton
            label={redeemMut.isPending ? '...' : 'Нэмэх'}
            icon="add"
            disabled={redeemMut.isPending}
            onPress={submit}
            style={styles.applyButton}
          />
        </View>
      </AppCard>

      <Text style={styles.sectionTitle}>Идэвхтэй купон</Text>
      {isLoading ? (
        <AppCard style={styles.centerCard}>
          <ActivityIndicator color={C.brand} />
          <Text style={styles.mutedText}>Купонууд ачаалж байна...</Text>
        </AppCard>
      ) : coupons.length === 0 ? (
        <AppCard style={styles.centerCard}>
          <Ionicons name="gift-outline" size={46} color={C.textMuted} />
          <Text style={styles.emptyTitle}>Купон байхгүй</Text>
          <Text style={styles.mutedText}>Шинэ промо код авмагцаа энд идэвхжүүлээрэй.</Text>
          <View style={styles.emptyActions}>
            <AppButton
              label="Дэлгүүр үзэх"
              icon="bag-outline"
              onPress={() => router.push('/store' as any)}
              style={styles.emptyButton}
            />
            <AppButton
              label="Gold үзэх"
              icon="star-outline"
              variant="secondary"
              onPress={() => router.push('/gold' as any)}
              style={styles.emptyButton}
            />
          </View>
        </AppCard>
      ) : (
        <View style={styles.couponList}>
          {coupons.map((coupon: any) => <CouponCard key={coupon.id ?? coupon.code} coupon={coupon} />)}
        </View>
      )}
    </AppScreen>
  );
}

function CouponCard({ coupon }: { coupon: any }) {
  return (
    <AppCard style={styles.couponCard}>
      <View style={styles.discountBox}>
        <Text style={styles.discountValue}>{discountText(coupon)}</Text>
        <Text style={styles.discountLabel}>хөнгөлөлт</Text>
      </View>
      <View style={styles.couponInfo}>
        <Text style={styles.couponTitle} numberOfLines={1}>{coupon.title || coupon.code || 'Купон'}</Text>
        <Text style={styles.mutedText}>
          {coupon.minOrder ? `${Number(coupon.minOrder).toLocaleString('mn-MN')}₮+ захиалгад` : 'Бүх захиалгад'}
        </Text>
        <Text style={styles.expiryText}>Дуусах: {formatDate(coupon.expiresAt)}</Text>
      </View>
    </AppCard>
  );
}

function discountText(coupon: any) {
  if (coupon.discountPercent) return `${coupon.discountPercent}%`;
  return `${Number(coupon.discountAmount || 0).toLocaleString('mn-MN')}₮`;
}

function formatDate(value: any) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('mn-MN');
}

const styles = StyleSheet.create({
  inputCard: { marginBottom: R.md },
  inputLabel: { ...F.small, color: C.text, fontWeight: '900', marginBottom: R.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: R.sm },
  inputWrap: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
    backgroundColor: C.bgSection,
    borderRadius: UI.controlRadius,
    paddingHorizontal: R.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  input: { flex: 1, color: C.text, fontSize: 14, paddingVertical: R.sm },
  applyButton: { minHeight: 48 },
  sectionTitle: { ...F.h4, color: C.text, marginBottom: R.sm },
  centerCard: { alignItems: 'center', gap: R.sm },
  emptyTitle: { ...F.body, color: C.text, fontWeight: '900', textAlign: 'center' },
  mutedText: { ...F.small, color: C.textMuted, lineHeight: 20 },
  emptyActions: {
    width: '100%',
    flexDirection: 'row',
    gap: R.sm,
    marginTop: R.sm,
  },
  emptyButton: { flex: 1 },
  couponList: { gap: R.sm },
  couponCard: { flexDirection: 'row', gap: R.md, padding: 0, overflow: 'hidden' },
  discountBox: {
    width: 92,
    backgroundColor: C.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: R.sm,
  },
  discountValue: { ...F.h3, color: C.seller, textAlign: 'center' },
  discountLabel: { ...F.tiny, color: C.textMuted, marginTop: 2 },
  couponInfo: { flex: 1, padding: R.md, justifyContent: 'center' },
  couponTitle: { ...F.small, color: C.text, fontWeight: '900' },
  expiryText: { ...F.tiny, color: C.seller, fontWeight: '800', marginTop: 4 },
});
