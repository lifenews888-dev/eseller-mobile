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
    file: 'src/shared/routeParams.ts',
    requires: [
      'normalizeRouteParam',
      'safeDecodeRouteParam',
      'encodeRouteParam',
      'Array.isArray(value)',
      'decodeURIComponent(value)',
      'encodeURIComponent(String(value))',
      'catch',
    ],
  },
  {
    file: 'app/(tabs)/index.tsx',
    requires: [
      'filterPublicProducts',
      'firstProductImage',
      'getProductName',
      'getPublicProductPrice',
      'getShopName',
      '../../src/shared/shopIdentity',
      '../../src/shared/routeParams',
      'encodeRouteParam(slug)',
      'encodeRouteParam(id)',
      "router.push(`/storefront/${routeSlug}`",
      "router.push(`/product/${routeId}`",
      "router.push(`/feed/${routeId}`",
      "getProductName(item) || 'Бараа'",
      "getProductName(p) || 'Зар'",
      'disabled={!routeId}',
    ],
  },
  {
    file: 'src/shared/shopIdentity.ts',
    requires: [
      'getShopName',
      'source.storeName',
      'source.businessName',
      'source.displayName',
      "'Дэлгүүр'",
    ],
  },
  {
    file: 'app/(tabs)/store.tsx',
    requires: [
      'filterPublicProducts',
      'firstProductImage',
      'getProductName',
      'getPublicProductPrice',
      'isError',
      "retry: false",
      'appliedSearch',
      "queryKey: ['store-products', appliedSearch",
      'hasPendingSearch',
      'submitSearch',
      'onSubmitEditing={submitSearch}',
      'arrow-forward-circle',
      'disabled={!id}',
      '../../src/shared/routeParams',
      'encodeRouteParam(id)',
      'disabled={!routeId}',
      "getProductName(item) || 'Бараа'",
      'Дэлгүүр ачаалж чадсангүй',
    ],
  },
  {
    file: 'app/(tabs)/search.tsx',
    requires: [
      'filterPublicProducts',
      'firstProductImage',
      'getProductName',
      'getPublicProductPrice',
      'isError',
      "retry: false",
      'refetchSearch',
      'Хайлт ачаалж чадсангүй',
      'visibleTotal',
      'hasScopedResultsElsewhere',
      'showAllResults',
      'Бүгдээс хайх',
      '../../src/shared/routeParams',
      'encodeRouteParam(id)',
      'encodeRouteParam(slug)',
      "router.push(`/storefront/${routeSlug}`",
      "getProductName(item) || 'Бараа'",
      "getProductName(item) || 'Зар'",
      'getShopName',
      '../../src/shared/shopIdentity',
      'row.item.storefrontSlug',
    ],
  },
  {
    file: 'app/(tabs)/feed.tsx',
    requires: [
      'filterPublicProducts',
      'firstProductImage',
      'getProductName',
      'getPublicProductPrice',
      'isError',
      "retry: false",
      'appliedSearch',
      "queryKey: ['feed', category, appliedSearch",
      'hasPendingSearch',
      'submitSearch',
      'clearFeedFilters',
      'onSubmitEditing={submitSearch}',
      'arrow-forward-circle',
      "hasActiveFeedQuery ? 'Шүүлтүүр цэвэрлэх'",
      '../../src/shared/routeParams',
      'disabled={!itemRouteId}',
      'encodeRouteParam(itemId)',
      "getProductName(item) || 'Зар'",
      'Зарууд ачаалж чадсангүй',
    ],
  },
  {
    file: 'app/feed/[id].tsx',
    requires: [
      'getPublicProductQualityIssue',
      'getPublicProductPrice',
      'getProductName',
      'getShopName',
      '../../src/shared/shopIdentity',
      '../../src/shared/routeParams',
      'loadFeedDetail',
      'normalizeFeedDetail',
      'extractFeedItems',
      "retry: false",
      'normalizeRouteParam(id)',
      'encodeRouteParam(feedRouteParam)',
      "queryKey: ['feed-detail', feedRouteId]",
      'encodeRouteParam(itemId)',
      'encodeRouteParam(id)',
      'encodeRouteParam(candidateId)',
      "getProductName(item) || 'Зар'",
      "returnTo: `/feed/${itemRouteId}`",
      'Зар ачаалж чадсангүй',
    ],
  },
  {
    file: 'app/(tabs)/shops.tsx',
    requires: [
      '/storefront/${routeSlug}',
      'isError',
      "retry: false",
      'appliedSearch',
      "queryKey: ['shops', appliedSearch",
      'hasPendingSearch',
      'clearShopsFilters',
      'arrow-forward-circle',
      'hasActiveShopsQuery',
      'hasNextPage && !isFetchingNextPage && !isLoading && !isError',
      'onPress={clearShopsFilters}',
      '../../src/shared/routeParams',
      'encodeRouteParam(slug)',
      'getShopName',
      '../../src/shared/shopIdentity',
      'item.storefrontSlug',
      'Дэлгүүрүүд ачаалж чадсангүй',
    ],
  },
  {
    file: 'app/(tabs)/social.tsx',
    requires: [
      'getPublicProductQualityIssue',
      'firstProductImage',
      'getProductName',
      'getPublicProductPrice',
      'getProductRouteId',
      '../../src/shared/routeParams',
      'encodeRouteParam(id)',
      "getProductName(product) || 'Бараа'",
      "disabled={!routeId}",
      "router.push(`/product/${routeId}`",
    ],
  },
  {
    file: 'app/product/[id].tsx',
    requires: [
      'getPublicProductQualityIssue',
      'filterPublicProducts',
      'getProductName',
      'getPublicProductPrice',
      'getShopName',
      '../../src/shared/shopIdentity',
      '../../src/shared/routeParams',
      "retry: false",
      'isError',
      'Бараа ачаалж чадсангүй',
      'safeDecodeRouteParam(productParam)',
      'encodeRouteParam(productId)',
      "queryKey: ['product', productRouteId]",
      'encodeRouteParam(productKey)',
      'encodeRouteParam(slug)',
      'encodeRouteParam(id)',
      'encodeRouteParam(conv.id)',
      "getProductName(product) || 'Бараа'",
      "disabled={!routeId || id === currentId}",
      "router.push(`/storefront/${routeSlug}`",
    ],
  },
  {
    file: 'app/storefront/[slug].tsx',
    requires: [
      'filterPublicProducts',
      'firstProductImage',
      'getProductName',
      'getPublicProductPrice',
      'getShopName',
      '../../src/shared/shopIdentity',
      '../../src/shared/routeParams',
      'safeDecodeRouteParam(slugValue)',
      "queryKey: ['storefront-products', storeRouteSlug]",
      'Дэлгүүр ачаалж чадсангүй',
      'encodeRouteParam(value)',
      'encodeRouteParam(entitySlug || slugValue)',
      'encodeRouteParam(id)',
      "getProductName(item) || 'Бараа'",
      'disabled={!id}',
    ],
  },
  {
    file: 'app/(customer)/flash-sale.tsx',
    requires: [
      'filterPublicProducts',
      'firstProductImage',
      'getProductName',
      'getPublicProductPrice',
      '../../src/shared/routeParams',
      'encodeRouteParam(id)',
      "getProductName(product) || 'Хямдралтай бараа'",
      'disabled={!routeId}',
      "router.push(`/product/${routeId}`",
    ],
  },
  {
    file: 'src/components/home/StoriesRow.tsx',
    requires: [
      '../../shared/routeParams',
      'encodeRouteParam(id)',
      'disabled={!routeId}',
      "router.push(`/feed/${routeId}`",
    ],
  },
  {
    file: 'src/components/home/FlashSaleRow.tsx',
    requires: [
      'filterPublicProducts',
      'getProductName',
      '../../shared/routeParams',
      'encodeRouteParam(id)',
      "getProductName(item) || 'Бараа'",
      'disabled={!routeId}',
      "router.push(`/product/${routeId}`",
    ],
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
    requires: [
      'getPublicProductQualityIssue',
      'firstProductImage',
      'getPublicProductPrice',
      '../../src/shared/routeParams',
      'encodeRouteParam(id)',
      'disabled={!routeId}',
      "router.push(`/product/${routeId}`",
    ],
  },
  {
    file: 'app/(seller)/products.tsx',
    requires: [
      'getProductName',
      '../../src/shared/routeParams',
      'encodeRouteParam(id)',
      "getProductName(product) || 'Бараа'",
      "router.push(`/product/${routeId}`",
      'disabled={!routeId}',
    ],
  },
  {
    file: 'app/(owner)/products.tsx',
    requires: [
      '../../src/shared/routeParams',
      'normalizeRouteParam(params.q)',
      'encodeRouteParam(id)',
      "router.push(`/product/${routeId}`",
      'disabled={!canView}',
    ],
  },
  {
    file: 'app/(seller)/catalog.tsx',
    requires: [
      'getProductName',
      '../../src/shared/routeParams',
      'normalizeRouteParam(params.q)',
      'encodeRouteParam(id)',
      "getProductName(product) || 'Бараа'",
      'https://eseller.mn/product/${routeId}',
    ],
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
    requires: [
      'filterPublicProducts',
      'firstProductImage',
      'getProductName',
      'getPublicProductPrice',
      '../../shared/routeParams',
      'encodeRouteParam(id)',
      "router.push(`/herder-product/${routeId}`",
      'disabled={!routeId}',
    ],
  },
  {
    file: 'app/(customer)/herder.tsx',
    requires: [
      'filterPublicProducts',
      'getProductName',
      'getPublicProductQualityIssue',
      '../../src/shared/routeParams',
      'encodeRouteParam(id)',
      "router.push(`/herder-product/${routeId}`",
      'disabled={!routeId}',
    ],
  },
  {
    file: 'app/(customer)/herder-product/[id].tsx',
    requires: [
      'getPublicProductQualityIssue',
      '../../../src/shared/routeParams',
      'encodeRouteParam(p.herder?.id)',
      "router.push(`/herder-profile/${herderRouteId}`",
      'disabled={!herderRouteId}',
    ],
  },
  {
    file: 'app/(customer)/herder-profile/[id].tsx',
    requires: [
      '../../../src/shared/routeParams',
      'encodeRouteParam(id)',
      "router.push(`/herder-product/${routeId}`",
      'disabled={!routeId}',
    ],
  },
  {
    file: 'app/(coordinator)/herders.tsx',
    requires: [
      '../../src/shared/routeParams',
      'encodeRouteParam(id)',
      "router.push(`/herder-profile/${routeId}`",
      'disabled={!routeId}',
    ],
  },
  {
    file: 'app/(customer)/dropship.tsx',
    requires: [
      'MIN_PUBLIC_PRODUCT_PRICE_MNT',
      'isPlaceholderProductName',
      'dropshipQualityIssue',
      '../../src/shared/routeParams',
      'normalizeRouteParam(params.q)',
    ],
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
