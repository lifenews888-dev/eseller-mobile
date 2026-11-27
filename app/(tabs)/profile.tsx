import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/store/auth';
import { useCart } from '../../src/store/cart';
import { C, F, R, UI, roleColor } from '../../src/shared/design';
import { AuthValueIntro } from '../../src/components/AuthValueIntro';
import { LogoutButton } from '../../src/components/LogoutButton';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

type IconName = keyof typeof Ionicons.glyphMap;
type MenuItem = {
  icon: IconName;
  label: string;
  sub?: string;
  route?: string;
  color?: string;
  onPress?: () => void;
};

const ROLE_LABELS: Record<string, string> = {
  BUYER: 'Худалдан авагч',
  STORE: 'Дэлгүүр эзэн',
  SELLER: 'Борлуулагч',
  DRIVER: 'Жолооч',
  HERDER: 'Малчин',
  COORDINATOR: 'Зохицуулагч',
};

const GUEST_LINKS: MenuItem[] = [
  { icon: 'chatbubbles-outline', label: 'Зарын чат', sub: 'Зарын эзэдтэй', route: '/messages', color: C.brand },
  { icon: 'bag-outline', label: 'Бараанууд', sub: 'Нэгдсэн дэлгүүр', route: '/store', color: C.brand },
  { icon: 'megaphone-outline', label: 'Зарын булан', sub: 'Шинэ зарууд', route: '/feed', color: C.primary },
  { icon: 'storefront-outline', label: 'Дэлгүүрүүд', sub: 'Баталгаат дэлгүүр', route: '/shops', color: C.secondary },
];

export default function ProfileScreen() {
  const { user, role } = useAuth();
  const { count } = useCart();
  const color = roleColor(role);
  const cartCount = count();

  if (!user) {
    return (
      <AppScreen>
        <AppTopBar eyebrow="eSeller" title="Профайл" showBack={false} />
        <AppHeader
          title="Профайл"
          subtitle="Нэвтэрч захиалга, сагс, купон, хаягаа нэг дор удирдаарай."
          icon="person-outline"
          accent={C.brand}
        />

        <AuthValueIntro />

        <View style={styles.authActions}>
          <AppButton
            label="Нэвтрэх"
            icon="log-in-outline"
            style={styles.authButton}
            onPress={() => router.push({ pathname: '/login', params: { returnTo: '/profile' } } as any)}
          />
          <AppButton
            label="Бүртгүүлэх"
            icon="person-add-outline"
            variant="secondary"
            style={styles.authButton}
            onPress={() => router.push({ pathname: '/register', params: { returnTo: '/profile' } } as any)}
          />
        </View>

        <SectionTitle title="Нэвтрэлгүй үргэлжлүүлэх" />
        <View style={styles.guestGrid}>
          {GUEST_LINKS.map((item) => (
            <GuestLink key={item.route} item={item} />
          ))}
        </View>
      </AppScreen>
    );
  }

  const sections: Array<{ title: string; items: MenuItem[] }> = [
    {
      title: 'Захиалга ба худалдан авалт',
      items: [
        { icon: 'cube-outline', label: 'Захиалгын түүх', sub: 'Төлөв, хүргэлт, баримт', route: '/orders', color: C.primary },
        { icon: 'cart-outline', label: `Сагс (${cartCount})`, sub: 'Сонгосон бараа', route: '/cart', color: C.brand },
        { icon: 'heart-outline', label: 'Хадгалсан', sub: 'Дуртай бараа', route: '/wishlist', color: C.error },
        { icon: 'chatbubbles-outline', label: 'Зарын чат', sub: 'Зарын эзэдтэй харилцах', route: '/messages', color: C.brand },
        { icon: 'refresh-outline', label: 'Буцаалт ба маргаан', sub: 'Буцаалтын хүсэлт', route: '/returns', color: C.primary },
        { icon: 'location-outline', label: 'Хүргэлтийн хаяг', sub: 'Хаяг хадгалах', route: '/addresses', color: C.driver },
      ],
    },
    {
      title: 'Хэтэвч ба урамшуулал',
      items: [
        { icon: 'wallet-outline', label: 'eSeller хэтэвч', sub: 'QPay, SocialPay', route: '/wallet', color: C.primary },
        { icon: 'flash-outline', label: 'Хямдралтай бараа', sub: 'Онцгой санал', onPress: () => router.push({ pathname: '/store', params: { sale: 'true' } } as any), color: C.seller },
        { icon: 'gift-outline', label: 'Купон ба промо код', sub: 'Хөнгөлөлт ашиглах', route: '/coupons', color: C.gold },
        { icon: 'trophy-outline', label: 'Урамшууллын оноо', sub: 'Онооны түвшин', route: '/tier-details', color: C.seller },
      ],
    },
    {
      title: 'Бизнес',
      items: [
        { icon: 'storefront-outline', label: 'Дэлгүүр нээх', sub: 'Бараагаа борлуулах', route: '/open-shop', color: C.store },
        { icon: 'git-network-outline', label: 'Хамтрах', sub: 'Логистик, төлбөр, API', route: '/partner', color: C.secondary },
      ],
    },
    {
      title: 'Тохиргоо ба дэмжлэг',
      items: [
        { icon: 'person-outline', label: 'Профайл засах', sub: 'Нэр, утас, мэдээлэл', route: '/edit-profile', color: C.primary },
        { icon: 'notifications-outline', label: 'Мэдэгдэл', sub: 'Тохиргоо', route: '/notification-settings', color: C.seller },
        { icon: 'shield-checkmark-outline', label: 'Аюулгүй байдал', sub: 'Нууцлал ба хамгаалалт', route: '/security', color: C.secondary },
        { icon: 'help-circle-outline', label: 'Тусламж ба FAQ', sub: 'Асуулт, хариулт', route: '/help', color: C.primary },
        { icon: 'information-circle-outline', label: 'Тухай', sub: 'eSeller.mn', route: '/about', color: C.textSub },
        { icon: 'call-outline', label: 'Холбоо барих', sub: 'Санал хүсэлт', route: '/contact', color: C.secondary },
        { icon: 'document-text-outline', label: 'Нууцлалын бодлого', sub: 'Өгөгдөл хамгаалалт', route: '/privacy', color: C.textSub },
        { icon: 'reader-outline', label: 'Үйлчилгээний нөхцөл', sub: 'Хэрэглэх журам', route: '/terms', color: C.textSub },
      ],
    },
  ];

  return (
    <AppScreen>
      <AppTopBar eyebrow="eSeller" title="Профайл" showBack={false} />
      <AppHeader
        title="Профайл"
        subtitle="Захиалга, сагс, купон, хаяг, тохиргоогоо нэг дор удирдана."
        icon="person-outline"
        accent={color}
        style={{ marginBottom: R.md }}
      />

      <AppCard style={styles.profileCard} elevated>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{initial(user.name)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name} numberOfLines={1}>{user.name || 'Хэрэглэгч'}</Text>
          <Text style={styles.email} numberOfLines={1}>{user.email || user.phone || 'Бүртгэлтэй хэрэглэгч'}</Text>
          <View style={[styles.rolePill, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
            <Text style={[styles.roleText, { color }]}>{ROLE_LABELS[role] || role}</Text>
          </View>
        </View>
      </AppCard>

      <View style={styles.quickRow}>
        <QuickMetric label="Сагс" value={cartCount} icon="cart-outline" color={C.brand} route="/cart" />
        <QuickMetric label="Захиалга" value="Түүх" icon="receipt-outline" color={C.primary} route="/orders" />
      </View>

      {sections.map((section) => (
        <ProfileSection key={section.title} title={section.title} items={section.items} />
      ))}

      <LogoutButton />
    </AppScreen>
  );
}

function ProfileSection({ title, items }: { title: string; items: MenuItem[] }) {
  return (
    <View style={styles.section}>
      <SectionTitle title={title} />
      <View style={styles.menuList}>
        {items.map((item) => <MenuRow key={`${item.label}-${item.route ?? 'custom'}`} item={item} />)}
      </View>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function MenuRow({ item }: { item: MenuItem }) {
  const color = item.color ?? C.primary;
  const onPress = item.onPress ?? (() => item.route && router.push(item.route as any));

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.label} нээх`}
      style={styles.menuRow}
    >
      <View style={[styles.menuIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={item.icon} size={20} color={color} />
      </View>
      <View style={styles.menuText}>
        <Text style={styles.menuLabel} numberOfLines={1}>{item.label}</Text>
        {item.sub ? <Text style={styles.menuSub} numberOfLines={1}>{item.sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
    </TouchableOpacity>
  );
}

function GuestLink({ item }: { item: MenuItem }) {
  const color = item.color ?? C.primary;
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={() => item.route && router.push(item.route as any)}
      accessibilityRole="button"
      accessibilityLabel={`${item.label} нээх`}
      style={styles.guestCard}
    >
      <View style={[styles.guestIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={item.icon} size={18} color={color} />
      </View>
      <Text style={styles.guestTitle} numberOfLines={1}>{item.label}</Text>
      {item.sub ? <Text style={styles.guestSub} numberOfLines={1}>{item.sub}</Text> : null}
    </TouchableOpacity>
  );
}

function QuickMetric({
  label,
  value,
  icon,
  color,
  route,
}: {
  label: string;
  value: string | number;
  icon: IconName;
  color: string;
  route: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={() => router.push(route as any)}
      accessibilityRole="button"
      accessibilityLabel={`${label} хэсэг нээх`}
      style={styles.quickCard}
    >
      <View style={[styles.quickIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <View style={styles.quickText}>
        <Text style={styles.quickValue} numberOfLines={1}>{value}</Text>
        <Text style={styles.quickLabel} numberOfLines={1}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

function initial(name?: string) {
  const value = String(name ?? '?').trim().slice(0, 1);
  return value ? value.toLocaleUpperCase('mn-MN') : '?';
}

const styles = StyleSheet.create({
  authActions: { flexDirection: 'row', gap: R.sm, marginVertical: R.md },
  authButton: { flex: 1 },
  guestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: R.sm },
  guestCard: {
    width: '48%',
    backgroundColor: C.bgCard,
    borderRadius: UI.cardRadius,
    padding: R.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  guestIcon: {
    width: 34,
    height: 34,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: R.sm,
  },
  guestTitle: { ...F.small, color: C.text, fontWeight: '900' },
  guestSub: { ...F.tiny, color: C.textMuted, marginTop: 2 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: R.md, marginBottom: R.md },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: R.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '900', color: C.bgCard },
  profileInfo: { flex: 1 },
  name: { ...F.h3, color: C.text },
  email: { ...F.small, color: C.textMuted, marginTop: 2 },
  rolePill: {
    alignSelf: 'flex-start',
    borderRadius: R.full,
    paddingHorizontal: R.md,
    paddingVertical: 5,
    borderWidth: 1,
    marginTop: R.sm,
  },
  roleText: { ...F.tiny, fontWeight: '900' },
  quickRow: { flexDirection: 'row', gap: R.sm, marginBottom: R.md },
  quickCard: {
    flex: 1,
    backgroundColor: C.bgCard,
    borderRadius: UI.cardRadius,
    borderWidth: 1,
    borderColor: C.border,
    padding: R.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: { flex: 1 },
  quickValue: { ...F.h4, color: C.text },
  quickLabel: { ...F.tiny, color: C.textMuted, marginTop: 2 },
  section: { marginBottom: R.md },
  sectionTitle: { ...F.h4, color: C.text, marginBottom: R.sm },
  menuList: { gap: R.sm },
  menuRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bgCard,
    borderRadius: UI.cardRadius,
    padding: R.md,
    gap: R.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: UI.controlRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1 },
  menuLabel: { ...F.small, color: C.text, fontWeight: '900' },
  menuSub: { ...F.tiny, color: C.textMuted, marginTop: 2 },
});
