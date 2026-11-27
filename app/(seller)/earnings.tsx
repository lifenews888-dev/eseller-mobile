import { ActivityIndicator, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../src/services/api';
import { C, F, R } from '../../src/shared/design';
import { describeSellerError } from '../../src/api/sellerDashboard';
import { useSellerCommissionSummary } from '../../src/hooks/useSellerDashboard';
import { useSellerNetworkEnabled } from '../../src/config/remoteFlags';
import { AppCard, AppHeader, AppMetricCard, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

export default function SellerEarningsScreen() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['seller-earnings'],
    queryFn: () => get('/affiliate/commissions'),
  });

  const commissions = (data as any)?.commissions || (Array.isArray(data) ? data : []);
  const stats = (data as any)?.stats || {};

  return (
    <AppScreen
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.seller} />
      }
    >
      <AppTopBar eyebrow="Борлуулагч" title="Орлого" showBack={false} />
      <AppHeader
        title="Орлого"
        subtitle="Комисс, төлөв, сарын гүйцэтгэлийн нэгтгэл."
        icon="cash-outline"
        accent={C.seller}
      />

      <AppCard elevated style={{ marginBottom: R.md }}>
        <Text style={{ ...F.small, color: C.seller, fontWeight: '900' }}>Нийт орлого</Text>
        <Text style={{ fontSize: 34, color: C.seller, fontWeight: '900', marginTop: R.xs }}>
          {formatMoney(stats.totalEarned)}
        </Text>
      </AppCard>

      <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.lg }}>
        <AppMetricCard
          label="Энэ сар"
          value={formatMoney(stats.thisMonth)}
          icon="calendar-outline"
          accent={C.seller}
        />
        <AppMetricCard
          label="Хүлээгдэж буй"
          value={formatMoney(stats.pending)}
          icon="time-outline"
          accent={C.warning}
        />
      </View>

      <SellerNetworkCommissionSection />

      <Text style={{ ...F.h3, color: C.text, marginBottom: R.sm }}>Гүйлгээний түүх</Text>
      {commissions.length === 0 ? (
        <AppCard style={{ alignItems: 'center', gap: R.sm }}>
          <Ionicons name="receipt-outline" size={34} color={C.textMuted} />
          <Text style={{ ...F.small, color: C.textSub }}>Гүйлгээ байхгүй байна</Text>
        </AppCard>
      ) : (
        <View style={{ gap: R.sm }}>
          {commissions.map((commission: any, index: number) => (
            <AppCard key={commission.id ?? index} style={{ padding: R.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...F.small, color: C.text, fontWeight: '800' }} numberOfLines={1}>
                    {commission.productName || 'Захиалга'}
                  </Text>
                  <Text style={{ ...F.tiny, color: C.textMuted, marginTop: 2 }}>
                    {commission.createdAt
                      ? new Date(commission.createdAt).toLocaleDateString('mn-MN')
                      : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ ...F.body, color: C.success, fontWeight: '900' }}>
                    +{formatMoney(commission.amount)}
                  </Text>
                  <StatusBadge paid={commission.status === 'paid'} />
                </View>
              </View>
            </AppCard>
          ))}
        </View>
      )}
    </AppScreen>
  );
}

function SellerNetworkCommissionSection() {
  const enabled = useSellerNetworkEnabled();
  const q = useSellerCommissionSummary({ enabled });

  if (!enabled) return null;

  return (
    <View style={{ marginBottom: R.lg }}>
      <Text style={{ ...F.h3, color: C.text, marginBottom: R.xs }}>
        Худалдагчийн сүлжээний шимтгэл
      </Text>
      <Text style={{ ...F.tiny, color: C.textMuted, marginBottom: R.sm }}>
        Серверээс тооцоологдсон dry-run дүн. Одоогоор олголт хийхгүй.
      </Text>
      <AppCard>
        {q.isLoading ? (
          <View style={{ alignItems: 'center', padding: R.md }}>
            <ActivityIndicator color={C.seller} />
            <Text style={{ ...F.small, color: C.textSub, marginTop: R.sm }}>
              Ачаалж байна...
            </Text>
          </View>
        ) : q.isError ? (
          <Text style={{ ...F.small, color: C.error }}>
            {describeSellerError(q.error).message}
          </Text>
        ) : q.data ? (
          <>
            <View style={{ flexDirection: 'row', gap: R.sm }}>
              <KvBox
                label="Тооцоолсон"
                count={q.data.totals.dryRun}
                amount={formatMoney(q.data.proposedAmountsMnt.dryRun)}
              />
              <KvBox
                label="Шалгаж буй"
                count={q.data.totals.needsReview}
                amount={formatMoney(q.data.proposedAmountsMnt.inReview)}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: R.sm, marginTop: R.sm }}>
              <KvBox
                label="Зөвшөөрөгдсөн"
                count={q.data.totals.approvedForFuturePosting}
                amount={formatMoney(q.data.proposedAmountsMnt.approvedNotPayable)}
              />
              <KvBox label="Хасагдсан" count={q.data.totals.excluded} amount="-" />
            </View>
            <View
              style={{
                marginTop: R.md,
                padding: R.md,
                backgroundColor: C.bgSection,
                borderRadius: R.md,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: C.border,
              }}
            >
              <Text style={{ ...F.small, color: C.textSub, fontWeight: '800' }}>
                Олгогдох дүн: {formatMoney(q.data.payableAmountMnt)}
              </Text>
            </View>
          </>
        ) : null}
      </AppCard>
    </View>
  );
}

function KvBox({ label, count, amount }: { label: string; count: number; amount: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.bgSection,
        borderRadius: R.md,
        padding: R.sm,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      <Text style={{ ...F.tiny, color: C.textMuted }}>{label}</Text>
      <Text style={{ ...F.h3, color: C.text, marginTop: 2 }}>{count}</Text>
      <Text style={{ ...F.tiny, color: C.textSub, marginTop: 2 }}>{amount}</Text>
    </View>
  );
}

function StatusBadge({ paid }: { paid: boolean }) {
  return (
    <View
      style={{
        backgroundColor: paid ? C.success + '18' : C.warning + '18',
        borderRadius: R.full,
        paddingHorizontal: R.sm,
        paddingVertical: 3,
      }}
    >
      <Text style={{ ...F.tiny, color: paid ? C.success : C.warning, fontWeight: '800' }}>
        {paid ? 'Төлөгдсөн' : 'Хүлээгдэж буй'}
      </Text>
    </View>
  );
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString()}₮`;
}
