import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, type AppRole } from '../../store/auth';
import { useMalchnaasEnabled } from '../../config/remoteFlags';
import { C, R, UI } from '../design';

type IconName = keyof typeof Ionicons.glyphMap;

type RolePill = {
  key:   AppRole;
  icon:  IconName;
  label: string;
  color: string;
  route: string;
};

const BASE_ROLES: readonly RolePill[] = [
  { key: 'BUYER',  icon: 'bag-handle-outline', label: 'Авагч',      color: C.buyer,  route: '/'              },
  { key: 'STORE',  icon: 'storefront-outline',  label: 'Дэлгүүр',    color: C.store,  route: '/owner/dashboard'   },
  { key: 'SELLER', icon: 'megaphone-outline',   label: 'Борлуулагч', color: C.seller, route: '/seller/dashboard'  },
  { key: 'DRIVER', icon: 'car-outline',         label: 'Жолооч',     color: C.driver, route: '/driver/deliveries' },
];

const HERDER_PILL: RolePill = {
  key: 'HERDER', icon: 'leaf-outline', label: 'Малчин', color: C.herder, route: '/herder-admin/dashboard',
};

const COORDINATOR_PILL: RolePill = {
  key: 'COORDINATOR', icon: 'compass-outline', label: 'Координатор', color: C.herder, route: '/coordinator/dashboard',
};

/**
 * Horizontal role switcher shown at the top of each role's home screen.
 * HERDER / COORDINATOR pills appear only when the flag is on and the
 * user's backend role matches — the underlying routes are gated by
 * requireHerder / requireCoordinator on the server regardless.
 */
export function RoleSwitcherBar() {
  const { role, setRole, user } = useAuth();
  const malchnaasEnabled = useMalchnaasEnabled();
  if (!user) return null;

  const showHerder      = malchnaasEnabled && user.role === 'herder';
  const showCoordinator = malchnaasEnabled && user.role === 'coordinator';
  const ROLES: readonly RolePill[] = [
    ...BASE_ROLES,
    ...(showHerder ? [HERDER_PILL] : []),
    ...(showCoordinator ? [COORDINATOR_PILL] : []),
  ];

  function handleSelect(r: RolePill) {
    if (role === r.key) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setRole(r.key);
    router.replace(r.route as never);
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: R.xs,
        paddingHorizontal: UI.screenPad,
        paddingVertical: 8,
        backgroundColor: C.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}
    >
      {ROLES.map((r) => {
        const active = role === r.key;
        const foreground = active ? C.bgCard : r.color;
        return (
          <TouchableOpacity
            key={r.key}
            onPress={() => handleSelect(r)}
            activeOpacity={0.75}
            style={{
              flex: 1,
              minHeight: 54,
              backgroundColor: active ? r.color : C.bgSection,
              borderWidth: 1,
              borderColor: active ? r.color : C.border,
              borderRadius: R.full,
              paddingVertical: 7,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
            }}
          >
            <Ionicons name={r.icon} size={18} color={foreground} />
            <Text
              style={{
                color: active ? C.bgCard : C.textSub,
                fontSize: 10,
                fontWeight: '800',
              }}
              numberOfLines={1}
            >
              {r.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
