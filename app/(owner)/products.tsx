import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { del, get, post } from '../../src/services/api';
import { uploadMultipleImages } from '../../src/lib/uploadImage';
import { encodeApiPathSegment } from '../../src/shared/apiPath';
import { C, F, R, UI } from '../../src/shared/design';
import { encodeRouteParam, normalizeRouteParam } from '../../src/shared/routeParams';
import { AppButton, AppCard, AppHeader, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

type ProductForm = {
  name: string;
  price: string;
  description: string;
  stock: string;
  category: string;
  images: string[];
};

const EMPTY_FORM: ProductForm = {
  name: '',
  price: '',
  description: '',
  stock: '',
  category: 'other',
  images: [],
};

type ProductsRoutePatch = {
  search?: string;
  create?: boolean;
};

export default function OwnerProducts() {
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ create?: string; q?: string }>();
  const [search, setSearch] = useState(() => normalizeRouteParam(params.q));
  const [modal, setModal] = useState(params.create === '1');
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const layout = useAppLayoutMetrics();

  useEffect(() => {
    setSearch(normalizeRouteParam(params.q));
    setModal(params.create === '1');
  }, [params.create, params.q]);

  const replaceProductsRoute = (patch: ProductsRoutePatch) => {
    const nextSearch = patch.search ?? search;
    const nextCreate = patch.create ?? modal;
    const routeParams: Record<string, string> = {};

    if (nextSearch.trim()) routeParams.q = nextSearch.trim();
    if (nextCreate) routeParams.create = '1';

    router.replace(
      Object.keys(routeParams).length
        ? ({ pathname: '/owner/products' as any, params: routeParams } as any)
        : ('/owner/products' as any),
    );
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    replaceProductsRoute({ search: value });
  };

  const handleSearchClear = () => {
    setSearch('');
    replaceProductsRoute({ search: '' });
  };

  const openCreateModal = () => {
    setModal(true);
    replaceProductsRoute({ create: true });
  };

  const closeCreateModal = () => {
    setModal(false);
    setForm(EMPTY_FORM);
    replaceProductsRoute({ create: false });
  };

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['owner-products'],
    queryFn: () => get('/seller/products'),
  });

  const addMutation = useMutation({
    mutationFn: (payload: any) => post('/seller/products', payload),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      qc.invalidateQueries({ queryKey: ['owner-products'] });
      setModal(false);
      setForm(EMPTY_FORM);
      replaceProductsRoute({ create: false });
    },
    onError: (e: any) => Alert.alert('Алдаа', e?.message || 'Бараа нэмэх үед алдаа гарлаа'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/store/products/${encodeApiPathSegment(id)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner-products'] }),
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;

    const localUris = result.assets.map((asset) => asset.uri);
    setUploading(true);
    try {
      const cloudUrls = await uploadMultipleImages(localUris);
      setForm((prev) => ({ ...prev, images: [...prev.images, ...cloudUrls].slice(0, 5) }));
    } catch {
      Alert.alert('Алдаа', 'Зураг хуулахад алдаа гарлаа');
    } finally {
      setUploading(false);
    }
  };

  const products = ((data as any)?.products || (Array.isArray(data) ? data : [])).filter(
    (product: any) => product.name?.toLowerCase().includes(search.toLowerCase()),
  );

  function createProduct() {
    addMutation.mutate({
      name: form.name,
      price: parseInt(form.price, 10) || 0,
      stock: parseInt(form.stock, 10) || 0,
      description: form.description,
      images: form.images,
      category: form.category,
    });
  }

  function confirmDelete(product: any) {
    Alert.alert('Устгах', `"${product.name}" устгах уу?`, [
      { text: 'Болих', style: 'cancel' },
      {
        text: 'Устгах',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(product.id),
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={products}
        keyExtractor={(product: any) => String(product.id)}
        contentContainerStyle={{
          padding: UI.screenPad,
          paddingTop: layout.screenTop,
          paddingBottom: layout.screenBottom,
        }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.store} />
        }
        ListHeaderComponent={
          <>
            <AppTopBar eyebrow="Дэлгүүр" title="Бараа" showBack={false} />

            <AppHeader
              title="Бараанууд"
              subtitle="Дэлгүүрийн бараа, нөөц, төлөвийг удирдана."
              icon="cube-outline"
              accent={C.store}
              style={{ marginBottom: R.md }}
            />

            <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.md }}>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: C.bgCard,
                  borderRadius: UI.controlRadius,
                  paddingHorizontal: R.md,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <Ionicons name="search" size={16} color={C.textMuted} />
                <TextInput
                  value={search}
                  onChangeText={handleSearchChange}
                  placeholder="Бараа хайх..."
                  placeholderTextColor={C.textMuted}
                  style={{ flex: 1, color: C.text, padding: R.md, fontSize: 14 }}
                />
                {search ? (
                  <TouchableOpacity activeOpacity={0.84} onPress={handleSearchClear}>
                    <Ionicons name="close-circle" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                activeOpacity={0.84}
                accessibilityLabel="Бараа нэмэх"
                onPress={openCreateModal}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: UI.controlRadius,
                  backgroundColor: C.store,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="add" size={22} color={C.bgCard} />
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item: product }) => {
          const id = product.id ?? product._id;
          const routeId = encodeRouteParam(id);
          return (
            <ProductRow
              product={product}
              canView={!!routeId}
              onView={() => {
                if (routeId) router.push(`/product/${routeId}` as any);
              }}
              onDelete={() => confirmDelete(product)}
            />
          );
        }}
        ListEmptyComponent={
          <AppCard style={{ alignItems: 'center', gap: R.md, marginTop: R.lg }}>
            <Ionicons name="cube-outline" size={44} color={C.textMuted} />
            <Text style={{ ...F.body, color: C.textSub, textAlign: 'center' }}>
              Бараа байхгүй байна
            </Text>
            <AppButton
              label="Бараа нэмэх"
              icon="add"
              onPress={openCreateModal}
              style={{ backgroundColor: C.store, borderColor: C.store }}
            />
          </AppCard>
        }
      />

      {modal ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          backgroundColor: C.text + '73',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: C.bgCard,
              borderTopLeftRadius: UI.cardRadius,
              borderTopRightRadius: UI.cardRadius,
              padding: R.xl,
              paddingBottom: layout.screenBottom,
              maxHeight: '85%',
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Text style={{ ...F.h3, color: C.text, marginBottom: R.md }}>Бараа нэмэх</Text>

            {[
              { key: 'name', placeholder: 'Барааны нэр *', keyboard: 'default' },
              { key: 'price', placeholder: 'Үнэ (₮) *', keyboard: 'numeric' },
              { key: 'stock', placeholder: 'Нөөц тоо', keyboard: 'numeric' },
              { key: 'description', placeholder: 'Тайлбар', keyboard: 'default' },
            ].map((field) => (
              <TextInput
                key={field.key}
                value={(form as any)[field.key]}
                onChangeText={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
                placeholder={field.placeholder}
                placeholderTextColor={C.textMuted}
                keyboardType={field.keyboard as any}
                style={{
                  backgroundColor: C.bgInput,
                  borderRadius: UI.controlRadius,
                  padding: R.md,
                  color: C.text,
                  fontSize: 14,
                  marginBottom: R.sm,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              />
            ))}

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={pickImage}
              disabled={uploading}
              style={{
                backgroundColor: C.bgSection,
                borderRadius: UI.controlRadius,
                padding: R.md,
                alignItems: 'center',
                marginBottom: R.md,
                borderWidth: 1,
                borderColor: C.border,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: R.sm,
              }}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={C.store} />
              ) : (
                <Ionicons name="camera-outline" size={18} color={C.textMuted} />
              )}
              <Text style={{ ...F.small, color: C.textSub, fontWeight: '800' }}>
                {uploading ? 'Зураг хуулж байна...' : `Зураг нэмэх (${form.images.length}/5)`}
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: R.sm }}>
              <AppButton
                label="Болих"
                variant="secondary"
                onPress={closeCreateModal}
                style={{ flex: 1 }}
              />
              <AppButton
                label={addMutation.isPending ? 'Нэмж байна...' : 'Нэмэх'}
                icon="checkmark"
                disabled={!form.name || !form.price || addMutation.isPending}
                onPress={createProduct}
                style={{ flex: 2, backgroundColor: C.store, borderColor: C.store }}
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ProductRow({
  product,
  canView,
  onView,
  onDelete,
}: {
  product: any;
  canView: boolean;
  onView: () => void;
  onDelete: () => void;
}) {
  return (
    <AppCard style={{ padding: R.md, marginBottom: R.sm }}>
      <View style={{ flexDirection: 'row', gap: R.md, alignItems: 'center' }}>
        {product.images?.[0] ? (
          <Image
            source={{ uri: product.images[0] }}
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
            <Ionicons name="image-outline" size={24} color={C.textMuted} />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={{ ...F.small, color: C.text, fontWeight: '800' }} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={{ ...F.body, color: C.store, fontWeight: '900', marginTop: 4 }}>
            {formatMoney(product.price)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm, marginTop: 4 }}>
            <Text style={{ ...F.tiny, color: C.textSub }}>Нөөц: {product.stock ?? 0}</Text>
            <View
              style={{
                backgroundColor: product.isActive ? C.success + '18' : C.errorDim,
                borderRadius: R.full,
                paddingHorizontal: R.sm,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  ...F.tiny,
                  fontWeight: '800',
                  color: product.isActive ? C.success : C.error,
                }}
              >
                {product.isActive ? 'Идэвхтэй' : 'Идэвхгүй'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ gap: R.sm }}>
          <IconButton icon="eye-outline" color={C.textSub} disabled={!canView} onPress={onView} />
          <IconButton icon="trash-outline" color={C.error} onPress={onDelete} />
        </View>
      </View>
    </AppCard>
  );
}

function IconButton({
  icon,
  color,
  onPress,
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 34,
        height: 34,
        borderRadius: UI.controlRadius,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: C.bgSection,
        borderWidth: 1,
        borderColor: C.border,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Ionicons name={icon} size={18} color={color} />
    </TouchableOpacity>
  );
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString()}₮`;
}
