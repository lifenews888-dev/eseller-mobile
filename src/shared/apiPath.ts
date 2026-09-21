export function encodeApiPathSegment(value?: string | number | null) {
  if (value == null) return '';
  return encodeURIComponent(String(value));
}
