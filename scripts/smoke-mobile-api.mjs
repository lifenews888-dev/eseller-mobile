#!/usr/bin/env node

import { apiSmokeChecks } from './api-smoke-checks.mjs';

const DEFAULT_BASE = 'https://eseller.mn/api';
const TIMEOUT_MS = Number(process.env.ESELLER_SMOKE_TIMEOUT_MS || 15000);
const REQUIRE_AUTH = ['1', 'true'].includes(
  String(process.env.ESELLER_SMOKE_REQUIRE_AUTH || '').toLowerCase(),
);

function normalizeBase(value) {
  const trimmed = String(value || DEFAULT_BASE).replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const baseUrl = normalizeBase(
  process.env.ESELLER_API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    DEFAULT_BASE,
);
let token = process.env.ESELLER_API_TOKEN || process.env.EXPO_PUBLIC_API_TOKEN || '';
const loginIdentifier = process.env.ESELLER_LOGIN_IDENTIFIER || '';
const loginPassword = process.env.ESELLER_LOGIN_PASSWORD || '';

const checks = apiSmokeChecks;

function statusLabel(result) {
  if (result.status === 'skip') return 'SKIP';
  if (result.status === 'ok') return 'OK';
  if (result.status === 'warn') return 'WARN';
  return 'FAIL';
}

function credentialPayload(identifier, password) {
  const trimmed = identifier.trim();
  const isPhone = /^\d{8,}$/.test(trimmed);
  return isPhone ? { phone: trimmed, password } : { email: trimmed.toLowerCase(), password };
}

function authSkipDetail() {
  if (REQUIRE_AUTH) {
    return 'Set ESELLER_API_TOKEN, or ESELLER_LOGIN_IDENTIFIER + ESELLER_LOGIN_PASSWORD; ESELLER_SMOKE_REQUIRE_AUTH=1 was set.';
  }
  if (loginIdentifier || loginPassword) {
    return 'Login credentials were provided but token acquisition failed.';
  }
  return 'Set ESELLER_API_TOKEN, or ESELLER_LOGIN_IDENTIFIER + ESELLER_LOGIN_PASSWORD, to run authenticated checks.';
}

function extractToken(raw) {
  if (!raw || typeof raw !== 'object') return '';
  if (typeof raw.token === 'string') return raw.token;
  if (raw.success === true && raw.data && typeof raw.data.token === 'string') return raw.data.token;
  if (raw.ok === true && raw.data && typeof raw.data.token === 'string') return raw.data.token;
  return '';
}

async function loginForToken() {
  if (token) return null;
  if (!loginIdentifier && !loginPassword) return null;

  const started = Date.now();
  if (!loginIdentifier || !loginPassword) {
    return {
      name: 'auth login',
      path: '/auth/login',
      status: 'fail',
      detail: 'Both ESELLER_LOGIN_IDENTIFIER and ESELLER_LOGIN_PASSWORD are required.',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(credentialPayload(loginIdentifier, loginPassword)),
      signal: controller.signal,
    });
    const elapsed = Date.now() - started;
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {}

    const nextToken = extractToken(body);
    if (res.ok && nextToken) {
      token = nextToken;
      const role = body?.user?.role || body?.data?.user?.role || body?.data?.role;
      return {
        name: 'auth login',
        path: '/auth/login',
        status: 'ok',
        detail: `${res.status} ${elapsed}ms${role ? ` role=${role}` : ''}`,
      };
    }

    const err = body?.error?.code || body?.message || body?.error || text.slice(0, 90).replace(/\s+/g, ' ');
    return {
      name: 'auth login',
      path: '/auth/login',
      status: 'fail',
      detail: `${res.status} ${elapsed}ms ${err || 'token missing'}`,
    };
  } catch (err) {
    const message = err?.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : err?.message || String(err);
    return { name: 'auth login', path: '/auth/login', status: 'fail', detail: message };
  } finally {
    clearTimeout(timer);
  }
}

async function request(check) {
  if (check.auth && !token) {
    return { ...check, status: REQUIRE_AUTH ? 'fail' : 'skip', detail: authSkipDetail() };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();

  try {
    const res = await fetch(`${baseUrl}${check.path}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    });
    const elapsed = Date.now() - started;
    const code = res.status;
    const body = await res.text();
    let detail = `${code} ${elapsed}ms`;
    if (body) {
      try {
        const json = JSON.parse(body);
        const err = json?.error?.code || json?.code || json?.message || json?.error;
        if (err) detail += ` ${String(err).slice(0, 90)}`;
      } catch {
        detail += ` ${body.slice(0, 90).replace(/\s+/g, ' ')}`;
      }
    }

    if (check.ok.includes(code)) return { ...check, status: 'ok', detail };
    if ((check.warn || []).includes(code)) return { ...check, status: 'warn', detail };
    return { ...check, status: 'fail', detail };
  } catch (err) {
    const message = err?.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : err?.message || String(err);
    return { ...check, status: 'fail', detail: message };
  } finally {
    clearTimeout(timer);
  }
}

console.log(`API base: ${baseUrl}`);
console.log(`Auth token: ${token ? 'provided' : loginIdentifier ? 'will attempt login' : 'not set'}`);
console.log(`Auth required: ${REQUIRE_AUTH ? 'yes' : 'no'}`);

const authSetup = await loginForToken();
if (authSetup?.status === 'ok') console.log('Auth token: acquired via /auth/login');

const results = [
  ...(authSetup ? [authSetup] : []),
  ...(await Promise.all(checks.map(request))),
];
for (const result of results) {
  const label = statusLabel(result).padEnd(5);
  console.log(`${label} ${result.name.padEnd(22)} ${result.path.padEnd(36)} ${result.detail}`);
  if (result.status === 'warn' && result.note) console.log(`      note: ${result.note}`);
}

const failed = results.filter((result) => result.status === 'fail');
const warned = results.filter((result) => result.status === 'warn');
const skipped = results.filter((result) => result.status === 'skip');

console.log('');
console.log(`Summary: ${failed.length} failed, ${warned.length} warned, ${skipped.length} skipped, ${results.length} total.`);

if (failed.length > 0) {
  process.exitCode = 1;
}
