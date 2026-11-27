import { Platform } from 'react-native';

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

function normalizeApiBase(value: string): string {
  const trimmed = trimTrailingSlash(value);
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const DEV_DEFAULT_API_BASE_URL =
  Platform.OS === 'web' ? 'https://eseller.mn/api' : 'http://10.0.2.2:3000/api';

export const API_BASE_URL = normalizeApiBase(
  process.env.EXPO_PUBLIC_API_BASE_URL
    ?? process.env.EXPO_PUBLIC_API_URL
    ?? (__DEV__ ? DEV_DEFAULT_API_BASE_URL : 'https://eseller.mn/api'),
);

export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
