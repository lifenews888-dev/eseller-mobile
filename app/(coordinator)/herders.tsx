import { ActivityIndicator, FlatList, Linking, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { HerderAPI } from '../../src/features/herder/api';
import { C, F, R, UI } from '../../src/shared/design';
import { AppCard, AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

export default function CoordinatorHerders() {
  const layout = useAppLayoutMetrics();
  const { data, refetch, isRefetching, isLoading } = useQuery({
    queryKey: ['coordinator', 'herders'],
    queryFn: () => HerderAPI.coordinator.herders.list(),
  });

  const herders = data?.herders ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={herders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: UI.screenPad,
          paddingTop: layout.screenTop,
          paddingBottom: layout.screenBottom,
        }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.herder} />}
        ListHeaderComponent={
          <>
            <AppTopBar eyebrow="Координатор" title="Малчид" showBack={false} />
            <AppHeader
              title="Малчид"
              subtitle={`Идэвхтэй ${data?.total ?? 0} малчин`}
              icon="people-outline"
              accent={C.herder}
              style={{ marginBottom: R.md }}
            />
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.86} onPress={() => router.push(`/herder-profile/${item.id}` as never)}>
            <AppCard style={{ padding: R.md, marginBottom: R.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: R.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...F.body, color: C.text, fontWeight: '900' }} numberOfLines={1}>
                    {item.herderName}
                  </Text>
                  <Text style={{ ...F.tiny, color: C.textSub, marginTop: 2 }} numberOfLines={1}>
                    {item.province} - {item.district}
                  </Text>
                </View>
                {item.isVerified ? (
                  <View
                    style={{
                      backgroundColor: C.success + '18',
                      borderRadius: R.full,
                      paddingHorizontal: R.sm,
                      paddingVertical: 4,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={12} color={C.success} />
                    <Text style={{ ...F.tiny, color: C.success, fontWeight: '900' }}>Баталгаажсан</Text>
                  </View>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', gap: R.sm, marginTop: R.md }}>
                <Stat label="Бараа" value={String(item.productCount)} />
                <Stat label="Захиалга" value={String(item.orderCount)} />
                <Stat label="Үнэлгээ" value={item.rating.toFixed(1)} />
                <Stat label="Цагт" value={`${Math.round(item.onTimeRate * 100)}%`} />
              </View>

              {item.phone ? (
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => Linking.openURL(`tel:${item.phone}`)}
                  hitSlop={6}
                  style={{
                    marginTop: R.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: R.xs,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Ionicons name="call-outline" size={14} color={C.herder} />
                  <Text style={{ ...F.small, color: C.herder, fontWeight: '800' }}>{item.phone}</Text>
                </TouchableOpacity>
              ) : null}
            </AppCard>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ alignItems: 'center', padding: R.xxl }}>
              <ActivityIndicator color={C.herder} />
            </View>
          ) : (
            <AppCard style={{ alignItems: 'center', gap: R.sm, marginTop: R.lg }}>
              <Ionicons name="people-outline" size={44} color={C.textMuted} />
              <Text style={{ ...F.body, color: C.textSub }}>Идэвхтэй малчин алга</Text>
            </AppCard>
          )
        }
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bgSection, borderRadius: R.sm, padding: R.sm }}>
      <Text style={{ ...F.tiny, color: C.textMuted }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ ...F.small, color: C.text, fontWeight: '900', marginTop: 2 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
