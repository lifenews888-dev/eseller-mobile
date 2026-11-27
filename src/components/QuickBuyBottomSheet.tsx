import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  StyleSheet, Image, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { apiUrl } from '../config/apiBase';
import * as SecureStore from '../shared/secureStore';
import { C, F, R } from '../shared/design';
import {
  firstProductImage,
  getPublicProductPrice,
  getPublicProductQualityIssue,
} from '../shared/productQuality';
import { AppButton } from '../shared/ui/AppUI';

interface Props {
  product: {
    id: string;
    name: string;
    price: number;
    salePrice?: number | null;
    images: string[];
    stock?: number;
  };
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QuickBuyBottomSheet({ product, visible, onClose, onSuccess }: Props) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  const stock = product.stock ?? 999;
  const qualityIssue = getPublicProductQualityIssue(product);
  const price = getPublicProductPrice(product);
  const image = firstProductImage(product);

  async function handleOrder() {
    if (qualityIssue) {
      Alert.alert('Бараа шалгалтад байна', qualityIssue.message);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const res = await fetch(apiUrl('/quick-order'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ productId: product.id, quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        Alert.alert('Алдаа', data.error || 'Алдаа гарлаа');
        return;
      }
      const link = data.data?.followUpLink || data.followUpLink;
      if (link) {
        await Linking.openURL(link);
        onSuccess?.();
        onClose();
      } else {
        Alert.alert('Алдаа', 'Төлбөрийн link үүсгэж чадсангүй');
      }
    } catch {
      Alert.alert('Алдаа', 'Сүлжээний алдаа');
    }
    setLoading(false);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} onPress={onClose} activeOpacity={1} />
      <View style={s.sheet}>
        <View style={s.handle} />

        <View style={s.sheetHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.sheetKicker}>Шуурхай худалдан авалт</Text>
            <Text style={s.sheetTitle}>QPay захиалга</Text>
          </View>
          <TouchableOpacity activeOpacity={0.82} onPress={onClose} hitSlop={8} style={s.closeBtn}>
            <Ionicons name="close" size={20} color={C.text} />
          </TouchableOpacity>
        </View>

        <View style={s.productRow}>
          <Image
            source={{ uri: image }}
            style={s.thumb}
          />
          <View style={s.productInfo}>
            <Text style={s.productName}>{product.name}</Text>
            <Text style={s.productPrice}>
              {qualityIssue?.code === 'invalid-price' ? 'Үнэ шалгалтад байна' : `${(price * qty).toLocaleString()}₮`}
            </Text>
            <Text style={s.productStock}>Нөөц: {stock}ш</Text>
          </View>
        </View>

        {qualityIssue ? (
          <View style={s.qualityBanner}>
            <Ionicons name="shield-checkmark-outline" size={16} color={C.gold} />
            <Text style={s.qualityText}>{qualityIssue.message}</Text>
          </View>
        ) : null}

        <View style={s.qtyRow}>
          <Text style={s.qtyLabel}>Тоо хэмжээ</Text>
          <View style={s.qtyCtrl}>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setQty(Math.max(1, qty - 1));
              }}
              style={s.qtyBtn}
            >
              <Text style={s.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={s.qtyNum}>{qty}</Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setQty(Math.min(stock, qty + 1));
              }}
              style={[s.qtyBtn, s.qtyBtnActive]}
            >
              <Text style={[s.qtyBtnText, s.qtyBtnActiveText]}>＋</Text>
            </TouchableOpacity>
          </View>
        </View>

        <AppButton
          label={
            qualityIssue
              ? 'Шалгалтад байна'
              : loading
                ? 'Захиалга үүсгэж байна'
                : `${(price * qty).toLocaleString()}₮ — QPay-р төлөх`
          }
          icon="qr-code-outline"
          onPress={handleOrder}
          disabled={loading || !!qualityIssue}
          style={s.orderBtn}
        />
        <View style={s.safeRow}>
          <Ionicons name="lock-closed-outline" size={13} color={C.success} />
          <Text style={s.safeText}>Аюулгүй · Дундын дансны хамгаалалт</Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.text + '80' },
  sheet: { backgroundColor: C.bgCard, borderRadius: R.xxl, paddingBottom: 34, paddingTop: 4 },
  handle: { width: 36, height: 4, backgroundColor: C.border2, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
    paddingHorizontal: R.lg,
    paddingTop: R.md,
    paddingBottom: R.sm,
  },
  sheetKicker: { ...F.tiny, color: C.textMuted, fontWeight: '800' },
  sheetTitle: { ...F.h3, color: C.text, marginTop: 2 },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: R.md,
    backgroundColor: C.bgSection,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productRow: {
    flexDirection: 'row', gap: 12, padding: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  thumb: { width: 72, height: 72, borderRadius: R.md },
  productInfo: { flex: 1, justifyContent: 'center' },
  productName: { ...F.body, fontWeight: '800', color: C.text },
  productPrice: { ...F.h3, color: C.brand, marginTop: 4 },
  productStock: { ...F.tiny, color: C.textMuted, marginTop: 2 },
  qualityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
    marginHorizontal: R.lg,
    marginTop: -R.sm,
    marginBottom: R.sm,
    padding: R.sm,
    borderRadius: R.md,
    backgroundColor: C.goldDim,
    borderWidth: 1,
    borderColor: C.gold + '35',
  },
  qualityText: { ...F.small, color: C.textSub, flex: 1 },
  qtyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  qtyLabel: { ...F.small, fontWeight: '800', color: C.text },
  qtyCtrl: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: R.full,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  qtyBtnActiveText: { color: C.bgCard },
  qtyBtnText: { fontSize: 18, color: C.text, fontWeight: '700' },
  qtyNum: { ...F.body, fontWeight: '800', minWidth: 24, textAlign: 'center' },
  orderBtn: { margin: 16 },
  safeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: R.xs,
    marginTop: -8,
  },
  safeText: { textAlign: 'center', ...F.tiny, color: C.textMuted },
});
