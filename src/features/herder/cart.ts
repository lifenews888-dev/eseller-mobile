import type { CartAddItem } from '../../store/cart';
import type { HerderProduct } from './types';

export function getHerderUnitPrice(product: Pick<HerderProduct, 'price' | 'salePrice'>): number | null {
  const salePrice = normalizeMnt(product.salePrice);
  if (salePrice != null) {
    return salePrice;
  }

  return normalizeMnt(product.price);
}

export function buildHerderCartItem(product: HerderProduct): CartAddItem | null {
  const price = getHerderUnitPrice(product);
  if (price == null) {
    return null;
  }

  return {
    id:         product.id,
    name:       product.name,
    price,
    image:      product.images?.[0] ?? null,
    entityId:   product.herder?.province ?? 'herder',
    entityName: product.herder?.herderName ?? 'Малчнаас шууд',
  };
}

function normalizeMnt(value: number | null | undefined): number | null {
  if (!Number.isFinite(value) || Number(value) <= 0) {
    return null;
  }

  return Math.round(Number(value));
}
