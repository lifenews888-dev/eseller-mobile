#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiSmokeChecks } from './api-smoke-checks.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const sellerFiles = [
  'src/api/sellerDashboard.ts',
  'src/hooks/useSellerDashboard.ts',
  'src/features/sellerNetwork/SellerNetworkSection.tsx',
  'app/(seller)/dashboard.tsx',
  'app/(seller)/earnings.tsx',
  'app/(seller)/profile.tsx',
];

const sources = Object.fromEntries(sellerFiles.map((file) => [file, read(file)]));
const combined = Object.values(sources).join('\n');
const apiSource = sources['src/api/sellerDashboard.ts'];
const hookSource = sources['src/hooks/useSellerDashboard.ts'];
const sectionSource = sources['src/features/sellerNetwork/SellerNetworkSection.tsx'];
const dashboardSource = sources['app/(seller)/dashboard.tsx'];
const earningsSource = sources['app/(seller)/earnings.tsx'];
const profileSource = sources['app/(seller)/profile.tsx'];
const checklist = read('docs/MOBILE_P0_SMOKE_CHECKLIST.md');
const launchSmoke = read('docs/SELLER_DASHBOARD_LAUNCH_SMOKE.md');

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

const directNegdPattern = /negd-superapp|negd\.app|negd-app|negd\.vercel/i;
const sellerWalletActionPattern = /wallet\/withdraw|api\/wallet|\/wallet\//i;

expect(!directNegdPattern.test(combined), 'seller dashboard code does not call Negd directly');
expect(!combined.includes('ESELLER_S2S_INTEGRATION_KEY'), 'seller dashboard code does not reference S2S key');
expect(!sellerWalletActionPattern.test(combined), 'seller dashboard code does not call wallet action endpoints');
expect(!combined.includes('import { useMutation'), 'seller dashboard code does not import useMutation');
expect(!combined.includes('useMutation(') && !combined.includes('useMutation({'), 'seller dashboard code has no mutation hooks');
expect(!apiSource.includes('post(') && !apiSource.includes('put(') && !apiSource.includes('del('), 'seller dashboard API client is GET-only');
expect(apiSource.includes("import { get, ApiError } from '../services/api'"), 'seller dashboard uses shared API client');

const endpointMatches = Array.from(
  apiSource.matchAll(/get\('(?<endpoint>\/seller\/[^']+)'\)/g),
  (match) => match.groups.endpoint,
);
const endpoints = Array.from(new Set(endpointMatches));

expect(endpoints.length > 0, 'seller dashboard exposes BFF GET endpoints');
expect(endpoints.length === endpointMatches.length, 'seller dashboard endpoint list has no duplicate GET calls');

for (const endpoint of endpoints) {
  expect(apiSource.includes(`get('${endpoint}')`), `seller dashboard endpoint ${endpoint}`);
  const smokeCheck = apiSmokeChecks.find((check) => check.path === endpoint);
  expect(!!smokeCheck, `seller dashboard endpoint ${endpoint} is covered by smoke:api`);
  expect(smokeCheck?.auth === true, `seller dashboard smoke:api endpoint ${endpoint} requires auth`);
  expect(
    JSON.stringify(smokeCheck?.warn) === JSON.stringify([403, 404, 503]),
    `seller dashboard smoke:api endpoint ${endpoint} warning contract`,
  );
}

const payloadGuards = [
  'isSellerMeResponse',
  'isSellerWalletSummary',
  'isSellerReferralSummary',
  'isSellerLeadSummary',
  'isSellerCommissionSummary',
  'isSellerDashboardResponse',
];

for (const guard of payloadGuards) {
  expect(apiSource.includes(`function ${guard}`), `seller dashboard payload guard ${guard}`);
}

expect(apiSource.includes('export class SellerApiError extends Error'), 'seller dashboard has typed SellerApiError');
expect(apiSource.includes('correlationId?: string'), 'seller dashboard preserves correlationId');
expect(apiSource.includes('if (envelope.ok === true') && apiSource.includes('if (envelope.ok === false'), 'seller dashboard unwraps ok envelopes');
expect(apiSource.includes('accepted direct payload'), 'seller dashboard keeps legacy direct-payload compatibility');
expect(apiSource.includes('leadHasForbiddenPii'), 'seller dashboard rejects lead PII');
for (const piiField of ['customerPhone', 'customerEmail', 'customerName', 'customerNote']) {
  expect(apiSource.includes(`'${piiField}'`), `seller dashboard blocks ${piiField}`);
}
expect(apiSource.includes('value.invariants.payableSourcedOnlyFromEffectiveTrue === true'), 'wallet invariant requires payable sourced from effective rows');
expect(apiSource.includes('typeof value.notificationsSummary.deferred === \'boolean\''), 'dashboard validates deferred notifications summary');

const hookChecks = [
  { name: 'me hook', queryKey: "queryKey: ['seller', 'me']", fn: 'queryFn: getSellerMe', stale: 'staleTime: STALE.me' },
  { name: 'dashboard hook', queryKey: "queryKey: ['seller', 'dashboard']", fn: 'queryFn: getSellerDashboard', stale: 'staleTime: STALE.walletAndCommission' },
  { name: 'wallet hook', queryKey: "queryKey: ['seller', 'wallet-summary']", fn: 'queryFn: getSellerWalletSummary', stale: 'staleTime: STALE.walletAndCommission' },
  { name: 'referral hook', queryKey: "queryKey: ['seller', 'referral-summary']", fn: 'queryFn: getSellerReferralSummary', stale: 'staleTime: STALE.referralAndLead' },
  { name: 'lead hook', queryKey: "queryKey: ['seller', 'lead-summary']", fn: 'queryFn: getSellerLeadSummary', stale: 'staleTime: STALE.referralAndLead' },
  { name: 'commission hook', queryKey: "queryKey: ['seller', 'commission-summary']", fn: 'queryFn: getSellerCommissionSummary', stale: 'staleTime: STALE.walletAndCommission' },
];

expect(hookSource.includes('walletAndCommission: 30 * 1000'), 'seller dashboard wallet/commission stale time is 30s');
expect(hookSource.includes('referralAndLead: 60 * 1000'), 'seller dashboard referral/lead stale time is 60s');
expect(hookSource.includes('enabled: enabledOrDefault(options)'), 'seller dashboard hooks support feature-flag enabled option');
for (const check of hookChecks) {
  expect(includesAll(hookSource, [check.queryKey, check.fn, check.stale]), `seller dashboard hook ${check.name}`);
}

expect(sectionSource.includes('useSellerNetworkEnabled()'), 'seller dashboard section reads remote feature flag');
expect(sectionSource.includes('if (!enabled) return null'), 'seller dashboard section hides when flag off');
expect(sectionSource.includes('useSellerDashboard({ enabled })'), 'seller dashboard section gates query on flag');
expect(sectionSource.includes('describeSellerError(error)'), 'seller dashboard section maps errors safely');
expect(sectionSource.includes("desc.isOffline ? '") && sectionSource.includes('desc.correlationId'), 'seller dashboard section renders offline/correlation error state');
expect(sectionSource.includes('function DisabledPayableBucket'), 'seller dashboard has disabled payable bucket');
expect(sectionSource.includes('borderStyle: \'dashed\'') && sectionSource.includes('opacity: 0.6'), 'payable bucket is visually disabled');
expect(!sectionSource.includes('onPress={') || !sectionSource.slice(sectionSource.indexOf('function DisabledPayableBucket'), sectionSource.indexOf('function CommissionCard')).includes('TouchableOpacity'), 'payable bucket is not touchable');
expect(sectionSource.includes('payableMnt') && apiSource.includes('paidOutMnt: number'), 'seller dashboard keeps read-only money contract');
expect(sectionSource.includes('LeadCard') && sectionSource.includes('recentLeads.slice(0, 5)'), 'seller dashboard limits recent lead rendering');

expect(dashboardSource.includes('SellerNetworkSection'), 'seller dashboard screen renders seller network section');
expect(earningsSource.includes('useSellerCommissionSummary'), 'seller earnings screen reads seller commission summary');
expect(earningsSource.includes('describeSellerError'), 'seller earnings screen maps seller errors');
expect(profileSource.includes('useSellerMe'), 'seller profile screen reads seller me');

expect(checklist.includes('npm run smoke:seller-dashboard'), 'checklist documents smoke:seller-dashboard');
expect(launchSmoke.includes('npm run smoke:seller-dashboard'), 'launch checklist documents seller dashboard smoke guard');
expect(launchSmoke.includes('npm run smoke:api'), 'launch checklist documents live API smoke');
expect(launchSmoke.includes('npm run smoke:api:auth'), 'launch checklist requires strict auth API smoke');
expect(launchSmoke.includes('npm run smoke:p0'), 'launch checklist documents P0 smoke');
expect(launchSmoke.includes('No request goes to Negd directly.'), 'launch checklist covers direct Negd guard');
expect(launchSmoke.includes('No request goes to `/api/wallet*`'), 'launch checklist covers wallet endpoint guard');

console.log('');
console.log(`Summary: ${failures} failed.`);

if (failures > 0) {
  process.exitCode = 1;
}
