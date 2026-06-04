import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { get } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import { AppCard, AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

function unwrap<T = any>(res: any): T {
  return (res?.data ?? res) as T;
}

function normalizeQueryParam(value?: string | string[] | null) {
  return typeof value === 'string' ? value.trim() : '';
}

export default function Tenders() {
  const params = useLocalSearchParams<{ q?: string }>();
  const layout = useAppLayoutMetrics();
  const [search, setSearch] = useState(() => normalizeQueryParam(params.q));

  useEffect(() => {
    setSearch(normalizeQueryParam(params.q));
  }, [params.q]);

  const replaceTenderRoute = (nextSearch: string) => {
    const value = nextSearch.trim();

    router.replace(
      value
        ? ({ pathname: '/tenders' as any, params: { q: value } } as any)
        : ('/tenders' as any),
    );
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    replaceTenderRoute(value);
  };

  const clearSearch = () => {
    setSearch('');
    replaceTenderRoute('');
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['tenders', search],
    queryFn: async ({ pageParam = 1 }) =>
      unwrap<any>(await get(`/tenders?page=${pageParam}&q=${encodeURIComponent(search)}`)),
    getNextPageParam: (last: any) => (last?.hasMore ? (last.page ?? 1) + 1 : undefined),
    initialPageParam: 1,
    retry: false,
  });

  const tenders: any[] = data?.pages.flatMap((p: any) => p?.items ?? []) ?? [];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <FlatList
          data={tenders}
          keyExtractor={(item: any, index) => item.id ?? `${item.title}-${index}`}
          contentContainerStyle={{ padding: R.lg, paddingTop: layout.screenTop, paddingBottom: layout.screenBottom, gap: R.sm }}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <View>
              <AppTopBar eyebrow="Бизнес" title="Тендер" showBack={false} />
              <AppHeader
                title="Тендер"
                subtitle="Нээлттэй худалдан авалт, байгууллагын санал хүсэлт"
                icon="document-text-outline"
                accent={C.primary}
              />
              <View style={st.searchBox}>
                <Ionicons name="search" size={18} color={C.textMuted} />
                <TextInput
                  value={search}
                  onChangeText={handleSearchChange}
                  placeholder="Тендер хайх..."
                  placeholderTextColor={C.textMuted}
                  style={st.searchInput}
                />
                {search.length > 0 ? (
                  <TouchableOpacity activeOpacity={0.82} onPress={clearSearch}>
                    <Ionicons name="close-circle" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator color={C.primary} style={{ margin: 16 }} /> : null
          }
          ListEmptyComponent={
            !isLoading ? (
              <AppCard style={{ alignItems: 'center', gap: R.sm, marginTop: R.xl }}>
                <Ionicons name="clipboard-outline" size={34} color={C.textMuted} />
                <Text style={{ ...F.small, color: C.textSub }}>Тендер олдсонгүй</Text>
              </AppCard>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.86} onPress={() => item.url && Linking.openURL(item.url)}>
              <AppCard>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: R.sm, marginBottom: R.sm }}>
                  <View style={st.categoryPill}>
                    <Text style={st.categoryText}>{item.category ?? 'Тендер'}</Text>
                  </View>
                  {item.deadline ? (
                    <Text style={{ ...F.tiny, color: C.textMuted, flex: 1 }}>Дуусах: {item.deadline}</Text>
                  ) : null}
                </View>

                <Text style={{ ...F.body, fontWeight: '800', color: C.text, marginBottom: 5 }} numberOfLines={2}>
                  {item.title}
                </Text>

                {item.budget != null ? (
                  <Text style={{ ...F.small, fontWeight: '900', color: C.primary }}>
                    {Number(item.budget).toLocaleString()}₮
                  </Text>
                ) : null}

                <Text style={{ ...F.tiny, color: C.textSub, marginTop: 4 }} numberOfLines={1}>
                  {item.organization ?? 'Байгууллага'}
                </Text>
              </AppCard>
            </TouchableOpacity>
          )}
        />
        {isLoading ? (
          <ActivityIndicator color={C.primary} style={{ position: 'absolute', top: 180, alignSelf: 'center' }} />
        ) : null}
      </View>
    </>
  );
}

const st = {
  searchBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: C.bgCard,
    borderRadius: R.md,
    paddingHorizontal: 14,
    gap: R.sm,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: R.md,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text, paddingVertical: 12 },
  categoryPill: {
    backgroundColor: C.primaryDim,
    borderRadius: R.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: { color: C.primary, fontSize: 10, fontWeight: '800' as const },
};
