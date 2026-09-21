import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { apiUrl } from '../../src/config/apiBase';
import * as SecureStore from '../../src/shared/secureStore';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';
import { useAuth } from '../../src/store/auth';
import { RequireAuthScreen } from '../../src/shared/ui/RequireAuthScreen';

type IconName = keyof typeof Ionicons.glyphMap;

interface BNPLPaymentItem {
  id: string;
  dueDate: string;
  amount: number;
  paidAt: string | null;
  status: string;
}

interface BNPLApp {
  id: string;
  totalAmount: number;
  downPayment: number;
  monthlyAmount: number;
  months: number;
  bank: string;
  status: string;
  order: { id: string; orderNumber: string; total: number };
  payments: BNPLPaymentItem[];
  nextPayment: BNPLPaymentItem | null;
  progress: { paid: number; total: number };
}

const STATUS_META: Record<string, { label: string; color: string; icon: IconName }> = {
  PENDING: { label: 'Хүлээгдэж байна', color: C.warning, icon: 'time-outline' },
  ACTIVE: { label: 'Идэвхтэй', color: C.primary, icon: 'card-outline' },
  COMPLETED: { label: 'Дууссан', color: C.secondary, icon: 'checkmark-circle-outline' },
  DEFAULTED: { label: 'Хугацаа хэтэрсэн', color: C.error, icon: 'alert-circle-outline' },
  REJECTED: { label: 'Татгалзсан', color: C.textMuted, icon: 'close-circle-outline' },
};

const PAYMENT_META: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Хүлээгдэж байна', color: C.warning },
  PAID: { label: 'Төлсөн', color: C.secondary },
  OVERDUE: { label: 'Хугацаа хэтэрсэн', color: C.error },
};

const fmt = (n: number) => `${(n ?? 0).toLocaleString()}₮`;

function fmtDate(d: string) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

async function fetchBNPL(): Promise<BNPLApp[]> {
  const token = await SecureStore.getItemAsync('token');
  const res = await fetch(apiUrl('/bnpl/payments'), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  return data.data || [];
}

export default function BNPLScreen() {
  const layout = useAppLayoutMetrics();
  const user = useAuth((s) => s.user);
  const [apps, setApps] = useState<BNPLApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setApps(await fetchBNPL());
    } catch {
      setApps([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handlePay = (paymentId: string) => {
    Alert.alert('Төлбөр хийх', `Төлбөр төлөх хэсэг удахгүй нэмэгдэнэ. ID: ${paymentId}`);
  };

  if (!user) {
    return (
      <RequireAuthScreen
        title="BNPL"
        subtitle="BNPL төлбөрийн хуваарь, зээлийн төлөвөө харахын тулд нэвтэрнэ үү."
        icon="card-outline"
        accent={C.primary}
        returnTo="/bnpl"
      />
    );
  }

  if (loading) {
    return (
      <View style={st.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[st.list, { paddingTop: layout.screenTop, paddingBottom: layout.screenBottom }]}>
          <AppTopBar eyebrow="Санхүү" title="BNPL" showBack={false} />
          <AppCard style={st.centerCard}>
            <ActivityIndicator size="large" color={C.primary} />
          </AppCard>
        </View>
      </View>
    );
  }

  return (
    <View style={st.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={apps}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BNPLCard app={item} onPay={handlePay} />}
        contentContainerStyle={[st.list, { paddingTop: layout.screenTop, paddingBottom: layout.screenBottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        ListHeaderComponent={
          <>
            <AppTopBar eyebrow="Санхүү" title="BNPL" showBack={false} />
            <AppHeader
            title="Зээлээр авах"
            subtitle="BNPL төлөв, сар бүрийн төлбөр болон дараагийн төлөх огноогоо хянана."
            icon="card-outline"
              accent={C.primary}
            />
          </>
        }
        ListEmptyComponent={
          <AppCard style={st.empty}>
            <Ionicons name="card-outline" size={42} color={C.textMuted} />
            <Text style={st.emptyTitle}>Идэвхтэй BNPL зээл алга</Text>
            <Text style={st.emptyText}>Зээлээр авах захиалга баталгаажмагц энд төлбөрийн хуваарь харагдана.</Text>
            <View style={st.emptyActions}>
              <AppButton
                label="Дэлгүүр үзэх"
                icon="bag-outline"
                onPress={() => router.push('/store' as any)}
                style={st.emptyButton}
              />
              <AppButton
                label="Дахин шалгах"
                icon="refresh"
                variant="secondary"
                onPress={onRefresh}
                style={st.emptyButton}
              />
            </View>
          </AppCard>
        }
      />
    </View>
  );
}

function BNPLCard({ app, onPay }: { app: BNPLApp; onPay: (paymentId: string) => void }) {
  const meta = STATUS_META[app.status] || STATUS_META.PENDING;
  const total = app.progress?.total ?? app.payments.length;
  const paid = app.progress?.paid ?? app.payments.filter((p) => p.status === 'PAID').length;
  const progressPct = total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 0;

  return (
    <AppCard style={st.card}>
      <View style={st.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={st.orderNum}>Захиалга #{app.order?.orderNumber ?? app.id}</Text>
          <Text style={st.subtitle}>
            {app.bank} / {app.months} сар
          </Text>
        </View>
        <View style={[st.badge, { backgroundColor: meta.color + '18' }]}>
          <Ionicons name={meta.icon} size={14} color={meta.color} />
          <Text style={[st.badgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={st.amountRow}>
        <AmountItem label="Нийт" value={fmt(app.totalAmount)} />
        <AmountItem label="Сарын" value={fmt(app.monthlyAmount)} accent={C.primary} />
        <AmountItem label="Урьдчилгаа" value={fmt(app.downPayment)} />
      </View>

      <View style={st.progressSection}>
        <View style={st.progressHeader}>
          <Text style={st.progressLabel}>Төлбөрийн явц</Text>
          <Text style={st.progressLabel}>
            {paid}/{total} ({Math.round(progressPct)}%)
          </Text>
        </View>
        <View style={st.progressTrack}>
          <View style={[st.progressFill, { width: `${progressPct}%` }]} />
        </View>
      </View>

      {app.nextPayment ? (
        <View style={st.nextPayment}>
          <View style={st.nextIcon}>
            <Ionicons name="calendar-outline" size={19} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.nextPaymentLabel}>Дараагийн төлбөр</Text>
            <Text style={st.nextPaymentValue}>
              {fmtDate(app.nextPayment.dueDate)} / {fmt(app.nextPayment.amount)}
            </Text>
          </View>
          <AppButton
            label="Төлөх"
            icon="wallet-outline"
            onPress={() => onPay(app.nextPayment!.id)}
            style={st.payButton}
            textStyle={st.payButtonText}
          />
        </View>
      ) : null}

      <View style={st.paymentList}>
        {app.payments.map((payment, index) => (
          <PaymentRow key={payment.id} payment={payment} index={index} />
        ))}
      </View>
    </AppCard>
  );
}

function AmountItem({ label, value, accent = C.text }: { label: string; value: string; accent?: string }) {
  return (
    <View style={st.amountItem}>
      <Text style={st.amountLabel}>{label}</Text>
      <Text style={[st.amountValue, { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function PaymentRow({ payment, index }: { payment: BNPLPaymentItem; index: number }) {
  const meta = PAYMENT_META[payment.status] || { label: payment.status, color: C.textMuted };

  return (
    <View style={st.paymentRow}>
      <View style={st.paymentLeft}>
        <Text style={st.paymentNum}>#{index + 1}</Text>
        <Text style={st.paymentDate}>{fmtDate(payment.dueDate)}</Text>
      </View>
      <View style={st.paymentRight}>
        <Text style={st.paymentAmount}>{fmt(payment.amount)}</Text>
        <View style={[st.paymentBadge, { backgroundColor: meta.color + '18' }]}>
          <Text style={[st.paymentBadgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
  },
  centerCard: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: UI.screenPad,
    gap: R.md,
  },
  empty: {
    alignItems: 'center',
    gap: R.sm,
  },
  emptyTitle: {
    ...F.h4,
    color: C.text,
    textAlign: 'center',
  },
  emptyText: {
    ...F.small,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyActions: {
    width: '100%',
    flexDirection: 'row',
    gap: R.sm,
    marginTop: R.sm,
  },
  emptyButton: {
    flex: 1,
  },
  card: {
    gap: R.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: R.sm,
  },
  orderNum: {
    ...F.body,
    color: C.text,
    fontWeight: '800',
  },
  subtitle: {
    ...F.small,
    color: C.textSub,
    marginTop: 2,
  },
  badge: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.xs,
    borderRadius: R.full,
    paddingHorizontal: R.sm,
  },
  badgeText: {
    ...F.tiny,
    fontWeight: '800',
  },
  amountRow: {
    flexDirection: 'row',
    backgroundColor: C.bgSection,
    borderRadius: UI.controlRadius,
    padding: R.sm,
    gap: R.sm,
  },
  amountItem: {
    flex: 1,
  },
  amountLabel: {
    ...F.tiny,
    color: C.textMuted,
    marginBottom: 2,
  },
  amountValue: {
    ...F.small,
    fontWeight: '800',
  },
  progressSection: {
    gap: R.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: R.sm,
  },
  progressLabel: {
    ...F.tiny,
    color: C.textSub,
  },
  progressTrack: {
    height: 7,
    backgroundColor: C.bgSection,
    borderRadius: R.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.primary,
    borderRadius: R.full,
  },
  nextPayment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
    backgroundColor: C.primaryDim,
    borderRadius: UI.controlRadius,
    borderWidth: 1,
    borderColor: C.primary + '22',
    padding: R.sm,
  },
  nextIcon: {
    width: 36,
    height: 36,
    borderRadius: R.sm,
    backgroundColor: C.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPaymentLabel: {
    ...F.tiny,
    color: C.textSub,
  },
  nextPaymentValue: {
    ...F.small,
    color: C.text,
    fontWeight: '800',
    marginTop: 2,
  },
  payButton: {
    minHeight: 38,
    paddingHorizontal: R.sm,
  },
  payButtonText: {
    fontSize: 12,
  },
  paymentList: {
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  paymentRow: {
    minHeight: 46,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: R.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
    flex: 1,
  },
  paymentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
  },
  paymentNum: {
    ...F.tiny,
    color: C.textMuted,
    width: 26,
  },
  paymentDate: {
    ...F.small,
    color: C.textSub,
  },
  paymentAmount: {
    ...F.small,
    color: C.text,
    fontWeight: '800',
  },
  paymentBadge: {
    borderRadius: R.full,
    paddingHorizontal: R.sm,
    paddingVertical: 3,
  },
  paymentBadgeText: {
    ...F.tiny,
    fontWeight: '800',
  },
});
