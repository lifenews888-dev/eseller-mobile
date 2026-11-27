import { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, Tabs, useGlobalSearchParams, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, UI } from '../../src/shared/design';
import { useAuth } from '../../src/store/auth';
import {
  buildRoleReturnTo,
  ROLE_AREA_HOME_ROUTE,
  ROLE_LOGIN_HINT,
  roleAreaAccessState,
} from '../../src/shared/roleAccess';

export default function DriverLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const params = useGlobalSearchParams() as Record<string, string | string[] | undefined>;
  const returnTo = useMemo(
    () => buildRoleReturnTo(pathname, params, ROLE_AREA_HOME_ROUTE.driver),
    [params, pathname],
  );
  const { token, user, loading } = useAuth();
  const accessState = roleAreaAccessState('driver', token, user?.role, loading);

  if (accessState === 'login') {
    return (
      <Redirect
        href={{
          pathname: '/login',
          params: { role: ROLE_LOGIN_HINT.driver, returnTo },
        } as never}
      />
    );
  }

  if (accessState === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator color={C.driver} />
      </View>
    );
  }

  if (accessState === 'denied') {
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
        tabBarActiveTintColor: C.driver,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: { fontSize: UI.tabBarLabelSize, fontWeight: '600', marginTop: 1 },
      }}
    >
      <Tabs.Screen
        name="deliveries"
        options={{
          title: 'Хүргэлт',
          tabBarIcon: ({ color }) => <Ionicons name="car" size={22} color={color} />,
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
        name="profile"
        options={{
          title: 'Профайл',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={22} color={color} />,
        }}
      />
      <Tabs.Screen name="delivery-detail" options={{ href: null }} />
    </Tabs>
  );
}
