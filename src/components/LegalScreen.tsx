import { StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { C, F, R } from '../shared/design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from '../shared/ui/AppUI';
import { router } from 'expo-router';

interface Section {
  title: string;
  body: string;
}

interface Props {
  title: string;
  updated: string;
  sections: Section[];
}

export function LegalScreen({ title, updated, sections }: Props) {
  return (
    <AppScreen>
      <Stack.Screen options={{ headerShown: false }} />
      <AppTopBar eyebrow="Хууль" title={title} />
      <AppHeader
        title={title}
        subtitle={`Сүүлд шинэчилсэн: ${updated}`}
        icon="document-text-outline"
        accent={C.primary}
      />

      {sections.map((section) => (
        <AppCard key={section.title} style={st.section}>
          <Text style={st.title}>{section.title}</Text>
          <Text style={st.body}>{section.body}</Text>
        </AppCard>
      ))}

      <AppButton
        label="Дэмжлэгтэй холбогдох"
        icon="chatbubble-ellipses-outline"
        variant="ghost"
        onPress={() => router.push('/contact' as any)}
        style={st.supportButton}
      />

      <Text style={st.footer}>© 2024-2026 eSeller LLC</Text>
    </AppScreen>
  );
}

const st = StyleSheet.create({
  section: {
    marginBottom: R.sm,
    gap: R.sm,
  },
  title: {
    ...F.h4,
    color: C.text,
  },
  body: {
    ...F.small,
    color: C.textSub,
    lineHeight: 20,
  },
  footer: {
    ...F.tiny,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: R.lg,
  },
  supportButton: {
    marginTop: R.md,
  },
});
