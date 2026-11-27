#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const requiredSnippets = [
  {
    file: 'src/shared/apiPath.ts',
    snippets: [
      'export function encodeApiPathSegment',
      'encodeURIComponent(String(value))',
    ],
  },
  {
    file: 'src/services/api.ts',
    snippets: [
      '../shared/apiPath',
      'const pathSegment = encodeApiPathSegment',
    ],
  },
  {
    file: 'src/features/herder/api.ts',
    snippets: [
      '../../shared/apiPath',
      'const pathSegment = encodeApiPathSegment',
    ],
  },
  {
    file: 'app/(customer)/addresses.tsx',
    snippets: [
      '../../src/shared/apiPath',
      'encodeApiPathSegment(editId)',
      'encodeApiPathSegment(id)',
    ],
  },
  {
    file: 'app/(driver)/deliveries.tsx',
    snippets: [
      '../../src/shared/apiPath',
      'encodeApiPathSegment(id)}/accept',
      'encodeApiPathSegment(id)}/deliver',
    ],
  },
  {
    file: 'src/components/GroupBuyCard.tsx',
    snippets: [
      '../shared/apiPath',
      'encodeApiPathSegment(group.id)',
    ],
  },
  {
    file: 'app/(owner)/orders.tsx',
    snippets: [
      '../../src/shared/apiPath',
      'encodeApiPathSegment(id)}/status',
    ],
  },
  {
    file: 'app/(owner)/products.tsx',
    snippets: [
      '../../src/shared/apiPath',
      'encodeApiPathSegment(id)',
    ],
  },
  {
    file: 'app/(customer)/wishlist.tsx',
    snippets: [
      '../../src/shared/apiPath',
      'encodeApiPathSegment(id)',
    ],
  },
  {
    file: 'app/(customer)/returns.tsx',
    snippets: [
      '../../src/shared/apiPath',
      'encodeApiPathSegment(selected)',
    ],
  },
  {
    file: 'app/(tabs)/store.tsx',
    snippets: [
      '../../src/shared/apiPath',
      'encodeApiPathSegment(id)',
    ],
  },
  {
    file: 'app/(tabs)/social.tsx',
    snippets: [
      '../../src/shared/apiPath',
      'encodeApiPathSegment(story.id)',
    ],
  },
];

const allowedRawEncodeFiles = new Set([
  'src/shared/apiPath.ts',
  'src/shared/routeParams.ts',
]);

const failures = [];

for (const check of requiredSnippets) {
  const source = read(check.file);
  const missing = check.snippets.filter((snippet) => !source.includes(snippet));
  if (missing.length > 0) failures.push(`${check.file}: missing ${missing.join(', ')}`);
}

for (const file of walk(path.join(root, 'app')).concat(walk(path.join(root, 'src')))) {
  const relativePath = toPosix(path.relative(root, file));
  if (!/\.(ts|tsx)$/.test(relativePath)) continue;

  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes('encodeURIComponent(String(')) continue;
  if (allowedRawEncodeFiles.has(relativePath)) continue;

  failures.push(`${relativePath}: use encodeApiPathSegment for API paths or encodeRouteParam for public routes`);
}

if (failures.length > 0) {
  console.log('API path segment guard failed:');
  for (const failure of failures) console.log(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('OK API path segments use shared helpers.');
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolutePath));
    else files.push(absolutePath);
  }

  return files;
}
