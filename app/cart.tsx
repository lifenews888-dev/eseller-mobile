import { Alert, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCart } from '../src/store/cart';
import { C, F, R, UI } from '../src/shared/design';
import { getCartItemQualityIssue, getInvalidCartItems } from '../src/shared/productQuality';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar, useAppLayoutMetrics } from '../src/shared/ui/AppUI';
import { FREE_DELIVERY_THRESHOLD, deliveryFeeFor } from '../src/shared/orderPricing';

export default function CartScreen() {
  const { items, remove, update, total, count } = useCart();
  const layout = useAppLayoutMetrics();
  const cartIssues = getInvalidCartItems(items);
  const hasCartIssues = cartIssues.length > 0;

  const handleCheckout = () => {
    if (cartIssues.length) {
      const firstIssue = cartIssues[0];
      Alert.alert(
        'Сагсаа шалгана уу',
        `${firstIssue.item.name || 'Бараа'}: ${firstIssue.issue.message}`,
      );
      return;
    }
    router.push('/checkout' as any);
  };

  if (!items.length) {
    return (
      <AppScreen contentContainerStyle={{ flexGrow: 1 }}>
        <AppTopBar eyebrow="Худалдан авалт" title="Сагс" />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <AppCard style={{ alignItems: 'center', gap: R.sm }}>
            <Ionicons name="cart-outline" size={50} color={C.textMuted} />
            <Text style={{ ...F.h4, color: C.text, textAlign: 'center' }}>Сагс хоосон байна</Text>
            <Text style={{ ...F.small, color: C.textSub, textAlign: 'center' }}>
              Дэлгүүрээс бараа сонгоод сагсандаа нэмээрэй.
            </Text>
            <AppButton label="Дэлгүүр үзэх" icon="storefront-outline" onPress={() => router.push('/store' as any)} />
          </AppCard>
        </View>
      </AppScreen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: R.lg,
          paddingTop: layout.screenTop,
          paddingBottom: layout.screenBottom + (hasCartIssues ? 132 : 88),
        }}
        ListHeaderComponent={
          <>
            <AppTopBar eyebrow="Худалдан авалт" title={`Сагс (${count()})`} />
            <AppHeader
              title="Сагс"
              subtitle="Сонгосон бараагаа шалгаад захиалгаа үргэлжлүүлнэ."
              icon="cart-outline"
              accent={C.brand}
              style={{ marginBottom: R.md }}
            />
          </>
        }
        renderItem={({ item }) => {
          const qualityIssue = getCartItemQualityIssue(item);

          return (
            <AppCard style={{ flexDirection: 'row', gap: R.md, padding: R.md, marginBottom: R.sm }}>
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  style={{ width: 82, height: 82, borderRadius: UI.controlRadius, backgroundColor: C.bgSection }}
                  resizeMode="cover"
                  accessibilityLabel={`${item.name} зураг`}
                />
              ) : (
                <View
                  style={{
                    width: 82,
                    height: 82,
                    borderRadius: UI.controlRadius,
                    backgroundColor: C.bgSection,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="cube-outline" size={28} color={C.textMuted} />
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={{ ...F.small, color: C.text, fontWeight: '800' }} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={{ ...F.body, color: qualityIssue?.code === 'invalid-price' ? C.gold : C.brand, fontWeight: '900', marginTop: R.xs }}>
                  {qualityIssue?.code === 'invalid-price' ? 'Үнэ шалгалтад байна' : formatMoney(item.price)}
                </Text>
                {item.entityName ? (
                  <Text style={{ ...F.tiny, color: C.textMuted, marginTop: 2 }} numberOfLines={1}>
                    {item.entityName}
                  </Text>
                ) : null}
                {qualityIssue ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: R.xs }}>
                    <Ionicons name="shield-checkmark-outline" size={13} color={C.gold} />
                    <Text style={{ ...F.tiny, color: C.textSub, flex: 1 }}>{qualityIssue.message}</Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: R.sm, gap: R.sm }}>
                  <QtyButton
                    icon="remove"
                    label={`${item.name} тоо хасах`}
                    disabled={item.qty <= 1 || !!qualityIssue}
                    onPress={() => update(item.id, Math.max(1, item.qty - 1))}
                  />
                  <Text style={{ ...F.small, color: C.text, fontWeight: '900', minWidth: 26, textAlign: 'center' }}>
                    {item.qty}
                  </Text>
                  <QtyButton
                    icon="add"
                    label={`${item.name} тоо нэмэх`}
                    disabled={!!qualityIssue}
                    onPress={() => update(item.id, item.qty + 1)}
                  />
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() => remove(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name} устгах`}
                    hitSlop={8}
                    style={{
                      marginLeft: 'auto',
                      width: 36,
                      height: 36,
                      borderRadius: UI.controlRadius,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="trash-outline" size={19} color={C.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </AppCard>
          );
        }}
      />

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: C.bgCard,
          padding: UI.screenPad,
          paddingBottom: layout.insets.bottom + R.lg,
          borderTopWidth: 1,
          borderTopColor: C.border,
        }}
      >
        {hasCartIssues ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm, backgroundColor: C.goldDim, borderRadius: UI.controlRadius, padding: R.sm, marginBottom: R.sm }}>
            <Ionicons name="shield-checkmark-outline" size={17} color={C.gold} />
            <Text style={{ ...F.tiny, color: C.textSub, flex: 1 }}>
              Шалгалтад байгаа {cartIssues.length} барааг устгаад захиалгаа үргэлжлүүлнэ үү.
            </Text>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: R.md }}>
          <Text style={{ ...F.body, color: C.textSub }}>Барааны дүн</Text>
          <Text style={{ ...F.h2, color: C.brand }}>{formatMoney(total())}</Text>
        </View>
        <Text style={{ ...F.tiny, color: C.textMuted, marginTop: -R.sm, marginBottom: R.md }}>
          {deliveryFeeFor(total()) === 0
            ? 'Хүргэлт үнэгүй'
            : `Хүргэлт ${formatMoney(deliveryFeeFor(total()))} · ${formatMoney(FREE_DELIVERY_THRESHOLD)}-өөс дээш үнэгүй`}
        </Text>
        <AppButton
          label={hasCartIssues ? 'Сагсаа шалгана уу' : `Захиалах (${count()} бараа)`}
          icon="arrow-forward"
          disabled={hasCartIssues}
          onPress={handleCheckout}
        />
      </View>
    </View>
  );
}

function QtyButton({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: 'add' | 'remove';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{
        width: 32,
        height: 32,
        borderRadius: UI.controlRadius,
        backgroundColor: disabled ? C.bg : C.bgSection,
        borderWidth: 1,
        borderColor: C.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Ionicons name={icon} size={16} color={disabled ? C.textMuted : C.text} />
    </TouchableOpacity>
  );
}

function formatMoney(value?: number) {
  return `${Number(value || 0).toLocaleString()}₮`;
}
