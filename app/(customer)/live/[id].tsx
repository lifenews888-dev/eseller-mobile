import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { LiveAPI } from '../../../src/services/api';
import { C, F, R, UI } from '../../../src/shared/design';
import {
  getPublicProductQualityIssue,
  firstProductImage,
} from '../../../src/shared/productQuality';
import { AppTopBar, useAppLayoutMetrics } from '../../../src/shared/ui/AppUI';

const LIVE_ACCENT = C.error;

function unwrap<T = any>(res: any): T {
  return (res?.data ?? res) as T;
}

interface Product { id: string; name: string; price: number; images?: string[] }
interface LiveProduct { id: string; productId: string; flashPrice?: number; flashStock?: number; soldCount: number; isPinned: boolean; product: Product }
interface Message { id: string; content: string; type: string; createdAt: string; user: { id: string; name: string } }
interface StreamDetail {
  id: string; title: string; status: string; viewerCount: number;
  youtubeUrl?: string; facebookUrl?: string; muxPlaybackId?: string; embedType?: string;
  scheduledAt?: string;
  shop: { id: string; name: string };
  host: { id: string; name: string };
  products: LiveProduct[];
  messages: Message[];
}

function productWithLivePrice(lp: LiveProduct) {
  return {
    ...lp.product,
    salePrice: lp.flashPrice ?? null,
  };
}

function getEmbedUrl(stream: StreamDetail): string | null {
  if (stream.youtubeUrl) {
    const patterns = [/youtube\.com\/live\/([^?&#]+)/, /youtube\.com\/watch\?v=([^&#]+)/, /youtu\.be\/([^?&#]+)/];
    for (const p of patterns) {
      const m = stream.youtubeUrl.match(p);
      if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1&playsinline=1`;
    }
  }
  if (stream.facebookUrl) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(stream.facebookUrl)}&autoplay=true`;
  }
  return null;
}

function fmt(n: number) { return n.toLocaleString() + '₮'; }

export default function LiveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const layout = useAppLayoutMetrics();
  const [stream, setStream] = useState<StreamDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const chatRef = useRef<ScrollView>(null);

  const fetchStream = useCallback(async () => {
    if (!id) return;
    try {
      const res = await LiveAPI.getById(id);
      const data = unwrap<StreamDetail>(res);
      if (data) {
        setStream(data);
        setMessages((data.messages || []).slice().reverse());
      }
    } catch (e) {
      if (__DEV__) console.warn('[live fetchStream]', e);
    }
  }, [id]);

  useEffect(() => {
    fetchStream();
    // Stream дууссан бол polling эхлүүлэхгүй — үүнгүйгээр секунд тутамд
    // ENDED stream-д шаардлагагүй network storm үүсэх болно
    if (stream?.status === 'ENDED') return;
    const interval = setInterval(fetchStream, 5000);
    return () => clearInterval(interval);
  }, [fetchStream, stream?.status]);

  useEffect(() => {
    setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const sendMessage = async () => {
    if (!chatInput.trim() || sending || !id) return;
    setSending(true);
    try {
      const res = await LiveAPI.sendMessage(id, chatInput.trim());
      const msg = unwrap<Message>(res);
      if (msg?.id) {
        setMessages((prev) => [...prev, msg]);
        setChatInput('');
      }
    } catch (e) {
      if (__DEV__) console.warn('[live sendMessage]', e);
    }
    setSending(false);
  };

  const handlePurchase = async (productId: string) => {
    if (purchasing || !id) return;
    setPurchasing(productId);
    try {
      const res = await LiveAPI.purchase(id, productId);
      const body = unwrap<any>(res);
      if (body?.id || body?.orderId) {
        Alert.alert('Амжилттай', 'Захиалга үүслээ!');
        fetchStream();
      } else {
        Alert.alert('Алдаа', (res as any)?.error || 'Алдаа гарлаа');
      }
    } catch (e: any) {
      Alert.alert('Алдаа', e?.message || 'Алдаа гарлаа');
    }
    setPurchasing(null);
  };

  if (!stream) {
    return (
      <View style={styles.container}>
        <View style={[styles.topBarWrap, { paddingTop: layout.screenTop }]}>
          <AppTopBar eyebrow="Шууд худалдаа" title="Дэлгэрэнгүй" style={{ marginBottom: 0 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={LIVE_ACCENT} />
          <Text style={styles.loadingText}>Дамжуулалтын мэдээлэл ачааллаж байна...</Text>
        </View>
      </View>
    );
  }

  const isLive = stream.status === 'LIVE';
  const embedUrl = getEmbedUrl(stream);
  const visibleProducts = stream.products.filter((item) => !getPublicProductQualityIssue(productWithLivePrice(item)));

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.topBarWrap, { paddingTop: layout.screenTop }]}>
        <AppTopBar eyebrow="Шууд худалдаа" title={stream.title} style={{ marginBottom: 0 }} />
      </View>

      {embedUrl ? (
        <View style={styles.video}>
          <WebView
            accessibilityLabel={`${stream.title} шууд видео`}
            source={{ uri: embedUrl }}
            style={{ flex: 1 }}
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
          />
          <View style={[styles.topBar, { position: 'absolute' }]}>
            <View style={styles.topRight}>
              {isLive && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>ШУУД</Text>
                </View>
              )}
              <View style={styles.viewerBadge}>
                <Ionicons name="people-outline" size={12} color={C.bgCard} />
                <Text style={styles.viewerText}>{stream.viewerCount}</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.video}>
          <Ionicons name="videocam-outline" size={40} color={C.textMuted} />
          <Text style={styles.videoTitle}>{stream.title}</Text>
          <Text style={styles.videoShop}>{stream.shop.name}</Text>
          <View style={styles.topBar}>
            <View style={styles.topRight}>
              {isLive && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>ШУУД</Text>
                </View>
              )}
              <View style={styles.viewerBadge}>
                <Ionicons name="people-outline" size={12} color={C.bgCard} />
                <Text style={styles.viewerText}>{stream.viewerCount}</Text>
              </View>
            </View>
          </View>
          {!isLive && (
            <View style={styles.overlay}>
              <Text style={styles.overlayText}>{stream.status === 'ENDED' ? 'Дууссан' : 'Удахгүй эхлэнэ'}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.productsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Дамжуулалтын бүтээгдэхүүн</Text>
          <Text style={styles.sectionCount}>{visibleProducts.length}</Text>
        </View>
        <FlatList
          horizontal
          data={visibleProducts}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
          ListEmptyComponent={
            <View style={styles.emptyProducts}>
              <Ionicons name="bag-outline" size={22} color={C.textMuted} />
              <Text style={styles.emptyProductsText}>Одоогоор бараа нэмэгдээгүй байна</Text>
            </View>
          }
          renderItem={({ item: lp }) => {
            const effectivePrice = lp.flashPrice ?? lp.product.price;
            const hasDiscount = lp.flashPrice != null && lp.flashPrice < lp.product.price;
            const remaining = lp.flashStock != null ? lp.flashStock - lp.soldCount : null;
            const qualityIssue = getPublicProductQualityIssue(productWithLivePrice(lp));
            return (
              <View style={styles.productCard}>
                <View style={styles.productThumb}>
                  <Image source={{ uri: firstProductImage(lp.product) }} style={styles.productImage} />
                  {lp.isPinned && (
                    <View style={styles.pinBadge}>
                      <Ionicons name="pin" size={10} color={C.bgCard} />
                    </View>
                  )}
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{lp.product.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.flashPrice}>{fmt(effectivePrice)}</Text>
                    {hasDiscount && <Text style={styles.originalPrice}>{fmt(lp.product.price)}</Text>}
                  </View>
                  {remaining !== null && <Text style={styles.stockText}>Үлдсэн: {remaining}</Text>}
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`${lp.product.name} авах`}
                    activeOpacity={0.84}
                    style={[styles.buyBtn, (!isLive || !!qualityIssue || (remaining !== null && remaining <= 0)) && styles.buyBtnDisabled]}
                    disabled={!!purchasing || !isLive || !!qualityIssue || (remaining !== null && remaining <= 0)}
                    onPress={() => handlePurchase(lp.productId)}
                  >
                    <Text style={styles.buyBtnText}>
                      {purchasing === lp.productId ? '...' : remaining !== null && remaining <= 0 ? 'Дууссан' : 'Авах'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      </View>

      <View style={styles.chatSection}>
        <ScrollView ref={chatRef} style={styles.chatScroll} contentContainerStyle={{ paddingVertical: 8 }}>
          {messages.map((msg) => (
            <View key={msg.id} style={styles.chatMsg}>
              {msg.type === 'PURCHASE' ? (
                <View style={styles.purchaseMsg}>
                  <Text style={styles.purchaseMsgText}>
                    <Text style={{ fontWeight: '700' }}>{msg.user.name}</Text> {msg.content}
                  </Text>
                </View>
              ) : msg.type === 'JOIN' ? (
                <Text style={styles.joinMsg}>{msg.user.name} нэгдлээ</Text>
              ) : (
                <Text style={styles.textMsg}>
                  <Text style={styles.msgUser}>{msg.user.name} </Text>
                  {msg.content}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
        <View style={[styles.chatInputRow, { paddingBottom: layout.insets.bottom + R.md }]}>
          <TextInput
            accessibilityLabel="Шууд чатад мессеж бичих"
            style={styles.chatInput}
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="Мессеж бичих..."
            placeholderTextColor={C.textMuted}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Шууд чатад мессеж илгээх"
            activeOpacity={0.84}
            hitSlop={8}
            style={[styles.sendBtn, (!chatInput.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!chatInput.trim() || sending}
          >
            <Ionicons name="send" size={18} color={C.bgCard} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  loadingText: { ...F.small, color: C.textMuted, marginTop: R.md },
  topBarWrap: { paddingHorizontal: UI.screenPad, paddingBottom: R.md, backgroundColor: C.bg },
  video: { height: 220, backgroundColor: C.text, justifyContent: 'center', alignItems: 'center' },
  videoTitle: { ...F.h3, color: C.bgCard, marginTop: 8 },
  videoShop: { ...F.small, color: C.bgCard + 'B8', marginTop: 2 },
  topBar: { position: 'absolute', top: 50, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: LIVE_ACCENT, paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.sm },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.bgCard },
  liveText: { color: C.bgCard, fontSize: 10, fontWeight: '800' },
  viewerBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.text + '99', paddingHorizontal: 6, paddingVertical: 2, borderRadius: R.xs },
  viewerText: { color: C.bgCard, fontSize: 10 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: C.text + '80', justifyContent: 'center', alignItems: 'center' },
  overlayText: { color: C.bgCard, fontSize: 18, fontWeight: '700' },
  productsSection: { paddingVertical: R.md, backgroundColor: C.bg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: UI.screenPad,
    marginBottom: R.sm,
  },
  sectionTitle: { ...F.h4, color: C.text },
  sectionCount: { ...F.tiny, color: C.textMuted, fontWeight: '800' },
  emptyProducts: {
    width: 220,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    padding: R.md,
  },
  emptyProductsText: { ...F.tiny, color: C.textMuted, marginTop: R.xs, textAlign: 'center' },
  productCard: {
    width: 148,
    backgroundColor: C.bgCard,
    borderRadius: R.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  productThumb: { height: 84, backgroundColor: C.bgSection, justifyContent: 'center', alignItems: 'center' },
  productImage: { width: '100%', height: '100%' },
  pinBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: C.gold, padding: 3, borderRadius: R.xs },
  productInfo: { padding: R.sm },
  productName: { ...F.tiny, color: C.text, fontWeight: '800' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 3 },
  flashPrice: { color: LIVE_ACCENT, fontWeight: '900', fontSize: 13 },
  originalPrice: { color: C.textMuted, fontSize: 10, textDecorationLine: 'line-through' },
  stockText: { color: C.textMuted, fontSize: 10, marginTop: 2 },
  buyBtn: { marginTop: 6, backgroundColor: LIVE_ACCENT, paddingVertical: 7, borderRadius: R.sm, alignItems: 'center' },
  buyBtnDisabled: { backgroundColor: C.border2 },
  buyBtnText: { color: C.bgCard, fontSize: 12, fontWeight: '800' },
  chatSection: { flex: 1, backgroundColor: C.bgCard, borderTopWidth: 1, borderTopColor: C.border },
  chatScroll: { flex: 1, paddingHorizontal: 12 },
  chatMsg: { marginBottom: 4 },
  purchaseMsg: { backgroundColor: C.goldDim, borderWidth: 1, borderColor: C.gold + '45', borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 6 },
  purchaseMsgText: { color: C.seller, fontSize: 13 },
  joinMsg: { color: C.textMuted, fontSize: 11, textAlign: 'center' },
  textMsg: { color: C.text, fontSize: 13 },
  msgUser: { color: C.primary, fontWeight: '800' },
  chatInputRow: { flexDirection: 'row', gap: R.sm, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
  chatInput: { flex: 1, backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 8, color: C.text, fontSize: 14 },
  sendBtn: { backgroundColor: LIVE_ACCENT, padding: 10, borderRadius: R.md, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: C.border2 },
});
