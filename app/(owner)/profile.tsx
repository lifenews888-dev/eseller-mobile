import { View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../src/store/auth';
import { get } from '../../src/services/api';
import { LogoutButton } from '../../src/components/LogoutButton';
import { C, R } from '../../src/shared/design';
import {
  Card,
  InfoRow,
  MenuRow,
  PC,
  ProfileHeader,
  SectionTitle,
  StatCard,
} from '../../src/components/profile-ui';
import { formatCurrency, formatCount } from '../../src/utils/profile';
import { AppScreen, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

export default function OwnerProfile() {
  const { user } = useAuth();
  const layout = useAppLayoutMetrics();

  const { data } = useQuery({
    queryKey: ['owner-stats'],
    queryFn: () => get('/seller/analytics'),
  });
  const stats = (data as any)?.stats || (data as any) || {};

  return (
    <View style={{ flex: 1, backgroundColor: PC.bg }}>
      <ProfileHeader
        icon="storefront-outline"
        accent={C.store}
        name={user?.name ?? 'Дэлгүүрийн эзэн'}
        sub={user?.email ?? user?.phone ?? ''}
        roleLabel="Баталгаажсан дэлгүүр"
      />

      <AppScreen style={{ flex: 1 }} contentContainerStyle={{ paddingTop: R.sm, paddingBottom: layout.screenBottom }}>
        <SectionTitle>Хурдан статистик</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: R.sm }}>
          <StatCard icon="cube-outline" label="Нийт бараа" value={formatCount(stats.products)} color={C.secondary} />
          <StatCard icon="receipt-outline" label="Нийт захиалга" value={formatCount(stats.orders)} color={C.primary} />
          <StatCard icon="cash-outline" label="Нийт орлого" value={formatCurrency(stats.revenue)} color={C.seller} />
          <StatCard icon="star-outline" label="Дундаж үнэлгээ" value={stats.rating ? `${stats.rating}` : '—'} color={C.gold} />
        </View>

        <SectionTitle>Хувийн мэдээлэл</SectionTitle>
        <Card>
          <InfoRow icon="person-outline" label="Нэр" value={user?.name ?? '—'} accent={C.store} />
          <InfoRow icon="mail-outline" label="Имэйл" value={user?.email ?? '—'} accent={C.primary} />
          <InfoRow icon="call-outline" label="Утас" value={user?.phone ?? '—'} accent={C.secondary} />
          <MenuRow icon="create-outline" label="Профайл засах" accent={C.primary} onPress={() => router.push('/edit-profile' as never)} />
        </Card>

        <SectionTitle>Хэтэвч</SectionTitle>
        <Card>
          <MenuRow icon="card-outline" label="Баланс харах" accent={C.primary} onPress={() => router.push('/wallet' as never)} />
          <MenuRow icon="star-outline" label="Урамшууллын оноо" accent={C.gold} onPress={() => router.push('/tier-details' as never)} />
        </Card>

        <SectionTitle>Дэлгүүр</SectionTitle>
        <Card>
          <MenuRow icon="settings-outline" label="Дэлгүүрийн тохиргоо" accent={C.store} onPress={() => router.push('/owner/settings' as never)} />
          <MenuRow icon="desktop-outline" label="POS терминал" accent={C.primary} onPress={() => router.push('/owner/pos' as never)} />
          <MenuRow icon="bar-chart-outline" label="Тайлан" accent={C.seller} onPress={() => router.push('/owner/analytics' as never)} />
        </Card>

        <SectionTitle>Тохиргоо</SectionTitle>
        <Card>
          <MenuRow icon="notifications-outline" label="Мэдэгдэл" accent={C.seller} onPress={() => router.push('/notification-settings' as never)} />
          <MenuRow icon="shield-checkmark-outline" label="Аюулгүй байдал" accent={C.secondary} onPress={() => router.push('/security' as never)} />
          <MenuRow icon="help-circle-outline" label="Тусламж" accent={C.primary} onPress={() => router.push('/help' as never)} />
        </Card>

        <LogoutButton />
      </AppScreen>
    </View>
  );
}
