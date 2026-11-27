import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { get } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import { AppCard, AppHeader, AppMetricCard, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

function money(value?: number | null) {
  return `${(value ?? 0).toLocaleString('mn-MN')}₮`;
}

export default function OwnerDashboard() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['owner-dashboard'],
    queryFn: () => get('/seller/analytics'),
  });

  const stats = (data as any)?.stats || (data as any) || {};
  const recentOrders: any[] = (data as any)?.recentOrders || [];

  const cards = [
    { icon: 'cash-outline' as const, label: 'Орлого', color: C.store, value: money(stats.revenue) },
    { icon: 'receipt-outline' as const, label: 'Захиалга', color: C.primary, value: stats.orders || 0 },
    { icon: 'cube-outline' as const, label: 'Бараа', color: C.secondary, value: stats.products || 0 },
    { icon: 'eye-outline' as const, label: 'Үзэлт', color: C.seller, value: stats.views || 0 },
  ];

  const actions = [
    { icon: 'add-circle-outline' as const, label: 'Бараа нэмэх', color: C.store, route: '/owner/products' },
    { icon: 'receipt-outline' as const, label: 'Захиалгууд', color: C.primary, route: '/owner/orders' },
    { icon: 'bar-chart-outline' as const, label: 'Тайлан', color: C.gold, route: '/owner/analytics' },
    { icon: 'desktop-outline' as const, label: 'Касс', color: C.seller, route: '/owner/pos' },
    { icon: 'settings-outline' as const, label: 'Тохиргоо', color: C.secondary, route: '/owner/settings' },
  ];

  return (
    <AppScreen
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.store} />}
      showsVerticalScrollIndicator={false}
    >
      <AppTopBar eyebrow="Дэлгүүр" title="Самбар" showBack={false} />
      <AppHeader
        title="Дэлгүүрийн самбар"
        subtitle="Орлого, захиалга, бараа болон хурдан үйлдлээ нэг дор хянана."
        icon="grid-outline"
        accent={C.store}
      />

      <View style={styles.metricGrid}>
        {cards.map((card) => (
          <AppMetricCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            accent={card.color}
            style={styles.metricCard}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Хурдан үйлдэл</Text>
      <View style={styles.actionGrid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.route}
            activeOpacity={0.86}
            onPress={() => router.push(action.route as any)}
            style={[styles.actionCard, { backgroundColor: `${action.color}12`, borderColor: `${action.color}30` }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${action.color}18` }]}>
              <Ionicons name={action.icon} size={24} color={action.color} />
            </View>
            <Text style={styles.actionLabel} numberOfLines={2}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Сүүлийн захиалгууд</Text>
      {recentOrders.length === 0 ? (
        <AppCard style={styles.emptyCard}>
          <Ionicons name="receipt-outline" size={40} color={C.textMuted} />
          <Text style={styles.emptyTitle}>Захиалга байхгүй байна</Text>
          <Text style={styles.emptySub}>Шинэ захиалга орж ирэхэд энд харагдана.</Text>
        </AppCard>
      ) : (
        <View style={styles.orderList}>
          {recentOrders.map((order, index) => (
            <TouchableOpacity
              key={order.id || order._id || order.trackingCode || `order-${index}`}
              activeOpacity={0.86}
              onPress={() => router.push('/owner/orders' as any)}
            >
              <AppCard style={styles.orderCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderCode}>#{order.trackingCode || String(order.id || '').slice(-6)}</Text>
                  <Text style={styles.orderBuyer} numberOfLines={1}>
                    {order.user?.name || order.buyer?.name || 'Хэрэглэгч'}
                  </Text>
                </View>
                <Text style={styles.orderTotal}>{money(order.totalAmount || order.total)}</Text>
              </AppCard>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: R.sm },
  metricCard: { minWidth: '47%' },
  sectionTitle: { ...F.small, color: C.textMuted, fontWeight: '900', marginTop: R.lg, marginBottom: R.sm },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: R.sm },
  actionCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 96,
    borderRadius: UI.cardRadius,
    padding: R.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: R.sm,
    borderWidth: 1,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: UI.controlRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { ...F.small, color: C.text, fontWeight: '900', textAlign: 'center' },
  emptyCard: { alignItems: 'center', paddingVertical: R.xxl },
  emptyTitle: { ...F.body, color: C.text, fontWeight: '900', marginTop: R.sm },
  emptySub: { ...F.small, color: C.textMuted, textAlign: 'center', marginTop: R.xs },
  orderList: { gap: R.sm },
  orderCard: { flexDirection: 'row', alignItems: 'center', gap: R.md, padding: R.md },
  orderCode: { ...F.small, color: C.text, fontWeight: '900' },
  orderBuyer: { ...F.tiny, color: C.textMuted, marginTop: 2 },
  orderTotal: { ...F.body, color: C.store, fontWeight: '900' },
});
