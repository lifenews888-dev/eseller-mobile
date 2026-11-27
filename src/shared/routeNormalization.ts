const AUTH_ROLES = ['buyer', 'seller', 'affiliate', 'delivery'] as const;

function splitRoute(value: string) {
  const match = value.match(/^([^?#]*)(.*)$/);
  return {
    path: match?.[1] || value,
    suffix: match?.[2] || '',
  };
}

function mapLegacyGroupPath(route: string): string | null {
  const { path, suffix } = splitRoute(route);

  if (path === '/login' || path === '/register') return null;
  if (path.startsWith('/(auth)')) return null;
  if (path === '/(tabs)') return `/${suffix}`;
  if (path.startsWith('/(tabs)/')) return `${path.replace('/(tabs)', '')}${suffix}`;
  if (path === '/(customer)/legal/terms') return `/terms${suffix}`;
  if (path === '/(customer)/legal/privacy') return `/privacy${suffix}`;
  if (path === '/(customer)') return `/${suffix}`;
  if (path.startsWith('/(customer)/')) return `${path.replace('/(customer)', '')}${suffix}`;
  if (path === '/(owner)') return `/owner/dashboard${suffix}`;
  if (path.startsWith('/(owner)/')) return `${path.replace('/(owner)', '/owner')}${suffix}`;
  if (path === '/(seller)') return `/seller/dashboard${suffix}`;
  if (path.startsWith('/(seller)/')) return `${path.replace('/(seller)', '/seller')}${suffix}`;
  if (path === '/(driver)') return `/driver/deliveries${suffix}`;
  if (path.startsWith('/(driver)/')) return `${path.replace('/(driver)', '/driver')}${suffix}`;
  if (path === '/(herder)') return `/herder-admin/dashboard${suffix}`;
  if (path.startsWith('/(herder)/')) return `${path.replace('/(herder)', '/herder-admin')}${suffix}`;
  if (path === '/(coordinator)') return `/coordinator/dashboard${suffix}`;
  if (path.startsWith('/(coordinator)/')) return `${path.replace('/(coordinator)', '/coordinator')}${suffix}`;

  return route;
}

export function normalizePublicRouteParam(value?: string | string[] | null): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) return null;

  return mapLegacyGroupPath(trimmed);
}

export function normalizeAuthRoleParam(value?: string | string[] | null): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'store' || normalized === 'owner') return 'seller';
  if (normalized === 'driver') return 'delivery';
  return (AUTH_ROLES as readonly string[]).includes(normalized) ? normalized : null;
}
