import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { C, F, R, UI } from '../../src/shared/design';
import { useMalchnaasEnabled } from '../../src/config/remoteFlags';
import { AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

type ServiceItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  route: string;
  color: string;
};

const PLATFORM_SERVICES: ServiceItem[] = [
  { icon: 'storefront-outline', label: 'Дэлгүүрүүд', sub: 'Баталгаатай дэлгүүрүүд', route: '/shops', color: C.secondary },
  { icon: 'megaphone-outline', label: 'Зарын булан', sub: 'Бараа, үйлчилгээ, авто', route: '/feed', color: C.primary },
  { icon: 'bag-outline', label: 'Бараанууд', sub: 'Нэгдсэн цахим зах', route: '/store', color: C.brand },
];

const SUPPORT_SERVICES: ServiceItem[] = [
  { icon: 'reader-outline', label: 'Нөхцөл', sub: 'Үйлчилгээний нөхцөл', route: '/terms', color: C.textSub },
  { icon: 'document-text-outline', label: 'Нууцлал', sub: 'Нууцлалын бодлого', route: '/privacy', color: C.primary },
  { icon: 'call-outline', label: 'Холбоо барих', sub: 'Санал хүсэлт илгээх', route: '/contact', color: C.secondary },
  { icon: 'help-circle-outline', label: 'Тусламж', sub: 'FAQ, захиалга, хүргэлт', route: '/help', color: C.seller },
  { icon: 'chatbubble-ellipses-outline', label: 'Санал хүсэлт', sub: 'Санал, алдаа, гомдол', route: '/feedback', color: C.secondary },
];

const BUSINESS_SERVICES: ServiceItem[] = [
  { icon: 'storefront-outline', label: 'Дэлгүүр нээх', sub: 'Өөрийн дэлгүүр', route: '/open-shop', color: C.store },
  { icon: 'people-outline', label: 'Борлуулагч болох', sub: 'Орлого олох', route: '/become-seller', color: C.seller },
  { icon: 'car-outline', label: 'Жолооч болох', sub: 'Хүргэлтээр орлого', route: '/become-driver', color: C.driver },
  { icon: 'git-network-outline', label: 'Хамтрах', sub: 'Логистик, төлбөр, API', route: '/partner', color: C.secondary },
];

const ACCOUNT_SERVICES: ServiceItem[] = [
  { icon: 'cube-outline', label: 'Захиалга', sub: 'Захиалгын түүх', route: '/orders', color: C.primary },
  { icon: 'cart-outline', label: 'Сагс', sub: 'Сонгосон бараа', route: '/cart', color: C.brand },
  { icon: 'heart-outline', label: 'Хадгалсан', sub: 'Дуртай бараа', route: '/wishlist', color: C.error },
  { icon: 'car-outline', label: 'Хүргэлт', sub: 'Захиалга хайх', route: '/track/search', color: C.driver },
  { icon: 'wallet-outline', label: 'Хэтэвч', sub: 'QPay, SocialPay', route: '/wallet', color: C.primary },
  { icon: 'ticket-outline', label: 'Купон', sub: 'Промо код', route: '/coupons', color: C.seller },
  { icon: 'business-outline', label: 'Байгууллагын захиалга', sub: 'Бөөний, корпоратив', route: '/corporate-order', color: C.primary },
];

const APP_SERVICES_BASE: ServiceItem[] = [
  { icon: 'radio-button-on-outline', label: 'Live худалдаа', sub: 'Шууд дамжуулалт', route: '/live', color: C.error },
  { icon: 'globe-outline', label: 'Dropship', sub: 'Дэлхий даяар захиалах', route: '/dropship', color: C.secondary },
  { icon: 'lock-closed-outline', label: 'BNPL', sub: 'Дараа төлөх', route: '/bnpl', color: C.seller },
  { icon: 'sparkles-outline', label: 'AI туслах', sub: 'Худалдан авалтын туслах', route: '/ai-shopper', color: C.primary },
  { icon: 'chatbubble-outline', label: 'Чат', sub: 'Худалдагчтай холбогдох', route: '/chat', color: C.primary },
];

const HERDER_SERVICE: ServiceItem = {
  icon: 'leaf-outline',
  label: 'Малчны булан',
  sub: 'Шинэ бараа',
  route: '/herder',
  color: C.herder,
};

export default function ServicesScreen() {
  const malchnaasEnabled = useMalchnaasEnabled();
  const appServices = malchnaasEnabled ? [HERDER_SERVICE, ...APP_SERVICES_BASE] : APP_SERVICES_BASE;

  return (
    <AppScreen>
      <Stack.Screen options={{ headerShown: false }} />
      <AppTopBar eyebrow="eSeller" title="Үйлчилгээ" showBack={false} />
      <AppHeader
        title="Бүх үйлчилгээ"
        subtitle="Сайт болон апп дээрх үндсэн бүх урсгалыг нэг дороос нээнэ."
        icon="apps-outline"
        accent={C.brand}
      />

      <ServiceSection title="Платформ" items={PLATFORM_SERVICES} />
      <ServiceSection title="Дэмжлэг" items={SUPPORT_SERVICES} />
      <ServiceSection title="Бизнес" items={BUSINESS_SERVICES} />
      <ServiceSection title="Миний" items={ACCOUNT_SERVICES} />
      <ServiceSection title="Нэмэлт" items={appServices} />
    </AppScreen>
  );
}

function ServiceSection({ title, items }: { title: string; items: ServiceItem[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.list}>
        {items.map((item) => <ServiceRow key={item.route} item={item} />)}
      </View>
    </View>
  );
}

function ServiceRow({ item }: { item: ServiceItem }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${item.label} нээх`}
      activeOpacity={0.86}
      onPress={() => router.push(item.route as never)}
    >
      <AppCard style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: `${item.color}18` }]}>
          <Ionicons name={item.icon} size={21} color={item.color} />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
          <Text style={styles.sub} numberOfLines={1}>{item.sub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
      </AppCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: R.lg },
  sectionTitle: { ...F.h4, color: C.text, marginBottom: R.sm },
  list: { gap: R.sm },
  row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: R.md, padding: R.md },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: UI.controlRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { flex: 1 },
  label: { ...F.small, color: C.text, fontWeight: '900' },
  sub: { ...F.tiny, color: C.textMuted, marginTop: 2 },
});
