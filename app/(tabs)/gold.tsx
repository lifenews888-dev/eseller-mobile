import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppMetricCard, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

type IconName = keyof typeof Ionicons.glyphMap;
type PlanId = 'monthly' | 'quarterly' | 'annual';

type Benefit = {
  icon: IconName;
  title: string;
  text: string;
};

type Plan = {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  sub: string;
  badge?: string;
  featured?: boolean;
  features: string[];
};

const BENEFITS: Benefit[] = [
  {
    icon: 'car-outline',
    title: 'Үнэгүй хүргэлт',
    text: 'Сонгосон захиалгуудад хүргэлтийн төлбөргүй.',
  },
  {
    icon: 'star-outline',
    title: 'Оноо 2x',
    text: 'Худалдан авалт бүрд илүү хурдан оноо цуглуулна.',
  },
  {
    icon: 'flash-outline',
    title: 'Flash sale эрт',
    text: 'Хямдрал эхлэхээс өмнө түрүүлж нэвтрэх эрх.',
  },
  {
    icon: 'pricetag-outline',
    title: 'Нэмэлт хямдрал',
    text: 'Сонгосон бүтээгдэхүүнд 5-10% нэмэлт хөнгөлөлт.',
  },
  {
    icon: 'gift-outline',
    title: 'Сарын бонус',
    text: 'Сар бүр 500 бонус оноо автоматаар нэмэгдэнэ.',
  },
  {
    icon: 'return-up-back-outline',
    title: 'Үнэгүй буцаалт',
    text: 'Жилд эхний 3 буцаалтын хүргэлт үнэгүй.',
  },
  {
    icon: 'headset-outline',
    title: 'Тусгай дэмжлэг',
    text: 'Gold гишүүдэд зориулсан тусгай дэмжлэгийн суваг.',
  },
  {
    icon: 'sparkles-outline',
    title: 'Төрсөн өдрийн бонус',
    text: 'Тусгай урамшуулал болон бонус оноо.',
  },
];

const PLANS: Plan[] = [
  {
    id: 'monthly',
    name: 'Сарын',
    price: '19,900₮',
    period: '/ сар',
    sub: 'Сард 19,900₮',
    features: ['Үнэгүй хүргэлт', 'Оноо 2x', 'Flash sale эрт нэвтрэх', 'Тусгай хямдрал'],
  },
  {
    id: 'quarterly',
    name: 'Улирлын',
    price: '49,900₮',
    period: '/ 3 сар',
    sub: 'Сард 16,633₮',
    badge: 'Түгээмэл',
    features: ['Бүх сарын давуу тал', 'Сар бүр 500 бонус оноо', 'Үнэгүй буцаалт', 'Тусгай дэмжлэг'],
  },
  {
    id: 'annual',
    name: 'Жилийн',
    price: '149,900₮',
    period: '/ жил',
    sub: 'Сард 12,492₮',
    badge: 'Хамгийн ашигтай',
    featured: true,
    features: ['Бүх улирлын давуу тал', 'Төрсөн өдрийн бонус', '10% нэмэлт хямдрал', 'VIP дэмжлэг 24/7'],
  },
];

const FAQ = [
  {
    q: 'Gold гишүүнчлэл гэж юу вэ?',
    a: 'Үнэгүй хүргэлт, 2x оноо, эрт хямдрал болон нэмэлт урамшуулалтай давуу эрхийн гишүүнчлэл.',
  },
  {
    q: 'Туршилтын хугацаанд цуцалж болох уу?',
    a: '30 хоногийн үнэгүй туршилтын хугацаанд хүссэн үедээ цуцлах боломжтой.',
  },
  {
    q: 'Оноо хэрхэн ашиглах вэ?',
    a: 'Цуглуулсан оноогоо хэтэвч рүү хөрвүүлэх эсвэл дараагийн худалдан авалтад ашиглах боломжтой.',
  },
  {
    q: 'Автомат сунгалт хэрхэн ажилладаг вэ?',
    a: 'Сонгосон төлөвлөгөөний хугацаа дуусахад идэвхтэй төлбөрийн хэрэгслээр сунгагдана.',
  },
  {
    q: 'Gold гишүүнчлэлээ хэрхэн цуцлах вэ?',
    a: 'Профайл болон дэмжлэгийн сувгаар гишүүнчлэлээ цуцлуулах хүсэлт илгээж болно.',
  },
];

function fmt(amount: number) {
  return `${Math.round(amount).toLocaleString()}₮`;
}

export default function GoldScreen() {
  const [orders, setOrders] = useState(4);
  const [avgOrder, setAvgOrder] = useState(50000);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const savings = useMemo(() => {
    const yearlySpend = orders * avgOrder * 12;
    const delivery = orders * 12 * 3500;
    const points = yearlySpend * 0.05;
    const discounts = yearlySpend * 0.0025;
    return {
      delivery,
      points,
      discounts,
      total: delivery + points + discounts,
    };
  }, [orders, avgOrder]);

  function startPlan(planId: PlanId) {
    router.push({ pathname: '/contact', params: { type: 'gold', plan: planId } } as any);
  }

  return (
    <AppScreen>
      <AppTopBar eyebrow="Профайл" title="Gold" showBack={false} />
      <AppHeader
        title="eSeller Gold"
        subtitle="Илүү хурдан хүргэлт, илүү их оноо, тусгай хямдралтай гишүүнчлэл."
        icon="star-outline"
        accent={C.gold}
      />

      <AppCard elevated style={st.hero}>
        <View style={st.heroTop}>
          <View style={st.goldIcon}>
            <Ionicons name="star" size={24} color={C.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.heroEyebrow}>Gold membership</Text>
            <Text style={st.heroTitle}>Жил бүр 200,000₮+ хэмнэх боломж</Text>
          </View>
        </View>
        <Text style={st.heroText}>
          30 хоногийн үнэгүй туршилтаар эхэлж, худалдан авалт бүрээс илүү үнэ цэн авна.
        </Text>
        <View style={st.heroMetrics}>
          <AppMetricCard label="Үнэгүй туршилт" value="30 хоног" icon="calendar-outline" accent={C.gold} />
          <AppMetricCard label="Бонус оноо" value="2x" icon="sparkles-outline" accent={C.secondary} />
        </View>
        <AppButton
          label="Үнэгүй турших"
          icon="arrow-forward"
          accessibilityHint="Gold гишүүнчлэлийн хүсэлт илгээх дэлгэц нээнэ"
          onPress={() => startPlan('monthly')}
          variant="secondary"
        />
      </AppCard>

      <SectionTitle
        title="Gold давуу талууд"
        subtitle="Гишүүн болсноор өдөр тутмын худалдан авалт илүү өгөөжтэй болно."
      />
      <View style={st.benefitGrid}>
        {BENEFITS.map((item) => (
          <BenefitCard key={item.title} item={item} />
        ))}
      </View>

      <SectionTitle
        title="Төлөвлөгөө сонгох"
        subtitle="Бүх төлөвлөгөөнд 30 хоногийн үнэгүй туршилт багтана."
      />
      <View style={st.planList}>
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onSelect={startPlan} />
        ))}
      </View>

      <SectionTitle
        title="Хэмнэлтийн тооцоолуур"
        subtitle="Gold гишүүн болсноор хэр хэмнэхээ ойролцоогоор тооцоол."
      />
      <AppCard elevated style={st.calculator}>
        <Stepper
          label="Сарын захиалгын тоо"
          value={orders}
          min={1}
          max={20}
          step={1}
          onChange={setOrders}
        />
        <Stepper
          label="Дундаж захиалгын дүн"
          value={avgOrder}
          min={10000}
          max={200000}
          step={10000}
          format={fmt}
          onChange={setAvgOrder}
        />
        <AppCard style={st.savingBox}>
          <Text style={st.savingLabel}>Жилийн хэмнэлт</Text>
          <Text style={st.savingTotal}>{fmt(savings.total)}</Text>
          <View style={st.savingRows}>
            <SavingRow label="Хүргэлт хэмнэлт" value={savings.delivery} />
            <SavingRow label="Бонус оноо" value={savings.points} />
            <SavingRow label="Тусгай хямдрал" value={savings.discounts} />
          </View>
        </AppCard>
      </AppCard>

      <SectionTitle title="Түгээмэл асуултууд" />
      <View style={st.faqList}>
        {FAQ.map((item, index) => {
          const expanded = openFaq === index;
          return (
            <TouchableOpacity
              key={item.q}
              activeOpacity={0.86}
              accessibilityRole="button"
              accessibilityLabel={`${item.q} ${expanded ? 'хаах' : 'нээх'}`}
              accessibilityState={{ expanded }}
              onPress={() => setOpenFaq(expanded ? null : index)}
            >
              <AppCard style={st.faqCard}>
                <View style={st.faqHead}>
                  <Text style={st.faqQuestion}>{item.q}</Text>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
                </View>
                {expanded ? <Text style={st.faqAnswer}>{item.a}</Text> : null}
              </AppCard>
            </TouchableOpacity>
          );
        })}
      </View>
    </AppScreen>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={st.sectionTitleWrap}>
      <Text style={st.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={st.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function BenefitCard({ item }: { item: Benefit }) {
  return (
    <AppCard style={st.benefitCard}>
      <View style={st.benefitIcon}>
        <Ionicons name={item.icon} size={18} color={C.gold} />
      </View>
      <Text style={st.benefitTitle}>{item.title}</Text>
      <Text style={st.benefitText}>{item.text}</Text>
    </AppCard>
  );
}

function PlanCard({ plan, onSelect }: { plan: Plan; onSelect: (planId: PlanId) => void }) {
  return (
    <AppCard elevated={!!plan.featured} style={[st.planCard, plan.featured && st.planFeatured]}>
      <View style={st.planHead}>
        <View style={{ flex: 1 }}>
          <Text style={st.planName}>{plan.name}</Text>
          <View style={st.priceRow}>
            <Text style={st.planPrice}>{plan.price}</Text>
            <Text style={st.planPeriod}>{plan.period}</Text>
          </View>
          <Text style={st.planSub}>{plan.sub}</Text>
        </View>
        {plan.badge ? (
          <View style={st.planBadge}>
            <Text style={st.planBadgeText}>{plan.badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={st.featureList}>
        {plan.features.map((feature) => (
          <View key={feature} style={st.featureRow}>
            <Ionicons name="checkmark-circle-outline" size={17} color={C.gold} />
            <Text style={st.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => onSelect(plan.id)}
        accessibilityRole="button"
        accessibilityLabel={`${plan.name} Gold төлөвлөгөө сонгох`}
        accessibilityHint="Gold гишүүнчлэлийн хүсэлт илгээх дэлгэц нээнэ"
        style={[st.goldButton, !plan.featured && st.goldButtonGhost]}
      >
        <Text style={[st.goldButtonText, !plan.featured && st.goldButtonGhostText]}>Сонгох</Text>
        <Ionicons name="arrow-forward" size={16} color={plan.featured ? C.text : C.gold} />
      </TouchableOpacity>
    </AppCard>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (n: number) => String(n),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <View>
      <Text style={st.stepperLabel}>{label}</Text>
      <View style={st.stepperRow}>
        <TouchableOpacity
          activeOpacity={0.86}
          disabled={!canDecrease}
          onPress={() => onChange(Math.max(min, value - step))}
          accessibilityRole="button"
          accessibilityLabel={`${label} багасгах`}
          accessibilityState={{ disabled: !canDecrease }}
          style={[st.stepButton, !canDecrease ? st.stepButtonDisabled : null]}
        >
          <Ionicons name="remove" size={18} color={canDecrease ? C.text : C.textMuted} />
        </TouchableOpacity>
        <View style={st.stepValue} accessible accessibilityRole="text" accessibilityLabel={`${label}: ${format(value)}`}>
          <Text style={st.stepValueText}>{format(value)}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.86}
          disabled={!canIncrease}
          onPress={() => onChange(Math.min(max, value + step))}
          accessibilityRole="button"
          accessibilityLabel={`${label} нэмэх`}
          accessibilityState={{ disabled: !canIncrease }}
          style={[st.stepButton, st.stepButtonGold, !canIncrease ? st.stepButtonDisabled : null]}
        >
          <Ionicons name="add" size={18} color={canIncrease ? C.text : C.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SavingRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={st.savingRow}>
      <Text style={st.savingRowLabel}>{label}</Text>
      <Text style={st.savingRowValue}>{fmt(value)}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  hero: {
    gap: R.md,
    marginBottom: R.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
  },
  goldIcon: {
    width: UI.iconBox,
    height: UI.iconBox,
    borderRadius: UI.controlRadius,
    backgroundColor: C.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    ...F.tiny,
    color: C.gold,
    fontWeight: '900',
  },
  heroTitle: {
    ...F.h2,
    color: C.text,
    marginTop: 2,
  },
  heroText: {
    ...F.small,
    color: C.textSub,
    lineHeight: 19,
  },
  heroMetrics: {
    flexDirection: 'row',
    gap: R.sm,
  },
  sectionTitleWrap: {
    marginTop: R.lg,
    marginBottom: R.sm,
  },
  sectionTitle: {
    ...F.h3,
    color: C.text,
  },
  sectionSubtitle: {
    ...F.small,
    color: C.textSub,
    lineHeight: 18,
    marginTop: 3,
  },
  benefitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: R.sm,
  },
  benefitCard: {
    width: '48%',
    minHeight: 144,
    padding: R.md,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: R.sm,
    backgroundColor: C.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: R.sm,
  },
  benefitTitle: {
    ...F.small,
    color: C.text,
    fontWeight: '800',
  },
  benefitText: {
    ...F.tiny,
    color: C.textSub,
    lineHeight: 16,
    marginTop: 4,
  },
  planList: {
    gap: R.sm,
  },
  planCard: {
    gap: R.md,
  },
  planFeatured: {
    borderColor: C.gold,
  },
  planHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: R.sm,
  },
  planName: {
    ...F.small,
    color: C.gold,
    fontWeight: '900',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: R.xs,
  },
  planPrice: {
    ...F.h1,
    color: C.text,
  },
  planPeriod: {
    ...F.small,
    color: C.textSub,
    marginLeft: R.xs,
  },
  planSub: {
    ...F.tiny,
    color: C.textSub,
    marginTop: 2,
  },
  planBadge: {
    borderRadius: R.full,
    backgroundColor: C.goldDim,
    paddingHorizontal: R.sm,
    paddingVertical: 4,
  },
  planBadgeText: {
    ...F.tiny,
    color: C.gold,
    fontWeight: '900',
  },
  featureList: {
    gap: R.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
  },
  featureText: {
    ...F.small,
    color: C.textSub,
    flex: 1,
  },
  goldButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: R.xs,
    backgroundColor: C.gold,
    borderRadius: UI.controlRadius,
    paddingHorizontal: R.md,
  },
  goldButtonGhost: {
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: C.gold + '30',
  },
  goldButtonText: {
    ...F.small,
    color: C.text,
    fontWeight: '900',
  },
  goldButtonGhostText: {
    color: C.gold,
  },
  calculator: {
    gap: R.md,
  },
  stepperLabel: {
    ...F.small,
    color: C.textSub,
    fontWeight: '800',
    marginBottom: R.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
  },
  stepButton: {
    width: 42,
    height: 42,
    borderRadius: UI.controlRadius,
    backgroundColor: C.bgSection,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonGold: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },
  stepButtonDisabled: {
    opacity: 0.55,
  },
  stepValue: {
    flex: 1,
    minHeight: 42,
    borderRadius: UI.controlRadius,
    backgroundColor: C.bgSection,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValueText: {
    ...F.body,
    color: C.text,
    fontWeight: '900',
  },
  savingBox: {
    backgroundColor: C.goldDim,
    borderColor: C.gold + '30',
  },
  savingLabel: {
    ...F.small,
    color: C.textSub,
  },
  savingTotal: {
    ...F.h1,
    color: C.gold,
    marginTop: 2,
  },
  savingRows: {
    gap: R.xs,
    marginTop: R.sm,
  },
  savingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: R.md,
  },
  savingRowLabel: {
    ...F.small,
    color: C.textSub,
    flex: 1,
  },
  savingRowValue: {
    ...F.small,
    color: C.text,
    fontWeight: '800',
  },
  faqList: {
    gap: R.sm,
  },
  faqCard: {
    padding: R.md,
  },
  faqHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
  },
  faqQuestion: {
    ...F.body,
    color: C.text,
    fontWeight: '800',
    flex: 1,
  },
  faqAnswer: {
    ...F.small,
    color: C.textSub,
    lineHeight: 20,
    marginTop: R.sm,
  },
});
