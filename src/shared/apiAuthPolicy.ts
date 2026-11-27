export function requestPath(config: unknown): string {
  if (!config || typeof config !== 'object') return '';
  const url = (config as { url?: unknown }).url;
  if (typeof url !== 'string') return '';
  let path = '';
  try {
    path = new URL(url, 'https://eseller.mn').pathname;
  } catch {
    path = url.split(/[?#]/)[0] || '';
  }

  if (path === '/api') return '/';
  if (path.startsWith('/api/')) return path.slice(4);
  return path;
}

export function isPublicBrowsingRequest(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const method = String((config as { method?: unknown }).method || 'get').toLowerCase();
  if (method !== 'get') return false;

  const path = requestPath(config);
  return (
    path === '/config/mobile' ||
    path === '/search' ||
    path === '/stores' ||
    path === '/feed' ||
    path.startsWith('/feed/') ||
    path === '/stories' ||
    path === '/group-buy' ||
    path === '/social/trending' ||
    path === '/flash-sales/active' ||
    path === '/live' ||
    path.startsWith('/live/') ||
    path === '/products' ||
    (path.startsWith('/products/') && path !== '/products/my') ||
    path === '/herder/products' ||
    path.startsWith('/herder/products/') ||
    path.startsWith('/herder/profile/')
  );
}

export function requestHadAuthorization(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const headers = (config as { headers?: unknown }).headers;
  if (!headers || typeof headers !== 'object') return false;

  const getter = (headers as { get?: (key: string) => unknown }).get;
  if (typeof getter === 'function') {
    return Boolean(getter.call(headers, 'Authorization') || getter.call(headers, 'authorization'));
  }

  const record = headers as Record<string, unknown>;
  return Boolean(record.Authorization || record.authorization);
}
