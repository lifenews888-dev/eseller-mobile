import { useEffect } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { router, Stack } from 'expo-router';
import { C, F, R } from '../../src/shared/design';
import { AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

// Deduplicated — `feed/create.tsx` (366 lines) is the canonical create
// post screen. This wrapper forwards legacy deep links to it so any
// existing navigation callers keep working.
export default function CreatePostRedirect() {
  useEffect(() => {
    router.replace('/feed/create' as never);
  }, []);

  return (
    <AppScreen>
      <Stack.Screen options={{ headerShown: false }} />
      <AppTopBar eyebrow="Зар" title="Зар нэмэх" />
      <ActivityIndicator color={C.brand} />
      <Text style={{ ...F.small, color: C.textMuted, textAlign: 'center', marginTop: R.sm }}>
        Зар нэмэх хуудас руу шилжүүлж байна...
      </Text>
    </AppScreen>
  );
}
