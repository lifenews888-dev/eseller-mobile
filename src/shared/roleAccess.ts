export type RoleArea = 'owner' | 'seller' | 'driver' | 'herder' | 'coordinator';

type RouteParams = Record<string, string | string[] | undefined>;

export const ROLE_AREA_HOME_ROUTE: Record<RoleArea, string> = {
  owner: '/owner/dashboard',
  seller: '/seller/dashboard',
  driver: '/driver/deliveries',
  herder: '/herder-admin/dashboard',
  coordinator: '/coordinator/dashboard',
};

export const ROLE_AREA_PUBLIC_PREFIX: Record<RoleArea, string> = {
  owner: '/owner',
  seller: '/seller',
  driver: '/driver',
  herder: '/herder-admin',
  coordinator: '/coordinator',
};

const AREA_ROLES: Record<RoleArea, readonly string[]> = {
  owner: ['seller', 'store', 'owner', 'admin', 'superadmin'],
  seller: ['affiliate', 'admin', 'superadmin'],
  driver: ['delivery', 'driver', 'admin', 'superadmin'],
  herder: ['herder', 'admin', 'superadmin'],
  coordinator: ['coordinator', 'admin', 'superadmin'],
};

const BACKEND_ROLE_HOME_ROUTE: Record<string, string> = {
  seller: ROLE_AREA_HOME_ROUTE.owner,
  store: ROLE_AREA_HOME_ROUTE.owner,
  owner: ROLE_AREA_HOME_ROUTE.owner,
  affiliate: ROLE_AREA_HOME_ROUTE.seller,
  delivery: ROLE_AREA_HOME_ROUTE.driver,
  driver: ROLE_AREA_HOME_ROUTE.driver,
  herder: ROLE_AREA_HOME_ROUTE.herder,
  coordinator: ROLE_AREA_HOME_ROUTE.coordinator,
};

export const ROLE_LOGIN_HINT: Partial<Record<RoleArea, string>> = {
  owner: 'seller',
  seller: 'affiliate',
  driver: 'delivery',
  herder: 'seller',
};

export function canAccessRoleArea(area: RoleArea, backendRole?: string | null): boolean {
  const role = (backendRole || '').toLowerCase();
  return AREA_ROLES[area].includes(role);
}

export function homeRouteForBackendRole(backendRole?: string | null): string {
  const role = (backendRole || '').toLowerCase();
  return BACKEND_ROLE_HOME_ROUTE[role] || '/';
}

export function authRoleHintForPublicPath(pathOnly: string): string | null {
  if (pathOnly === '/referral' || pathOnly.startsWith(ROLE_AREA_PUBLIC_PREFIX.seller)) {
    return ROLE_LOGIN_HINT.seller ?? 'affiliate';
  }
  if (pathOnly.startsWith(ROLE_AREA_PUBLIC_PREFIX.owner)) return ROLE_LOGIN_HINT.owner ?? 'seller';
  if (pathOnly.startsWith(ROLE_AREA_PUBLIC_PREFIX.herder)) return ROLE_LOGIN_HINT.herder ?? 'seller';
  if (
    pathOnly === '/register-shop' ||
    pathOnly === '/register-herder' ||
    pathOnly === '/open-shop'
  ) {
    return ROLE_LOGIN_HINT.owner ?? 'seller';
  }
  if (pathOnly.startsWith(ROLE_AREA_PUBLIC_PREFIX.driver)) return ROLE_LOGIN_HINT.driver ?? 'delivery';
  return null;
}

export function buildRoleReturnTo(
  pathname: string | null,
  params: RouteParams,
  fallbackPath: string,
  publicPrefix?: string,
): string {
  const currentPath = pathname && pathname !== '/' ? pathname : fallbackPath;
  const safePath =
    publicPrefix && !currentPath.startsWith(publicPrefix)
      ? `${publicPrefix}${currentPath.startsWith('/') ? currentPath : `/${currentPath}`}`
      : currentPath;
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => {
      if (item) query.append(key, item);
    });
  });

  const queryString = query.toString();
  return queryString ? `${safePath}?${queryString}` : safePath;
}
