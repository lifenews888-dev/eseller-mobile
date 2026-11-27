#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  authRoleHintForPublicPath,
  buildRoleReturnTo,
  canAccessRoleArea,
  homeRouteForBackendRole,
  roleAreaAccessState,
  ROLE_AREA_HOME_ROUTE,
  ROLE_AREA_PUBLIC_PREFIX,
  ROLE_LOGIN_HINT,
} from '../src/shared/roleAccess.ts';
import {
  normalizeAuthRoleParam,
  normalizePublicRouteParam,
} from '../src/shared/routeNormalization.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];

function check(name, actual, expected) {
  const pass = Object.is(actual, expected);
  checks.push({ name, pass, actual, expected });
}

function checkAllows(area, roles, expected) {
  for (const role of roles) {
    check(`${area} access for ${role}`, canAccessRoleArea(area, role), expected);
  }
}

const roleHome = {
  buyer: '/',
  seller: ROLE_AREA_HOME_ROUTE.owner,
  store: ROLE_AREA_HOME_ROUTE.owner,
  owner: ROLE_AREA_HOME_ROUTE.owner,
  affiliate: ROLE_AREA_HOME_ROUTE.seller,
  delivery: ROLE_AREA_HOME_ROUTE.driver,
  driver: ROLE_AREA_HOME_ROUTE.driver,
  herder: ROLE_AREA_HOME_ROUTE.herder,
  coordinator: ROLE_AREA_HOME_ROUTE.coordinator,
  admin: '/',
  superadmin: '/',
  unknown: '/',
};

for (const [role, route] of Object.entries(roleHome)) {
  check(`home route for ${role}`, homeRouteForBackendRole(role), route);
}

checkAllows('owner', ['seller', 'store', 'owner', 'admin', 'superadmin'], true);
checkAllows('owner', ['buyer', 'affiliate', 'delivery', 'driver', 'herder', 'coordinator'], false);

checkAllows('seller', ['affiliate', 'admin', 'superadmin'], true);
checkAllows('seller', ['buyer', 'seller', 'delivery', 'driver', 'herder', 'coordinator'], false);

checkAllows('driver', ['delivery', 'driver', 'admin', 'superadmin'], true);
checkAllows('driver', ['buyer', 'seller', 'affiliate', 'herder', 'coordinator'], false);

checkAllows('herder', ['herder', 'admin', 'superadmin'], true);
checkAllows('herder', ['buyer', 'seller', 'affiliate', 'delivery', 'driver', 'coordinator'], false);

checkAllows('coordinator', ['coordinator', 'admin', 'superadmin'], true);
checkAllows('coordinator', ['buyer', 'seller', 'affiliate', 'delivery', 'driver', 'herder'], false);

check('owner access state without token', roleAreaAccessState('owner', null, null), 'login');
check('owner access state while auth loading', roleAreaAccessState('owner', 'token', null, true), 'loading');
check('owner access state without hydrated user', roleAreaAccessState('owner', 'token', null), 'loading');
check('owner access state allowed', roleAreaAccessState('owner', 'token', 'seller'), 'allowed');
check('owner access state denied', roleAreaAccessState('owner', 'token', 'buyer'), 'denied');
check('driver access state allowed alias role', roleAreaAccessState('driver', 'token', 'delivery'), 'allowed');
check('coordinator access state allowed admin', roleAreaAccessState('coordinator', 'token', 'admin'), 'allowed');

check('owner login hint', ROLE_LOGIN_HINT.owner, 'seller');
check('seller login hint', ROLE_LOGIN_HINT.seller, 'affiliate');
check('driver login hint', ROLE_LOGIN_HINT.driver, 'delivery');
check('herder login hint', ROLE_LOGIN_HINT.herder, 'seller');

check('owner public prefix', ROLE_AREA_PUBLIC_PREFIX.owner, '/owner');
check('seller public prefix', ROLE_AREA_PUBLIC_PREFIX.seller, '/seller');
check('driver public prefix', ROLE_AREA_PUBLIC_PREFIX.driver, '/driver');
check('herder public prefix', ROLE_AREA_PUBLIC_PREFIX.herder, '/herder-admin');
check('coordinator public prefix', ROLE_AREA_PUBLIC_PREFIX.coordinator, '/coordinator');

check('auth hint /seller/products', authRoleHintForPublicPath('/seller/products'), 'affiliate');
check('auth hint /referral', authRoleHintForPublicPath('/referral'), 'affiliate');
check('auth hint /owner/orders', authRoleHintForPublicPath('/owner/orders'), 'seller');
check('auth hint /register-herder', authRoleHintForPublicPath('/register-herder'), 'seller');
check('auth hint /herder-admin/orders', authRoleHintForPublicPath('/herder-admin/orders'), 'seller');
check('auth hint /driver/earnings', authRoleHintForPublicPath('/driver/earnings'), 'delivery');
check('auth hint /coordinator/dashboard', authRoleHintForPublicPath('/coordinator/dashboard'), null);
check('auth hint buyer route', authRoleHintForPublicPath('/profile'), null);

check(
  'herder grouped returnTo',
  buildRoleReturnTo('/dashboard', {}, ROLE_AREA_HOME_ROUTE.herder, '/herder-admin'),
  '/herder-admin/dashboard',
);
check(
  'herder public returnTo keeps query',
  buildRoleReturnTo('/herder-admin/orders', { status: 'pending' }, ROLE_AREA_HOME_ROUTE.herder, '/herder-admin'),
  '/herder-admin/orders?status=pending',
);
check(
  'coordinator grouped returnTo',
  buildRoleReturnTo('/applications', { page: '2' }, ROLE_AREA_HOME_ROUTE.coordinator, '/coordinator'),
  '/coordinator/applications?page=2',
);

check('normalize /login blocked', normalizePublicRouteParam('/login'), null);
check('normalize protocol-relative blocked', normalizePublicRouteParam('//evil.example/path'), null);
check('normalize external URL blocked', normalizePublicRouteParam('https://evil.example/path'), null);
check('normalize tabs group keeps query', normalizePublicRouteParam('/(tabs)/store?category=phones'), '/store?category=phones');
check('normalize customer legal terms', normalizePublicRouteParam('/(customer)/legal/terms'), '/terms');
check('normalize customer legal privacy hash', normalizePublicRouteParam('/(customer)/legal/privacy#policy'), '/privacy#policy');
check('normalize owner group root', normalizePublicRouteParam('/(owner)'), '/owner/dashboard');
check('normalize owner group path', normalizePublicRouteParam('/(owner)/orders?status=pending'), '/owner/orders?status=pending');
check('normalize seller group path', normalizePublicRouteParam('/(seller)/leaderboard'), '/seller/leaderboard');
check('normalize driver group path', normalizePublicRouteParam('/(driver)/earnings'), '/driver/earnings');
check('normalize herder group path', normalizePublicRouteParam('/(herder)/orders'), '/herder-admin/orders');
check('normalize coordinator group path', normalizePublicRouteParam('/(coordinator)/applications?page=2'), '/coordinator/applications?page=2');

check('normalize auth role store', normalizeAuthRoleParam('store'), 'seller');
check('normalize auth role owner', normalizeAuthRoleParam('owner'), 'seller');
check('normalize auth role driver', normalizeAuthRoleParam('driver'), 'delivery');
check('normalize auth role affiliate', normalizeAuthRoleParam('affiliate'), 'affiliate');
check('normalize auth role coordinator blocked', normalizeAuthRoleParam('coordinator'), null);

const normalizedSellerReturnTo = normalizePublicRouteParam('/(seller)/dashboard');
const normalizedOwnerReturnTo = normalizePublicRouteParam('/(owner)/products');
const normalizedHerderReturnTo = normalizePublicRouteParam('/(herder)/dashboard');
check('auth hint normalized seller returnTo', authRoleHintForPublicPath(normalizedSellerReturnTo), 'affiliate');
check('auth hint normalized owner returnTo', authRoleHintForPublicPath(normalizedOwnerReturnTo), 'seller');
check('auth hint normalized herder returnTo', authRoleHintForPublicPath(normalizedHerderReturnTo), 'seller');

const rootLayoutSource = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
const roleLayoutSources = [
  'app/(owner)/_layout.tsx',
  'app/(seller)/_layout.tsx',
  'app/(driver)/_layout.tsx',
  'app/(herder)/_layout.tsx',
  'app/(coordinator)/_layout.tsx',
].map((item) => fs.readFileSync(path.join(root, item), 'utf8'));
check('root auth entry helper exists', rootLayoutSource.includes('function isAuthEntryPath'), true);
check('root auto-route resets when logged out', rootLayoutSource.includes('hasAutoRouted.current = false'), true);
check('root auto-route runs once per session', rootLayoutSource.includes('if (hasAutoRouted.current) return'), true);
check(
  'root auto-route skips non-entry paths',
  rootLayoutSource.includes("pathname !== '/' && !isAuthEntryPath(pathname)"),
  true,
);
check(
  'role layouts use shared access state',
  roleLayoutSources.every((source) => source.includes('roleAreaAccessState(')),
  true,
);
check(
  'role layouts wait while auth user hydrates',
  roleLayoutSources.every((source) => source.includes("accessState === 'loading'")),
  true,
);

const failed = checks.filter((item) => !item.pass);
for (const item of checks) {
  const label = item.pass ? 'OK  ' : 'FAIL';
  console.log(`${label} ${item.name}`);
  if (!item.pass) {
    console.log(`     expected: ${JSON.stringify(item.expected)}`);
    console.log(`     actual:   ${JSON.stringify(item.actual)}`);
  }
}

console.log('');
console.log(`Summary: ${failed.length} failed, ${checks.length} total.`);

if (failed.length > 0) {
  process.exitCode = 1;
}
