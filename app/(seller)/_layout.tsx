import { useMemo } from 'react';
import { Redirect, Tabs, useGlobalSearchParams, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, UI } from '../../src/shared/design';
import { useAuth } from '../../src/store/auth';
import {
  buildRoleReturnTo,
  canAccessRoleArea,
  ROLE_AREA_HOME_ROUTE,
  ROLE_LOGIN_HINT,
} from '../../src/shared/roleAccess';

export default function SellerLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const params = useGlobalSearchParams() as Record<string, string | string[] | undefined>;
  const returnTo = useMemo(
    () => buildRoleReturnTo(pathname, params, ROLE_AREA_HOME_ROUTE.seller),
    [params, pathname],
  );
  const { token, user } = useAuth();

  if (!token) {
    return (
      <Redirect
        href={{
          pathname: '/login',
          params: { role: ROLE_LOGIN_HINT.seller, returnTo },
        } as never}
      />
    );
  }

  if (!canAccessRoleArea('seller', user?.role)) {
    return <Redirect href={'/' as never} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.bgCard,
          borderTopColor: C.border,
          borderTopWidth: 0.5,
          height: UI.tabBarHeight + insets.bottom,
          paddingBottom: insets.bottom + UI.tabBarPaddingBottom,
          paddingTop: UI.tabBarPaddingTop,
        },
        tabBarActiveTintColor: C.seller,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: { fontSize: UI.tabBarLabelSize, fontWeight: '600', marginTop: 1 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Самбар',
          tabBarIcon: ({ color }) => <Ionicons name="grid" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Каталог',
          tabBarIcon: ({ color }) => <Ionicons name="cube" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Миний',
          tabBarIcon: ({ color }) => <Ionicons name="bag" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Орлого',
          tabBarIcon: ({ color }) => <Ionicons name="cash" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Топ',
          tabBarIcon: ({ color }) => <Ionicons name="trophy" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профайл',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={22} color={color} />,
        }}
      />
      <Tabs.Screen name="referral" options={{ href: null }} />
    </Tabs>
  );
}
