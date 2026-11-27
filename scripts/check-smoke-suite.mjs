#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { liveApiSteps, p0Steps, requiredPackageScripts } from './smoke-suite-steps.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function pass(name) {
  console.log(`OK   ${name}`);
}

function fail(name, details) {
  console.log(`FAIL ${name}`);
  if (details) console.log(`     ${details}`);
  failures += 1;
}

function expect(condition, name, details) {
  if (condition) pass(name);
  else fail(name, details);
}

let failures = 0;

const packageJson = JSON.parse(read('package.json'));
const packageScripts = packageJson.scripts || {};
for (const scriptName of requiredPackageScripts) {
  expect(
    Object.prototype.hasOwnProperty.call(packageScripts, scriptName),
    `package script ${scriptName}`,
  );
}

const smokeP0Source = read('scripts/smoke-p0.mjs');
expect(
  smokeP0Source.includes("import { p0Steps } from './smoke-suite-steps.mjs';"),
  'smoke:p0 imports shared step list',
);
expect(
  smokeP0Source.includes('for (const step of p0Steps)'),
  'smoke:p0 iterates shared step list',
);
expect(
  p0Steps.every((scriptName) => Object.prototype.hasOwnProperty.call(packageScripts, scriptName)),
  'smoke:p0 steps exist in package.json',
);
for (const scriptName of liveApiSteps) {
  expect(!p0Steps.includes(scriptName), `smoke:p0 excludes live API script ${scriptName}`);
}

const workflow = read('.github/workflows/p0-smoke.yml');
expect(workflow.includes('node-version: 22'), 'CI uses Node 22 (needed for --experimental-strip-types)');
expect(workflow.includes('run: npm ci'), 'CI installs with npm ci');
expect(workflow.includes('run: npm run smoke:p0'), 'CI runs smoke:p0');

const checklist = read('docs/MOBILE_P0_SMOKE_CHECKLIST.md');
expect(checklist.includes('npm run smoke:p0'), 'checklist documents smoke:p0');
expect(checklist.includes('npm.cmd run smoke:p0'), 'checklist documents PowerShell smoke:p0');
expect(checklist.includes('The P0 suite is offline-only'), 'checklist documents offline-only P0 suite');
for (const scriptName of liveApiSteps) {
  expect(checklist.includes(`does not run \`${scriptName}\``), `checklist documents ${scriptName} stays outside P0`);
}
for (const scriptName of p0Steps) {
  expect(
    checklist.includes(`npm run ${scriptName}`) || scriptName === 'typecheck',
    `checklist documents ${scriptName}`,
  );
}

console.log('');
console.log(`Summary: ${failures} failed.`);

if (failures > 0) {
  process.exitCode = 1;
}
