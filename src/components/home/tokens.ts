import type { ViewStyle } from 'react-native';
import { C, R } from '../../shared/design';
import { shadowStyle } from '../../shared/shadow';

/**
 * Home section tokens are aliases to the shared app design system.
 * This keeps older home components moving in small steps while still
 * rendering with the same surfaces, radii, and text colors.
 */
export const H = {
  card:          C.bgCard,
  cardBorder:    C.border,
  cardRadius:    R.lg,
  cardRadiusSm:  R.md,

  textPrimary:   C.text,
  textSub:       C.textSub,
  textHint:      C.textMuted,

  primary:       C.primary,
  primaryDark:   C.buyer,
  primaryTint:   C.primaryDim,
  success:       C.success,
  warning:       C.gold,
  danger:        C.error,

  // 8pt spacing
  mx:   16,
  gap:  8,
  gap2: 12,

  shadow: shadowStyle({ y: 2, blur: 6, opacity: 0.08, elevation: 3 }) as ViewStyle,
} as const;
