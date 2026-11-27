import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { POSAPI } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import {
  AppCard,
  AppHeader,
  AppIconButton,
  AppMetricCard,
  AppTopBar,
  useAppLayoutMetrics,
} from '../../src/shared/ui/AppUI';

function unwrap<T = any>(res: any): T {
  return (res?.data ?? res) as T;
}

interface POSSale {
  id: string;
  total: number;
  paymentMethod: string;
  itemCount: number;
  vatAmount?: number;
  createdAt: string;
  status?: 'completed' | 'refunded' | 'voided' | string;
  refundReason?: string | null;
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Бэлэн',
  qpay: 'QPay',
  card: 'Карт',
};

const VOID_WINDOW_MS = 5 * 60 * 1000;

function statusBadge(status?: string) {
  switch (status) {
    case 'refunded':
      return { label: 'Буцаалт', bg: C.errorDim, fg: C.error };
    case 'voided':
      return { label: 'Хүчингүй', bg: C.bgSection, fg: C.textSub };
    default:
      return { label: 'Дууссан', bg: C.success + '18', fg: C.success };
  }
}

export default function POSHistory() {
  const today = new Date().toISOString().split('T')[0];
  const qc = useQueryClient();
  const layout = useAppLayoutMetrics();

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['pos', 'history', today],
    queryFn: async () => {
      const res = await POSAPI.getSalesHistory(today);
      return unwrap<{
        sales: POSSale[];
        totalRevenue: number;
        totalOrders: number;
        refundedCount: number;
        refundedAmount: number;
      }>(res);
    },
  });

  const sales = data?.sales ?? [];
  const totalRev = data?.totalRevenue ?? 0;
  const totalOrders = data?.totalOrders ?? 0;
  const refundedCount = data?.refundedCount ?? 0;
  const refundedAmount = data?.refundedAmount ?? 0;

  async function doRefund(sale: POSSale, isVoid: boolean) {
    try {
      if (isVoid) {
        await POSAPI.voidOrder(sale.id);
      } else {
        await POSAPI.refundOrder(sale.id, 'Кассын буцаалт');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      qc.invalidateQueries({ queryKey: ['pos', 'history'] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
      Alert.alert(
        'Амжилттай',
        isVoid ? 'Захиалга хүчингүй болгосон' : 'Буцаалт хийгдлээ',
      );
    } catch (e: any) {
      Alert.alert('Алдаа', e?.message || 'Үйлдэл амжилтгүй');
    }
  }

  function onSalePress(sale: POSSale) {
    const resolvedStatus = sale.status ?? 'completed';
    if (resolvedStatus !== 'completed') {
      const badge = statusBadge(resolvedStatus);
      Alert.alert(
        `#${sale.id.slice(-6).toUpperCase()}`,
        `${badge.label} · ${formatMoney(sale.total)}\n${sale.refundReason ?? ''}`,
        [{ text: 'OK' }],
      );
      return;
    }

    const elapsed = Date.now() - new Date(sale.createdAt).getTime();
    const isVoidable = elapsed < VOID_WINDOW_MS;
    const actionLabel = isVoidable
      ? `Void (${Math.max(0, Math.ceil((VOID_WINDOW_MS - elapsed) / 60000))} мин үлдсэн)`
      : 'Буцаалт';

    Alert.alert(
      `#${sale.id.slice(-6).toUpperCase()}`,
      `${formatMoney(sale.total)} · ${METHOD_LABEL[sale.paymentMethod] ?? sale.paymentMethod}`,
      [
        { text: 'Болих', style: 'cancel' },
        {
          text: actionLabel,
          style: 'destructive',
          onPress: () => doRefund(sale, isVoidable),
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={sales}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{
          paddingHorizontal: UI.screenPad,
          paddingBottom: layout.screenBottom,
          gap: R.sm,
        }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.store} />
        }
        ListHeaderComponent={
          <View style={{ paddingTop: layout.screenTop, paddingBottom: R.sm }}>
            <AppTopBar
              eyebrow="Касс"
              title="Өнөөдрийн борлуулалт"
              right={
                <AppIconButton
                  icon="refresh"
                  onPress={() => refetch()}
                  color={C.store}
                  accessibilityLabel="Шинэчлэх"
                  style={{ backgroundColor: C.store + '14', borderColor: C.store + '30' }}
                />
              }
            />

            <AppHeader
              title="Өнөөдрийн борлуулалт"
              subtitle="Кассын гүйлгээ, буцаалт, хүчингүй захиалгаа хянана."
              icon="receipt-outline"
              accent={C.store}
              style={{ marginBottom: R.md }}
            />

            <View style={{ flexDirection: 'row', gap: R.sm }}>
              <AppMetricCard label="Цэвэр орлого" value={formatMoney(totalRev)} accent={C.store} />
              <AppMetricCard label="Захиалга" value={totalOrders} accent={C.primary} />
            </View>
            <AppCard style={{ marginTop: R.sm, padding: R.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...F.small, color: C.textSub, fontWeight: '800' }}>
                    Буцаалт
                  </Text>
                  <Text style={{ ...F.h3, color: C.error, marginTop: 2 }}>
                    {refundedCount}
                  </Text>
                </View>
                {refundedAmount > 0 ? (
                  <Text style={{ ...F.small, color: C.error, fontWeight: '800' }}>
                    −{formatMoney(refundedAmount)}
                  </Text>
                ) : null}
              </View>
            </AppCard>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ alignItems: 'center', marginTop: 40, gap: R.sm }}>
              <ActivityIndicator color={C.store} />
              <Text style={{ ...F.small, color: C.textSub }}>Ачаалж байна...</Text>
            </View>
          ) : (
            <AppCard style={{ alignItems: 'center', gap: R.sm, marginTop: R.lg }}>
              <Ionicons name="receipt-outline" size={34} color={C.textMuted} />
              <Text style={{ ...F.small, color: C.textSub }}>
                Өнөөдөр борлуулалт байхгүй
              </Text>
            </AppCard>
          )
        }
        renderItem={({ item }) => {
          const resolvedStatus = item.status ?? 'completed';
          const badge = statusBadge(resolvedStatus);
          const dimmed = resolvedStatus !== 'completed';

          return (
            <TouchableOpacity activeOpacity={0.84} onPress={() => onSalePress(item)}>
              <AppCard style={{ padding: R.md, opacity: dimmed ? 0.68 : 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.md }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm }}>
                      <Text style={{ ...F.small, color: C.text, fontWeight: '800' }}>
                        #{item.id.slice(-6).toUpperCase()}
                      </Text>
                      <View
                        style={{
                          backgroundColor: badge.bg,
                          borderRadius: R.full,
                          paddingHorizontal: R.sm,
                          paddingVertical: 3,
                        }}
                      >
                        <Text style={{ ...F.tiny, color: badge.fg, fontWeight: '800' }}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ ...F.tiny, color: C.textMuted, marginTop: 4 }}>
                      {item.itemCount} бараа ·{' '}
                      {new Date(item.createdAt).toLocaleTimeString('mn-MN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Text style={{ ...F.tiny, color: C.textSub, fontWeight: '700' }}>
                    {METHOD_LABEL[item.paymentMethod] ?? item.paymentMethod}
                  </Text>
                  <Text
                    style={{
                      ...F.small,
                      color: resolvedStatus === 'completed' ? C.store : C.error,
                      fontWeight: '900',
                      textDecorationLine: dimmed ? 'line-through' : 'none',
                    }}
                  >
                    {formatMoney(item.total)}
                  </Text>
                </View>
              </AppCard>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString()}₮`;
}
