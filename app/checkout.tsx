import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { post } from '../src/services/api';
import { useCart } from '../src/store/cart';
import { C, F, R, UI } from '../src/shared/design';
import { getCartItemQualityIssue, getInvalidCartItems } from '../src/shared/productQuality';
import { FREE_DELIVERY_THRESHOLD, deliveryFeeFor } from '../src/shared/orderPricing';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar, useAppLayoutMetrics } from '../src/shared/ui/AppUI';

const PAYMENT_METHODS = [
  { id: 'qpay', label: 'QPay', icon: 'qr-code-outline' as const, color: C.brand },
  { id: 'socialpay', label: 'SocialPay', icon: 'phone-portrait-outline' as const, color: C.primary },
  { id: 'card', label: 'Visa / MC', icon: 'card-outline' as const, color: C.seller },
];

const BANKS = [
  { name: 'Хаан банк', url: 'khanbank://', color: C.store },
  { name: 'Голомт', url: 'golomt://', color: C.brand },
  { name: 'TDB', url: 'tdb://', color: C.primary },
  { name: 'Мост Мани', url: 'mostmoney://', color: C.seller },
  { name: 'SocialPay', url: 'socialpay://', color: C.primary },
];

export default function CheckoutScreen() {
  const { items, total, clear } = useCart();
  const layout = useAppLayoutMetrics();
  const cartIssues = getInvalidCartItems(items);
  const hasCartIssues = cartIssues.length > 0;
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState('qpay');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qpayData, setQpayData] = useState<any>(null);
  const [countdown, setCountdown] = useState(300);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!qpayData) return;

    setCountdown(300);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((time) => {
        if (time <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;
          return 0;
        }
        return time - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [qpayData]);

  const applyCoupon = async () => {
    const value = couponInput.trim();
    if (value.length < 3) {
      Alert.alert('Код оруулна уу', 'Промо код дор хаяж 3 тэмдэгттэй байна.');
      return;
    }
    setCouponChecking(true);
    try {
      const res: any = await post('/coupons/validate', { code: value, cartAmount: total() });
      if (!res?.valid) throw new Error(res?.error || 'Купон хүчингүй байна');
      setCoupon({ code: res.coupon?.code || value, discount: Math.round(Number(res.discount) || 0) });
    } catch (error: any) {
      setCoupon(null);
      Alert.alert('Купон', error?.message || 'Купон шалгаж чадсангүй.');
    } finally {
      setCouponChecking(false);
    }
  };

  const createOrder = async () => {
    if (!items.length) {
      Alert.alert('Сагс хоосон', 'Захиалах бараа байхгүй байна.');
      router.replace('/store' as any);
      return;
    }

    if (cartIssues.length) {
      const firstIssue = cartIssues[0];
      Alert.alert(
        'Сагсаа шалгана уу',
        `${firstIssue.item.name || 'Бараа'}: ${firstIssue.issue.message}`,
        [{ text: 'Сагс руу буцах', onPress: () => router.replace('/cart' as any) }],
      );
      return;
    }

    if (!address || !phone) {
      Alert.alert('Анхааруулга', 'Хаяг, утасны дугаараа оруулна уу.');
      return;
    }

    setLoading(true);
    try {
      const res: any = await post('/checkout/create-invoice', {
        items: items.map((item) => ({ productId: item.id, qty: item.qty, price: item.price })),
        deliveryAddress: address,
        phone,
        totalAmount: total(),
        paymentMethod: method,
        ...(coupon ? { couponCode: coupon.code } : {}),
      });

      if (res?.isDemoMode) {
        clear();
        Alert.alert(
          'Захиалга үүслээ',
          `Захиалга #${shortId(res.orderId, 6)}\nНийт: ${formatMoney(Number(res.amount ?? 0))}\n\nDemo горим: QPay тохируулаагүй.`,
          [{ text: 'OK', onPress: () => router.replace('/orders' as any) }],
        );
        return;
      }

      setQpayData(res);
      clear();
    } catch (error: any) {
      Alert.alert('Алдаа', error.message || 'Захиалга үүсгэхэд алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  const qrUri = qpayData?.qrDataUrl || (qpayData?.qrImage ? `data:image/png;base64,${qpayData.qrImage}` : null);

  if (qpayData) {
    return <QPayScreen qpayData={qpayData} qrUri={qrUri} countdown={countdown} />;
  }

  if (!items.length) {
    return (
      <AppScreen contentContainerStyle={{ flexGrow: 1 }}>
        <AppTopBar eyebrow="Төлбөр" title="Захиалга" />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <AppCard style={{ alignItems: 'center', gap: R.sm }}>
            <Ionicons name="cart-outline" size={50} color={C.textMuted} />
            <Text style={{ ...F.h4, color: C.text, textAlign: 'center' }}>Сагс хоосон байна</Text>
            <Text style={{ ...F.small, color: C.textSub, textAlign: 'center' }}>
              Захиалга үүсгэхийн өмнө дэлгүүрээс бараа сонгоно уу.
            </Text>
            <AppButton label="Дэлгүүр рүү буцах" icon="storefront-outline" onPress={() => router.replace('/store' as any)} />
          </AppCard>
        </View>
      </AppScreen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <AppScreen contentContainerStyle={{ paddingBottom: layout.screenBottom + 96 }}>
        <AppTopBar eyebrow="Төлбөр" title="Захиалга" />
        <AppHeader
          title="Захиалга баталгаажуулах"
          subtitle="Хаяг, утас, төлбөрийн аргаа шалгаад захиалгаа үүсгэнэ."
          icon="receipt-outline"
          accent={C.brand}
        />

        <AppCard style={{ flexDirection: 'row', gap: R.sm, alignItems: 'flex-start', borderColor: C.success + '35', marginBottom: R.md }}>
          <Ionicons name="shield-checkmark-outline" size={21} color={C.success} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...F.small, color: C.success, fontWeight: '900' }}>3 өдрийн дундын дансны хамгаалалт</Text>
            <Text style={{ ...F.tiny, color: C.textSub, marginTop: 2 }}>
              Бараа хүргэгдсэний дараа л төлбөр дэлгүүрт шилжинэ.
            </Text>
          </View>
        </AppCard>

        {hasCartIssues ? (
          <AppCard style={{ flexDirection: 'row', gap: R.sm, alignItems: 'flex-start', borderColor: C.gold + '55', marginBottom: R.md }}>
            <Ionicons name="shield-checkmark-outline" size={21} color={C.gold} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ ...F.small, color: C.gold, fontWeight: '900' }}>Сагс шалгалт шаардлагатай</Text>
              <Text style={{ ...F.tiny, color: C.textSub }}>
                Шалгалтад байгаа барааг сагснаас устгасны дараа төлбөр үргэлжилнэ.
              </Text>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => router.replace('/cart' as any)}
                accessibilityRole="button"
                accessibilityLabel="Сагс руу буцах"
              >
                <Text style={{ ...F.tiny, color: C.brand, fontWeight: '900', marginTop: 2 }}>Сагс руу буцах</Text>
              </TouchableOpacity>
            </View>
          </AppCard>
        ) : null}

        <Section title="Захиалгын дэлгэрэнгүй">
          {items.map((item) => {
            const qualityIssue = getCartItemQualityIssue(item);

            return (
              <View key={item.id} style={{ marginBottom: R.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: R.md }}>
                  <Text style={{ ...F.small, color: C.text, flex: 1 }} numberOfLines={1}>
                    {item.name} × {item.qty}
                  </Text>
                  <Text style={{ ...F.small, color: qualityIssue?.code === 'invalid-price' ? C.gold : C.brand, fontWeight: '900' }}>
                    {qualityIssue?.code === 'invalid-price' ? 'Шалгалт' : formatMoney(item.price * item.qty)}
                  </Text>
                </View>
                {qualityIssue ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Ionicons name="shield-checkmark-outline" size={13} color={C.gold} />
                    <Text style={{ ...F.tiny, color: C.textSub, flex: 1 }}>{qualityIssue.message}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
          <View style={{ height: 1, backgroundColor: C.border, marginVertical: R.sm }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: R.md, marginBottom: R.xs }}>
            <Text style={{ ...F.small, color: C.textSub }}>Хүргэлт</Text>
            <Text style={{ ...F.small, color: C.text, fontWeight: '800' }}>
              {deliveryFeeFor(total()) === 0 ? 'Үнэгүй' : formatMoney(deliveryFeeFor(total()))}
            </Text>
          </View>
          {deliveryFeeFor(total()) > 0 ? (
            <Text style={{ ...F.tiny, color: C.textMuted, marginBottom: R.xs }}>
              {formatMoney(FREE_DELIVERY_THRESHOLD)}-өөс дээш захиалгад хүргэлт үнэгүй
            </Text>
          ) : null}
          {coupon ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: R.md, marginBottom: R.xs }}>
              <Text style={{ ...F.small, color: C.success, fontWeight: '800' }}>Купон ({coupon.code})</Text>
              <Text style={{ ...F.small, color: C.success, fontWeight: '900' }}>−{formatMoney(coupon.discount)}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: R.md }}>
            <Text style={{ ...F.h4, color: C.text }}>Нийт</Text>
            <Text style={{ ...F.h4, color: C.brand }}>{formatMoney(Math.max(0, total() + deliveryFeeFor(total()) - (coupon?.discount || 0)))}</Text>
          </View>
        </Section>

        <Section title="Промо код">
          <View style={{ flexDirection: 'row', gap: R.sm, alignItems: 'center' }}>
            <TextInput
              placeholder="Жишээ: WELCOME10"
              placeholderTextColor={C.textMuted}
              value={couponInput}
              onChangeText={(value) => {
                setCouponInput(value.toLocaleUpperCase('en-US'));
                if (coupon) setCoupon(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Промо код"
              style={[inputStyle, { flex: 1 }]}
            />
            <AppButton
              label={couponChecking ? '...' : coupon ? 'Хэрэглэсэн' : 'Хэрэглэх'}
              icon={coupon ? 'checkmark' : 'ticket-outline'}
              disabled={couponChecking}
              onPress={applyCoupon}
            />
          </View>
        </Section>

        <Section title="Төлбөрийн арга">
          <View style={{ gap: R.sm }}>
            {PAYMENT_METHODS.map((item) => {
              const active = method === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.84}
                  onPress={() => setMethod(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label} төлбөрийн арга сонгох`}
                  accessibilityState={{ selected: active }}
                  style={{
                    minHeight: 56,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: active ? item.color + '15' : C.bgSection,
                    borderRadius: UI.controlRadius,
                    padding: R.md,
                    gap: R.sm,
                    borderWidth: 1,
                    borderColor: active ? item.color : C.border,
                  }}
                >
                  <Ionicons name={item.icon} size={22} color={item.color} />
                  <Text style={{ ...F.small, flex: 1, color: C.text, fontWeight: '800' }}>{item.label}</Text>
                  {active ? <Ionicons name="checkmark-circle" size={20} color={item.color} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        <Section title="Хүргэх хаяг">
          <TextInput
            placeholder="Дүүрэг, хороо, байр, орц, тоот..."
            placeholderTextColor={C.textMuted}
            value={address}
            onChangeText={setAddress}
            multiline
            accessibilityLabel="Хүргэх хаяг"
            accessibilityHint="Захиалгыг хүргэх дэлгэрэнгүй хаягаа оруулна уу"
            style={[inputStyle, { minHeight: 84, textAlignVertical: 'top' }]}
          />
        </Section>

        <Section title="Утасны дугаар">
          <TextInput
            placeholder="8811-XXXX"
            placeholderTextColor={C.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            accessibilityLabel="Утасны дугаар"
            accessibilityHint="Захиалгын хүргэлтээр холбогдох утасны дугаараа оруулна уу"
            style={inputStyle}
          />
        </Section>
      </AppScreen>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: C.bgCard,
          padding: UI.screenPad,
          paddingBottom: layout.insets.bottom + R.lg,
          borderTopWidth: 1,
          borderTopColor: C.border,
        }}
      >
        <AppButton
          label={hasCartIssues ? 'Сагсаа шалгана уу' : loading ? 'Захиалга үүсгэж байна' : `${paymentLabel(method)} төлөх`}
          icon="card-outline"
          disabled={loading || hasCartIssues}
          onPress={createOrder}
        />
      </View>
    </View>
  );
}

function QPayScreen({ qrUri, countdown }: { qpayData: any; qrUri: string | null; countdown: number }) {
  return (
    <AppScreen contentContainerStyle={{ alignItems: 'center' }}>
      <AppTopBar eyebrow="Төлбөр" title="QPay" style={{ alignSelf: 'stretch' }} />
      <AppHeader
        title="QPay төлбөр"
        subtitle="QR кодыг банкны апп-аар уншуулж төлнө үү."
        icon="qr-code-outline"
        accent={C.brand}
        style={{ alignSelf: 'stretch' }}
      />

      <AppCard style={{ flexDirection: 'row', gap: R.sm, alignItems: 'flex-start', borderColor: C.success + '35', marginBottom: R.md }}>
        <Ionicons name="shield-checkmark-outline" size={21} color={C.success} />
        <View style={{ flex: 1 }}>
          <Text style={{ ...F.small, color: C.success, fontWeight: '900' }}>QPay баталгаажуулалт</Text>
          <Text style={{ ...F.tiny, color: C.textSub, marginTop: 2 }}>
            Төлбөр QPay-ээр баталгаажмагц захиалга тань дэлгүүрт очно.
          </Text>
        </View>
      </AppCard>

      {qrUri ? (
        <AppCard style={{ padding: R.md, marginBottom: R.md }}>
          <Image
            source={{ uri: qrUri }}
            style={{ width: 210, height: 210 }}
            accessibilityLabel="QPay QR код"
          />
        </AppCard>
      ) : (
        <AppCard style={{ alignItems: 'center', gap: R.sm, marginBottom: R.md }}>
          <ActivityIndicator color={C.brand} />
          <Text style={{ ...F.small, color: C.textSub }}>QR үүсгэж байна</Text>
        </AppCard>
      )}

      <Text style={{ fontSize: 30, fontWeight: '900', color: C.brand }}>
        {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
      </Text>
      <Text style={{ ...F.small, color: C.textMuted, marginTop: R.xs, marginBottom: R.md }}>
        Хугацаа дуусахаас өмнө төлнө үү.
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: R.sm, justifyContent: 'center' }}>
        {BANKS.map((bank) => (
          <TouchableOpacity
            key={bank.name}
            activeOpacity={0.84}
            onPress={async () => {
              try {
                const canOpen = await Linking.canOpenURL(bank.url);
                if (!canOpen) {
                  Alert.alert('Апп олдсонгүй', `${bank.name} апп суулгаагүй байна.`);
                  return;
                }
                await Linking.openURL(bank.url);
              } catch {
                Alert.alert('Апп олдсонгүй', `${bank.name} апп суулгаагүй байна.`);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={`${bank.name} апп нээх`}
            style={{
              backgroundColor: bank.color + '15',
              borderRadius: UI.controlRadius,
              padding: R.md,
              minHeight: 52,
              minWidth: '44%',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: bank.color + '40',
            }}
          >
            <Text style={{ ...F.small, color: bank.color, fontWeight: '800' }}>{bank.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <AppButton
        label="Нүүр хуудас руу буцах"
        icon="home-outline"
        variant="ghost"
        onPress={() => router.push('/' as any)}
        style={{ marginTop: R.xl, alignSelf: 'stretch' }}
      />
    </AppScreen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <AppCard style={{ marginBottom: R.md }}>
      <Text style={{ ...F.h4, color: C.text, marginBottom: R.sm }}>{title}</Text>
      {children}
    </AppCard>
  );
}

function paymentLabel(method: string) {
  if (method === 'qpay') return 'QPay-ээр';
  if (method === 'socialpay') return 'SocialPay-ээр';
  return 'Картаар';
}

function shortId(value: unknown, length: number) {
  return String(value ?? '').slice(-length).toLocaleUpperCase('en-US');
}

function formatMoney(value?: number) {
  return `${Number(value || 0).toLocaleString()}₮`;
}

const inputStyle = {
  backgroundColor: C.bgSection,
  borderRadius: UI.controlRadius,
  padding: R.md,
  color: C.text,
  fontSize: 15,
  borderWidth: 1,
  borderColor: C.border,
};
