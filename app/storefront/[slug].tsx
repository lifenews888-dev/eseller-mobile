import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import {
  filterPublicProducts,
  firstProductImage,
  getPublicProductPrice,
} from '../../src/shared/productQuality';
import { AppButton, AppCard, AppIconButton, AppScreen, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';
import { ProductCardSkeleton } from '../../src/shared/ui/Skeleton';

type StoreTab = 'products' | 'about';

export default function StorefrontScreen() {
  const { slug } = useLocalSearchParams();
  const layout = useAppLayoutMetrics();
  const slugValue = Array.isArray(slug) ? slug[0] : slug;
  const [tab, setTab] = useState<StoreTab>('products');

  const { data: entity } = useQuery({
    queryKey: ['entity', slugValue],
    queryFn: async () => {
      const res = await get('/stores?limit=100');
      const stores = (res as any)?.stores ?? (res as any)?.entities ?? [];
      return stores.find((store: any) =>
        [store.slug, store.storefrontSlug, store.id, store._id].includes(slugValue),
      ) ?? null;
    },
    enabled: !!slugValue,
  });

  const e = entity as any;
  const entitySlug = e?.slug || e?.storefrontSlug || slugValue;
  const storeName = e?.name || 'Дэлгүүр';
  const storeDescription = e?.description || e?.about || e?.tagline || 'Онлайн дэлгүүр';
  const phone = e?.phone || e?.contactPhone || '';
  const email = e?.email || e?.contactEmail || '';
  const storeUrl = `https://eseller.mn/${entitySlug || slugValue || ''}`;

  const { data: products, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['storefront-products', entitySlug],
    queryFn: () => get(`/products?entitySlug=${entitySlug}&limit=20`),
    enabled: !!slugValue,
  });

  const prds = filterPublicProducts((products as any)?.products || []);

  const handleShare = async () => {
    await Share.share({
      message: `${storeName} - ${storeDescription}\n${storeUrl}`,
    });
  };

  const handleContact = () => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
      return;
    }
    if (email) {
      Linking.openURL(`mailto:${email}`);
      return;
    }
    Alert.alert('Холбоо барих', 'Энэ дэлгүүр холбоо барих мэдээлэл оруулаагүй байна.');
  };

  const header = (
    <StorefrontHeader
      entity={e}
      storeName={storeName}
      description={storeDescription}
      phone={phone}
      productCount={prds.length}
      tab={tab}
      onTabChange={setTab}
      onContact={handleContact}
      onShare={handleShare}
    />
  );

  if (tab === 'about') {
    return (
      <AppScreen>
        {header}
        <InfoCard title="Холбоо барих">
          {phone ? <InfoRow icon="call-outline" label={phone} onPress={() => Linking.openURL(`tel:${phone}`)} /> : null}
          {email ? <InfoRow icon="mail-outline" label={email} onPress={() => Linking.openURL(`mailto:${email}`)} /> : null}
          {!phone && !email ? (
            <Text style={{ ...F.small, color: C.textMuted }}>
              Холбоо барих мэдээлэл хараахан оруулаагүй байна.
            </Text>
          ) : null}
        </InfoCard>

        <InfoCard title="Мэдээлэл">
          <Text style={{ ...F.small, color: C.textSub, lineHeight: 20 }}>{storeDescription}</Text>
          {e?.address ? <InfoRow icon="location-outline" label={e.address} /> : null}
          <InfoRow icon="time-outline" label={e?.workingHours || '09:00 - 21:00'} />
        </InfoCard>

        <InfoCard title="Үйлчилгээний нөхцөл">
          <InfoRow icon="car-outline" label="Хүргэлт: Улаанбаатар хотод 24 цагийн дотор" />
          <InfoRow icon="refresh-outline" label="Буцаалт: 7 хоногийн дотор" />
          <InfoRow icon="card-outline" label="Төлбөр: QPay, банкны шилжүүлэг, карт" />
          <InfoRow icon="receipt-outline" label="еБаримт олгоно" />
        </InfoCard>

        <View style={{ alignItems: 'center', paddingVertical: R.md }}>
          <Text style={{ ...F.tiny, color: C.textMuted, textAlign: 'center' }}>
            © {new Date().getFullYear()} {storeName}. Бүх эрх хуулиар хамгаалагдсан.
          </Text>
          <Text style={{ ...F.tiny, color: C.brand, fontWeight: '800', marginTop: R.xs }}>
            Powered by eseller.mn
          </Text>
        </View>
      </AppScreen>
    );
  }

  if (isLoading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{
          padding: UI.screenPad,
          paddingTop: layout.screenTop,
          paddingBottom: layout.screenBottom,
        }}
      >
        {header}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {[1, 2, 3, 4].map((item) => (
            <ProductCardSkeleton key={item} style={{ flexBasis: '47%', flexGrow: 0, flexShrink: 0 }} />
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={prds}
        numColumns={2}
        keyExtractor={(item: any, index) => item.id || item._id || String(index)}
        contentContainerStyle={{
          padding: UI.screenPad,
          paddingTop: layout.screenTop,
          paddingBottom: layout.screenBottom,
        }}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.brand} />}
        renderItem={({ item }) => <ProductCard item={item} />}
        ListEmptyComponent={
          <AppCard style={{ alignItems: 'center', gap: R.sm, marginTop: R.md }}>
            <Ionicons name="cube-outline" size={44} color={C.textMuted} />
            <Text style={{ ...F.h4, color: C.text, textAlign: 'center' }}>Энэ дэлгүүрт бараа хараахан байхгүй</Text>
            <Text style={{ ...F.small, color: C.textSub, textAlign: 'center' }}>
              Бусад баталгаат дэлгүүр болон marketplace заруудыг үзээрэй.
            </Text>
            <View style={{ flexDirection: 'row', gap: R.sm }}>
              <AppButton label="Marketplace" icon="grid-outline" onPress={() => router.push('/store' as any)} style={{ flex: 1 }} />
              <AppButton label="Бусад дэлгүүр" icon="storefront-outline" variant="ghost" onPress={() => router.push('/shops' as any)} style={{ flex: 1 }} />
            </View>
          </AppCard>
        }
      />
    </View>
  );
}

function StorefrontHeader({
  entity,
  storeName,
  description,
  phone,
  productCount,
  tab,
  onTabChange,
  onContact,
  onShare,
}: {
  entity: any;
  storeName: string;
  description: string;
  phone?: string;
  productCount: number;
  tab: StoreTab;
  onTabChange: (tab: StoreTab) => void;
  onContact: () => void;
  onShare: () => void | Promise<unknown>;
}) {
  const rating = Number(entity?.rating || 5).toFixed(1);

  return (
    <View style={{ marginBottom: R.md }}>
      <AppTopBar
        eyebrow="Дэлгүүр"
        title={storeName}
        right={<AppIconButton icon="share-social-outline" onPress={onShare} accessibilityLabel="Share store" />}
      />

      <AppCard elevated style={{ gap: R.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.md }}>
          {entity?.logoUrl ? (
            <Image source={{ uri: entity.logoUrl }} style={{ width: 58, height: 58, borderRadius: R.full }} />
          ) : (
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: R.full,
                backgroundColor: C.primaryDim,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ ...F.h3, color: C.primary }}>{storeInitials(storeName)}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ ...F.h2, color: C.text }} numberOfLines={2}>{storeName}</Text>
            <Text style={{ ...F.small, color: C.textSub, marginTop: R.xs }} numberOfLines={3}>
              {description}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: R.sm }}>
          <Badge icon="checkmark-circle" label="Баталгаажсан" color={C.secondary} />
          <Badge icon="star" label={`${rating} үнэлгээ`} color={C.gold} />
          <Badge icon="cube-outline" label={`${productCount} бараа`} color={C.primary} />
        </View>

        <Text style={{ ...F.tiny, color: C.textMuted }}>
          {phone ? `${phone} - ` : ''}eseller.mn дээрх баталгаат дэлгүүр.
        </Text>

        <View style={{ flexDirection: 'row', gap: R.sm }}>
          <AppButton label="Холбоо барих" icon="call-outline" onPress={onContact} style={{ flex: 1 }} />
          <AppButton label="Хуваалцах" icon="share-social-outline" variant="ghost" onPress={onShare} style={{ flex: 1 }} />
        </View>
      </AppCard>

      <View style={{ flexDirection: 'row', gap: R.sm, marginTop: R.md }}>
        {([
          { key: 'products', label: 'Бүтээгдэхүүн', icon: 'cube-outline' },
          { key: 'about', label: 'Мэдээлэл', icon: 'information-circle-outline' },
        ] as const).map((item) => {
          const active = tab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.84}
              onPress={() => onTabChange(item.key)}
              style={{
                flex: 1,
                minHeight: 42,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: R.xs,
                borderRadius: UI.controlRadius,
                backgroundColor: active ? C.brandDim : C.bgSection,
                borderWidth: 1,
                borderColor: active ? C.brand : C.border,
              }}
            >
              <Ionicons name={item.icon} size={16} color={active ? C.brand : C.textMuted} />
              <Text style={{ ...F.small, color: active ? C.brand : C.textMuted, fontWeight: '800' }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ProductCard({ item }: { item: any }) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={() => router.push(`/product/${item.id || item._id}` as any)}
      style={{ flex: 1, margin: R.xs }}
    >
      <AppCard style={{ padding: 0, overflow: 'hidden' }}>
        <Image
          source={{ uri: firstProductImage(item) }}
          style={{ width: '100%', aspectRatio: 1, backgroundColor: C.bgSection }}
          resizeMode="cover"
        />
        <View style={{ padding: R.sm }}>
          <Text style={{ ...F.small, color: C.text, fontWeight: '700' }} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={{ ...F.small, color: C.brand, fontWeight: '900', marginTop: R.xs }}>
            {formatMoney(getPublicProductPrice(item))}
          </Text>
        </View>
      </AppCard>
    </TouchableOpacity>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AppCard style={{ marginBottom: R.md, gap: R.sm }}>
      <Text style={{ ...F.h4, color: C.text }}>{title}</Text>
      {children}
    </AppCard>
  );
}

function InfoRow({
  icon,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label?: string;
  onPress?: () => void;
}) {
  if (!label) return null;

  const content = (
    <>
      <Ionicons name={icon} size={18} color={C.textMuted} />
      <Text style={{ ...F.small, color: C.textSub, flex: 1 }}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm }}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm }}>{content}</View>;
}

function Badge({ icon, label, color }: { icon: ComponentProps<typeof Ionicons>['name']; label: string; color: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: R.xs,
        backgroundColor: color + '18',
        borderRadius: R.full,
        paddingHorizontal: R.sm,
        paddingVertical: 5,
      }}
    >
      <Ionicons name={icon} size={13} color={color} />
      <Text style={{ ...F.tiny, color, fontWeight: '900' }}>{label}</Text>
    </View>
  );
}

function storeInitials(name?: string) {
  return (name || 'Д').trim().slice(0, 2).toLocaleUpperCase('mn-MN');
}

function firstImage(item: any) {
  const image = typeof item?.images?.[0] === 'string'
    ? item.images[0]
    : item?.images?.[0]?.url ?? item?.media?.[0]?.url;
  return image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop';
}

function formatMoney(value?: number) {
  return `${Number(value || 0).toLocaleString()}₮`;
}
