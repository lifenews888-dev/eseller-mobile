export const MIN_PUBLIC_PRODUCT_PRICE_MNT = 1000;

export const FALLBACK_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop';

export type ProductQualityIssueCode =
  | 'missing-name'
  | 'placeholder-name'
  | 'invalid-price'
  | 'missing-image';

export interface ProductQualityIssue {
  code: ProductQualityIssueCode;
  message: string;
}

interface ProductQualityOptions {
  requireImage?: boolean;
  requirePrice?: boolean;
}

const PLACEHOLDER_NAMES = new Set([
  'hhh',
  'test',
  'demo',
  'asdf',
  'qwe',
  'none',
  'null',
  'untitled',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(/[,\s]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function imageToUrl(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (!isRecord(value)) return null;
  const url = value.url ?? value.secure_url ?? value.src;
  return typeof url === 'string' && url.trim() ? url.trim() : null;
}

function isUsableImageUrl(url: string): boolean {
  return /^(https?:|file:|data:image\/)/i.test(url);
}

export function getProductName(item: unknown): string {
  if (!isRecord(item)) return '';
  const raw = item.name ?? item.title ?? item.productName;
  return typeof raw === 'string' ? raw.trim() : '';
}

export function isPlaceholderProductName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return false;
  if (PLACEHOLDER_NAMES.has(normalized)) return true;
  if (/^([a-z])\1{2,}$/i.test(normalized)) return true;
  if (normalized.length < 4 && /^[a-z]+$/i.test(normalized)) return true;
  return false;
}

export function getProductImages(item: unknown): string[] {
  if (!isRecord(item)) return [];
  const direct = Array.isArray(item.images) ? item.images : [];
  const media = Array.isArray(item.media) ? item.media : [];
  return [...direct, ...media]
    .map(imageToUrl)
    .filter((url): url is string => !!url && isUsableImageUrl(url));
}

export function firstProductImage(
  item: unknown,
  fallback: string = FALLBACK_PRODUCT_IMAGE,
): string {
  return getProductImages(item)[0] ?? fallback;
}

export function getPublicProductPrice(item: unknown): number {
  if (!isRecord(item)) return 0;
  const price = toFiniteNumber(item.price);
  const salePrice = toFiniteNumber(item.salePrice);
  if (salePrice != null && salePrice > 0 && (price == null || salePrice < price)) {
    return salePrice;
  }
  return price ?? 0;
}

export function getPublicProductQualityIssue(
  item: unknown,
  options: ProductQualityOptions = {},
): ProductQualityIssue | null {
  const { requireImage = true, requirePrice = true } = options;
  const name = getProductName(item);
  const price = getPublicProductPrice(item);

  if (!name) {
    return { code: 'missing-name', message: 'Барааны нэр дутуу байна.' };
  }
  if (isPlaceholderProductName(name)) {
    return { code: 'placeholder-name', message: 'Барааны нэр шалгалтад байна.' };
  }
  if (requirePrice && price < MIN_PUBLIC_PRODUCT_PRICE_MNT) {
    return { code: 'invalid-price', message: 'Барааны үнэ баталгаажаагүй байна.' };
  }
  if (requireImage && getProductImages(item).length === 0) {
    return { code: 'missing-image', message: 'Барааны зураг баталгаажаагүй байна.' };
  }

  return null;
}

export function filterPublicProducts<T>(
  items: readonly T[] | null | undefined,
  options?: ProductQualityOptions,
): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => !getPublicProductQualityIssue(item, options));
}

export interface CartQualityItem {
  id?: string;
  name?: string;
  price?: number | string | null;
  image?: string | null;
  qty?: number;
}

export interface InvalidCartItem {
  item: CartQualityItem;
  issue: ProductQualityIssue;
}

export function cartItemToQualityProduct(item: CartQualityItem) {
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    images: item.image ? [item.image] : [],
  };
}

export function getCartItemQualityIssue(item: CartQualityItem): ProductQualityIssue | null {
  return getPublicProductQualityIssue(cartItemToQualityProduct(item));
}

export function getInvalidCartItems(items: readonly CartQualityItem[]): InvalidCartItem[] {
  return items
    .map((item) => ({ item, issue: getCartItemQualityIssue(item) }))
    .filter((entry): entry is InvalidCartItem => !!entry.issue);
}
