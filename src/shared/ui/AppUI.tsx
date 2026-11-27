import React from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type ScrollViewProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, R, S, UI } from '../design';

type IconName = keyof typeof Ionicons.glyphMap;

type AppScreenProps = ScrollViewProps & {
  children: React.ReactNode;
  padded?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
};

export function useAppLayoutMetrics() {
  const insets = useSafeAreaInsets();
  const screenTop = Math.max(UI.screenTop, insets.top + R.lg);
  const screenBottom = Math.max(UI.screenBottom, insets.bottom + UI.tabBarHeight + R.lg);

  return {
    insets,
    screenTop,
    screenBottom,
    floatingBottom: Math.max(UI.tabBarHeight + R.lg, insets.bottom + UI.tabBarHeight + R.lg),
  };
}

export function AppScreen({ children, padded = true, style, contentContainerStyle, ...props }: AppScreenProps) {
  const layout = useAppLayoutMetrics();

  return (
    <ScrollView
      {...props}
      style={[{ flex: 1, backgroundColor: C.bg }, style]}
      contentContainerStyle={[
        padded ? {
          padding: UI.screenPad,
          paddingTop: layout.screenTop,
          paddingBottom: layout.screenBottom,
        } : undefined,
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  accent?: string;
  style?: StyleProp<ViewStyle>;
};

export function AppHeader({ title, subtitle, icon, accent = C.brand, style }: AppHeaderProps) {
  return (
    <View
      style={[
        {
          backgroundColor: C.bgCard,
          borderRadius: UI.cardRadius,
          minHeight: UI.headerMinHeight,
          justifyContent: 'center',
          padding: R.lg,
          marginBottom: R.lg,
          borderWidth: 1,
          borderColor: C.border,
          ...S.card,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.md }}>
        {icon ? (
          <View
            style={{
              width: UI.iconBox,
              height: UI.iconBox,
              borderRadius: UI.controlRadius,
              backgroundColor: accent + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={icon} size={22} color={accent} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={{ ...F.h2, color: C.text }} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ ...F.small, color: C.textSub, marginTop: 2 }} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

type AppIconButtonProps = {
  icon: IconName;
  onPress?: () => void | Promise<unknown>;
  color?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function AppIconButton({
  icon,
  onPress,
  color = C.text,
  style,
  accessibilityLabel,
}: AppIconButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          width: 42,
          height: 42,
          borderRadius: UI.controlRadius,
          backgroundColor: C.bgCard,
          borderWidth: 1,
          borderColor: C.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={20} color={color} />
    </TouchableOpacity>
  );
}

type AppTopBarProps = {
  title: string;
  eyebrow?: string;
  onBack?: () => void | Promise<unknown>;
  showBack?: boolean;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AppTopBar({
  title,
  eyebrow,
  onBack = () => router.back(),
  showBack = true,
  right,
  style,
}: AppTopBarProps) {
  if (!showBack) {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: R.sm, marginBottom: R.md }, style]}>
        <View style={{ flex: 1 }}>
          {eyebrow ? <Text style={{ ...F.small, color: C.textMuted }}>{eyebrow}</Text> : null}
          <Text style={{ ...F.h3, color: C.text }} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {right ?? null}
      </View>
    );
  }

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: R.sm, marginBottom: R.md }, style]}>
      <AppIconButton icon="arrow-back" onPress={onBack} accessibilityLabel="Буцах" />
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={{ ...F.small, color: C.textMuted }}>{eyebrow}</Text> : null}
        <Text style={{ ...F.h3, color: C.text }} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right ?? null}
    </View>
  );
}

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  activeIcon: IconName;
  isActive: (pathname: string) => boolean;
};

const STORE_NAV_PATHS = new Set([
  '/store',
  '/cart',
  '/checkout',
  '/flash-sale',
]);

const PROFILE_NAV_PATHS = new Set([
  '/profile',
  '/orders',
  '/chat',
  '/notifications',
  '/wallet',
  '/coupons',
  '/wishlist',
  '/returns',
  '/addresses',
  '/edit-profile',
  '/notification-settings',
  '/security',
  '/achievements',
  '/tier-details',
]);

const BUYER_NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'Нүүр',
    icon: 'home-outline',
    activeIcon: 'home',
    isActive: (pathname) => pathname === '/',
  },
  {
    href: '/store',
    label: 'Дэлгүүр',
    icon: 'bag-outline',
    activeIcon: 'bag',
    isActive: (pathname) => STORE_NAV_PATHS.has(pathname) || pathname.startsWith('/product/'),
  },
  {
    href: '/feed',
    label: 'Зар',
    icon: 'megaphone-outline',
    activeIcon: 'megaphone',
    isActive: (pathname) => pathname === '/feed' || pathname.startsWith('/feed/'),
  },
  {
    href: '/shops',
    label: 'Дэлгүүрүүд',
    icon: 'storefront-outline',
    activeIcon: 'storefront',
    isActive: (pathname) => pathname === '/shops' || pathname.startsWith('/storefront/'),
  },
  {
    href: '/profile',
    label: 'Профайл',
    icon: 'person-outline',
    activeIcon: 'person',
    isActive: (pathname) => PROFILE_NAV_PATHS.has(pathname),
  },
];

const HIDDEN_SHELL_NAV_SEGMENTS = new Set([
  '(tabs)',
  '(auth)',
  '(owner)',
  'owner',
  '(seller)',
  'seller',
  '(driver)',
  'driver',
  '(herder)',
  'herder-admin',
  '(coordinator)',
  'coordinator',
]);

const HIDDEN_SHELL_NAV_PATHS = new Set([
  '/login',
  '/register',
  '/otp',
  '/forgot-password',
]);

function shouldShowShellBottomNav(pathname: string, segments: string[]) {
  const first = segments[0];
  if (!pathname || HIDDEN_SHELL_NAV_PATHS.has(pathname)) return false;
  if (first && HIDDEN_SHELL_NAV_SEGMENTS.has(first)) return false;
  return true;
}

export function AppShellBottomNav() {
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  if (!shouldShowShellBottomNav(pathname, [...segments])) return null;

  return (
    <View
      style={{
        minHeight: UI.tabBarHeight + insets.bottom,
        paddingBottom: insets.bottom + UI.tabBarPaddingBottom,
        paddingTop: UI.tabBarPaddingTop,
        paddingHorizontal: R.sm,
        backgroundColor: C.bgCard,
        borderTopWidth: 1,
        borderTopColor: C.border,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-around',
      }}
    >
      {BUYER_NAV_ITEMS.map((item) => {
        const active = item.isActive(pathname);
        const color = active ? C.brand : C.textSub;

        return (
          <TouchableOpacity
            key={item.href}
            activeOpacity={0.86}
            onPress={() => router.push(item.href as never)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              minHeight: 52,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              borderRadius: UI.controlRadius,
            }}
          >
            <Ionicons name={active ? item.activeIcon : item.icon} size={22} color={color} />
            <Text style={{ fontSize: UI.tabBarLabelSize, color, fontWeight: '800' }} numberOfLines={1}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

type AppCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
};

export function AppCard({ children, style, elevated = false }: AppCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: C.bgCard,
          borderRadius: UI.cardRadius,
          padding: R.lg,
          borderWidth: 1,
          borderColor: C.border,
        },
        elevated && S.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

type AppButtonVariant = 'primary' | 'secondary' | 'seller' | 'ghost' | 'success';

type AppButtonProps = {
  label: string;
  icon?: IconName;
  onPress?: () => void | Promise<unknown>;
  variant?: AppButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

const buttonTokens: Record<AppButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: C.brand, fg: C.bgCard, border: C.brand },
  secondary: { bg: C.bgCard, fg: C.text, border: C.border2 },
  seller: { bg: C.seller, fg: C.bgCard, border: C.seller },
  ghost: { bg: C.bgSection, fg: C.text, border: C.border },
  success: { bg: C.success, fg: C.bgCard, border: C.success },
};

export function AppButton({
  label,
  icon,
  onPress,
  variant = 'primary',
  disabled,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}: AppButtonProps) {
  const token = buttonTokens[variant];

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        {
          minHeight: 46,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: R.xs,
          backgroundColor: disabled ? C.border2 : token.bg,
          borderRadius: UI.controlRadius,
          borderWidth: 1,
          borderColor: disabled ? C.border2 : token.border,
          paddingHorizontal: R.md,
          paddingVertical: R.sm,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={disabled ? C.textMuted : token.fg} /> : null}
      <Text
        style={[
          { ...F.small, color: disabled ? C.textMuted : token.fg, fontWeight: '800' },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

type AppMetricCardProps = {
  label: string;
  value: string | number;
  icon?: IconName;
  accent?: string;
  style?: StyleProp<ViewStyle>;
};

export function AppMetricCard({ label, value, icon, accent = C.brand, style }: AppMetricCardProps) {
  return (
    <AppCard style={[{ flex: 1, padding: R.md }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm }}>
        {icon ? (
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: R.sm,
              backgroundColor: accent + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={icon} size={17} color={accent} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={{ ...F.h3, color: C.text }} numberOfLines={1}>
            {value}
          </Text>
          <Text style={{ ...F.tiny, color: C.textMuted, marginTop: 2 }} numberOfLines={2}>
            {label}
          </Text>
        </View>
      </View>
    </AppCard>
  );
}
