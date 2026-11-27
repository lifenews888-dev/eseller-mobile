import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C, F, R, UI } from '../shared/design';
import { AppTopBar, useAppLayoutMetrics } from '../shared/ui/AppUI';

export interface OnboardingStep {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}

export interface OnboardingConfig {
  title: string;
  subtitle: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  steps: OnboardingStep[];
  cta: string;
  ctaRoute: string;
  stats: { label: string; value: string }[];
}

export function OnboardingLanding({ config }: { config: OnboardingConfig }) {
  const layout = useAppLayoutMetrics();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{
          padding: UI.screenPad,
          paddingTop: layout.screenTop,
          paddingBottom: layout.screenBottom,
        }}
      >
        <AppTopBar eyebrow="eSeller" title={config.title} />
        <View
          style={{
            backgroundColor: C.bgCard,
            borderRadius: R.lg,
            padding: R.xl,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: config.color + '28',
            marginBottom: R.lg,
          }}
        >
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: R.xxl,
              backgroundColor: config.color + '18',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: R.md,
            }}
          >
            <Ionicons name={config.icon} size={42} color={config.color} />
          </View>
          <Text style={{ ...F.h2, color: C.text, marginBottom: 6, textAlign: 'center' }}>
            {config.title}
          </Text>
          <Text style={{ ...F.small, color: C.textSub, textAlign: 'center', paddingHorizontal: 12 }}>
            {config.subtitle}
          </Text>
        </View>

        <Text style={{ ...F.h4, color: C.text, marginBottom: R.sm }}>Хэрхэн эхлэх вэ?</Text>
        <View style={{ gap: R.sm, marginBottom: R.lg }}>
          {config.steps.map((step, index) => (
            <View
              key={`${step.title}-${index}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: R.md,
                backgroundColor: C.bgCard,
                borderRadius: R.lg,
                padding: R.md,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: R.md,
                  backgroundColor: config.color + '18',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={step.icon} size={20} color={config.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...F.small, fontWeight: '800', color: C.text }}>{step.title}</Text>
                <Text style={{ ...F.tiny, color: C.textSub, marginTop: 2 }}>{step.desc}</Text>
              </View>
              <Text style={{ ...F.h4, color: config.color }}>{index + 1}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: R.sm, marginBottom: R.lg }}>
          {config.stats.map((stat, index) => (
            <View
              key={`${stat.label}-${index}`}
              style={{
                flex: 1,
                minHeight: 78,
                backgroundColor: C.bgCard,
                borderRadius: R.md,
                padding: R.sm,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <Text style={{ ...F.body, fontWeight: '900', color: config.color }} numberOfLines={1}>
                {stat.value}
              </Text>
              <Text style={{ ...F.tiny, color: C.textMuted, marginTop: 2, textAlign: 'center' }} numberOfLines={2}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => router.push(config.ctaRoute as any)}
          style={{
            backgroundColor: config.color,
            borderRadius: R.md,
            padding: R.md,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: C.bgCard, fontSize: 15, fontWeight: '900' }}>{config.cta}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}
