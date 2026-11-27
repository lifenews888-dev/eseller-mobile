import { useMemo } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { HerderAPI } from '../../src/features/herder/api';
import type { EarningsSummary } from '../../src/features/herder/types';
import { C, F, R, UI } from '../../src/shared/design';
import { AppCard, AppHeader, AppMetricCard, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

const MONTHS = [
  '1-р сар',
  '2-р сар',
  '3-р сар',
  '4-р сар',
  '5-р сар',
  '6-р сар',
  '7-р сар',
  '8-р сар',
  '9-р сар',
  '10-р сар',
  '11-р сар',
  '12-р сар',
];

type MonthBucket = { key: string; label: string; total: number; count: number };

function aggregateByMonth(payouts: EarningsSummary['recentPayouts']): MonthBucket[] {
  const map = new Map<string, MonthBucket>();
  for (const payout of payouts) {
    const iso = payout.escrow?.releasedAt;
    if (!iso) continue;
    const date = new Date(iso);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = `${date.getFullYear()} · ${MONTHS[date.getMonth()]}`;
    const current = map.get(key) ?? { key, label, total: 0, count: 0 };
    current.total += payout.escrow?.holdAmount ?? 0;
    current.count += 1;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}

export default function HerderEarnings() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['herder', 'my', 'earnings'],
    queryFn: () => HerderAPI.my.earnings(),
  });

  const byMonth = useMemo(() => aggregateByMonth(data?.recentPayouts ?? []), [data?.recentPayouts]);
  const monthMax = byMonth.reduce((max, bucket) => Math.max(max, bucket.total), 0);

  return (
    <AppScreen
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.herder} />
      }
    >
      <AppTopBar eyebrow="Малчин" title="Орлого" showBack={false} />
      <AppHeader
        title="Орлого"
        subtitle={`Платформын хураамж: ${data?.commissionRate ?? 10}%`}
        icon="wallet-outline"
        accent={C.herder}
      />

      <View style={{ gap: R.sm, marginBottom: R.lg }}>
        <AppMetricCard
          label="Хүлээн авсан"
          value={formatMoney(data?.released.total)}
          icon="checkmark-circle-outline"
          accent={C.success}
        />
        <AppMetricCard
          label="Дундын дансанд хадгалагдаж байна"
          value={formatMoney(data?.held.total)}
          icon="lock-closed-outline"
          accent={C.gold}
        />
        <AppMetricCard
          label="Төлөгдөөгүй"
          value={formatMoney(data?.pending.total)}
          icon="time-outline"
          accent={C.textSub}
        />
      </View>

      {byMonth.length > 0 ? (
        <View style={{ marginBottom: R.lg }}>
          <Text style={{ ...F.h3, color: C.text, marginBottom: R.sm }}>Сараар</Text>
          <View style={{ gap: R.sm }}>
            {byMonth.map((bucket) => (
              <AppCard key={bucket.key} style={{ padding: R.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ ...F.small, color: C.text, fontWeight: '800' }}>
                    {bucket.label}
                  </Text>
                  <Text style={{ ...F.small, color: C.herder, fontWeight: '900' }}>
                    {formatMoney(bucket.total)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm, marginTop: R.sm }}>
                  <View
                    style={{
                      flex: 1,
                      height: 6,
                      backgroundColor: C.bgSection,
                      borderRadius: R.full,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: `${monthMax > 0 ? (bucket.total / monthMax) * 100 : 0}%`,
                        height: '100%',
                        backgroundColor: C.herder,
                      }}
                    />
                  </View>
                  <Text style={{ ...F.tiny, color: C.textMuted }}>{bucket.count}</Text>
                </View>
              </AppCard>
            ))}
          </View>
        </View>
      ) : null}

      <Text style={{ ...F.h3, color: C.text, marginBottom: R.sm }}>Сүүлийн тооцоо</Text>
      {(data?.recentPayouts ?? []).length ? (
        <View style={{ gap: R.sm }}>
          {(data?.recentPayouts ?? []).map((payout) => (
            <AppCard key={payout._id} style={{ padding: R.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.md }}>
                <View
                  style={{
                    width: UI.iconBox,
                    height: UI.iconBox,
                    borderRadius: UI.controlRadius,
                    backgroundColor: C.success + '18',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="cash-outline" size={20} color={C.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...F.small, color: C.text, fontWeight: '800' }}>
                    #{payout.orderNumber}
                  </Text>
                  <Text style={{ ...F.tiny, color: C.textMuted, marginTop: 2 }}>
                    {payout.escrow?.releasedAt
                      ? new Date(payout.escrow.releasedAt).toLocaleDateString('mn-MN')
                      : ''}
                  </Text>
                </View>
                <Text style={{ ...F.body, color: C.success, fontWeight: '900' }}>
                  +{formatMoney(payout.escrow?.holdAmount)}
                </Text>
              </View>
            </AppCard>
          ))}
        </View>
      ) : (
        <AppCard style={{ alignItems: 'center', gap: R.sm }}>
          <Ionicons name="wallet-outline" size={34} color={C.textMuted} />
          <Text style={{ ...F.small, color: C.textSub }}>Одоогоор тооцоо байхгүй</Text>
        </AppCard>
      )}
    </AppScreen>
  );
}

function formatMoney(value: number | undefined) {
  return `${Number(value || 0).toLocaleString()}₮`;
}
