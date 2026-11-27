import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { get, patch } from '../../src/services/api';
import { encodeApiPathSegment } from '../../src/shared/apiPath';
import { C, F, R, UI } from '../../src/shared/design';
import { normalizeRouteParam } from '../../src/shared/routeParams';
import { AppCard, AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

type OrderStatusFilter = '' | 'confirmed' | 'preparing' | 'ready' | 'handed_to_driver' | 'delivered';
type IconName = keyof typeof Ionicons.glyphMap;

const TABS: Array<{ key: OrderStatusFilter; label: string }> = [
  { key: '', label: 'Бүгд' },
  { key: 'confirmed', label: 'Шинэ' },
  { key: 'preparing', label: 'Бэлтгэж' },
  { key: 'ready', label: 'Бэлэн' },
  { key: 'handed_to_driver', label: 'Явсан' },
  { key: 'delivered', label: 'Хүргэсэн' },
];

const NEXT_STATUS: Record<string, { label: string; next: string; icon: IconName }> = {
  confirmed: { label: 'Бэлтгэж эхлэх', next: 'preparing', icon: 'play' },
  preparing: { label: 'Бэлэн болсон', next: 'ready', icon: 'checkmark' },
  ready: { label: 'Жолоочид өгсөн', next: 'handed_to_driver', icon: 'car-outline' },
};

function normalizeStatusParam(value?: string | string[] | null): OrderStatusFilter {
  const raw = normalizeRouteParam(value);
  return TABS.some((tab) => tab.key === raw) ? (raw as OrderStatusFilter) : '';
}

function money(value?: number | null) {
  return `${(value ?? 0).toLocaleString('mn-MN')}₮`;
}

export default function OwnerOrdersScreen() {
  const params = useLocalSearchParams<{ status?: string }>();
  const [tab, setTab] = useState<OrderStatusFilter>(() => normalizeStatusParam(params.status));
  const [isFocused, setIsFocused] = useState(true);
  const layout = useAppLayoutMetrics();
  const qc = useQueryClient();

  useEffect(() => {
    setTab(normalizeStatusParam(params.status));
  }, [params.status]);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  const selectTab = (nextTab: OrderStatusFilter) => {
    setTab(nextTab);
    router.replace(
      nextTab
        ? ({ pathname: '/owner/orders' as any, params: { status: nextTab } } as any)
        : ('/owner/orders' as any),
    );
  };

  const { data, isRefetching, refetch, isLoading } = useQuery<any>({
    queryKey: ['seller-orders', tab],
    queryFn: () => get('/orders', tab ? { status: tab } : undefined),
    refetchInterval: isFocused ? 15000 : false,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      patch(`/orders/${encodeApiPathSegment(id)}/status`, { status }),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      qc.invalidateQueries({ queryKey: ['seller-orders'] });
    },
    onError: (e: any) => Alert.alert('Алдаа', e?.message || 'Статус шинэчилж чадсангүй.'),
  });

  const orders: any[] = data?.data?.orders || data?.orders || [];

  return (
    <View style={styles.screen}>
      <View style={[styles.headerShell, { paddingTop: layout.screenTop }]}>
        <AppTopBar eyebrow="Дэлгүүр" title="Захиалга" showBack={false} />
        <AppHeader
          title="Захиалгууд"
          subtitle="Дэлгүүрийн захиалгын төлөв, бэлтгэл, хүргэлтэд шилжүүлэлтийг удирдана."
          icon="receipt-outline"
          accent={C.store}
          style={{ marginBottom: 0 }}
        />
      </View>

      <FlatList
        horizontal
        data={TABS}
        keyExtractor={(item) => item.key || 'all'}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
        renderItem={({ item }) => {
          const active = tab === item.key;
          return (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => selectTab(item.key)}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.store} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(order: any, index) => String(order.id || order._id || index)}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.store} />}
          contentContainerStyle={
            orders.length === 0
              ? [styles.emptyList, { paddingBottom: layout.screenBottom }]
              : [styles.listContent, { paddingBottom: layout.screenBottom }]
          }
          ListEmptyComponent={
            <AppCard style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={46} color={C.textMuted} />
              <Text style={styles.emptyTitle}>Захиалга байхгүй</Text>
              <Text style={styles.emptyText}>Шинэ захиалга орж ирэхэд энд харагдана.</Text>
            </AppCard>
          }
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              pending={updateStatus.isPending}
              onNext={(id, next) => {
                Alert.alert('Статус өөрчлөх', `"${next.label}" болгох уу?`, [
                  { text: 'Болих', style: 'cancel' },
                  { text: 'Тийм', onPress: () => updateStatus.mutate({ id, status: next.next }) },
                ]);
              }}
            />
          )}
        />
      )}
    </View>
  );
}

function OrderCard({
  order,
  pending,
  onNext,
}: {
  order: any;
  pending: boolean;
  onNext: (id: string, next: { label: string; next: string; icon: IconName }) => void;
}) {
  const id = String(order.id || order._id || '');
  const next = NEXT_STATUS[order.status];
  const buyer = order.buyer;
  const items: any[] = Array.isArray(order.items) ? order.items : [];

  return (
    <AppCard style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>#{id.slice(-6).toUpperCase()}</Text>
        <Text style={styles.orderTotal}>{money(order.total)}</Text>
      </View>

      <View style={styles.buyerRow}>
        <Ionicons name="person-outline" size={14} color={C.textMuted} />
        <Text style={styles.buyerInfo} numberOfLines={1}>
          {buyer?.name || 'Хэрэглэгч'}
        </Text>
        {buyer?.phone ? (
          <View style={styles.phonePill}>
            <Ionicons name="call-outline" size={12} color={C.store} />
            <Text style={styles.phoneText}>{buyer.phone}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.items}>
        {items.slice(0, 2).map((item, index) => (
          <View key={`${item.id || item.name || 'item'}-${index}`} style={styles.itemRow}>
            <Ionicons name="cube-outline" size={12} color={C.textMuted} />
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name || 'Бараа'} x {item.quantity || 1}
            </Text>
          </View>
        ))}
        {items.length > 2 ? (
          <Text style={styles.moreItems}>+{items.length - 2} бараа...</Text>
        ) : null}
      </View>

      {next ? (
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => onNext(id, next)}
          disabled={pending}
          style={[styles.actionBtn, pending && styles.actionBtnDisabled]}
        >
          {pending ? (
            <ActivityIndicator size="small" color={C.bgCard} />
          ) : (
            <Ionicons name={next.icon} size={16} color={C.bgCard} />
          )}
          <Text style={styles.actionBtnText}>{pending ? 'Шинэчилж байна' : next.label}</Text>
        </TouchableOpacity>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerShell: { padding: UI.screenPad, paddingBottom: R.sm },
  tabRow: { paddingHorizontal: UI.screenPad, paddingBottom: R.sm, gap: R.xs, flexDirection: 'row' },
  tabBtn: {
    minHeight: 36,
    paddingHorizontal: R.md,
    paddingVertical: R.xs,
    borderRadius: R.full,
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
  },
  tabBtnActive: { backgroundColor: C.store, borderColor: C.store },
  tabBtnText: { ...F.tiny, color: C.textSub, fontWeight: '800' },
  tabBtnTextActive: { color: C.bgCard },
  emptyList: { flexGrow: 1, padding: UI.screenPad, justifyContent: 'center' },
  listContent: { padding: UI.screenPad, gap: R.sm },
  emptyCard: { alignItems: 'center', paddingVertical: R.xxl },
  emptyTitle: { ...F.body, color: C.text, fontWeight: '900', marginTop: R.sm },
  emptyText: { ...F.small, color: C.textMuted, textAlign: 'center', marginTop: R.xs },
  card: { gap: R.xs },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: R.md },
  orderId: { ...F.small, fontWeight: '900', color: C.store },
  orderTotal: { ...F.small, fontWeight: '900', color: C.store },
  buyerRow: { flexDirection: 'row', alignItems: 'center', gap: R.xs },
  buyerInfo: { flex: 1, ...F.tiny, color: C.textSub, fontWeight: '800' },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.bgSection,
    borderRadius: R.full,
    paddingHorizontal: R.sm,
    paddingVertical: 3,
  },
  phoneText: { color: C.store, fontSize: 11, fontWeight: '900' },
  items: { gap: 4, marginTop: R.xs },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: R.xs },
  itemName: { ...F.tiny, color: C.text },
  moreItems: { ...F.tiny, color: C.textMuted, fontWeight: '800' },
  actionBtn: {
    minHeight: 42,
    backgroundColor: C.store,
    borderRadius: UI.controlRadius,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: R.xs,
    marginTop: R.sm,
  },
  actionBtnDisabled: { opacity: 0.72 },
  actionBtnText: { ...F.small, color: C.bgCard, fontWeight: '900' },
});
