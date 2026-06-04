import { useRef, useState } from 'react';
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
import { apiUrl } from '../../src/config/apiBase';
import { C, F, R, UI } from '../../src/shared/design';
import { AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  '50,000₮-н бэлэг хайж байна',
  'Гэрийн тавилга',
  'Хүүхдийн хувцас',
  'Эрэгтэй гутал',
];

export default function AIShopperScreen() {
  const layout = useAppLayoutMetrics();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Сайн байна уу! Би таны хувийн худалдааны туслах. Юу хайж байна вэ?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  async function send(text?: string) {
    const msg = text ?? input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(apiUrl('/ai/shop'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.data?.reply || data.reply || 'Уучлаарай, хариу алга.';

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'assistant', content: 'Уучлаарай, алдаа гарлаа.' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.headerWrap, { paddingTop: layout.screenTop }]}>
        <AppTopBar eyebrow="Дэлгүүр" title="AI туслах" showBack={false} />
        <AppHeader
          title="AI худалдааны туслах"
          subtitle="Бараа хайх, зөвлөгөө авах"
          icon="sparkles-outline"
          accent={C.brand}
          style={{ marginBottom: 0 }}
        />
      </View>

      <View style={s.quickRow}>
        {QUICK_PROMPTS.map((prompt) => (
          <TouchableOpacity
            key={prompt}
            accessibilityRole="button"
            accessibilityLabel={`${prompt} асуух`}
            activeOpacity={0.86}
            onPress={() => send(prompt)}
            style={s.quickChip}
          >
            <Text style={s.quickText}>{prompt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(message) => message.id}
        contentContainerStyle={[s.messageList, { paddingBottom: R.lg + layout.insets.bottom }]}
        renderItem={({ item }) => (
          <View style={[s.bubble, item.role === 'user' ? s.userBubble : s.aiBubble]}>
            <Text style={[s.bubbleText, item.role === 'user' ? s.userText : s.aiText]}>
              {item.content}
            </Text>
          </View>
        )}
      />

      {loading ? (
        <View style={s.loadingRow}>
          <ActivityIndicator size="small" color={C.brand} />
          <Text style={s.loadingText}>Хайж байна...</Text>
        </View>
      ) : null}

      <View style={[s.inputRow, { paddingBottom: layout.insets.bottom + R.md }]}>
        <TextInput
          accessibilityLabel="AI туслахаас хайх зүйлээ бичих"
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Юу хайж байна вэ?"
          placeholderTextColor={C.textMuted}
          returnKeyType="send"
          onSubmitEditing={() => send()}
          multiline
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="AI туслах руу илгээх"
          activeOpacity={0.86}
          onPress={() => send()}
          style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="arrow-up" size={18} color={C.bgCard} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  headerWrap: { padding: R.lg, paddingBottom: R.sm },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: R.xs,
    paddingHorizontal: R.lg,
    paddingBottom: R.md,
  },
  quickChip: {
    backgroundColor: C.bgCard,
    borderRadius: R.full,
    paddingHorizontal: R.md,
    paddingVertical: R.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  quickText: { ...F.tiny, color: C.textSub, fontWeight: '800' },
  messageList: { padding: R.lg, paddingBottom: R.lg, gap: R.sm },
  bubble: { maxWidth: '82%', borderRadius: UI.cardRadius, padding: R.md },
  userBubble: { backgroundColor: C.brand, alignSelf: 'flex-end', borderBottomRightRadius: R.xs },
  aiBubble: {
    backgroundColor: C.bgCard,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: R.xs,
    borderWidth: 1,
    borderColor: C.border,
  },
  bubbleText: { ...F.small, lineHeight: 20 },
  userText: { color: C.bgCard },
  aiText: { color: C.text },
  loadingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: R.lg, paddingBottom: R.sm },
  loadingText: { ...F.tiny, color: C.textSub, marginLeft: R.xs },
  inputRow: {
    flexDirection: 'row',
    gap: R.sm,
    padding: R.md,
    backgroundColor: C.bgCard,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  input: {
    flex: 1,
    backgroundColor: C.bgSection,
    borderRadius: UI.controlRadius,
    paddingHorizontal: R.md,
    paddingVertical: R.sm,
    fontSize: 14,
    color: C.text,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: C.border,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: UI.controlRadius,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  sendBtnDisabled: { backgroundColor: C.border2 },
});
