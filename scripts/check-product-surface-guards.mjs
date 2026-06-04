#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const surfaces = [
  {
    file: 'src/shared/productQuality.ts',
    requires: [
      'getPublicProductQualityIssue',
      'filterPublicProducts',
      'getInvalidCartItems',
    ],
  },
  {
    file: 'app/(tabs)/index.tsx',
    requires: ['filterPublicProducts', 'firstProductImage', 'getPublicProductPrice'],
  },
  {
    file: 'app/(tabs)/store.tsx',
    requires: ['filterPublicProducts', 'firstProductImage', 'getPublicProductPrice'],
  },
  {
    file: 'app/(tabs)/search.tsx',
    requires: ['filterPublicProducts', 'firstProductImage', 'getPublicProductPrice'],
  },
  {
    file: 'app/(tabs)/feed.tsx',
    requires: ['filterPublicProducts', 'firstProductImage', 'getPublicProductPrice'],
  },
  {
    file: 'app/feed/[id].tsx',
    requires: ['getPublicProductQualityIssue', 'getPublicProductPrice'],
  },
  {
    file: 'app/(tabs)/social.tsx',
    requires: ['getPublicProductQualityIssue', 'firstProductImage', 'getPublicProductPrice'],
  },
  {
    file: 'app/product/[id].tsx',
    requires: ['getPublicProductQualityIssue', 'filterPublicProducts'],
  },
  {
    file: 'app/storefront/[slug].tsx',
    requires: ['filterPublicProducts', 'firstProductImage', 'getPublicProductPrice'],
  },
  {
    file: 'app/(customer)/flash-sale.tsx',
    requires: ['filterPublicProducts', 'firstProductImage', 'getPublicProductPrice'],
  },
  {
    file: 'src/components/home/FlashSaleRow.tsx',
    requires: ['filterPublicProducts'],
  },
  {
    file: 'src/components/QuickBuyBottomSheet.tsx',
    requires: ['getPublicProductQualityIssue', 'firstProductImage', 'getPublicProductPrice'],
  },
  {
    file: 'src/components/GroupBuyCard.tsx',
    requires: ['getPublicProductQualityIssue', 'firstProductImage', 'getPublicProductPrice'],
  },
  {
    file: 'app/(customer)/live/[id].tsx',
    requires: ['getPublicProductQualityIssue', 'firstProductImage'],
  },
  {
    file: 'app/(customer)/wishlist.tsx',
    requires: ['getPublicProductQualityIssue', 'firstProductImage', 'getPublicProductPrice'],
  },
  {
    file: 'app/cart.tsx',
    requires: ['getCartItemQualityIssue', 'getInvalidCartItems'],
  },
  {
    file: 'app/checkout.tsx',
    requires: ['getCartItemQualityIssue', 'getInvalidCartItems'],
  },
  {
    file: 'src/components/home/HerderRow.tsx',
    requires: ['filterPublicProducts', 'firstProductImage', 'getPublicProductPrice'],
  },
  {
    file: 'app/(customer)/herder.tsx',
    requires: ['filterPublicProducts', 'getPublicProductQualityIssue'],
  },
  {
    file: 'app/(customer)/herder-product/[id].tsx',
    requires: ['getPublicProductQualityIssue'],
  },
  {
    file: 'app/(customer)/dropship.tsx',
    requires: ['MIN_PUBLIC_PRODUCT_PRICE_MNT', 'isPlaceholderProductName', 'dropshipQualityIssue'],
  },
];

const results = [];

for (const surface of surfaces) {
  const absolute = path.join(root, surface.file);
  if (!fs.existsSync(absolute)) {
    results.push({ file: surface.file, pass: false, missing: ['file'] });
    continue;
  }

  const source = fs.readFileSync(absolute, 'utf8');
  const missing = surface.requires.filter((token) => !source.includes(token));
  results.push({ file: surface.file, pass: missing.length === 0, missing });
}

for (const result of results) {
  const label = result.pass ? 'OK  ' : 'FAIL';
  console.log(`${label} ${result.file}`);
  if (!result.pass) {
    console.log(`     missing: ${result.missing.join(', ')}`);
  }
}

const failed = results.filter((result) => !result.pass);

console.log('');
console.log(`Summary: ${failed.length} failed, ${results.length} total.`);

if (failed.length > 0) {
  process.exitCode = 1;
}
