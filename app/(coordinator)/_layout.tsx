import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Redirect, Tabs, useGlobalSearchParams, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, UI } from '../../src/shared/design';
import { useAuth } from '../../src/store/auth';
import { buildRoleReturnTo, canAccessRoleArea, ROLE_AREA_HOME_ROUTE } from '../../src/shared/roleAccess';

export default function CoordinatorLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const params = useGlobalSearchParams() as Record<string, string | string[] | undefined>;
  const returnTo = useMemo(
    () => buildRoleReturnTo(pathname, params, ROLE_AREA_HOME_ROUTE.coordinator, '/coordinator'),
    [params, pathname],
  );
  const { token, user } = useAuth();

  if (!token) {
    return (
      <Redirect
        href={{
          pathname: '/login',
          params: { returnTo },
        } as never}
      />
    );
  }

  if (!canAccessRoleArea('coordinator', user?.role)) {
    return <Redirect href={'/' as never} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.bgCard,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: UI.tabBarHeight + insets.bottom,
          paddingBottom: insets.bottom + UI.tabBarPaddingBottom,
          paddingTop: UI.tabBarPaddingTop,
        },
        tabBarActiveTintColor: C.herder,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: { fontSize: UI.tabBarLabelSize, fontWeight: '700', marginTop: 1 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Самбар',
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: 'Өргөдөл',
          tabBarIcon: ({ color }) => <Ionicons name="document-text-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="herders"
        options={{
          title: 'Малчид',
          tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen name="application/[id]" options={{ href: null }} />
    </Tabs>
  );
}
