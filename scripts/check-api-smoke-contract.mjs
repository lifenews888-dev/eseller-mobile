#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiSmokeChecks } from './api-smoke-checks.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'scripts/smoke-mobile-api.mjs'), 'utf8');
const authSource = fs.readFileSync(path.join(root, 'scripts/smoke-mobile-api-auth.mjs'), 'utf8');
const checksSource = fs.readFileSync(path.join(root, 'scripts/api-smoke-checks.mjs'), 'utf8');
const checklist = fs.readFileSync(path.join(root, 'docs/MOBILE_P0_SMOKE_CHECKLIST.md'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const requiredEnvVars = [
  'ESELLER_API_BASE_URL',
  'EXPO_PUBLIC_API_BASE_URL',
  'EXPO_PUBLIC_API_URL',
  'ESELLER_API_TOKEN',
  'EXPO_PUBLIC_API_TOKEN',
  'ESELLER_LOGIN_IDENTIFIER',
  'ESELLER_LOGIN_PASSWORD',
  'ESELLER_SMOKE_TIMEOUT_MS',
  'ESELLER_SMOKE_REQUIRE_AUTH',
];

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

function hasCheckPath(pathname) {
  return checksSource.includes(`path: '${pathname}'`) || checksSource.includes(`path: "${pathname}"`);
}

function hasWarnCodes(codes) {
  return !codes || checksSource.includes(`warn: [${codes.join(', ')}]`);
}

let failures = 0;

expect(source.includes("const DEFAULT_BASE = 'https://eseller.mn/api'"), 'API smoke default base is production /api');
expect(source.includes('TIMEOUT_MS'), 'API smoke has timeout guard');
expect(source.includes("trimmed.endsWith('/api')"), 'API smoke normalizes /api suffix');
expect(source.includes("import { apiSmokeChecks } from './api-smoke-checks.mjs';"), 'API smoke imports shared check list');
expect(source.includes('const checks = apiSmokeChecks'), 'API smoke uses shared check list');

for (const envVar of requiredEnvVars) {
  expect(source.includes(envVar), `API smoke reads ${envVar}`);
}

for (const check of apiSmokeChecks) {
  expect(checksSource.includes(`name: '${check.name}'`), `API smoke includes check "${check.name}"`);
  expect(hasCheckPath(check.path), `API smoke path ${check.path}`);
  expect(hasWarnCodes(check.warn), `API smoke warning contract for ${check.name}`);
  expect(Array.isArray(check.ok) && check.ok.includes(200), `API smoke OK contract for ${check.name}`);
  if (check.auth) {
    const start = checksSource.indexOf(`name: '${check.name}'`);
    const end = checksSource.indexOf('}', start);
    expect(checksSource.slice(start, end).includes('auth: true'), `API smoke auth gate for ${check.name}`);
  }
}

expect(source.includes('function authSkipDetail()'), 'API smoke explains skipped auth checks');
expect(source.includes('REQUIRE_AUTH'), 'API smoke has strict auth mode');
expect(source.includes('ESELLER_SMOKE_REQUIRE_AUTH=1'), 'API smoke explains strict auth failures');
expect(packageJson.scripts?.['smoke:api:auth'] === 'node scripts/smoke-mobile-api-auth.mjs', 'package exposes smoke:api:auth');
expect(authSource.includes("process.env.ESELLER_SMOKE_REQUIRE_AUTH = '1'"), 'strict auth wrapper enables require-auth mode');
expect(authSource.includes("await import('./smoke-mobile-api.mjs')"), 'strict auth wrapper delegates to smoke:api');
expect(source.includes('credentialPayload'), 'API smoke supports login credential payloads');
expect(source.includes('extractToken'), 'API smoke extracts token from envelope and legacy responses');
expect(source.includes("status === 'skip'"), 'API smoke reports skipped checks');
expect(source.includes("status === 'warn'"), 'API smoke reports warning checks');
expect(source.includes('process.exitCode = 1'), 'API smoke fails on hard failures');

expect(checklist.includes('npm run smoke:api'), 'checklist documents smoke:api');
expect(checklist.includes('ESELLER_API_BASE_URL=https://eseller.mn/api npm run smoke:api'), 'checklist documents base override');
expect(checklist.includes('ESELLER_API_TOKEN=<jwt> npm run smoke:api'), 'checklist documents token auth');
expect(checklist.includes('ESELLER_LOGIN_IDENTIFIER=<email-or-phone> ESELLER_LOGIN_PASSWORD=<password> npm run smoke:api'), 'checklist documents login auth');
expect(checklist.includes('ESELLER_SMOKE_REQUIRE_AUTH=1 ESELLER_API_TOKEN=<jwt> npm run smoke:api'), 'checklist documents strict token auth');
expect(checklist.includes('ESELLER_SMOKE_REQUIRE_AUTH=1 ESELLER_LOGIN_IDENTIFIER=<email-or-phone> ESELLER_LOGIN_PASSWORD=<password> npm run smoke:api'), 'checklist documents strict login auth');
expect(checklist.includes('npm run smoke:api:auth'), 'checklist documents strict auth script');
for (const check of apiSmokeChecks.filter((item) => item.warn)) {
  expect(checklist.includes(check.path.split('?')[0]), `checklist documents warnings for ${check.path}`);
}

console.log('');
console.log(`Summary: ${failures} failed.`);

if (failures > 0) {
  process.exitCode = 1;
}
