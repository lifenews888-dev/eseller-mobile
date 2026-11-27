#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scanRoots = ['app', 'src'];
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const routeGroupPathPattern = /\/\((tabs|auth|customer|owner|seller|driver|herder|coordinator)\)(?=\/|[?#'"`)]|$)/g;
const staticRoutePatterns = [
  /\broute:\s*['"]([^'"`]+)['"]/g,
  /\bhref:\s*['"]([^'"`]+)['"]/g,
  /router\.(?:push|replace)\(\s*['"]([^'"`]+)['"]/g,
];
const dynamicPublicTemplatePatterns = [
  /router\.(?:push|replace)\(\s*`\/[^`]*\$\{([^}]+)\}/g,
  /https:\/\/eseller\.mn\/[^`]*\$\{([^}]+)\}/g,
];
const dynamicApiTemplatePatterns = [
  /\b(?:get|post|put|del|patch)\(\s*`\/[^`?]*\$\{([^}]+)\}/g,
  /\bfetch\(\s*apiUrl\(\s*`\/[^`?]*\$\{([^}]+)\}/g,
];

const legacyCompatibilityFiles = new Set([
  'src/shared/routeNormalization.ts',
]);

const allowedLegacyChecks = new Map([
  ['app/_layout.tsx', ["startsWith('/(auth)')", 'startsWith("/(auth)")']],
  ['src/services/api.ts', ["startsWith('/(auth)')", 'startsWith("/(auth)")']],
]);

const dynamicRouteGuards = [
  {
    file: 'src/components/LiveCarousel.tsx',
    requires: [
      '../shared/routeParams',
      'encodeRouteParam(id)',
      "router.push(`/live/${routeId}`",
      'disabled={!routeId}',
    ],
  },
  {
    file: 'src/components/LiveBadge.tsx',
    requires: [
      '../shared/routeParams',
      'encodeRouteParam(currentLiveId)',
      "router.push(`/live/${routeId}`",
    ],
  },
  {
    file: 'app/(customer)/live.tsx',
    requires: [
      '../../src/shared/routeParams',
      'encodeRouteParam(id)',
      "router.push(`/live/${routeId}`",
      'disabled={!routeId}',
    ],
  },
  {
    file: 'app/(tabs)/orders.tsx',
    requires: [
      '../../src/shared/routeParams',
      'encodeRouteParam(detailId)',
      "router.push(`/order/${routeId}`",
      'disabled={!routeId}',
    ],
  },
  {
    file: 'app/order/[id].tsx',
    requires: [
      '../../src/shared/routeParams',
      'safeDecodeRouteParam(orderParam)',
      'encodeRouteParam(orderId)',
      "queryKey: ['order', orderRouteParam]",
      "retry: false",
      'Захиалга ачаалж чадсангүй',
      'encodeRouteParam(orderKey)',
      "router.push(`/review/${orderRouteId}`",
      "router.push(`/receipt/${orderRouteId}`",
      'disabled={!orderRouteId}',
    ],
  },
  {
    file: 'app/track/[code].tsx',
    requires: [
      '../../src/shared/routeParams',
      'safeDecodeRouteParam(normalizeRouteParam(code))',
      'encodeRouteParam(trackingCode)',
      "queryKey: ['track', trackingRouteCode]",
      "retry: false",
      'Хүргэлт ачаалж чадсангүй',
      'encodeRouteParam(orderKey)',
      "router.push(`/order/${encodeRouteParam(orderKey)}`",
    ],
  },
  {
    file: 'app/track/search.tsx',
    requires: [
      '../../src/shared/routeParams',
      'encodeRouteParam(value)',
      "router.push(`/track/${encodeRouteParam(value)}`",
    ],
  },
  {
    file: 'app/chat/[id].tsx',
    requires: [
      '../../src/shared/routeParams',
      'safeDecodeRouteParam(normalizeRouteParam(id))',
      'encodeRouteParam(conversationId)',
      "queryKey: ['chat', conversationRouteId]",
      "retry: false",
      'Чат ачаалж чадсангүй',
      'disabled={!message.trim() || !conversationRouteId || sendMutation.isPending}',
    ],
  },
  {
    file: 'app/product/[id].tsx',
    requires: [
      '../../src/shared/routeParams',
      'safeDecodeRouteParam(productParam)',
      'encodeRouteParam(productId)',
      "queryKey: ['product', productRouteId]",
      'encodeRouteParam(conv.id)',
      "params: { id: chatRouteId }",
      'https://eseller.mn/product/${encodeRouteParam(productKey)}',
    ],
  },
  {
    file: 'app/(tabs)/chat.tsx',
    requires: [
      '../../src/shared/routeParams',
      'encodeRouteParam(id)',
      "router.push(`/chat/${routeId}`",
      'disabled={!routeId}',
    ],
  },
  {
    file: 'app/storefront/[slug].tsx',
    requires: [
      '../../src/shared/routeParams',
      'safeDecodeRouteParam(slugValue)',
      'matchesStoreRoute(store, slugValue, decodedSlug)',
      "queryKey: ['storefront-products', storeRouteSlug]",
      'https://eseller.mn/storefront/${storeRouteSlug}',
    ],
  },
  {
    file: 'app/(coordinator)/applications.tsx',
    requires: [
      '../../src/shared/routeParams',
      'encodeRouteParam(id)',
      "pathname: '/coordinator/application/[id]'",
      'params: { id: routeId }',
      'disabled={!routeId}',
    ],
  },
  {
    file: 'app/(coordinator)/dashboard.tsx',
    requires: [
      '../../src/shared/routeParams',
      'encodeRouteParam(id)',
      "pathname: '/coordinator/application/[id]'",
      'params: { id: routeId }',
      'disabled={!routeId}',
    ],
  },
  {
    file: 'app/(herder)/orders.tsx',
    requires: [
      '../../src/shared/routeParams',
      'encodeRouteParam(id)',
      "pathname: '/herder-admin/order/[id]'",
      'params: { id: routeId }',
      'disabled={!routeId}',
    ],
  },
  {
    file: 'app/(seller)/referral.tsx',
    requires: [
      '../../src/shared/routeParams',
      'encodeRouteParam(referralCode)',
      'https://eseller.mn/ref/${referralRouteCode}',
    ],
  },
  {
    file: 'src/utils/profile.ts',
    requires: [
      '../shared/routeParams',
      'encodeRouteParam(userId.slice(-8))',
      'https://eseller.mn/ref/${referralRouteCode}',
    ],
  },
  {
    file: 'app/feed/[id].tsx',
    requires: [
      '../../src/shared/routeParams',
      'normalizeRouteParam(id)',
      'encodeRouteParam(feedRouteParam)',
      "queryKey: ['feed-detail', feedRouteId]",
      'https://eseller.mn/feed/${itemRouteId}',
    ],
  },
  {
    file: 'app/(tabs)/social.tsx',
    requires: [
      '../../src/shared/routeParams',
      'function getProductRouteId(product: any): string',
      'encodeRouteParam(id)',
      'https://eseller.mn/product/${routeId}',
    ],
  },
  {
    file: 'app/(seller)/products.tsx',
    requires: [
      '../../src/shared/routeParams',
      'const routeId = encodeRouteParam(id)',
      'https://eseller.mn/product/${routeId}?ref=me',
    ],
  },
  {
    file: 'app/(seller)/catalog.tsx',
    requires: [
      '../../src/shared/routeParams',
      'const routeId = encodeRouteParam(id)',
      'https://eseller.mn/product/${routeId}',
    ],
  },
];

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
const guardFailures = [];
const staticRouteFailures = [];
const dynamicInterpolationFailures = [];
const dynamicApiInterpolationFailures = [];
const duplicateRouteParamHelpers = [];
const publicRoutes = collectPublicRoutes();

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

      if (
        relativePath !== 'src/shared/routeParams.ts' &&
        /\bfunction\s+(?:normalizeRouteParam|safeDecodeRouteParam)\b/.test(line)
      ) {
        duplicateRouteParamHelpers.push({
          file: relativePath,
          line: index + 1,
          text: line.trim(),
        });
      }

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

      for (const pattern of staticRoutePatterns) {
        pattern.lastIndex = 0;
        for (const match of line.matchAll(pattern)) {
          const route = normalizeStaticRoute(match[1]);
          if (!route || route.includes('[') || route.includes('${')) continue;
          if (!publicRoutes.has(route)) {
            staticRouteFailures.push({
              file: relativePath,
              line: index + 1,
              route,
              text: line.trim(),
            });
          }
        }
      }

      for (const pattern of dynamicPublicTemplatePatterns) {
        pattern.lastIndex = 0;
        for (const match of line.matchAll(pattern)) {
          const expression = match[1].trim();
          if (!isSafeDynamicRouteExpression(expression)) {
            dynamicInterpolationFailures.push({
              file: relativePath,
              line: index + 1,
              expression,
              text: line.trim(),
            });
          }
        }
      }

      for (const pattern of dynamicApiTemplatePatterns) {
        pattern.lastIndex = 0;
        for (const match of line.matchAll(pattern)) {
          const expression = match[1].trim();
          if (!isSafeDynamicPathExpression(expression)) {
            dynamicApiInterpolationFailures.push({
              file: relativePath,
              line: index + 1,
              expression,
              text: line.trim(),
            });
          }
        }
      }
    });
  }
}

for (const guard of dynamicRouteGuards) {
  const absoluteFile = path.join(root, guard.file);
  if (!fs.existsSync(absoluteFile)) {
    guardFailures.push({ file: guard.file, missing: ['file'] });
    continue;
  }

  const source = fs.readFileSync(absoluteFile, 'utf8');
  const missing = guard.requires.filter((token) => !source.includes(token));
  if (missing.length > 0) guardFailures.push({ file: guard.file, missing });
}

if (
  leaks.length > 0 ||
  guardFailures.length > 0 ||
  staticRouteFailures.length > 0 ||
  dynamicInterpolationFailures.length > 0 ||
  dynamicApiInterpolationFailures.length > 0 ||
  duplicateRouteParamHelpers.length > 0
) {
  console.log('FAIL public route links: invalid runtime route link(s) found.');

  if (leaks.length > 0) {
    console.log('');
    for (const leak of leaks) {
      console.log(`${leak.file}:${leak.line} ${leak.value}`);
      console.log(`  ${leak.text}`);
    }
  }

  if (guardFailures.length > 0) {
    console.log('');
    console.log('Dynamic route guard(s) missing:');
    for (const failure of guardFailures) {
      console.log(`${failure.file}: ${failure.missing.join(', ')}`);
    }
  }

  if (staticRouteFailures.length > 0) {
    console.log('');
    console.log('Static public route target(s) missing:');
    for (const failure of staticRouteFailures) {
      console.log(`${failure.file}:${failure.line} ${failure.route}`);
      console.log(`  ${failure.text}`);
    }
  }

  if (dynamicInterpolationFailures.length > 0) {
    console.log('');
    console.log('Dynamic public route interpolation(s) must use an encoded route variable or encodeURIComponent:');
    for (const failure of dynamicInterpolationFailures) {
      console.log(`${failure.file}:${failure.line} \${${failure.expression}}`);
      console.log(`  ${failure.text}`);
    }
  }

  if (dynamicApiInterpolationFailures.length > 0) {
    console.log('');
    console.log('Dynamic API path interpolation(s) must use an encoded path segment:');
    for (const failure of dynamicApiInterpolationFailures) {
      console.log(`${failure.file}:${failure.line} \${${failure.expression}}`);
      console.log(`  ${failure.text}`);
    }
  }

  if (duplicateRouteParamHelpers.length > 0) {
    console.log('');
    console.log('Route param helper(s) must be imported from src/shared/routeParams.ts:');
    for (const failure of duplicateRouteParamHelpers) {
      console.log(`${failure.file}:${failure.line}`);
      console.log(`  ${failure.text}`);
    }
  }
  console.log('');
  console.log('Use public aliases such as /store, /seller/dashboard, /owner/orders, /driver/deliveries, /herder-admin/orders, or /coordinator/dashboard.');
  process.exitCode = 1;
} else {
  console.log('OK public route links: route-group, dynamic, and static targets are valid.');
}

function collectPublicRoutes() {
  const routes = new Set();
  const appRoot = path.join(root, 'app');
  if (!fs.existsSync(appRoot)) return routes;

  for (const absoluteFile of walk(appRoot)) {
    if (path.extname(absoluteFile) !== '.tsx') continue;
    const relativePath = toPosix(path.relative(appRoot, absoluteFile));
    const route = routeFromAppFile(relativePath);
    if (route) routes.add(route);
  }

  return routes;
}

function routeFromAppFile(relativePath) {
  const withoutExt = relativePath.replace(/\.[^.]+$/, '');
  const segments = withoutExt
    .split('/')
    .filter((segment) => segment && !segment.startsWith('(') && segment !== '_layout');

  if (segments.length === 0) return '';
  if (segments.some((segment) => segment.includes('['))) return '';
  if (segments.at(-1) === 'index') segments.pop();

  return `/${segments.join('/')}`.replace(/\/+/g, '/') || '/';
}

function normalizeStaticRoute(value) {
  if (!value.startsWith('/')) return '';
  if (value.startsWith('//')) return '';
  if (value.includes('${')) return '';

  const withoutQuery = value.split(/[?#]/)[0];
  return withoutQuery.replace(/\/+$/, '') || '/';
}

function isSafeDynamicRouteExpression(expression) {
  return (
    expression.includes('encodeURIComponent') ||
    /\b\w*route\w*\b/i.test(expression)
  );
}

function isSafeDynamicPathExpression(expression) {
  return (
    expression.includes('encodeURIComponent') ||
    expression.includes('pathSegment') ||
    /\b\w*(route|segment|encoded)\w*\b/i.test(expression)
  );
}
