import { View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { get } from '../../src/services/api';
import { C, F, R } from '../../src/shared/design';
import { EmptyState } from '../../src/shared/ui/EmptyState';
import { AppCard, AppHeader, AppMetricCard, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';
import { LogoutButton } from '../../src/components/LogoutButton';
import { SellerNetworkSection } from '../../src/features/sellerNetwork/SellerNetworkSection';

export default function SellerDashboard() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['seller-dashboard'],
    queryFn: () => get('/affiliate/earnings'),
  });

  const { data: productsData } = useQuery({
    queryKey: ['seller-products'],
    queryFn: () => get('/products/my?status=active'),
  });

  const lowStock = ((productsData as any)?.products || []).filter(
    (p: any) => (p.stock ?? p.inventory ?? 999) < 5,
  );
  const stats = (data as any)?.stats || (data as any) || {};
  const recent = ((data as any)?.recent || (data as any)?.commissions || []).slice(0, 5);

  const cards = [
    { icon: 'cash' as const, label: 'Нийт орлого', value: `${(stats.totalEarned || 0).toLocaleString()}₮`, color: C.seller },
    { icon: 'trending-up' as const, label: 'Энэ сар', value: `${(stats.thisMonth || 0).toLocaleString()}₮`, color: C.primary },
    { icon: 'time' as const, label: 'Хүлээгдэж буй', value: `${(stats.pending || 0).toLocaleString()}₮`, color: C.gold },
    { icon: 'cart' as const, label: 'Борлуулалт', value: String(stats.totalSales || stats.totalOrders || 0), color: C.secondary },
  ];

  return (
    <AppScreen refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.seller} />}>
      <AppTopBar eyebrow="Борлуулагч" title="Самбар" showBack={false} />
      <AppHeader
        title="Самбар"
        subtitle="Борлуулагчийн хяналтын самбар"
        icon="analytics-outline"
        accent={C.seller}
      />

      {lowStock.length > 0 ? (
        <TouchableOpacity
          activeOpacity={0.86}
          accessibilityLabel="Дуусах дөхсөн бараанууд"
          onPress={() => router.push('/seller/products' as any)}
        >
          <AppCard
            style={{
              marginBottom: R.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderColor: C.error + '35',
              backgroundColor: C.errorDim,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm, flex: 1 }}>
              <Ionicons name="warning-outline" size={20} color={C.error} />
              <Text style={{ ...F.small, color: C.error, fontWeight: '800', flex: 1 }}>
                {lowStock.length} бараа дуусах дөхөж байна
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.error} />
          </AppCard>
        </TouchableOpacity>
      ) : null}

      <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.sm }}>
        {cards.slice(0, 2).map((card) => (
          <AppMetricCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            accent={card.color}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.lg }}>
        {cards.slice(2).map((card) => (
          <AppMetricCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            accent={card.color}
          />
        ))}
      </View>

      <View style={{ marginBottom: R.lg }}>
        <Text style={{ ...F.h4, color: C.text, marginBottom: R.sm }}>Хурдан үйлдэл</Text>
        <View style={{ flexDirection: 'row', gap: R.sm }}>
          {[
            { icon: 'link' as const, label: 'Линк үүсгэх', route: '/seller/catalog' },
            { icon: 'stats-chart' as const, label: 'Орлого харах', route: '/seller/earnings' },
          ].map((action) => (
            <TouchableOpacity
              key={action.route}
              activeOpacity={0.86}
              accessibilityLabel={action.label}
              style={{ flex: 1 }}
              onPress={() => router.push(action.route as any)}
            >
              <AppCard style={{ alignItems: 'center', minHeight: 104, justifyContent: 'center' }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: R.md,
                    backgroundColor: C.seller + '18',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: R.sm,
                  }}
                >
                  <Ionicons name={action.icon} size={22} color={C.seller} />
                </View>
                <Text style={{ ...F.small, color: C.text, fontWeight: '800', textAlign: 'center' }} numberOfLines={2}>
                  {action.label}
                </Text>
              </AppCard>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ marginBottom: R.lg }}>
        <Text style={{ ...F.h4, color: C.text, marginBottom: R.sm }}>Сүүлийн орлогууд</Text>
        {recent.map((commission: any, index: number) => (
          <AppCard
            key={commission.id ?? index}
            style={{
              marginBottom: R.sm,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: R.sm,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ ...F.small, color: C.text, fontWeight: '800' }} numberOfLines={1}>
                {commission.productName || 'Захиалга'}
              </Text>
              <Text style={{ ...F.tiny, color: C.textMuted, marginTop: 3 }}>
                {commission.createdAt ? new Date(commission.createdAt).toLocaleDateString('mn-MN') : ''}
              </Text>
            </View>
            <Text style={{ ...F.body, color: C.secondary, fontWeight: '900' }} numberOfLines={1}>
              +{(commission.amount || 0).toLocaleString()}₮
            </Text>
          </AppCard>
        ))}
        {recent.length === 0 ? <EmptyState icon="cash-outline" title="Одоогоор орлого байхгүй" /> : null}
      </View>

      <SellerNetworkSection />
      <LogoutButton />
      <View style={{ height: 40 }} />
    </AppScreen>
  );
}
