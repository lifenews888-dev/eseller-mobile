#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const guardedScreens = [
  { file: 'app/(tabs)/chat.tsx', returnTo: '/chat', requiresEnabled: true },
  { file: 'app/(customer)/wishlist.tsx', returnTo: '/wishlist', requiresEnabled: true },
  { file: 'app/(customer)/addresses.tsx', returnTo: '/addresses', requiresEnabled: true },
  { file: 'app/(customer)/coupons.tsx', returnTo: '/coupons', requiresEnabled: false },
  { file: 'app/(customer)/returns.tsx', returnTo: '/returns', requiresEnabled: true },
  { file: 'app/(customer)/wallet.tsx', returnTo: '/wallet', requiresEnabled: true },
  { file: 'app/(customer)/tier-details.tsx', returnTo: '/tier-details', requiresEnabled: true },
  { file: 'app/(customer)/achievements.tsx', returnTo: '/achievements', requiresEnabled: false, requiresFetchGuard: true },
  { file: 'app/(customer)/bnpl.tsx', returnTo: '/bnpl', requiresEnabled: false, requiresFetchGuard: true },
  { file: 'app/(customer)/edit-profile.tsx', returnTo: '/edit-profile', requiresEnabled: false },
  { file: 'app/(customer)/notification-settings.tsx', returnTo: '/notification-settings', requiresEnabled: false },
  { file: 'app/(customer)/security.tsx', returnTo: '/security', requiresEnabled: false },
];

const protectedAccountPaths = [
  '/wishlist',
  '/user/addresses',
  '/orders',
  '/chat/conversations',
  '/achievements',
  '/bnpl/payments',
];

let failures = 0;

function pass(name) {
  console.log(`OK   ${name}`);
}

function fail(name, details) {
  console.log(`FAIL ${name}`);
  if (details) console.log(`     ${details}`);
  failures += 1;
}

function expect(condition, name, details) {
  if (condition) pass(name);
  else fail(name, details);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const sharedGuardSource = read('src/shared/ui/RequireAuthScreen.tsx');
expect(sharedGuardSource.includes('export function RequireAuthScreen'), 'shared auth-required screen exists');
expect(sharedGuardSource.includes("pathname: '/login'"), 'shared auth-required screen links to login');
expect(sharedGuardSource.includes("pathname: '/register'"), 'shared auth-required screen links to register');
expect(sharedGuardSource.includes('params: { returnTo }'), 'shared auth-required screen preserves returnTo');

for (const screen of guardedScreens) {
  const source = read(screen.file);
  expect(source.includes('../../src/store/auth'), `${screen.file} reads auth state`);
  expect(source.includes('RequireAuthScreen'), `${screen.file} uses RequireAuthScreen`);
  expect(source.includes('if (!user)'), `${screen.file} blocks guest rendering`);
  expect(source.includes(`returnTo="${screen.returnTo}"`), `${screen.file} preserves ${screen.returnTo}`);
  if (screen.requiresEnabled) {
    expect(source.includes('enabled: !!user'), `${screen.file} disables protected queries for guests`);
  }
  if (screen.requiresFetchGuard) {
    expect(source.includes('setLoading(false)'), `${screen.file} stops guest raw-fetch loading`);
    expect(source.includes('[user]'), `${screen.file} rechecks raw fetch when user changes`);
  }
}

const combined = guardedScreens.map((screen) => read(screen.file)).join('\n');
for (const accountPath of protectedAccountPaths) {
  expect(combined.includes(accountPath), `protected account API path is covered: ${accountPath}`);
}

console.log('');
console.log(`Summary: ${failures} failed.`);

if (failures > 0) process.exitCode = 1;
