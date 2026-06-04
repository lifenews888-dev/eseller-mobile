#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const requiredEnvExampleKeys = [
  'EXPO_PUBLIC_API_BASE_URL',
  'EXPO_PUBLIC_MALCHNAAS_ENABLED',
  'EXPO_PUBLIC_SELLER_NETWORK_ENABLED',
  'EXPO_PUBLIC_MALCHNAAS_PILOT_AIMAGS',
  'EXPO_PUBLIC_OTP_ENABLED',
  'EXPO_PUBLIC_SENTRY_DSN',
  'SENTRY_ORG',
  'SENTRY_PROJECT',
  'SENTRY_AUTH_TOKEN',
];

const easProfiles = ['development', 'preview', 'production'];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function parseEnvExample(source) {
  const values = new Map();
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    values.set(key, rest.join('='));
  }
  return values;
}

function normalizeBase(value) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function isHttpUrl(value) {
  return /^https?:\/\/[^/\s]+/i.test(value);
}

function isBooleanFlag(value) {
  return ['0', '1', 'true', 'false'].includes(String(value).toLowerCase());
}

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

let failures = 0;

const envExample = parseEnvExample(read('.env.example'));
for (const key of requiredEnvExampleKeys) {
  expect(envExample.has(key), `.env.example includes ${key}`);
}

const envApiBase = envExample.get('EXPO_PUBLIC_API_BASE_URL');
expect(isHttpUrl(envApiBase), '.env.example API base is an HTTP URL', envApiBase);
expect(normalizeBase(envApiBase) === envApiBase, '.env.example API base includes /api suffix', envApiBase);
expect(isBooleanFlag(envExample.get('EXPO_PUBLIC_MALCHNAAS_ENABLED')), '.env.example Malchnaas flag is boolean-like');
expect(isBooleanFlag(envExample.get('EXPO_PUBLIC_SELLER_NETWORK_ENABLED')), '.env.example seller-network flag is boolean-like');
expect(isBooleanFlag(envExample.get('EXPO_PUBLIC_OTP_ENABLED')), '.env.example OTP flag is boolean-like');
expect(
  envExample.get('EXPO_PUBLIC_MALCHNAAS_PILOT_AIMAGS') === 'AKH,TOV,SEL',
  '.env.example pilot aimags match launch default',
);

const eas = JSON.parse(read('eas.json'));
for (const profile of easProfiles) {
  const apiBase = eas.build?.[profile]?.env?.EXPO_PUBLIC_API_BASE_URL;
  expect(apiBase === 'https://eseller.mn/api', `EAS ${profile} API base targets production /api`, apiBase);
}
expect(eas.build?.development?.env?.SENTRY_DISABLE_AUTO_UPLOAD === 'true', 'EAS development disables Sentry upload');
expect(eas.build?.preview?.env?.SENTRY_DISABLE_AUTO_UPLOAD === 'true', 'EAS preview disables Sentry upload');

const apiBaseSource = read('src/config/apiBase.ts');
expect(apiBaseSource.includes('process.env.EXPO_PUBLIC_API_BASE_URL'), 'apiBase reads EXPO_PUBLIC_API_BASE_URL');
expect(apiBaseSource.includes('process.env.EXPO_PUBLIC_API_URL'), 'apiBase reads legacy EXPO_PUBLIC_API_URL');
expect(apiBaseSource.includes("trimmed.endsWith('/api')"), 'apiBase normalizes /api suffix');
expect(apiBaseSource.includes('DEV_DEFAULT_API_BASE_URL'), 'apiBase has dev fallback');
expect(apiBaseSource.includes('https://eseller.mn/api'), 'apiBase has production fallback');

const flagsSource = read('src/config/flags.ts');
for (const key of [
  'EXPO_PUBLIC_MALCHNAAS_ENABLED',
  'EXPO_PUBLIC_SELLER_NETWORK_ENABLED',
  'EXPO_PUBLIC_MALCHNAAS_PILOT_AIMAGS',
  'EXPO_PUBLIC_OTP_ENABLED',
]) {
  expect(flagsSource.includes(key), `flags.ts reads ${key}`);
}

const remoteFlagsSource = read('src/config/remoteFlags.ts');
expect(remoteFlagsSource.includes("get('/config/mobile')"), 'remote flags fetch /config/mobile');
expect(remoteFlagsSource.includes("CACHE_KEY  = 'remote-config:v1'"), 'remote flags cache key is versioned');

const appConfigSource = read('app.config.js');
expect(appConfigSource.includes("const SENTRY_PLUGIN = '@sentry/react-native'"), 'app.config knows Sentry plugin');
expect(appConfigSource.includes('if (organization && project)'), 'app.config gates Sentry plugin on org/project');
expect(appConfigSource.includes('withoutSentryPlugin'), 'app.config removes duplicate Sentry plugin');

console.log('');
console.log(`Summary: ${failures} failed.`);

if (failures > 0) {
  process.exitCode = 1;
}
