import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LoyaltyAPI, WalletAPI, type WalletHistoryEntry } from '../../src/services/api';
import { useAuth } from '../../src/store/auth';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppMetricCard, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';
import { RequireAuthScreen } from '../../src/shared/ui/RequireAuthScreen';

type WalletTab = 'overview' | 'transactions' | 'topup' | 'payout';
type IconName = keyof typeof Ionicons.glyphMap;
type WalletRoutePatch = {
  tab?: WalletTab;
  txFilter?: string;
};

type WalletData = {
  balance?: number;
  pending?: number;
  escrowHold?: number;
  history?: WalletHistoryEntry[];
};

type LoyaltyData = {
  balance?: number;
  tier?: string;
  lifetimeEarned?: number;
};

type TransactionData = {
  transactions: WalletHistoryEntry[];
  total: number;
  page: number;
  totalPages: number;
};

function unwrap<T = unknown>(res: any): T {
  return (res?.data ?? res) as T;
}

const fmt = (n: number) => `${(n ?? 0).toLocaleString()}₮`;
const parseMoney = (value: string) => parseInt((value || '').replace(/[,\s₮]/g, ''), 10);
const normalize = (value?: string) => (value ?? '').toLocaleUpperCase();

const TIER_META: Record<string, { icon: IconName; color: string; label: string }> = {
  BRONZE: { icon: 'ribbon-outline', color: C.seller, label: 'Bronze' },
  SILVER: { icon: 'shield-outline', color: C.textSub, label: 'Silver' },
  GOLD: { icon: 'star-outline', color: C.gold, label: 'Gold' },
  PLATINUM: { icon: 'diamond-outline', color: C.primary, label: 'Platinum' },
};

const QUICK_AMOUNTS = [10000, 20000, 50000, 100000, 200000];

const TOPUP_METHODS: { id: 'qpay' | 'socialpay' | 'card'; label: string; icon: IconName }[] = [
  { id: 'qpay', label: 'QPay', icon: 'qr-code-outline' },
  { id: 'socialpay', label: 'SocialPay', icon: 'wallet-outline' },
  { id: 'card', label: 'Карт', icon: 'card-outline' },
];

const BANKS = ['Хаан банк', 'Голомт банк', 'TDB банк', 'Хас банк', 'Ариг банк', 'Капитрон банк'];

const TX_FILTERS: { label: string; value?: string }[] = [
  { label: 'Бүгд' },
  { label: 'Цэнэглэлт', value: 'TOPUP' },
  { label: 'Escrow', value: 'ESCROW_HOLD' },
  { label: 'Цуцлалт', value: 'ESCROW_REFUND' },
  { label: 'Оноо мөнгө', value: 'POINTS_REDEEM' },
  { label: 'Гаргалт', value: 'PAYOUT' },
];

function normalizeWalletTab(value?: string | string[] | null): WalletTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'transactions' || raw === 'topup' || raw === 'payout' ? raw : 'overview';
}

function normalizeTxFilterParam(value?: string | string[] | null) {
  const raw = Array.isArray(value) ? value[0] : value;
  return TX_FILTERS.some((filter) => filter.value === raw) ? raw ?? undefined : undefined;
}

export default function WalletScreen() {
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ tab?: string; type?: string }>();
  const { user } = useAuth();
  const [tab, setTab] = useState<WalletTab>(() => normalizeWalletTab(params.tab));
  const [txFilter, setTxFilter] = useState<string | undefined>(() => normalizeTxFilterParam(params.type));
  const [txPage, setTxPage] = useState(1);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupMethod, setTopupMethod] = useState<'qpay' | 'socialpay' | 'card'>('qpay');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutBank, setPayoutBank] = useState('');
  const [payoutAccount, setPayoutAccount] = useState('');

  useEffect(() => {
    const nextTab = normalizeWalletTab(params.tab);
    setTab(nextTab);
    setTxFilter(nextTab === 'transactions' ? normalizeTxFilterParam(params.type) : undefined);
    setTxPage(1);
  }, [params.tab, params.type]);

  const replaceWalletRoute = (patch: WalletRoutePatch) => {
    const nextTab = patch.tab ?? tab;
    const nextTxFilter = patch.txFilter ?? txFilter;
    const routeParams: Record<string, string> = {};

    if (nextTab !== 'overview') routeParams.tab = nextTab;
    if (nextTab === 'transactions' && nextTxFilter) routeParams.type = nextTxFilter;

    router.replace(
      Object.keys(routeParams).length
        ? ({ pathname: '/wallet' as any, params: routeParams } as any)
        : ('/wallet' as any),
    );
  };

  const selectTab = (nextTab: WalletTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTab(nextTab);
    if (nextTab !== 'transactions') setTxFilter(undefined);
    setTxPage(1);
    replaceWalletRoute({ tab: nextTab, txFilter: nextTab === 'transactions' ? txFilter : undefined });
  };

  const selectTxFilter = (nextFilter?: string) => {
    setTxFilter(nextFilter);
    setTxPage(1);
    replaceWalletRoute({ tab: 'transactions', txFilter: nextFilter });
  };

  const walletQ = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => unwrap<WalletData>(await WalletAPI.getWallet()),
    enabled: !!user,
  });

  const loyaltyQ = useQuery({
    queryKey: ['loyalty'],
    queryFn: async () => unwrap<LoyaltyData>(await LoyaltyAPI.get()),
    enabled: !!user,
  });

  const txQ = useQuery({
    queryKey: ['wallet-transactions', txPage, txFilter],
    queryFn: async () => unwrap<TransactionData>(await WalletAPI.getTransactions(txPage, txFilter)),
    enabled: !!user && (tab === 'transactions' || tab === 'overview'),
  });

  const topupMut = useMutation({
    mutationFn: (data: { amount: number; method: 'qpay' | 'socialpay' | 'card'; reference: string }) =>
      WalletAPI.topUp(data),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['wallet-transactions'] });
      setTopupAmount('');
      setTab('overview');
      replaceWalletRoute({ tab: 'overview' });
      Alert.alert('Амжилттай', 'Хэтэвч цэнэглэх хүсэлт илгээгдлээ.');
    },
    onError: (e: any) => Alert.alert('Алдаа', e?.message || 'Цэнэглэхэд алдаа гарлаа.'),
  });

  const payoutMut = useMutation({
    mutationFn: (data: { amount: number; bankName: string; bankAccount: string }) =>
      WalletAPI.requestPayout(data),
    onSuccess: (res: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['wallet-transactions'] });
      setPayoutAmount('');
      setPayoutBank('');
      setPayoutAccount('');
      setTab('overview');
      replaceWalletRoute({ tab: 'overview' });
      const body = unwrap<{ message?: string }>(res);
      Alert.alert('Хүсэлт илгээгдлээ', body?.message || '1-3 ажлын өдрийн дотор шалгагдана.');
    },
    onError: (e: any) => Alert.alert('Алдаа', e?.message || 'Хүсэлт илгээхэд алдаа гарлаа.'),
  });

  const wallet = walletQ.data;
  const loyalty = loyaltyQ.data;
  const txList = txQ.data?.transactions ?? wallet?.history ?? [];
  const tier = TIER_META[normalize(loyalty?.tier)] || TIER_META.BRONZE;

  const refreshAll = () => {
    walletQ.refetch();
    loyaltyQ.refetch();
    txQ.refetch();
  };

  const handleTopup = () => {
    const amount = parseMoney(topupAmount);
    if (!amount || amount < 1000) {
      Alert.alert('Алдаа', 'Хамгийн багадаа 1,000₮ цэнэглэнэ.');
      return;
    }
    topupMut.mutate({ amount, method: topupMethod, reference: `APP_${Date.now()}` });
  };

  const handlePayout = () => {
    const amount = parseMoney(payoutAmount);
    if (!amount || amount < 10000) {
      Alert.alert('Алдаа', 'Хамгийн багадаа 10,000₮ гаргана.');
      return;
    }
    if (!payoutBank || !payoutAccount.trim()) {
      Alert.alert('Алдаа', 'Банк болон дансны дугаараа оруулна уу.');
      return;
    }
    Alert.alert('Баталгаажуулах', `${fmt(amount)} - ${payoutBank} ${payoutAccount}`, [
      { text: 'Болих', style: 'cancel' },
      {
        text: 'Тийм',
        onPress: () => payoutMut.mutate({ amount, bankName: payoutBank, bankAccount: payoutAccount }),
      },
    ]);
  };

  if (!user) {
    return (
      <RequireAuthScreen
        title="eSeller хэтэвч"
        subtitle="Хэтэвч, оноо болон гүйлгээний мэдээллээ харахын тулд нэвтэрнэ үү."
        icon="wallet-outline"
        accent={C.primary}
        returnTo="/wallet"
      />
    );
  }

  if (walletQ.isLoading) {
    return (
      <AppScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <AppTopBar eyebrow="Профайл" title="eSeller хэтэвч" showBack={false} />
        <AppCard style={st.centerCard}>
          <ActivityIndicator size="large" color={C.primary} />
        </AppCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={walletQ.isRefetching} onRefresh={refreshAll} tintColor={C.primary} />}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <AppTopBar eyebrow="Профайл" title="eSeller хэтэвч" showBack={false} />
      <AppHeader
        title="eSeller хэтэвч"
        subtitle="Цэнэглэх, гаргах, escrow болон онооны хөдөлгөөнөө нэг дор хянана."
        icon="wallet-outline"
        accent={C.primary}
      />

      <AppCard elevated style={st.balanceCard}>
        <View style={st.balanceHead}>
          <View style={st.balanceIcon}>
            <Ionicons name="wallet-outline" size={23} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.balanceLabel}>Нийт үлдэгдэл</Text>
            <Text style={st.balanceValue}>{fmt(wallet?.balance || 0)}</Text>
          </View>
        </View>
        <View style={st.metricRow}>
          <AppMetricCard label="Escrow" value={fmt(wallet?.escrowHold || 0)} icon="lock-closed-outline" accent={C.seller} />
          <AppMetricCard label="Оноо" value={(loyalty?.balance ?? 0).toLocaleString()} icon={tier.icon} accent={tier.color} />
        </View>
        <View style={st.tierRow}>
          <Ionicons name={tier.icon} size={18} color={tier.color} />
          <Text style={st.tierText}>{tier.label} түвшин</Text>
          <Text style={st.tierMuted}>{(loyalty?.lifetimeEarned ?? 0).toLocaleString()} нийт оноо</Text>
        </View>
      </AppCard>

      <View style={st.actions}>
        <WalletAction label="Цэнэглэх" icon="add-circle-outline" active={tab === 'topup'} onPress={() => selectTab('topup')} />
        <WalletAction label="Гаргах" icon="arrow-up-circle-outline" active={tab === 'payout'} onPress={() => selectTab('payout')} />
        <WalletAction label="Түүх" icon="list-outline" active={tab === 'transactions'} onPress={() => selectTab('transactions')} />
      </View>

      {tab !== 'overview' ? (
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => selectTab('overview')}
          accessibilityRole="button"
          accessibilityLabel="Ерөнхий харагдац руу буцах"
          style={st.backRow}
        >
          <Ionicons name="chevron-back" size={16} color={C.textSub} />
          <Text style={st.backText}>Ерөнхий харагдац руу буцах</Text>
        </TouchableOpacity>
      ) : null}

      {tab === 'overview' ? (
        <Overview txList={txList.slice(0, 5)} setTab={selectTab} txLoading={txQ.isLoading} />
      ) : null}
      {tab === 'transactions' ? (
        <Transactions
          txList={txList}
          txFilter={txFilter}
          setTxFilter={selectTxFilter}
          setTxPage={setTxPage}
          loading={txQ.isLoading}
          canLoadMore={(txQ.data?.totalPages ?? 1) > txPage}
        />
      ) : null}
      {tab === 'topup' ? (
        <TopupForm
          amount={topupAmount}
          method={topupMethod}
          pending={topupMut.isPending}
          setAmount={setTopupAmount}
          setMethod={setTopupMethod}
          onSubmit={handleTopup}
        />
      ) : null}
      {tab === 'payout' ? (
        <PayoutForm
          amount={payoutAmount}
          bank={payoutBank}
          account={payoutAccount}
          pending={payoutMut.isPending}
          setAmount={setPayoutAmount}
          setBank={setPayoutBank}
          setAccount={setPayoutAccount}
          onSubmit={handlePayout}
        />
      ) : null}
    </AppScreen>
  );
}

function WalletAction({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} хэсэг нээх`}
      accessibilityState={{ selected: active }}
      style={[st.action, active && st.actionActive]}
    >
      <Ionicons name={icon} size={20} color={active ? C.primary : C.textSub} />
      <Text style={[st.actionText, active && st.actionTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Overview({
  txList,
  txLoading,
  setTab,
}: {
  txList: WalletHistoryEntry[];
  txLoading: boolean;
  setTab: (tab: WalletTab) => void;
}) {
  return (
    <View style={st.section}>
      <View style={st.sectionHead}>
        <Text style={st.sectionTitle}>Сүүлийн гүйлгээ</Text>
        {txList.length > 0 ? (
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => setTab('transactions')}
            accessibilityRole="button"
            accessibilityLabel="Бүх гүйлгээг харах"
          >
            <Text style={st.linkText}>Бүгдийг харах</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {txLoading ? (
        <AppCard style={st.emptyCard}>
          <ActivityIndicator color={C.primary} />
        </AppCard>
      ) : txList.length === 0 ? (
        <EmptyCard
          icon="card-outline"
          title="Гүйлгээ хараахан алга"
          text="Цэнэглэлт, төлбөр, escrow болон гаргалтын түүх энд харагдана."
        />
      ) : (
        <View style={st.txList}>
          {txList.map((tx, index) => (
            <TxRow key={`${tx.reference ?? tx.createdAt ?? index}`} tx={tx} />
          ))}
        </View>
      )}
    </View>
  );
}

function Transactions({
  txList,
  txFilter,
  setTxFilter,
  setTxPage,
  loading,
  canLoadMore,
}: {
  txList: WalletHistoryEntry[];
  txFilter?: string;
  setTxFilter: (filter?: string) => void;
  setTxPage: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
  canLoadMore: boolean;
}) {
  return (
    <View style={st.section}>
      <Text style={st.sectionTitle}>Гүйлгээний түүх</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterRow}>
        {TX_FILTERS.map((filter) => {
          const active = txFilter === filter.value;
          return (
            <TouchableOpacity
              key={filter.label}
              activeOpacity={0.86}
              onPress={() => {
                setTxFilter(filter.value);
                setTxPage(1);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${filter.label} шүүлтүүр`}
              accessibilityState={{ selected: active }}
              style={[st.chip, active && st.chipActive]}
            >
              <Text style={[st.chipText, active && st.chipTextActive]}>{filter.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <AppCard style={st.emptyCard}>
          <ActivityIndicator color={C.primary} />
        </AppCard>
      ) : txList.length === 0 ? (
        <EmptyCard
          icon="receipt-outline"
          title="Тохирох гүйлгээ алга"
          text="Шүүлтүүрээ өөрчилж эсвэл дараа дахин шалгана уу."
        />
      ) : (
        <View style={st.txList}>
          {txList.map((tx, index) => (
            <TxRow key={`${tx.reference ?? tx.createdAt ?? index}`} tx={tx} />
          ))}
        </View>
      )}

      {canLoadMore ? (
        <AppButton label="Дараагийн хуудас" icon="chevron-forward-outline" variant="secondary" onPress={() => setTxPage((p) => p + 1)} />
      ) : null}
    </View>
  );
}

function TopupForm({
  amount,
  method,
  pending,
  setAmount,
  setMethod,
  onSubmit,
}: {
  amount: string;
  method: 'qpay' | 'socialpay' | 'card';
  pending: boolean;
  setAmount: (amount: string) => void;
  setMethod: (method: 'qpay' | 'socialpay' | 'card') => void;
  onSubmit: () => void;
}) {
  const activeAmount = parseMoney(amount);

  return (
    <AppCard elevated style={st.formCard}>
      <Text style={st.sectionTitle}>Хэтэвч цэнэглэх</Text>
      <Text style={st.sectionSub}>QPay, SocialPay эсвэл картаар хурдан цэнэглэнэ.</Text>

      <View style={st.quickGrid}>
        {QUICK_AMOUNTS.map((item) => {
          const active = activeAmount === item;
          return (
            <TouchableOpacity
              key={item}
              activeOpacity={0.86}
              onPress={() => setAmount(item.toLocaleString())}
              accessibilityRole="button"
              accessibilityLabel={`${fmt(item)} цэнэглэх дүн сонгох`}
              accessibilityState={{ selected: active }}
              style={[st.chip, active && st.chipActive]}
            >
              <Text style={[st.chipText, active && st.chipTextActive]}>{fmt(item)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="Эсвэл гараар дүн оруулах"
        accessibilityLabel="Цэнэглэх дүн"
        placeholderTextColor={C.textMuted}
        keyboardType="numeric"
        style={st.input}
      />

      <Text style={st.fieldLabel}>Төлбөрийн хэрэгсэл</Text>
      <View style={st.methodRow}>
        {TOPUP_METHODS.map((item) => {
          const active = method === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.86}
              onPress={() => setMethod(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} төлбөрийн хэрэгсэл сонгох`}
              accessibilityState={{ selected: active }}
              style={[st.method, active && st.methodActive]}
            >
              <Ionicons name={item.icon} size={21} color={active ? C.primary : C.textSub} />
              <Text style={[st.methodText, active && st.methodTextActive]} numberOfLines={1}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <AppButton label={pending ? 'Цэнэглэж байна...' : 'Цэнэглэх'} icon="add-circle-outline" disabled={pending} onPress={onSubmit} />
    </AppCard>
  );
}

function PayoutForm({
  amount,
  bank,
  account,
  pending,
  setAmount,
  setBank,
  setAccount,
  onSubmit,
}: {
  amount: string;
  bank: string;
  account: string;
  pending: boolean;
  setAmount: (amount: string) => void;
  setBank: (bank: string) => void;
  setAccount: (account: string) => void;
  onSubmit: () => void;
}) {
  return (
    <AppCard elevated style={st.formCard}>
      <Text style={st.sectionTitle}>Мөнгө гаргах</Text>
      <Text style={st.sectionSub}>Хүсэлт 1-3 ажлын өдрийн дотор шалгагдана.</Text>

      <Text style={st.fieldLabel}>Гаргах дүн</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="Хамгийн бага 10,000₮"
        accessibilityLabel="Гаргах дүн"
        placeholderTextColor={C.textMuted}
        keyboardType="numeric"
        style={st.input}
      />

      <Text style={st.fieldLabel}>Банк</Text>
      <View style={st.quickGrid}>
        {BANKS.map((item) => {
          const active = bank === item;
          return (
            <TouchableOpacity
              key={item}
              activeOpacity={0.86}
              onPress={() => setBank(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item} банк сонгох`}
              accessibilityState={{ selected: active }}
              style={[st.chip, active && st.chipActive]}
            >
              <Text style={[st.chipText, active && st.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={st.fieldLabel}>Дансны дугаар</Text>
      <TextInput
        value={account}
        onChangeText={setAccount}
        placeholder="5012345678"
        accessibilityLabel="Дансны дугаар"
        placeholderTextColor={C.textMuted}
        keyboardType="numeric"
        style={st.input}
      />

      <AppButton label={pending ? 'Илгээж байна...' : 'Хүсэлт илгээх'} icon="paper-plane-outline" disabled={pending} onPress={onSubmit} />
    </AppCard>
  );
}

function EmptyCard({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <AppCard style={st.emptyCard}>
      <Ionicons name={icon} size={38} color={C.textMuted} />
      <Text style={st.emptyTitle}>{title}</Text>
      <Text style={st.emptyText}>{text}</Text>
    </AppCard>
  );
}

function TxRow({ tx }: { tx: WalletHistoryEntry }) {
  const amount = tx.amount ?? 0;
  const type = normalize(tx.type);
  const color = txColor(type, amount);
  const stamp = tx.createdAt || tx.date || '';

  return (
    <AppCard style={st.txRow}>
      <View style={[st.txIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={txIcon(type)} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.txTitle} numberOfLines={1}>
          {tx.description || txLabel(type)}
        </Text>
        <Text style={st.txSub}>
          {stamp ? new Date(stamp).toLocaleDateString('mn-MN') : '-'}
          {normalize(tx.status) === 'PENDING' ? ' / Хүлээгдэж байна' : ''}
        </Text>
      </View>
      <Text style={[st.txAmount, { color }]}>
        {amount > 0 ? '+' : ''}
        {fmt(amount)}
      </Text>
    </AppCard>
  );
}

function txIcon(type: string): IconName {
  if (type === 'TOPUP') return 'arrow-down-circle-outline';
  if (type === 'ESCROW_HOLD') return 'hourglass-outline';
  if (type === 'ESCROW_RELEASE') return 'checkmark-circle-outline';
  if (type === 'ESCROW_REFUND') return 'arrow-undo-circle-outline';
  if (type === 'POINTS_REDEEM') return 'star-outline';
  if (type === 'PAYOUT') return 'arrow-up-circle-outline';
  return 'ellipse-outline';
}

function txColor(type: string, amount: number) {
  if (type === 'TOPUP' || type === 'ESCROW_REFUND' || type === 'POINTS_REDEEM') return C.secondary;
  if (type === 'PAYOUT' || type === 'ESCROW_HOLD') return C.error;
  return amount >= 0 ? C.secondary : C.error;
}

function txLabel(type: string) {
  if (type === 'TOPUP') return 'Цэнэглэлт';
  if (type === 'ESCROW_HOLD') return 'Escrow барьцаа';
  if (type === 'ESCROW_RELEASE') return 'Escrow чөлөөлөлт';
  if (type === 'ESCROW_REFUND') return 'Буцаалт';
  if (type === 'POINTS_REDEEM') return 'Оноо мөнгө';
  if (type === 'PAYOUT') return 'Мөнгө гаргалт';
  return 'Гүйлгээ';
}

const st = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    gap: R.md,
    marginBottom: R.md,
  },
  balanceHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
  },
  balanceIcon: {
    width: UI.iconBox,
    height: UI.iconBox,
    borderRadius: UI.controlRadius,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: {
    ...F.small,
    color: C.textSub,
  },
  balanceValue: {
    ...F.h1,
    color: C.text,
    marginTop: 2,
  },
  metricRow: {
    flexDirection: 'row',
    gap: R.sm,
  },
  tierRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
    backgroundColor: C.bgSection,
    borderRadius: UI.controlRadius,
    paddingHorizontal: R.md,
  },
  tierText: {
    ...F.small,
    color: C.text,
    fontWeight: '800',
    flex: 1,
  },
  tierMuted: {
    ...F.tiny,
    color: C.textSub,
  },
  actions: {
    flexDirection: 'row',
    gap: R.sm,
    marginBottom: R.md,
  },
  action: {
    flex: 1,
    minHeight: 60,
    backgroundColor: C.bgCard,
    borderRadius: UI.controlRadius,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: R.xs,
  },
  actionActive: {
    backgroundColor: C.primaryDim,
    borderColor: C.primary,
  },
  actionText: {
    ...F.tiny,
    color: C.textSub,
    fontWeight: '800',
  },
  actionTextActive: {
    color: C.primary,
  },
  backRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.xs,
    marginBottom: R.sm,
  },
  backText: {
    ...F.small,
    color: C.textSub,
    fontWeight: '700',
  },
  section: {
    gap: R.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: R.sm,
  },
  sectionTitle: {
    ...F.h4,
    color: C.text,
  },
  sectionSub: {
    ...F.small,
    color: C.textSub,
    lineHeight: 18,
  },
  linkText: {
    ...F.small,
    color: C.primary,
    fontWeight: '800',
  },
  txList: {
    gap: R.sm,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
    padding: R.md,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: UI.controlRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTitle: {
    ...F.small,
    color: C.text,
    fontWeight: '800',
  },
  txSub: {
    ...F.tiny,
    color: C.textMuted,
    marginTop: 2,
  },
  txAmount: {
    ...F.body,
    fontWeight: '900',
  },
  filterRow: {
    gap: R.sm,
    paddingBottom: R.xs,
  },
  chip: {
    minHeight: 38,
    justifyContent: 'center',
    backgroundColor: C.bgCard,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: R.md,
  },
  chipActive: {
    backgroundColor: C.primaryDim,
    borderColor: C.primary,
  },
  chipText: {
    ...F.small,
    color: C.textSub,
    fontWeight: '800',
  },
  chipTextActive: {
    color: C.primary,
  },
  formCard: {
    gap: R.sm,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: R.sm,
  },
  fieldLabel: {
    ...F.small,
    color: C.textSub,
    fontWeight: '800',
    marginTop: R.xs,
  },
  input: {
    minHeight: 48,
    backgroundColor: C.bgInput,
    borderRadius: UI.controlRadius,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: R.md,
    color: C.text,
    ...F.body,
  },
  methodRow: {
    flexDirection: 'row',
    gap: R.sm,
  },
  method: {
    flex: 1,
    minHeight: 74,
    backgroundColor: C.bgCard,
    borderRadius: UI.controlRadius,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: R.xs,
  },
  methodActive: {
    backgroundColor: C.primaryDim,
    borderColor: C.primary,
  },
  methodText: {
    ...F.tiny,
    color: C.textSub,
    fontWeight: '800',
  },
  methodTextActive: {
    color: C.primary,
  },
  emptyCard: {
    alignItems: 'center',
    gap: R.sm,
  },
  centerCard: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
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
});
