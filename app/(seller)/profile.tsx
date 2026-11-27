import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/store/auth';
import { LogoutButton } from '../../src/components/LogoutButton';
import { ErrorState } from '../../src/shared/ui/ErrorState';
import { C, F, R } from '../../src/shared/design';
import {
  Card,
  InfoRow,
  MenuRow,
  PC,
  ProfileHeader,
  SectionTitle,
  StatusBadge,
} from '../../src/components/profile-ui';
import { getReferralCode, getReferralLink, getTierLabel } from '../../src/utils/profile';
import { useSellerMe } from '../../src/hooks/useSellerDashboard';
import { useSellerNetworkEnabled } from '../../src/config/remoteFlags';
import { AppScreen, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

function statusToBadgeState(status?: string): 'ok' | 'pending' | 'missing' {
  if (status === 'ACTIVE') return 'ok';
  if (status === 'PENDING') return 'pending';
  return 'missing';
}

function mnSellerStatus(status?: string): string {
  switch (status) {
    case 'PENDING': return 'Хүлээгдэж байна';
    case 'ACTIVE': return 'Идэвхтэй';
    case 'SUSPENDED': return 'Түр түдгэлзүүлсэн';
    case 'REJECTED': return 'Татгалзсан';
    default: return status ?? '—';
  }
}

function mnKycStatus(status?: string): string {
  switch (status) {
    case 'NOT_STARTED': return 'Эхлээгүй';
    case 'PENDING': return 'Хүлээгдэж байна';
    case 'APPROVED': return 'Зөвшөөрсөн';
    case 'REJECTED': return 'Татгалзсан';
    case 'NEEDS_REVIEW': return 'Шалгалтанд';
    default: return status ?? '—';
  }
}

function mnIdentityStatus(status?: string): string {
  if (status === 'VERIFIED') return 'Баталгаажсан';
  if (status === 'PENDING') return 'Хүлээгдэж байна';
  if (status === 'REJECTED') return 'Татгалзсан';
  return status ?? 'Байхгүй';
}

function mnEligibility(value?: string): string {
  if (value === 'NOT_AVAILABLE') return 'Одоогоор байхгүй';
  if (value === 'AVAILABLE') return 'Боломжтой';
  return value ?? '—';
}

export default function SellerProfile() {
  const { user } = useAuth();
  const layout = useAppLayoutMetrics();
  const refLink = getReferralLink(user?.id ?? user?._id);
  const refCode = getReferralCode(user?.id ?? user?._id);
  const sellerNetworkEnabled = useSellerNetworkEnabled();
  const me = useSellerMe({ enabled: sellerNetworkEnabled });

  async function copyReferral() {
    try {
      await Clipboard.setStringAsync(refLink);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Хуулсан', refLink);
    } catch {
      Alert.alert('Алдаа', 'Урилгын холбоос хуулах боломжгүй байна.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: PC.bg }}>
      <ProfileHeader
        icon="megaphone-outline"
        accent={C.seller}
        name={user?.name ?? 'Борлуулагч'}
        sub={user?.email ?? user?.phone ?? ''}
        roleLabel="Борлуулагч"
      />

      <AppScreen style={{ flex: 1 }} contentContainerStyle={{ paddingTop: R.sm, paddingBottom: layout.screenBottom }}>
        <SectionTitle>Борлуулагчийн мэдээлэл</SectionTitle>
        <Card>
          <InfoRow icon="link-outline" label="Урилгын код" value={refCode} accent={C.seller} onCopy={copyReferral} />
          <InfoRow icon="cash-outline" label="Комиссын хувь" value="—" accent={C.secondary} />
          <InfoRow icon="trophy-outline" label="Түвшин" value={getTierLabel(null)} accent={C.gold} />
          <InfoRow icon="bar-chart-outline" label="Нийт борлуулалт" value="—" accent={C.primary} />
        </Card>

        {sellerNetworkEnabled ? <SellerNetworkCard me={me} /> : null}

        <SectionTitle>Самбар</SectionTitle>
        <Card>
          <MenuRow icon="home-outline" label="Самбар" accent={C.seller} onPress={() => router.push('/seller/dashboard' as never)} />
          <MenuRow icon="cube-outline" label="Каталог" accent={C.primary} onPress={() => router.push('/seller/catalog' as never)} />
          <MenuRow icon="cash-outline" label="Орлого" accent={C.secondary} onPress={() => router.push('/seller/earnings' as never)} />
          <MenuRow icon="trophy-outline" label="Топ жагсаалт" accent={C.gold} onPress={() => router.push('/seller/leaderboard' as never)} />
          <MenuRow icon="gift-outline" label="Урилгын код" accent={C.seller} onPress={() => router.push('/seller/referral' as never)} />
        </Card>

        <SectionTitle>Нийгмийн сүлжээ</SectionTitle>
        <Card>
          <MenuRow icon="logo-instagram" label="Instagram холбох" accent={C.error} onPress={() => {}} />
          <MenuRow icon="musical-notes-outline" label="TikTok холбох" accent={C.text} onPress={() => {}} />
          <MenuRow icon="logo-facebook" label="Facebook холбох" accent={C.primary} onPress={() => {}} />
        </Card>

        <SectionTitle>Тохиргоо</SectionTitle>
        <Card>
          <MenuRow icon="create-outline" label="Профайл засах" accent={C.primary} onPress={() => router.push('/edit-profile' as never)} />
          <MenuRow icon="notifications-outline" label="Мэдэгдэл" accent={C.seller} onPress={() => router.push('/notification-settings' as never)} />
          <MenuRow icon="shield-checkmark-outline" label="Аюулгүй байдал" accent={C.secondary} onPress={() => router.push('/security' as never)} />
        </Card>

        <LogoutButton />
      </AppScreen>
    </View>
  );
}

function SellerNetworkCard({ me }: { me: ReturnType<typeof useSellerMe> }) {
  return (
    <>
      <SectionTitle>Худалдагчийн сүлжээний статус</SectionTitle>
      <Card>
        {me.isLoading ? (
          <InfoRow icon="time-outline" label="Ачааллаж байна" value="" accent={C.seller} />
        ) : me.isError ? (
          <View style={{ padding: R.md }}>
            <ErrorState
              compact
              title="Статус ачаалж чадсангүй"
              subtitle="Дахин оролдоно уу"
              onRetry={me.refetch}
            />
          </View>
        ) : me.data ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: R.md }}>
              <Text style={{ ...F.small, color: PC.text }}>Профайлын төлөв</Text>
              <StatusBadge status={statusToBadgeState(me.data.resellerProfile.status)} label={mnSellerStatus(me.data.resellerProfile.status)} />
            </View>
            <InfoRow icon="id-card-outline" label="KYC" value={mnKycStatus(me.data.resellerProfile.kycStatus)} accent={C.primary} />
            <InfoRow icon="link-outline" label="Identity холбоо" value={mnIdentityStatus(me.data.identityLink?.status)} accent={C.secondary} />
            <InfoRow icon="card-outline" label="Олголтын эрх" value={mnEligibility(me.data.financeEligibility)} accent={C.seller} />
          </>
        ) : null}
      </Card>
    </>
  );
}
