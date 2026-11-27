import React, { useEffect, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { C, F, R, UI } from '../../src/shared/design';
import { normalizeRouteParam } from '../../src/shared/routeParams';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

type CouponType = 'percent' | 'fixed';

function normalizeCouponType(value?: string | string[] | null): CouponType {
  const raw = normalizeRouteParam(value);
  return raw === 'fixed' ? 'fixed' : 'percent';
}

export default function CreateCouponScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [type, setType] = useState<CouponType>(() => normalizeCouponType(params.type));
  const [minOrder, setMinOrder] = useState('');
  const [expiry, setExpiry] = useState('');

  useEffect(() => {
    setType(normalizeCouponType(params.type));
  }, [params.type]);

  const selectType = (nextType: CouponType) => {
    setType(nextType);
    router.replace(
      nextType === 'percent'
        ? ('/owner/create-coupon' as any)
        : ({ pathname: '/owner/create-coupon' as any, params: { type: nextType } } as any),
    );
  };

  const handleCreate = () => {
    if (!code.trim() || !discount.trim()) {
      Alert.alert('Анхаар', 'Код болон хямдралын хэмжээг оруулна уу');
      return;
    }

    Alert.alert('Амжилттай', `"${code}" купон үүслээ`, [
      { text: 'За', onPress: () => router.back() },
    ]);
  };

  return (
    <AppScreen>
      <AppTopBar eyebrow="Дэлгүүр" title="Купон" />

      <AppHeader
        title="Купон үүсгэх"
        subtitle="Дэлгүүрийн захиалгад ашиглах промо код тохируулна."
        icon="ticket-outline"
        accent={C.store}
      />

      <AppCard style={{ gap: R.md }}>
        <Field label="Купоны код">
          <TextInput
            style={inputStyle}
            placeholder="SUMMER2026"
            placeholderTextColor={C.textMuted}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
          />
        </Field>

        <Field label="Хямдралын төрөл">
          <View style={{ flexDirection: 'row', gap: R.sm }}>
            <TypeButton
              active={type === 'percent'}
              label="% Хувиар"
              onPress={() => selectType('percent')}
            />
            <TypeButton
              active={type === 'fixed'}
              label="₮ Дүнгээр"
              onPress={() => selectType('fixed')}
            />
          </View>
        </Field>

        <Field label={`Хямдралын хэмжээ ${type === 'percent' ? '(%)' : '(₮)'}`}>
          <TextInput
            style={inputStyle}
            placeholder={type === 'percent' ? '10' : '5000'}
            placeholderTextColor={C.textMuted}
            value={discount}
            onChangeText={setDiscount}
            keyboardType="numeric"
          />
        </Field>

        <Field label="Хамгийн бага захиалгын дүн">
          <TextInput
            style={inputStyle}
            placeholder="20000"
            placeholderTextColor={C.textMuted}
            value={minOrder}
            onChangeText={setMinOrder}
            keyboardType="numeric"
          />
        </Field>

        <Field label="Дуусах огноо">
          <TextInput
            style={inputStyle}
            placeholder="2026-12-31"
            placeholderTextColor={C.textMuted}
            value={expiry}
            onChangeText={setExpiry}
          />
        </Field>

        <View style={{ flexDirection: 'row', gap: R.sm, marginTop: R.sm }}>
          <AppButton
            label="Буцах"
            variant="secondary"
            icon="arrow-back"
            onPress={() => router.back()}
            style={{ flex: 1 }}
          />
          <AppButton
            label="Үүсгэх"
            icon="checkmark"
            onPress={handleCreate}
            style={{ flex: 2, backgroundColor: C.store, borderColor: C.store }}
          />
        </View>
      </AppCard>
    </AppScreen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: R.sm }}>
      <Text style={{ ...F.small, color: C.textSub, fontWeight: '800' }}>{label}</Text>
      {children}
    </View>
  );
}

function TypeButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 44,
        borderRadius: UI.controlRadius,
        borderWidth: 1,
        borderColor: active ? C.store : C.border,
        backgroundColor: active ? C.store + '14' : C.bgSection,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: R.sm,
      }}
    >
      <Text style={{ ...F.small, color: active ? C.store : C.textSub, fontWeight: '800' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const inputStyle = {
  backgroundColor: C.bgInput,
  borderRadius: UI.controlRadius,
  paddingHorizontal: R.md,
  paddingVertical: R.md,
  fontSize: 15,
  color: C.text,
  borderWidth: 1,
  borderColor: C.border,
};
