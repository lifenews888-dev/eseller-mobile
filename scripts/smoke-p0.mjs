#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { p0Steps } from './smoke-suite-steps.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';

for (const step of p0Steps) {
  console.log('');
  console.log(`==> npm run ${step}`);
  const command = process.platform === 'win32' ? `${npmBin} run ${step}` : npmBin;
  const args = process.platform === 'win32' ? [] : ['run', step];
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    console.error(`Failed to run npm script "${step}": ${result.error.message}`);
    process.exitCode = 1;
    break;
  }

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}

if (!process.exitCode) {
  console.log('');
  console.log('OK P0 smoke suite complete.');
}
