import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, Tabs, useGlobalSearchParams, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, UI } from '../../src/shared/design';
import { useAuth } from '../../src/store/auth';
import { buildRoleReturnTo, roleAreaAccessState, ROLE_AREA_HOME_ROUTE } from '../../src/shared/roleAccess';

export default function CoordinatorLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const params = useGlobalSearchParams() as Record<string, string | string[] | undefined>;
  const returnTo = useMemo(
    () => buildRoleReturnTo(pathname, params, ROLE_AREA_HOME_ROUTE.coordinator, '/coordinator'),
    [params, pathname],
  );
  const { token, user, loading } = useAuth();
  const accessState = roleAreaAccessState('coordinator', token, user?.role, loading);

  if (accessState === 'login') {
    return (
      <Redirect
        href={{
          pathname: '/login',
          params: { returnTo },
        } as never}
      />
    );
  }

  if (accessState === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator color={C.herder} />
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
