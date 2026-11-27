import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, F } from '../design';

export interface EmptyStateProps {
  /** Ionicons glyph rendered above the title. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Primary line — what's missing. */
  title: string;
  /** Optional secondary line — usually a next-step hint. */
  subtitle?: string;
  /** Optional CTA button. Use it when the user can take an action from here. */
  cta?: {
    label: string;
    onPress: () => void;
    accent?: string;
    icon?: keyof typeof Ionicons.glyphMap;
  };
  /** Override the default vertical padding for compact rows inside cards. */
  compact?: boolean;
}

/**
 * Canonical empty state shown when a list/section has no data yet.
 * Centered icon + title + optional subtitle + optional CTA. Spacing,
 * radius and typography come from src/shared/design.ts so every empty
 * state across roles looks identical.
 */
export function EmptyState({ icon, title, subtitle, cta, compact }: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: compact ? R.xl : R.xxxl, paddingHorizontal: R.lg }}>
      {icon ? (
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: R.full,
            backgroundColor: C.bgSection,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: R.sm,
          }}
        >
          <Ionicons name={icon} size={24} color={C.textMuted} />
        </View>
      ) : null}
      <Text style={{ ...F.body, color: C.textSub, textAlign: 'center', fontWeight: '600' }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ ...F.small, color: C.textMuted, textAlign: 'center', marginTop: R.xs }}>
          {subtitle}
        </Text>
      ) : null}
      {cta ? (
        <TouchableOpacity
          onPress={cta.onPress}
          activeOpacity={0.85}
          style={{
            marginTop: R.lg,
            paddingVertical: R.sm,
            paddingHorizontal: R.lg,
            backgroundColor: cta.accent ?? C.primary,
            borderRadius: R.full,
            flexDirection: 'row',
            alignItems: 'center',
            gap: R.xs,
          }}
        >
          {cta.icon ? <Ionicons name={cta.icon} size={16} color={C.bgCard} /> : null}
          <Text style={{ ...F.small, color: C.bgCard, fontWeight: '700' }}>{cta.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
