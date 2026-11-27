#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const generatedPatterns = [
  { label: 'Codex logs', test: (path) => path.startsWith('.codex-logs/') },
  { label: 'Expo web export', test: (path) => path.startsWith('dist/') || path.startsWith('dist-web/') },
  { label: 'Expo Android export', test: (path) => path.startsWith('dist-android/') },
  { label: 'Expo log', test: (path) => /^expo-.*\.log$/i.test(path) || /\/expo-.*\.(err|log|out)$/i.test(path) },
  { label: 'Hermes bundle', test: (path) => path.endsWith('.hbc') },
];

const requiredGitignoreEntries = [
  '.codex-logs/',
  'dist/',
  'dist-web/',
  'dist-android/',
  'expo-*.log',
  '*.hbc',
];

function normalizePath(path) {
  return path.replaceAll('\\', '/');
}

function parsePorcelainZ(output) {
  const records = output.split('\0').filter(Boolean);
  const entries = [];

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const xy = record.slice(0, 2);
    const path = normalizePath(record.slice(3));

    if (xy[0] === 'R' || xy[0] === 'C') {
      const previousPath = normalizePath(records[index + 1] || '');
      entries.push({ xy, path, previousPath });
      index += 1;
      continue;
    }

    entries.push({ xy, path });
  }

  return entries;
}

function matchGenerated(path) {
  return generatedPatterns.find((pattern) => pattern.test(path)) || null;
}

function summarizeByLabel(items) {
  const labels = new Map();
  for (const item of items) {
    labels.set(item.label, (labels.get(item.label) || 0) + 1);
  }

  return [...labels.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, count]) => `${label}: ${count}`)
    .join(', ');
}

function printItems(title, items) {
  if (items.length === 0) {
    return;
  }

  console.log(title);
  for (const item of items.slice(0, 40)) {
    const previous = item.previousPath ? ` <- ${item.previousPath}` : '';
    console.log(`  ${item.xy} ${item.path}${previous}`);
  }

  if (items.length > 40) {
    console.log(`  ... ${items.length - 40} more`);
  }
}

function readGitignoreEntries() {
  if (!fs.existsSync('.gitignore')) {
    return null;
  }

  return fs.readFileSync('.gitignore', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

const gitignoreEntries = readGitignoreEntries();
if (!gitignoreEntries) {
  console.log('FAIL worktree hygiene: .gitignore is missing.');
  process.exit(1);
}

const missingGitignoreEntries = requiredGitignoreEntries.filter((entry) => !gitignoreEntries.includes(entry));
if (missingGitignoreEntries.length > 0) {
  console.log('FAIL worktree hygiene: .gitignore is missing generated-artifact entries.');
  for (const entry of missingGitignoreEntries) {
    console.log(`  ${entry}`);
  }
  process.exit(1);
}

const status = spawnSync('git', ['status', '--porcelain=v1', '-z'], {
  encoding: 'utf8',
});

if (status.status !== 0) {
  console.error(status.stderr || 'git status failed.');
  process.exit(2);
}

const generatedEntries = parsePorcelainZ(status.stdout)
  .map((entry) => {
    const match = matchGenerated(entry.path);
    return match ? { ...entry, label: match.label } : null;
  })
  .filter(Boolean);

const stagedGenerated = generatedEntries.filter((entry) => entry.xy[0] !== '?' && entry.xy[0] !== ' ');
const unstagedGenerated = generatedEntries.filter((entry) => entry.xy[1] !== ' ' || entry.xy[0] === '?');

if (generatedEntries.length === 0) {
  console.log('OK worktree hygiene: .gitignore covers generated artifacts and none are detected in git status.');
  process.exit(0);
}

console.log(`Generated artifacts detected: ${generatedEntries.length}`);
console.log(`By type: ${summarizeByLabel(generatedEntries)}`);
console.log('');

printItems('Staged/tracked generated artifacts:', stagedGenerated);
printItems('Unstaged/untracked generated artifacts:', unstagedGenerated);

if (stagedGenerated.length > 0) {
  console.log('');
  console.log('FAIL worktree hygiene: generated artifacts are staged or tracked.');
  console.log('Review and untrack/remove them intentionally before opening a PR.');
  process.exit(1);
}

console.log('');
console.log('WARN worktree hygiene: generated artifacts are present but not staged.');
