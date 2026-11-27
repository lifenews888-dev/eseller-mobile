import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/store/auth';
import { C, UI, roleColor } from '../../src/shared/design';
import { useFeedBadge } from '../../src/hooks/useFeedBadge';

type TabItem = { title: string; icon: string; iconActive: string };

const TAB_CONFIG: Record<string, Record<string, TabItem>> = {
  BUYER: {
    index: { title: 'Нүүр', icon: 'home-outline', iconActive: 'home' },
    store: { title: 'Дэлгүүр', icon: 'bag-outline', iconActive: 'bag' },
    feed: { title: 'Зар', icon: 'megaphone-outline', iconActive: 'megaphone' },
    shops: { title: 'Дэлгүүрүүд', icon: 'storefront-outline', iconActive: 'storefront' },
    profile: { title: 'Профайл', icon: 'person-outline', iconActive: 'person' },
  },
};

const ALL_TABS = [
  'index',
  'store',
  'feed',
  'shops',
  'profile',
  'orders',
  'action',
  'search',
  'social',
  'chat',
  'gold',
  'notifications',
] as const;

export default function TabsLayout() {
  const { role } = useAuth();
  const color = role === 'BUYER' ? C.brand : roleColor(role);
  const config = TAB_CONFIG[role] || TAB_CONFIG.BUYER;
  const insets = useSafeAreaInsets();
  const feedBadge = useFeedBadge();

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
          position: 'absolute',
        },
        tabBarActiveTintColor: color,
        tabBarInactiveTintColor: C.textSub,
        tabBarLabelStyle: {
          fontSize: UI.tabBarLabelSize,
          fontWeight: '700',
          marginTop: 1,
        },
      }}
    >
      {ALL_TABS.map((name) => {
        const tabConfig = config[name];

        if (!tabConfig) {
          return <Tabs.Screen key={name} name={name} options={{ href: null }} />;
        }

        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: tabConfig.title,
              tabBarBadge: name === 'feed' && feedBadge > 0 ? (feedBadge > 99 ? '99+' : feedBadge) : undefined,
              tabBarBadgeStyle: { backgroundColor: C.brand, fontSize: 10 },
              tabBarIcon: ({ focused, color: iconColor }: { focused: boolean; color: string }) => (
                <Ionicons
                  name={(focused ? tabConfig.iconActive : tabConfig.icon) as any}
                  size={22}
                  color={iconColor}
                />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}
