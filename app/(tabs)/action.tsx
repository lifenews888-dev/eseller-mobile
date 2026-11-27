import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/store/auth';
import { C, F, R, roleColor } from '../../src/shared/design';
import { AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

type ActionItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  desc: string;
};

const ACTIONS: Record<string, ActionItem[]> = {
  BUYER: [
    { icon: 'create-outline', label: 'Зар нэмэх', route: '/feed/create', desc: 'Зарын булан' },
    { icon: 'storefront-outline', label: 'Дэлгүүр нээх', route: '/open-shop', desc: 'Хялбар бүртгэл' },
    { icon: 'megaphone-outline', label: 'Борлуулагч болох', route: '/become-seller', desc: 'Комисс олох' },
    { icon: 'car-outline', label: 'Жолооч болох', route: '/become-driver', desc: 'Хүргэлтээр орлого' },
  ],
  STORE: [
    { icon: 'add-circle-outline', label: 'Бараа нэмэх', route: '/owner/products', desc: 'Шинэ бараа' },
    { icon: 'receipt-outline', label: 'Захиалгууд', route: '/owner/orders', desc: 'Шинэ захиалга' },
    { icon: 'pricetag-outline', label: 'Купон үүсгэх', route: '/owner/create-coupon', desc: 'Хямдралын код' },
    { icon: 'desktop-outline', label: 'POS терминал', route: '/owner/pos', desc: 'Кассын систем' },
  ],
  SELLER: [
    { icon: 'link-outline', label: 'Линк үүсгэх', route: '/seller/catalog', desc: 'Урилгын код' },
    { icon: 'stats-chart-outline', label: 'Орлого харах', route: '/seller/earnings', desc: 'Комисс' },
  ],
  DRIVER: [
    { icon: 'checkmark-circle-outline', label: 'Хүргэлт авах', route: '/driver/deliveries', desc: 'Шинэ захиалга' },
    { icon: 'cash-outline', label: 'Орлого', route: '/driver/earnings', desc: 'Өнөөдрийн дүн' },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  BUYER: 'Авагч',
  STORE: 'Дэлгүүрийн эзэн',
  SELLER: 'Борлуулагч',
  DRIVER: 'Жолооч',
};

export default function ActionTab() {
  const { role } = useAuth();
  const actions = ACTIONS[role] ?? ACTIONS.BUYER;
  const color = roleColor(role);

  return (
    <AppScreen>
      <AppTopBar eyebrow="eSeller" title="Үйлдэл" />
      <AppHeader
        title="Үйлдэл"
        subtitle={`${ROLE_LABEL[role] ?? 'Авагч'} горим`}
        icon="flash-outline"
        accent={color}
      />

      <View style={{ gap: R.sm }}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.route}
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel={`${action.label} нээх. ${action.desc}`}
            onPress={() => router.push(action.route as any)}
          >
            <AppCard
              style={{
                padding: R.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: R.md,
                borderColor: color + '24',
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: R.md,
                  backgroundColor: color + '18',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={action.icon} size={22} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...F.body, fontWeight: '800', color: C.text }} numberOfLines={1}>
                  {action.label}
                </Text>
                <Text style={{ ...F.tiny, color: C.textSub, marginTop: 3 }} numberOfLines={2}>
                  {action.desc}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
            </AppCard>
          </TouchableOpacity>
        ))}
      </View>
    </AppScreen>
  );
}
