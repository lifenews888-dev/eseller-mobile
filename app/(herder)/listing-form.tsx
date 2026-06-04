import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { HerderAPI } from '../../src/features/herder/api';
import { CATEGORIES } from '../../src/features/herder/constants';
import * as HerderQueue from '../../src/features/herder/queue';
import type { ProductWritable } from '../../src/features/herder/types';
import { uploadMultipleImages } from '../../src/lib/uploadImage';
import { isOfflineError } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppScreen,
  AppTopBar,
  useAppLayoutMetrics,
} from '../../src/shared/ui/AppUI';

type FormState = {
  name: string;
  description: string;
  price: string;
  salePrice: string;
  category: string;
  stock: string;
  requiresColdChain: boolean;
  images: string[];
};

const EMPTY: FormState = {
  name: '',
  description: '',
  price: '',
  salePrice: '',
  category: CATEGORIES[0],
  stock: '',
  requiresColdChain: false,
  images: [],
};

export default function HerderListingForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const qc = useQueryClient();
  const layout = useAppLayoutMetrics();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [uploading, setUploading] = useState(false);

  const existing = useQuery({
    queryKey: ['herder', 'my', 'products', 'detail', id],
    queryFn: () => HerderAPI.detail(id as string),
    enabled: isEdit,
  });

  useEffect(() => {
    if (isEdit && existing.data && !hydrated) {
      const product = existing.data;
      setForm({
        name: product.name ?? '',
        description: product.description ?? '',
        price: String(product.price ?? ''),
        salePrice: product.salePrice != null ? String(product.salePrice) : '',
        category: product.category ?? CATEGORIES[0],
        stock: product.stock != null ? String(product.stock) : '',
        requiresColdChain: !!product.requiresColdChain,
        images: product.images ?? [],
      });
      setHydrated(true);
    }
  }, [existing.data, isEdit, hydrated]);

  const save = useMutation({
    mutationFn: (payload: ProductWritable) =>
      isEdit
        ? HerderAPI.my.products.update(id as string, payload)
        : HerderAPI.my.products.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['herder', 'my', 'products'] });
      router.back();
    },
    onError: async (e: Error, payload) => {
      if (isOfflineError(e)) {
        try {
          if (isEdit && id) {
            await HerderQueue.enqueue({ kind: 'update', productId: id, payload });
          } else {
            await HerderQueue.enqueue({ kind: 'create', payload });
          }
          qc.invalidateQueries({ queryKey: ['herder', 'queue'] });
          Alert.alert('Офлайн горимд хадгаллаа', 'Интернет холбогдмогц автоматаар илгээнэ.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        } catch {
          // Fall through to generic alert.
        }
      }
      Alert.alert('Алдаа', e.message);
    },
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
      setForm((current) => ({ ...current, images: [...current.images, ...cloudUrls].slice(0, 5) }));
    } catch {
      Alert.alert('Алдаа', 'Зураг хуулахад алдаа гарлаа');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (uri: string) =>
    setForm((current) => ({ ...current, images: current.images.filter((item) => item !== uri) }));

  const onSubmit = () => {
    const price = Number(form.price);
    const salePrice = form.salePrice ? Number(form.salePrice) : null;
    const stock = form.stock ? Number(form.stock) : undefined;

    if (!form.name.trim()) return Alert.alert('Алдаа', 'Нэр оруулна уу');
    if (!Number.isFinite(price) || price <= 0) {
      return Alert.alert('Алдаа', 'Үнэ 0-ээс их байх ёстой');
    }
    if (salePrice != null && (!Number.isFinite(salePrice) || salePrice >= price)) {
      return Alert.alert('Алдаа', 'Хямдралтай үнэ үндсэн үнээс бага байх ёстой');
    }

    save.mutate({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price,
      salePrice,
      category: form.category,
      stock,
      requiresColdChain: form.requiresColdChain,
      images: form.images,
    });
  };

  if (isEdit && existing.isLoading && !hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.herder} />
      </View>
    );
  }

  const submitLabel = save.isPending ? 'Хадгалж байна...' : isEdit ? 'Хадгалах' : 'Нийтлэх';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <AppScreen
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: layout.screenBottom + 96 }}
      >
      <AppTopBar eyebrow="Малчин" title={isEdit ? 'Бараа засах' : 'Шинэ бараа'} />

      <AppHeader
        title={isEdit ? 'Бараа засах' : 'Шинэ бараа'}
        subtitle="Малчнаас шууд хүргэх бүтээгдэхүүний мэдээлэл."
        icon="leaf-outline"
        accent={C.herder}
      />

      <AppCard style={{ gap: R.md, marginBottom: R.md }}>
        <Field label="Нэр">
          <TextInput
            value={form.name}
            onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
            placeholder="Жишээ: Хонины мах"
            placeholderTextColor={C.textMuted}
            style={inputStyle}
          />
        </Field>

        <Field label="Тайлбар">
          <TextInput
            value={form.description}
            onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
            placeholder="Бараа болон малын тухай мэдээлэл"
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={3}
            style={[inputStyle, { minHeight: 92, textAlignVertical: 'top' }]}
          />
        </Field>

        <View style={{ flexDirection: 'row', gap: R.sm }}>
          <View style={{ flex: 1 }}>
            <Field label="Үнэ (₮)">
              <TextInput
                value={form.price}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, price: value.replace(/\D/g, '') }))
                }
                placeholder="0"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
                style={inputStyle}
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Хямдрал (₮)">
              <TextInput
                value={form.salePrice}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, salePrice: value.replace(/\D/g, '') }))
                }
                placeholder="-"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
                style={inputStyle}
              />
            </Field>
          </View>
        </View>

        <Field label="Ангилал">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: R.sm }}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                activeOpacity={0.84}
                onPress={() => setForm((current) => ({ ...current, category }))}
                style={{
                  paddingHorizontal: R.md,
                  paddingVertical: R.sm,
                  borderRadius: R.full,
                  backgroundColor: form.category === category ? C.herder : C.bgSection,
                  borderWidth: 1,
                  borderColor: form.category === category ? C.herder : C.border,
                }}
              >
                <Text
                  style={{
                    ...F.tiny,
                    color: form.category === category ? C.bgCard : C.text,
                    fontWeight: '800',
                  }}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Нөөц">
          <TextInput
            value={form.stock}
            onChangeText={(value) =>
              setForm((current) => ({ ...current, stock: value.replace(/\D/g, '') }))
            }
            placeholder="0"
            placeholderTextColor={C.textMuted}
            keyboardType="number-pad"
            style={inputStyle}
          />
        </Field>
      </AppCard>

      <AppCard style={{ marginBottom: R.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: R.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...F.small, color: C.text, fontWeight: '900' }}>
              Хүйтэн сүлжээ шаардлагатай
            </Text>
            <Text style={{ ...F.tiny, color: C.textSub, marginTop: 2 }}>
              Мах, сүү, бяслаг зэрэг түргэн муудах бараанд.
            </Text>
          </View>
          <Switch
            value={form.requiresColdChain}
            onValueChange={(value) =>
              setForm((current) => ({ ...current, requiresColdChain: value }))
            }
            trackColor={{ false: C.border2, true: C.herder }}
            thumbColor={C.bgCard}
          />
        </View>
      </AppCard>

      <AppCard style={{ gap: R.sm, marginBottom: R.md }}>
        <Text style={{ ...F.small, color: C.textSub, fontWeight: '800' }}>
          Зураг ({form.images.length}/5)
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: R.sm }}>
          {form.images.map((uri) => (
            <View key={uri} style={{ position: 'relative' }}>
              <Image
                source={{ uri }}
                style={{ width: 80, height: 80, borderRadius: UI.controlRadius, backgroundColor: C.bgSection }}
              />
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => removeImage(uri)}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  backgroundColor: C.error,
                  borderRadius: R.full,
                  width: 24,
                  height: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={14} color={C.bgCard} />
              </TouchableOpacity>
            </View>
          ))}
          {form.images.length < 5 ? (
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={pickImage}
              disabled={uploading}
              style={{
                width: 80,
                height: 80,
                borderRadius: UI.controlRadius,
                backgroundColor: C.bgSection,
                borderWidth: 1,
                borderColor: C.border,
                borderStyle: 'dashed',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={C.herder} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={22} color={C.herder} />
                  <Text style={{ ...F.tiny, color: C.herder, marginTop: 4, fontWeight: '800' }}>
                    Нэмэх
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </AppCard>

      </AppScreen>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: R.md,
          backgroundColor: C.bgCard,
          borderTopWidth: 1,
          borderTopColor: C.border,
        }}
      >
        <AppButton
          label={submitLabel}
          icon="checkmark"
          disabled={save.isPending || uploading}
          onPress={onSubmit}
          style={{ backgroundColor: C.herder, borderColor: C.herder }}
        />
      </View>
    </View>
  );
}

const inputStyle = {
  backgroundColor: C.bgInput,
  borderRadius: UI.controlRadius,
  borderWidth: 1,
  borderColor: C.border,
  paddingHorizontal: R.md,
  paddingVertical: R.md,
  color: C.text,
  fontSize: 15,
} as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: R.sm }}>
      <Text style={{ ...F.small, color: C.textSub, fontWeight: '800' }}>{label}</Text>
      {children}
    </View>
  );
}
