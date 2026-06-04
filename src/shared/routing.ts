import { router } from 'expo-router';
import { authRoleHintForPublicPath, homeRouteForBackendRole } from './roleAccess';
import { normalizePublicRouteParam } from './routeNormalization';

export { normalizeAuthRoleParam, normalizePublicRouteParam } from './routeNormalization';

export function inferAuthRoleFromReturnTo(value?: string | string[] | null): string | null {
  const route = normalizePublicRouteParam(value);
  if (!route) return null;
  const pathOnly = route.split(/[?#]/)[0];

  return authRoleHintForPublicPath(pathOnly);
}

export function routeAfterAuth(
  role: string | null | undefined,
  returnTo?: string | string[] | null,
): void {
  const safeReturnTo = normalizePublicRouteParam(returnTo);
  if (safeReturnTo) {
    router.replace(safeReturnTo as never);
    return;
  }
  routeByRole(role);
}

/**
 * Route a freshly-authenticated user to their home group based on
 * the backend `role` field (lowercase) returned in the login response.
 *
 * Backend role mapping lives in `src/shared/roleAccess.ts` so route
 * guards and post-login routing stay in sync.
 */
export function routeByRole(role: string | null | undefined): void {
  router.replace(homeRouteForBackendRole(role) as never);
}

