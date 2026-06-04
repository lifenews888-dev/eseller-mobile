#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const cacheSource = read('src/features/herder/cache.ts');
const queueSource = read('src/features/herder/queue.ts');
const deliverySource = read('src/features/herder/delivery.ts');
const constantsSource = read('src/features/herder/constants.ts');
const indexSource = read('src/features/herder/index.ts');
const listingFormSource = read('app/(herder)/listing-form.tsx');
const listingsSource = read('app/(herder)/listings.tsx');
const checklist = read('docs/MOBILE_P0_SMOKE_CHECKLIST.md');

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

function includesAll(source, snippets) {
  return snippets.every((snippet) => source.includes(snippet));
}

const provinceCodes = Array.from(constantsSource.matchAll(/code:\s*'([^']+)'/g), (match) => match[1]);
const uniqueProvinceCodes = new Set(provinceCodes);

expect(cacheSource.includes("const PREFIX = 'herder-cache:v1:'"), 'cache uses versioned storage prefix');
expect(cacheSource.includes('const TTL_MS = 24 * 60 * 60 * 1000'), 'cache TTL is 24 hours');
expect(
  includesAll(cacheSource, ['Object.keys(params)', '.sort()', ".join('&')"]),
  'cache key sorts params before storage',
);
expect(cacheSource.includes('AsyncStorage.getItem(key(endpoint, params))'), 'cache reads endpoint+params key');
expect(cacheSource.includes('AsyncStorage.setItem(key(endpoint, params), JSON.stringify(env))'), 'cache writes endpoint+params key');
expect(cacheSource.includes('AsyncStorage.removeItem(key(endpoint, params))'), 'cache removes expired values');
expect(cacheSource.includes('getAllKeys()'), 'cache clear scans AsyncStorage keys');
expect(cacheSource.includes('startsWith(PREFIX)'), 'cache clear only removes herder cache keys');
expect(cacheSource.includes('multiRemove(mine)'), 'cache clear removes matching keys in bulk');
expect(
  includesAll(cacheSource, ['const fresh = await fetcher()', 'writeCache(endpoint, params, fresh)', 'return fresh']),
  'withCache writes through successful fetches',
);
expect(
  includesAll(cacheSource, ['const cached = await readCache<T>(endpoint, params)', 'if (cached !== null) return cached', 'throw err']),
  'withCache falls back to cache then rethrows original error',
);

expect(queueSource.includes("const STORAGE_KEY = 'herder-queue:v1'"), 'queue uses versioned storage key');
expect(queueSource.includes("export type QueueKind = 'create' | 'update'"), 'queue supports create and update writes');
expect(queueSource.includes('return items.slice().sort((a, b) => b.createdAt - a.createdAt)'), 'queue list is newest first');
expect(queueSource.includes('items.push(item)'), 'queue enqueue appends new item');
expect(queueSource.includes('writeAll(items.filter((i) => i.id !== id))'), 'queue remove drops requested id');
expect(queueSource.includes('HerderAPI.my.products.create(item.payload)'), 'queue drains create through HerderAPI');
expect(queueSource.includes('HerderAPI.my.products.update(item.productId, item.payload)'), 'queue drains update through HerderAPI');
expect(queueSource.includes('result.succeeded += 1'), 'queue counts successful drains');
expect(queueSource.includes('const offline = isOfflineError(err)'), 'queue classifies offline failures');
expect(queueSource.includes('lastError: undefined'), 'offline failure clears lastError');
expect(queueSource.includes('failedOffline += 1'), 'queue counts offline failures');
expect(queueSource.includes('failedServer += 1'), 'queue counts server failures');
expect(queueSource.includes("lastError: err instanceof Error ? err.message : '"), 'server failure records lastError');
expect(queueSource.includes('// malformed') && queueSource.includes('continue;'), 'malformed update is dropped instead of retried forever');

expect(indexSource.includes("export * as HerderQueue from './queue'"), 'feature barrel exports HerderQueue namespace');
expect(indexSource.includes("export type { QueueItem, QueueKind, DrainResult } from './queue'"), 'feature barrel exports queue types');

expect(listingFormSource.includes("import * as HerderQueue from '../../src/features/herder/queue'"), 'listing form imports queue helper');
expect(
  includesAll(listingFormSource, ["import { isOfflineError } from '../../src/services/api'", 'if (isOfflineError(']),
  'listing form only queues offline failures',
);
expect(listingFormSource.includes("HerderQueue.enqueue({ kind: 'update'"), 'listing form queues offline updates');
expect(listingFormSource.includes("HerderQueue.enqueue({ kind: 'create'"), 'listing form queues offline creates');
expect(listingFormSource.includes("queryKey: ['herder', 'queue']"), 'listing form invalidates queue query');

expect(listingsSource.includes("queryFn:  () => HerderQueue.list()"), 'listings screen reads queued writes');
expect(listingsSource.includes('mutationFn: () => HerderQueue.drain()'), 'listings screen exposes queue drain');
expect(listingsSource.includes('HerderQueue.remove(id)'), 'listings screen can discard queued write');
expect(listingsSource.includes('cloud-offline-outline'), 'listings screen renders offline queue banner');

expect(deliverySource.includes('useAimagDeliveryOverride(code)'), 'delivery hook checks remote override first');
expect(deliverySource.includes('getAimagDeliveryOverride(code)'), 'delivery getter checks remote override first');
expect(deliverySource.includes('fallback(code)'), 'delivery falls back to compiled province defaults');
expect(deliverySource.includes('code.toUpperCase()'), 'delivery lookup normalizes province code case');

expect(provinceCodes.length === 21, 'province constants include 21 aimags', `found ${provinceCodes.length}`);
expect(uniqueProvinceCodes.size === provinceCodes.length, 'province constants have unique codes');
expect(provinceCodes.includes('BOL'), 'province constants include Bayan-Olgii code BOL');
expect(provinceCodes.includes('DOG'), 'province constants include Dornogovi code DOG');
expect(constantsSource.includes('export const CATEGORIES = ['), 'herder categories are centralized');
expect(constantsSource.includes('export const HERDER_BRAND = C.herder'), 'herder brand uses design token');

expect(checklist.includes('npm run smoke:herder-offline'), 'checklist documents smoke:herder-offline');

console.log('');
console.log(`Summary: ${failures} failed.`);

if (failures > 0) {
  process.exitCode = 1;
}
