import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { post } from '../../src/services/api';
import { useAuth } from '../../src/store/auth';
import { C, F, R, UI } from '../../src/shared/design';
import { LIVE_FEED_POST_CATEGORIES } from '../../src/shared/liveCategories';
import { uploadMultipleImages } from '../../src/lib/uploadImage';
import { encodeRouteParam } from '../../src/shared/routeParams';
import { AppButton, AppCard, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';
import { RequireAuthScreen } from '../../src/shared/ui/RequireAuthScreen';

const DISTRICTS = ['СБД', 'ХУД', 'БЗД', 'ЧД', 'БГД', 'СХД', 'НД', 'БНД'];

export default function CreateFeedScreen() {
  const { user } = useAuth();
  const layout = useAppLayoutMetrics();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [category, setCategory] = useState('');
  const [district, setDistrict] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages((current) => [...current, ...result.assets.map((asset) => asset.uri)].slice(0, 5));
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!title.trim()) {
      Alert.alert('Анхаар', 'Гарчиг оруулна уу.');
      return;
    }
    if (!category) {
      Alert.alert('Анхаар', 'Ангилал сонгоно уу.');
      return;
    }

    setLoading(true);
    let createdId: string | null = null;
    try {
      // Вэбтэй ижил: зургуудыг эхлээд хуулж, дараа нь JSON-оор зар үүсгэнэ
      // (өмнө нь multipart илгээдэг байсан тул сервер хүлээж авдаггүй байсан)
      const imageUrls = images.length ? await uploadMultipleImages(images) : [];
      const numericPrice = Number(price.replace(/[^\d]/g, ''));
      const created = (await post('/feed', {
        title: title.trim(),
        description: desc.trim(),
        price: numericPrice > 0 ? numericPrice : undefined,
        images: imageUrls,
        category,
        entityType: 'store',
        district: district || undefined,
        metadata: phone.trim() ? { ownerPhone: phone.trim() } : undefined,
        tier: 'normal',
      })) as unknown as { id?: string; _id?: string };
      createdId = created?.id || created?._id || null;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const routeId = createdId ? encodeRouteParam(createdId) : '';
      Alert.alert('Амжилттай', 'Зар нийтлэгдлээ. 30 хоног идэвхтэй байна.', [
        { text: 'Зараа харах', onPress: () => (routeId ? router.replace(`/feed/${routeId}` as never) : router.back()) },
      ]);
    } catch (error: any) {
      Alert.alert('Алдаа', error?.message || 'Зар нийтлэхэд алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <RequireAuthScreen
        eyebrow="Зар"
        title="Зар нэмэх"
        subtitle="Зар нийтлэхийн тулд бүртгэлээрээ нэвтэрнэ үү."
        icon="megaphone-outline"
        accent={C.brand}
        returnTo="/feed/create"
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.topBarWrap, { paddingTop: layout.screenTop }]}>
        <AppTopBar eyebrow="Зар" title="Зар нэмэх" style={{ marginBottom: 0 }} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: layout.screenBottom + 96 }]}
      >
        <AppCard elevated style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons name="megaphone-outline" size={22} color={C.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Шинэ зар нийтлэх</Text>
            <Text style={styles.introText}>Гарчиг, үнэ, зураг болон байршлаа тодорхой оруулбал хэрэглэгч хурдан шийдвэр гаргана.</Text>
          </View>
        </AppCard>

        <Text style={styles.sectionTitle}>Зурагнууд (5 хүртэл)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
          {images.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.photoWrap}>
              <Image source={{ uri }} style={styles.photo} />
              <TouchableOpacity
                activeOpacity={0.84}
                accessibilityRole="button"
                accessibilityLabel={`${index + 1}-р зургийг устгах`}
                onPress={() => setImages((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                style={styles.removePhoto}
              >
                <Ionicons name="close" size={14} color={C.bgCard} />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 5 ? (
            <TouchableOpacity activeOpacity={0.84} accessibilityRole="button" accessibilityLabel="Зураг нэмэх" onPress={pickImage} style={styles.addPhoto}>
              <Ionicons name="camera-outline" size={28} color={C.textMuted} />
              <Text style={styles.addPhotoText}>Зураг</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        <AppCard style={styles.formCard}>
          <FormField label="Гарчиг *">
            <TextInput
              accessibilityLabel="Зарын гарчиг"
              value={title}
              onChangeText={setTitle}
              placeholder="Жнь: Toyota Prius 2018 он"
              placeholderTextColor={C.textMuted}
              style={styles.input}
            />
          </FormField>

          <FormField label="Тайлбар">
            <TextInput
              accessibilityLabel="Зарын тайлбар"
              value={desc}
              onChangeText={setDesc}
              placeholder="Дэлгэрэнгүй мэдээлэл..."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[styles.input, styles.textArea]}
            />
          </FormField>

          <View style={styles.twoCol}>
            <FormField label="Үнэ (₮)" style={{ flex: 1 }}>
              <TextInput
                accessibilityLabel="Зарын үнэ"
                value={price}
                onChangeText={setPrice}
                placeholder="0"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
                style={styles.input}
              />
            </FormField>
            <FormField label="Утас" style={{ flex: 1 }}>
              <TextInput
                accessibilityLabel="Холбогдох утас"
                value={phone}
                onChangeText={setPhone}
                placeholder="99XXXXXX"
                placeholderTextColor={C.textMuted}
                keyboardType="phone-pad"
                style={styles.input}
              />
            </FormField>
          </View>
        </AppCard>

        <Text style={styles.sectionTitle}>Ангилал *</Text>
        <View style={styles.chips}>
          {LIVE_FEED_POST_CATEGORIES.map((item) => (
            <Chip
              key={item.slug}
              label={item.name}
              active={category === item.slug}
              activeColor={C.primary}
              onPress={() => setCategory(category === item.slug ? '' : item.slug)}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Байршил</Text>
        <View style={styles.chips}>
          {DISTRICTS.map((item) => (
            <Chip
              key={item}
              label={item}
              active={district === item}
              activeColor={C.secondary}
              onPress={() => setDistrict(district === item ? '' : item)}
            />
          ))}
        </View>

        <AppCard style={styles.featureCard}>
          <View style={styles.featureIcon}>
            <Ionicons name="flash" size={20} color={C.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>Зараа онцлох</Text>
            <Text style={styles.featureText}>Нүүр болон зарын жагсаалтад илүү тод харагдах боломж.</Text>
          </View>
          <Text style={styles.featurePrice}>2,900₮</Text>
        </AppCard>
      </ScrollView>

      <View style={[styles.fixedActions, { paddingBottom: layout.insets.bottom + R.lg }]}>
        <AppButton
          label={loading ? 'Нийтэлж байна' : 'Зар нийтлэх'}
          icon="send-outline"
          disabled={loading}
          onPress={handleSubmit}
          style={{ minHeight: 50 }}
        />
      </View>
    </View>
  );
}

function FormField({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  active,
  activeColor,
  onPress,
}: {
  label: string;
  active: boolean;
  activeColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      accessibilityRole="button"
      accessibilityLabel={`${label} сонгох`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? activeColor : C.bgSection, borderColor: active ? activeColor : C.border }]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topBarWrap: {
    paddingHorizontal: R.lg,
    paddingBottom: R.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  content: { padding: UI.screenPad, paddingTop: R.md },
  introCard: { flexDirection: 'row', alignItems: 'center', gap: R.md, marginBottom: R.lg },
  introIcon: {
    width: UI.iconBox,
    height: UI.iconBox,
    borderRadius: UI.controlRadius,
    backgroundColor: C.brandDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitle: { ...F.h4, color: C.text, fontWeight: '900' },
  introText: { ...F.small, color: C.textSub, lineHeight: 19, marginTop: 2 },
  formCard: { gap: R.md, marginBottom: R.lg },
  fixedActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.bgCard,
    padding: UI.screenPad,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  sectionTitle: { ...F.h4, color: C.text, marginBottom: R.sm },
  photoRow: { gap: R.sm, marginBottom: R.lg },
  photoWrap: { position: 'relative' },
  photo: { width: 100, height: 100, borderRadius: UI.cardRadius, backgroundColor: C.bgSection },
  removePhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: R.full,
    backgroundColor: C.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    width: 100,
    height: 100,
    borderRadius: UI.cardRadius,
    backgroundColor: C.bgSection,
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: { ...F.tiny, color: C.textMuted, marginTop: R.xs },
  field: { marginBottom: R.md },
  label: { ...F.small, color: C.textSub, fontWeight: '800', marginBottom: R.xs },
  input: {
    minHeight: 48,
    backgroundColor: C.bgSection,
    borderRadius: UI.controlRadius,
    paddingHorizontal: R.md,
    paddingVertical: R.sm,
    color: C.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: C.border,
  },
  textArea: { minHeight: 104 },
  twoCol: { flexDirection: 'row', gap: R.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: R.sm, marginBottom: R.lg },
  chip: {
    minHeight: 38,
    borderRadius: R.full,
    borderWidth: 1,
    paddingHorizontal: R.md,
    paddingVertical: R.sm,
    justifyContent: 'center',
  },
  chipText: { ...F.small, color: C.textSub, fontWeight: '700' },
  chipTextActive: { color: C.bgCard, fontWeight: '900' },
  featureCard: { flexDirection: 'row', alignItems: 'center', gap: R.md, backgroundColor: C.goldDim },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: R.full,
    backgroundColor: `${C.gold}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { ...F.small, color: C.gold, fontWeight: '900' },
  featureText: { ...F.tiny, color: C.textMuted, marginTop: 2 },
  featurePrice: { ...F.small, color: C.gold, fontWeight: '900' },
});
