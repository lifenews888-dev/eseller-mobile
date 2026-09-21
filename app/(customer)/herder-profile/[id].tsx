import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import {
  HERDER_BRAND as BRAND,
  PROVINCES,
  HerderAPI,
  ProductGridSkeleton,
  useProvinceDays,
  type HerderProduct,
  type HerderReview,
} from '../../../src/features/herder';
import { useMalchnaasEnabled } from '../../../src/config/remoteFlags';
import { C, R, UI } from '../../../src/shared/design';
import { encodeRouteParam } from '../../../src/shared/routeParams';
import { AppTopBar, useAppLayoutMetrics } from '../../../src/shared/ui/AppUI';

function fmt(n: number) { return n.toLocaleString() + '₮'; }

export default function HerderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const layout = useAppLayoutMetrics();
  const herderId = String(id ?? '');
  const malchnaasEnabled = useMalchnaasEnabled();

  const profileQ = useQuery({
    queryKey: ['herder-profile', herderId],
    queryFn:  () => HerderAPI.profile(herderId),
    enabled:  !!herderId && malchnaasEnabled,
  });

  const listingsQ = useQuery({
    queryKey: ['herder-profile-products', herderId],
    queryFn:  () => HerderAPI.list({ herderId, limit: 30 }),
    enabled:  !!herderId && malchnaasEnabled,
  });

  const reviewsQ = useQuery({
    queryKey: ['herder-reviews', herderId],
    queryFn:  () => HerderAPI.reviews(herderId, { limit: 10 }),
    enabled:  !!herderId && malchnaasEnabled,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([profileQ.refetch(), listingsQ.refetch(), reviewsQ.refetch()]);
    setRefreshing(false);
  }, [profileQ, listingsQ, reviewsQ]);

  // Hook must run before early returns — undefined code is handled safely.
  const provinceDays = useProvinceDays(profileQ.data?.province);

  if (!malchnaasEnabled) {
    return (
      <View style={s.center}>
        <Ionicons name="leaf-outline" size={48} color={C.textMuted} />
        <Text style={s.muted}>Малчнаас шууд идэвхгүй байна.</Text>
      </View>
    );
  }

  if (profileQ.isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  const profile = profileQ.data;
  const products = listingsQ.data?.products ?? [];
  const province = PROVINCES.find((p) => p.code === profile?.province);

  if (!profile) {
    return (
      <View style={s.center}>
        <Ionicons name="person-outline" size={48} color={C.textMuted} />
        <Text style={s.muted}>Малчны профайл олдсонгүй.</Text>
        <TouchableOpacity style={s.secondaryBtn} onPress={() => router.back()}>
          <Text style={s.secondaryBtnText}>Буцах</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const head = profile.livestock
    ? Object.values(profile.livestock).reduce((n, v) => n + (v || 0), 0)
    : null;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ paddingBottom: layout.screenBottom }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
    >
      <View style={[s.topBarWrap, { paddingTop: layout.screenTop }]}>
        <AppTopBar eyebrow="Малчнаас" title={profile.herderName} style={{ marginBottom: 0 }} />
      </View>

      {/* Cover + back */}
      <View style={s.cover}>
        {profile.coverImage ? (
          <Image source={{ uri: profile.coverImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={s.coverFallback} />
        )}
      </View>

      {/* Header card */}
      <View style={s.headerCard}>
        <View style={s.avatarWrap}>
          {profile.avatar
            ? <Image source={{ uri: profile.avatar }} style={s.avatar} />
            : <View style={[s.avatar, s.avatarFallback]}><Ionicons name="person" size={32} color={C.bgCard} /></View>}
          {profile.isVerified && (
            <View style={s.verifiedDot}>
              <Ionicons name="checkmark" size={12} color={C.bgCard} />
            </View>
          )}
        </View>

        <Text style={s.name}>{profile.herderName}</Text>

        <View style={s.metaRow}>
          <Ionicons name="location-outline" size={14} color={C.textSub} />
          <Text style={s.metaText}>
            {profile.provinceName}{profile.district ? ` · ${profile.district}` : ''}
          </Text>
        </View>

        {typeof profile.rating === 'number' && (
          <View style={s.metaRow}>
            <Ionicons name="star" size={14} color={C.gold} />
            <Text style={s.metaText}>
              {profile.rating.toFixed(1)}
              {profile.orderCount ? ` · ${profile.orderCount} захиалга` : ''}
            </Text>
          </View>
        )}

        {profile.bio && <Text style={s.bio}>{profile.bio}</Text>}
      </View>

      {/* Stats strip */}
      {(profile.stats || head !== null || province) && (
        <View style={s.statsRow}>
          {head !== null && (
            <StatPill label="Мал" value={`${head}`} />
          )}
          {province && (
            <StatPill label="Хүргэлт" value={`${provinceDays ?? province.days}ө`} />
          )}
          {profile.stats?.deliverySuccessRate !== undefined && (
            <StatPill label="Амжилт" value={`${Math.round(profile.stats.deliverySuccessRate * 100)}%`} />
          )}
          {profile.stats?.productCount !== undefined && (
            <StatPill label="Бараа" value={`${profile.stats.productCount}`} />
          )}
        </View>
      )}

      {/* Products */}
      <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
        <Text style={s.sectionTitle}>Бүтээгдэхүүн ({products.length})</Text>

        {listingsQ.isLoading ? (
          <ProductGridSkeleton count={4} />
        ) : products.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="leaf-outline" size={36} color={C.textMuted} />
            <Text style={s.muted}>Одоогоор бүтээгдэхүүн байхгүй</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {products.map((p) => <ProductTile key={p.id} p={p} />)}
          </View>
        )}
      </View>

      {/* Reviews */}
      <View style={{ paddingHorizontal: 16, marginTop: 26 }}>
        <Text style={s.sectionTitle}>
          Үнэлгээ ({reviewsQ.data?.total ?? profile.reviewCount ?? 0})
        </Text>
        {reviewsQ.isLoading ? (
          <ActivityIndicator color={BRAND} style={{ marginTop: 10 }} />
        ) : (reviewsQ.data?.reviews.length ?? 0) === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="chatbubble-ellipses-outline" size={36} color={C.textMuted} />
            <Text style={s.muted}>Одоогоор үнэлгээ байхгүй</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {reviewsQ.data!.reviews.map((r) => <ReviewRow key={r.id} r={r} />)}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function ReviewRow({ r }: { r: HerderReview }) {
  const when = new Date(r.createdAt).toLocaleDateString('mn-MN');
  return (
    <View style={s.reviewCard}>
      <View style={s.reviewHead}>
        <Text style={s.reviewName}>{r.buyerName}</Text>
        <View style={s.reviewStars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Ionicons
              key={n}
              name={n <= r.rating ? 'star' : 'star-outline'}
              size={13}
              color={n <= r.rating ? C.gold : C.border2}
            />
          ))}
        </View>
      </View>
      {r.text ? <Text style={s.reviewText}>{r.text}</Text> : null}
      <Text style={s.reviewDate}>{when}</Text>
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.pill}>
      <Text style={s.pillValue}>{value}</Text>
      <Text style={s.pillLabel}>{label}</Text>
    </View>
  );
}

function ProductTile({ p }: { p: HerderProduct }) {
  const id = p.id ?? (p as any)._id;
  const routeId = encodeRouteParam(id);
  const price = p.salePrice ?? p.price;
  return (
    <TouchableOpacity
      style={[s.tile, !routeId && { opacity: 0.55 }]}
      accessibilityRole="button"
      accessibilityLabel={`${p.name || 'Бараа'} барааны дэлгэрэнгүй`}
      accessibilityState={{ disabled: !routeId }}
      disabled={!routeId}
      onPress={() => {
        if (routeId) router.push(`/herder-product/${routeId}` as never)
      }}
      activeOpacity={0.85}
    >
      <View style={s.tileImg}>
        {p.images?.[0]
          ? <Image source={{ uri: p.images[0] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          : <View style={s.tileImgFallback}><Ionicons name="leaf-outline" size={28} color={C.textMuted} /></View>}
      </View>
      <View style={{ padding: 10 }}>
        <Text style={s.tileName} numberOfLines={2}>{p.name}</Text>
        <Text style={s.tilePrice}>{fmt(price)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', gap: 10, padding: UI.screenPad },
  muted: { fontSize: 14, color: C.textSub },

  cover: { height: 140, backgroundColor: C.bgSection, position: 'relative' },
  coverFallback: { flex: 1, backgroundColor: BRAND, opacity: 0.15 },
  topBarWrap: { paddingHorizontal: UI.screenPad, paddingBottom: R.md, backgroundColor: C.bg },

  headerCard: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: C.border },
  avatarWrap: { marginTop: -48, marginBottom: 10 },
  avatar: { width: 84, height: 84, borderRadius: R.full, borderWidth: 3, borderColor: C.bgCard, backgroundColor: C.bgSection },
  avatarFallback: { backgroundColor: BRAND, justifyContent: 'center', alignItems: 'center' },
  verifiedDot: { position: 'absolute', right: 2, bottom: 2, width: 24, height: 24, borderRadius: R.full, backgroundColor: BRAND, borderWidth: 2, borderColor: C.bgCard, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  metaText: { fontSize: 13, color: C.textSub },
  bio: { fontSize: 14, color: C.textSub, lineHeight: 20, marginTop: 10 },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  pill: { flex: 1, backgroundColor: C.secondaryDim, borderRadius: R.md, paddingVertical: 12, alignItems: 'center' },
  pillValue: { fontSize: 16, fontWeight: '800', color: BRAND },
  pillLabel: { fontSize: 11, color: C.secondary, marginTop: 2 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 10 },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 8 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%' as any, backgroundColor: C.bgCard, borderRadius: R.md, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  tileImg: { height: 120, backgroundColor: C.bgSection },
  tileImgFallback: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tileName: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 4, minHeight: 34 },
  tilePrice: { fontSize: 14, fontWeight: '800', color: BRAND },

  secondaryBtn: { borderWidth: 1, borderColor: BRAND, borderRadius: R.md, paddingHorizontal: 18, paddingVertical: 10 },
  secondaryBtnText: { color: BRAND, fontWeight: '700' },

  reviewCard: { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: R.md, padding: 12 },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewName: { fontSize: 13, fontWeight: '700', color: C.text },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewText: { fontSize: 13, color: C.textSub, lineHeight: 18, marginBottom: 6 },
  reviewDate: { fontSize: 11, color: C.textMuted },
});
