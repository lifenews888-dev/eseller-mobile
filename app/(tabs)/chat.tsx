import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../src/services/api';
import { useAuth } from '../../src/store/auth';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

export default function ChatScreen() {
  const { user } = useAuth();
  return <BuyerChatList user={user} />;
}

function BuyerChatList({ user }: { user: any }) {
  const [isFocused, setIsFocused] = useState(true);
  const layout = useAppLayoutMetrics();
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => get('/chat/conversations'),
    enabled: !!user,
    refetchInterval: isFocused ? 5000 : false,
  });

  const conversations = Array.isArray(data) ? data : Array.isArray((data as any)?.conversations) ? (data as any).conversations : [];

  if (!user) {
    return (
      <AppScreen>
        <AppTopBar eyebrow="Профайл" title="Чат" showBack={false} />
        <AppHeader
          title="Чат"
          subtitle="Худалдагчтай холбогдохын тулд нэвтэрнэ үү."
          icon="chatbubbles-outline"
          accent={C.primary}
        />
        <AppCard style={styles.centerCard}>
          <Ionicons name="lock-closed-outline" size={44} color={C.primary} />
          <Text style={styles.emptyTitle}>Нэвтрэх шаардлагатай</Text>
          <Text style={styles.mutedText}>Захиалга, бараа, хүргэлтийн талаар чат эхлүүлэх боломжтой.</Text>
          <AppButton
            label="Нэвтрэх"
            icon="log-in-outline"
            onPress={() => router.push({ pathname: '/login', params: { returnTo: '/chat' } } as any)}
          />
        </AppCard>
      </AppScreen>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={conversations}
        keyExtractor={(item: any, index) => String(item.id ?? item._id ?? `chat-${index}`)}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.brand} />}
        contentContainerStyle={[styles.list, { paddingTop: layout.screenTop, paddingBottom: layout.screenBottom }]}
        ListHeaderComponent={
          <>
            <AppTopBar eyebrow="Профайл" title="Чат" showBack={false} />
            <AppHeader
              title="Чат"
              subtitle="Дэлгүүр, борлуулагч, хүргэлтийн багтай хийсэн ярианууд."
              icon="chatbubble-ellipses-outline"
              accent={C.primary}
            />
          </>
        }
        renderItem={({ item }) => <ConversationRow item={item} />}
        ListEmptyComponent={
          <AppCard style={styles.centerCard}>
            {isLoading ? (
              <>
                <ActivityIndicator color={C.brand} />
                <Text style={styles.mutedText}>Чатууд ачаалж байна...</Text>
              </>
            ) : (
              <>
                <Ionicons name="chatbubbles-outline" size={46} color={C.textMuted} />
                <Text style={styles.emptyTitle}>Чат байхгүй байна</Text>
                <Text style={styles.mutedText}>Барааны хуудаснаас худалдагчтай чат эхлүүлнэ үү.</Text>
                <AppButton label="Дэлгүүр харах" icon="bag-outline" onPress={() => router.push('/store' as any)} />
              </>
            )}
          </AppCard>
        }
      />
    </View>
  );
}

function ConversationRow({ item }: { item: any }) {
  const id = item.id ?? item._id;
  const name = item.entity?.name ?? item.store?.name ?? item.shopName ?? 'Дэлгүүр';
  const unread = Number(item.buyerUnread ?? item.unread ?? 0);

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      disabled={!id}
      accessibilityRole="button"
      accessibilityLabel={`${name} чат нээх${unread > 0 ? `, ${unread} шинэ мессеж` : ''}`}
      accessibilityState={{ disabled: !id }}
      onPress={() => {
        if (id) router.push(`/chat/${id}` as any);
      }}
    >
      <AppCard style={styles.rowCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial(name)}</Text>
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={1}>{name}</Text>
          <Text style={styles.rowSub} numberOfLines={1}>{item.lastMessage || 'Чат эхлүүлэх'}</Text>
        </View>
        {unread > 0 ? (
          <View style={styles.unread}>
            <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        )}
      </AppCard>
    </TouchableOpacity>
  );
}

function initial(value?: string) {
  const first = String(value ?? '?').trim().slice(0, 1);
  return first ? first.toLocaleUpperCase('mn-MN') : '?';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  list: { padding: UI.screenPad },
  centerCard: { alignItems: 'center', gap: R.sm },
  emptyTitle: { ...F.body, color: C.text, fontWeight: '900', textAlign: 'center' },
  mutedText: { ...F.small, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: R.md, marginBottom: R.sm },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: R.full,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...F.h3, color: C.bgCard },
  rowText: { flex: 1 },
  rowTitle: { ...F.small, color: C.text, fontWeight: '900' },
  rowSub: { ...F.small, color: C.textMuted, marginTop: 3 },
  unread: {
    minWidth: 24,
    height: 24,
    borderRadius: R.full,
    paddingHorizontal: 7,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { ...F.tiny, color: C.bgCard, fontWeight: '900' },
});
