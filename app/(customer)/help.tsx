import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

type FaqItem = {
  q: string;
  a: string;
};

type FaqGroup = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: FaqItem[];
};

const FAQ_GROUPS: FaqGroup[] = [
  {
    id: 'orders',
    label: 'Захиалга',
    icon: 'receipt-outline',
    items: [
      {
        q: 'Захиалга хэрхэн хийх вэ?',
        a: 'Бараагаа сонгоод сагсанд нэмнэ. Хаяг, төлбөрийн мэдээллээ баталгаажуулсны дараа захиалга үүснэ.',
      },
      {
        q: 'Захиалгаа хэрхэн хянах вэ?',
        a: 'Профайл эсвэл хүргэлт хэсгээс захиалгын кодоор төлөвөө шалгана.',
      },
      {
        q: 'Захиалгаа цуцалж болох уу?',
        a: 'Төлбөр баталгаажаагүй эсвэл хүргэлтэд гараагүй үед дэмжлэгийн багтай холбогдон цуцлуулах боломжтой.',
      },
    ],
  },
  {
    id: 'payments',
    label: 'Төлбөр',
    icon: 'card-outline',
    items: [
      {
        q: 'Ямар төлбөрийн арга ашиглаж болох вэ?',
        a: 'QPay, SocialPay болон платформын дэмждэг бусад цахим төлбөрийн сувгаар төлөх боломжтой.',
      },
      {
        q: 'Төлбөр амжилтгүй болвол яах вэ?',
        a: 'Төлбөр баталгаажаагүй бол захиалга автоматаар цуцлагдана. Данснаас мөнгө хасагдсан бол баримтаа дэмжлэг рүү илгээнэ үү.',
      },
    ],
  },
  {
    id: 'delivery',
    label: 'Хүргэлт',
    icon: 'car-outline',
    items: [
      {
        q: 'Хүргэлт хэдэн хоногт ирэх вэ?',
        a: 'Улаанбаатар хотод ихэвчлэн 1-3 өдөр, орон нутагт 3-7 өдөрт хүргэнэ.',
      },
      {
        q: 'Хүргэлтийн кодоо хаанаас харах вэ?',
        a: 'Захиалгын дэлгэрэнгүй болон хүргэлт хэсэгт хяналтын код, төлөв харагдана.',
      },
    ],
  },
  {
    id: 'store',
    label: 'Дэлгүүр',
    icon: 'storefront-outline',
    items: [
      {
        q: 'Дэлгүүр хэрхэн нээх вэ?',
        a: 'Дэлгүүр нээх хуудсаар хүсэлтээ илгээж, мэдээллээ баталгаажуулсны дараа бараагаа байршуулна.',
      },
      {
        q: 'Бараа нэмэхэд юу хэрэгтэй вэ?',
        a: 'Нэр, үнэ, зураг, тайлбар, үлдэгдэл болон ангиллын мэдээллээ бүрэн оруулах шаардлагатай.',
      },
    ],
  },
  {
    id: 'seller',
    label: 'Борлуулагч',
    icon: 'megaphone-outline',
    items: [
      {
        q: 'Борлуулагч хэрхэн орлого олох вэ?',
        a: 'Referral холбоосоор борлуулалт үүсгэж, баталгаажсан захиалга бүрээс комисс авна.',
      },
      {
        q: 'Комисс хэзээ ордог вэ?',
        a: 'Захиалга амжилттай хүргэгдэж баталгаажсаны дараа комиссын дүн тооцогдоно.',
      },
    ],
  },
];

function normalizeGroupParam(value?: string | string[] | null) {
  if (typeof value !== 'string') return FAQ_GROUPS[0].id;
  return FAQ_GROUPS.some((item) => item.id === value) ? value : FAQ_GROUPS[0].id;
}

export default function HelpScreen() {
  const params = useLocalSearchParams<{ group?: string }>();
  const layout = useAppLayoutMetrics();
  const [activeGroup, setActiveGroup] = useState(() => normalizeGroupParam(params.group));
  const [open, setOpen] = useState<number | null>(0);
  const group = FAQ_GROUPS.find((item) => item.id === activeGroup) ?? FAQ_GROUPS[0];

  useEffect(() => {
    setActiveGroup(normalizeGroupParam(params.group));
    setOpen(0);
  }, [params.group]);

  function selectGroup(id: string) {
    setActiveGroup(id);
    setOpen(0);
    router.replace(
      id === FAQ_GROUPS[0].id
        ? ('/help' as any)
        : ({ pathname: '/help' as any, params: { group: id } } as any),
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <AppScreen contentContainerStyle={{ paddingBottom: layout.screenBottom + 96 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <AppTopBar eyebrow="Дэмжлэг" title="Тусламж" showBack={false} />
        <AppHeader
          title="Тусламж, түгээмэл асуулт"
          subtitle="Захиалга, төлбөр, хүргэлт болон борлуулалтын түгээмэл асуултууд."
          icon="help-circle-outline"
          accent={C.primary}
        />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={st.chips}
      >
        {FAQ_GROUPS.map((item) => {
          const active = activeGroup === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.86}
              onPress={() => selectGroup(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} асуултын ангилал`}
              accessibilityState={{ selected: active }}
              style={[st.chip, active && st.chipActive]}
            >
              <Ionicons name={item.icon} size={16} color={active ? C.bgCard : C.textSub} />
              <Text style={[st.chipText, active && st.chipTextActive]} numberOfLines={1}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={st.list}>
        {group.items.map((item, index) => {
          const expanded = open === index;
          return (
            <TouchableOpacity
              key={item.q}
              activeOpacity={0.86}
              accessibilityRole="button"
              accessibilityLabel={`${item.q} ${expanded ? 'хаах' : 'нээх'}`}
              accessibilityState={{ expanded }}
              onPress={() => setOpen(expanded ? null : index)}
            >
              <AppCard style={st.questionCard}>
                <View style={st.questionRow}>
                  <Text style={st.question}>{item.q}</Text>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={C.textMuted}
                  />
                </View>
                {expanded ? <Text style={st.answer}>{item.a}</Text> : null}
              </AppCard>
            </TouchableOpacity>
          );
        })}
      </View>

      <AppCard elevated style={st.supportCard}>
        <View style={st.supportIcon}>
          <Ionicons name="chatbubbles-outline" size={22} color={C.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.supportTitle}>Хариулт олдсонгүй юу?</Text>
          <Text style={st.supportSub}>Дэмжлэгийн багтай шууд холбогдоод асуудлаа илгээнэ үү.</Text>
        </View>
      </AppCard>

      </AppScreen>

      <View style={[st.actions, { paddingBottom: layout.insets.bottom + R.lg }]}>
        <AppButton
          label="Мессеж илгээх"
          icon="chatbubble-ellipses-outline"
          onPress={() => router.push('/contact' as any)}
          style={{ flex: 1 }}
        />
        <AppButton
          label="Утас залгах"
          icon="call-outline"
          variant="secondary"
          onPress={() => Linking.openURL('tel:7700XXXX')}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  chips: {
    gap: R.sm,
    paddingBottom: R.lg,
  },
  chip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.xs,
    backgroundColor: C.bgCard,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: R.md,
  },
  chipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  chipText: {
    ...F.small,
    color: C.textSub,
    fontWeight: '800',
  },
  chipTextActive: {
    color: C.bgCard,
  },
  list: {
    gap: R.sm,
  },
  questionCard: {
    padding: R.md,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
  },
  question: {
    ...F.body,
    color: C.text,
    fontWeight: '800',
    flex: 1,
  },
  answer: {
    ...F.small,
    color: C.textSub,
    lineHeight: 20,
    marginTop: R.sm,
  },
  supportCard: {
    marginTop: R.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
  },
  supportIcon: {
    width: UI.iconBox,
    height: UI.iconBox,
    borderRadius: UI.controlRadius,
    backgroundColor: C.secondaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportTitle: {
    ...F.h4,
    color: C.text,
  },
  supportSub: {
    ...F.small,
    color: C.textSub,
    marginTop: 3,
    lineHeight: 18,
  },
  actions: {
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
});
