#!/usr/bin/env node

process.env.ESELLER_SMOKE_REQUIRE_AUTH = '1';

await import('./smoke-mobile-api.mjs');
