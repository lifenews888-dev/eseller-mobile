import { useEffect, useState } from 'react';
import { Alert, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { get, put } from '../../src/services/api';
import { LogoutButton } from '../../src/components/LogoutButton';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

type SettingsForm = {
  name: string;
  phone: string;
  address: string;
  description: string;
  hours: string;
};

type FieldConfig = {
  key: keyof SettingsForm;
  label: string;
  placeholder: string;
  keyboard?: KeyboardTypeOptions;
  multiline?: boolean;
};

const FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Дэлгүүрийн нэр', placeholder: 'Миний дэлгүүр' },
  { key: 'phone', label: 'Утасны дугаар', placeholder: '9911-XXXX', keyboard: 'phone-pad' },
  { key: 'address', label: 'Хаяг', placeholder: 'БЗД, 3-р хороо' },
  { key: 'hours', label: 'Ажиллах цаг', placeholder: '09:00 - 21:00' },
  {
    key: 'description',
    label: 'Тайлбар',
    placeholder: 'Дэлгүүрийн тухай...',
    multiline: true,
  },
];

export default function OwnerSettings() {
  const [form, setForm] = useState<SettingsForm>({
    name: '',
    phone: '',
    address: '',
    description: '',
    hours: '09:00 - 21:00',
  });

  const { data } = useQuery({
    queryKey: ['shop-settings'],
    queryFn: () => get('/store/settings'),
  });

  useEffect(() => {
    const shop = (data as any)?.shop || (data as any);
    if (shop?.name) {
      setForm({
        name: shop.name || '',
        phone: shop.phone || '',
        address: shop.address || '',
        description: shop.description || '',
        hours: shop.hours || '09:00 - 21:00',
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: SettingsForm) => put('/store/settings', payload),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Амжилттай', 'Хадгалагдлаа');
    },
    onError: (e: any) => Alert.alert('Алдаа', e?.message || 'Хадгалах үед алдаа гарлаа'),
  });

  return (
    <AppScreen>
      <AppTopBar eyebrow="Дэлгүүр" title="Тохиргоо" showBack={false} />

      <AppHeader
        title="Дэлгүүрийн тохиргоо"
        subtitle="Хаяг, холбоо барих мэдээлэл, ажиллах цагийг шинэчилнэ."
        icon="settings-outline"
        accent={C.store}
      />

      <AppCard style={{ gap: R.md }}>
        {FIELDS.map((field) => (
          <View key={field.key} style={{ gap: R.sm }}>
            <Text style={{ ...F.small, color: C.textSub, fontWeight: '800' }}>
              {field.label}
            </Text>
            <TextInput
              value={form[field.key]}
              onChangeText={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
              placeholder={field.placeholder}
              placeholderTextColor={C.textMuted}
              keyboardType={field.keyboard || 'default'}
              multiline={field.multiline}
              numberOfLines={field.multiline ? 4 : 1}
              style={{
                minHeight: field.multiline ? 104 : 46,
                backgroundColor: C.bgInput,
                borderRadius: UI.controlRadius,
                paddingHorizontal: R.md,
                paddingVertical: R.md,
                color: C.text,
                fontSize: 14,
                borderWidth: 1,
                borderColor: C.border,
                textAlignVertical: field.multiline ? 'top' : 'center',
              }}
            />
          </View>
        ))}

        <AppButton
          label={saveMutation.isPending ? 'Хадгалж байна...' : 'Хадгалах'}
          icon="save-outline"
          disabled={saveMutation.isPending}
          onPress={() => saveMutation.mutate(form)}
          style={{ backgroundColor: C.store, borderColor: C.store, marginTop: R.sm }}
        />
      </AppCard>

      <LogoutButton />
    </AppScreen>
  );
}
