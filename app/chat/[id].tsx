import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../../src/services/api';
import { useAuth } from '../../src/store/auth';
import { C, F, R, UI } from '../../src/shared/design';
import { encodeRouteParam, normalizeRouteParam, safeDecodeRouteParam } from '../../src/shared/routeParams';
import { AppButton, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const layout = useAppLayoutMetrics();
  const qc = useQueryClient();
  const listRef = useRef<FlatList>(null);
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(true);
  const conversationId = safeDecodeRouteParam(normalizeRouteParam(id));
  const conversationRouteId = encodeRouteParam(conversationId);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['chat', conversationRouteId],
    queryFn: () => get(`/chat/conversations/${conversationRouteId}/messages`),
    enabled: !!conversationRouteId,
    refetchInterval: isFocused ? 3000 : false,
    retry: false,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => post(`/chat/conversations/${conversationRouteId}/messages`, { content }),
    onSuccess: () => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['chat', conversationRouteId] });
    },
  });

  const messages = (data as any)?.messages || (Array.isArray(data) ? data : []);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const send = () => {
    const value = message.trim();
    if (!value || !conversationRouteId) return;
    sendMutation.mutate(value);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: layout.screenTop }]}>
        <AppTopBar eyebrow="Чат" title="Мессеж" style={{ marginBottom: 0 }} />
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={C.brand} />
          <Text style={styles.mutedText}>Мессежүүд ачаалж байна...</Text>
        </View>
      ) : (
        isError ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={46} color={C.textMuted} />
            <Text style={styles.emptyTitle}>Чат ачаалж чадсангүй</Text>
            <Text style={styles.mutedText}>
              {(error as Error)?.message || 'Сүлжээ эсвэл серверийн алдаа гарлаа.'}
            </Text>
            <AppButton
              label={isRefetching ? 'Шалгаж байна' : 'Дахин оролдох'}
              icon="refresh"
              disabled={isRefetching}
              onPress={() => refetch()}
              style={{ marginTop: R.sm, minWidth: 160 }}
            />
          </View>
        ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item: any, index) => String(item.id ?? item._id ?? `msg-${index}`)}
          contentContainerStyle={[styles.messages, { paddingBottom: layout.insets.bottom + R.lg }]}
          renderItem={({ item }) => <MessageBubble item={item} userId={user?.id || user?._id} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={46} color={C.textMuted} />
              <Text style={styles.emptyTitle}>Мессеж байхгүй байна</Text>
              <Text style={styles.mutedText}>Эхний мессежээ бичээд харилцаагаа эхлүүлээрэй.</Text>
            </View>
          }
        />
        )
      )}

      <View style={[styles.inputRow, { paddingBottom: layout.insets.bottom + R.md }]}>
        <TextInput
          placeholder="Мессеж бичих..."
          placeholderTextColor={C.textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          returnKeyType="send"
          accessibilityLabel="Мессеж бичих"
          accessibilityHint="Чатад илгээх мессежээ бичнэ үү"
          style={styles.input}
        />
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={send}
          disabled={!message.trim() || !conversationRouteId || sendMutation.isPending}
          accessibilityRole="button"
          accessibilityLabel="Мессеж илгээх"
          accessibilityState={{ disabled: !message.trim() || !conversationRouteId || sendMutation.isPending }}
          style={[styles.sendButton, !message.trim() || !conversationRouteId || sendMutation.isPending ? styles.sendButtonDisabled : null]}
        >
          <Ionicons name="send" size={18} color={message.trim() && conversationRouteId && !sendMutation.isPending ? C.bgCard : C.textMuted} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ item, userId }: { item: any; userId?: string }) {
  const mine = item.senderId === userId || item.sender?._id === userId;
  return (
    <View style={[styles.messageWrap, mine ? styles.mineWrap : styles.theirWrap]}>
      <View style={[styles.bubble, mine ? styles.mineBubble : styles.theirBubble]}>
        <Text style={[styles.messageText, mine ? styles.mineText : styles.theirText]}>{item.content}</Text>
      </View>
      <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
    </View>
  );
}

function formatTime(value?: string | number | Date) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: UI.screenPad,
    paddingBottom: R.md,
    backgroundColor: C.bg,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: R.sm },
  messages: { padding: UI.screenPad },
  empty: { alignItems: 'center', gap: R.sm, marginTop: 60 },
  emptyTitle: { ...F.body, color: C.text, fontWeight: '900', textAlign: 'center' },
  mutedText: { ...F.small, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
  messageWrap: { marginBottom: R.sm },
  mineWrap: { alignItems: 'flex-end' },
  theirWrap: { alignItems: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: UI.cardRadius, padding: R.md },
  mineBubble: { backgroundColor: C.primary, borderBottomRightRadius: R.xs },
  theirBubble: { backgroundColor: C.bgCard, borderBottomLeftRadius: R.xs, borderWidth: 1, borderColor: C.border },
  messageText: { ...F.small, lineHeight: 20 },
  mineText: { color: C.bgCard },
  theirText: { color: C.text },
  timeText: { ...F.tiny, color: C.textMuted, marginTop: 3 },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: UI.screenPad,
    paddingTop: R.md,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bgCard,
    gap: R.sm,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: C.bgSection,
    borderRadius: UI.controlRadius,
    paddingHorizontal: R.md,
    paddingVertical: R.sm,
    color: C.text,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: C.border,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: R.full,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: C.bgSection, borderWidth: 1, borderColor: C.border },
});
