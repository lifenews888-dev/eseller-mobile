#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const checks = [
  {
    name: 'Node.js',
    command: process.execPath,
    args: [],
    requiredFor: 'Expo tooling',
    detail: process.version,
  },
  {
    name: 'npx',
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['--version'],
    requiredFor: 'EAS and Expo CLI commands',
  },
  {
    name: 'Global EAS CLI',
    command: process.platform === 'win32' ? 'eas.cmd' : 'eas',
    args: ['--version'],
    requiredFor: 'remote EAS internal builds without npx',
  },
  {
    name: 'Java',
    command: 'java',
    args: ['-version'],
    requiredFor: 'local Android builds',
  },
  {
    name: 'Android Debug Bridge',
    command: 'adb',
    args: ['version'],
    requiredFor: 'installing local APKs on Android devices',
  },
  {
    name: 'Gradle',
    command: process.platform === 'win32' ? 'gradle.bat' : 'gradle',
    args: ['--version'],
    requiredFor: 'local Android builds outside the Gradle wrapper',
  },
];

function run(check) {
  if (check.detail) {
    console.log(`OK   ${check.name} - ${check.detail}`);
    return true;
  }

  const command = process.platform === 'win32' ? 'where.exe' : 'command';
  const args = process.platform === 'win32'
    ? [check.command]
    : ['-v', check.command];
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
    timeout: 10000,
  });
  const output = [result.stdout, result.stderr]
    .filter(Boolean)
    .join('\n')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (result.status === 0) {
    const detail = output[0] ? ` - ${output[0]}` : '';
    console.log(`OK   ${check.name}${detail}`);
    return true;
  }

  const message = result.error?.code === 'ETIMEDOUT'
    ? 'timed out after 10s'
    : result.error?.message || output[0] || 'not available on PATH';
  console.log(`WARN ${check.name} - ${message}`);
  console.log(`     Needed for ${check.requiredFor}.`);
  return false;
}

const passed = checks.map(run).filter(Boolean).length;
const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '';
if (sdkRoot) {
  console.log(`OK   Android SDK env - ${sdkRoot}`);
} else {
  console.log('WARN Android SDK env - ANDROID_HOME or ANDROID_SDK_ROOT is not set');
  console.log('     Needed for local Android builds.');
}

const total = checks.length + 1;
const warned = total - passed - (sdkRoot ? 1 : 0);

console.log('');
console.log(`Summary: ${total - warned} OK, ${warned} warning${warned === 1 ? '' : 's'}.`);
console.log('This doctor is informational and does not fail CI.');
