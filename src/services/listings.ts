/**
 * Зарын булан (FeedItem) — вэбтэй ижил API: хадгалах, гомдол, зарын эзэнтэй чат
 * (нэвтэрсэн болон зочин), VIP болгох (QPay). Interceptor `{ success, data }`-г задална.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { get, post } from './api';
import { encodeApiPathSegment } from '../shared/apiPath';

const pathSegment = encodeApiPathSegment;

export type ListingChatRow = {
  id: string;
  feedItemId: string;
  title?: string | null;
  lastMessage?: string | null;
  lastAt?: string;
  otherName?: string;
  unread?: number;
  role?: 'buyer' | 'seller';
};
export type ListingMessage = { id: string; text: string; mine: boolean; createdAt: string };
export type ListingThread = {
  chat: { id: string; feedItemId: string; title?: string | null; otherName: string; guestPhone?: string | null };
  messages: ListingMessage[];
};
export type GuestChatRef = { chatId: string; token: string; title?: string; feedItemId?: string };
export type PromoteInvoice = {
  invoiceId: string;
  qrImage?: string | null;
  qrText?: string | null;
  urls?: { name: string; link: string; logo?: string }[];
  demo?: boolean;
  amount: number;
  days: number;
};

export const REPORT_REASONS: Record<string, string> = {
  fraud: 'Луйвар / хуурамч зар',
  sold: 'Зарагдсан / хүчингүй',
  wrong_category: 'Буруу ангилал',
  duplicate: 'Давхардсан зар',
  offensive: 'Зохисгүй агуулга',
  other: 'Бусад',
};

export const ListingAPI = {
  // Хадгалах
  favorites: () => get('/listing-favorites') as unknown as Promise<{ id: string; title: string; price?: number | null; images: string[]; status: string }[]>,
  toggleFavorite: (feedItemId: string) => post('/listing-favorites', { feedItemId }) as unknown as Promise<{ saved: boolean }>,
  // Гомдол
  report: (feedItemId: string, reason: string, note?: string) => post(`/feed/${pathSegment(feedItemId)}/report`, { reason, note }),
  // Нэвтэрсэн хэрэглэгчийн чат
  chats: () => get('/listing-chats') as unknown as Promise<ListingChatRow[]>,
  startChat: (feedItemId: string, text: string) => post('/listing-chats', { feedItemId, text }) as unknown as Promise<{ chatId: string }>,
  thread: (chatId: string) => get(`/listing-chats/${pathSegment(chatId)}`) as unknown as Promise<ListingThread>,
  send: (chatId: string, text: string) => post(`/listing-chats/${pathSegment(chatId)}`, { text }) as unknown as Promise<ListingMessage>,
  unread: () => get('/listing-chats/unread') as unknown as Promise<{ count: number }>,
  // Зочин (бүртгэлгүй) чат
  guestStart: (feedItemId: string, name: string, phone: string, text: string) =>
    post('/listing-chats/guest', { feedItemId, name, phone, text }) as unknown as Promise<{ chatId: string; token: string; title?: string }>,
  guestThread: (chatId: string, token: string) =>
    get(`/listing-chats/guest/${pathSegment(chatId)}`, { token }) as unknown as Promise<ListingThread>,
  guestSend: (chatId: string, token: string, text: string) =>
    post(`/listing-chats/guest/${pathSegment(chatId)}`, { token, text }) as unknown as Promise<ListingMessage>,
  guestUnread: (chats: GuestChatRef[]) =>
    post('/listing-chats/guest/unread', { chats: chats.map((c) => ({ chatId: c.chatId, token: c.token })) }) as unknown as Promise<{
      count: number;
      chats: { id: string; lastMessage?: string; lastAt?: string; unread: number }[];
    }>,
  // VIP (QPay) — зөвхөн зарын эзэнд
  promoteInfo: (feedItemId: string) =>
    get(`/feed/${pathSegment(feedItemId)}/promote`) as unknown as Promise<{ item: { tier?: string; tierExpiresAt?: string | null }; price: number; days: number }>,
  promote: (feedItemId: string) => post(`/feed/${pathSegment(feedItemId)}/promote`) as unknown as Promise<PromoteInvoice>,
  checkPayment: (invoiceId: string) => get(`/payment/qpay/check/${pathSegment(invoiceId)}`) as unknown as Promise<{ paid: boolean; status: string }>,
};

// Зочин чатын токен — зөвхөн энэ төхөөрөмж дээр (вэбийн localStorage-тэй ижил санаа)
const GUEST_KEY = 'eseller:guestChats';

export async function readGuestChats(): Promise<GuestChatRef[]> {
  try {
    const v = JSON.parse((await AsyncStorage.getItem(GUEST_KEY)) || '[]');
    return Array.isArray(v) ? v.filter((x) => x && x.chatId && x.token) : [];
  } catch {
    return [];
  }
}

export async function saveGuestChat(ref: GuestChatRef): Promise<void> {
  try {
    const list = (await readGuestChats()).filter((x) => x.chatId !== ref.chatId);
    await AsyncStorage.setItem(GUEST_KEY, JSON.stringify([ref, ...list].slice(0, 50)));
  } catch {
    /* storage unavailable */
  }
}

/** Сар бүр тэнцүү төлөлттэй (аннуитет) зээлийн ойролцоо тооцоо — бүхэл ₮ */
export function monthlyPayment(principal: number, monthlyRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = monthlyRatePct / 100;
  if (r === 0) return Math.round(principal / months);
  return Math.round((principal * r) / (1 - Math.pow(1 + r, -months)));
}
