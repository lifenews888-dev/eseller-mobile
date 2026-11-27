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
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { get, post } from '../../src/services/api';
import { LogoutButton } from '../../src/components/LogoutButton';
import { encodeApiPathSegment } from '../../src/shared/apiPath';
import { C, F, R, UI } from '../../src/shared/design';
import { normalizeRouteParam } from '../../src/shared/routeParams';
import { AppCard, AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

type DeliveryTab = 'available' | 'mine';

const TABS: Array<{ key: DeliveryTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'available', label: 'Авах боломжтой', icon: 'cube-outline' },
  { key: 'mine', label: 'Миний хүргэлт', icon: 'car-outline' },
];

function normalizeDeliveryTab(value?: string | string[] | null): DeliveryTab {
  const raw = normalizeRouteParam(value);
  return raw === 'mine' ? 'mine' : 'available';
}

function money(value?: number | null) {
  return `${(value ?? 0).toLocaleString('mn-MN')}₮`;
}

export default function DriverDeliveriesScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<DeliveryTab>(() => normalizeDeliveryTab(params.tab));
  const [isFocused, setIsFocused] = useState(true);
  const layout = useAppLayoutMetrics();
  const qc = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  useEffect(() => {
    setTab(normalizeDeliveryTab(params.tab));
  }, [params.tab]);

  const selectTab = (nextTab: DeliveryTab) => {
    setTab(nextTab);
    router.replace(
      nextTab === 'available'
        ? ('/driver/deliveries' as any)
        : ({ pathname: '/driver/deliveries' as any, params: { tab: nextTab } } as any),
    );
  };

  const { data, isRefetching, refetch, isLoading } = useQuery<any>({
    queryKey: ['driver-orders', tab],
    queryFn: () => get('/driver/orders', { type: tab }),
    refetchInterval: isFocused ? 10000 : false,
  });

  const accept = useMutation({
    mutationFn: (id: string) => post(`/driver/orders/${encodeApiPathSegment(id)}/accept`),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      qc.invalidateQueries({ queryKey: ['driver-orders'] });
      selectTab('mine');
    },
    onError: (e: any) => Alert.alert('Алдаа', e?.message || 'Захиалга авч чадсангүй.'),
  });

  const deliver = useMutation({
    mutationFn: (id: string) => post(`/driver/orders/${encodeApiPathSegment(id)}/deliver`),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Амжилттай', 'Хүргэлт амжилттай дууслаа.');
      qc.invalidateQueries({ queryKey: ['driver-orders'] });
      selectTab('available');
    },
    onError: (e: any) => Alert.alert('Алдаа', e?.message || 'Хүргэлт дуусгаж чадсангүй.'),
  });

  const orders: any[] = data?.data?.orders || data?.orders || [];

  return (
    <View style={styles.screen}>
      <View style={[styles.headerShell, { paddingTop: layout.screenTop }]}>
        <AppTopBar
          eyebrow="Жолооч"
          title="Самбар"
          showBack={false}
          right={<LogoutButton variant="icon" />}
        />
        <AppHeader
          title="Хүргэлтийн самбар"
          subtitle="Авах боломжтой болон өөрийн хүргэлтийн захиалгаа хянана."
          icon="car-outline"
          accent={C.driver}
          style={styles.headerCard}
        />
      </View>

      <View style={styles.tabs}>
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.86}
              onPress={() => selectTab(item.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Ionicons name={item.icon} size={16} color={active ? C.driver : C.textMuted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.driver} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(order: any, index) => String(order.id || order._id || index)}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.driver} />}
          contentContainerStyle={
            orders.length === 0
              ? [styles.emptyList, { paddingBottom: layout.screenBottom }]
              : [styles.listContent, { paddingBottom: layout.screenBottom }]
          }
          ListEmptyComponent={<EmptyState tab={tab} />}
          renderItem={({ item }) => (
            <DeliveryCard
              order={item}
              tab={tab}
              acceptPending={accept.isPending}
              deliverPending={deliver.isPending}
              onAccept={(id) => {
                Alert.alert('Захиалга авах уу?', `#${id.toString().slice(-6).toUpperCase()}`, [
                  { text: 'Болих', style: 'cancel' },
                  { text: 'Авах', onPress: () => accept.mutate(id) },
                ]);
              }}
              onDeliver={(id) => {
                Alert.alert('Хүргэлт дуусгах уу?', 'Хэрэглэгч захиалгаа хүлээн авсан уу?', [
                  { text: 'Болих', style: 'cancel' },
                  { text: 'Тийм, хүргэлээ', onPress: () => deliver.mutate(id) },
                ]);
              }}
            />
          )}
        />
      )}
    </View>
  );
}

function EmptyState({ tab }: { tab: DeliveryTab }) {
  const available = tab === 'available';
  return (
    <AppCard style={styles.emptyCard}>
      <Ionicons
        name={available ? 'cube-outline' : 'checkmark-done-outline'}
        size={42}
        color={available ? C.textMuted : C.secondary}
      />
      <Text style={styles.emptyTitle}>
        {available ? 'Авах захиалга байхгүй' : 'Идэвхтэй хүргэлт байхгүй'}
      </Text>
      <Text style={styles.emptyText}>
        {available ? 'Шинэ хүргэлт орж ирэхэд энд харагдана.' : 'Авсан захиалгууд энэ хэсэгт байрлана.'}
      </Text>
    </AppCard>
  );
}

function DeliveryCard({
  order,
  tab,
  acceptPending,
  deliverPending,
  onAccept,
  onDeliver,
}: {
  order: any;
  tab: DeliveryTab;
  acceptPending: boolean;
  deliverPending: boolean;
  onAccept: (id: string) => void;
  onDeliver: (id: string) => void;
}) {
  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const buyer = order.buyer;
  const shop = order.shop;
  const id = String(order.id || order._id || '');

  return (
    <AppCard style={styles.orderCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>#{id.slice(-6).toUpperCase()}</Text>
        <Text style={styles.total}>{money(order.total)}</Text>
      </View>

      {shop ? <InfoLine icon="storefront-outline" label={shop.name} /> : null}
      {buyer ? <InfoLine icon="person-outline" label={buyer.name || 'Хэрэглэгч'} /> : null}
      {buyer?.phone ? <InfoLine icon="call-outline" label={buyer.phone} /> : null}
      {order.deliveryAddress ? <InfoLine icon="location-outline" label={order.deliveryAddress} lines={2} /> : null}

      <Text style={styles.items} numberOfLines={2}>
        {items.length
          ? items.map((item) => `${item.name || 'Бараа'} x${item.quantity || 1}`).join(', ')
          : 'Барааны мэдээлэл байхгүй'}
      </Text>

      {tab === 'available' ? (
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => onAccept(id)}
          disabled={acceptPending}
          style={styles.acceptBtn}
        >
          <Ionicons name="cube-outline" size={16} color={C.bgCard} />
          <Text style={styles.acceptBtnText}>{acceptPending ? 'Авч байна' : 'Захиалга авах'}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => onDeliver(id)}
          disabled={deliverPending}
          style={[styles.acceptBtn, styles.deliverBtn]}
        >
          <Ionicons name="checkmark-done-outline" size={16} color={C.bgCard} />
          <Text style={styles.acceptBtnText}>{deliverPending ? 'Дуусгаж байна' : 'Хүргэлт дуусгах'}</Text>
        </TouchableOpacity>
      )}
    </AppCard>
  );
}

function InfoLine({ icon, label, lines = 1 }: { icon: keyof typeof Ionicons.glyphMap; label: string; lines?: number }) {
  return (
    <View style={styles.infoLine}>
      <Ionicons name={icon} size={14} color={C.textMuted} />
      <Text style={styles.info} numberOfLines={lines}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerShell: {
    paddingHorizontal: UI.screenPad,
    paddingBottom: R.sm,
    backgroundColor: C.bg,
  },
  headerCard: { marginBottom: 0 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: C.bgCard,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  tab: {
    flex: 1,
    minHeight: 46,
    paddingVertical: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: R.xs,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: C.driver },
  tabText: { ...F.tiny, color: C.textSub, fontWeight: '800' },
  tabTextActive: { color: C.driver },
  emptyList: { flexGrow: 1, padding: UI.screenPad, justifyContent: 'center' },
  listContent: { padding: UI.screenPad, gap: R.sm },
  emptyCard: { alignItems: 'center', paddingVertical: R.xxl },
  emptyTitle: { ...F.body, color: C.text, fontWeight: '900', marginTop: R.sm },
  emptyText: { ...F.small, color: C.textMuted, textAlign: 'center', marginTop: R.xs },
  orderCard: { gap: R.xs },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: R.md },
  orderId: { ...F.small, fontWeight: '900', color: C.driver },
  total: { ...F.small, fontWeight: '900', color: C.driver },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: R.xs },
  info: { flex: 1, ...F.tiny, color: C.textSub },
  items: { ...F.tiny, color: C.textMuted, lineHeight: 16, marginTop: R.xs },
  acceptBtn: {
    minHeight: 42,
    backgroundColor: C.driver,
    borderRadius: UI.controlRadius,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: R.xs,
    marginTop: R.sm,
  },
  deliverBtn: { backgroundColor: C.secondary },
  acceptBtnText: { ...F.small, color: C.bgCard, fontWeight: '900' },
});
