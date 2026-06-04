import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { C, F, R, UI } from '../../src/shared/design';
import { AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const runtimeRaw = Constants.expoConfig?.runtimeVersion;
  const runtime =
    typeof runtimeRaw === 'string' ? runtimeRaw : (runtimeRaw as any)?.policy ?? '1.0.0';

  function openLink(url: string) {
    Linking.openURL(url).catch(() => {});
  }

  return (
    <AppScreen>
      <Stack.Screen options={{ headerShown: false }} />
      <AppTopBar eyebrow="eSeller" title="Тухай" showBack={false} />
      <AppHeader
        title="eSeller.mn"
        subtitle="Монголын нэгдсэн цахим зах."
        icon="storefront-outline"
        accent={C.brand}
      />

      <AppCard elevated style={st.hero}>
        <View style={st.logoBox}>
          <Ionicons name="storefront-outline" size={34} color={C.brand} />
        </View>
        <Text style={st.brand}>
          eseller<Text style={{ color: C.brand }}>.mn</Text>
        </Text>
        <Text style={st.tagline}>Нэг апп дотор худалдаа, хүргэлт, борлуулалт, үйлчилгээ.</Text>
      </AppCard>

      <AppCard style={st.card}>
        <Text style={st.sectionTitle}>Бидний тухай</Text>
        <Text style={st.paragraph}>
          eSeller.mn нь худалдан авагч, дэлгүүрийн эзэн, борлуулагч, жолооч болон хамтрагчдыг
          нэг платформд холбосон цахим худалдааны үйлчилгээ юм.
        </Text>
        <Text style={st.paragraph}>
          Escrow баталгаа, QPay/SocialPay төлбөр, live commerce, loyalty оноо, BNPL зэрэг
          шийдлээр Монголын жижиг, дунд бизнесийн цахим шилжилтийг дэмжинэ.
        </Text>
        <Text style={st.paragraph}>
          Манай зорилго бол хэрэглэгчид найдвартай худалдан авалт хийх, бизнесүүд илүү хурдан
          борлуулах, үйлчилгээний багууд нэг системээр ажиллах боломж бүрдүүлэх явдал.
        </Text>
      </AppCard>

      <AppCard style={st.card}>
        <MetaRow label="Байгуулагдсан" value="2024" />
        <MetaRow label="Хувилбар" value={`v${version}`} />
        <MetaRow label="Runtime" value={runtime} />
        <MetaRow label="Платформ" value="iOS / Android / Web" />
      </AppCard>

      <View style={st.links}>
        <SocialButton icon="globe-outline" label="Вэб" onPress={() => openLink('https://eseller.mn')} />
        <SocialButton
          icon="logo-facebook"
          label="Facebook"
          onPress={() => openLink('https://facebook.com/eseller.mn')}
        />
        <SocialButton
          icon="logo-instagram"
          label="Instagram"
          onPress={() => openLink('https://instagram.com/eseller.mn')}
        />
      </View>

      <Text style={st.footer}>© 2024-2026 eSeller LLC. Бүх эрх хуулиар хамгаалагдсан.</Text>
    </AppScreen>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.metaRow}>
      <Text style={st.metaLabel}>{label}</Text>
      <Text style={st.metaValue}>{value}</Text>
    </View>
  );
}

function SocialButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} холбоос нээх`}
      style={st.socialButton}
    >
      <Ionicons name={icon} size={20} color={C.primary} />
      <Text style={st.socialText}>{label}</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  hero: {
    alignItems: 'center',
    marginBottom: R.md,
  },
  logoBox: {
    width: 82,
    height: 82,
    borderRadius: R.xl,
    backgroundColor: C.brandDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: R.md,
  },
  brand: {
    ...F.h1,
    color: C.text,
  },
  tagline: {
    ...F.small,
    color: C.textSub,
    textAlign: 'center',
    marginTop: R.xs,
    lineHeight: 18,
  },
  card: {
    marginBottom: R.md,
    gap: R.sm,
  },
  sectionTitle: {
    ...F.h4,
    color: C.text,
  },
  paragraph: {
    ...F.small,
    color: C.textSub,
    lineHeight: 20,
  },
  metaRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: R.md,
  },
  metaLabel: {
    ...F.small,
    color: C.textSub,
  },
  metaValue: {
    ...F.small,
    color: C.text,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'right',
  },
  links: {
    flexDirection: 'row',
    gap: R.sm,
  },
  socialButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: C.bgCard,
    borderRadius: UI.controlRadius,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: R.xs,
  },
  socialText: {
    ...F.tiny,
    color: C.text,
    fontWeight: '800',
  },
  footer: {
    ...F.tiny,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: R.lg,
  },
});
