export function normalizeRouteParam(value?: string | string[] | null) {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' ? raw.trim() : '';
}

export function safeDecodeRouteParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function encodeRouteParam(value?: string | number | null) {
  if (value == null) return '';
  return encodeURIComponent(String(value));
}
