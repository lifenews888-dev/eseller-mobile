#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const apiSource = read('src/features/herder/api.ts');
const typesSource = read('src/features/herder/types.ts');
const servicesSource = read('src/services/api.ts');
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

const endpointChecks = [
  {
    name: 'public product list',
    snippets: ["withCache('/herder/products'", "get('/herder/products', params)"],
  },
  {
    name: 'public product detail',
    snippets: ['withCache(`/herder/products/${id}`', 'get(`/herder/products/${id}`)'],
  },
  {
    name: 'public herder profile',
    snippets: ['withCache(`/herder/profile/${herderId}`', 'get(`/herder/profile/${herderId}`)'],
  },
  {
    name: 'public herder reviews',
    snippets: ['get(`/herder/profile/${herderId}/reviews`, params)'],
  },
  {
    name: 'buyer review submit',
    snippets: ["post('/herder/reviews', payload)"],
  },
  {
    name: 'herder registration',
    snippets: ["post('/herder/register', payload)"],
  },
  {
    name: 'herder product list',
    snippets: ["get('/herder/my/products', params)"],
  },
  {
    name: 'herder product create',
    snippets: ["post('/herder/my/products', payload)"],
  },
  {
    name: 'herder product update',
    snippets: ['put(`/herder/my/products/${id}`, payload)'],
  },
  {
    name: 'herder product remove',
    snippets: ['del(`/herder/my/products/${id}`)'],
  },
  {
    name: 'herder order list',
    snippets: ["get('/herder/my/orders', params)"],
  },
  {
    name: 'herder order status update',
    snippets: ['put(`/herder/my/orders/${id}/status`, { status, note })'],
  },
  {
    name: 'herder earnings',
    snippets: ["get('/herder/my/earnings')"],
  },
  {
    name: 'coordinator application list',
    snippets: ["get('/herder/coordinator/applications', params)"],
  },
  {
    name: 'coordinator application review',
    snippets: ['put(`/herder/coordinator/applications/${id}`, { action, reason })'],
  },
  {
    name: 'coordinator herder roster',
    snippets: ["get('/herder/coordinator/herders', params)"],
  },
  {
    name: 'coordinator stats',
    snippets: ["get('/herder/coordinator/stats')"],
  },
];

for (const check of endpointChecks) {
  expect(includesAll(apiSource, check.snippets), `HerderAPI endpoint ${check.name}`);
}

const responseFallbackChecks = [
  { name: 'public products default empty list', snippet: 'products: data.products ?? []' },
  { name: 'public products default pages', snippet: 'pages:    data.pages    ?? 0' },
  { name: 'reviews default empty list', snippet: 'reviews: data.reviews ?? []' },
  { name: 'reviews default total', snippet: 'total:   data.total   ?? 0' },
  { name: 'my products default empty list', snippet: 'products: data.products ?? []' },
  { name: 'my orders default empty list', snippet: 'orders: data.orders ?? []' },
  { name: 'coordinator applications default empty list', snippet: 'applications: data.applications ?? []' },
  { name: 'coordinator roster default empty list', snippet: 'herders: data.herders ?? []' },
  { name: 'remove defaults success true', snippet: 'return { success: data?.success ?? true }' },
];

for (const check of responseFallbackChecks) {
  expect(apiSource.includes(check.snippet), `HerderAPI fallback ${check.name}`);
}

const typeContracts = [
  'export interface HerderProduct',
  'export interface HerderListResponse',
  'export interface HerderProfile',
  'export interface HerderReviewPayload',
  'export interface HerderRegisterPayload',
  'export interface MyHerderProduct',
  'export interface MyProductsResponse',
  'export interface MyOrdersResponse',
  'export interface EarningsSummary',
  'export interface ApplicationsResponse',
  'export interface HerderRosterResponse',
  'export interface CoordinatorStats',
  "export type ApplicationAction = 'approve' | 'reject' | 'request_review'",
];

for (const contract of typeContracts) {
  expect(typesSource.includes(contract), `Herder type contract ${contract.replace('export ', '')}`);
}

expect(apiSource.includes('function unwrap<T>'), 'HerderAPI unwraps backend envelopes');
expect(apiSource.includes("'success' in res && 'data' in res"), 'HerderAPI supports { success, data } wrapper');
expect(servicesSource.includes('src/features/herder/api.ts'), 'shared API file points to HerderAPI wrapper');
expect(checklist.includes('npm run smoke:herder-api'), 'checklist documents smoke:herder-api');

console.log('');
console.log(`Summary: ${failures} failed.`);

if (failures > 0) {
  process.exitCode = 1;
}
