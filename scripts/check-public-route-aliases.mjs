#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const aliases = [
  ...roleAliases('owner', '(owner)', [
    '_layout',
    'analytics',
    'create-coupon',
    'dashboard',
    'orders',
    'pos',
    'pos-history',
    'products',
    'profile',
    'settings',
  ]),
  ...roleAliases('seller', '(seller)', [
    '_layout',
    'catalog',
    'dashboard',
    'earnings',
    'leaderboard',
    'products',
    'profile',
    'referral',
  ]),
  ...roleAliases('driver', '(driver)', [
    '_layout',
    'deliveries',
    'delivery-detail',
    'earnings',
    'profile',
  ]),
  ...roleAliases('herder-admin', '(herder)', [
    '_layout',
    'dashboard',
    'earnings',
    'listing-form',
    'listings',
    'orders',
  ]),
  alias('app/herder-admin/order/[id].tsx', '../../(herder)/order/[id]'),
  ...roleAliases('coordinator', '(coordinator)', [
    '_layout',
    'applications',
    'dashboard',
    'herders',
  ]),
  alias('app/coordinator/application/[id].tsx', '../../(coordinator)/application/[id]'),
  alias('app/terms.tsx', './(customer)/legal/terms'),
  alias('app/privacy.tsx', './(customer)/legal/privacy'),
  alias('app/[slug].tsx', './storefront/[slug]'),
];

const publicRoleGroups = ['owner', 'seller', 'driver', 'herder-admin', 'coordinator'];

function roleAliases(publicGroup, routeGroup, screens) {
  return screens.map((screen) => alias(`app/${publicGroup}/${screen}.tsx`, `../${routeGroup}/${screen}`));
}

function alias(file, target) {
  return { file, target };
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasDefaultReExport(source, target) {
  return new RegExp(`export\\s+\\{\\s*default\\s*\\}\\s+from\\s+['"]${escapeRegExp(target)}['"];?`).test(source);
}

const results = [];

for (const item of aliases) {
  const absolute = path.join(root, item.file);
  if (!fs.existsSync(absolute)) {
    results.push({ name: item.file, pass: false, details: 'missing alias file' });
    continue;
  }

  const source = fs.readFileSync(absolute, 'utf8');
  results.push({
    name: `${item.file} -> ${item.target}`,
    pass: hasDefaultReExport(source, item.target),
    details: 'expected default re-export',
  });
}

const rootLayout = read('app/_layout.tsx');
for (const group of publicRoleGroups) {
  results.push({
    name: `root stack registers ${group}`,
    pass: rootLayout.includes(`name="${group}"`),
    details: `missing <Stack.Screen name="${group}" />`,
  });
}

const appUi = read('src/shared/ui/AppUI.tsx');
for (const group of publicRoleGroups) {
  results.push({
    name: `buyer shell hides ${group}`,
    pass: appUi.includes(`'${group}'`),
    details: `missing '${group}' from HIDDEN_SHELL_NAV_SEGMENTS`,
  });
}

const failed = results.filter((item) => !item.pass);
for (const item of results) {
  const label = item.pass ? 'OK  ' : 'FAIL';
  console.log(`${label} ${item.name}`);
  if (!item.pass) {
    console.log(`     ${item.details}`);
  }
}

console.log('');
console.log(`Summary: ${failed.length} failed, ${results.length} total.`);

if (failed.length > 0) {
  process.exitCode = 1;
}
