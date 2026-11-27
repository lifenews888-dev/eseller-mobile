import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { get } from '../../src/services/api';
import { C, F, R } from '../../src/shared/design';
import { AppCard, AppHeader, AppMetricCard, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

function money(value?: number | null) {
  return `${(value ?? 0).toLocaleString('mn-MN')}₮`;
}

export default function DriverEarningsScreen() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['driver-earnings'],
    queryFn: () => get('/driver/revenue'),
  });

  const stats = (data as any)?.stats || (data as any) || {};
  const history: any[] = (data as any)?.history || (data as any)?.orders || [];

  const cards = [
    { icon: 'cash-outline' as const, label: 'Нийт орлого', value: money(stats.totalEarned || stats.total), color: C.driver },
    { icon: 'calendar-outline' as const, label: 'Энэ сар', value: money(stats.thisMonth || stats.month), color: C.primary },
    { icon: 'trending-up-outline' as const, label: 'Энэ 7 хоног', value: money(stats.thisWeek || stats.week), color: C.secondary },
    { icon: 'cube-outline' as const, label: 'Нийт хүргэлт', value: String(stats.totalDeliveries || stats.deliveryCount || 0), color: C.gold },
  ];

  return (
    <AppScreen
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.driver} />}
      showsVerticalScrollIndicator={false}
    >
      <AppTopBar eyebrow="Жолооч" title="Орлого" showBack={false} />
      <AppHeader
        title="Орлого"
        subtitle="Хүргэлтийн орлого, гүйлгээний түүхээ нэг дор хянана."
        icon="cash-outline"
        accent={C.driver}
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

      <Text style={styles.sectionTitle}>Гүйлгээний түүх</Text>
      {history.length === 0 ? (
        <AppCard style={styles.emptyCard}>
          <Ionicons name="wallet-outline" size={44} color={C.textMuted} />
          <Text style={styles.emptyTitle}>Гүйлгээ байхгүй байна</Text>
          <Text style={styles.emptySub}>Амжилттай хүргэлтийн орлого энд харагдана.</Text>
        </AppCard>
      ) : (
        <View style={styles.historyList}>
          {history.map((item, index) => (
            <AppCard key={item.id || item.orderNumber || item.trackingCode || index} style={styles.historyCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyTitle}>
                  #{item.orderNumber || item.trackingCode || 'Хүргэлт'}
                </Text>
                <Text style={styles.historyDate}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('mn-MN') : 'Огноо байхгүй'}
                </Text>
              </View>
              <Text style={styles.historyAmount}>+{money(item.deliveryFee || item.amount)}</Text>
            </AppCard>
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
  emptyCard: { alignItems: 'center', paddingVertical: R.xxl },
  emptyTitle: { ...F.body, color: C.text, fontWeight: '900', marginTop: R.sm },
  emptySub: { ...F.small, color: C.textMuted, textAlign: 'center', marginTop: R.xs },
  historyList: { gap: R.sm },
  historyCard: { flexDirection: 'row', alignItems: 'center', gap: R.md, padding: R.md },
  historyTitle: { ...F.small, color: C.text, fontWeight: '900' },
  historyDate: { ...F.tiny, color: C.textMuted, marginTop: 2 },
  historyAmount: { ...F.body, color: C.secondary, fontWeight: '900' },
});
