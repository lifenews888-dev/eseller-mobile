import { FlatList, Image, RefreshControl, Share, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { get } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

export default function SellerProductsScreen() {
  const layout = useAppLayoutMetrics();
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['seller-products'],
    queryFn: () => get('/affiliate/links'),
  });

  const products = (data as any)?.links || (data as any)?.products || (Array.isArray(data) ? data : []);

  const shareProduct = async (product: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await Share.share({
      message: `${product.name || product.productName} - ${formatMoney(product.price)}\nhttps://eseller.mn/product/${product.productId || product.id}?ref=me`,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={products}
        keyExtractor={(product: any, index) => String(product.id || product._id || product.productId || index)}
        contentContainerStyle={{
          padding: UI.screenPad,
          paddingTop: layout.screenTop,
          paddingBottom: layout.screenBottom,
        }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.seller} />
        }
        ListHeaderComponent={
          <>
            <AppTopBar eyebrow="Борлуулагч" title="Бараанууд" showBack={false} />
            <AppHeader
              title="Миний бараанууд"
              subtitle="Бараагаа хуваалцаж комисс авна."
              icon="bag-outline"
              accent={C.seller}
              style={{ marginBottom: R.md }}
            />
          </>
        }
        renderItem={({ item: product }) => (
          <ProductRow
            product={product}
            onOpen={() => router.push(`/product/${product.productId || product.id}` as any)}
            onShare={() => shareProduct(product)}
          />
        )}
        ListEmptyComponent={
          <AppCard style={{ alignItems: 'center', gap: R.md, marginTop: R.lg }}>
            <Ionicons name="cube-outline" size={44} color={C.textMuted} />
            <Text style={{ ...F.body, color: C.textSub, textAlign: 'center' }}>
              Бараа байхгүй байна
            </Text>
            <AppButton
              label="Каталог харах"
              icon="cube-outline"
              variant="seller"
              onPress={() => router.push('/seller/catalog' as any)}
            />
          </AppCard>
        }
      />
    </View>
  );
}

function ProductRow({
  product,
  onOpen,
  onShare,
}: {
  product: any;
  onOpen: () => void;
  onShare: () => void;
}) {
  const image = product.image || product.images?.[0];

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      accessibilityLabel={`${product.name || product.productName || 'Бараа'} дэлгэрэнгүй`}
      onPress={onOpen}
    >
      <AppCard style={{ padding: R.md, marginBottom: R.sm }}>
        <View style={{ flexDirection: 'row', gap: R.md, alignItems: 'center' }}>
          {image ? (
            <Image
              source={{ uri: image }}
              style={{ width: 72, height: 72, borderRadius: UI.controlRadius }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: UI.controlRadius,
                backgroundColor: C.bgSection,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <Ionicons name="cube-outline" size={28} color={C.textMuted} />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={{ ...F.small, color: C.text, fontWeight: '800' }} numberOfLines={2}>
              {product.name || product.productName}
            </Text>
            <Text style={{ ...F.body, color: C.seller, fontWeight: '900', marginTop: 4 }}>
              {formatMoney(product.price)}
            </Text>
            <View
              style={{
                backgroundColor: C.seller + '18',
                borderRadius: R.full,
                paddingHorizontal: R.sm,
                paddingVertical: 3,
                alignSelf: 'flex-start',
                marginTop: R.sm,
              }}
            >
              <Text style={{ ...F.tiny, color: C.seller, fontWeight: '800' }}>
                Комисс {product.commission || product.affiliateCommission || 10}%
              </Text>
            </View>
          </View>

          <IconButton icon="share-social-outline" accessibilityLabel="Хуваалцах" onPress={onShare} />
        </View>
      </AppCard>
    </TouchableOpacity>
  );
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString()}₮`;
}

function IconButton({
  icon,
  accessibilityLabel,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      accessibilityLabel={accessibilityLabel}
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      style={{
        width: 42,
        height: 42,
        borderRadius: UI.controlRadius,
        backgroundColor: C.seller,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={18} color={C.bgCard} />
    </TouchableOpacity>
  );
}
