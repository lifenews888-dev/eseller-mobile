import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { post } from '../../src/services/api';
import { useCart } from '../../src/store/cart';
import { useAuth } from '../../src/store/auth';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';
import { RequireAuthScreen } from '../../src/shared/ui/RequireAuthScreen';

type CheckedCoupon = {
  code: string;
  title?: string;
  discountType?: string;
  discountValue?: number;
  discount?: number;
};

export default function CouponsScreen() {
  const { user } = useAuth();
  const cartTotal = useCart((state) => state.total());
  const isLoading = false;
  const [coupons, setCoupons] = useState<CheckedCoupon[]>([]);
  const [code, setCode] = useState('');

  // Вэбд хэрэглэгчийн купоны жагсаалт байхгүй — кодыг /coupons/validate-аар шалгаж,
  // хүчинтэй бол төлбөр хийх үед ашиглана.
  const redeemMut = useMutation({
    mutationFn: async (couponCode: string) => {
      const res: any = await post('/coupons/validate', { code: couponCode, cartAmount: cartTotal });
      if (!res?.valid) throw new Error(res?.error || 'Купон хүчингүй байна');
      return { ...(res.coupon || {}), code: res.coupon?.code || couponCode, discount: res.discount } as CheckedCoupon;
    },
    onSuccess: (coupon) => {
      setCoupons((prev) => [coupon, ...prev.filter((c) => c.code !== coupon.code)]);
      setCode('');
      Alert.alert('Хүчинтэй купон', 'Төлбөр хийх үед энэ кодыг оруулж хөнгөлөлт эдлээрэй.');
    },
    onError: (error: any) => Alert.alert('Алдаа', error?.message || 'Купон шалгаж чадсангүй.'),
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
        subtitle="Промо кодоо шалгаад, төлбөр хийх үедээ оруулж хөнгөлөлт эдлээрэй."
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
            label={redeemMut.isPending ? '...' : 'Шалгах'}
            icon="add"
            disabled={redeemMut.isPending}
            onPress={submit}
            style={styles.applyButton}
          />
        </View>
      </AppCard>

      <Text style={styles.sectionTitle}>Шалгасан купон</Text>
      {isLoading ? (
        <AppCard style={styles.centerCard}>
          <ActivityIndicator color={C.brand} />
          <Text style={styles.mutedText}>Купонууд ачаалж байна...</Text>
        </AppCard>
      ) : coupons.length === 0 ? (
        <AppCard style={styles.centerCard}>
          <Ionicons name="gift-outline" size={46} color={C.textMuted} />
          <Text style={styles.emptyTitle}>Шалгасан купон алга</Text>
          <Text style={styles.mutedText}>Промо кодоо дээр оруулж хүчинтэй эсэхийг шалгаарай.</Text>
          <View style={styles.emptyActions}>
            <AppButton
              label="Дэлгүүр үзэх"
              icon="bag-outline"
              onPress={() => router.push('/store' as any)}
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

function CouponCard({ coupon }: { coupon: CheckedCoupon }) {
  return (
    <AppCard style={styles.couponCard}>
      <View style={styles.discountBox}>
        <Text style={styles.discountValue}>{discountText(coupon)}</Text>
        <Text style={styles.discountLabel}>хөнгөлөлт</Text>
      </View>
      <View style={styles.couponInfo}>
        <Text style={styles.couponTitle} numberOfLines={1}>{coupon.title || coupon.code || 'Купон'}</Text>
        <Text style={styles.mutedText}>
          Код: {coupon.code}
        </Text>
        {coupon.discount ? (
          <Text style={styles.expiryText}>Таны сагсанд: −{Number(coupon.discount).toLocaleString('mn-MN')}₮</Text>
        ) : null}
      </View>
    </AppCard>
  );
}

function discountText(coupon: CheckedCoupon) {
  if (coupon.discountType === 'PERCENT') return `${coupon.discountValue || 0}%`;
  return `${Number(coupon.discountValue || 0).toLocaleString('mn-MN')}₮`;
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
