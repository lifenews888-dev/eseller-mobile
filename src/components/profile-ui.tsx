import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, F, R, S, UI } from '../shared/design';
import { AppTopBar, useAppLayoutMetrics } from '../shared/ui/AppUI';

type IconName = keyof typeof Ionicons.glyphMap;

export const PC = {
  bg: C.bg,
  card: C.bgCard,
  border: C.border,
  text: C.text,
  textSub: C.textSub,
  textMuted: C.textMuted,
  divider: C.border,
};

export function ProfileHeader({
  icon,
  name,
  sub,
  roleLabel,
  accent = C.primary,
  extra,
  topBarTitle = roleLabel,
  topBarEyebrow = 'Профайл',
}: {
  icon: IconName;
  name: string;
  sub?: string;
  roleLabel: string;
  accent?: string;
  extra?: React.ReactNode;
  topBarTitle?: string;
  topBarEyebrow?: string;
}) {
  const layout = useAppLayoutMetrics();

  return (
    <View style={[styles.headerWrap, { paddingTop: layout.screenTop }]}>
      <AppTopBar
        eyebrow={topBarEyebrow}
        title={topBarTitle}
        showBack={false}
        style={styles.topBar}
      />
      <View style={styles.headerCard}>
        <View style={[styles.headerIcon, { backgroundColor: `${accent}18`, borderColor: `${accent}32` }]}>
          <Ionicons name={icon} size={27} color={accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
          {!!sub && <Text style={styles.headerSub} numberOfLines={1}>{sub}</Text>}
          <View style={[styles.rolePill, { backgroundColor: `${accent}14`, borderColor: `${accent}30` }]}>
            <Text style={[styles.roleText, { color: accent }]} numberOfLines={1}>{roleLabel}</Text>
          </View>
        </View>
        {extra}
      </View>
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function InfoRow({
  icon,
  label,
  value,
  accent,
  onCopy,
}: {
  icon: IconName;
  label: string;
  value: string;
  accent?: string;
  onCopy?: () => void;
}) {
  const color = accent ?? C.primary;

  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, accent ? { color: accent } : null]} numberOfLines={1}>
        {value}
      </Text>
      {onCopy ? (
        <TouchableOpacity onPress={onCopy} hitSlop={8} style={styles.copyButton}>
          <Ionicons name="copy-outline" size={16} color={color} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function MenuRow({
  icon,
  label,
  onPress,
  danger,
  accent,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  accent?: string;
}) {
  const color = danger ? C.error : accent ?? C.primary;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.84} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <Text style={[styles.menuLabel, danger ? { color: C.error } : null]} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={PC.textMuted} />
    </TouchableOpacity>
  );
}

export function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: IconName;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
}

export function StatusBadge({
  status,
  label,
}: {
  status: 'ok' | 'pending' | 'missing';
  label: string;
}) {
  const palette = {
    ok: { bg: `${C.success}18`, fg: C.success, icon: 'checkmark-circle' as IconName },
    pending: { bg: `${C.warning}18`, fg: C.seller, icon: 'time-outline' as IconName },
    missing: { bg: `${C.error}14`, fg: C.error, icon: 'alert-circle-outline' as IconName },
  }[status];

  return (
    <View style={[styles.statusBadge, { backgroundColor: palette.bg }]}>
      <Ionicons name={palette.icon} size={12} color={palette.fg} />
      <Text style={[styles.statusText, { color: palette.fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    backgroundColor: C.bg,
    paddingHorizontal: UI.screenPad,
    paddingBottom: R.sm,
  },
  topBar: {
    marginBottom: R.sm,
  },
  headerCard: {
    backgroundColor: C.bgCard,
    borderRadius: UI.cardRadius,
    borderWidth: 1,
    borderColor: C.border,
    padding: R.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
    ...S.card,
  },
  headerIcon: {
    width: 58,
    height: 58,
    borderRadius: UI.controlRadius,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerText: { flex: 1 },
  headerName: { ...F.h3, color: C.text },
  headerSub: { ...F.small, color: C.textSub, marginTop: 2 },
  rolePill: {
    alignSelf: 'flex-start',
    borderRadius: R.full,
    paddingHorizontal: R.sm,
    paddingVertical: 4,
    marginTop: R.sm,
    borderWidth: 1,
  },
  roleText: { ...F.tiny, fontWeight: '800' },
  sectionTitle: {
    ...F.small,
    fontWeight: '800',
    color: PC.textMuted,
    marginTop: R.lg,
    marginBottom: R.sm,
    marginLeft: 4,
  },
  card: {
    backgroundColor: PC.card,
    borderRadius: UI.cardRadius,
    borderWidth: 1,
    borderColor: PC.border,
    overflow: 'hidden',
  },
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    padding: R.md,
    gap: R.md,
    borderBottomWidth: 1,
    borderBottomColor: PC.divider,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { ...F.small, flex: 1, color: PC.textSub },
  rowValue: { ...F.small, color: PC.text, fontWeight: '800', maxWidth: 180 },
  copyButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { ...F.small, flex: 1, color: PC.text, fontWeight: '700' },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: PC.card,
    borderRadius: UI.cardRadius,
    borderWidth: 1,
    borderColor: PC.border,
    padding: R.md,
    gap: R.xs,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { ...F.h3 },
  statLabel: { ...F.tiny, color: PC.textMuted },
  statusBadge: {
    paddingHorizontal: R.sm,
    paddingVertical: 4,
    borderRadius: R.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: { ...F.tiny, fontWeight: '700' },
});
