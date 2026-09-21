import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { HerderAPI } from '../../src/features/herder/api';
import * as HerderQueue from '../../src/features/herder/queue';
import type { MyHerderProduct } from '../../src/features/herder/types';
import { C, F, R, UI } from '../../src/shared/design';
import { normalizeRouteParam } from '../../src/shared/routeParams';
import { shadowStyle } from '../../src/shared/shadow';
import { AppButton, AppCard, AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

type Filter = 'active' | 'all';

function normalizeListingFilter(value?: string | string[] | null): Filter {
  const raw = normalizeRouteParam(value);
  return raw === 'all' ? 'all' : 'active';
}

export default function HerderListings() {
  const params = useLocalSearchParams<{ status?: string }>();
  const [filter, setFilter] = useState<Filter>(() => normalizeListingFilter(params.status));
  const layout = useAppLayoutMetrics();
  const qc = useQueryClient();

  useEffect(() => {
    setFilter(normalizeListingFilter(params.status));
  }, [params.status]);

  const selectFilter = (nextFilter: Filter) => {
    setFilter(nextFilter);
    router.replace(
      nextFilter === 'active'
        ? ('/herder-admin/listings' as any)
        : ({ pathname: '/herder-admin/listings' as any, params: { status: nextFilter } } as any),
    );
  };

  const { data, refetch, isRefetching, isLoading } = useQuery({
    queryKey: ['herder', 'my', 'products', filter],
    queryFn:  () => HerderAPI.my.products.list({ status: filter }),
  });

  const queue = useQuery({
    queryKey: ['herder', 'queue'],
    queryFn:  () => HerderQueue.list(),
    staleTime: 0,
  });

  const drain = useMutation({
    mutationFn: () => HerderQueue.drain(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['herder', 'queue'] });
      if (r.succeeded > 0) {
        qc.invalidateQueries({ queryKey: ['herder', 'my', 'products'] });
      }
      if (r.failedOffline > 0 && r.succeeded === 0) {
        Alert.alert('Интернэт алга', 'Холболт сэргэсний дараа дахин оролдоно уу.');
      } else if (r.failedServer > 0) {
        Alert.alert('Зарим бараа татгалзлаа', 'Алдаатай барааг засаад дахин илгээнэ үү.');
      }
    },
  });

  // Opportunistic drain on mount and whenever the listings refetch — cheap,
  // fails silently if we're still offline. The banner's Retry button is the
  // explicit manual path.
  useEffect(() => {
    drain.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = useMutation({
    mutationFn: (id: string) => HerderAPI.my.products.remove(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['herder', 'my', 'products'] });
    },
    onError: (e: Error) => Alert.alert('Алдаа', e.message),
  });

  const discardQueued = (id: string) => {
    Alert.alert('Цуцлах', 'Энэ хүсэлтийг дараалалаас устгах уу?', [
      { text: 'Болих', style: 'cancel' },
      {
        text: 'Устгах', style: 'destructive',
        onPress: async () => {
          await HerderQueue.remove(id);
          qc.invalidateQueries({ queryKey: ['herder', 'queue'] });
        },
      },
    ]);
  };

  const confirmDelete = (p: MyHerderProduct) => {
    Alert.alert(
      'Бараа хасах',
      `"${p.name}"-г жагсаалтаас хасах уу? (сэргээх боломжтой)`,
      [
        { text: 'Болих', style: 'cancel' },
        { text: 'Хасах', style: 'destructive', onPress: () => remove.mutate(p.id) },
      ],
    );
  };

  const products = data?.products ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingHorizontal: UI.screenPad, paddingTop: layout.screenTop, paddingBottom: R.sm }}>
        <AppTopBar eyebrow="Малчин" title="Бараа" showBack={false} />
        <AppHeader
          title="Бүтээгдэхүүн"
          subtitle={`Нийт ${data?.total ?? 0} бараа. Идэвхтэй жагсаалт, offline хүсэлтээ хянана.`}
          icon="leaf-outline"
          accent={C.herder}
          style={{ marginBottom: R.md }}
        />

      <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.sm }}>
        {(['active', 'all'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            activeOpacity={0.84}
            onPress={() => selectFilter(f)}
            style={{
              minHeight: 38,
              paddingHorizontal: R.md,
              paddingVertical: R.sm,
              borderRadius: R.full,
              backgroundColor: filter === f ? C.herder : C.bgSection,
              borderWidth: 1,
              borderColor: filter === f ? C.herder : C.border,
            }}
          >
            <Text
              style={{
                ...F.tiny,
                color: filter === f ? C.bgCard : C.textSub,
                fontWeight: '900',
              }}
            >
              {f === 'active' ? 'Идэвхтэй' : 'Бүгд'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      </View>

      {(queue.data?.length ?? 0) > 0 && (
        <AppCard
          style={{
            marginHorizontal: UI.screenPad,
            marginBottom: R.md,
            borderColor: C.gold,
            gap: R.sm,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Ionicons name="cloud-offline-outline" size={18} color={C.gold} />
              <Text style={{ ...F.small, color: C.text, fontWeight: '900', flex: 1 }}>
                Офлайнд хадгалсан {queue.data!.length}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => drain.mutate()}
              disabled={drain.isPending}
              style={{
                backgroundColor: drain.isPending ? C.textMuted : C.herder,
                borderRadius: R.full,
                paddingHorizontal: R.md,
                paddingVertical: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {drain.isPending ? (
                <ActivityIndicator color={C.bgCard} size="small" />
              ) : (
                <Ionicons name="sync" size={14} color={C.bgCard} />
              )}
              <Text style={{ ...F.tiny, color: C.bgCard, fontWeight: '900' }}>Дахин илгээх</Text>
            </TouchableOpacity>
          </View>
          {queue.data!.map((q) => (
            <View
              key={q.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingTop: 6,
                borderTopWidth: 0.5,
                borderTopColor: C.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                  {q.kind === 'create' ? 'Шинэ: ' : 'Засвар: '}{q.payload.name || '(нэргүй)'}
                </Text>
                {q.lastError ? (
                  <Text style={{ color: C.error, fontSize: 11, marginTop: 2 }} numberOfLines={2}>
                    {q.lastError}
                  </Text>
                ) : (
                  <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>
                    {q.attempts > 0 ? `${q.attempts} удаа оролдлоо` : 'Хүлээж байна'}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => discardQueued(q.id)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </AppCard>
      )}

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: UI.screenPad, paddingBottom: layout.screenBottom }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={C.herder}
          />
        }
        renderItem={({ item: p }) => (
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/herder-admin/listing-form',
              params:   { id: p.id },
            } as never)}
            style={{
              flexDirection: 'row',
              backgroundColor: C.bgCard,
              borderRadius: R.lg,
              padding: 12,
              marginBottom: 10,
              gap: 12,
              borderWidth: 1,
              borderColor: C.border,
              opacity: p.isActive ? 1 : 0.55,
            }}
          >
            {p.images?.[0] ? (
              <Image
                source={{ uri: p.images[0] }}
                style={{ width: 72, height: 72, borderRadius: R.md, backgroundColor: C.bgSection }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: R.md,
                  backgroundColor: C.bgSection,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="leaf-outline" size={28} color={C.textMuted} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }} numberOfLines={2}>
                {p.name}
              </Text>
              <Text style={{ color: C.herder, fontWeight: '800', fontSize: 15, marginTop: 4 }}>
                {(p.salePrice ?? p.price).toLocaleString()}₮
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {p.category && (
                  <View
                    style={{
                      backgroundColor: C.herder + '20',
                      borderRadius: R.full,
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ color: C.herder, fontSize: 11, fontWeight: '700' }}>
                      {p.category}
                    </Text>
                  </View>
                )}
                {p.requiresColdChain && (
                  <View
                    style={{
                      backgroundColor: C.primaryDim,
                      borderRadius: R.full,
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Ionicons name="snow-outline" size={11} color={C.primary} />
                      <Text style={{ color: C.primary, fontSize: 11, fontWeight: '700' }}>
                        Хүйтэн
                      </Text>
                    </View>
                  </View>
                )}
                {!p.isActive && (
                  <View
                    style={{
                      backgroundColor: C.errorDim,
                      borderRadius: R.full,
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ color: C.error, fontSize: 11, fontWeight: '700' }}>
                      Идэвхгүй
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => confirmDelete(p)}
              hitSlop={8}
              style={{ alignSelf: 'center', padding: 8 }}
            >
              <Ionicons name="trash-outline" size={20} color={C.error} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <AppCard style={{ alignItems: 'center', gap: R.sm, marginTop: R.lg }}>
              <Ionicons name="leaf-outline" size={48} color={C.textMuted} />
              <Text style={{ ...F.body, color: C.textSub, textAlign: 'center' }}>
                Бараа байхгүй байна
              </Text>
              <AppButton
                label="Эхний бараа нэмэх"
                icon="add"
                variant="success"
                onPress={() => router.push('/herder-admin/listing-form' as never)}
                style={{ backgroundColor: C.herder, borderColor: C.herder }}
              />
            </AppCard>
          ) : null
        }
      />

      <TouchableOpacity
        accessibilityLabel="Бараа нэмэх"
        onPress={() => router.push('/herder-admin/listing-form' as never)}
        style={{
          position: 'absolute',
          right: 18,
          bottom: layout.floatingBottom,
          width: 56,
          height: 56,
          borderRadius: R.full,
          backgroundColor: C.herder,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadowStyle({ y: 2, blur: 6, opacity: 0.25, elevation: 6 }),
        }}
      >
        <Ionicons name="add" size={28} color={C.bgCard} />
      </TouchableOpacity>
    </View>
  );
}
