import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LiveAPI, type LiveStreamItem } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import { encodeRouteParam } from '../../src/shared/routeParams';
import { AppCard, AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

type LiveTab = 'active' | 'scheduled';
const LIVE_ACCENT = C.error;

function normalizeLiveTab(value?: string | string[] | null): LiveTab {
  return value === 'scheduled' ? 'scheduled' : 'active';
}

function unwrap<T = unknown>(res: any): T {
  return (res?.data ?? res) as T;
}

function toList(res: any): LiveStreamItem[] {
  const u = unwrap<any>(res);
  if (Array.isArray(u)) return u;
  if (Array.isArray(u?.streams)) return u.streams;
  return [];
}

export default function LiveListScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const layout = useAppLayoutMetrics();
  const [tab, setTab] = useState<LiveTab>(() => normalizeLiveTab(params.tab));
  const [isFocused, setIsFocused] = useState(true);

  useEffect(() => {
    setTab(normalizeLiveTab(params.tab));
  }, [params.tab]);

  const selectTab = (nextTab: LiveTab) => {
    setTab(nextTab);
    router.replace(
      nextTab === 'scheduled'
        ? ({ pathname: '/live' as any, params: { tab: nextTab } } as any)
        : ('/live' as any),
    );
  };

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  const activeQ = useQuery({
    queryKey: ['live', 'active'],
    queryFn: () => LiveAPI.getActive(),
    refetchInterval: isFocused ? 30_000 : false,
  });

  const scheduledQ = useQuery({
    queryKey: ['live', 'scheduled'],
    queryFn: () => LiveAPI.getScheduled(),
    enabled: tab === 'scheduled',
  });

  const activeList = toList(activeQ.data);
  const scheduledList = toList(scheduledQ.data);
  const list = tab === 'active' ? activeList : scheduledList;
  const loading = tab === 'active' ? activeQ.isLoading : scheduledQ.isLoading;
  const refreshing =
    (tab === 'active' && activeQ.isRefetching) ||
    (tab === 'scheduled' && scheduledQ.isRefetching);

  const onRefresh = () => {
    if (tab === 'active') activeQ.refetch();
    else scheduledQ.refetch();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={LIVE_ACCENT} />}
        contentContainerStyle={[styles.list, { paddingTop: layout.screenTop, paddingBottom: layout.screenBottom }]}
        numColumns={2}
        columnWrapperStyle={list.length > 0 ? styles.row : undefined}
        ListHeaderComponent={
          <View>
            <AppTopBar eyebrow="Дэлгүүр" title="Live" showBack={false} />
            <AppHeader
              title="Live худалдаа"
              subtitle={activeList.length > 0 ? `${activeList.length} идэвхтэй live` : 'Шууд худалдан авалтын нэвтрүүлгүүд'}
              icon="videocam-outline"
              accent={LIVE_ACCENT}
            />
            <View style={styles.tabRow}>
              {([
                { key: 'active', label: 'Одоо Live', badge: activeList.length },
                { key: 'scheduled', label: 'Удахгүй', badge: scheduledList.length },
              ] as { key: LiveTab; label: string; badge: number }[]).map((item) => {
                const active = tab === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.label} live таб сонгох`}
                    accessibilityState={{ selected: active }}
                    activeOpacity={0.86}
                    onPress={() => selectTab(item.key)}
                    style={[styles.tab, active && styles.tabActive]}
                  >
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
                    {item.badge > 0 ? (
                      <View style={[styles.badgePill, active && styles.badgePillActive]}>
                        <Text style={[styles.badgePillText, active && styles.badgePillTextActive]}>
                          {item.badge}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerCard}>
              <ActivityIndicator size="large" color={LIVE_ACCENT} />
            </View>
          ) : (
            <AppCard style={styles.emptyCard}>
              <Ionicons name="videocam-off-outline" size={42} color={C.textMuted} />
              <Text style={styles.emptyText}>
                {tab === 'active' ? 'Одоогоор live байхгүй' : 'Удахгүй live байхгүй'}
              </Text>
              <Text style={styles.emptySubText}>
                {tab === 'active' ? 'Удахгүй эхлэх live-г дахин шалгаарай.' : 'Дараа дахин шалгаарай.'}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Live жагсаалтыг дахин шалгах"
                activeOpacity={0.84}
                onPress={onRefresh}
                style={styles.refreshButton}
              >
                <Ionicons name="refresh" size={16} color={C.bgCard} />
                <Text style={styles.refreshButtonText}>Дахин шалгах</Text>
              </TouchableOpacity>
            </AppCard>
          )
        }
        renderItem={({ item }) => <LiveCard stream={item} mode={tab} />}
      />
    </View>
  );
}

function LiveCard({ stream, mode }: { stream: LiveStreamItem; mode: LiveTab }) {
  const id = stream.id ?? (stream as any)._id;
  const routeId = encodeRouteParam(id);
  const viewerCount = stream.viewerCount ?? 0;
  const productCount = (stream.products?.length ?? 0) as number;
  const shopName = stream.shop?.name ?? 'Дэлгүүр';
  const scheduledAt = (stream as any).scheduledAt as string | undefined;
  const isActive = mode === 'active';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${stream.title} live нээх`}
      accessibilityState={{ disabled: !routeId }}
      disabled={!routeId}
      style={[styles.cardTouchable, !routeId && { opacity: 0.55 }]}
      activeOpacity={0.86}
      onPress={() => {
        if (routeId) router.push(`/live/${routeId}` as any)
      }}
    >
      <AppCard style={styles.card}>
        <View style={styles.thumbnail}>
          <Ionicons name="videocam-outline" size={32} color={C.bgCard} />
          {isActive ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : null}
          {isActive ? (
            <View style={styles.viewerBadge}>
              <Ionicons name="people-outline" size={12} color={C.bgCard} />
              <Text style={styles.viewerText}>{viewerCount}</Text>
            </View>
          ) : null}
          {!isActive && scheduledAt ? (
            <View style={styles.scheduledBadge}>
              <Ionicons name="time-outline" size={11} color={C.bgCard} />
              <Text style={styles.scheduledBadgeText}>
                {new Date(scheduledAt).toLocaleString('mn-MN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {stream.title}
          </Text>
          <Text style={styles.cardShop} numberOfLines={1}>
            {shopName}
          </Text>
          <Text style={styles.metaText}>
            {productCount > 0 ? `${productCount} бараа` : 'Шууд үзүүлэлт'}
          </Text>
        </View>
      </AppCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  list: { padding: R.lg },
  centerCard: { paddingVertical: R.xxxl },
  tabRow: {
    flexDirection: 'row',
    gap: R.sm,
    marginBottom: R.lg,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: R.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: R.xs,
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabText: { ...F.small, color: C.textSub, fontWeight: '800' },
  tabTextActive: { color: C.bgCard },
  badgePill: {
    backgroundColor: C.bgSection,
    borderRadius: R.full,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignItems: 'center',
  },
  badgePillActive: { backgroundColor: C.bgCard },
  badgePillText: { fontSize: 10, fontWeight: '800', color: C.text },
  badgePillTextActive: { color: C.primary },
  row: { gap: R.sm, marginBottom: R.sm },
  cardTouchable: { flex: 1 },
  card: { flex: 1, padding: 0, overflow: 'hidden' },
  thumbnail: {
    height: 120,
    backgroundColor: C.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: LIVE_ACCENT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.sm,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.bgCard },
  liveText: { color: C.bgCard, fontSize: 10, fontWeight: '900' },
  viewerBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.text + '9E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: R.sm,
  },
  viewerText: { color: C.bgCard, fontSize: 10, fontWeight: '700' },
  scheduledBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.text + '9E',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: R.sm,
  },
  scheduledBadgeText: { color: C.bgCard, fontSize: 10, fontWeight: '700' },
  cardInfo: { padding: R.sm },
  cardTitle: { ...F.small, color: C.text, fontWeight: '800' },
  cardShop: { ...F.tiny, color: C.textSub, marginTop: 2 },
  metaText: { ...F.tiny, color: C.textMuted, marginTop: 4 },
  emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: R.xxxl },
  emptyText: { ...F.body, color: C.text, fontWeight: '800', marginTop: R.md },
  emptySubText: { ...F.tiny, color: C.textMuted, marginTop: 4, textAlign: 'center' },
  refreshButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.xs,
    marginTop: R.lg,
    backgroundColor: LIVE_ACCENT,
    borderRadius: UI.controlRadius,
    paddingHorizontal: R.md,
    paddingVertical: R.sm,
  },
  refreshButtonText: { ...F.small, color: C.bgCard, fontWeight: '800' },
});
