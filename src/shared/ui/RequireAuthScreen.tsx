import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { C, F, R } from '../design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from './AppUI';

type IconName = keyof typeof Ionicons.glyphMap;

type RequireAuthScreenProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: IconName;
  accent?: string;
  returnTo: string;
};

export function RequireAuthScreen({
  title,
  subtitle = 'Энэ хэсгийг ашиглахын тулд нэвтэрнэ үү.',
  eyebrow = 'Профайл',
  icon = 'lock-closed-outline',
  accent = C.primary,
  returnTo,
}: RequireAuthScreenProps) {
  return (
    <AppScreen>
      <AppTopBar eyebrow={eyebrow} title={title} showBack={false} />
      <AppHeader title={title} subtitle={subtitle} icon={icon} accent={accent} />
      <AppCard style={{ alignItems: 'center', justifyContent: 'center', gap: R.sm, paddingVertical: R.xxxl }}>
        <Ionicons name="lock-closed-outline" size={42} color={accent} />
        <Text style={{ ...F.h3, color: C.text, textAlign: 'center' }}>Нэвтрэх шаардлагатай</Text>
        <Text style={{ ...F.small, color: C.textSub, textAlign: 'center', lineHeight: 20 }}>
          Бүртгэлээрээ нэвтэрсний дараа энэ хэсгийн мэдээлэл харагдана.
        </Text>
        <View style={{ flexDirection: 'row', gap: R.sm, marginTop: R.sm, width: '100%' }}>
          <AppButton
            label="Нэвтрэх"
            icon="log-in-outline"
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: '/login', params: { returnTo } } as never)}
          />
          <AppButton
            label="Бүртгүүлэх"
            icon="person-add-outline"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: '/register', params: { returnTo } } as never)}
          />
        </View>
      </AppCard>
    </AppScreen>
  );
}
