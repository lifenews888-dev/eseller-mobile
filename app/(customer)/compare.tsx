import { Stack, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppMetricCard, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

type TrustItem = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  color: string;
};

const TRUST_ITEMS: TrustItem[] = [
  {
    icon: 'shield-checkmark-outline',
    title: 'Аюулгүй төлбөр',
    text: 'QPay, SocialPay болон платформын төлбөрийн урсгал нэг хамгаалалттай орчинд ажиллана.',
    color: C.secondary,
  },
  {
    icon: 'storefront-outline',
    title: 'Нэгдсэн дэлгүүрүүд',
    text: 'Бараа, зар, дэлгүүр, үйлчилгээ нэг хайлт болон нэг хэрэглэгчийн туршлагад багтана.',
    color: C.primary,
  },
  {
    icon: 'car-outline',
    title: 'Хүргэлт ба захиалга',
    text: 'Захиалга, хүргэлт, tracking, чат апп дотор хоорондоо холбоотой явна.',
    color: C.driver,
  },
];

export default function Compare() {
  return (
    <AppScreen>
      <Stack.Screen options={{ headerShown: false }} />
      <AppTopBar eyebrow="eSeller" title="Давуу тал" showBack={false} />
      <AppHeader
        title="Яагаад eSeller?"
        subtitle="Дэлгүүр, зар, бараа, төлбөр, хүргэлт, борлуулалтыг нэг төсөлд нэгтгэсэн платформ."
        icon="shield-checkmark-outline"
        accent={C.primary}
      />

      <AppCard elevated style={st.hero}>
        <View style={st.logoBox}>
          <Ionicons name="storefront-outline" size={24} color={C.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.heroEyebrow}>eSeller.mn</Text>
          <Text style={st.heroTitle}>Монголын нэгдсэн цахим зах</Text>
          <Text style={st.heroText}>
            Худалдаа, үйлчилгээ, хүргэлт, борлуулалтын сувгийг нэг хэрэглэгчийн туршлага болгосон.
          </Text>
        </View>
      </AppCard>

      <View style={st.metrics}>
        <AppMetricCard label="бараа" value="10,000+" icon="cube-outline" accent={C.primary} />
        <AppMetricCard label="дэлгүүр" value="500+" icon="storefront-outline" accent={C.secondary} />
        <AppMetricCard label="хэрэглэгч" value="50,000+" icon="people-outline" accent={C.seller} />
      </View>

      <Text style={st.sectionTitle}>Давуу талууд</Text>
      <View style={st.list}>
        {TRUST_ITEMS.map((item) => (
          <AppCard key={item.title} style={st.trustCard}>
            <View style={[st.trustIcon, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.trustTitle}>{item.title}</Text>
              <Text style={st.trustText}>{item.text}</Text>
            </View>
          </AppCard>
        ))}
      </View>

      <View style={st.actions}>
        <AppButton
          label="Бараа үзэх"
          icon="bag-outline"
          onPress={() => router.push('/store' as any)}
          style={{ flex: 1 }}
        />
        <AppButton
          label="Дэлгүүр нээх"
          icon="storefront-outline"
          variant="secondary"
          onPress={() => router.push('/open-shop' as any)}
          style={{ flex: 1 }}
        />
      </View>
    </AppScreen>
  );
}

const st = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: R.md,
    marginBottom: R.md,
  },
  logoBox: {
    width: UI.iconBox,
    height: UI.iconBox,
    borderRadius: UI.controlRadius,
    backgroundColor: C.brandDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    ...F.tiny,
    color: C.brand,
    fontWeight: '900',
  },
  heroTitle: {
    ...F.h3,
    color: C.text,
    marginTop: 2,
  },
  heroText: {
    ...F.small,
    color: C.textSub,
    lineHeight: 19,
    marginTop: 5,
  },
  metrics: {
    flexDirection: 'row',
    gap: R.sm,
    marginBottom: R.lg,
  },
  sectionTitle: {
    ...F.h3,
    color: C.text,
    marginBottom: R.sm,
  },
  list: {
    gap: R.sm,
  },
  trustCard: {
    flexDirection: 'row',
    gap: R.md,
    alignItems: 'flex-start',
  },
  trustIcon: {
    width: UI.iconBox,
    height: UI.iconBox,
    borderRadius: UI.controlRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustTitle: {
    ...F.body,
    color: C.text,
    fontWeight: '800',
  },
  trustText: {
    ...F.small,
    color: C.textSub,
    lineHeight: 18,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: R.sm,
    marginTop: R.lg,
  },
});
