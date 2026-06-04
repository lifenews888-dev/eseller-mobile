import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import { AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

const PERIODS = [
  { key: 0, label: 'Энэ сар' },
  { key: 1, label: '1 сарын өмнө' },
  { key: 2, label: '2 сарын өмнө' },
] as const;

type PeriodOffset = (typeof PERIODS)[number]['key'];

function normalizeMonthParam(value?: string | string[] | null): PeriodOffset {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return parsed === 1 || parsed === 2 ? parsed : 0;
}

export default function LeaderboardScreen() {
  const params = useLocalSearchParams<{ month?: string }>();
  const [month, setMonth] = useState<PeriodOffset>(() => normalizeMonthParam(params.month));

  useEffect(() => {
    setMonth(normalizeMonthParam(params.month));
  }, [params.month]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['leaderboard', month],
    queryFn: () => get(`/affiliate/leaderboard?offset=${month}`),
  });
  const entries = (data as any)?.leaderboard || (data as any)?.sellers || [];

  function selectMonth(nextMonth: PeriodOffset) {
    setMonth(nextMonth);
    router.replace(
      nextMonth === 0
        ? ('/seller/leaderboard' as any)
        : ({ pathname: '/seller/leaderboard' as any, params: { month: String(nextMonth) } } as any),
    );
  }

  return (
    <AppScreen
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.seller} />
      }
    >
      <AppTopBar eyebrow="Борлуулагч" title="Топ жагсаалт" showBack={false} />
      <AppHeader
        title="Топ жагсаалт"
        subtitle="Сарын шилдэг борлуулагчдын оноо, борлуулалтын дүн."
        icon="trophy-outline"
        accent={C.seller}
      />

      <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.md }}>
        {PERIODS.map((period) => (
          <TouchableOpacity
            key={period.key}
            activeOpacity={0.84}
            accessibilityLabel={`${period.label} сонгох`}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: UI.controlRadius,
              backgroundColor: month === period.key ? C.seller : C.bgSection,
              borderWidth: 1,
              borderColor: month === period.key ? C.seller : C.border,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: R.xs,
            }}
            onPress={() => selectMonth(period.key)}
          >
            <Text
              style={{
                ...F.tiny,
                color: month === period.key ? C.bgCard : C.textSub,
                fontWeight: '800',
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <AppCard style={{ marginBottom: R.lg, backgroundColor: C.goldDim, borderColor: C.gold + '33' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.md }}>
          <View
            style={{
              width: UI.iconBox,
              height: UI.iconBox,
              borderRadius: UI.controlRadius,
              backgroundColor: C.gold + '20',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="trophy" size={22} color={C.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...F.body, color: C.text, fontWeight: '900' }}>
              1-р байр: 10,000 оноо
            </Text>
            <Text style={{ ...F.tiny, color: C.textSub, marginTop: 2 }}>
              Сарын шилдэг борлуулагч
            </Text>
          </View>
        </View>
      </AppCard>

      {isLoading ? (
        <AppCard style={{ alignItems: 'center', gap: R.sm, minHeight: 120, justifyContent: 'center' }}>
          <ActivityIndicator color={C.seller} />
          <Text style={{ ...F.small, color: C.textSub }}>Жагсаалт ачаалж байна...</Text>
        </AppCard>
      ) : entries.length === 0 ? (
        <AppCard style={{ alignItems: 'center', gap: R.sm, minHeight: 120, justifyContent: 'center' }}>
          <Ionicons name="podium-outline" size={34} color={C.textMuted} />
          <Text style={{ ...F.small, color: C.textSub }}>Одоогоор өгөгдөл байхгүй</Text>
        </AppCard>
      ) : (
        <View style={{ gap: R.sm }}>
          {entries.map((entry: any, index: number) => (
            <LeaderboardRow key={entry.id ?? index} entry={entry} index={index} />
          ))}
        </View>
      )}
    </AppScreen>
  );
}

function LeaderboardRow({ entry, index }: { entry: any; index: number }) {
  const medalColor = [C.gold, C.textMuted, C.seller][index] ?? C.textMuted;

  return (
    <AppCard
      style={[
        { padding: R.md },
        entry.isMe ? { borderColor: C.seller + '66', backgroundColor: C.seller + '0D' } : null,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.md }}>
        <View
          style={{
            width: UI.iconBox,
            height: UI.iconBox,
            borderRadius: UI.controlRadius,
            backgroundColor: index < 3 ? medalColor + '18' : C.bgSection,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {index < 3 ? (
            <Ionicons name="medal-outline" size={22} color={medalColor} />
          ) : (
            <Text style={{ ...F.body, color: C.textMuted, fontWeight: '900' }}>#{index + 1}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm }}>
            <Text style={{ ...F.body, color: C.text, fontWeight: '800' }} numberOfLines={1}>
              {entry.name || entry.shopName || `#${index + 1}`}
            </Text>
            {entry.isMe ? (
              <View
                style={{
                  backgroundColor: C.seller,
                  borderRadius: R.xs,
                  paddingHorizontal: R.xs,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ ...F.tiny, color: C.bgCard, fontWeight: '900' }}>Би</Text>
              </View>
            ) : null}
          </View>
          <Text style={{ ...F.tiny, color: C.textMuted }}>
            {entry.totalSales || entry.sales || 0} борлуулалт
          </Text>
        </View>
        <Text style={{ ...F.body, color: C.seller, fontWeight: '900' }} numberOfLines={1}>
          {formatMoney(entry.totalRevenue || entry.revenue)}
        </Text>
      </View>
    </AppCard>
  );
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString()}₮`;
}
