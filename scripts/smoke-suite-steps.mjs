export const p0Steps = [
  'smoke:meta',
  'smoke:config',
  'smoke:api-contract',
  'typecheck',
  'smoke:roles',
  'smoke:herder-cart',
  'smoke:herder-api',
  'smoke:herder-offline',
  'smoke:seller-dashboard',
  'smoke:device-build',
  'smoke:product-quality',
  'smoke:product-surfaces',
  'smoke:route-aliases',
  'smoke:route-links',
  'smoke:web',
  'smoke:hygiene',
];

export const liveApiSteps = [
  'smoke:api',
  'smoke:api:auth',
];

export const requiredPackageScripts = [
  ...p0Steps,
  'smoke:p0',
  ...liveApiSteps,
];
