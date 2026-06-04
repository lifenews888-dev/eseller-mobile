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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { post } from '../../src/services/api';
import { useAuth } from '../../src/store/auth';
import { C, F, R, UI } from '../../src/shared/design';
import { LIVE_FEED_POST_CATEGORIES } from '../../src/shared/liveCategories';
import { AppButton, AppCard, AppScreen, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

const FEED_CATS = LIVE_FEED_POST_CATEGORIES;

const DISTRICTS = [
  'СБД',
  'ХУД',
  'БЗД',
  'ЧД',
  'БГД',
  'СХД',
  'НД',
  'БНД',
];

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

  const removeImage = (idx: number) => {
    setImages((current) => current.filter((_, index) => index !== idx));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Анхаар', 'Гарчиг оруулна уу');
      return;
    }
    if (!category) {
      Alert.alert('Анхаар', 'Ангилал сонгоно уу');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', desc.trim());
      formData.append('category', category);
      if (price) formData.append('price', price);
      if (phone) formData.append('phone', phone);
      if (district) formData.append('district', district);

      images.forEach((uri, index) => {
        formData.append('images', {
          uri,
          name: `photo_${index}.jpg`,
          type: 'image/jpeg',
        } as any);
      });

      await post('/feed', formData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Амжилттай', 'Зар нийтлэгдлээ!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Алдаа', error?.message || 'Зар нийтлэхэд алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <AppScreen contentContainerStyle={{ flexGrow: 1 }}>
        <AppTopBar eyebrow="Зар" title="Зар нэмэх" />
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={58} color={C.border2} />
          <Text style={styles.centerTitle}>Нэвтрэх шаардлагатай</Text>
          <Text style={styles.centerText}>Зар нийтлэхийн тулд нэвтэрнэ үү.</Text>
          <AppButton
            label="Нэвтрэх"
            icon="log-in-outline"
            onPress={() => router.push({ pathname: '/login', params: { returnTo: '/feed/create' } } as any)}
            style={{ marginTop: R.lg }}
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.topBarWrap, { paddingTop: layout.screenTop }]}>
        <AppTopBar
          eyebrow="Зар"
          title="Зар нэмэх"
          style={{ marginBottom: 0 }}
        />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: layout.screenBottom + 96 }]}>
        <Text style={styles.sectionTitle}>Зурагнууд (5 хүртэл)</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoRow}
        >
          {images.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.photoWrap}>
              <Image source={{ uri }} style={styles.photo} />
              <TouchableOpacity
                activeOpacity={0.84}
                accessibilityRole="button"
                accessibilityLabel={`${index + 1}-р зургийг устгах`}
                onPress={() => removeImage(index)}
                style={styles.removePhoto}
              >
                <Ionicons name="close" size={14} color={C.bgCard} />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 5 ? (
            <TouchableOpacity
              activeOpacity={0.84}
              accessibilityRole="button"
              accessibilityLabel="Зураг нэмэх"
              onPress={pickImage}
              style={styles.addPhoto}
            >
              <Ionicons name="camera-outline" size={28} color={C.textMuted} />
              <Text style={styles.addPhotoText}>Зураг</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

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

        <Text style={styles.sectionTitle}>Ангилал *</Text>
        <View style={styles.chips}>
          {FEED_CATS.map((item) => (
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
            <Text style={styles.featureText}>Нүүр хуудсанд гарч илүү олон хүнд хүрнэ.</Text>
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
      style={[
        styles.chip,
        {
          backgroundColor: active ? activeColor : C.bgSection,
          borderColor: active ? activeColor : C.border,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? C.bgCard : C.textSub, fontWeight: active ? '800' : '600' }]}>
        {label}
      </Text>
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
  content: { padding: R.lg, paddingTop: R.md },
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerTitle: { ...F.h3, color: C.text, marginTop: R.lg, textAlign: 'center' },
  centerText: { ...F.small, color: C.textMuted, marginTop: R.sm, textAlign: 'center', lineHeight: 20 },
  sectionTitle: { ...F.h4, color: C.text, marginBottom: R.sm },
  photoRow: { gap: R.sm, marginBottom: R.xl },
  photoWrap: { position: 'relative' },
  photo: { width: 100, height: 100, borderRadius: UI.cardRadius, backgroundColor: C.bgSection },
  removePhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
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
  field: { marginBottom: R.lg },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: R.sm, marginBottom: R.xl },
  chip: {
    minHeight: 38,
    borderRadius: R.full,
    borderWidth: 1,
    paddingHorizontal: R.md,
    paddingVertical: R.sm,
    justifyContent: 'center',
  },
  chipText: { ...F.small },
  featureCard: { flexDirection: 'row', alignItems: 'center', gap: R.md, backgroundColor: `${C.gold}10` },
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
