import { ActivityIndicator, Alert, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { OrderAPI } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppIconButton, AppScreen, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

const METHOD_LABEL: Record<string, string> = {
  qpay: 'QPay',
  socialpay: 'SocialPay',
  card: 'Карт',
  cash: 'Бэлэн',
  wallet: 'Хэтэвч',
};

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const layout = useAppLayoutMetrics();
  const { data, isLoading } = useQuery<any>({
    queryKey: ['order', id],
    queryFn: () => OrderAPI.detail(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <AppScreen contentContainerStyle={{ flexGrow: 1 }}>
        <AppTopBar eyebrow="Захиалгын баримт" title={`#${shortId(id, 8)}`} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.brand} />
          <Text style={{ ...F.small, color: C.textSub, marginTop: R.md }}>Баримт ачаалж байна...</Text>
        </View>
      </AppScreen>
    );
  }

  const order: any = (data as any)?.data?.order || (data as any)?.order || data;
  if (!order) {
    return (
      <AppScreen contentContainerStyle={{ flexGrow: 1 }}>
        <AppTopBar eyebrow="Захиалгын баримт" title={`#${shortId(id, 8)}`} />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <AppCard style={{ alignItems: 'center', gap: R.sm }}>
            <Ionicons name="receipt-outline" size={44} color={C.textMuted} />
            <Text style={{ ...F.h4, color: C.text }}>Захиалга олдсонгүй</Text>
            <AppButton label="Буцах" icon="arrow-back" variant="ghost" onPress={() => router.back()} />
          </AppCard>
        </View>
      </AppScreen>
    );
  }

  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const subtotal = items.reduce((sum, item) => sum + itemTotal(item), 0);
  const total = order.total ?? subtotal;
  const orderId = String(order.id ?? order._id ?? id);
  const short = shortId(orderId, 8);
  const deliveryAddress = formatAddress(order.deliveryAddress ?? order.shippingAddress ?? order.address);

  async function handleShare() {
    const lines = [
      'eSeller.mn',
      `Баримт: #${short}`,
      `Огноо: ${new Date(order.createdAt ?? Date.now()).toLocaleString('mn-MN')}`,
      '',
      ...items.map(
        (item) =>
          `${itemName(item)} x${item.quantity ?? item.qty ?? 1} ${formatMoney(itemTotal(item))}`,
      ),
      '',
      `Дүн: ${formatMoney(subtotal)}`,
      `Нийт: ${formatMoney(total)}`,
      `Төлбөр: ${METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod ?? '-'}`,
      '',
      'Баярлалаа! eseller.mn',
    ];

    try {
      await Share.share({ message: lines.join('\n'), title: `eSeller баримт #${short}` });
    } catch (error: any) {
      Alert.alert('Алдаа', error?.message || 'Хуваалцаж чадсангүй.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <AppScreen contentContainerStyle={{ paddingBottom: layout.screenBottom + 96 }}>
        <AppTopBar
          eyebrow="Захиалгын баримт"
          title={`#${short}`}
          right={<AppIconButton icon="share-outline" color={C.brand} onPress={handleShare} accessibilityLabel="Баримт хуваалцах" />}
        />

        <AppHeader
          title="Баримт"
          subtitle="Захиалгын бараа, төлбөр болон хүргэлтийн мэдээлэл."
          icon="receipt-outline"
          accent={C.brand}
        />

        <AppCard style={{ padding: R.xl, marginBottom: R.md }}>
        <Text style={{ ...F.h2, color: C.text, textAlign: 'center' }}>
          eseller<Text style={{ color: C.brand }}>.mn</Text>
        </Text>
        <Text style={{ ...F.tiny, color: C.textMuted, textAlign: 'center', marginTop: 2 }}>
          Монголын нэгдсэн цахим зах
        </Text>

        <Divider />

        <Row label="Баримт №" value={`#${short}`} />
        <Row label="Огноо" value={formatDate(order.createdAt ?? Date.now())} />
        <Row label="Төлбөр" value={METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod ?? '-'} />
        <Row label="Төлөв" value={formatStatus(order.status)} />

        <Divider />

        <Text style={{ ...F.tiny, color: C.textMuted, fontWeight: '900', marginBottom: R.sm }}>Бараа</Text>
        {items.length === 0 ? (
          <Text style={{ ...F.small, color: C.textMuted }}>Бараа байхгүй</Text>
        ) : (
          items.map((item, index) => (
            <View key={`${item.id ?? item.name}:${index}`} style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.sm }}>
              <Text style={{ ...F.small, color: C.text, flex: 1 }} numberOfLines={2}>
                {itemName(item)}
              </Text>
              <Text style={{ ...F.tiny, color: C.textMuted, width: 42, textAlign: 'right' }}>
                x{item.quantity ?? item.qty ?? 1}
              </Text>
              <Text style={{ ...F.small, color: C.text, width: 96, textAlign: 'right', fontWeight: '800' }}>
                {formatMoney(itemTotal(item))}
              </Text>
            </View>
          ))
        )}

        <Divider />

        <Row label="Дүн" value={formatMoney(subtotal)} />
        {order.deliveryFee > 0 ? <Row label="Хүргэлт" value={formatMoney(order.deliveryFee)} /> : null}
        {order.vatAmount > 0 ? <Row label="НӨАТ" value={formatMoney(order.vatAmount)} /> : null}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: R.md, paddingTop: R.sm, marginTop: R.xs, borderTopWidth: 1, borderTopColor: C.border }}>
          <Text style={{ ...F.h4, color: C.text }}>Нийт</Text>
          <Text style={{ ...F.h4, color: C.brand }}>{formatMoney(total)}</Text>
        </View>

        {deliveryAddress ? (
          <>
            <Divider />
            <Text style={{ ...F.tiny, color: C.textMuted, fontWeight: '900', marginBottom: R.xs }}>
              Хүргэлтийн хаяг
            </Text>
            <Text style={{ ...F.small, color: C.text, lineHeight: 20 }}>{deliveryAddress}</Text>
          </>
        ) : null}

        <Divider />
        <Text style={{ ...F.tiny, color: C.textMuted, textAlign: 'center' }}>Баярлалаа! eseller.mn</Text>
        </AppCard>
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
        <AppButton label="Баримт хуваалцах" icon="share-social-outline" onPress={handleShare} />
      </View>
    </View>
  );
}

function shortId(value: any, size: number) {
  const id = String(value ?? '').trim();
  return id ? id.slice(-size).toLocaleUpperCase('en-US') : 'ORDER';
}

function itemName(item: any) {
  return item?.name ?? item?.productName ?? item?.product?.name ?? 'Бараа';
}

function itemTotal(item: any) {
  return Number(item?.total ?? item?.lineTotal ?? (item?.price ?? 0) * (item?.quantity ?? item?.qty ?? 1));
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: R.md, marginBottom: R.xs }}>
      <Text style={{ ...F.small, color: C.textSub }}>{label}</Text>
      <Text style={{ ...F.small, color: C.text, fontWeight: '800', flex: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: C.border, marginVertical: R.md }} />;
}

function formatMoney(value?: number) {
  return `${Number(value || 0).toLocaleString()}₮`;
}

function formatDate(value: string | number | Date) {
  return new Date(value).toLocaleString('mn-MN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatStatus(status?: string) {
  const labels: Record<string, string> = {
    pending: 'Хүлээгдэж',
    paid: 'Төлсөн',
    processing: 'Бэлтгэж',
    shipped: 'Илгээсэн',
    delivered: 'Хүргэгдсэн',
    cancelled: 'Цуцалсан',
  };

  return status ? labels[String(status).toLowerCase()] ?? String(status) : '-';
}

function formatAddress(value: any) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const parts = [
    value.city,
    value.district,
    value.khoroo,
    value.street,
    value.address,
    value.detail,
  ].filter(Boolean);
  return parts.join(', ');
}
