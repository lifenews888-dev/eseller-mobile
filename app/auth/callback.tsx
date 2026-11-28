import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { completeOAuthCode, oauthErrorText } from '../../src/lib/oauthHandoff';
import { routeAfterAuth } from '../../src/shared/routing';
import { normalizeRouteParam } from '../../src/shared/routeParams';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard } from '../../src/shared/ui/AppUI';

// eseller://auth/callback?code=... — Google/ДАН нэвтрэлтээс апп руу буцах хуудас
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const code = normalizeRouteParam(params.code);
  const errorCode = normalizeRouteParam(params.error);
  const [message, setMessage] = useState<string | null>(errorCode ? oauthErrorText(errorCode) : null);

  useEffect(() => {
    if (!code || errorCode) {
      if (!errorCode) setMessage(oauthErrorText(''));
      return;
    }
    let active = true;
    completeOAuthCode(code)
      .then((role) => {
        if (active) routeAfterAuth(role);
      })
      .catch((e: Error) => {
        if (active) setMessage(e?.message || oauthErrorText(''));
      });
    return () => {
      active = false;
    };
  }, [code, errorCode]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: UI.screenPad, justifyContent: 'center' }}>
      <AppCard style={{ alignItems: 'center', gap: R.sm }}>
        {message ? (
          <>
            <Text style={{ ...F.h4, color: C.text, textAlign: 'center' }}>Нэвтэрч чадсангүй</Text>
            <Text style={{ ...F.small, color: C.textSub, textAlign: 'center' }}>{message}</Text>
            <AppButton label="Нэвтрэх хуудас руу" icon="log-in-outline" onPress={() => router.replace('/login' as never)} />
          </>
        ) : (
          <>
            <ActivityIndicator color={C.brand} />
            <Text style={{ ...F.small, color: C.textSub }}>Нэвтэрч байна...</Text>
          </>
        )}
      </AppCard>
    </View>
  );
}
