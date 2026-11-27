import { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity, ScrollView,
  StyleSheet, Dimensions, Animated, RefreshControl,
  TextInput, KeyboardAvoidingView, Platform, Modal,
  Share, ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SocialAPI } from '../../src/services/api';
import { apiUrl } from '../../src/config/apiBase';
import { useAuth } from '../../src/store/auth';
import { useCart } from '../../src/store/cart';
import { QuickBuyBottomSheet } from '../../src/components/QuickBuyBottomSheet';
import { GroupBuyCard } from '../../src/components/GroupBuyCard';
import { encodeApiPathSegment } from '../../src/shared/apiPath';
import { shadowStyle } from '../../src/shared/shadow';
import { C, R, UI } from '../../src/shared/design';
import {
  firstProductImage,
  getProductName,
  getPublicProductPrice,
  getPublicProductQualityIssue,
} from '../../src/shared/productQuality';
import { encodeRouteParam } from '../../src/shared/routeParams';
import { AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

const { height: H } = Dimensions.get('window');
type SocialTab = 'feed' | 'trending' | 'live';
const SOCIAL_TABS: Array<{ key: SocialTab; label: string; accessibilityLabel: string }> = [
  { key: 'feed', label: 'Мэдээ', accessibilityLabel: 'Нийгмийн мэдээ харах' },
  { key: 'trending', label: 'Тренд', accessibilityLabel: 'Тренд постууд харах' },
  { key: 'live', label: 'Шууд', accessibilityLabel: 'Шууд худалдаа руу очих' },
];

function normalizeSocialTab(value?: string | string[] | null): SocialTab {
  return value === 'trending' || value === 'live' ? value : 'feed';
}

function getProductRouteId(product: any): string {
  const id = product?.id ?? product?._id ?? product;
  return encodeRouteParam(id);
}

function SocialHeader({ showCreate = false }: { showCreate?: boolean }) {
  return (
    <View style={s.header}>
      <AppTopBar
        eyebrow="Пост, бараа, шууд худалдаа нэг дор"
        title="Нийгмийн худалдаа"
        showBack={false}
        right={showCreate ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Шинэ зар нэмэх"
            activeOpacity={0.84}
            onPress={() => router.push('/feed/create' as any)}
            style={s.createBtn}
          >
            <Ionicons name="add" size={15} color={C.bgCard} />
            <Text style={s.createBtnText}>Зар нэмэх</Text>
          </TouchableOpacity>
        ) : null}
        style={s.topBar}
      />
    </View>
  );
}

interface Post {
  id: string;
  content: string | null;
  images: string[];
  user: { id: string; name: string; avatar: string | null };
  products: {
    id: string;
    product: {
      id?: string;
      _id?: string;
      name?: string;
      title?: string;
      productName?: string;
      price: number;
      salePrice: number | null;
      images: string[];
    };
  }[];
  likes?: { id: string; userId: string }[];
  _count: { likes: number; comments: number };
  createdAt: string;
  isLiked?: boolean;
}

export default function SocialScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const layout = useAppLayoutMetrics();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const { user } = useAuth();

  // Tabs: feed | trending | live
  const [activeTab, setActiveTab] = useState<SocialTab>(() => normalizeSocialTab(params.tab));
  const [trending, setTrending] = useState<Post[]>([]);
  const [groupBuys, setGroupBuys] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [activeStory, setActiveStory] = useState<any>(null);
  const [storyProgress, setStoryProgress] = useState(0);

  useEffect(() => {
    const nextTab = normalizeSocialTab(params.tab);
    if (nextTab === 'live') {
      router.replace('/live' as any);
      return;
    }
    setActiveTab(nextTab);
  }, [params.tab]);

  function selectTab(nextTab: SocialTab) {
    if (nextTab === 'live') {
      router.push('/live' as any);
      return;
    }
    setActiveTab(nextTab);
    router.replace(
      nextTab === 'feed'
        ? ('/social' as any)
        : ({ pathname: '/social' as any, params: { tab: nextTab } } as any),
    );
  }

  // Fetch stories + group buys on mount
  useEffect(() => {
    // Unmount үед stale setState хийхгүй — async response буцаж ирэх үед
    // component аль хэдийн destroy болсон бол "can't setState on unmounted"
    // warning гарна.
    let mounted = true;
    fetch(apiUrl('/stories'))
      .then((r) => r.json())
      .then((d) => { if (mounted) setStories(d?.data?.stories || []); })
      .catch((e) => { if (__DEV__) console.warn('[stories]', e); });
    fetch(apiUrl('/group-buy'))
      .then((r) => r.json())
      .then((d) => { if (mounted) setGroupBuys(d?.data?.groupBuys || []); })
      .catch((e) => { if (__DEV__) console.warn('[group-buy]', e); });
    return () => { mounted = false; };
  }, []);

  // Trending fetch
  useEffect(() => {
    if (activeTab === 'trending' && trending.length === 0) {
      fetch(apiUrl('/social/trending'))
        .then((r) => r.json())
        .then((d) => {
          const list = d?.data?.posts || [];
          setTrending(list.map((p: any) => ({ ...p, isLiked: false, likes: p.likes || [] })));
        })
        .catch(() => {});
    }
  }, [activeTab, trending.length]);

  // Story auto-advance
  useEffect(() => {
    if (!activeStory) return;
    const timer = setInterval(() => {
      setStoryProgress((p) => {
        if (p >= 100) {
          setActiveStory(null);
          return 0;
        }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [activeStory]);

  function openStory(story: any) {
    setActiveStory(story);
    setStoryProgress(0);
    fetch(apiUrl(`/stories/${encodeApiPathSegment(story.id)}/view`), { method: 'POST' }).catch(() => {});
  }

  function closeStory() {
    setActiveStory(null);
    setStoryProgress(0);
  }

  function handleGroupBuyJoin(id: string) {
    setGroupBuys((prev) =>
      prev.map((g) => (g.id === id ? { ...g, currentCount: g.currentCount + 1 } : g))
    );
  }

  async function fetchPosts(p = 1, replace = false) {
    try {
      const data: any = await SocialAPI.feed({ page: p, limit: 10 });
      const list = data?.data?.posts || data?.posts || [];
      const meta = data?.data?.meta || data?.meta || {};
      const mapped: Post[] = list.map((post: any) => ({
        ...post,
        likes: post.likes || [],
        isLiked: (post.likes || []).some((l: any) => l.userId === user?.id),
      }));
      setPosts((prev) => (replace ? mapped : [...prev, ...mapped]));
      setHasMore(meta.hasMore ?? false);
      setFeedError(null);
    } catch (e: any) {
      if (__DEV__) console.error('[social]', e);
      // Replace-mode (хамгийн анхны ачаалал / refresh) үед л error UI үзүүлнэ.
      // Pagination алдаа үед огт хуучин posts-ыг устгахгүй.
      if (replace) setFeedError(e?.message || 'Постыг татаж чадсангүй');
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { fetchPosts(1, true); }, []);

  function onRefresh() {
    setRefreshing(true);
    setPage(1);
    fetchPosts(1, true);
  }

  function onEndReached() {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    fetchPosts(next);
  }

  if (loading) {
    return (
      <View style={s.screen}>
        <View style={{ paddingTop: layout.screenTop }}>
          <SocialHeader />
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </View>
    );
  }

  if (feedError && posts.length === 0) {
    return (
      <View style={s.screen}>
        <View style={{ paddingTop: layout.screenTop }}>
          <SocialHeader />
        </View>
        <View style={[s.center, { padding: UI.screenPad }]}>
          <Ionicons name="alert-circle-outline" size={48} color={C.error} style={{ marginBottom: 12 }} />
          <Text style={s.emptyTitle}>Мэдээ татахад алдаа гарлаа</Text>
          <Text style={{ color: C.textSub, fontSize: 13, textAlign: 'center', marginVertical: 10 }}>
            {feedError}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Нийгмийн мэдээг дахин татах"
            activeOpacity={0.84}
            onPress={() => { setLoading(true); setFeedError(null); fetchPosts(1, true); }}
            style={{ backgroundColor: C.primary, borderRadius: R.md, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 }}
          >
            <Text style={{ color: C.bgCard, fontWeight: '600' }}>Дахин оролдох</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const storyRouteId = getProductRouteId(activeStory?.product);
  const storyProductName = getProductName(activeStory?.product) || 'Бараа';

  return (
    <View style={s.screen}>
      <View style={{ paddingTop: layout.screenTop }}>
        <SocialHeader showCreate />
      </View>

      <FlatList
        data={activeTab === 'trending' ? trending : posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLikeChange={(updated) =>
              setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
            }
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        contentContainerStyle={{ paddingBottom: layout.screenBottom }}
        ListHeaderComponent={
          <View>
            {/* Story circles */}
            {stories.length > 0 && (
              <View style={s.storyBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ padding: 10, gap: 12 }}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Шинэ зар нэмэх"
                    activeOpacity={0.84}
                    onPress={() => router.push('/feed/create' as any)}
                    style={s.storyItem}
                  >
                    <View style={s.storyAddCircle}>
                      <Text style={{ fontSize: 22, color: C.seller }}>＋</Text>
                    </View>
                    <Text style={s.storyName}>Минийх</Text>
                  </TouchableOpacity>
                  {stories.map((story) => (
                    <TouchableOpacity
                      key={story.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${story.user?.name || 'Хэрэглэгч'} түүх нээх`}
                      activeOpacity={0.84}
                      onPress={() => openStory(story)}
                      style={s.storyItem}
                    >
                      <View style={[
                        s.storyCircle,
                        { borderColor: story.product ? C.seller : C.primary },
                      ]}>
                        <Image
                          source={{ uri: story.user?.avatar || story.imageUrl }}
                          style={s.storyImg}
                        />
                        {story.product && (
                          <View style={s.storyProductBadge}>
                            <Ionicons name="bag-outline" size={10} color={C.bgCard} />
                          </View>
                        )}
                      </View>
                      <Text style={s.storyName} numberOfLines={1}>
                        {story.user?.name || 'Хэрэглэгч'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Tab switcher */}
            <View style={s.tabSwitcher}>
              {SOCIAL_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  accessibilityRole="button"
                  accessibilityLabel={tab.accessibilityLabel}
                  accessibilityState={{ selected: activeTab === tab.key }}
                  activeOpacity={0.84}
                  onPress={() => selectTab(tab.key)}
                  style={[s.tabBtn, activeTab === tab.key && s.tabBtnActive]}
                >
                  <Text style={[s.tabBtnText, activeTab === tab.key && s.tabBtnTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Group Buy cards (only on Feed tab) */}
            {activeTab === 'feed' && groupBuys.length > 0 && (
              <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
                {groupBuys.slice(0, 2).map((g) => (
                  <GroupBuyCard key={g.id} group={g} onJoin={handleGroupBuyJoin} />
                ))}
              </View>
            )}

            <View style={{ height: 12 }} />
          </View>
        }
        ListEmptyComponent={<EmptyFeed />}
      />

      {/* Story full-screen modal */}
      <Modal visible={!!activeStory} animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: C.text }}>
          <View style={s.storyProgressTrack}>
            <View style={[s.storyProgressFill, { width: `${storyProgress}%` as any }]} />
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Түүх хаах"
            hitSlop={8}
            onPress={closeStory}
            style={s.storyClose}
          >
            <Ionicons name="close" size={24} color={C.bgCard} />
          </TouchableOpacity>

          <View style={s.storyUserInfo}>
            <View style={s.storyUserAvatar}>
              <Text style={{ color: C.bgCard, fontSize: 12, fontWeight: '600' }}>
                {activeStory?.user?.name?.[0] || '?'}
              </Text>
            </View>
            <Text style={{ color: C.bgCard, fontSize: 13, fontWeight: '600' }}>
              {activeStory?.user?.name || 'Хэрэглэгч'}
            </Text>
          </View>

          {activeStory?.imageUrl && (
            <Image source={{ uri: activeStory.imageUrl }}
              style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          )}

          {activeStory?.caption && (
            <View style={[s.storyCaption, { bottom: activeStory?.product ? 140 : 60 }]}>
              <Text style={{ color: C.bgCard, fontSize: 13 }}>{activeStory.caption}</Text>
            </View>
          )}

          {activeStory?.product && !getPublicProductQualityIssue(activeStory.product) && (
            <View style={s.storyProductCard}>
              <Image source={{ uri: firstProductImage(activeStory.product) }}
                style={{ width: 52, height: 52, borderRadius: R.md }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }} numberOfLines={1}>
                  {storyProductName}
                </Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: C.primary }}>
                  {getPublicProductPrice(activeStory.product).toLocaleString()}₮
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${storyProductName} авах`}
                accessibilityState={{ disabled: !storyRouteId }}
                disabled={!storyRouteId}
                activeOpacity={0.84}
                onPress={() => {
                  closeStory();
                  if (storyRouteId) router.push(`/product/${storyRouteId}` as any);
                }}
                style={[s.storyBuyBtn, !storyRouteId && { opacity: 0.55 }]}
              >
                <Text style={{ color: C.bgCard, fontSize: 12, fontWeight: '600' }}>Авах</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST CARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function PostCard({
  post, onLikeChange,
}: {
  post: Post;
  onLikeChange: (p: Post) => void;
}) {
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post._count.likes);
  const [showComment, setShowComment] = useState(false);
  const [quickBuyProduct, setQuickBuyProduct] = useState<any>(null);
  const addToCart = useCart((state) => state.add);
  const visibleProducts = post.products.filter(({ product }) => !getPublicProductQualityIssue(product));
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const lastTap = useRef(0);
  const heartAnim = useRef(new Animated.Value(0)).current;

  function handleDoubleTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) handleLike();
      heartAnim.setValue(0);
      Animated.sequence([
        Animated.spring(heartAnim, { toValue: 1.5, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }
    lastTap.current = now;
  }

  async function handleLike() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => (newLiked ? c + 1 : c - 1));

    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.3, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();

    try {
      if (newLiked) await SocialAPI.like(post.id);
      else await SocialAPI.unlike(post.id);
      onLikeChange({ ...post, isLiked: newLiked, _count: { ...post._count, likes: newLiked ? likeCount + 1 : likeCount - 1 } });
    } catch {
      setLiked(!newLiked);
      setLikeCount((c) => (newLiked ? c - 1 : c + 1));
    }
  }

  function handleAddLocalCart(product: any) {
    const issue = getPublicProductQualityIssue(product);
    if (issue) {
      Alert.alert('Бараа шалгалтад байна', issue.message);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    addToCart(
      {
        id: product.id ?? product._id ?? '',
        name: getProductName(product) || 'Бараа',
        price: getPublicProductPrice(product),
        image: firstProductImage(product, '') || null,
        entityId: '',
        entityName: '',
      },
      1
    );
  }

  async function handleShare() {
    const product = post.products[0]?.product;
    const routeId = getProductRouteId(product);
    const name = getProductName(product) || 'eseller.mn';
    await Share.share({
      message: routeId ? `${post.content ?? ''}\n\nhttps://eseller.mn/product/${routeId}` : `${post.content ?? ''}`,
      title: name,
    });
  }

  const timeAgo = formatTimeAgo(post.createdAt);

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.avatar}>
          {post.user.avatar ? (
            <Image source={{ uri: post.user.avatar }} style={s.avatarImg} />
          ) : (
            <Text style={s.avatarText}>{post.user.name?.[0] || '?'}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.userName}>{post.user.name}</Text>
          <Text style={s.timeAgo}>{timeAgo}</Text>
        </View>
        <View style={s.moreBtn} accessible={false}>
          <Ionicons name="ellipsis-horizontal" size={18} color={C.textMuted} />
        </View>
      </View>

      {post.content && <Text style={s.postContent}>{post.content}</Text>}

      {post.images.length > 0 && (
        <TouchableOpacity
          activeOpacity={1}
          accessibilityRole="imagebutton"
          accessibilityLabel="Постын зураг, давхар товшиж таалах"
          onPress={handleDoubleTap}
          style={s.imageContainer}
        >
          <Image source={{ uri: post.images[0] }} style={s.postImage} resizeMode="cover" />
          <Animated.View style={[
            s.heartOverlay,
            { opacity: heartAnim, transform: [{ scale: heartAnim }] },
          ]}>
            <Ionicons name="heart" size={72} color={C.error} />
          </Animated.View>
        </TouchableOpacity>
      )}

      {visibleProducts.length > 0 && (
        <View style={s.productsSection}>
          <Text style={s.productsSectionTitle}>Бүтээгдэхүүнүүд</Text>
          {visibleProducts.map(({ id, product }) => {
            const routeId = getProductRouteId(product);
            const name = getProductName(product) || 'Бараа';

            return (
            <TouchableOpacity
              key={id || routeId || name}
              accessibilityRole="button"
              accessibilityLabel={`${name} бүтээгдэхүүн нээх`}
              accessibilityState={{ disabled: !routeId }}
              disabled={!routeId}
              activeOpacity={0.84}
              onPress={() => {
                if (routeId) router.push(`/product/${routeId}` as any);
              }}
              style={[s.productCard, !routeId && { opacity: 0.55 }]}
            >
              <Image
                source={{ uri: firstProductImage(product) }}
                style={s.productThumb}
              />
              <View style={s.productInfo}>
                <Text style={s.productName} numberOfLines={1}>{name}</Text>
                <Text style={s.productPrice}>
                  {getPublicProductPrice(product).toLocaleString()}₮
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${name} шууд авах`}
                activeOpacity={0.84}
                onPress={() => setQuickBuyProduct(product)}
                style={s.addCartBtn}
              >
                <Ionicons name="flash-outline" size={13} color={C.bgCard} />
                <Text style={s.addCartBtnText}>Шууд авах</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )})}
        </View>
      )}

      <View style={s.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Таалснаа болиулах' : 'Пост таалах'}
          accessibilityState={{ selected: liked }}
          activeOpacity={0.84}
          onPress={handleLike}
          style={s.actionBtn}
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={19} color={liked ? C.error : C.textSub} />
          </Animated.View>
          <Text style={[s.actionCount, liked && { color: C.error }]}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Сэтгэгдэл нээх"
          activeOpacity={0.84}
          onPress={() => setShowComment(true)}
          style={s.actionBtn}
        >
          <Ionicons name="chatbubble-outline" size={18} color={C.textSub} />
          <Text style={s.actionCount}>{post._count.comments}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Пост хуваалцах"
          activeOpacity={0.84}
          onPress={handleShare}
          style={s.actionBtn}
        >
          <Ionicons name="share-social-outline" size={18} color={C.textSub} />
          <Text style={s.actionCount}>Хуваалцах</Text>
        </TouchableOpacity>
      </View>

      <CommentModal postId={post.id} visible={showComment} onClose={() => setShowComment(false)} />

      {quickBuyProduct && (
        <QuickBuyBottomSheet
          product={quickBuyProduct}
          visible={!!quickBuyProduct}
          onClose={() => setQuickBuyProduct(null)}
          onSuccess={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setQuickBuyProduct(null);
          }}
        />
      )}
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMENT MODAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CommentModal({
  postId, visible, onClose,
}: {
  postId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      SocialAPI.comments(postId)
        .then((d: any) => setComments(d?.data?.comments || d?.comments || []))
        .catch(() => {});
    }
  }, [visible, postId]);

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const resp: any = await SocialAPI.comment(postId, text.trim());
      const data = resp?.data || resp;
      // Server returns { comment, botReply }
      const newComment = data?.comment || data;
      const botReply = data?.botReply;

      setComments((prev) => [newComment, ...prev]);
      setText('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Bot reply — synthetic comment with isBot flag
      if (botReply) {
        setTimeout(() => {
          setComments((prev) => [
            {
              id: `bot-${Date.now()}`,
              content: botReply.content,
              user: { name: 'eSeller Bot' },
              isBot: true,
              quickBuyProductId: botReply.productId,
            },
            ...prev,
          ]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 800);
      }
    } catch {}
    setSending(false);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Сэтгэгдлийн цонх хаах"
        style={s.modalOverlay}
        onPress={onClose}
        activeOpacity={1}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.commentSheet}
      >
        <View style={s.sheetHandle} />
        <Text style={s.sheetTitle}>Сэтгэгдлүүд</Text>

        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          style={{ flex: 1, paddingHorizontal: 16 }}
          renderItem={({ item }) =>
            item.isBot ? (
              <View style={s.commentItem}>
                <View style={[s.commentAvatar, { backgroundColor: C.seller }]}>
                  <Ionicons name="sparkles-outline" size={15} color={C.bgCard} />
                </View>
                <View style={s.botBubble}>
                  <Text style={s.botLabel}>eSeller Bot</Text>
                  <Text style={s.commentText}>{item.content}</Text>
                  {item.quickBuyProductId && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Бүтээгдэхүүн рүү очиж захиалах"
                      activeOpacity={0.84}
                      onPress={() => {
                        const routeId = getProductRouteId(item.quickBuyProductId);
                        onClose();
                        if (routeId) router.push(`/product/${routeId}` as any);
                      }}
                      style={s.botBuyBtn}
                    >
                      <Text style={s.botBuyBtnText}>Шууд захиалах</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View style={s.commentItem}>
                <View style={s.commentAvatar}>
                  <Text style={s.commentAvatarText}>{item.user?.name?.[0] || '?'}</Text>
                </View>
                <View style={s.commentBody}>
                  <Text style={s.commentUser}>{item.user?.name || 'Хэрэглэгч'}</Text>
                  <Text style={s.commentText}>{item.content}</Text>
                </View>
              </View>
            )
          }
          ListEmptyComponent={<Text style={s.emptyText}>Сэтгэгдэл байхгүй байна</Text>}
        />

        <View style={s.commentInput}>
          <TextInput
            accessibilityLabel="Сэтгэгдэл бичих"
            style={s.commentTextInput}
            placeholder="Сэтгэгдэл бичих..."
            value={text}
            onChangeText={setText}
            multiline
            returnKeyType="send"
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Сэтгэгдэл илгээх"
            activeOpacity={0.84}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={[s.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
          >
            <Ionicons name="arrow-up" size={16} color={C.bgCard} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMPTY STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function EmptyFeed() {
  return (
    <View style={s.empty}>
      <Ionicons name="images-outline" size={48} color={C.textMuted} style={{ marginBottom: 12 }} />
      <Text style={s.emptyTitle}>Одоогоор пост байхгүй</Text>
      <Text style={s.emptySub}>Найзуудынхаа худалдан авалтыг энд харна</Text>
    </View>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'Дөнгөж сая';
  if (m < 60) return `${m} мин`;
  if (h < 24) return `${h} цаг`;
  return `${d} өдөр`;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    minHeight: UI.headerMinHeight,
    justifyContent: 'center',
    paddingHorizontal: UI.screenPad,
    paddingBottom: R.sm,
    backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  topBar: { marginBottom: 0 },
  createBtn: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.primary,
    borderRadius: R.full,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  createBtnText: { color: C.bgCard, fontSize: 12, fontWeight: '800' },
  card: {
    backgroundColor: C.bgCard, borderRadius: R.lg,
    ...shadowStyle({ y: 2, blur: 8, opacity: 0.06, elevation: 2 }),
    overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  avatar: {
    width: 40, height: 40, borderRadius: R.full, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 40, height: 40 },
  avatarText: { color: C.bgCard, fontSize: 16, fontWeight: '600' },
  userName: { fontSize: 14, fontWeight: '600', color: C.text },
  timeAgo: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  moreBtn: { padding: 4 },
  postContent: { fontSize: 14, color: C.text, lineHeight: 20, paddingHorizontal: 14, paddingBottom: 10 },
  imageContainer: { width: '100%', aspectRatio: 1, position: 'relative' },
  postImage: { width: '100%', height: '100%' },
  heartOverlay: { position: 'absolute', top: '40%', left: '40%' },
  productsSection: { padding: 12, borderTopWidth: 1, borderTopColor: C.border },
  productsSectionTitle: { fontSize: 11, color: C.textSub, marginBottom: 8, fontWeight: '500' },
  productCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  productThumb: { width: 52, height: 52, borderRadius: R.md, backgroundColor: C.bgSection },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: '500', color: C.text },
  productPrice: { fontSize: 14, fontWeight: '700', color: C.primary, marginTop: 2 },
  addCartBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  addCartBtnText: { color: C.bgCard, fontSize: 11, fontWeight: '500' },
  actions: {
    flexDirection: 'row', gap: 4, padding: 12, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8,
  },
  actionIcon: { fontSize: 18 },
  actionCount: { fontSize: 13, color: C.textSub, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: C.text + '66' },
  commentSheet: { backgroundColor: C.bgCard, borderRadius: R.xxl, maxHeight: H * 0.75, paddingBottom: 24 },
  sheetHandle: { width: 36, height: 4, backgroundColor: C.border2, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: C.text, padding: 16, paddingBottom: 12 },
  commentItem: { flexDirection: 'row', gap: 10, paddingVertical: 8, alignItems: 'flex-start' },
  commentAvatar: {
    width: 32, height: 32, borderRadius: R.lg, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  commentAvatarText: { color: C.bgCard, fontSize: 12, fontWeight: '600' },
  commentBody: { flex: 1 },
  commentUser: { fontSize: 12, fontWeight: '600', color: C.text },
  commentText: { fontSize: 13, color: C.textSub, marginTop: 2, lineHeight: 18 },
  commentInput: {
    flexDirection: 'row', gap: 8, padding: 12,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  commentTextInput: {
    flex: 1, backgroundColor: C.bgSection, borderRadius: R.xl,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 13, maxHeight: 80,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: R.full, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end',
  },
  emptyText: { textAlign: 'center', color: C.textMuted, fontSize: 13, padding: UI.screenPad },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.text },
  emptySub: { fontSize: 13, color: C.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 18 },

  // Story bar
  storyBar: { backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.border },
  storyItem: { alignItems: 'center', gap: 4 },
  storyAddCircle: {
    width: 56, height: 56, borderRadius: R.full,
    borderWidth: 2, borderColor: C.seller, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.goldDim,
  },
  storyCircle: {
    width: 56, height: 56, borderRadius: R.full, padding: 2, borderWidth: 2,
    position: 'relative',
  },
  storyImg: { width: 48, height: 48, borderRadius: R.xxl },
  storyProductBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 18, height: 18, borderRadius: R.full,
    backgroundColor: C.seller, borderWidth: 1.5, borderColor: C.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  storyName: { fontSize: 9, color: C.textSub, maxWidth: 56 },

  // Story modal
  storyProgressTrack: {
    position: 'absolute', top: 48, left: 12, right: 12,
    height: 2.5, backgroundColor: C.bgCard + '4D',
    borderRadius: 2, zIndex: 10,
  },
  storyProgressFill: { height: '100%', backgroundColor: C.bgCard, borderRadius: 2 },
  storyClose: {
    position: 'absolute', top: 52, right: 16, zIndex: 11,
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
  },
  storyUserInfo: {
    position: 'absolute', top: 62, left: 16, zIndex: 11,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  storyUserAvatar: {
    width: 32, height: 32, borderRadius: R.lg, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  storyCaption: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: C.text + '80', borderRadius: R.md, padding: 10,
  },
  storyProductCard: {
    position: 'absolute', bottom: 40, left: 16, right: 16,
    backgroundColor: C.bgCard, borderRadius: R.lg, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  storyBuyBtn: {
    backgroundColor: C.seller, borderRadius: R.md,
    paddingHorizontal: 14, paddingVertical: 9,
  },

  // Tab switcher
  tabSwitcher: {
    flexDirection: 'row', backgroundColor: C.bgSection,
    margin: 12, marginBottom: 0, borderRadius: R.md, padding: 3,
  },
  tabBtn: {
    flex: 1, minHeight: 36, paddingVertical: 7, borderRadius: 8, alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabBtnActive: { backgroundColor: C.bgCard },
  tabBtnText: { fontSize: 11, fontWeight: '400', color: C.textSub },
  tabBtnTextActive: { fontWeight: '600', color: C.primary },

  // Bot reply
  botBubble: {
    flex: 1, backgroundColor: C.goldDim, borderRadius: R.md,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: C.gold + '35',
  },
  botLabel: { fontSize: 11, fontWeight: '600', color: C.seller, marginBottom: 3 },
  botBuyBtn: {
    backgroundColor: C.seller, borderRadius: 8, padding: 8,
    alignItems: 'center', marginTop: 6,
  },
  botBuyBtnText: { color: C.bgCard, fontSize: 11, fontWeight: '600' },
});
