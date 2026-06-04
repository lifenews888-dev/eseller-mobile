import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { apiUrl } from '../../src/config/apiBase';
import * as SecureStore from '../../src/shared/secureStore';
import { C, F, R, UI } from '../../src/shared/design';
import { AppCard, AppHeader, AppMetricCard, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

type IconName = keyof typeof Ionicons.glyphMap;

interface AchievementItem {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  earned: boolean;
  earnedAt: string | null;
}

const ICON_MAP: Record<string, IconName> = {
  ShoppingBag: 'bag-outline',
  Flame: 'flame-outline',
  Trophy: 'trophy-outline',
  Star: 'star-outline',
  Wallet: 'wallet-outline',
  Users: 'people-outline',
  Radio: 'radio-outline',
  Mountain: 'earth-outline',
};

async function authHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AchievementsScreen() {
  const layout = useAppLayoutMetrics();
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const [achRes, streakRes] = await Promise.all([
        fetch(apiUrl('/achievements'), { headers }),
        fetch(apiUrl('/achievements/streak'), { method: 'POST', headers }),
      ]);
      const achData = await achRes.json();
      if (achData.success) {
        setAchievements(achData.data.achievements ?? []);
        setTotalPoints(achData.data.totalPoints ?? 0);
      }
      const streakData = await streakRes.json();
      if (streakData.success) setCurrentStreak(streakData.data.currentStreak ?? 0);
    } catch {
      setAchievements([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };
  const earnedCount = achievements.filter((item) => item.earned).length;

  if (loading) {
    return (
      <View style={st.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[st.list, { paddingTop: layout.screenTop, paddingBottom: layout.screenBottom }]}>
          <AppTopBar eyebrow="Профайл" title="Амжилт" showBack={false} />
          <AppCard style={st.centerCard}>
            <ActivityIndicator size="large" color={C.gold} />
          </AppCard>
        </View>
      </View>
    );
  }

  return (
    <View style={st.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={achievements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AchievementCard item={item} />}
        numColumns={2}
        columnWrapperStyle={st.column}
        contentContainerStyle={[
          st.list,
          { paddingTop: layout.screenTop, paddingBottom: layout.screenBottom },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.gold} />}
        ListHeaderComponent={
          <View>
            <AppTopBar eyebrow="Профайл" title="Амжилт" showBack={false} />
            <AppHeader
              title="Амжилтууд"
              subtitle="Цуглуулсан оноо, дараалал болон нээгдсэн badge-уудаа харна."
              icon="trophy-outline"
              accent={C.gold}
            />
            <View style={st.metrics}>
              <AppMetricCard label="Нийт оноо" value={totalPoints.toLocaleString('mn-MN')} icon="star-outline" accent={C.gold} />
              <AppMetricCard label="Дараалал" value={currentStreak} icon="flame-outline" accent={C.seller} />
            </View>
            <AppCard style={st.progressCard}>
              <View style={st.progressIcon}>
                <Ionicons name="sparkles-outline" size={21} color={C.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.progressTitle}>Нээгдсэн амжилт</Text>
                <Text style={st.progressText}>
                  {earnedCount}/{achievements.length || 0} badge идэвхтэй байна.
                </Text>
              </View>
            </AppCard>
          </View>
        }
        ListEmptyComponent={
          <AppCard style={st.empty}>
            <Ionicons name="trophy-outline" size={42} color={C.textMuted} />
            <Text style={st.emptyTitle}>Амжилт хараахан нээгдээгүй</Text>
            <Text style={st.emptyText}>
              Захиалга хийх, оноо цуглуулах үед badge автоматаар нэмэгдэнэ.
            </Text>
          </AppCard>
        }
      />
    </View>
  );
}

function AchievementCard({ item }: { item: AchievementItem }) {
  const icon = ICON_MAP[item.icon] || 'trophy-outline';
  const accent = item.earned ? C.gold : C.textMuted;

  return (
    <AppCard style={[st.card, !item.earned && st.cardLocked]}>
      <View style={[st.iconCircle, { backgroundColor: item.earned ? C.goldDim : C.bgSection }]}>
        <Ionicons name={item.earned ? icon : 'lock-closed-outline'} size={22} color={accent} />
      </View>
      <Text style={[st.name, !item.earned && st.muted]} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={[st.desc, !item.earned && st.muted]} numberOfLines={3}>
        {item.description}
      </Text>
      <Text style={[st.points, { color: accent }]}>+{item.points.toLocaleString('mn-MN')} оноо</Text>
      {item.earned ? (
        <View style={st.badge}>
          <Ionicons name="checkmark-circle" size={16} color={C.secondary} />
        </View>
      ) : null}
    </AppCard>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  centerCard: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  list: {
    padding: UI.screenPad,
  },
  metrics: { flexDirection: 'row', gap: R.sm, marginBottom: R.sm },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
    marginBottom: R.md,
  },
  progressIcon: {
    width: UI.iconBox,
    height: UI.iconBox,
    borderRadius: UI.controlRadius,
    backgroundColor: C.secondaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTitle: { ...F.h4, color: C.text },
  progressText: { ...F.small, color: C.textSub, marginTop: 3 },
  column: { gap: R.sm },
  card: {
    flex: 1,
    minHeight: 188,
    marginBottom: R.sm,
    position: 'relative',
  },
  cardLocked: { opacity: 0.72 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: UI.controlRadius,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: R.sm,
  },
  name: { ...F.small, color: C.text, fontWeight: '800' },
  desc: { ...F.tiny, color: C.textSub, lineHeight: 16, marginTop: 4 },
  muted: { color: C.textMuted },
  points: { ...F.tiny, fontWeight: '800', marginTop: 'auto', paddingTop: R.sm },
  badge: { position: 'absolute', top: R.sm, right: R.sm },
  empty: { alignItems: 'center', gap: R.sm },
  emptyTitle: { ...F.h4, color: C.text, textAlign: 'center' },
  emptyText: { ...F.small, color: C.textSub, textAlign: 'center', lineHeight: 18 },
});
