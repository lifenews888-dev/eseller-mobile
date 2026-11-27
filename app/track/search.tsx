import { useEffect, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { C, F, R, UI } from '../../src/shared/design';
import { encodeRouteParam } from '../../src/shared/routeParams';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

export default function TrackSearchScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const layout = useAppLayoutMetrics();
  const [code, setCode] = useState('');

  useEffect(() => {
    setCode(typeof params.code === 'string' ? params.code : '');
  }, [params.code]);

  const handleCodeChange = (value: string) => {
    setCode(value);
  };

  const clearCode = () => {
    setCode('');
    router.replace('/track/search' as any);
  };

  const submit = () => {
    const value = code.trim();
    if (!value) {
      Alert.alert('Код оруулна уу', 'Захиалгын хяналтын кодоо бичнэ үү.');
      return;
    }
    router.push(`/track/${encodeRouteParam(value)}` as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <AppScreen contentContainerStyle={{ paddingBottom: layout.screenBottom + 96 }}>
        <AppTopBar eyebrow="Хүргэлт" title="Хүргэлт шалгах" />

        <AppHeader
          title="Хүргэлт шалгах"
          subtitle="Захиалгын хяналтын кодоо оруулаад хүргэлтийн явцыг харна."
          icon="barcode-outline"
          accent={C.driver}
        />

        <AppCard style={{ marginBottom: R.md }}>
        <Text style={{ ...F.h4, color: C.text, marginBottom: R.sm }}>Хяналтын код</Text>
        <View
          style={{
            minHeight: 50,
            backgroundColor: C.bgSection,
            borderRadius: UI.controlRadius,
            borderWidth: 1,
            borderColor: C.border,
            paddingHorizontal: R.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: R.sm,
          }}
        >
          <Ionicons name="barcode-outline" size={20} color={C.textMuted} />
          <TextInput
            value={code}
            onChangeText={handleCodeChange}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="Жишээ: ES123456"
            placeholderTextColor={C.textMuted}
            returnKeyType="go"
            onSubmitEditing={submit}
            accessibilityLabel="Хяналтын код"
            accessibilityHint="Захиалгын хүргэлтийг шалгах кодоо оруулна уу"
            style={{ flex: 1, color: C.text, paddingVertical: R.sm, fontSize: 16 }}
          />
          {code.length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={clearCode}
              accessibilityRole="button"
              accessibilityLabel="Хяналтын код цэвэрлэх"
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={C.textMuted} />
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
          backgroundColor: C.bgCard,
          padding: UI.screenPad,
          paddingBottom: layout.insets.bottom + R.lg,
          borderTopWidth: 1,
          borderTopColor: C.border,
        }}
      >
        <AppButton
          label="Шалгах"
          icon="search-outline"
          onPress={submit}
          accessibilityHint="Хяналтын кодоор хүргэлтийн явцыг нээнэ"
          style={{ backgroundColor: C.driver, borderColor: C.driver }}
        />
      </View>
    </View>
  );
}
