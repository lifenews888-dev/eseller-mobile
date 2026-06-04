#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const steps = [
  {
    script: 'smoke:p0',
    required: true,
    note: 'Offline CI-equivalent checks. Fails on regressions.',
  },
  {
    script: 'doctor:device-build',
    required: false,
    note: 'Local machine build-tool diagnosis. Warnings are informational.',
  },
];

for (const step of steps) {
  console.log('');
  console.log(`==> npm run ${step.script}`);
  console.log(`    ${step.note}`);

  const command = process.platform === 'win32' ? `${npmBin} run ${step.script}` : npmBin;
  const args = process.platform === 'win32' ? [] : ['run', step.script];
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    console.error(`Failed to run npm script "${step.script}": ${result.error.message}`);
    if (step.required) process.exitCode = 1;
    break;
  }

  if (result.status !== 0 && step.required) {
    process.exitCode = result.status ?? 1;
    break;
  }
}

if (!process.exitCode) {
  console.log('');
  console.log('OK release preflight complete.');
}
