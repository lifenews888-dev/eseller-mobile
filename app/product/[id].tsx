import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { get, post } from '../../src/services/api';
import { useAuth } from '../../src/store/auth';
import { useCart } from '../../src/store/cart';
import { C, F, R, UI } from '../../src/shared/design';
import {
  firstProductImage,
  filterPublicProducts,
  getProductName,
  getPublicProductPrice,
  getPublicProductQualityIssue,
  type ProductQualityIssue,
} from '../../src/shared/productQuality';
import { encodeRouteParam, normalizeRouteParam, safeDecodeRouteParam } from '../../src/shared/routeParams';
import { getShopName } from '../../src/shared/shopIdentity';
import { AppButton, AppCard, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';
import { Skeleton } from '../../src/shared/ui/Skeleton';

const { width } = Dimensions.get('window');

interface ReviewItem {
  id: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  buyerName?: string | null;
  isVerified?: boolean;
  sellerReply?: string | null;
  createdAt: string;
}

interface ReviewsResponse {
  reviews: ReviewItem[];
  total: number;
  breakdown: { rating: number; count: number }[];
  hasMore: boolean;
}

interface RelatedProduct {
  id?: string;
  _id?: string;
  name?: string;
  title?: string;
  productName?: string;
  price: number;
  salePrice?: number | null;
  images?: string[] | null;
  emoji?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
}

interface RelatedResponse {
  products: RelatedProduct[];
}

function isSameRouteId(left?: string, right?: string) {
  if (!left || !right) return false;

  const normalizedLeft = safeDecodeRouteParam(String(left));
  const normalizedRight = safeDecodeRouteParam(String(right));
  return normalizedLeft === normalizedRight || encodeRouteParam(normalizedLeft) === encodeRouteParam(normalizedRight);
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const productParam = normalizeRouteParam(id);
  const productId = safeDecodeRouteParam(productParam);
  const productRouteId = encodeRouteParam(productId);
  const productReturnTo = productRouteId ? `/product/${productRouteId}` : '/store';
  const { add, items } = useCart();
  const { user } = useAuth();
  const layout = useAppLayoutMetrics();
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [saved, setSaved] = useState(false);

  const { data: product, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['product', productRouteId],
    // Хайлт/дэлгүүрийн жагсаалтад зар (feed) бараатай хамт ирдэг тул бараа олдохгүй бол зар эсэхийг шалгана
    queryFn: async () => {
      try {
        return await get(`/products/${productRouteId}`);
      } catch (productError) {
        const listing = await get(`/feed/${productRouteId}`).catch(() => null);
        if (listing) return { __listingRedirect: true } as any;
        throw productError;
      }
    },
    enabled: !!productRouteId,
    retry: false,
  });

  useEffect(() => {
    if ((product as any)?.__listingRedirect && productRouteId) {
      router.replace(`/feed/${productRouteId}` as any);
    }
  }, [product, productRouteId]);

  const { data: reviewsData } = useQuery<ReviewsResponse>({
    queryKey: ['product-reviews', productRouteId],
    queryFn: () => get(`/products/${productRouteId}/reviews`, { limit: 5 }) as unknown as Promise<ReviewsResponse>,
    enabled: !!productRouteId,
    retry: false,
  });

  const { data: relatedData } = useQuery<RelatedResponse>({
    queryKey: ['product-related', productRouteId],
    queryFn: () => get(`/products/${productRouteId}/related`, { limit: 6 }) as unknown as Promise<RelatedResponse>,
    enabled: !!productRouteId,
    retry: false,
  });

  const p = ((product as any)?.product ?? product) as any;
  const images = normalizeImages(p);
  const stock = getStock(p);
  const price = Number(p?.price || 0);
  const salePrice = p?.salePrice != null ? Number(p.salePrice) : null;
  const displayPrice = p ? getPublicProductPrice(p) : 0;
  const productName = getProductName(p) || 'Бараа';
  const productKey = p?.id || p?._id || productId || '';
  const qualityIssue = p
    ? getPublicProductQualityIssue(p, { requireImage: true, requirePrice: true })
    : null;
  const relatedProducts = filterPublicProducts(relatedData?.products ?? [])
    .filter((item) => !isSameRouteId(item.id ?? item._id ?? '', productKey));

  const startChat = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('AUTH_REQUIRED');
      const shopId = p?.shop?.id || p?.shop?._id || p?.entityId || p?.sellerId;
      if (!shopId) throw new Error('NO_SHOP');
      return post('/chat/conversations', {
        shopId,
        customerId: user.id,
        customerName: user.name || 'Хэрэглэгч',
        productName,
        productPrice: displayPrice,
      }) as unknown as Promise<{ id: string }>;
    },
    onSuccess: (conv) => {
      const chatRouteId = encodeRouteParam(conv.id);
      if (chatRouteId) router.push({ pathname: '/chat/[id]', params: { id: chatRouteId } } as any);
    },
    onError: (error: Error) => {
      if (error.message === 'AUTH_REQUIRED') {
        router.push({ pathname: '/login', params: { returnTo: productReturnTo } } as any);
        return;
      }
      Alert.alert('Чат эхлүүлж чадсангүй', 'Дахин оролдоно уу.');
    },
  });

  const handleAddToCart = () => {
    if (qualityIssue) {
      Alert.alert('Бараа шалгалтад байна', qualityIssue.message);
      return;
    }
    if (!validateCartQuantity()) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    add(buildCartItem(), qty);
    Alert.alert('Сагсанд нэмлээ', `${productName} x ${qty}`, [
      { text: 'Үргэлжлүүлэх' },
      { text: 'Сагс харах', onPress: () => router.push('/cart' as any) },
    ]);
  };

  const handleBuyNow = () => {
    if (qualityIssue) {
      Alert.alert('Бараа шалгалтад байна', qualityIssue.message);
      return;
    }
    if (!user) {
      router.push({ pathname: '/login', params: { returnTo: productReturnTo } } as any);
      return;
    }
    if (!validateCartQuantity()) return;
    add(buildCartItem(), qty);
    router.push('/checkout' as any);
  };

  const buildCartItem = () => ({
    id: productKey,
    name: productName,
    price: displayPrice || price,
    image: firstProductImage(p),
    entityId: p.shop?.id || p.shop?._id || p.entityId || '',
    entityName: p.shop ? getShopName(p.shop) : p.entityName || '',
  });

  const validateCartQuantity = () => {
    if (!p) return false;

    if (stock === 0) {
      Alert.alert('Бараа дууссан', 'Энэ бараа одоогоор дууссан байна.');
      return false;
    }

    if (stock !== undefined) {
      const existingQty = items.find((item) => item.id === productKey)?.qty || 0;
      if (existingQty + qty > stock) {
        const remaining = Math.max(stock - existingQty, 0);
        Alert.alert(
          'Үлдэгдэл хүрэхгүй',
          remaining > 0
            ? `Та сагсанд ${existingQty} ширхэг оруулсан. Үлдэгдэл: ${remaining} ширхэг.`
            : `Сагсанд хамгийн их тоо нэмэгдсэн байна (${stock} ширхэг).`,
        );
        return false;
      }
    }

    return true;
  };

  const handleShare = async () => {
    if (!p) return;
    await Share.share({
      message: `${productName} - ${formatMoney(displayPrice)}\nhttps://eseller.mn/product/${encodeRouteParam(productKey)}`,
    });
  };

  const handleAffiliate = () => {
    if (user) {
      router.push('/referral' as any);
      return;
    }
    router.push({ pathname: '/register', params: { role: 'affiliate', returnTo: productReturnTo } } as any);
  };

  const handleWriteReview = () => {
    if (!user) {
      router.push({ pathname: '/login', params: { returnTo: productReturnTo } } as any);
      return;
    }
    Alert.alert('Үнэлгээ бичих', 'Захиалга амжилттай биелсний дараа үнэлгээ бичих боломжтой.');
  };

  if (isLoading || (product as any)?.__listingRedirect) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Skeleton width="100%" height={340} borderRadius={0} />
        <View style={{ padding: R.lg, gap: R.md }}>
          <Skeleton width="80%" height={24} />
          <Skeleton width="42%" height={30} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="86%" height={14} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: UI.screenPad, justifyContent: 'center' }}>
        <AppCard style={{ alignItems: 'center', gap: R.sm }}>
          <Ionicons name="cloud-offline-outline" size={44} color={C.textMuted} />
          <Text style={{ ...F.h4, color: C.text, textAlign: 'center' }}>Бараа ачаалж чадсангүй</Text>
          <Text style={{ ...F.small, color: C.textSub, textAlign: 'center' }}>
            {(error as Error)?.message || 'Сүлжээ эсвэл серверийн алдаа гарлаа.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: R.sm }}>
            <AppButton
              label={isRefetching ? 'Шалгаж байна' : 'Дахин оролдох'}
              icon="refresh"
              disabled={isRefetching}
              onPress={() => refetch()}
              style={{ flex: 1 }}
            />
            <AppButton label="Дэлгүүр рүү" icon="storefront-outline" variant="secondary" onPress={() => router.push('/store' as any)} style={{ flex: 1 }} />
          </View>
        </AppCard>
      </View>
    );
  }

  if (!p) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: UI.screenPad, justifyContent: 'center' }}>
        <AppCard style={{ alignItems: 'center', gap: R.sm }}>
          <Ionicons name="alert-circle-outline" size={44} color={C.textMuted} />
          <Text style={{ ...F.h4, color: C.text, textAlign: 'center' }}>Бараа олдсонгүй</Text>
          <Text style={{ ...F.small, color: C.textSub, textAlign: 'center' }}>
            Marketplace руу буцаад өөр бараа сонгоно уу.
          </Text>
          <AppButton label="Дэлгүүр рүү" icon="storefront-outline" onPress={() => router.push('/store' as any)} />
        </AppCard>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: layout.screenBottom + R.xxxl }}>
        <ImageCarousel
          images={images}
          imgIdx={imgIdx}
          setImgIdx={setImgIdx}
          topOffset={layout.screenTop}
          saved={saved}
          onToggleSaved={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSaved((value) => !value);
          }}
          onShare={handleShare}
        />

        <View style={{ padding: R.lg, gap: R.md }}>
          <AppCard elevated>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: R.md, alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...F.h2, color: C.text }} numberOfLines={3}>
                  {productName}
                </Text>
                <Text style={{ ...F.tiny, color: C.textMuted, marginTop: R.xs }}>
                  {p.category || p.entityType || 'Marketplace'}
                </Text>
              </View>
              <RatingBadge rating={Number(p.rating || 0)} reviewCount={Number(p.reviewCount || 0)} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: R.sm, marginTop: R.md, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 28, fontWeight: '900', color: C.brand }}>{formatMoney(displayPrice)}</Text>
              {salePrice != null && salePrice < price ? (
                <Text style={{ ...F.body, color: C.textMuted, textDecorationLine: 'line-through' }}>
                  {formatMoney(price)}
                </Text>
              ) : null}
            </View>
          </AppCard>

          <EntityDetails p={p} />
          {qualityIssue ? <QualityHoldCard issue={qualityIssue} /> : null}

          {!qualityIssue && p.entityType !== 'REAL_ESTATE' && p.entityType !== 'PRE_ORDER' ? (
            <QuantitySelector qty={qty} setQty={setQty} stock={stock} />
          ) : null}

          <DeliveryCard p={p} />
          <DropshipNotice p={p} />

          {p.description ? (
            <Section title="Тайлбар">
              <Text style={{ ...F.small, color: C.textSub, lineHeight: 21 }}>{p.description}</Text>
            </Section>
          ) : null}

          {p.shop ? (
            <ShopBlock p={p} startChatPending={startChat.isPending} onStartChat={() => startChat.mutate()} />
          ) : null}

          <TouchableOpacity activeOpacity={0.86} onPress={handleAffiliate}>
            <AppCard style={{ flexDirection: 'row', alignItems: 'center', gap: R.md, borderColor: C.brand + '28' }}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: UI.controlRadius,
                  backgroundColor: C.brandDim,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="megaphone-outline" size={20} color={C.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...F.small, color: C.brand, fontWeight: '900' }}>Борлуулж эхлэх</Text>
                <Text style={{ ...F.tiny, color: C.textSub, marginTop: 2 }}>
                  Энэ барааг санал болгож урамшуулал аваарай.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.brand} />
            </AppCard>
          </TouchableOpacity>

          {reviewsData ? (
            <ReviewSection data={reviewsData} avgRating={Number(p.rating || 0)} onWriteReview={handleWriteReview} />
          ) : null}
        </View>

        {relatedProducts.length ? (
          <RelatedSection products={relatedProducts} currentId={productKey} />
        ) : null}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: UI.screenPad,
          backgroundColor: C.bgCard,
          borderTopWidth: 1,
          borderTopColor: C.border,
          flexDirection: 'row',
          gap: R.sm,
          paddingBottom: layout.insets.bottom + R.lg,
        }}
      >
        <AppButton
          label="Сагслах"
          icon="cart-outline"
          variant="ghost"
          onPress={handleAddToCart}
          disabled={!!qualityIssue}
          style={{ flex: 1, borderColor: C.brand }}
          textStyle={{ color: C.brand }}
        />
        <AppButton
          label="Захиалах"
          icon="flash"
          onPress={handleBuyNow}
          disabled={!!qualityIssue}
          style={{ flex: 1.5 }}
        />
      </View>
    </View>
  );
}

function ImageCarousel({
  images,
  imgIdx,
  setImgIdx,
  topOffset,
  saved,
  onToggleSaved,
  onShare,
}: {
  images: Array<{ url: string }>;
  imgIdx: number;
  setImgIdx: (index: number) => void;
  topOffset: number;
  saved: boolean;
  onToggleSaved: () => void;
  onShare: () => void | Promise<unknown>;
}) {
  return (
    <View style={{ height: 340, backgroundColor: C.bgCard }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => setImgIdx(Math.round(event.nativeEvent.contentOffset.x / width))}
      >
        {images.length > 0 ? (
          images.map((img, index) => (
            <Image key={`${img.url}:${index}`} source={{ uri: img.url }} style={{ width, height: 340 }} resizeMode="cover" />
          ))
        ) : (
          <View style={{ width, height: 340, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bgSection }}>
            <Ionicons name="image-outline" size={72} color={C.border} />
          </View>
        )}
      </ScrollView>

      <View style={{ position: 'absolute', top: topOffset, left: UI.screenPad, right: UI.screenPad, flexDirection: 'row', justifyContent: 'space-between' }}>
        <IconButton icon="arrow-back" accessibilityLabel="Буцах" onPress={() => router.back()} />
        <View style={{ flexDirection: 'row', gap: R.sm }}>
          <IconButton icon="share-social-outline" accessibilityLabel="Хуваалцах" onPress={onShare} />
          <IconButton
            icon={saved ? 'heart' : 'heart-outline'}
            accessibilityLabel={saved ? 'Хадгалснаас хасах' : 'Хадгалах'}
            color={saved ? C.brand : C.text}
            onPress={onToggleSaved}
          />
        </View>
      </View>

      {images.length > 1 ? (
        <View style={{ position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: R.xs }}>
          {images.map((_, index) => (
            <View
              key={index}
              style={{
                width: index === imgIdx ? 20 : 7,
                height: 7,
                borderRadius: R.full,
                backgroundColor: index === imgIdx ? C.bgCard : C.bgCard + '8C',
              }}
            />
          ))}
        </View>
      ) : null}

      {images.length > 0 ? (
        <View
          style={{
            position: 'absolute',
            bottom: R.md,
            right: UI.screenPad,
            backgroundColor: C.text + '9E',
            borderRadius: R.full,
            paddingHorizontal: R.sm,
            paddingVertical: 5,
          }}
        >
          <Text style={{ ...F.tiny, color: C.bgCard, fontWeight: '900' }}>
            {imgIdx + 1}/{images.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function QuantitySelector({
  qty,
  setQty,
  stock,
}: {
  qty: number;
  setQty: React.Dispatch<React.SetStateAction<number>>;
  stock?: number;
}) {
  return (
    <AppCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.md }}>
        <Text style={{ ...F.small, color: C.textSub, flex: 1 }}>Тоо ширхэг</Text>
        <StepButton icon="remove" disabled={qty <= 1} onPress={() => setQty((value) => Math.max(1, value - 1))} />
        <Text style={{ ...F.h3, color: C.text, minWidth: 34, textAlign: 'center' }}>{qty}</Text>
        <StepButton
          icon="add"
          disabled={stock !== undefined && qty >= stock}
          active
          onPress={() => setQty((value) => value + 1)}
        />
      </View>
      {stock !== undefined ? (
        <Text style={{ ...F.tiny, color: stock > 0 ? C.textMuted : C.error, marginTop: R.sm }}>
          Үлдэгдэл: {stock} ширхэг
        </Text>
      ) : null}
    </AppCard>
  );
}

function QualityHoldCard({ issue }: { issue: ProductQualityIssue }) {
  return (
    <AppCard style={{ backgroundColor: C.goldDim, borderColor: C.gold + '45', gap: R.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm }}>
        <Ionicons name="shield-checkmark-outline" size={20} color={C.seller} />
        <Text style={{ ...F.small, color: C.seller, fontWeight: '900' }}>
          Бараа түр шалгалтад байна
        </Text>
      </View>
      <Text style={{ ...F.small, color: C.text }}>
        {issue.message} Үнэ, зураг болон мэдээлэл баталгаажсаны дараа захиалах боломжтой.
      </Text>
    </AppCard>
  );
}

function DeliveryCard({ p }: { p: any }) {
  if (p?.dropship || (p?.deliveryFee == null && p?.estimatedMins == null)) return null;

  return (
    <Section title="Хүргэлт">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: R.sm }}>
        {p?.deliveryFee != null ? (
          <InfoPill
            icon="car-outline"
            label={p.deliveryFee === 0 ? 'Үнэгүй хүргэлт' : `${formatMoney(p.deliveryFee)} хүргэлт`}
          />
        ) : null}
        {p?.estimatedMins != null ? <InfoPill icon="time-outline" label={`~${p.estimatedMins} мин`} /> : null}
      </View>
    </Section>
  );
}

function DropshipNotice({ p }: { p: any }) {
  if (!p?.dropship) return null;

  const min = p.dropship.estimatedShippingDaysMin;
  const max = p.dropship.estimatedShippingDaysMax;
  const eta = min || max ? `${min ?? max}-${max ?? min} хоног` : 'Хүргэлтийн хугацаа баталгаажсаны дараа';

  return (
    <AppCard style={{ backgroundColor: C.goldDim, borderColor: C.gold + '45', gap: R.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm }}>
        <Ionicons name="earth-outline" size={20} color={C.seller} />
        <Text style={{ ...F.small, color: C.seller, fontWeight: '900' }}>Олон улсаас хүргэнэ</Text>
      </View>
      <Text style={{ ...F.small, color: C.text }}>
        Нийлүүлэгч: {p.dropship.supplierName || 'Гадаад нийлүүлэгч'}
      </Text>
      <Text style={{ ...F.tiny, color: C.textSub }}>Тооцоолсон хугацаа: {eta}</Text>
    </AppCard>
  );
}

function ShopBlock({
  p,
  startChatPending,
  onStartChat,
}: {
  p: any;
  startChatPending: boolean;
  onStartChat: () => void;
}) {
  const shop = p.shop;
  const slug = shop?.slug || shop?.storefrontSlug || shop?.id || shop?._id;
  const routeSlug = encodeRouteParam(slug);
  const shopName = getShopName(shop);

  return (
    <Section title="Дэлгүүр">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.md }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: UI.controlRadius,
            backgroundColor: C.primaryDim,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...F.h4, color: C.primary }}>{initials(shopName)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...F.small, color: C.text, fontWeight: '900' }} numberOfLines={1}>
            {shopName}
          </Text>
          <Text style={{ ...F.tiny, color: C.textMuted, marginTop: 2 }}>Баталгаат худалдагч</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: R.sm, marginTop: R.md }}>
        {routeSlug ? (
          <AppButton
            label="Дэлгүүр үзэх"
            icon="storefront-outline"
            variant="ghost"
            onPress={() => router.push(`/storefront/${routeSlug}` as any)}
            style={{ flex: 1 }}
          />
        ) : null}
        <AppButton
          label={startChatPending ? 'Нээж байна' : 'Чат бичих'}
          icon="chatbubble-ellipses-outline"
          onPress={onStartChat}
          style={{ flex: 1 }}
        />
      </View>
    </Section>
  );
}

function ReviewSection({ data, avgRating, onWriteReview }: { data: ReviewsResponse; avgRating: number; onWriteReview: () => void }) {
  const reviews = data.reviews ?? [];
  const total = Number(data.total ?? reviews.length);
  const countsByRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const bucket of data.breakdown ?? []) countsByRating[bucket.rating] = bucket.count;

  return (
    <Section title="Үнэлгээ">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: R.md, marginBottom: R.md }}>
        <View>
          <Text style={{ fontSize: 32, fontWeight: '900', color: C.text }}>{(avgRating || 0).toFixed(1)}</Text>
          <Text style={{ ...F.tiny, color: C.textMuted }}>{total} сэтгэгдэл</Text>
        </View>
        <AppButton
          label="Үнэлгээ бичих"
          icon="create-outline"
          variant="ghost"
          onPress={onWriteReview}
          style={{ minHeight: 38 }}
        />
      </View>

      {total === 0 ? (
        <Text style={{ ...F.small, color: C.textMuted }}>
          Одоогоор үнэлгээ алга. Захиалга биелсний дараа анхны үнэлгээг үлдээгээрэй.
        </Text>
      ) : (
        <>
          <View style={{ gap: R.xs, marginBottom: R.md }}>
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = countsByRating[rating];
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <View key={rating} style={{ flexDirection: 'row', alignItems: 'center', gap: R.xs }}>
                  <Text style={{ ...F.tiny, color: C.textMuted, width: 10 }}>{rating}</Text>
                  <Ionicons name="star" size={10} color={C.gold} />
                  <View style={{ flex: 1, height: 6, borderRadius: R.full, backgroundColor: C.bgSection, overflow: 'hidden' }}>
                    <View style={{ width: `${pct}%`, height: '100%', backgroundColor: C.gold }} />
                  </View>
                  <Text style={{ ...F.tiny, color: C.textMuted, width: 24, textAlign: 'right' }}>{count}</Text>
                </View>
              );
            })}
          </View>
          <View style={{ gap: R.sm }}>
            {reviews.map((review) => <ReviewRow key={review.id} review={review} />)}
          </View>
          {data.hasMore ? (
            <Text style={{ ...F.tiny, color: C.textMuted, marginTop: R.sm, textAlign: 'center' }}>
              +{total - reviews.length} бусад үнэлгээ
            </Text>
          ) : null}
        </>
      )}
    </Section>
  );
}

function ReviewRow({ review }: { review: ReviewItem }) {
  return (
    <View style={{ backgroundColor: C.bgSection, borderRadius: UI.controlRadius, padding: R.md, borderWidth: 1, borderColor: C.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: R.sm }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: R.xs }}>
          <Text style={{ ...F.small, color: C.text, fontWeight: '800' }} numberOfLines={1}>
            {review.buyerName || 'Хэрэглэгч'}
          </Text>
          {review.isVerified ? <Ionicons name="checkmark-circle" size={13} color={C.success} /> : null}
        </View>
        <StarRow rating={review.rating} />
      </View>
      {review.title ? <Text style={{ ...F.small, color: C.text, fontWeight: '800', marginTop: R.sm }}>{review.title}</Text> : null}
      {review.comment ? <Text style={{ ...F.small, color: C.textSub, lineHeight: 19, marginTop: R.xs }}>{review.comment}</Text> : null}
      {review.sellerReply ? (
        <View style={{ marginTop: R.sm, paddingLeft: R.sm, borderLeftWidth: 2, borderLeftColor: C.brand }}>
          <Text style={{ ...F.tiny, color: C.brand, fontWeight: '900' }}>Худалдагчийн хариу</Text>
          <Text style={{ ...F.tiny, color: C.textSub, marginTop: 2 }}>{review.sellerReply}</Text>
        </View>
      ) : null}
      <Text style={{ ...F.tiny, color: C.textMuted, marginTop: R.sm }}>{formatDate(review.createdAt)}</Text>
    </View>
  );
}

function RelatedSection({ products, currentId }: { products: RelatedProduct[]; currentId: string }) {
  return (
    <View style={{ marginBottom: R.md }}>
      <Text style={{ ...F.h4, color: C.text, marginBottom: R.sm, paddingHorizontal: R.lg }}>Төстэй бараа</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: R.lg, gap: R.sm }}>
        {products.map((product, index) => {
          const id = product.id ?? product._id ?? '';
          const name = getProductName(product) || 'related';
          return <RelatedCard key={id || `${name}-${index}`} product={product} currentId={currentId} />;
        })}
      </ScrollView>
    </View>
  );
}

function RelatedCard({ product, currentId }: { product: RelatedProduct; currentId: string }) {
  const display = product.salePrice ?? product.price;
  const image = product.images?.[0];
  const id = product.id ?? product._id ?? '';
  const routeId = encodeRouteParam(id);
  const name = getProductName(product) || 'Бараа';
  const handlePress = () => {
    if (!routeId || id === currentId) return;
    router.replace({ pathname: '/product/[id]', params: { id: routeId } } as any);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      accessibilityRole="button"
      accessibilityLabel={`${name} барааны дэлгэрэнгүй`}
      accessibilityState={{ disabled: !routeId || id === currentId }}
      disabled={!routeId || id === currentId}
      onPress={handlePress}
      style={{ width: 142, opacity: !routeId ? 0.55 : 1 }}
    >
      <AppCard style={{ padding: 0, overflow: 'hidden' }}>
        <View style={{ width: '100%', height: 142, backgroundColor: C.bgSection, alignItems: 'center', justifyContent: 'center' }}>
          {image ? (
            <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : product.emoji ? (
            <Text style={{ fontSize: 42 }}>{product.emoji}</Text>
          ) : (
            <Ionicons name="image-outline" size={32} color={C.border} />
          )}
        </View>
        <View style={{ padding: R.sm }}>
          <Text numberOfLines={2} style={{ ...F.tiny, color: C.text, fontWeight: '800', minHeight: 32 }}>{name}</Text>
          <Text style={{ ...F.small, color: C.brand, fontWeight: '900', marginTop: R.xs }}>{formatMoney(display)}</Text>
          {product.rating != null && product.rating > 0 ? (
            <Text style={{ ...F.tiny, color: C.textMuted, marginTop: 2 }}>
              ★ {product.rating.toFixed(1)} ({product.reviewCount || 0})
            </Text>
          ) : null}
        </View>
      </AppCard>
    </TouchableOpacity>
  );
}

function EntityDetails({ p }: { p: any }) {
  if (p?.entityType === 'REAL_ESTATE') return <RealEstateDetails p={p} />;
  if (p?.entityType === 'SERVICE') return <ServiceDetails p={p} />;
  if (p?.entityType === 'PRE_ORDER') return <PreOrderDetails p={p} />;
  return null;
}

function RealEstateDetails({ p }: { p: any }) {
  const price = p.salePrice ?? p.price;
  const hasSpecs = p.area || p.rooms || p.floor || p.district;
  if (!hasSpecs) return null;

  return (
    <Section title="Үл хөдлөхийн мэдээлэл">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: R.sm }}>
        {p.area ? <SpecCard icon="resize-outline" label="Талбай" value={`${p.area}м²`} /> : null}
        {p.rooms ? <SpecCard icon="bed-outline" label="Өрөө" value={`${p.rooms}`} /> : null}
        {p.floor ? <SpecCard icon="business-outline" label="Давхар" value={`${p.floor}${p.totalFloors ? '/' + p.totalFloors : ''}`} /> : null}
        {p.district ? <SpecCard icon="location-outline" label="Дүүрэг" value={p.district} /> : null}
      </View>
      {p.area && price > 0 ? (
        <Text style={{ ...F.small, color: C.textMuted, marginTop: R.sm }}>
          м²-ийн үнэ: <Text style={{ color: C.text, fontWeight: '800' }}>{formatMoney(Math.round(price / p.area))}</Text>
        </Text>
      ) : null}
    </Section>
  );
}

function ServiceDetails({ p }: { p: any }) {
  const hasPills = p.duration || p.rating || p.district;
  if (!hasPills) return null;

  return (
    <Section title="Үйлчилгээний мэдээлэл">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: R.sm }}>
        {p.duration ? <InfoPill icon="time-outline" label={`${p.duration} мин`} /> : null}
        {p.rating ? <InfoPill icon="star" label={`${p.rating}`} color={C.gold} /> : null}
        {p.district ? <InfoPill icon="location-outline" label={p.district} /> : null}
      </View>
      {p.availableSlots != null && p.availableSlots > 0 ? (
        <Text style={{ ...F.small, color: C.textMuted, marginTop: R.sm }}>
          Захиалах боломжтой цаг: <Text style={{ color: C.text, fontWeight: '800' }}>{p.availableSlots}</Text>
        </Text>
      ) : null}
    </Section>
  );
}

function PreOrderDetails({ p }: { p: any }) {
  const current = Number(p.currentBatch) || 0;
  const min = Number(p.minBatch) || 1;
  const progress = Math.min(Math.round((current / min) * 100), 100);
  const deadline = p.deliveryEstimate ? new Date(p.deliveryEstimate) : null;
  const validDate = deadline && !Number.isNaN(deadline.getTime());
  const daysLeft = validDate ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000)) : null;
  const price = p.salePrice ?? p.price;
  const advance = p.advancePercent ? Math.round((price * p.advancePercent) / 100) : null;

  return (
    <Section title="Урьдчилсан захиалга">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: R.md }}>
        <Text style={{ ...F.small, color: C.textSub }}>Цугласан захиалга</Text>
        <Text style={{ ...F.small, color: C.text, fontWeight: '900' }}>{current}/{min}</Text>
      </View>
      <View style={{ height: 10, borderRadius: R.full, overflow: 'hidden', backgroundColor: C.bgSection, marginTop: R.sm }}>
        <View style={{ width: `${progress}%`, height: '100%', backgroundColor: C.seller }} />
      </View>
      {daysLeft !== null ? <Text style={{ ...F.tiny, color: C.textMuted, marginTop: R.sm }}>{daysLeft} хоног үлдсэн</Text> : null}
      {!validDate && p.deliveryEstimate ? <Text style={{ ...F.tiny, color: C.textMuted, marginTop: R.sm }}>Хүргэлт: {p.deliveryEstimate}</Text> : null}
      {advance != null ? (
        <Text style={{ ...F.small, color: C.textMuted, marginTop: R.sm }}>
          Урьдчилгаа: <Text style={{ color: C.text, fontWeight: '800' }}>{p.advancePercent}% ({formatMoney(advance)})</Text>
        </Text>
      ) : null}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AppCard>
      <Text style={{ ...F.h4, color: C.text, marginBottom: R.sm }}>{title}</Text>
      {children}
    </AppCard>
  );
}

function SpecCard({ icon, label, value }: { icon: ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={{ flex: 1, minWidth: '47%', flexDirection: 'row', alignItems: 'center', gap: R.sm, padding: R.md, borderRadius: UI.controlRadius, backgroundColor: C.bgSection }}>
      <Ionicons name={icon} size={20} color={C.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={{ ...F.tiny, color: C.textMuted }}>{label}</Text>
        <Text style={{ ...F.small, color: C.text, fontWeight: '800' }} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function InfoPill({ icon, label, color = C.textSub }: { icon: ComponentProps<typeof Ionicons>['name']; label: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.xs, paddingHorizontal: R.sm, paddingVertical: R.sm, borderRadius: R.full, backgroundColor: C.bgSection }}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={{ ...F.tiny, color: C.text, fontWeight: '800' }}>{label}</Text>
    </View>
  );
}

function IconButton({
  icon,
  color = C.text,
  onPress,
  accessibilityLabel,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  color?: string;
  onPress: () => void | Promise<unknown>;
  accessibilityLabel: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={{
        width: 42,
        height: 42,
        borderRadius: R.full,
        backgroundColor: C.bgCard + 'EB',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: C.bgCard + '8C',
      }}
    >
      <Ionicons name={icon} size={20} color={color} />
    </TouchableOpacity>
  );
}

function StepButton({ icon, disabled, active, onPress }: { icon: 'add' | 'remove'; disabled?: boolean; active?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={icon === 'add' ? 'Тоо нэмэх' : 'Тоо хасах'}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={{
        width: 36,
        height: 36,
        borderRadius: UI.controlRadius,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: disabled ? C.border : active ? C.primary : C.bgSection,
        borderWidth: active ? 0 : 1,
        borderColor: C.border,
      }}
    >
      <Ionicons name={icon} size={18} color={disabled ? C.textMuted : active ? C.bgCard : C.text} />
    </TouchableOpacity>
  );
}

function RatingBadge({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  if (!rating) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.xs, backgroundColor: C.bgSection, borderRadius: R.full, paddingHorizontal: R.sm, paddingVertical: 6 }}>
      <Ionicons name="star" size={14} color={C.gold} />
      <Text style={{ ...F.small, color: C.text, fontWeight: '900' }}>{rating.toFixed(1)}</Text>
      <Text style={{ ...F.tiny, color: C.textMuted }}>({reviewCount})</Text>
    </View>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((item) => (
        <Ionicons key={item} name={item <= rating ? 'star' : 'star-outline'} size={12} color={item <= rating ? C.gold : C.border} />
      ))}
    </View>
  );
}

function normalizeImages(p: any): Array<{ url: string }> {
  const raw = p?.images?.length ? p.images : (p?.media || []);
  return raw
    .map((img: any) => (typeof img === 'string' ? { url: img } : img))
    .filter((img: any) => typeof img?.url === 'string' && img.url.length > 0);
}

function getStock(p: any): number | undefined {
  if (typeof p?.stock === 'number') return p.stock;
  if (typeof p?.quantity === 'number') return p.quantity;
  return undefined;
}

function initials(name?: string) {
  return (name || 'Д').trim().slice(0, 2).toLocaleUpperCase('mn-MN');
}

function formatMoney(value?: number) {
  return `${Number(value || 0).toLocaleString()}₮`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('mn-MN');
  } catch {
    return iso;
  }
}
