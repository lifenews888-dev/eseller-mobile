import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { HerderAPI } from '../../src/features/herder/api';
import type { HerderOrderStatus } from '../../src/features/herder/types';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

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

const FILTERS = ['all', 'pending', 'confirmed', 'preparing', 'shipped'] as const;
type HerderOrderFilter = (typeof FILTERS)[number];

function normalizeOrderFilter(value?: string | string[] | null): HerderOrderFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return FILTERS.includes(raw as HerderOrderFilter) ? (raw as HerderOrderFilter) : 'all';
}

export default function HerderOrders() {
  const params = useLocalSearchParams<{ status?: string }>();
  const [filter, setFilter] = useState<HerderOrderFilter>(() => normalizeOrderFilter(params.status));
  const layout = useAppLayoutMetrics();

  useEffect(() => {
    setFilter(normalizeOrderFilter(params.status));
  }, [params.status]);

  const selectFilter = (nextFilter: HerderOrderFilter) => {
    setFilter(nextFilter);
    router.replace(
      nextFilter === 'all'
        ? ('/herder-admin/orders' as any)
        : ({ pathname: '/herder-admin/orders' as any, params: { status: nextFilter } } as any),
    );
  };

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['herder', 'my', 'orders', filter],
    queryFn: () => HerderAPI.my.orders.list(filter === 'all' ? {} : { status: filter }),
  });

  const orders = data?.orders ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={orders}
        keyExtractor={(order) => order._id}
        contentContainerStyle={{
          padding: UI.screenPad,
          paddingTop: layout.screenTop,
          paddingBottom: layout.screenBottom,
        }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.herder} />
        }
        ListHeaderComponent={
          <>
            <AppTopBar eyebrow="Малчин" title="Захиалга" showBack={false} />
            <AppHeader
              title="Захиалга"
              subtitle="Малчнаас ирсэн захиалгын төлөв, хүргэлтийн мэдээлэл."
              icon="receipt-outline"
              accent={C.herder}
              style={{ marginBottom: R.md }}
            />
            <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.md, flexWrap: 'wrap' }}>
              {FILTERS.map((item) => (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.84}
                  onPress={() => selectFilter(item)}
                  style={{
                    minHeight: 36,
                    paddingHorizontal: R.md,
                    paddingVertical: R.sm,
                    borderRadius: R.full,
                    backgroundColor: filter === item ? C.herder : C.bgSection,
                    borderWidth: 1,
                    borderColor: filter === item ? C.herder : C.border,
                  }}
                >
                  <Text
                    style={{
                      ...F.tiny,
                    color: filter === item ? C.bgCard : C.text,
                      fontWeight: '800',
                    }}
                  >
                    {item === 'all' ? 'Бүгд' : STATUS_LABEL[item]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        renderItem={({ item: order }) => (
          <TouchableOpacity
            activeOpacity={0.86}
            accessibilityLabel={`Захиалга ${order.orderNumber}`}
            onPress={() =>
              router.push({ pathname: '/herder-admin/order/[id]', params: { id: order._id } } as never)
            }
          >
            <AppCard style={{ padding: R.md, marginBottom: R.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ ...F.body, color: C.text, fontWeight: '900' }}>
                  #{order.orderNumber}
                </Text>
                <StatusBadge status={order.status} />
              </View>
              <Text style={{ ...F.tiny, color: C.textSub, marginTop: R.xs }}>
                {order.buyer?.name ?? 'Үйлчлүүлэгч'} · {order.delivery?.address?.district ?? ''}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: R.sm }}>
                <Text style={{ ...F.h3, color: C.herder }}>{formatMoney(order.total)}</Text>
                <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
              </View>
              {order.delivery?.requiresColdChain ? (
                <View
                  style={{
                    backgroundColor: C.primaryDim,
                    borderRadius: R.full,
                    paddingHorizontal: R.sm,
                    paddingVertical: 3,
                    alignSelf: 'flex-start',
                    marginTop: R.sm,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Ionicons name="snow-outline" size={12} color={C.primary} />
                  <Text style={{ ...F.tiny, color: C.primary, fontWeight: '800' }}>
                    Хүйтэн сүлжээ
                  </Text>
                </View>
              ) : null}
            </AppCard>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <AppCard style={{ alignItems: 'center', gap: R.sm, marginTop: R.lg }}>
            <Ionicons name="receipt-outline" size={44} color={C.textMuted} />
            <Text style={{ ...F.body, color: C.textSub }}>Захиалга байхгүй</Text>
            <AppButton
              label="Бараа нэмэх"
              icon="add"
              variant="ghost"
              onPress={() => router.push('/herder-admin/listing-form' as never)}
            />
          </AppCard>
        }
      />
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
        paddingVertical: 3,
      }}
    >
      <Text style={{ ...F.tiny, color: STATUS_COLOR[status], fontWeight: '800' }}>
        {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString()}₮`;
}
