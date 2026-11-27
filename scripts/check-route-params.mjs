#!/usr/bin/env node

import {
  encodeRouteParam,
  normalizeRouteParam,
  safeDecodeRouteParam,
} from '../src/shared/routeParams.ts';

const checks = [];

function check(name, actual, expected) {
  const pass = Object.is(actual, expected);
  checks.push({ name, pass, actual, expected });
}

check('normalizes missing route param', normalizeRouteParam(undefined), '');
check('normalizes null route param', normalizeRouteParam(null), '');
check('trims route param strings', normalizeRouteParam('  abc-123  '), 'abc-123');
check('uses first array route param', normalizeRouteParam([' first ', 'second']), 'first');
check('decodes encoded path segment', safeDecodeRouteParam('abc%2Fdef'), 'abc/def');
check('keeps plain route segment', safeDecodeRouteParam('plain-id'), 'plain-id');
check('does not throw on malformed percent encoding', safeDecodeRouteParam('bad%zzid'), 'bad%zzid');
check('encodes route param strings', encodeRouteParam('abc/def'), 'abc%2Fdef');
check('encodes numeric route params', encodeRouteParam(42), '42');
check('encodes missing route params as empty', encodeRouteParam(null), '');

let failures = 0;
for (const item of checks) {
  if (item.pass) {
    console.log(`OK   ${item.name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${item.name}`);
    console.log(`     expected ${JSON.stringify(item.expected)}, got ${JSON.stringify(item.actual)}`);
  }
}

console.log('');
console.log(`Summary: ${failures} failed, ${checks.length} total.`);

if (failures > 0) {
  process.exitCode = 1;
}
