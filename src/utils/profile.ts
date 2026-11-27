/**
 * Profile screen helpers shared across role profile screens.
 */
import { C } from '../shared/design';
import { encodeRouteParam } from '../shared/routeParams';

export function getReferralLink(userId?: string | null): string {
  if (!userId) return 'https://eseller.mn/';
  const referralRouteCode = encodeRouteParam(userId.slice(-8));
  return `https://eseller.mn/ref/${referralRouteCode}`;
}

export function getReferralCode(userId?: string | null): string {
  if (!userId) return '—';
  return userId.slice(-8).toLocaleUpperCase('en-US');
}

const TIER_LABELS: Record<string, string> = {
  BRONZE: 'Хүрэл',
  SILVER: 'Мөнгө',
  GOLD: 'Алт',
  PLATINUM: 'Платинум',
};

export function getTierLabel(tier?: string | null): string {
  if (!tier) return 'Хүрэл';
  return TIER_LABELS[tier.toLocaleUpperCase('en-US')] ?? tier;
}

const TIER_COLORS: Record<string, string> = {
  BRONZE: C.seller,
  SILVER: C.textMuted,
  GOLD: C.gold,
  PLATINUM: C.primary,
};

export function getTierColor(tier?: string | null): string {
  if (!tier) return C.textMuted;
  return TIER_COLORS[tier.toLocaleUpperCase('en-US')] ?? C.textMuted;
}

export function getRatingStars(rating?: number | null): string {
  const value = Math.max(0, Math.min(5, Math.floor(rating ?? 0)));
  return '★'.repeat(value) + '☆'.repeat(5 - value);
}

export function formatCurrency(amount?: number | null): string {
  return `${(amount ?? 0).toLocaleString('mn-MN')}₮`;
}

export function formatCount(n?: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
