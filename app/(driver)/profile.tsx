import { StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/store/auth';
import { LogoutButton } from '../../src/components/LogoutButton';
import { C, F, R, UI } from '../../src/shared/design';
import {
  Card,
  InfoRow,
  MenuRow,
  PC,
  ProfileHeader,
  SectionTitle,
  StatusBadge,
} from '../../src/components/profile-ui';
import { AppScreen, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

export default function DriverProfile() {
  const { user } = useAuth();
  const layout = useAppLayoutMetrics();

  return (
    <View style={styles.screen}>
      <ProfileHeader
        icon="car-outline"
        accent={C.driver}
        name={user?.name ?? 'Жолооч'}
        sub={user?.phone ?? user?.email ?? ''}
        roleLabel="Жолооч"
      />

      <AppScreen
        style={styles.content}
        contentContainerStyle={[styles.contentInner, { paddingBottom: layout.screenBottom }]}
      >
        <View style={styles.onlineCard}>
          <View style={styles.onlineIcon}>
            <Ionicons name="radio-button-on-outline" size={22} color={C.seller} />
          </View>
          <View style={styles.onlineText}>
            <Text style={styles.onlineTitle}>Онлайн төлөв</Text>
            <Text style={styles.onlineSub}>Backend бэлэн болоогүй. Удахгүй идэвхжинэ.</Text>
          </View>
          <Switch
            value={false}
            disabled
            trackColor={{ true: C.secondary, false: C.border2 }}
            thumbColor={C.bgCard}
          />
        </View>

        <SectionTitle>Гүйцэтгэл</SectionTitle>
        <Card>
          <InfoRow icon="star-outline" label="Рейтинг" value="—" accent={C.gold} />
          <InfoRow icon="cube-outline" label="Нийт хүргэлт" value="—" accent={C.driver} />
          <InfoRow icon="calendar-outline" label="Ирц (энэ сар)" value="—" accent={C.primary} />
        </Card>

        <SectionTitle>Самбар</SectionTitle>
        <Card>
          <MenuRow icon="car-outline" label="Хүргэлт" accent={C.driver} onPress={() => router.push('/driver/deliveries' as never)} />
          <MenuRow icon="cash-outline" label="Орлого" accent={C.secondary} onPress={() => router.push('/driver/earnings' as never)} />
        </Card>

        <SectionTitle>Тээврийн хэрэгсэл</SectionTitle>
        <Card>
          <InfoRow icon="car-sport-outline" label="Марк/загвар" value="—" accent={C.driver} />
          <InfoRow icon="barcode-outline" label="Улсын дугаар" value="—" accent={C.primary} />
          <InfoRow icon="color-palette-outline" label="Өнгө" value="—" accent={C.seller} />
          <MenuRow icon="create-outline" label="Засах" accent={C.primary} onPress={() => {}} />
        </Card>

        <SectionTitle>Баримт бичиг</SectionTitle>
        <Card>
          <DocumentRow icon="card-outline" label="Жолооны үнэмлэх" />
          <DocumentRow icon="id-card-outline" label="Иргэний үнэмлэх" />
          <DocumentRow icon="document-text-outline" label="Даатгал" />
        </Card>

        <SectionTitle>Банкны данс</SectionTitle>
        <Card>
          <InfoRow icon="business-outline" label="Банк" value="—" accent={C.primary} />
          <InfoRow icon="card-outline" label="Данс" value="—" accent={C.secondary} />
          <MenuRow icon="create-outline" label="Засах" accent={C.primary} onPress={() => {}} />
        </Card>

        <SectionTitle>Тохиргоо</SectionTitle>
        <Card>
          <MenuRow icon="map-outline" label="Хүргэлтийн бүс" accent={C.driver} onPress={() => {}} />
          <MenuRow icon="notifications-outline" label="Мэдэгдэл" accent={C.seller} onPress={() => router.push('/notification-settings' as never)} />
          <MenuRow icon="shield-checkmark-outline" label="Аюулгүй байдал" accent={C.secondary} onPress={() => router.push('/security' as never)} />
        </Card>

        <LogoutButton />
      </AppScreen>
    </View>
  );
}

function DocumentRow({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.documentRow}>
      <View style={styles.documentIcon}>
        <Ionicons name={icon} size={17} color={C.primary} />
      </View>
      <Text style={styles.documentLabel}>{label}</Text>
      <StatusBadge status="missing" label="Дутуу" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PC.bg },
  content: { flex: 1 },
  contentInner: { paddingTop: R.sm },
  onlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
    backgroundColor: C.bgCard,
    borderRadius: UI.cardRadius,
    borderWidth: 1,
    borderColor: C.border,
    padding: R.lg,
    opacity: 0.82,
  },
  onlineIcon: {
    width: 42,
    height: 42,
    borderRadius: UI.controlRadius,
    backgroundColor: C.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineText: { flex: 1 },
  onlineTitle: { ...F.body, fontWeight: '900', color: C.text },
  onlineSub: { ...F.tiny, color: C.textMuted, marginTop: 3, lineHeight: 16 },
  documentRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
    padding: R.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  documentIcon: {
    width: 34,
    height: 34,
    borderRadius: R.sm,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentLabel: { ...F.small, flex: 1, color: C.textSub },
});
