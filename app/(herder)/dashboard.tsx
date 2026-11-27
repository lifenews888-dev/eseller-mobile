import { RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { HerderAPI } from '../../src/features/herder/api';
import { C, F, R, UI } from '../../src/shared/design';
import { LogoutButton } from '../../src/components/LogoutButton';
import { AppButton, AppCard, AppHeader, AppMetricCard, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

type IconName = keyof typeof Ionicons.glyphMap;

export default function HerderDashboard() {
  const earnings = useQuery({
    queryKey: ['herder', 'my', 'earnings'],
    queryFn: () => HerderAPI.my.earnings(),
  });

  const products = useQuery({
    queryKey: ['herder', 'my', 'products', 'count'],
    queryFn: () => HerderAPI.my.products.list({ limit: 1 }),
  });

  const orders = useQuery({
    queryKey: ['herder', 'my', 'orders', 'pending'],
    queryFn: () => HerderAPI.my.orders.list({ status: 'pending', limit: 1 }),
  });

  const refetchAll = () => {
    void earnings.refetch();
    void products.refetch();
    void orders.refetch();
  };

  const summary = earnings.data;
  const pendingOrders = orders.data?.total ?? 0;
  const recentPayouts = (summary?.recentPayouts ?? []).slice(0, 5);

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={earnings.isRefetching || products.isRefetching || orders.isRefetching}
          onRefresh={refetchAll}
          tintColor={C.herder}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <AppTopBar eyebrow="Малчин" title="Самбар" showBack={false} />
      <AppHeader
        title="Малчны самбар"
        subtitle="Бүтээгдэхүүн, захиалга, орлогоо нэг дор хянана."
        icon="leaf-outline"
        accent={C.herder}
      />

      {pendingOrders > 0 ? (
        <TouchableOpacity
          activeOpacity={0.86}
          accessibilityLabel="Шинэ захиалга харах"
          onPress={() => router.push('/herder-admin/orders' as never)}
          style={{ marginBottom: R.md }}
        >
          <AppCard
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: R.sm,
              borderColor: C.gold + '55',
              backgroundColor: C.goldDim,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm, flex: 1 }}>
              <Ionicons name="alert-circle" size={20} color={C.gold} />
              <Text style={{ ...F.small, color: C.gold, fontWeight: '900', flex: 1 }}>
                {pendingOrders} шинэ захиалга хүлээгдэж байна
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.gold} />
          </AppCard>
        </TouchableOpacity>
      ) : null}

      <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.sm }}>
        <AppMetricCard
          icon="cash-outline"
          label="Хүлээн авсан"
          value={formatMoney(summary?.released?.total)}
          accent={C.success}
        />
        <AppMetricCard
          icon="lock-closed-outline"
          label="Дундын дансанд"
          value={formatMoney(summary?.held?.total)}
          accent={C.gold}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.lg }}>
        <AppMetricCard
          icon="time-outline"
          label="Төлөгдөөгүй"
          value={formatMoney(summary?.pending?.total)}
          accent={C.textSub}
        />
        <AppMetricCard
          icon="cube-outline"
          label="Бараа"
          value={products.data?.total ?? 0}
          accent={C.herder}
        />
      </View>

      <Text style={{ ...F.h4, color: C.text, marginBottom: R.sm }}>Хурдан үйлдэл</Text>
      <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.lg }}>
        <QuickAction
          icon="add-circle"
          label="Бараа нэмэх"
          accent={C.herder}
          onPress={() => router.push('/herder-admin/listing-form' as never)}
        />
        <QuickAction
          icon="list"
          label="Барааны жагсаалт"
          accent={C.primary}
          onPress={() => router.push('/herder-admin/listings' as never)}
        />
      </View>

      <Text style={{ ...F.h4, color: C.text, marginBottom: R.sm }}>Сүүлийн тооцоо</Text>
      {recentPayouts.length > 0 ? (
        <View style={{ gap: R.sm, marginBottom: R.lg }}>
          {recentPayouts.map((p) => (
            <AppCard
              key={p._id}
              style={{
                padding: R.md,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: R.sm,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ ...F.small, color: C.text, fontWeight: '900' }}>
                  #{p.orderNumber}
                </Text>
                <Text style={{ ...F.tiny, color: C.textMuted, marginTop: 2 }}>
                  {p.escrow?.releasedAt
                    ? new Date(p.escrow.releasedAt).toLocaleDateString('mn-MN')
                    : 'Хүлээгдэж байна'}
                </Text>
              </View>
              <Text style={{ ...F.body, color: C.secondary, fontWeight: '900' }} numberOfLines={1}>
                +{formatMoney(p.escrow?.holdAmount)}
              </Text>
            </AppCard>
          ))}
        </View>
      ) : (
        <AppCard style={{ alignItems: 'center', gap: R.sm, marginBottom: R.lg }}>
          <Ionicons name="wallet-outline" size={40} color={C.textMuted} />
          <Text style={{ ...F.small, color: C.textSub, textAlign: 'center' }}>
            Одоогоор орлого байхгүй
          </Text>
          <AppButton
            label="Бараа нэмэх"
            icon="add"
            variant="ghost"
            onPress={() => router.push('/herder-admin/listing-form' as never)}
          />
        </AppCard>
      )}

      <LogoutButton />
    </AppScreen>
  );
}

function QuickAction({
  icon,
  label,
  accent,
  onPress,
}: {
  icon: IconName;
  label: string;
  accent: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={{ flex: 1 }}>
      <AppCard
        style={{
          minHeight: 112,
          alignItems: 'center',
          justifyContent: 'center',
          gap: R.sm,
          borderColor: accent + '30',
          backgroundColor: accent + '10',
        }}
      >
        <View
          style={{
            width: UI.iconBox,
            height: UI.iconBox,
            borderRadius: UI.controlRadius,
            backgroundColor: accent + '18',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={23} color={accent} />
        </View>
        <Text style={{ ...F.small, color: C.text, fontWeight: '900', textAlign: 'center' }} numberOfLines={2}>
          {label}
        </Text>
      </AppCard>
    </TouchableOpacity>
  );
}

function formatMoney(value?: number | null) {
  return `${Number(value || 0).toLocaleString('mn-MN')}₮`;
}
