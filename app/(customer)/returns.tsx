import { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery } from '@tanstack/react-query';
import { get, post } from '../../src/services/api';
import { useAuth } from '../../src/store/auth';
import { encodeApiPathSegment } from '../../src/shared/apiPath';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';
import { RequireAuthScreen } from '../../src/shared/ui/RequireAuthScreen';

const REASONS = [
  'Бараа эвдэрсэн',
  'Буруу бараа ирсэн',
  'Чанар муу',
  'Зургаас өөр',
  'Хэмжээ тохирохгүй',
  'Бусад',
];

export default function ReturnsScreen() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['delivered-orders'],
    queryFn: () => get('/orders'),
    enabled: !!user,
  });
  const orders = resolveOrders(data).filter((order: any) => order.status === 'delivered');

  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const returnMut = useMutation({
    mutationFn: (body: any) => post(`/orders/${encodeApiPathSegment(selected)}/return`, body),
    onSuccess: () => {
      Alert.alert('Амжилттай', 'Буцаалтын хүсэлт илгээгдлээ.');
      setSelected(null);
      setReason('');
      setPhotos([]);
    },
    onError: (error: any) => Alert.alert('Алдаа', error?.message || 'Буцаалтын хүсэлт илгээж чадсангүй.'),
  });

  const pickImage = async () => {
    if (photos.length >= 4) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) setPhotos((current) => [...current, result.assets[0].uri]);
  };

  const submit = () => {
    if (!selected) {
      Alert.alert('Захиалга сонгоно уу');
      return;
    }
    if (!reason) {
      Alert.alert('Шалтгаан сонгоно уу');
      return;
    }
    returnMut.mutate({ reason, images: photos });
  };

  if (!user) {
    return (
      <RequireAuthScreen
        title="Буцаалт"
        subtitle="Захиалгын буцаалт, маргаан үүсгэхийн тулд нэвтэрнэ үү."
        icon="refresh-outline"
        accent={C.primary}
        returnTo="/returns"
      />
    );
  }

  return (
    <AppScreen>
      <Stack.Screen options={{ headerShown: false }} />
      <AppTopBar eyebrow="Дэмжлэг" title="Буцаалт" showBack={false} />
      <AppHeader
        title="Буцаалт"
        subtitle="Хүргэгдсэн захиалгад 48 цагийн дотор буцаалтын хүсэлт илгээнэ."
        icon="refresh-outline"
        accent={C.primary}
      />

      <AppCard style={styles.noticeCard}>
        <View style={styles.noticeIcon}>
          <Ionicons name="shield-checkmark-outline" size={18} color={C.primary} />
        </View>
        <View style={styles.noticeText}>
          <Text style={styles.noticeTitle}>48 цагийн баталгаа</Text>
          <Text style={styles.noticeSub}>Шалтгаан, зураг хавсаргавал хүсэлт хурдан шийдэгдэнэ.</Text>
        </View>
      </AppCard>

      <Text style={styles.sectionTitle}>Захиалга сонгох</Text>
      {isLoading ? (
        <AppCard style={styles.centerCard}>
          <ActivityIndicator color={C.brand} />
          <Text style={styles.mutedText}>Захиалгууд ачаалж байна...</Text>
        </AppCard>
      ) : orders.length === 0 ? (
        <AppCard style={styles.centerCard}>
          <Ionicons name="bag-check-outline" size={44} color={C.textMuted} />
          <Text style={styles.emptyTitle}>Буцааж болох захиалга байхгүй</Text>
          <Text style={styles.mutedText}>Зөвхөн хүргэгдсэн захиалгад буцаалт үүсгэнэ.</Text>
          <View style={styles.emptyActions}>
            <AppButton
              label="Захиалга харах"
              icon="cube-outline"
              onPress={() => router.push('/orders' as any)}
              style={styles.emptyButton}
            />
            <AppButton
              label="Тусламж"
              icon="help-circle-outline"
              variant="secondary"
              onPress={() => router.push('/help' as any)}
              style={styles.emptyButton}
            />
          </View>
        </AppCard>
      ) : (
        <View style={styles.orderList}>
          {orders.map((order: any) => {
            const id = getOrderId(order);
            const active = selected === id;
            return (
              <TouchableOpacity
                key={id}
                activeOpacity={0.86}
                onPress={() => setSelected(active ? null : id)}
                accessibilityRole="button"
                accessibilityLabel={`Захиалга #${shortId(order.orderNumber ?? id)} сонгох`}
                accessibilityState={{ selected: active }}
              >
                <AppCard style={[styles.orderCard, active ? styles.orderCardActive : null]}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>#{shortId(order.orderNumber ?? id)}</Text>
                    <Ionicons
                      name={active ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={active ? C.primary : C.textMuted}
                    />
                  </View>
                  <Text style={styles.orderTotal}>{formatMoney(order.total || 0)}</Text>
                  <Text style={styles.mutedText} numberOfLines={1}>{itemSummary(order.items)}</Text>
                </AppCard>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {selected ? (
        <View style={styles.formBlock}>
          <Text style={styles.sectionTitle}>Шалтгаан</Text>
          <View style={styles.chips}>
            {REASONS.map((item) => {
              const active = reason === item;
              return (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.84}
                  onPress={() => setReason(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item} шалтгаан сонгох`}
                  accessibilityState={{ selected: active }}
                  style={[styles.chip, active ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Зураг</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            {photos.map((uri) => (
              <TouchableOpacity
                key={uri}
                activeOpacity={0.86}
                onPress={() => setPhotos((current) => current.filter((item) => item !== uri))}
                accessibilityRole="button"
                accessibilityLabel="Зураг устгах"
              >
                <Image source={{ uri }} style={styles.photo} />
                <View style={styles.photoRemove}>
                  <Ionicons name="close-circle" size={20} color={C.error} />
                </View>
              </TouchableOpacity>
            ))}
            {photos.length < 4 ? (
              <TouchableOpacity
                activeOpacity={0.84}
                style={styles.addPhoto}
                onPress={pickImage}
                accessibilityRole="button"
                accessibilityLabel="Зураг нэмэх"
              >
                <Ionicons name="camera-outline" size={24} color={C.textMuted} />
                <Text style={styles.addPhotoText}>Нэмэх</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>

          <AppButton
            label={returnMut.isPending ? 'Илгээж байна' : 'Буцаалт хүсэх'}
            icon="send-outline"
            disabled={returnMut.isPending}
            onPress={submit}
          />
        </View>
      ) : null}
    </AppScreen>
  );
}

function resolveOrders(data: any): any[] {
  if (Array.isArray(data?.orders)) return data.orders;
  if (Array.isArray(data?.data?.orders)) return data.data.orders;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

function getOrderId(order: any) {
  return String(order.id ?? order._id ?? order.orderId ?? order.orderNumber ?? '');
}

function shortId(value: any) {
  const id = String(value ?? '').trim();
  return id ? id.slice(-6).toLocaleUpperCase('en-US') : 'ORDER';
}

function itemSummary(items: any) {
  if (!Array.isArray(items) || items.length === 0) return 'Бараа бүртгэгдээгүй';
  return items.map((item: any) => item.name ?? item.productName ?? item.product?.name ?? 'Бараа').join(', ');
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString('mn-MN')}₮`;
}

const styles = StyleSheet.create({
  noticeCard: { flexDirection: 'row', alignItems: 'center', gap: R.md, marginBottom: R.md },
  noticeIcon: {
    width: 40,
    height: 40,
    borderRadius: UI.controlRadius,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeText: { flex: 1 },
  noticeTitle: { ...F.small, color: C.text, fontWeight: '900' },
  noticeSub: { ...F.tiny, color: C.textMuted, marginTop: 2 },
  sectionTitle: { ...F.h4, color: C.text, marginBottom: R.sm },
  centerCard: { alignItems: 'center', gap: R.sm, marginBottom: R.md },
  emptyTitle: { ...F.body, color: C.text, fontWeight: '900', textAlign: 'center' },
  mutedText: { ...F.small, color: C.textMuted, lineHeight: 20 },
  emptyActions: {
    width: '100%',
    flexDirection: 'row',
    gap: R.sm,
    marginTop: R.sm,
  },
  emptyButton: { flex: 1 },
  orderList: { gap: R.sm, marginBottom: R.md },
  orderCard: { padding: R.md },
  orderCardActive: { borderColor: C.primary, backgroundColor: C.primaryDim },
  orderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: R.md },
  orderNumber: { ...F.small, color: C.primary, fontWeight: '900' },
  orderTotal: { ...F.h4, color: C.brand, marginVertical: 4 },
  formBlock: { gap: R.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: R.sm, marginBottom: R.md },
  chip: {
    backgroundColor: C.bgSection,
    borderRadius: R.full,
    paddingHorizontal: R.md,
    paddingVertical: R.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { ...F.small, color: C.textSub, fontWeight: '800' },
  chipTextActive: { color: C.bgCard },
  photoRow: { gap: R.sm, paddingBottom: R.md },
  photo: { width: 72, height: 72, borderRadius: UI.controlRadius, backgroundColor: C.bgSection },
  photoRemove: { position: 'absolute', top: -6, right: -4, backgroundColor: C.bgCard, borderRadius: R.full },
  addPhoto: {
    width: 72,
    height: 72,
    borderRadius: UI.controlRadius,
    backgroundColor: C.bgSection,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addPhotoText: { ...F.tiny, color: C.textMuted, fontWeight: '800' },
});
