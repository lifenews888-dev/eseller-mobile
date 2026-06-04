import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { OrderAPI } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

type IconName = keyof typeof Ionicons.glyphMap;

const STATUS_STEPS: Array<{ key: string; label: string; icon: IconName }> = [
  { key: 'pending', label: 'Хүлээгдэж', icon: 'time-outline' },
  { key: 'confirmed', label: 'Баталгаажсан', icon: 'checkmark-circle-outline' },
  { key: 'preparing', label: 'Бэлтгэж', icon: 'construct-outline' },
  { key: 'ready', label: 'Бэлэн', icon: 'cube-outline' },
  { key: 'handed_to_driver', label: 'Жолоочид', icon: 'bicycle-outline' },
  { key: 'delivering', label: 'Хүргэж', icon: 'car-outline' },
  { key: 'delivered', label: 'Хүргэгдсэн', icon: 'checkmark-done-outline' },
];

const STATUS_ALIAS: Record<string, string> = {
  paid: 'confirmed',
  processing: 'preparing',
  shipped: 'delivering',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Хүлээгдэж байна',
  confirmed: 'Баталгаажсан',
  paid: 'Төлсөн',
  processing: 'Бэлтгэж байна',
  preparing: 'Бэлтгэж байна',
  ready: 'Бэлэн',
  handed_to_driver: 'Жолоочид өгсөн',
  delivering: 'Хүргэж байна',
  shipped: 'Хүргэж байна',
  delivered: 'Хүргэгдсэн',
  cancelled: 'Цуцлагдсан',
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const layout = useAppLayoutMetrics();
  const { data, isLoading } = useQuery<any>({
    queryKey: ['order', id],
    queryFn: () => OrderAPI.detail(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <AppScreen contentContainerStyle={{ flexGrow: 1 }}>
        <AppTopBar eyebrow="Захиалга" title={`#${shortId(id, 6)}`} />
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={C.brand} />
          <Text style={styles.loadingText}>Захиалгын мэдээлэл ачаалж байна...</Text>
        </View>
      </AppScreen>
    );
  }

  const order = (data as any)?.data?.order || (data as any)?.order || data;
  if (!order) {
    return (
      <AppScreen contentContainerStyle={{ flexGrow: 1 }}>
        <AppTopBar eyebrow="Захиалга" title={`#${shortId(id, 6)}`} />
        <View style={styles.emptyWrap}>
          <AppCard style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={44} color={C.textMuted} />
            <Text style={styles.emptyTitle}>Захиалга олдсонгүй</Text>
            <Text style={styles.mutedText}>Захиалгын дугаар өөрчлөгдсөн эсвэл мэдээлэл түр ачаалагдсангүй.</Text>
            <AppButton
              label="Захиалгууд руу"
              icon="list-outline"
              variant="ghost"
              onPress={() => router.replace('/orders' as any)}
            />
          </AppCard>
        </View>
      </AppScreen>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const orderKey = getOrderKey(order, id);
  const displayId = shortId(order.orderNumber ?? orderKey, 6);
  const rawStatus = String(order.status ?? '').toLowerCase();
  const resolvedStatus = STATUS_ALIAS[rawStatus] ?? rawStatus;
  const currentStepIdx = Math.max(0, STATUS_STEPS.findIndex((step) => step.key === resolvedStatus));
  const cancelled = rawStatus === 'cancelled';
  const delivered = rawStatus === 'delivered';
  const driver = order.driver ?? order.deliveryDriver ?? order.courier;
  const phone = driver?.phone ?? driver?.phoneNumber;
  const address = formatAddress(order.deliveryAddress ?? order.shippingAddress ?? order.address);
  const subtotal = items.reduce((sum: number, item: any) => sum + itemTotal(item), 0);
  const total = order.total ?? order.grandTotal ?? subtotal;

  return (
    <View style={styles.screen}>
      <AppScreen contentContainerStyle={{ paddingBottom: layout.screenBottom + 96 }}>
        <AppTopBar eyebrow="Захиалга" title={`#${displayId}`} />

        <AppHeader
          title="Захиалгын дэлгэрэнгүй"
          subtitle="Төлөв, бараа, хүргэлт, баримтын мэдээллийг нэг дор харна."
          icon="receipt-outline"
          accent={C.brand}
        />

        <AppCard style={styles.statusCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Захиалгын явц</Text>
            <Text style={styles.sectionSub}>{STATUS_LABELS[rawStatus] ?? order.status ?? 'Төлөвгүй'}</Text>
          </View>
          {cancelled ? <StatusPill label="Цуцлагдсан" color={C.error} /> : null}
        </View>

        <View style={styles.timeline}>
          {STATUS_STEPS.map((step, index) => {
            const done = !cancelled && index <= currentStepIdx;
            const active = !cancelled && index === currentStepIdx;
            return (
              <View
                key={step.key}
                style={styles.stepRow}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`${step.label}: ${active ? 'одоогийн төлөв' : done ? 'дууссан' : 'хүлээгдэж байна'}`}
              >
                <View style={styles.rail}>
                  <View style={[styles.stepCircle, done ? styles.stepDone : styles.stepIdle]}>
                  <Ionicons name={step.icon} size={14} color={done ? C.bgCard : C.textMuted} />
                  </View>
                  {index < STATUS_STEPS.length - 1 ? (
                    <View style={[styles.stepLine, done ? { backgroundColor: C.brandDim } : null]} />
                  ) : null}
                </View>
                <Text style={[styles.stepLabel, done ? styles.stepLabelDone : null, active ? styles.stepLabelActive : null]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>
        </AppCard>

        <AppCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Барааны жагсаалт</Text>
        {items.length === 0 ? (
          <Text style={styles.mutedText}>Бараа бүртгэгдээгүй байна.</Text>
        ) : (
          items.map((item: any, index: number) => (
            <View key={`${item.id ?? item._id ?? item.name ?? 'item'}-${index}`} style={styles.itemRow}>
              <View style={styles.itemIcon}>
                <Ionicons name="cube-outline" size={16} color={C.primary} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{itemName(item)}</Text>
                <Text style={styles.itemQty}>x{item.quantity ?? item.qty ?? 1}</Text>
              </View>
              <Text style={styles.itemPrice}>{formatMoney(itemTotal(item))}</Text>
            </View>
          ))
        )}
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Нийт</Text>
          <Text style={styles.totalValue}>{formatMoney(total)}</Text>
        </View>
        </AppCard>

        {address ? (
          <AppCard style={styles.sectionCard}>
          <View style={styles.inlineTitle}>
            <Ionicons name="location-outline" size={18} color={C.driver} />
            <Text style={styles.sectionTitle}>Хүргэлтийн хаяг</Text>
          </View>
          <Text style={styles.bodyText}>{address}</Text>
          </AppCard>
        ) : null}

        {driver ? (
          <AppCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.inlineTitle}>
              <Ionicons name="car-outline" size={18} color={C.driver} />
              <Text style={styles.sectionTitle}>Жолооч</Text>
            </View>
            {phone ? (
              <AppButton
                label="Залгах"
                icon="call-outline"
                variant="secondary"
                style={styles.smallButton}
                onPress={() => Linking.openURL(`tel:${phone}`)}
              />
            ) : null}
          </View>
          <Text style={styles.bodyText}>{driver.name ?? driver.fullName ?? 'Жолооч'}</Text>
          {phone ? <Text style={styles.mutedText}>{phone}</Text> : null}
          </AppCard>
        ) : null}
      </AppScreen>

      <View style={[styles.fixedActions, { paddingBottom: layout.insets.bottom + R.lg }]}>
        {delivered && !order.hasReview ? (
          <AppButton
            label="Үнэлгээ өгөх"
            icon="star-outline"
            variant="seller"
            style={styles.actionButton}
            accessibilityHint="Энэ захиалгын бараа болон үйлчилгээний үнэлгээ нээнэ"
            onPress={() => router.push(`/review/${orderKey}` as any)}
          />
        ) : null}
        <AppButton
          label="Баримт харах"
          icon="receipt-outline"
          variant="ghost"
          style={styles.actionButton}
          accessibilityHint="Энэ захиалгын баримтыг нээнэ"
          onPress={() => router.push(`/receipt/${orderKey}` as any)}
        />
      </View>
    </View>
  );
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.statusPill, { backgroundColor: `${color}18` }]}>
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

function getOrderKey(order: any, fallback?: string) {
  return String(order?.id ?? order?._id ?? order?.orderId ?? fallback ?? '');
}

function shortId(value: any, size: number) {
  const id = String(value ?? '').trim();
  return id ? id.slice(-size).toLocaleUpperCase('en-US') : 'ORDER';
}

function itemName(item: any) {
  return item?.name ?? item?.productName ?? item?.product?.name ?? 'Бараа';
}

function itemTotal(item: any) {
  return Number(item?.total ?? item?.lineTotal ?? (item?.price ?? 0) * (item?.quantity ?? item?.qty ?? 1));
}

function formatMoney(value: any) {
  return `${Number(value || 0).toLocaleString('mn-MN')}₮`;
}

function formatAddress(value: any) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const parts = [
    value.city,
    value.district,
    value.khoroo,
    value.street,
    value.address,
    value.detail,
  ].filter(Boolean);
  return parts.join(', ');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center' },
  emptyCard: { alignItems: 'center', gap: R.sm },
  emptyTitle: { ...F.h4, color: C.text, textAlign: 'center' },
  loadingText: { ...F.small, color: C.textSub, marginTop: R.md },
  statusCard: { marginBottom: R.md },
  sectionCard: { marginBottom: R.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: R.md, marginBottom: R.md },
  sectionTitle: { ...F.h4, color: C.text },
  sectionSub: { ...F.small, color: C.textMuted, marginTop: 2 },
  timeline: { gap: 0 },
  stepRow: { flexDirection: 'row', minHeight: 42 },
  rail: { width: 32, alignItems: 'center' },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: R.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stepDone: { backgroundColor: C.primary, borderColor: C.primary },
  stepIdle: { backgroundColor: C.bgSection, borderColor: C.border },
  stepLine: { width: 2, flex: 1, backgroundColor: C.border, marginVertical: 2 },
  stepLabel: { ...F.small, color: C.textMuted, marginLeft: R.sm, paddingTop: 5, flex: 1 },
  stepLabelDone: { color: C.text, fontWeight: '700' },
  stepLabelActive: { color: C.brand, fontWeight: '900' },
  statusPill: { borderRadius: R.full, paddingHorizontal: R.sm, paddingVertical: 4 },
  statusText: { ...F.tiny, fontWeight: '900' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: R.sm, paddingVertical: R.sm },
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: R.sm,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { ...F.small, color: C.text, fontWeight: '800' },
  itemQty: { ...F.tiny, color: C.textMuted, marginTop: 2 },
  itemPrice: { ...F.small, color: C.text, fontWeight: '900', textAlign: 'right' },
  divider: { height: 1, backgroundColor: C.border, marginVertical: R.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: R.md },
  totalLabel: { ...F.h4, color: C.text },
  totalValue: { ...F.h4, color: C.brand },
  inlineTitle: { flexDirection: 'row', alignItems: 'center', gap: R.sm },
  bodyText: { ...F.small, color: C.text, lineHeight: 20 },
  mutedText: { ...F.small, color: C.textMuted, lineHeight: 20 },
  smallButton: { minHeight: 38, paddingVertical: 6 },
  fixedActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: R.sm,
    backgroundColor: C.bgCard,
    padding: UI.screenPad,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  actionButton: { flex: 1 },
});
