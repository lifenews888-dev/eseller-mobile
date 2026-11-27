import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LoyaltyAPI } from '../../src/services/api';
import { useAuth } from '../../src/store/auth';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppMetricCard, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';
import { RequireAuthScreen } from '../../src/shared/ui/RequireAuthScreen';

type IconName = keyof typeof Ionicons.glyphMap;

type LoyaltyData = {
  balance?: number;
  lifetimeEarned?: number;
  lifetimeSpent?: number;
  tier?: string;
};

type Tier = {
  key: string;
  icon: IconName;
  color: string;
  label: string;
  min: number;
  benefits: string[];
};

const POINT_VALUE = 5;

// Вэбийн LOYALTY_CONFIG-тэй ижил (босго, онооны үржүүлэгч). 100₮ тутамд 1 үндсэн оноо.
const TIERS: Tier[] = [
  {
    key: 'BRONZE',
    icon: 'ribbon-outline',
    color: C.seller,
    label: 'Хүрэл',
    min: 0,
    benefits: ['100₮ тутамд 1 оноо', 'Оноогоо мөнгө болгон хэтэвчиндээ шилжүүлэх'],
  },
  {
    key: 'SILVER',
    icon: 'shield-outline',
    color: C.textSub,
    label: 'Мөнгө',
    min: 5000,
    benefits: ['Оноо 1.2 дахин', 'Оноогоо мөнгө болгон хэтэвчиндээ шилжүүлэх'],
  },
  {
    key: 'GOLD',
    icon: 'star-outline',
    color: C.gold,
    label: 'Алт',
    min: 20000,
    benefits: ['Оноо 1.5 дахин', 'Оноогоо мөнгө болгон хэтэвчиндээ шилжүүлэх'],
  },
  {
    key: 'PLATINUM',
    icon: 'diamond-outline',
    color: C.primary,
    label: 'Платинум',
    min: 50000,
    benefits: ['Оноо 2 дахин', 'Оноогоо мөнгө болгон хэтэвчиндээ шилжүүлэх'],
  },
];

const REDEEM_OPTIONS = [
  { points: 500, cash: 2500 },
  { points: 1000, cash: 5000 },
  { points: 2000, cash: 10000 },
  { points: 5000, cash: 25000 },
];

function unwrap<T = unknown>(res: any): T {
  return (res?.data ?? res) as T;
}

const fmtMoney = (n: number) => `${(n ?? 0).toLocaleString()}₮`;
const parsePoints = (value: string) => parseInt((value || '').replace(/[,\s]/g, ''), 10);
const normalizeTier = (value?: string) => (value ?? 'BRONZE').toLocaleUpperCase();

export default function TierDetailsScreen() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [customPoints, setCustomPoints] = useState('');

  const loyaltyQ = useQuery({
    queryKey: ['loyalty', user?.id || user?._id],
    queryFn: async () => unwrap<LoyaltyData>(await LoyaltyAPI.get(String(user?.id || user?._id))),
    enabled: !!user && !!(user.id || user._id),
  });

  const redeemMut = useMutation({
    mutationFn: (points: number) => LoyaltyAPI.redeemForCash(points),
    onSuccess: (res: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      qc.invalidateQueries({ queryKey: ['loyalty'] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['wallet-transactions'] });
      const body = unwrap<{ message?: string; cashAdded?: number }>(res);
      setCustomPoints('');
      Alert.alert(
        'Амжилттай',
        body?.message || `${fmtMoney(body?.cashAdded ?? 0)} хэтэвчинд нэмэгдлээ.`,
      );
    },
    onError: (e: any) => Alert.alert('Алдаа', e?.message || 'Оноо хөрвүүлэхэд алдаа гарлаа.'),
  });

  const data = loyaltyQ.data;
  const balance = data?.balance ?? 0;
  const lifetime = data?.lifetimeEarned ?? balance;
  const currentTier = normalizeTier(data?.tier);
  const currentIdx = Math.max(0, TIERS.findIndex((tier) => tier.key === currentTier));
  const current = TIERS[currentIdx] ?? TIERS[0];
  const next = currentIdx < TIERS.length - 1 ? TIERS[currentIdx + 1] : null;
  const progressPct = next
    ? Math.max(0, Math.min(100, ((lifetime - current.min) / (next.min - current.min)) * 100))
    : 100;
  const pointsToNext = next ? Math.max(0, next.min - lifetime) : 0;
  const customAmount = parsePoints(customPoints);
  const hasCustomAmount = Number.isFinite(customAmount) && customAmount > 0;
  const customCash = hasCustomAmount ? customAmount * POINT_VALUE : 0;

  const handleRedeem = (points: number) => {
    if (!Number.isFinite(points) || points <= 0) {
      Alert.alert('Алдаа', 'Оноо тоон утга байх ёстой.');
      return;
    }
    if (points < 500) {
      Alert.alert('Алдаа', 'Хамгийн багадаа 500 оноо хөрвүүлнэ.');
      return;
    }
    if (points % 100 !== 0) {
      Alert.alert('Алдаа', 'Оноог 100-ын үржвэрээр оруулна уу.');
      return;
    }
    if (points > balance) {
      Alert.alert('Алдаа', `Оноо хүрэлцэхгүй. Танд ${balance.toLocaleString()} оноо байна.`);
      return;
    }

    const cash = points * POINT_VALUE;
    Alert.alert(
      'Баталгаажуулах',
      `${points.toLocaleString()} оноо хэтэвчинд ${fmtMoney(cash)} болж нэмэгдэнэ.`,
      [
        { text: 'Болих', style: 'cancel' },
        { text: 'Тийм', onPress: () => redeemMut.mutate(points) },
      ],
    );
  };

  if (!user) {
    return (
      <RequireAuthScreen
        title="Урамшууллын түвшин"
        subtitle="Оноо, түвшин болон урамшууллаа харахын тулд нэвтэрнэ үү."
        icon="trophy-outline"
        accent={C.gold}
        returnTo="/tier-details"
      />
    );
  }

  if (loyaltyQ.isLoading) {
    return (
      <AppScreen>
        <Stack.Screen options={{ headerShown: false }} />
        <AppTopBar eyebrow="Профайл" title="Урамшууллын түвшин" showBack={false} />
        <AppCard style={st.centerCard}>
          <ActivityIndicator size="large" color={C.gold} />
        </AppCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ headerShown: false }} />
      <AppTopBar eyebrow="Профайл" title="Урамшууллын түвшин" showBack={false} />
      <AppHeader
        title="Урамшууллын түвшин"
        subtitle="Оноо, түвшин болон хэтэвчинд хөрвүүлэх боломжоо хяна."
        icon="trophy-outline"
        accent={C.gold}
      />

      <AppCard elevated style={st.summary}>
        <View style={st.summaryHead}>
          <View style={[st.tierIcon, { backgroundColor: current.color + '18' }]}>
            <Ionicons name={current.icon} size={23} color={current.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.summaryLabel}>Одоогийн түвшин</Text>
            <Text style={st.summaryTitle}>{current.label}</Text>
          </View>
          <View style={[st.levelBadge, { backgroundColor: current.color + '18' }]}>
            <Text style={[st.levelBadgeText, { color: current.color }]}>Одоогийн</Text>
          </View>
        </View>

        <View style={st.metricRow}>
          <AppMetricCard label="Одоогийн оноо" value={balance.toLocaleString()} icon="star-outline" accent={C.gold} />
          <AppMetricCard label="Нийт цуглуулсан" value={lifetime.toLocaleString()} icon="sparkles-outline" accent={C.secondary} />
        </View>

        <View style={st.progressBlock}>
          <View style={st.progressHead}>
            <Text style={st.progressLabel}>{next ? `${next.label} хүртэл` : 'Дээд түвшин'}</Text>
            <Text style={st.progressLabel}>{Math.round(progressPct)}%</Text>
          </View>
          <View style={st.progressTrack}>
            <View style={[st.progressFill, { width: `${progressPct}%`, backgroundColor: current.color }]} />
          </View>
          <Text style={st.progressText}>
            {next
              ? `${pointsToNext.toLocaleString()} оноо нэмбэл дараагийн түвшинд хүрнэ.`
              : 'Та хамгийн дээд түвшинд хүрсэн байна.'}
          </Text>
        </View>
      </AppCard>

      <AppCard elevated style={st.section}>
        <View style={st.sectionHead}>
          <View style={st.sectionIcon}>
            <Ionicons name="wallet-outline" size={21} color={C.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.sectionTitle}>Оноо мөнгө болгох</Text>
            <Text style={st.sectionSub}>1 оноо = {POINT_VALUE}₮. Хамгийн багадаа 500 оноо хөрвүүлнэ.</Text>
          </View>
        </View>

        <View style={st.quickGrid}>
          {REDEEM_OPTIONS.map((option) => {
            const disabled = option.points > balance || redeemMut.isPending;
            return (
              <TouchableOpacity
                key={option.points}
                activeOpacity={0.86}
                disabled={disabled}
                onPress={() => handleRedeem(option.points)}
                style={[st.redeemOption, disabled && st.disabled]}
              >
                <Text style={st.redeemPoints}>{option.points.toLocaleString()} оноо</Text>
                <View style={st.redeemCashRow}>
                  <Ionicons name="arrow-forward" size={12} color={C.textMuted} />
                  <Text style={st.redeemCash}>{fmtMoney(option.cash)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={st.fieldLabel}>Гараар оруулах</Text>
        <View style={st.converter}>
          <TextInput
            value={customPoints}
            onChangeText={setCustomPoints}
            placeholder="500"
            placeholderTextColor={C.textMuted}
            keyboardType="numeric"
            style={[st.input, { flex: 1 }]}
          />
          <Ionicons name="arrow-forward" size={16} color={C.textMuted} />
          <View style={[st.input, st.cashPreview]}>
            <Text style={[st.cashPreviewText, customCash > 0 && { color: C.secondary }]}>
              {fmtMoney(customCash)}
            </Text>
          </View>
        </View>

        <AppButton
          label={redeemMut.isPending ? 'Хөрвүүлж байна...' : 'Хэтэвчинд шилжүүлэх'}
          icon="wallet-outline"
          disabled={!hasCustomAmount || redeemMut.isPending}
          variant="success"
          onPress={() => handleRedeem(customAmount)}
        />
      </AppCard>

      <View style={st.section}>
        <Text style={st.sectionTitle}>Бүх түвшин</Text>
        {TIERS.map((tier) => (
          <TierCard
            key={tier.key}
            tier={tier}
            current={current.key === tier.key}
            locked={lifetime < tier.min}
          />
        ))}
      </View>
    </AppScreen>
  );
}

function TierCard({ tier, current, locked }: { tier: Tier; current: boolean; locked: boolean }) {
  return (
    <AppCard style={[st.tierCard, current && { borderColor: tier.color }]}>
      <View style={st.tierRow}>
        <View style={[st.tierIcon, { backgroundColor: tier.color + '18' }]}>
          <Ionicons name={tier.icon} size={22} color={locked ? C.textMuted : tier.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={st.tierTitleRow}>
            <Text style={[st.tierName, locked && { color: C.textMuted }]}>{tier.label}</Text>
            {current ? (
              <View style={[st.levelBadge, { backgroundColor: tier.color + '18' }]}>
                <Text style={[st.levelBadgeText, { color: tier.color }]}>Одоогийн</Text>
              </View>
            ) : null}
          </View>
          <Text style={st.tierMin}>{tier.min.toLocaleString()}+ оноо</Text>
        </View>
        {locked ? <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} /> : null}
      </View>

      <View style={st.benefits}>
        {tier.benefits.map((benefit) => (
          <View key={benefit} style={st.benefitRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color={locked ? C.textMuted : tier.color} />
            <Text style={[st.benefitText, locked && { color: C.textMuted }]}>{benefit}</Text>
          </View>
        ))}
      </View>
    </AppCard>
  );
}

const st = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCard: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    gap: R.md,
    marginBottom: R.md,
  },
  summaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
  },
  tierIcon: {
    width: UI.iconBox,
    height: UI.iconBox,
    borderRadius: UI.controlRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    ...F.small,
    color: C.textSub,
  },
  summaryTitle: {
    ...F.h2,
    color: C.text,
    marginTop: 2,
  },
  levelBadge: {
    borderRadius: R.full,
    paddingHorizontal: R.sm,
    paddingVertical: 4,
  },
  levelBadgeText: {
    ...F.tiny,
    fontWeight: '900',
  },
  metricRow: {
    flexDirection: 'row',
    gap: R.sm,
  },
  progressBlock: {
    gap: R.xs,
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: R.sm,
  },
  progressLabel: {
    ...F.tiny,
    color: C.textSub,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    backgroundColor: C.bgSection,
    borderRadius: R.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: R.full,
  },
  progressText: {
    ...F.tiny,
    color: C.textSub,
    lineHeight: 16,
  },
  section: {
    gap: R.sm,
    marginBottom: R.md,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
  },
  sectionIcon: {
    width: UI.iconBox,
    height: UI.iconBox,
    borderRadius: UI.controlRadius,
    backgroundColor: C.secondaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...F.h4,
    color: C.text,
  },
  sectionSub: {
    ...F.small,
    color: C.textSub,
    lineHeight: 18,
    marginTop: 3,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: R.sm,
  },
  redeemOption: {
    width: '48%',
    minHeight: 66,
    backgroundColor: C.bgSection,
    borderRadius: UI.controlRadius,
    borderWidth: 1,
    borderColor: C.border,
    padding: R.md,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.42,
  },
  redeemPoints: {
    ...F.small,
    color: C.text,
    fontWeight: '800',
  },
  redeemCashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.xs,
    marginTop: 4,
  },
  redeemCash: {
    ...F.tiny,
    color: C.secondary,
    fontWeight: '900',
  },
  fieldLabel: {
    ...F.small,
    color: C.textSub,
    fontWeight: '800',
    marginTop: R.xs,
  },
  converter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
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
  cashPreview: {
    flex: 1,
    justifyContent: 'center',
  },
  cashPreviewText: {
    ...F.body,
    color: C.textMuted,
    fontWeight: '800',
  },
  tierCard: {
    gap: R.sm,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
  },
  tierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
    flexWrap: 'wrap',
  },
  tierName: {
    ...F.h4,
    color: C.text,
  },
  tierMin: {
    ...F.tiny,
    color: C.textMuted,
    marginTop: 2,
  },
  benefits: {
    gap: R.xs,
    paddingLeft: UI.iconBox + R.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
  },
  benefitText: {
    ...F.small,
    color: C.textSub,
    flex: 1,
  },
});
