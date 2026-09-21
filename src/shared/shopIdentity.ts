export function getShopName(item: unknown): string {
  if (!item || typeof item !== 'object') return 'Дэлгүүр';

  const source = item as Record<string, unknown>;
  const raw =
    source.name ??
    source.title ??
    source.storeName ??
    source.shopName ??
    source.businessName ??
    source.displayName ??
    source.serviceName;

  return typeof raw === 'string' && raw.trim() ? raw.trim() : 'Дэлгүүр';
}

