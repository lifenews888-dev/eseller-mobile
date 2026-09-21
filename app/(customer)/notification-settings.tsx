import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { C, F, R, UI } from '../../src/shared/design';
import { AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';
import { useAuth } from '../../src/store/auth';
import { RequireAuthScreen } from '../../src/shared/ui/RequireAuthScreen';

const SETTINGS = [
  { key: 'order_status', label: 'Захиалгын статус', sub: 'Хүргэлт, баталгаажуулалт', icon: 'receipt-outline' as const, color: C.primary },
  { key: 'delivery_update', label: 'Хүргэлтийн шинэчлэл', sub: 'Жолооч авлаа, хүрнэ', icon: 'car-outline' as const, color: C.driver },
  { key: 'flash_sale', label: 'Flash sale', sub: 'Эхлэхээс 1 цагийн өмнө', icon: 'flash-outline' as const, color: C.seller },
  { key: 'points_earned', label: 'Оноо олсон', sub: 'Оноо нэмэгдэх бүрт', icon: 'star-outline' as const, color: C.gold },
  { key: 'tier_change', label: 'Түвшин ахих', sub: 'Bronze-аас Silver зэрэг рүү', icon: 'trophy-outline' as const, color: C.seller },
  { key: 'new_chat', label: 'Шинэ мессеж', sub: 'Борлуулагчаас мессеж', icon: 'chatbubble-outline' as const, color: C.primary },
  { key: 'promo_coupon', label: 'Промо ба купон', sub: 'Тусгай санал', icon: 'ticket-outline' as const, color: C.secondary },
];

const STORAGE_KEY = '@eseller_notif_prefs';

export default function NotificationSettingsScreen() {
  const user = useAuth((s) => s.user);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value) setPrefs(JSON.parse(value));
      })
      .catch(() => {});
  }, []);

  const toggle = (key: string) => {
    const next = { ...prefs, [key]: !isEnabled(prefs, key) };
    setPrefs(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
      Alert.alert('Алдаа', 'Мэдэгдлийн тохиргоо хадгалж чадсангүй.');
    });
  };

  if (!user) {
    return (
      <RequireAuthScreen
        title="Мэдэгдлийн тохиргоо"
        subtitle="Захиалга, чат, купон болон сануулгын тохиргоогоо удирдахын тулд нэвтэрнэ үү."
        icon="notifications-outline"
        accent={C.seller}
        returnTo="/notification-settings"
      />
    );
  }

  return (
    <AppScreen>
      <Stack.Screen options={{ headerShown: false }} />
      <AppTopBar eyebrow="Профайл" title="Мэдэгдлийн тохиргоо" showBack={false} />
      <AppHeader
        title="Мэдэгдлийн тохиргоо"
        subtitle="Захиалга, хүргэлт, купон, чатны мэдэгдлээ удирдана."
        icon="notifications-outline"
        accent={C.seller}
      />

      <AppCard style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Ionicons name="notifications-outline" size={20} color={C.seller} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryTitle}>Ухаалаг сануулга</Text>
          <Text style={styles.summarySub}>Чухал мэдэгдлийг асааж, маркетингийн саналыг өөртөө тааруулж болно.</Text>
        </View>
      </AppCard>

      <View style={styles.list}>
        {SETTINGS.map((setting) => (
          <NotificationRow
            key={setting.key}
            setting={setting}
            enabled={isEnabled(prefs, setting.key)}
            onToggle={() => toggle(setting.key)}
          />
        ))}
      </View>
    </AppScreen>
  );
}

function NotificationRow({
  setting,
  enabled,
  onToggle,
}: {
  setting: typeof SETTINGS[number];
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <AppCard style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: `${setting.color}18` }]}>
        <Ionicons name={setting.icon} size={18} color={setting.color} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{setting.label}</Text>
        <Text style={styles.rowSub}>{setting.sub}</Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        accessibilityLabel={`${setting.label} мэдэгдэл`}
        accessibilityState={{ checked: enabled }}
        trackColor={{ false: C.bgSection, true: `${C.secondary}66` }}
        thumbColor={enabled ? C.secondary : C.textMuted}
      />
    </AppCard>
  );
}

function isEnabled(prefs: Record<string, boolean>, key: string) {
  return prefs[key] !== false;
}

const styles = StyleSheet.create({
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: R.md, marginBottom: R.md },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: UI.controlRadius,
    backgroundColor: C.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: { ...F.small, color: C.text, fontWeight: '900' },
  summarySub: { ...F.tiny, color: C.textMuted, lineHeight: 16, marginTop: 2 },
  list: { gap: R.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: R.md, padding: R.md },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: UI.controlRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { ...F.small, color: C.text, fontWeight: '900' },
  rowSub: { ...F.tiny, color: C.textMuted, marginTop: 2 },
});
