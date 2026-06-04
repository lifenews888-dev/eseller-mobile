#!/usr/bin/env node

import {
  filterPublicProducts,
  firstProductImage,
  getCartItemQualityIssue,
  getInvalidCartItems,
  getProductImages,
  getPublicProductPrice,
  getPublicProductQualityIssue,
  isPlaceholderProductName,
} from '../src/shared/productQuality.ts';

const checks = [];

function check(name, actual, expected) {
  const pass = Object.is(actual, expected);
  checks.push({ name, pass, actual, expected });
}

const good = {
  id: 'good-product',
  name: 'Phone travel tripod aluminum stand',
  price: 75000,
  images: ['https://cdn.example.com/tripod.jpg'],
};

check('good product has no issue', getPublicProductQualityIssue(good)?.code ?? null, null);
check('low supplier price is quarantined', getPublicProductQualityIssue({ ...good, price: 24 })?.code, 'invalid-price');
check('zero price is quarantined', getPublicProductQualityIssue({ ...good, price: 0 })?.code, 'invalid-price');
check('missing image is quarantined', getPublicProductQualityIssue({ ...good, images: [] })?.code, 'missing-image');
check('placeholder name is quarantined', getPublicProductQualityIssue({ ...good, name: 'Hhh' })?.code, 'placeholder-name');
check('repeated placeholder name is detected', isPlaceholderProductName('aaaa'), true);
check('object image url is accepted', getProductImages({ ...good, images: [{ url: 'https://cdn.example.com/1.jpg' }] }).length, 1);
check('media secure_url is accepted', getProductImages({ ...good, images: [], media: [{ secure_url: 'https://cdn.example.com/2.jpg' }] }).length, 1);
check('data image url is accepted', getProductImages({ ...good, images: ['data:image/png;base64,abc'] }).length, 1);
check('invalid image protocol is rejected', getProductImages({ ...good, images: ['javascript:alert(1)'] }).length, 0);
check('sale price wins when lower', getPublicProductPrice({ ...good, price: '100,000', salePrice: '89 000' }), 89000);
check('first image can use explicit fallback', firstProductImage({ ...good, images: [] }, 'fallback.jpg'), 'fallback.jpg');
check('cart item image field passes quality check', getCartItemQualityIssue({
  id: 'cart-good',
  name: 'Phone travel tripod aluminum stand',
  price: 75000,
  image: 'https://cdn.example.com/cart.jpg',
})?.code ?? null, null);
check('cart item without image is blocked', getCartItemQualityIssue({
  id: 'cart-missing-image',
  name: 'Phone travel tripod aluminum stand',
  price: 75000,
  image: null,
})?.code, 'missing-image');
check('invalid cart summary catches stale cart items', getInvalidCartItems([
  { id: 'cart-good', name: 'Phone travel tripod aluminum stand', price: 75000, image: 'https://cdn.example.com/cart.jpg' },
  { id: 'cart-bad-price', name: 'Phone travel tripod aluminum stand', price: 0, image: 'https://cdn.example.com/cart.jpg' },
  { id: 'cart-bad-name', name: 'Hhh', price: 75000, image: 'https://cdn.example.com/cart.jpg' },
]).length, 2);

const visible = filterPublicProducts([
  good,
  { ...good, id: 'bad-price', price: 1 },
  { ...good, id: 'bad-image', images: [] },
  { ...good, id: 'bad-name', name: 'demo' },
]);
check('filter hides every P0-bad product', visible.length, 1);
check('filter keeps the valid product', visible[0]?.id, 'good-product');

const visibleHerder = filterPublicProducts([
  { ...good, id: 'herder-good', name: 'Organic dairy from verified herder' },
  { ...good, id: 'herder-no-image', name: 'Organic dairy from verified herder', images: [] },
  { ...good, id: 'herder-low-price', name: 'Organic dairy from verified herder', price: 24 },
]);
check('herder product surfaces keep only valid items', visibleHerder.map((item) => item.id).join(','), 'herder-good');

const visibleHomeFeed = filterPublicProducts([
  { id: 'feed-good', title: 'Lightweight winter jacket', price: 125000, media: [{ url: 'https://cdn.example.com/jacket.jpg' }] },
  { id: 'feed-no-image', title: 'Lightweight winter jacket', price: 125000, media: [] },
  { id: 'feed-low-price', title: 'Lightweight winter jacket', price: 24, media: [{ url: 'https://cdn.example.com/jacket.jpg' }] },
]);
check('home feed preview keeps only valid listing cards', visibleHomeFeed.map((item) => item.id).join(','), 'feed-good');

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
