import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { HerderAPI } from '../../src/features/herder/api';
import type { ApplicationStatus } from '../../src/features/herder/types';
import { C, F, R, UI } from '../../src/shared/design';
import { AppCard, AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: 'Хүлээгдэж',
  under_review: 'Хянагдаж',
  approved: 'Баталгаажсан',
  rejected: 'Татгалзсан',
};

const STATUS_COLOR: Record<ApplicationStatus, string> = {
  pending: C.gold,
  under_review: C.primary,
  approved: C.success,
  rejected: C.error,
};

const FILTERS: Array<ApplicationStatus | 'all'> = ['pending', 'under_review', 'approved', 'rejected', 'all'];
const FILTER_LABEL: Record<ApplicationStatus | 'all', string> = {
  ...STATUS_LABEL,
  all: 'Бүгд',
};

export default function CoordinatorApplications() {
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('pending');
  const layout = useAppLayoutMetrics();

  const { data, refetch, isRefetching, isLoading } = useQuery({
    queryKey: ['coordinator', 'applications', filter],
    queryFn: () => HerderAPI.coordinator.applications.list({ status: filter }),
  });

  const apps = data?.applications ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={apps}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: UI.screenPad,
          paddingTop: layout.screenTop,
          paddingBottom: layout.screenBottom,
        }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.herder} />}
        ListHeaderComponent={
          <>
            <AppTopBar eyebrow="Координатор" title="Өргөдөл" showBack={false} />
            <AppHeader
              title="Өргөдөл"
              subtitle={`Нийт ${data?.total ?? 0} малчны хүсэлт`}
              icon="document-text-outline"
              accent={C.herder}
              style={{ marginBottom: R.md }}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: R.sm, marginBottom: R.md }}>
              {FILTERS.map((item) => (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.84}
                  onPress={() => setFilter(item)}
                  style={{
                    paddingHorizontal: R.md,
                    paddingVertical: R.sm,
                    borderRadius: R.full,
                    backgroundColor: filter === item ? C.herder : C.bgSection,
                    borderWidth: 1,
                    borderColor: filter === item ? C.herder : C.border,
                  }}
                >
                  <Text
                    style={{
                      ...F.tiny,
                    color: filter === item ? C.bgCard : C.text,
                      fontWeight: '800',
                    }}
                  >
                    {FILTER_LABEL[item]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() =>
              router.push({ pathname: '/coordinator/application/[id]', params: { id: item.id } } as never)
            }
          >
            <AppCard style={{ padding: R.md, marginBottom: R.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: R.sm }}>
                <Text style={{ ...F.body, color: C.text, fontWeight: '900', flex: 1 }} numberOfLines={1}>
                  {item.herderName}
                </Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={{ ...F.tiny, color: C.textSub, marginTop: R.xs }} numberOfLines={1}>
                {item.provinceName} - {item.district} - {item.phone}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: R.sm }}>
                <Text style={{ ...F.tiny, color: C.textMuted }}>{formatDate(item.createdAt)}</Text>
                <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
              </View>
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
              <Ionicons name="document-text-outline" size={44} color={C.textMuted} />
              <Text style={{ ...F.body, color: C.textSub }}>Өргөдөл байхгүй</Text>
            </AppCard>
          )
        }
      />
    </View>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <View
      style={{
        backgroundColor: STATUS_COLOR[status] + '22',
        borderRadius: R.full,
        paddingHorizontal: R.sm,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: STATUS_COLOR[status] + '33',
      }}
    >
      <Text style={{ ...F.tiny, color: STATUS_COLOR[status], fontWeight: '900' }}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('mn-MN');
  } catch {
    return iso;
  }
}
