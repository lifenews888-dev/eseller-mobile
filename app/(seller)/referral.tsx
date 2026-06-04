import React, { useEffect, useRef, useState } from 'react';
import { Text, View, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppMetricCard, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

export default function ReferralScreen() {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const referralCode = 'SELL-MUUGII-2025';
  const referralLink = `https://eseller.mn/ref/${referralCode}`;

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const copyLink = async () => {
    await Clipboard.setStringAsync(referralLink);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    await Share.share({
      message: `Eseller.mn дээр захиалга өгч хямдрал аваарай! ${referralLink}`,
      url: referralLink,
    });
  };

  return (
    <AppScreen>
      <AppTopBar eyebrow="Борлуулагч" title="Урилгын код" showBack={false} />

      <AppHeader
        title="Миний урилгын код"
        subtitle="Найздаа хуваалцаад комисс болон урамшуулал аваарай"
        icon="gift-outline"
        accent={C.seller}
      />

      <AppCard elevated style={{ marginBottom: R.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.md, marginBottom: R.lg }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: UI.controlRadius,
              backgroundColor: C.seller + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="link-outline" size={24} color={C.seller} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...F.small, color: C.textMuted, fontWeight: '700' }}>Таны код</Text>
            <Text style={{ ...F.h2, color: C.seller, marginTop: 2 }} numberOfLines={1}>
              {referralCode}
            </Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: C.bgSection,
            borderRadius: UI.controlRadius,
            padding: R.md,
            marginBottom: R.lg,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Text style={{ ...F.tiny, color: C.textMuted, marginBottom: 4 }}>Referral link</Text>
          <Text style={{ ...F.small, color: C.text, fontWeight: '700' }} numberOfLines={2}>
            {referralLink}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: R.sm }}>
          <AppButton
            label={copied ? 'Хууллаа' : 'Хуулах'}
            icon={copied ? 'checkmark' : 'copy-outline'}
            variant={copied ? 'success' : 'seller'}
            style={{ flex: 1 }}
            onPress={copyLink}
          />
          <AppButton
            label="Хуваалцах"
            icon="share-social-outline"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={shareLink}
          />
        </View>
      </AppCard>

      <View style={{ flexDirection: 'row', gap: R.sm }}>
        <AppMetricCard label="Урьсан хүн" value="0" icon="people-outline" accent={C.seller} />
        <AppMetricCard label="Нийт орлого" value="₮0" icon="cash-outline" accent={C.seller} />
      </View>
    </AppScreen>
  );
}
