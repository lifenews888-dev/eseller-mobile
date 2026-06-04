import { RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LogoutButton } from '../../src/components/LogoutButton';
import { HerderAPI } from '../../src/features/herder/api';
import { C, F, R } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

export default function CoordinatorDashboard() {
  const stats = useQuery({
    queryKey: ['coordinator', 'stats'],
    queryFn: () => HerderAPI.coordinator.stats(),
  });

  const pendingApps = useQuery({
    queryKey: ['coordinator', 'applications', 'pending-preview'],
    queryFn: () => HerderAPI.coordinator.applications.list({ status: 'pending', limit: 3 }),
  });

  const refetchAll = () => {
    stats.refetch();
    pendingApps.refetch();
  };

  const s = stats.data;
  const scopeLabel = Array.isArray(s?.scope) ? s.scope.join(', ') : 'Бүх аймаг';
  const cards = [
    {
      icon: 'hourglass-outline' as const,
      label: 'Хүлээгдэж',
      value: s?.applications.pending ?? 0,
      color: C.gold,
      route: '/coordinator/applications',
    },
    {
      icon: 'eye-outline' as const,
      label: 'Хянагдаж',
      value: s?.applications.underReview ?? 0,
      color: C.primary,
      route: '/coordinator/applications',
    },
    {
      icon: 'checkmark-circle-outline' as const,
      label: 'Идэвхтэй малчин',
      value: s?.herders.active ?? 0,
      color: C.success,
      route: '/coordinator/herders',
    },
    {
      icon: 'close-circle-outline' as const,
      label: 'Татгалзсан',
      value: s?.applications.rejected ?? 0,
      color: C.error,
      route: '/coordinator/applications',
    },
  ];

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={stats.isRefetching || pendingApps.isRefetching}
          onRefresh={refetchAll}
          tintColor={C.herder}
        />
      }
    >
      <AppTopBar eyebrow="Координатор" title="Самбар" showBack={false} />
      <AppHeader
        title="Координатор"
        subtitle={`Хариуцах бүс: ${scopeLabel}`}
        icon="shield-checkmark-outline"
        accent={C.herder}
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: R.sm, marginBottom: R.md }}>
        {cards.map((card) => (
          <TouchableOpacity
            key={card.label}
            activeOpacity={0.86}
            onPress={() => router.push(card.route as never)}
            style={{ width: '48%' }}
          >
            <AppCard style={{ minHeight: 116, padding: R.md }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: R.md,
                  backgroundColor: card.color + '18',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={card.icon} size={20} color={card.color} />
              </View>
              <Text style={{ ...F.h2, color: card.color, marginTop: R.sm }}>{card.value}</Text>
              <Text style={{ ...F.tiny, color: C.textSub, marginTop: 2 }} numberOfLines={2}>
                {card.label}
              </Text>
            </AppCard>
          </TouchableOpacity>
        ))}
      </View>

      <AppCard style={{ marginBottom: R.md }}>
        <Text style={{ ...F.h4, color: C.text, marginBottom: R.md }}>Борлуулалт</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: R.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...F.tiny, color: C.textMuted }}>Хүргэгдсэн захиалга</Text>
            <Text style={{ ...F.h3, color: C.text, marginTop: 4 }}>{s?.sales.count ?? 0}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ ...F.tiny, color: C.textMuted }}>Нийт дүн</Text>
            <Text style={{ ...F.h3, color: C.herder, marginTop: 4 }}>{formatMoney(s?.sales.total)}</Text>
          </View>
        </View>
      </AppCard>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: R.sm }}>
        <Text style={{ ...F.h4, color: C.text }}>Хүлээгдэж буй өргөдөл</Text>
        {(pendingApps.data?.total ?? 0) > 3 ? (
          <AppButton
            label="Бүгд"
            icon="arrow-forward"
            variant="ghost"
            onPress={() => router.push('/coordinator/applications' as never)}
            style={{ minHeight: 36, paddingVertical: 6 }}
          />
        ) : null}
      </View>

      {(pendingApps.data?.applications ?? []).map((item) => (
        <TouchableOpacity
          key={item.id}
          activeOpacity={0.86}
          onPress={() =>
            router.push({ pathname: '/coordinator/application/[id]', params: { id: item.id } } as never)
          }
        >
          <AppCard style={{ marginBottom: R.sm, padding: R.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...F.body, color: C.text, fontWeight: '800' }} numberOfLines={1}>
                  {item.herderName}
                </Text>
                <Text style={{ ...F.tiny, color: C.textSub, marginTop: 2 }} numberOfLines={1}>
                  {item.provinceName} - {item.district}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
            </View>
          </AppCard>
        </TouchableOpacity>
      ))}

      {!pendingApps.data?.applications.length ? (
        <AppCard style={{ alignItems: 'center', gap: R.sm, marginBottom: R.md }}>
          <Ionicons name="checkmark-done-outline" size={38} color={C.textMuted} />
          <Text style={{ ...F.small, color: C.textSub }}>Хүлээгдэж буй өргөдөл алга</Text>
        </AppCard>
      ) : null}

      <LogoutButton />
    </AppScreen>
  );
}

function formatMoney(value?: number) {
  return `${Number(value || 0).toLocaleString()}₮`;
}
