#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
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

const appJson = JSON.parse(read('app.json'));
const expo = appJson.expo || {};
const eas = JSON.parse(read('eas.json'));
const checklist = read('docs/MOBILE_DEVICE_BUILD_CHECKLIST.md');
const packageJson = JSON.parse(read('package.json'));
const releasePreflight = read('scripts/release-preflight.mjs');

expect(expo.name === 'Eseller.mn', 'app name is Eseller.mn', expo.name);
expect(expo.slug === 'eseller-mn', 'app slug is stable', expo.slug);
expect(expo.version === packageJson.version, 'Expo version matches package version', `${expo.version} vs ${packageJson.version}`);
expect(expo.owner === 'eseller.mn', 'Expo owner is configured', expo.owner);
expect(expo.scheme === 'eseller', 'deep-link scheme is configured', expo.scheme);
expect(expo.orientation === 'portrait', 'app locks portrait orientation', expo.orientation);
expect(expo.runtimeVersion?.policy === 'appVersion', 'runtime version follows appVersion');
expect(expo.updates?.enabled === true, 'OTA updates are enabled');
expect(
  expo.updates?.url === 'https://u.expo.dev/7dbfaf45-621d-4c06-b64d-383a47504030',
  'OTA update URL matches EAS project',
  expo.updates?.url,
);
expect(
  expo.extra?.eas?.projectId === '7dbfaf45-621d-4c06-b64d-383a47504030',
  'EAS projectId is configured',
  expo.extra?.eas?.projectId,
);

expect(expo.android?.package === 'mn.eseller.app', 'Android package id is stable', expo.android?.package);
expect(Number.isInteger(expo.android?.versionCode) && expo.android.versionCode > 0, 'Android versionCode is positive');
expect(expo.android?.adaptiveIcon?.foregroundImage === './assets/adaptive-icon.png', 'Android adaptive icon path configured');

expect(expo.ios?.bundleIdentifier === 'mn.eseller.app', 'iOS bundle id is stable', expo.ios?.bundleIdentifier);
expect(expo.ios?.supportsTablet === false, 'iOS tablet support is disabled');
expect(expo.ios?.infoPlist?.ITSAppUsesNonExemptEncryption === false, 'iOS encryption declaration is set');

for (const assetPath of [
  'assets/icon.png',
  'assets/splash-icon.png',
  'assets/adaptive-icon.png',
  'assets/favicon.png',
]) {
  expect(exists(assetPath), `device build asset exists: ${assetPath}`);
}

expect(eas.build?.preview?.distribution === 'internal', 'EAS preview uses internal distribution');
expect(
  eas.build?.preview?.env?.EXPO_PUBLIC_API_BASE_URL === 'https://eseller.mn/api',
  'EAS preview targets production API',
  eas.build?.preview?.env?.EXPO_PUBLIC_API_BASE_URL,
);
expect(eas.build?.preview?.env?.SENTRY_DISABLE_AUTO_UPLOAD === 'true', 'EAS preview disables Sentry upload');
expect(eas.build?.development?.distribution === 'internal', 'EAS development uses internal distribution');
expect(eas.build?.production?.env?.EXPO_PUBLIC_API_BASE_URL === 'https://eseller.mn/api', 'EAS production targets production API');
expect(
  packageJson.scripts?.['doctor:device-build'] === 'node scripts/doctor-device-build.mjs',
  'package exposes device build doctor',
);
expect(exists('scripts/doctor-device-build.mjs'), 'device build doctor script exists');
expect(
  packageJson.scripts?.['release:preflight'] === 'node scripts/release-preflight.mjs',
  'package exposes release preflight',
);
expect(exists('scripts/release-preflight.mjs'), 'release preflight script exists');
expect(releasePreflight.includes("script: 'smoke:p0'"), 'release preflight runs offline P0 suite');
expect(releasePreflight.includes("script: 'doctor:device-build'"), 'release preflight runs device doctor');
expect(!releasePreflight.includes('smoke:api'), 'release preflight excludes live API smoke');
expect(!releasePreflight.includes('eas-cli build'), 'release preflight does not trigger EAS build');

for (const phrase of [
  'npm run smoke:p0',
  'npm run release:preflight',
  'This command does not upload to',
  'EAS or run live API smoke',
  'Before release or tester builds, bump `expo.version`',
  'Keep `package.json` version aligned with',
  'npm run doctor:device-build',
  'Doctor warnings are informational',
  'npm run smoke:api:auth',
  'npx eas-cli build --profile preview --platform android',
  'npx.cmd eas-cli build --profile preview --platform android',
  "EAS Build uploads this project to Expo's build service",
  'iOS device install requires Apple Developer provisioning or TestFlight',
  'Local Android builds require Java, Android SDK, ADB, and Gradle',
]) {
  expect(checklist.includes(phrase), `device build checklist documents: ${phrase}`);
}

console.log('');
console.log(`Summary: ${failures} failed.`);

if (failures > 0) {
  process.exitCode = 1;
}
