#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPublicBrowsingRequest } from '../src/shared/apiAuthPolicy.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const publicSurfaces = [
  {
    name: 'home featured products',
    file: 'app/(tabs)/index.tsx',
    endpoints: ['/search?limit=10&sort=newest&featured=true', '/search?limit=10&sort=newest'],
  },
  {
    name: 'home featured stores and feed',
    file: 'app/(tabs)/index.tsx',
    endpoints: ['/stores?limit=10', '/feed?limit=6'],
  },
  {
    name: 'store browse',
    file: 'app/(tabs)/store.tsx',
    endpoints: ['/search'],
  },
  {
    name: 'search browse',
    file: 'app/(tabs)/search.tsx',
    endpoints: ['/search', '/stores', '/feed'],
  },
  {
    name: 'feed browse',
    file: 'app/(tabs)/feed.tsx',
    endpoints: ['/feed'],
  },
  {
    name: 'shops browse',
    file: 'app/(tabs)/shops.tsx',
    endpoints: ['/stores'],
  },
  {
    name: 'social stories and group buy',
    file: 'app/(tabs)/social.tsx',
    endpoints: ['/stories', '/group-buy'],
  },
  {
    name: 'flash sale browse',
    file: 'app/(customer)/flash-sale.tsx',
    endpoints: ['/flash-sales/active'],
  },
  {
    name: 'home flash sale row',
    file: 'src/components/home/FlashSaleRow.tsx',
    endpoints: ['/search'],
  },
  {
    name: 'home stories row',
    file: 'src/components/home/StoriesRow.tsx',
    endpoints: ['/stories'],
  },
  {
    name: 'live browse service',
    file: 'src/services/api.ts',
    endpoints: [
      '/live',
      { path: '/live/demo-stream', sourcePattern: '`/live/${pathSegment(id)}`' },
    ],
  },
  {
    name: 'product browse service',
    file: 'src/services/api.ts',
    endpoints: [
      '/products',
      { path: '/products/demo-product/related', sourcePattern: "get('/products'" },
    ],
  },
];

const protectedSurfaces = [
  {
    name: 'owner product management remains protected',
    file: 'app/(tabs)/store.tsx',
    endpoints: ['/products/my'],
  },
  {
    name: 'orders remain protected',
    file: 'src/services/api.ts',
    endpoints: ['/orders'],
  },
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

function readRelative(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function endpointPath(endpoint) {
  return typeof endpoint === 'string' ? endpoint : endpoint.path;
}

function sourceContainsEndpoint(source, endpoint) {
  if (typeof endpoint !== 'string' && source.includes(endpoint.sourcePattern)) return true;
  endpoint = endpointPath(endpoint);
  const [pathname] = endpoint.split('?');
  return source.includes(endpoint) || source.includes(pathname);
}

for (const surface of publicSurfaces) {
  const source = readRelative(surface.file);
  for (const endpoint of surface.endpoints) {
    const endpointUrl = endpointPath(endpoint);
    expect(
      sourceContainsEndpoint(source, endpoint),
      `${surface.name} still references ${endpointUrl}`,
      `${surface.file} no longer contains ${endpointUrl}`,
    );
    expect(
      isPublicBrowsingRequest({ method: 'get', url: endpointUrl }),
      `${surface.name} GET ${endpointUrl} is public browsing`,
      'Public browsing endpoints must not carry Authorization or cause app-wide auth redirects.',
    );
    expect(
      isPublicBrowsingRequest({ method: 'get', url: `https://eseller.mn/api${endpointUrl}` }),
      `${surface.name} absolute API GET ${endpointUrl} is public browsing`,
      'Absolute API URLs must classify the same as relative paths.',
    );
    expect(
      !isPublicBrowsingRequest({ method: 'post', url: endpointUrl }),
      `${surface.name} POST ${endpointUrl} is not public browsing`,
      'Only read-only browsing requests may bypass Authorization.',
    );
  }
}

for (const surface of protectedSurfaces) {
  const source = readRelative(surface.file);
  for (const endpoint of surface.endpoints) {
    expect(
      sourceContainsEndpoint(source, endpoint),
      `${surface.name} still references ${endpoint}`,
      `${surface.file} no longer contains ${endpoint}`,
    );
    expect(
      !isPublicBrowsingRequest({ method: 'get', url: endpoint }),
      `${surface.name} GET ${endpoint} stays protected`,
      'Protected account endpoints must still carry Authorization and may invalidate expired sessions.',
    );
  }
}

console.log('');
console.log(`Summary: ${failures} failed.`);

if (failures > 0) process.exitCode = 1;
