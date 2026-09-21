import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../src/services/api';
import { useAuth } from '../../src/store/auth';
import { C, F, R, UI } from '../../src/shared/design';
import { encodeRouteParam } from '../../src/shared/routeParams';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

type StatusToken = { label: string; color: string; bg: string };

const STATUS: Record<string, StatusToken> = {
  pending: { label: 'Хүлээгдэж байна', color: C.seller, bg: C.goldDim },
  confirmed: { label: 'Баталгаажсан', color: C.primary, bg: C.primaryDim },
  paid: { label: 'Төлсөн', color: C.primary, bg: C.primaryDim },
  processing: { label: 'Бэлтгэж байна', color: C.primary, bg: C.primaryDim },
  preparing: { label: 'Бэлтгэж байна', color: C.primary, bg: C.primaryDim },
  ready: { label: 'Бэлэн', color: C.secondary, bg: C.secondaryDim },
  handed_to_driver: { label: 'Жолоочид өгсөн', color: C.seller, bg: C.goldDim },
  delivering: { label: 'Хүргэж байна', color: C.primary, bg: C.primaryDim },
  shipped: { label: 'Хүргэж байна', color: C.primary, bg: C.primaryDim },
  delivered: { label: 'Хүргэгдсэн', color: C.secondary, bg: C.secondaryDim },
  cancelled: { label: 'Цуцлагдсан', color: C.error, bg: C.errorDim },
};

export default function OrdersScreen() {
  const { user } = useAuth();
  const layout = useAppLayoutMetrics();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery<any>({
    queryKey: ['buyer-orders'],
    queryFn: () => get('/orders'),
    enabled: !!user,
  });

  const orders = resolveOrders(data);

  if (!user) {
    return (
      <AppScreen>
        <AppTopBar eyebrow="Профайл" title="Захиалга" showBack={false} />
        <AppHeader
          title="Миний захиалгууд"
          subtitle="Захиалгын түүхээ харахын тулд нэвтэрнэ үү."
          icon="cube-outline"
          accent={C.primary}
        />
        <AppCard style={styles.emptyCard}>
          <Ionicons name="lock-closed-outline" size={42} color={C.primary} />
          <Text style={styles.emptyTitle}>Нэвтрэх шаардлагатай</Text>
          <Text style={styles.emptySubtitle}>
            Захиалгын төлөв, хүргэлт, буцаалтын мэдээллээ нэг дор хянах боломжтой.
          </Text>
          <View style={styles.authActions}>
            <AppButton
              label="Нэвтрэх"
              icon="log-in-outline"
              style={styles.authButton}
              onPress={() => router.push({ pathname: '/login', params: { returnTo: '/orders' } } as never)}
            />
            <AppButton
              label="Бүртгүүлэх"
              icon="person-add-outline"
              variant="secondary"
              style={styles.authButton}
              onPress={() => router.push({ pathname: '/register', params: { returnTo: '/orders' } } as never)}
            />
          </View>
        </AppCard>
      </AppScreen>
    );
  }

  if (isLoading) {
    return (
      <AppScreen contentContainerStyle={{ flexGrow: 1 }}>
        <AppTopBar eyebrow="Профайл" title="Захиалга" showBack={false} />
        <AppHeader
          title="Миний захиалгууд"
          subtitle="Захиалгын мэдээлэл ачаалж байна."
          icon="receipt-outline"
          accent={C.primary}
        />
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={C.brand} />
          <Text style={styles.loadingText}>Захиалгууд ачаалж байна...</Text>
        </View>
      </AppScreen>
    );
  }

  if (isError) {
    return (
      <AppScreen>
        <AppTopBar eyebrow="Профайл" title="Захиалга" showBack={false} />
        <AppHeader
          title="Миний захиалгууд"
          subtitle="Захиалга татахад алдаа гарлаа."
          icon="warning-outline"
          accent={C.error}
        />
        <AppCard style={styles.emptyCard}>
          <Ionicons name="cloud-offline-outline" size={42} color={C.error} />
          <Text style={styles.emptyTitle}>Дахин оролдоно уу</Text>
          <Text style={styles.emptySubtitle}>
            Сүлжээгээ шалгаад захиалгын мэдээллээ дахин татна уу.
          </Text>
          <AppButton label="Дахин оролдох" icon="refresh-outline" onPress={() => refetch()} />
        </AppCard>
      </AppScreen>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={orders}
        keyExtractor={(order, index) => getOrderKey(order) || `fallback-${index}`}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.brand} />}
        contentContainerStyle={[styles.list, { paddingTop: layout.screenTop, paddingBottom: layout.screenBottom }]}
        ListHeaderComponent={
          <>
            <AppTopBar eyebrow="Профайл" title="Захиалга" showBack={false} />
            <AppHeader
              title="Миний захиалгууд"
              subtitle={orders.length > 0 ? `${orders.length} захиалга` : 'Захиалгын түүх хоосон байна.'}
              icon="receipt-outline"
              accent={C.primary}
            />
          </>
        }
        ListEmptyComponent={
          <AppCard style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={42} color={C.textMuted} />
            <Text style={styles.emptyTitle}>Захиалга байхгүй</Text>
            <Text style={styles.emptySubtitle}>
              Та бараа сонгоод анхны захиалгаа үүсгээрэй.
            </Text>
            <AppButton label="Дэлгүүр харах" icon="bag-outline" onPress={() => router.push('/store' as any)} />
          </AppCard>
        }
        renderItem={({ item }) => <OrderCard order={item} />}
      />
    </View>
  );
}

function OrderCard({ order }: { order: any }) {
  const rawStatus = String(order?.status ?? '').toLowerCase();
  const status = STATUS[rawStatus] || { label: order?.status || 'Төлөвгүй', color: C.textSub, bg: C.bgSection };
  const items = Array.isArray(order?.items) ? order.items : [];
  const first = items[0] || {};
  const detailId = getOrderKey(order);
  const routeId = encodeRouteParam(detailId);
  const orderId = shortId(order?.orderNumber ?? detailId, 'ORDER', 6);
  const image = firstImage(first);

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      disabled={!routeId}
      accessibilityRole="button"
      accessibilityLabel={`Захиалга #${orderId} дэлгэрэнгүй харах`}
      accessibilityState={{ disabled: !routeId }}
      onPress={() => {
        if (routeId) router.push(`/order/${routeId}` as any);
      }}
    >
      <AppCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>#{orderId}</Text>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          {image ? (
            <Image source={{ uri: image }} style={styles.thumb} accessibilityLabel={`${itemName(first)} зураг`} />
          ) : (
            <View style={styles.thumbEmpty}>
              <Ionicons name="cube-outline" size={22} color={C.textMuted} />
            </View>
          )}
          <View style={styles.cardInfo}>
            <Text style={styles.productName} numberOfLines={1}>
              {itemName(first)}
              {items.length > 1 ? ` +${items.length - 1}` : ''}
            </Text>
            <Text style={styles.total}>{formatMoney(order?.total ?? order?.grandTotal ?? order?.amount)}</Text>
            <Text style={styles.date}>{formatDate(order?.createdAt)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </View>
      </AppCard>
    </TouchableOpacity>
  );
}

function resolveOrders(data: any): any[] {
  if (Array.isArray(data?.orders)) return data.orders;
  if (Array.isArray(data?.data?.orders)) return data.data.orders;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

function getOrderKey(order: any) {
  const key = order?._id ?? order?.id ?? order?.orderId;
  return key ? String(key) : '';
}

function shortId(value: any, fallback: string, size: number) {
  const id = String(value ?? '').trim();
  return id ? id.slice(-size).toLocaleUpperCase('en-US') : fallback;
}

function firstImage(item: any) {
  const image = item?.image ?? item?.product?.image ?? item?.product?.images?.[0] ?? item?.images?.[0];
  return typeof image === 'string' ? image : image?.url;
}

function itemName(item: any) {
  return item?.name ?? item?.productName ?? item?.product?.name ?? 'Бараа';
}

function formatMoney(value: any) {
  return `${Number(value || 0).toLocaleString('mn-MN')}₮`;
}

function formatDate(value?: string | number | Date) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('mn-MN');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  list: { padding: R.lg, gap: R.sm },
  loadingText: { ...F.small, color: C.textSub, marginTop: R.md },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: R.sm,
    paddingVertical: R.xxxl,
  },
  emptyTitle: { ...F.h3, color: C.text, textAlign: 'center' },
  emptySubtitle: { ...F.small, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  authActions: { flexDirection: 'row', gap: R.sm, marginTop: R.sm, width: '100%' },
  authButton: { flex: 1 },
  card: { marginBottom: R.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: R.md, marginBottom: R.md },
  orderId: { ...F.small, fontWeight: '900', color: C.primary },
  badge: { borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { ...F.tiny, fontWeight: '800' },
  cardBody: { flexDirection: 'row', alignItems: 'center', gap: R.sm },
  thumb: { width: 54, height: 54, borderRadius: R.md, backgroundColor: C.bgSection },
  thumbEmpty: {
    width: 54,
    height: 54,
    borderRadius: R.md,
    backgroundColor: C.bgSection,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  productName: { ...F.small, fontWeight: '800', color: C.text },
  total: { ...F.body, fontWeight: '900', color: C.brand, marginTop: 2 },
  date: { ...F.tiny, color: C.textMuted, marginTop: 2 },
});
