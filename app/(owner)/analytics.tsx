import { useState } from 'react';
import { RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { get } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import { AppCard, AppHeader, AppMetricCard, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

const PERIODS = [
  { key: 'day', label: 'Өнөөдөр' },
  { key: 'week', label: '7 хоног' },
  { key: 'month', label: 'Сар' },
] as const;

type Period = (typeof PERIODS)[number]['key'];

export default function OwnerAnalytics() {
  const [period, setPeriod] = useState<Period>('week');

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['owner-analytics', period],
    queryFn: () => get('/seller/analytics', { period }),
  });

  const stats = (data as any)?.stats || (data as any) || {};
  const tops = (data as any)?.topProducts || [];

  return (
    <AppScreen
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.store} />
      }
    >
      <AppTopBar eyebrow="Дэлгүүр" title="Тайлан" showBack={false} />

      <AppHeader
        title="Тайлан"
        subtitle="Орлого, захиалга, шилдэг барааны нэгтгэл."
        icon="bar-chart-outline"
        accent={C.store}
      />

      <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.lg }}>
        {PERIODS.map((item) => (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.84}
            onPress={() => setPeriod(item.key)}
            style={{
              flex: 1,
              minHeight: 42,
              borderRadius: UI.controlRadius,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: period === item.key ? C.store : C.bgSection,
              borderWidth: 1,
              borderColor: period === item.key ? C.store : C.border,
              paddingHorizontal: R.sm,
            }}
          >
            <Text
              style={{
                ...F.small,
                  color: period === item.key ? C.bgCard : C.textSub,
                fontWeight: '800',
              }}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.sm }}>
        <AppMetricCard
          label="Орлого"
          value={formatMoney(stats.revenue)}
          icon="wallet-outline"
          accent={C.store}
        />
        <AppMetricCard
          label="Захиалга"
          value={stats.orders || 0}
          icon="receipt-outline"
          accent={C.primary}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.lg }}>
        <AppMetricCard
          label="Дундаж дүн"
          value={formatMoney(stats.avgOrder)}
          icon="stats-chart-outline"
          accent={C.seller}
        />
        <AppMetricCard
          label="Буцаалт"
          value={stats.returns || 0}
          icon="return-up-back-outline"
          accent={C.warning}
        />
      </View>

      <Text style={{ ...F.h3, color: C.text, marginBottom: R.sm }}>Шилдэг бараанууд</Text>
      {tops.length === 0 ? (
        <AppCard style={{ alignItems: 'center', gap: R.sm }}>
          <Ionicons name="cube-outline" size={34} color={C.textMuted} />
          <Text style={{ ...F.small, color: C.textSub }}>Өгөгдөл байхгүй</Text>
        </AppCard>
      ) : (
        <View style={{ gap: R.sm }}>
          {tops.map((product: any, index: number) => (
            <AppCard key={product.id ?? product.name ?? index} style={{ padding: R.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.md }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: UI.controlRadius,
                    backgroundColor: C.store + '14',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ ...F.small, color: C.store, fontWeight: '900' }}>
                    #{index + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...F.small, color: C.text, fontWeight: '800' }} numberOfLines={1}>
                    {product.name ?? 'Бараа'}
                  </Text>
                  <Text style={{ ...F.tiny, color: C.textSub, marginTop: 2 }}>
                    {product.sold ?? 0} борлуулсан
                  </Text>
                </View>
                <Text style={{ ...F.small, color: C.store, fontWeight: '900' }} numberOfLines={1}>
                  {formatMoney(product.revenue)}
                </Text>
              </View>
            </AppCard>
          ))}
        </View>
      )}
    </AppScreen>
  );
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString()}₮`;
}
