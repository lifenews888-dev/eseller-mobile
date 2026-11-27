#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = path.join(root, 'app');

const shortcutSources = [
  'app/(tabs)/index.tsx',
  'app/(tabs)/profile.tsx',
  'app/(customer)/services.tsx',
  'src/shared/ui/AppUI.tsx',
];

const expectedBuyerRoutes = [
  '/',
  '/about',
  '/addresses',
  '/ai-shopper',
  '/become-driver',
  '/become-seller',
  '/bnpl',
  '/cart',
  '/chat',
  '/contact',
  '/coupons',
  '/dropship',
  '/edit-profile',
  '/feed',
  '/feedback',
  '/help',
  '/herder',
  '/live',
  '/notification-settings',
  '/open-shop',
  '/orders',
  '/partner',
  '/privacy',
  '/profile',
  '/returns',
  '/search',
  '/security',
  '/services',
  '/shops',
  '/store',
  '/terms',
  '/tier-details',
  '/track/search',
  '/wallet',
  '/wishlist',
];

const routeLiteralPatterns = [
  /\broute:\s*['"]([^'"`]+)['"]/g,
  /\bhref:\s*['"]([^'"`]+)['"]/g,
  /router\.(?:push|replace)\(\s*['"]([^'"`]+)['"]/g,
  /pathname:\s*['"]([^'"`]+)['"]/g,
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

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else if (entry.name.endsWith('.tsx')) files.push(absolute);
  }

  return files;
}

function routeFromAppFile(absoluteFile) {
  const relativePath = toPosix(path.relative(appRoot, absoluteFile));
  const withoutExt = relativePath.replace(/\.[^.]+$/, '');
  const segments = withoutExt
    .split('/')
    .filter((segment) => segment && !segment.startsWith('(') && segment !== '_layout');

  if (segments.length === 0) return '';
  if (segments.some((segment) => segment.includes('['))) return '';
  if (segments.at(-1) === 'index') segments.pop();

  return `/${segments.join('/')}`.replace(/\/+/g, '/') || '/';
}

function collectRoutes() {
  const routes = new Set();
  for (const file of walk(appRoot)) {
    const route = routeFromAppFile(file);
    if (route) routes.add(route);
  }
  return routes;
}

function normalizeRouteLiteral(value) {
  if (!value.startsWith('/') || value.startsWith('//')) return '';
  if (value.includes('${') || value.includes('[')) return '';
  return value.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
}

function extractRouteLiterals(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const routes = new Set();

  for (const pattern of routeLiteralPatterns) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      const route = normalizeRouteLiteral(match[1]);
      if (route) routes.add(route);
    }
  }

  return [...routes].sort();
}

const availableRoutes = collectRoutes();
const shortcutRoutes = new Set();

for (const source of shortcutSources) {
  const routes = extractRouteLiterals(source);
  expect(routes.length > 0, `${source} exposes shortcut route literals`);
  for (const route of routes) shortcutRoutes.add(route);
}

for (const route of expectedBuyerRoutes) {
  expect(
    shortcutRoutes.has(route),
    `buyer shortcuts include ${route}`,
    'A primary buyer route disappeared from home/profile/services/shell navigation.',
  );
  expect(
    availableRoutes.has(route),
    `buyer shortcut route exists: ${route}`,
    'Route literals must point to an app file, including files inside route groups.',
  );
}

for (const route of shortcutRoutes) {
  expect(
    availableRoutes.has(route),
    `shortcut target resolves: ${route}`,
    'Shortcut route literal does not resolve to a public Expo route.',
  );
}

console.log('');
console.log(`Summary: ${failures} failed.`);

if (failures > 0) process.exitCode = 1;
