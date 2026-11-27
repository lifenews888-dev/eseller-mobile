import React, { useCallback } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { get, post } from '../../src/services/api'
import { useAuth } from '../../src/store/auth'
import { routeForNotificationData } from '../../src/lib/notifications'
import { C, R } from '../../src/shared/design'
import { AppButton, AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI'
import { RequireAuthScreen } from '../../src/shared/ui/RequireAuthScreen'

type IconName = keyof typeof Ionicons.glyphMap

type NotificationItem = {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, string>
  read: boolean
  createdAt: string
}

type NotificationsPage = {
  notifications: NotificationItem[]
  unread: number
  page: number
  pages: number
}

const TYPE_META: Record<string, { icon: IconName; color: string }> = {
  order_paid: { icon: 'checkmark-circle', color: C.success },
  order_status: { icon: 'receipt-outline', color: C.primary },
  order_new: { icon: 'bag-handle-outline', color: C.brand },
  delivery: { icon: 'car', color: C.primary },
  delivery_assigned: { icon: 'bicycle-outline', color: C.primary },
  wallet: { icon: 'wallet-outline', color: C.success },
  herder: { icon: 'leaf-outline', color: C.herder },
}

function metaFor(type: string) {
  return TYPE_META[type] ?? { icon: 'notifications-outline' as IconName, color: C.textSub }
}

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Дөнгөж сая'
  if (mins < 60) return `${mins} мин өмнө`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} цагийн өмнө`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} өдрийн өмнө`
  return new Date(iso).toLocaleDateString('mn-MN')
}

export default function NotificationsScreen() {
  const layout = useAppLayoutMetrics()
  const { user } = useAuth()
  const qc = useQueryClient()

  const query = useInfiniteQuery({
    queryKey: ['notifications'],
    enabled: !!user,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => (await get('/notifications', { page: pageParam, limit: 30 })) as unknown as NotificationsPage,
    getNextPageParam: (last) => (last && last.page < last.pages ? last.page + 1 : undefined),
  })

  useFocusEffect(
    useCallback(() => {
      if (user) query.refetch()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]),
  )

  const markRead = useMutation({
    mutationFn: (ids?: string[]) => post('/notifications/read', ids ? { ids } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const items = query.data?.pages.flatMap((p) => p?.notifications ?? []) ?? []
  const unread = query.data?.pages[0]?.unread ?? 0

  if (!user) {
    return (
      <RequireAuthScreen
        title="Мэдэгдэл"
        subtitle="Захиалга, хүргэлт, орлогын мэдэгдлээ харахын тулд нэвтэрнэ үү."
        icon="notifications-outline"
        accent={C.primary}
        returnTo="/notifications"
      />
    )
  }

  const open = (item: NotificationItem) => {
    if (!item.read) markRead.mutate([item.id])
    router.push(routeForNotificationData({ type: item.type, ...item.data }) as never)
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingTop: layout.screenTop, paddingBottom: layout.screenBottom }]}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={C.primary} />}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage()
        }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <>
            <AppTopBar eyebrow="Профайл" title="Мэдэгдэл" showBack={false} />
            <AppHeader
              title="Мэдэгдэл"
              subtitle={unread > 0 ? `${unread} уншаагүй мэдэгдэл` : 'Захиалга, хүргэлт, орлогын шинэчлэл'}
              icon="notifications-outline"
              accent={C.primary}
            />
            {unread > 0 ? (
              <AppButton
                label="Бүгдийг уншсан болгох"
                icon="checkmark-done-outline"
                variant="secondary"
                disabled={markRead.isPending}
                onPress={() => markRead.mutate(undefined)}
                style={styles.markAll}
              />
            ) : null}
          </>
        }
        ListEmptyComponent={
          query.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={C.primary} />
            </View>
          ) : query.isError ? (
            <View style={styles.center}>
              <Ionicons name="cloud-offline-outline" size={40} color={C.textMuted} />
              <Text style={styles.emptyTitle}>Мэдэгдэл ачаалж чадсангүй</Text>
              <AppButton label="Дахин оролдох" icon="refresh" variant="secondary" onPress={() => query.refetch()} />
            </View>
          ) : (
            <View style={styles.center}>
              <Ionicons name="notifications-off-outline" size={40} color={C.textMuted} />
              <Text style={styles.emptyTitle}>Мэдэгдэл алга</Text>
              <Text style={styles.emptyText}>Захиалга, хүргэлтийн шинэчлэл энд харагдана.</Text>
            </View>
          )
        }
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={C.primary} style={{ marginTop: R.md }} /> : null}
        renderItem={({ item }) => {
          const meta = metaFor(item.type)
          return (
            <TouchableOpacity
              activeOpacity={0.84}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.body}. ${timeAgo(item.createdAt)}`}
              style={[styles.item, !item.read && styles.itemUnread]}
              onPress={() => open(item)}
            >
              <View style={[styles.icon, { backgroundColor: meta.color + '18' }]}>
                <Ionicons name={meta.icon} size={22} color={meta.color} />
              </View>
              <View style={styles.content}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemBody}>{item.body}</Text>
                <Text style={styles.itemTime}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.read ? <View style={styles.dot} /> : null}
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  listContent: { padding: R.lg, gap: R.sm },
  markAll: { marginBottom: R.sm },
  center: { alignItems: 'center', gap: R.sm, paddingVertical: R.xl },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: C.text },
  emptyText: { fontSize: 13, color: C.textMuted, textAlign: 'center' },
  item: {
    flexDirection: 'row',
    backgroundColor: C.bgCard,
    padding: 14,
    borderRadius: R.lg,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 74,
  },
  itemUnread: { borderColor: C.primary + '55' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '800', color: C.text },
  itemBody: { fontSize: 13, color: C.textSub, marginTop: 2 },
  itemTime: { fontSize: 11, color: C.textMuted, marginTop: 4, fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
})
