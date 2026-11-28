import * as WebBrowser from 'expo-web-browser';
import { post } from '../services/api';
import { useAuth } from '../store/auth';
import * as SecureStore from '../shared/secureStore';
import { API_ORIGIN } from '../config/apiBase';

// Вэбийн lib/mobileAuthHandoff.ts-ийн MOBILE_AUTH_REDIRECT-тэй ижил байх ёстой
export const OAUTH_APP_REDIRECT = 'eseller://auth/callback';

const ERROR_TEXT: Record<string, string> = {
  google_denied: 'Google нэвтрэлтийг цуцаллаа.',
  no_email: 'Google данснаас имэйл авч чадсангүй.',
  invalid_state: 'Нэвтрэлтийн хугацаа дууссан. Дахин оролдоно уу.',
  dan_invalid_state: 'Нэвтрэлтийн хугацаа дууссан. Дахин оролдоно уу.',
};

export function oauthErrorText(code: string): string {
  return ERROR_TEXT[code] || 'Нэвтрэх үед алдаа гарлаа. Дахин оролдоно уу.';
}

// Нэг код апп-ын deep link болон хөтчийн цонхны үр дүнгээр зэрэг ирж болох тул нэг л удаа солино
const inFlight = new Map<string, Promise<string>>();

/** Апп руу ирсэн нэг удаагийн кодыг токен болгож сессийг сэргээнэ. Хэрэглэгчийн role-г буцаана. */
export function completeOAuthCode(code: string): Promise<string> {
  const existing = inFlight.get(code);
  if (existing) return existing;
  const task = exchange(code);
  inFlight.set(code, task);
  return task;
}

async function exchange(code: string): Promise<string> {
  const res = (await post('/auth/mobile-exchange', { code })) as unknown as { token?: string; user?: { role?: string } };
  if (!res?.token) throw new Error('Нэвтрэх код хүчингүй байна.');
  await SecureStore.setItemAsync('token', res.token);
  await useAuth.getState().restoreSession(res.token);
  return useAuth.getState().user?.role || res.user?.role || 'buyer';
}

function readParam(url: string, key: string): string {
  const match = url.match(new RegExp(`[?&#]${key}=([^&#]+)`));
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Google/ДАН нэвтрэлтийг апп доторх хөтчийн цонхонд нээж, дуусахад апп руу буцаана.
 * Амжилттай бол role, цуцалсан бол null буцаана.
 */
export async function signInWithProvider(provider: 'google' | 'dan', role?: string | null): Promise<string | null> {
  const params = new URLSearchParams({ redirect: OAUTH_APP_REDIRECT });
  if (provider === 'google' && role) params.set('role', role);
  const result = await WebBrowser.openAuthSessionAsync(
    `${API_ORIGIN}/api/auth/${provider}?${params.toString()}`,
    OAUTH_APP_REDIRECT,
  );
  if (result.type !== 'success' || !result.url) return null;
  const error = readParam(result.url, 'error');
  if (error) throw new Error(oauthErrorText(error));
  const code = readParam(result.url, 'code');
  if (!code) throw new Error(oauthErrorText(''));
  return completeOAuthCode(code);
}
