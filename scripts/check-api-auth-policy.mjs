#!/usr/bin/env node

import {
  isPublicBrowsingRequest,
  requestHadAuthorization,
  requestPath,
} from '../src/shared/apiAuthPolicy.ts';

const checks = [
  ['path strips query', requestPath({ url: '/feed/abc?x=1' }), '/feed/abc'],
  ['absolute API URL path strips /api', requestPath({ url: 'https://eseller.mn/api/search?q=x' }), '/search'],
  ['public absolute API URL GET', isPublicBrowsingRequest({ method: 'get', url: 'https://eseller.mn/api/search?q=x' }), true],
  ['protected absolute API URL GET', isPublicBrowsingRequest({ method: 'get', url: 'https://eseller.mn/api/orders' }), false],
  ['public search GET', isPublicBrowsingRequest({ method: 'get', url: '/search?q=x' }), true],
  ['public feed detail GET', isPublicBrowsingRequest({ method: 'get', url: '/feed/abc' }), true],
  ['public product related GET', isPublicBrowsingRequest({ method: 'get', url: '/products/abc/related' }), true],
  ['public live detail GET', isPublicBrowsingRequest({ method: 'get', url: '/live/abc' }), true],
  ['public stories GET', isPublicBrowsingRequest({ method: 'get', url: '/stories' }), true],
  ['public herder profile GET', isPublicBrowsingRequest({ method: 'get', url: '/herder/profile/h1/reviews' }), true],
  ['protected my products GET', isPublicBrowsingRequest({ method: 'get', url: '/products/my' }), false],
  ['protected orders GET', isPublicBrowsingRequest({ method: 'get', url: '/orders' }), false],
  ['public path POST remains protected', isPublicBrowsingRequest({ method: 'post', url: '/feed' }), false],
  ['plain auth header detected', requestHadAuthorization({ headers: { Authorization: 'Bearer x' } }), true],
  ['lowercase auth header detected', requestHadAuthorization({ headers: { authorization: 'Bearer x' } }), true],
  [
    'getter auth header detected',
    requestHadAuthorization({ headers: { get: (key) => (key.toLowerCase() === 'authorization' ? 'Bearer x' : '') } }),
    true,
  ],
  ['missing auth header', requestHadAuthorization({ headers: {} }), false],
];

let failures = 0;

for (const [name, actual, expected] of checks) {
  if (Object.is(actual, expected)) {
    console.log(`OK   ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name}`);
    console.log(`     expected: ${String(expected)}`);
    console.log(`     actual:   ${String(actual)}`);
  }
}

console.log('');
console.log(`Summary: ${failures} failed, ${checks.length} total.`);

if (failures > 0) process.exitCode = 1;
