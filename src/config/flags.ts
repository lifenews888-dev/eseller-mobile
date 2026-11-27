/**
 * Static feature-flag defaults read from EXPO_PUBLIC_* env vars at bundle
 * time. These are the *fallback* values — the effective runtime values
 * come from `remoteFlags.ts`, which overlays a cached remote-config
 * response on top of these defaults.
 *
 * Do NOT import these constants in UI code. Use the `useMalchnaasEnabled`
 * / `usePilotAimags` hooks (or the `getMalchnaas*` snapshots) so ops can
 * flip pilot aimags without shipping a new build.
 */

function boolFlag(name: string, fallback = false): boolean {
  const v = (process.env as Record<string, string | undefined>)[name];
  if (v === undefined || v === null || v === '') return fallback;
  return v === '1' || v.toLowerCase() === 'true';
}

function csvFlag(name: string, fallback: readonly string[]): readonly string[] {
  const v = (process.env as Record<string, string | undefined>)[name];
  if (!v) return fallback;
  return v.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
}

/**
 * Build-time default for the Малчнаас шууд kill-switch.
 * Pilot went live — default to ON so the "Малчны булан" section shows on
 * first boot before the /config/mobile round-trip completes. Ops can still
 * flip it off from the backend remote-config.
 */
export const MALCHNAAS_ENABLED_DEFAULT = boolFlag('EXPO_PUBLIC_MALCHNAAS_ENABLED', true);

/**
 * Build-time default for the seller-network read-only dashboard kill-switch.
 * Default ON for dev/internal builds so the PR103 UI is visible before remote
 * config loads. Production can flip it off from Sarana BFF `/config/mobile`.
 */
export const SELLER_NETWORK_ENABLED_DEFAULT = boolFlag('EXPO_PUBLIC_SELLER_NETWORK_ENABLED', true);

/**
 * Build-time default: бүх 21 аймагт бүртгэл нээлттэй (2026-11-27).
 * Хязгаарлах бол `EXPO_PUBLIC_MALCHNAAS_PILOT_AIMAGS="AKH,TOV"` эсвэл backend /config/mobile.
 */
export const MALCHNAAS_ALL_AIMAGS: readonly string[] = [
  'AKH', 'BOL', 'BKH', 'BUL', 'GOA', 'GOS', 'DAR', 'DOR', 'DOG', 'DUN', 'ZAV', 'OVR', 'OMN', 'SUK', 'SEL', 'TOV', 'UVS', 'KHO', 'KHV', 'KHE', 'ORK',
];

export const MALCHNAAS_PILOT_AIMAGS_DEFAULT: readonly string[] = csvFlag(
  'EXPO_PUBLIC_MALCHNAAS_PILOT_AIMAGS',
  MALCHNAAS_ALL_AIMAGS,
);

/**
 * OTP gate — enables the forgot-password flow (and, transitively, any other
 * feature that relies on `/auth/otp/send`, `/auth/otp/verify`, and
 * `/auth/reset-password`). Off by default: the Express backend does not ship
 * those endpoints yet, so exposing the UI produces 404s. Flip to `true` via
 * `EXPO_PUBLIC_OTP_ENABLED=true` once an SMS provider is wired up.
 */
export const OTP_ENABLED_DEFAULT = boolFlag('EXPO_PUBLIC_OTP_ENABLED', false);
