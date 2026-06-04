import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get } from '../../src/services/api';
import { useCart } from '../../src/store/cart';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';
import {
  firstProductImage,
  getProductName,
  getPublicProductPrice,
  getPublicProductQualityIssue,
} from '../../src/shared/productQuality';

export default function WishlistScreen() {
  const qc = useQueryClient();
  const { add } = useCart();
  const layout = useAppLayoutMetrics();
  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['wishlist'], queryFn: () => get('/wishlist') });
  const items = (data as any)?.items || (data as any)?.products || [];

  const removeMut = useMutation({
    mutationFn: (id: string) => del(`/wishlist/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
    onError: (error: any) => Alert.alert('Алдаа', error?.message || 'Хадгалсан жагсаалтаас устгаж чадсангүй.'),
  });

  const addToCart = (item: any) => {
    const product = wishlistProduct(item);
    const issue = getPublicProductQualityIssue(product);

    if (issue) {
      Alert.alert('Бараа шалгалтад байна', issue.message);
      return;
    }

    add({
      id: getProductId(item),
      name: getProductName(product) || 'Бараа',
      price: getPublicProductPrice(product),
      image: firstProductImage(product, '') || null,
      entityId: product.entityId || item.entityId || item.shopId || '',
      entityName: product.entityName || item.entityName || item.shopName || '',
    }, 1);
    Alert.alert('Сагсанд нэмэгдлээ');
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={items}
        keyExtractor={(item: any, index) => getProductId(item) || `wishlist-${index}`}
        contentContainerStyle={[styles.list, { paddingTop: layout.screenTop, paddingBottom: layout.screenBottom }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.brand} />}
        ListHeaderComponent={
          <>
            <AppTopBar eyebrow="Профайл" title="Хадгалсан" showBack={false} />
            <AppHeader
            title="Хадгалсан бараа"
            subtitle="Дуртай бараагаа хадгалаад дараа нь хурдан сагсална."
            icon="heart-outline"
              accent={C.error}
            />
          </>
        }
        ListEmptyComponent={
          <AppCard style={styles.centerCard}>
            {isLoading ? (
              <>
                <ActivityIndicator color={C.brand} />
                <Text style={styles.mutedText}>Хадгалсан бараа ачаалж байна...</Text>
              </>
            ) : (
              <>
                <Ionicons name="heart-outline" size={50} color={C.textMuted} />
                <Text style={styles.emptyTitle}>Хадгалсан бараа байхгүй</Text>
                <Text style={styles.mutedText}>Дэлгүүрээс сонирхсон бараагаа хадгалаарай.</Text>
                <View style={styles.emptyActions}>
                  <AppButton
                    label="Дэлгүүр харах"
                    icon="bag-outline"
                    onPress={() => router.push('/store' as any)}
                    style={styles.emptyButton}
                  />
                  <AppButton
                    label="Хайх"
                    icon="search-outline"
                    variant="secondary"
                    onPress={() => router.push('/search' as any)}
                    style={styles.emptyButton}
                  />
                </View>
              </>
            )}
          </AppCard>
        }
        renderItem={({ item }) => (
          <WishlistRow
            item={item}
            onAdd={() => addToCart(item)}
            onRemove={() => removeMut.mutate(getProductId(item))}
          />
        )}
      />
    </View>
  );
}

function WishlistRow({ item, onAdd, onRemove }: { item: any; onAdd: () => void; onRemove: () => void }) {
  const id = getProductId(item);
  const product = wishlistProduct(item);
  const image = firstProductImage(product, '');
  const name = getProductName(product) || 'Бараа';
  const price = getPublicProductPrice(product);
  const issue = getPublicProductQualityIssue(product);

  return (
    <AppCard style={styles.rowCard}>
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => router.push(`/product/${id}` as any)}
        accessibilityRole="button"
        accessibilityLabel={`${name} дэлгэрэнгүй харах`}
      >
        {image ? (
          <Image source={{ uri: image }} style={styles.thumb} />
        ) : (
          <View style={styles.thumbEmpty}>
            <Ionicons name="cube-outline" size={24} color={C.textMuted} />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.rowInfo}>
        <Text style={styles.productName} numberOfLines={2}>{name}</Text>
        <Text style={[styles.price, issue && styles.qualityPrice]}>
          {issue?.code === 'invalid-price' ? 'Үнэ шалгалтад байна' : formatMoney(price)}
        </Text>
        {issue ? (
          <View style={styles.qualityRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color={C.gold} />
            <Text style={styles.qualityText}>{issue.message}</Text>
          </View>
        ) : null}
        <View style={styles.actions}>
          <SmallAction icon="cart-outline" label="Сагс" color={C.brand} onPress={onAdd} disabled={!!issue} />
          <SmallAction icon="trash-outline" label="Устгах" color={C.error} onPress={onRemove} />
        </View>
      </View>
    </AppCard>
  );
}

function SmallAction({
  icon,
  label,
  color,
  onPress,
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label} үйлдэл`}
      accessibilityState={{ disabled }}
      style={[styles.smallAction, { backgroundColor: `${color}18` }, disabled && styles.disabledAction]}
    >
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.smallActionText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function getProductId(item: any) {
  return String(item.id ?? item._id ?? item.productId ?? item.product?._id ?? '');
}

function wishlistProduct(item: any) {
  const product = item?.product && typeof item.product === 'object' ? item.product : item;

  return {
    ...product,
    id: getProductId(item),
    name: product?.name ?? item?.name,
    price: product?.price ?? item?.price,
    salePrice: product?.salePrice ?? item?.salePrice,
    images: product?.images ?? item?.images,
    media: product?.media ?? item?.media,
    entityId: product?.entityId ?? item?.entityId ?? item?.shopId,
    entityName: product?.entityName ?? item?.entityName ?? item?.shopName,
  };
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString('mn-MN')}₮`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  list: { padding: UI.screenPad },
  centerCard: { alignItems: 'center', gap: R.sm },
  emptyTitle: { ...F.body, color: C.text, fontWeight: '900', textAlign: 'center' },
  mutedText: { ...F.small, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyActions: { width: '100%', flexDirection: 'row', gap: R.sm, marginTop: R.sm },
  emptyButton: { flex: 1 },
  rowCard: { flexDirection: 'row', gap: R.md, marginBottom: R.sm },
  thumb: { width: 82, height: 82, borderRadius: UI.controlRadius, backgroundColor: C.bgSection },
  thumbEmpty: {
    width: 82,
    height: 82,
    borderRadius: UI.controlRadius,
    backgroundColor: C.bgSection,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1, justifyContent: 'center' },
  productName: { ...F.small, color: C.text, fontWeight: '900' },
  price: { ...F.body, color: C.brand, fontWeight: '900', marginTop: 4 },
  qualityPrice: { color: C.gold },
  qualityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  qualityText: { ...F.tiny, color: C.textSub, flex: 1 },
  actions: { flexDirection: 'row', gap: R.sm, marginTop: R.sm, flexWrap: 'wrap' },
  smallAction: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 6 },
  disabledAction: { opacity: 0.5 },
  smallActionText: { ...F.tiny, fontWeight: '900' },
});
