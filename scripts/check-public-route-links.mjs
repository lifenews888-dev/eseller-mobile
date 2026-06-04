#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scanRoots = ['app', 'src'];
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const routeGroupPathPattern = /\/\((tabs|auth|customer|owner|seller|driver|herder|coordinator)\)(?=\/|[?#'"`)]|$)/g;

const legacyCompatibilityFiles = new Set([
  'src/shared/routeNormalization.ts',
]);

const allowedLegacyChecks = new Map([
  ['app/_layout.tsx', ["startsWith('/(auth)')", 'startsWith("/(auth)")']],
  ['src/services/api.ts', ["startsWith('/(auth)')", 'startsWith("/(auth)")']],
]);

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(absolute));
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(absolute);
    }
  }

  return files;
}

function isCommentLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('*');
}

function isAllowedLegacyCheck(relativePath, line) {
  const allowedTokens = allowedLegacyChecks.get(relativePath);
  return !!allowedTokens?.some((token) => line.includes(token));
}

const leaks = [];

for (const scanRoot of scanRoots) {
  const absoluteRoot = path.join(root, scanRoot);
  if (!fs.existsSync(absoluteRoot)) continue;

  for (const absoluteFile of walk(absoluteRoot)) {
    const relativePath = toPosix(path.relative(root, absoluteFile));
    if (legacyCompatibilityFiles.has(relativePath)) continue;

    const source = fs.readFileSync(absoluteFile, 'utf8');
    const lines = source.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (isCommentLine(line) || isAllowedLegacyCheck(relativePath, line)) return;

      routeGroupPathPattern.lastIndex = 0;
      for (const match of line.matchAll(routeGroupPathPattern)) {
        // Relative module imports such as ../(owner)/orders are route files,
        // not public URLs.
        if (line[match.index - 1] === '.') continue;

        leaks.push({
          file: relativePath,
          line: index + 1,
          value: match[0],
          text: line.trim(),
        });
      }
    });
  }
}

if (leaks.length > 0) {
  console.log('FAIL public route links: Expo route-group URL(s) found in runtime source.');
  console.log('');
  for (const leak of leaks) {
    console.log(`${leak.file}:${leak.line} ${leak.value}`);
    console.log(`  ${leak.text}`);
  }
  console.log('');
  console.log('Use public aliases such as /store, /seller/dashboard, /owner/orders, /driver/deliveries, /herder-admin/orders, or /coordinator/dashboard.');
  process.exitCode = 1;
} else {
  console.log('OK public route links: no runtime Expo route-group URLs found.');
}
