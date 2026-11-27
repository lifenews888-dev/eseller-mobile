import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, ScrollView,
  Alert, ActivityIndicator, Image, useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  POSAPI,
  type POSProduct,
  type POSCartItem,
} from '../../src/services/api';
// HOTFIX: native modules not yet in production binary — temporarily unused
// import { BarcodeScanner } from '../../src/components/BarcodeScanner';
// import { printReceipt } from '../../src/utils/posReceipt';
import { LogoutButton } from '../../src/components/LogoutButton';
import { C, R, UI } from '../../src/shared/design';
import { normalizeRouteParam } from '../../src/shared/routeParams';
import { AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

type PayMethod = 'cash' | 'qpay' | 'card';
type PosRoutePatch = {
  method?: PayMethod;
  search?: string;
};

function unwrap<T = any>(res: any): T {
  return (res?.data ?? res) as T;
}

function normalizePayMethod(value?: string | string[] | null): PayMethod {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'qpay' || raw === 'card' ? raw : 'cash';
}

export default function POSTerminal() {
  const params = useLocalSearchParams<{ method?: string; q?: string }>();
  const layout = useAppLayoutMetrics();
  const { width } = useWindowDimensions();
  const isCompact = width < 720;
  const productColumns = isCompact ? 2 : 3;

  // ── Search + products ──
  const [search, setSearch] = useState(() => normalizeRouteParam(params.q));
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cart ──
  const [cart, setCart] = useState<POSCartItem[]>([]);

  // ── Checkout state ──
  const [payMethod, setPayMethod] = useState<PayMethod>(() => normalizePayMethod(params.method));
  const [cashInput, setCashInput] = useState('');
  const [vatEnabled, setVatEnabled] = useState(true);

  // ── QPay modal ──
  const [qpayModal, setQpayModal] = useState(false);
  const [qrData, setQrData] = useState<{ invoiceId: string; qrImage: string } | null>(null);
  const [polling, setPolling] = useState(false);
  const pollingRef = useRef(false);

  useEffect(
    () => () => {
      pollingRef.current = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  useEffect(() => {
    const nextSearch = normalizeRouteParam(params.q);
    setSearch(nextSearch);
    scheduleProductSearch(nextSearch);
  }, [params.q]);

  useEffect(() => {
    setPayMethod(normalizePayMethod(params.method));
  }, [params.method]);

  // ── Barcode scanner ──
  const [scannerOpen, setScannerOpen] = useState(false);

  // ── Derived totals ──
  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const vatAmount = vatEnabled ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal + vatAmount;
  const cashReceived = parseInt((cashInput || '').replace(/[,\s₮]/g, ''), 10) || 0;
  const change = payMethod === 'cash' ? Math.max(0, cashReceived - total) : 0;

  // ── Search with 400ms debounce ──
  function replacePosRoute(patch: PosRoutePatch) {
    const nextSearch = patch.search ?? search;
    const nextMethod = patch.method ?? payMethod;
    const routeParams: Record<string, string> = {};

    if (nextSearch.trim()) routeParams.q = nextSearch.trim();
    if (nextMethod !== 'cash') routeParams.method = nextMethod;

    router.replace(
      Object.keys(routeParams).length
        ? ({ pathname: '/owner/pos' as any, params: routeParams } as any)
        : ('/owner/pos' as any),
    );
  }

  function scheduleProductSearch(query: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) {
      setProducts([]);
      setSearching(false);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await POSAPI.searchProducts(query.trim());
        const body = unwrap<any>(res);
        // Backend /products returns { products: [...] } or wrapped
        const list: POSProduct[] = body?.products ?? (Array.isArray(body) ? body : []);
        setProducts(list);
      } catch {
        setProducts([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  function onSearchChange(text: string) {
    setSearch(text);
    replacePosRoute({ search: text });
    scheduleProductSearch(text);
  }

  function selectPayMethod(method: PayMethod) {
    setPayMethod(method);
    replacePosRoute({ method });
  }

  // ── Cart ops ──
  function addToCart(product: POSProduct) {
    if ((product.stock ?? 0) <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, qty: i.qty + 1, subtotal: (i.qty + 1) * i.product.price }
            : i,
        );
      }
      return [...prev, { product, qty: 1, subtotal: product.price }];
    });
  }

  function updateQty(productId: string, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, qty, subtotal: qty * i.product.price } : i,
      ),
    );
  }

  // ── HOTFIX: barcode + receipt native modules disabled until EAS build ──
  // BarcodeScanner (expo-camera) + printReceipt (expo-print) are native
  // modules not yet in the production binary. Calling them on the current
  // OTA crashes the POS screen. Re-enable after next `eas build`.
  //
  // async function handleBarcodeScan(barcode: string) { ... }
  // function openReceipt(opts: ...) { printReceipt(...) }

  function clearCart() {
    Alert.alert('Сагс цэвэрлэх', 'Бүх барааг хасах уу?', [
      { text: 'Болих', style: 'cancel' },
      {
        text: 'Тийм',
        style: 'destructive',
        onPress: () => {
          setCart([]);
          setCashInput('');
          setSearch('');
          setProducts([]);
          replacePosRoute({ search: '' });
        },
      },
    ]);
  }

  // ── Cash checkout ──
  const cashMutation = useMutation({
    mutationFn: () =>
      POSAPI.createOrder({
        items: cart.map((i) => ({ productId: i.product.id, qty: i.qty, price: i.product.price })),
        paymentMethod: 'cash',
        cashReceived,
        total,
        vatIncluded: vatEnabled,
      }),
    onSuccess: (res) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const body = unwrap<{ orderId?: string; change?: number }>(res);
      const orderId = String(body?.orderId ?? '');
      Alert.alert(
        'Амжилттай',
        `Захиалга #${orderId.slice(-6).toUpperCase()}\n` +
          `Нийт: ${total.toLocaleString()}₮\n` +
          `Хариулт: ${change.toLocaleString()}₮`,
        [
          {
            text: 'OK',
            onPress: () => {
              setCart([]);
              setCashInput('');
            },
          },
        ],
      );
    },
    onError: (e: any) => Alert.alert('Алдаа', e?.message || 'Захиалга үүсгэж чадсангүй'),
  });

  // ── QPay flow ──
  async function startQPay() {
    try {
      const posOrderId = `POS-${Date.now()}`;
      const res = await POSAPI.createQPayInvoice(posOrderId, total);
      const body = unwrap<any>(res);
      const invoiceId: string | undefined = body?.invoiceId;
      const qrImage: string | undefined = body?.qrImage;
      if (!invoiceId || !qrImage) {
        Alert.alert('QPay алдаа', 'Нэхэмжлэл буцаагдсангүй');
        return;
      }
      setQrData({ invoiceId, qrImage });
      setQpayModal(true);
      pollingRef.current = true;
      pollPayment(invoiceId);
    } catch (e: any) {
      Alert.alert('QPay алдаа', e?.message || 'Холболтын алдаа');
    }
  }

  function cancelQPay() {
    pollingRef.current = false;
    setQpayModal(false);
    setPolling(false);
  }

  async function pollPayment(invoiceId: string) {
    setPolling(true);
    const maxAttempts = 60; // 5 минут (5 сек interval)
    for (let i = 0; i < maxAttempts; i++) {
      if (!pollingRef.current) {
        setPolling(false);
        return;
      }
      await new Promise((r) => setTimeout(r, 5000));
      if (!pollingRef.current) {
        setPolling(false);
        return;
      }
      try {
        const res = await POSAPI.checkPayment(invoiceId);
        const body = unwrap<any>(res);
        if (body?.paid === true) {
          pollingRef.current = false;
          setPolling(false);
          setQpayModal(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          await POSAPI.createOrder({
            items: cart.map((c) => ({
              productId: c.product.id,
              qty: c.qty,
              price: c.product.price,
            })),
            paymentMethod: 'qpay',
            total,
            vatIncluded: vatEnabled,
          });
          Alert.alert(
            'Төлбөр амжилттай',
            `${total.toLocaleString()}₮ төлөгдлөө`,
            [{ text: 'OK', onPress: () => setCart([]) }],
          );
          return;
        }
      } catch {
        /* continue polling */
      }
    }
    pollingRef.current = false;
    setPolling(false);
    if (qpayModal) {
      Alert.alert('Хугацаа дууслаа', 'QPay төлбөр 5 минутад ирсэнгүй');
    }
  }

  function handleCheckout() {
    if (cart.length === 0) {
      Alert.alert('Сагс хоосон байна');
      return;
    }
    if (payMethod === 'cash') {
      if (cashReceived < total) {
        Alert.alert('Алдаа', `Хүрэлцэхгүй байна. ${(total - cashReceived).toLocaleString()}₮ дутуу`);
        return;
      }
      cashMutation.mutate();
    } else if (payMethod === 'qpay') {
      startQPay();
    } else {
      Alert.alert('Карт', 'Карт уншигч холбогдоогүй байна');
    }
  }

  return (
    <View
      style={{
        flex: 1,
        flexDirection: isCompact ? 'column' : 'row',
        backgroundColor: C.bg,
      }}
    >
      {/* ─── LEFT: search + products ─── */}
      <View
        style={{
          flex: isCompact ? undefined : 3,
          height: isCompact ? '58%' : undefined,
          borderRightWidth: isCompact ? 0 : 1,
          borderBottomWidth: isCompact ? 1 : 0,
          borderColor: C.border,
        }}
      >
        {/* Header */}
        <View
          style={{
            minHeight: isCompact ? UI.headerMinHeight : 58,
            paddingHorizontal: R.md,
            paddingTop: isCompact ? layout.screenTop : R.md,
            paddingBottom: R.md,
            backgroundColor: C.bgCard,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <AppTopBar
            eyebrow="POS"
            title="eSeller POS"
            showBack={false}
            style={{ marginBottom: 0 }}
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm }}>
                <TouchableOpacity
                  accessibilityLabel="POS түүх"
                  onPress={() => router.push('/owner/pos-history' as any)}
                  style={{
                    backgroundColor: C.bgSection,
                    borderRadius: UI.controlRadius,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    borderWidth: 1,
                    borderColor: C.border,
                  }}
                >
                  <Ionicons name="time-outline" size={12} color={C.textSub} />
                  <Text style={{ color: C.textSub, fontSize: 12 }}>Түүх</Text>
                </TouchableOpacity>
                <LogoutButton variant="icon" />
              </View>
            }
          />
        </View>

        {/* Search + barcode scanner */}
        <View style={{ padding: R.md, flexDirection: 'row', gap: R.sm }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: C.bgCard,
              borderRadius: UI.controlRadius,
              paddingHorizontal: 12,
              height: 44,
              gap: 8,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Ionicons name="search" size={16} color={C.textMuted} />
            <TextInput
              value={search}
              onChangeText={onSearchChange}
              placeholder="Барааны нэр эсвэл barcode..."
              placeholderTextColor={C.textMuted}
              style={{ flex: 1, color: C.text, fontSize: 14 }}
              autoFocus
            />
            {searching && <ActivityIndicator size="small" color={C.store} />}
          </View>
          <TouchableOpacity
            accessibilityLabel="Barcode сканнер"
            onPress={() =>
              Alert.alert(
                'Шинэ билд шаардлагатай',
                'Barcode сканнер ажиллахын тулд аппын шинэ хувилбарыг суулгана уу.',
                [{ text: 'OK' }],
              )
            }
            style={{
              width: 44,
              height: 44,
              backgroundColor: C.bgSection,
              borderRadius: UI.controlRadius,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.5,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Ionicons name="barcode-outline" size={22} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Product grid */}
        <FlatList
          data={products}
          key={productColumns}
          keyExtractor={(p) => p.id}
          numColumns={productColumns}
          contentContainerStyle={{ padding: R.md, gap: R.sm }}
          columnWrapperStyle={{ gap: R.sm }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ color: C.textMuted, fontSize: 14 }}>
                {search ? 'Бараа олдсонгүй' : 'Бараа хайж эхлэх...'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const inCart = !!cart.find((c) => c.product.id === item.id);
            const oos = (item.stock ?? 0) <= 0;
            const lowStock = !oos && (item.stock ?? 0) < 5;
            const img = item.images?.[0];
            return (
              <TouchableOpacity
                onPress={() => addToCart(item)}
                disabled={oos}
                style={{
                  flex: 1,
                  backgroundColor: C.bgCard,
                  borderRadius: UI.controlRadius,
                  padding: 10,
                  opacity: oos ? 0.4 : 1,
                  borderWidth: inCart ? 1.5 : 1,
                  borderColor: inCart ? C.store : C.border,
                }}
              >
                {img ? (
                  <Image
                    source={{ uri: img }}
                    style={{ width: '100%', height: 64, borderRadius: 6 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      height: 64,
                      borderRadius: 6,
                      backgroundColor: C.bgSection,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="cube-outline" size={28} color={C.textMuted} />
                  </View>
                )}
                <Text
                  style={{ color: C.text, fontSize: 11, fontWeight: '500', marginTop: 6 }}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                <Text style={{ color: C.store, fontSize: 13, fontWeight: '700', marginTop: 4 }}>
                  {item.price.toLocaleString()}₮
                </Text>
                {lowStock && (
                  <Text style={{ color: C.warning, fontSize: 9, marginTop: 2 }}>
                    {item.stock} үлдсэн
                  </Text>
                )}
                {oos && <Text style={{ color: C.error, fontSize: 9, marginTop: 2 }}>Дууссан</Text>}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ─── RIGHT: cart + checkout ─── */}
      <View style={{ flex: isCompact ? 1 : 2, backgroundColor: C.bgCard }}>
        {/* Cart header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 12,
            borderBottomWidth: 1,
            borderColor: C.border,
          }}
        >
          <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>
            Сагс ({cart.reduce((s, i) => s + i.qty, 0)})
          </Text>
          {cart.length > 0 && (
            <TouchableOpacity onPress={clearCart}>
              <Text style={{ color: C.error, fontSize: 12 }}>Цэвэрлэх</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Cart items */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 8, gap: 6 }}>
          {cart.length === 0 ? (
            <Text
              style={{ color: C.textMuted, textAlign: 'center', marginTop: 40, fontSize: 13 }}
            >
              Бараа сонгоно уу
            </Text>
          ) : (
            cart.map((item) => (
              <View
                key={item.product.id}
                style={{
                  backgroundColor: C.bgSection,
                  borderRadius: UI.controlRadius,
                  padding: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: C.text, fontSize: 11, fontWeight: '500' }}
                    numberOfLines={1}
                  >
                    {item.product.name}
                  </Text>
                  <Text style={{ color: C.textSub, fontSize: 10, marginTop: 2 }}>
                    {item.product.price.toLocaleString()}₮ × {item.qty}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => updateQty(item.product.id, item.qty - 1)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: R.full,
                      backgroundColor: C.bgCard,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: C.border,
                    }}
                  >
                    <Text style={{ color: C.text, fontSize: 14, lineHeight: 18 }}>−</Text>
                  </TouchableOpacity>
                  <Text
                    style={{
                      color: C.text,
                      fontSize: 13,
                      fontWeight: '600',
                      minWidth: 20,
                      textAlign: 'center',
                    }}
                  >
                    {item.qty}
                  </Text>
                  <TouchableOpacity
                    onPress={() => updateQty(item.product.id, item.qty + 1)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: R.full,
                      backgroundColor: C.bgCard,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: C.border,
                    }}
                  >
                    <Text style={{ color: C.text, fontSize: 14, lineHeight: 18 }}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text
                  style={{
                    color: C.store,
                    fontSize: 12,
                    fontWeight: '700',
                    minWidth: 70,
                    textAlign: 'right',
                  }}
                >
                  {item.subtotal.toLocaleString()}₮
                </Text>
              </View>
            ))
          )}
        </ScrollView>

        {/* Totals */}
        <View
          style={{
            borderTopWidth: 1,
            borderColor: C.border,
            padding: 12,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: C.textSub, fontSize: 12 }}>Дүн</Text>
            <Text style={{ color: C.text, fontSize: 12 }}>{subtotal.toLocaleString()}₮</Text>
          </View>

          <TouchableOpacity
            onPress={() => setVatEnabled((v) => !v)}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons
                name={vatEnabled ? 'checkmark-circle' : 'ellipse-outline'}
                size={14}
                color={vatEnabled ? C.warning : C.textMuted}
              />
              <Text style={{ color: C.textSub, fontSize: 12 }}>НӨАТ 10%</Text>
            </View>
            <Text style={{ color: vatEnabled ? C.warning : C.textMuted, fontSize: 12 }}>
              {vatEnabled ? vatAmount.toLocaleString() + '₮' : '—'}
            </Text>
          </TouchableOpacity>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingTop: 6,
              borderTopWidth: 1,
              borderColor: C.border,
            }}
          >
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>Нийт</Text>
            <Text style={{ color: C.store, fontSize: 18, fontWeight: '700' }}>
              {total.toLocaleString()}₮
            </Text>
          </View>

          {/* Payment method */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            {(['cash', 'qpay', 'card'] as PayMethod[]).map((m) => {
              const on = payMethod === m;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => selectPayMethod(m)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: UI.controlRadius,
                    backgroundColor: on ? C.store : C.bgSection,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: on ? C.store : C.border,
                  }}
                >
                  <Ionicons
                    name={m === 'cash' ? 'cash-outline' : m === 'qpay' ? 'phone-portrait-outline' : 'card-outline'}
                    size={18}
                    color={on ? C.bgCard : C.textSub}
                  />
                  <Text
                    style={{
                      color: on ? C.bgCard : C.textSub,
                      fontSize: 9,
                      marginTop: 2,
                    }}
                  >
                    {m === 'cash' ? 'Бэлэн' : m === 'qpay' ? 'QPay' : 'Карт'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cash received */}
          {payMethod === 'cash' && (
            <View style={{ gap: 4 }}>
              <TextInput
                value={cashInput}
                onChangeText={setCashInput}
                placeholder="Авсан мөнгө..."
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
                style={{
                  backgroundColor: C.bgInput,
                  borderRadius: UI.controlRadius,
                  paddingHorizontal: 12,
                  height: 40,
                  color: C.text,
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              />
              {change > 0 && (
                <Text style={{ color: C.success, fontSize: 12, textAlign: 'right' }}>
                  Хариулт: {change.toLocaleString()}₮
                </Text>
              )}
            </View>
          )}

          {/* Checkout */}
          <TouchableOpacity
            onPress={handleCheckout}
            disabled={cart.length === 0 || cashMutation.isPending}
            style={{
              backgroundColor: cart.length === 0 ? C.bgSection : C.success,
              borderRadius: UI.controlRadius,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 4,
            }}
          >
            {cashMutation.isPending ? (
              <ActivityIndicator color={C.bgCard} />
            ) : (
              <Text
                style={{
                  color: cart.length === 0 ? C.textMuted : C.bgCard,
                  fontSize: 15,
                  fontWeight: '700',
                }}
              >
                Төлбөр авах
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Barcode scanner — DISABLED until EAS build ─── */}
      {/* <BarcodeScanner
        visible={scannerOpen}
        onScan={handleBarcodeScan}
        onClose={() => setScannerOpen(false)}
      /> */}

      {/* ─── QPay modal ─── */}
      {qpayModal && (
        <View
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: C.text + '73',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: C.bgCard,
              borderRadius: UI.cardRadius,
              padding: UI.screenPad,
              width: 340,
              alignItems: 'center',
              gap: 16,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>
              QPay — {total.toLocaleString()}₮
            </Text>

            <View
              style={{
                width: 220,
                height: 220,
                backgroundColor: C.bgCard,
                borderRadius: R.md,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 8,
              }}
            >
              {qrData?.qrImage ? (
                <Image
                  source={{ uri: `data:image/png;base64,${qrData.qrImage}` }}
                  style={{ width: 204, height: 204 }}
                  resizeMode="contain"
                />
              ) : (
                <ActivityIndicator size="large" color={C.store} />
              )}
            </View>

            {polling && (
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={C.store} />
                <Text style={{ color: C.textSub, fontSize: 13 }}>Төлбөр хүлээж байна...</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={cancelQPay}
              style={{
                backgroundColor: C.bgSection,
                borderRadius: UI.controlRadius,
                paddingHorizontal: 24,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <Text style={{ color: C.textSub, fontSize: 13 }}>Болих</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}



