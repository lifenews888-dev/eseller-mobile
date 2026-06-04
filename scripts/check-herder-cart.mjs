#!/usr/bin/env node

import { buildHerderCartItem, getHerderUnitPrice } from '../src/features/herder/cart.ts';

const checks = [];

function check(name, actual, expected) {
  const pass = Object.is(actual, expected);
  checks.push({ name, pass, actual, expected });
}

function sample(overrides = {}) {
  return {
    id: 'herder-product-1',
    name: 'Organic dairy',
    price: 12500,
    salePrice: null,
    images: ['https://example.com/product.jpg'],
    category: 'dairy',
    herder: {
      herderName: 'Test Herder',
      province: 'TOV',
      provinceName: 'Tuv',
      district: 'Zuunmod',
      isVerified: true,
    },
    ...overrides,
  };
}

check('uses sale price when positive', getHerderUnitPrice(sample({ salePrice: 9900 })), 9900);
check('falls back to price when sale price is zero', getHerderUnitPrice(sample({ salePrice: 0 })), 12500);
check('rounds MNT to an integer', getHerderUnitPrice(sample({ price: 12500.4 })), 12500);
check('rejects zero price', getHerderUnitPrice(sample({ price: 0, salePrice: null })), null);
check('rejects negative price', getHerderUnitPrice(sample({ price: -1000, salePrice: null })), null);

const cartItem = buildHerderCartItem(sample({ salePrice: 9900 }));
check('cart item id preserves backend product id', cartItem?.id, 'herder-product-1');
check('cart item uses normalized price', cartItem?.price, 9900);
check('cart item uses first image', cartItem?.image, 'https://example.com/product.jpg');
check('cart item uses herder province as entity id', cartItem?.entityId, 'TOV');
check('cart item uses herder name', cartItem?.entityName, 'Test Herder');

const fallbackCartItem = buildHerderCartItem(sample({ herder: null, images: [] }));
check('cart item falls back to herder entity id', fallbackCartItem?.entityId, 'herder');
check('cart item falls back to generic entity name', fallbackCartItem?.entityName, 'Малчнаас шууд');
check('invalid price does not build cart item', buildHerderCartItem(sample({ price: 0, salePrice: null })), null);

const failed = checks.filter((item) => !item.pass);
for (const item of checks) {
  const label = item.pass ? 'OK  ' : 'FAIL';
  console.log(`${label} ${item.name}`);
  if (!item.pass) {
    console.log(`     expected: ${JSON.stringify(item.expected)}`);
    console.log(`     actual:   ${JSON.stringify(item.actual)}`);
  }
}

console.log('');
console.log(`Summary: ${failed.length} failed, ${checks.length} total.`);

if (failed.length > 0) {
  process.exitCode = 1;
}
