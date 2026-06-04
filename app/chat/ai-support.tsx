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
import { Stack } from 'expo-router';
import { post } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import { AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const QUICK = [
  'Захиалга хаана байна?',
  'Буцаалт хэрхэн хийх вэ?',
  'Оноо хэрхэн ашиглах вэ?',
  'Хүргэлтийн хугацаа?',
];

const INTRO_MESSAGE: Message = {
  id: '0',
  role: 'assistant',
  content: 'Сайн байна уу! Би eSeller.mn-ийн AI туслах. Захиалга, хүргэлт, буцаалт, хэтэвч, онооны талаар тусална. Юу асуух вэ?',
};

export default function AISupportScreen() {
  const layout = useAppLayoutMetrics();
  const [messages, setMessages] = useState<Message[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const send = async (text: string) => {
    const value = text.trim();
    if (!value || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: value };
    setMessages((current) => [...current, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((item) => ({ role: item.role, content: item.content }));
      const res: any = await post('/chat/ai', { message: value, history });
      const reply = res?.reply || res?.message || res?.content || 'Уучлаарай, хариулж чадсангүй.';
      setMessages((current) => [...current, { id: `${Date.now() + 1}`, role: 'assistant', content: reply }]);
    } catch {
      setMessages((current) => [...current, {
        id: `${Date.now() + 1}`,
        role: 'assistant',
        content: 'Холболтын алдаа. Дахин оролдоно уу.',
      }]);
    }
    setLoading(false);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingTop: layout.screenTop, paddingBottom: layout.insets.bottom + R.lg },
        ]}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        ListHeaderComponent={
          <>
            <AppTopBar eyebrow="Дэмжлэг" title="AI туслах" />
            <AppHeader
              title="AI туслах"
              subtitle="Захиалга, хүргэлт, буцаалт, хэтэвчийн талаар хурдан асуугаарай."
              icon="sparkles-outline"
              accent={C.primary}
              style={{ marginBottom: R.md }}
            />
            <View style={styles.quickRow}>
              {QUICK.map((item) => (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.84}
                  disabled={loading}
                  onPress={() => send(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item} хурдан асуулт илгээх`}
                  accessibilityState={{ disabled: loading }}
                  style={[styles.quickChip, loading ? styles.quickChipDisabled : null]}
                >
                  <Text style={styles.quickText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        renderItem={({ item }) => <AiMessage item={item} />}
      />

      {loading ? <ActivityIndicator color={C.primary} style={styles.loader} /> : null}

      <View style={[styles.inputRow, { paddingBottom: layout.insets.bottom + R.md }]}>
        <TextInput
          style={styles.input}
          placeholder="Асуултаа бичнэ үү..."
          placeholderTextColor={C.textMuted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
          accessibilityLabel="AI туслахаас асуух"
          accessibilityHint="Асуултаа бичээд илгээх товч дарна уу"
        />
        <TouchableOpacity
          activeOpacity={0.84}
          style={[styles.sendButton, !input.trim() || loading ? styles.sendButtonDisabled : null]}
          onPress={() => send(input)}
          disabled={!input.trim() || loading}
          accessibilityRole="button"
          accessibilityLabel="AI туслах руу илгээх"
          accessibilityState={{ disabled: !input.trim() || loading }}
        >
              <Ionicons name="send" size={18} color={input.trim() && !loading ? C.bgCard : C.textMuted} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function AiMessage({ item }: { item: Message }) {
  const mine = item.role === 'user';
  return (
    <View style={[styles.bubble, mine ? styles.userBubble : styles.aiBubble]}>
      {!mine ? (
        <View style={styles.aiIcon}>
          <Ionicons name="sparkles-outline" size={15} color={C.primary} />
        </View>
      ) : null}
      <Text style={[styles.bubbleText, mine ? styles.userText : styles.aiText]}>{item.content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  list: { padding: UI.screenPad },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: R.sm, marginBottom: R.md },
  quickChip: {
    backgroundColor: C.primaryDim,
    borderRadius: R.full,
    paddingHorizontal: R.md,
    paddingVertical: R.sm,
    borderWidth: 1,
    borderColor: `${C.primary}33`,
  },
  quickChipDisabled: { opacity: 0.55 },
  quickText: { ...F.tiny, color: C.primary, fontWeight: '900' },
  bubble: {
    flexDirection: 'row',
    maxWidth: '86%',
    borderRadius: UI.cardRadius,
    padding: R.md,
    marginBottom: R.sm,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: C.primary, borderBottomRightRadius: R.xs },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: C.bgCard, borderBottomLeftRadius: R.xs, borderWidth: 1, borderColor: C.border },
  aiIcon: {
    width: 24,
    height: 24,
    borderRadius: R.full,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: R.sm,
  },
  bubbleText: { ...F.small, lineHeight: 20, flex: 1 },
  userText: { color: C.bgCard },
  aiText: { color: C.text },
  loader: { marginBottom: R.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
    paddingHorizontal: UI.screenPad,
    paddingTop: R.md,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bgCard,
  },
  input: {
    flex: 1,
    minHeight: 44,
    backgroundColor: C.bgSection,
    borderRadius: UI.controlRadius,
    paddingHorizontal: R.md,
    paddingVertical: R.sm,
    color: C.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: R.full,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: C.bgSection, borderWidth: 1, borderColor: C.border },
});
