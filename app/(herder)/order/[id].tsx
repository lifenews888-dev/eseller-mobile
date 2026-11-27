import { useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HerderAPI } from '../../../src/features/herder/api';
import type { HerderOrderStatus, MyHerderOrder, MyOrdersResponse } from '../../../src/features/herder/types';
import { C, F, R, UI } from '../../../src/shared/design';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppScreen,
  AppTopBar,
  useAppLayoutMetrics,
} from '../../../src/shared/ui/AppUI';

const STATUS_LABEL: Record<HerderOrderStatus, string> = {
  pending: 'Хүлээгдэж',
  confirmed: 'Баталгаажсан',
  preparing: 'Бэлтгэж',
  shipped: 'Илгээсэн',
  delivered: 'Хүргэгдсэн',
  cancelled: 'Цуцалсан',
};

const STATUS_COLOR: Record<HerderOrderStatus, string> = {
  pending: C.gold,
  confirmed: C.primary,
  preparing: C.secondary,
  shipped: C.herder,
  delivered: C.success,
  cancelled: C.error,
};

const NEXT: Partial<Record<HerderOrderStatus, { to: HerderOrderStatus; label: string; needsNote: boolean }>> = {
  confirmed: { to: 'preparing', label: 'Бэлтгэж эхлэх', needsNote: false },
  preparing: { to: 'shipped', label: 'Илгээсэн гэж тэмдэглэх', needsNote: true },
};

const PAYMENT_STATUS_LABEL: Record<MyHerderOrder['payment']['status'], string> = {
  pending: 'Хүлээгдэж',
  paid: 'Төлсөн',
  failed: 'Амжилтгүй',
  refunded: 'Буцаасан',
};

export default function HerderOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ to: HerderOrderStatus } | null>(null);
  const [note, setNote] = useState('');
  const layout = useAppLayoutMetrics();

  const list = useQuery({
    queryKey: ['herder', 'my', 'orders', 'all'],
    queryFn: () => HerderAPI.my.orders.list(),
    staleTime: 30_000,
  });

  const order: MyHerderOrder | undefined = useMemo(() => {
    if (!id) return undefined;

    const caches = qc.getQueriesData<MyOrdersResponse>({ queryKey: ['herder', 'my', 'orders'] });
    for (const [, data] of caches) {
      const hit = data?.orders.find((item) => item._id === id);
      if (hit) return hit;
    }

    return list.data?.orders.find((item) => item._id === id);
  }, [id, qc, list.data]);

  const advance = useMutation({
    mutationFn: ({ to, noteText }: { to: HerderOrderStatus; noteText?: string }) =>
      HerderAPI.my.orders.updateStatus(id as string, to, noteText),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['herder', 'my', 'orders'] });
      qc.invalidateQueries({ queryKey: ['herder', 'my', 'earnings'] });
      setModal(null);
      setNote('');
    },
    onError: (error: Error) => Alert.alert('Алдаа', error.message),
  });

  if (list.isLoading && !order) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.herder} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: UI.screenPad, justifyContent: 'center' }}>
        <AppCard style={{ alignItems: 'center', gap: R.sm }}>
          <Ionicons name="alert-circle-outline" size={44} color={C.textMuted} />
          <Text style={{ ...F.h4, color: C.text, textAlign: 'center' }}>Захиалга олдсонгүй</Text>
          <Text style={{ ...F.small, color: C.textSub, textAlign: 'center' }}>
            Жагсаалт руу буцаад захиалгаа дахин сонгоно уу.
          </Text>
          <AppButton label="Буцах" icon="arrow-back" variant="ghost" onPress={() => router.back()} />
        </AppCard>
      </View>
    );
  }

  const next = NEXT[order.status];
  const address = order.delivery?.address ?? {};
  const buyerPhone = order.buyer?.phone ?? order.delivery?.phone;

  const onNextPress = () => {
    if (!next) return;
    if (next.needsNote) {
      setModal({ to: next.to });
      return;
    }
    advance.mutate({ to: next.to });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <AppScreen contentContainerStyle={{ paddingBottom: next ? layout.screenBottom + 30 : layout.screenBottom }}>
        <AppTopBar
          eyebrow="Захиалгын дугаар"
          title={`#${order.orderNumber}`}
          right={<StatusBadge status={order.status} />}
        />

        <AppHeader
          title="Захиалгын дэлгэрэнгүй"
          subtitle="Үйлчлүүлэгч, хүргэлт, төлбөр болон явцын мэдээлэл."
          icon="receipt-outline"
          accent={C.herder}
        />

        <Section title="Үйлчлүүлэгч">
          <Row label="Нэр" value={order.buyer?.name ?? 'Бүртгэлгүй хэрэглэгч'} />
          {buyerPhone ? (
            <Row
              label="Утас"
              value={buyerPhone}
              cta="Залгах"
              onPress={() => Linking.openURL(`tel:${buyerPhone}`)}
            />
          ) : null}
          {order.delivery?.receiver ? <Row label="Хүлээн авагч" value={order.delivery.receiver} /> : null}
        </Section>

        <Section title="Хүргэлт">
          <Row label="Аймаг" value={address.province ?? 'Тодорхойгүй'} />
          <Row label="Сум / Дүүрэг" value={address.district ?? 'Тодорхойгүй'} />
          {address.street ? <Row label="Хаяг" value={address.street} /> : null}
          {address.note ? <Row label="Тэмдэглэл" value={address.note} /> : null}
          {order.delivery?.requiresColdChain ? (
            <View
              style={{
                backgroundColor: C.primaryDim,
                borderRadius: UI.controlRadius,
                padding: R.sm,
                marginTop: R.sm,
                flexDirection: 'row',
                alignItems: 'center',
                gap: R.xs,
              }}
            >
              <Ionicons name="snow-outline" size={16} color={C.primary} />
              <Text style={{ ...F.small, color: C.primary, fontWeight: '800' }}>
                Хүйтэн сүлжээ шаардлагатай
              </Text>
            </View>
          ) : null}
          {order.delivery?.trackingCode ? <Row label="Тракинг" value={order.delivery.trackingCode} /> : null}
          {order.delivery?.shippedAt ? <Row label="Илгээсэн" value={formatDate(order.delivery.shippedAt)} /> : null}
          {order.delivery?.deliveredAt ? (
            <Row label="Хүргэгдсэн" value={formatDate(order.delivery.deliveredAt)} />
          ) : null}
        </Section>

        <Section title="Захиалгын агуулга">
          {order.items.map((item, index) => (
            <View
              key={`${item.product}:${index}`}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: R.sm,
                paddingVertical: R.sm,
                borderBottomWidth: index === order.items.length - 1 ? 0 : 1,
                borderBottomColor: C.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ ...F.small, color: C.text, fontWeight: '800' }} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={{ ...F.tiny, color: C.textSub, marginTop: 2 }}>
                  {item.quantity} × {formatMoney(item.price)}
                </Text>
              </View>
              <Text style={{ ...F.small, color: C.text, fontWeight: '900' }}>{formatMoney(item.subtotal)}</Text>
            </View>
          ))}

          <View style={{ height: 1, backgroundColor: C.border, marginVertical: R.sm }} />
          <Row label="Барааны дүн" value={formatMoney(order.subtotal)} />
          {order.deliveryFee > 0 ? <Row label="Хүргэлт" value={formatMoney(order.deliveryFee)} /> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: R.md, marginTop: R.sm }}>
            <Text style={{ ...F.h4, color: C.text }}>Нийт</Text>
            <Text style={{ ...F.h4, color: C.herder }}>{formatMoney(order.total)}</Text>
          </View>
        </Section>

        <Section title="Төлбөр">
          <Row label="Арга" value={formatPaymentMethod(order.payment.method)} />
          <Row label="Төлөв" value={PAYMENT_STATUS_LABEL[order.payment.status]} />
          {order.payment.paidAt ? <Row label="Төлсөн" value={formatDate(order.payment.paidAt)} /> : null}
        </Section>

        {order.statusHistory && order.statusHistory.length > 0 ? (
          <Section title="Түүх">
            {order.statusHistory.map((event, index) => (
              <View
                key={`${event.status}:${event.at}:${index}`}
                style={{ flexDirection: 'row', gap: R.sm, paddingVertical: R.xs, alignItems: 'flex-start' }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: R.full,
                    backgroundColor: STATUS_COLOR[event.status],
                    marginTop: 6,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...F.small, color: C.text, fontWeight: '800' }}>
                    {STATUS_LABEL[event.status]}
                    {event.byRole ? (
                      <Text style={{ color: C.textMuted, fontWeight: '400' }}> - {formatActor(event.byRole)}</Text>
                    ) : null}
                  </Text>
                  <Text style={{ ...F.tiny, color: C.textSub }}>{formatDate(event.at)}</Text>
                  {event.note ? (
                    <Text style={{ ...F.small, color: C.textSub, marginTop: 2 }}>{event.note}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </Section>
        ) : null}
      </AppScreen>

      {next ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: R.md,
            paddingBottom: layout.insets.bottom + R.md,
            backgroundColor: C.bgCard,
            borderTopWidth: 1,
            borderTopColor: C.border,
          }}
        >
          <AppButton
            label={advance.isPending ? 'Илгээж байна' : next.label}
            icon="arrow-forward"
            variant="success"
            disabled={advance.isPending}
            onPress={onNextPress}
            style={{
              backgroundColor: advance.isPending ? C.border2 : C.herder,
              borderColor: advance.isPending ? C.border2 : C.herder,
            }}
          />
        </View>
      ) : null}

      <Modal transparent visible={!!modal} animationType="fade" onRequestClose={() => setModal(null)}>
          <View style={{ flex: 1, backgroundColor: C.text + '73', justifyContent: 'center', padding: UI.screenPad }}>
          <AppCard elevated style={{ gap: R.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm }}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: UI.controlRadius,
                  backgroundColor: C.herder + '18',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="cube-outline" size={20} color={C.herder} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...F.h3, color: C.text }}>Илгээлтийн мэдээлэл</Text>
                <Text style={{ ...F.small, color: C.textSub }}>
                  Үйлчлүүлэгчид харагдах тэмдэглэл оруулна уу.
                </Text>
              </View>
            </View>

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="жш: UBTR-1234, жолооч 99001234"
              placeholderTextColor={C.textMuted}
              multiline
              style={{
                minHeight: 92,
                backgroundColor: C.bgSection,
                borderRadius: UI.controlRadius,
                borderWidth: 1,
                borderColor: C.border,
                padding: R.md,
                color: C.text,
                textAlignVertical: 'top',
              }}
            />

            <View style={{ flexDirection: 'row', gap: R.sm }}>
              <AppButton
                label="Болих"
                variant="ghost"
                onPress={() => {
                  setModal(null);
                  setNote('');
                }}
                style={{ flex: 1 }}
              />
              <AppButton
                label="Илгээх"
                icon="send"
                variant="success"
                disabled={advance.isPending}
                onPress={() => {
                  if (modal) {
                    advance.mutate({ to: modal.to, noteText: note.trim() || undefined });
                  }
                }}
                style={{
                  flex: 1,
                  backgroundColor: advance.isPending ? C.border2 : C.herder,
                  borderColor: advance.isPending ? C.border2 : C.herder,
                }}
              />
            </View>
          </AppCard>
        </View>
      </Modal>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AppCard style={{ marginBottom: R.md }}>
      <Text style={{ ...F.h4, color: C.text, marginBottom: R.sm }}>{title}</Text>
      {children}
    </AppCard>
  );
}

function Row({
  label,
  value,
  onPress,
  cta,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  cta?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: R.md,
        paddingVertical: R.xs,
      }}
    >
      <Text style={{ ...F.small, color: C.textSub }}>{label}</Text>
      {onPress ? (
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={onPress}
          style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: R.xs }}
        >
          <Text style={{ ...F.small, color: C.herder, fontWeight: '800', textAlign: 'right' }} numberOfLines={2}>
            {value}
          </Text>
          {cta ? <Text style={{ ...F.tiny, color: C.herder, fontWeight: '800' }}>{cta}</Text> : null}
        </TouchableOpacity>
      ) : (
        <Text style={{ ...F.small, color: C.text, fontWeight: '700', flex: 1, textAlign: 'right' }} numberOfLines={3}>
          {value}
        </Text>
      )}
    </View>
  );
}

function StatusBadge({ status }: { status: HerderOrderStatus }) {
  return (
    <View
      style={{
        backgroundColor: STATUS_COLOR[status] + '22',
        borderRadius: R.full,
        paddingHorizontal: R.sm,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: STATUS_COLOR[status] + '33',
      }}
    >
      <Text style={{ ...F.tiny, color: STATUS_COLOR[status], fontWeight: '900' }}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

function formatMoney(value?: number) {
  return `${Number(value || 0).toLocaleString()}₮`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('mn-MN');
  } catch {
    return iso;
  }
}

function formatPaymentMethod(method: string) {
  const labels: Record<string, string> = {
    cash: 'Бэлэн',
    card: 'Карт',
    qpay: 'QPay',
    bank: 'Банк',
    transfer: 'Шилжүүлэг',
  };

  return labels[method.toLowerCase()] ?? method;
}

function formatActor(role: string) {
  const labels: Record<string, string> = {
    buyer: 'Худалдан авагч',
    herder: 'Малчин',
    coordinator: 'Зохицуулагч',
    admin: 'Админ',
  };

  return labels[role.toLowerCase()] ?? role;
}
