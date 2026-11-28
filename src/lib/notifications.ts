import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { post } from '../services/api';
import { C } from '../shared/design';
import { encodeRouteParam } from '../shared/routeParams';
import type { Notification, NotificationResponse } from 'expo-notifications';

let lastPushToken: string | null = null;

/** Энэ утасны сүүлд бүртгэсэн push токен (гарахад серверээс салгахад хэрэглэнэ) */
export function getLastPushToken(): string | null {
  return lastPushToken;
}

async function loadNotifications() {
  if (Platform.OS === 'web') return null;
  return import('expo-notifications');
}

export function configureNotificationHandler(): void {
  void loadNotifications()
    .then((Notifications) => {
      if (!Notifications) return;
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    })
    .catch((e) => {
      if (__DEV__) {
        console.warn('[Push] notification handler setup failed:', e instanceof Error ? e.message : e);
      }
    });
}

/**
 * Request permission, create Android channels, fetch Expo push token,
 * and register it with the backend. Returns the token or null.
 */
export async function registerPushToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;

    const Notifications = await loadNotifications();
    if (!Notifications) return null;

    // Simulators/emulators don't receive push
    if (!Device.isDevice) {
      console.warn('[Push] Simulator — push notification ажиллахгүй');
      return null;
    }

    // Permission
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('[Push] Permission олгогдсонгүй');
      return null;
    }

    // Android channels — importance tiers per notification category
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Ерөнхий',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: C.primary,
      });
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Захиалга',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: C.seller,
      });
      await Notifications.setNotificationChannelAsync('delivery', {
        name: 'Хүргэлт',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: C.success,
      });
    }

    // Resolve EAS projectId from app.json (extra.eas.projectId)
    const projectId =
      (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
      (Constants.easConfig as { projectId?: string } | undefined)?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenData.data;
    lastPushToken = token;

    // Server-д хадгалах (fire-and-forget — backend register endpoint exists)
    await post('/push/register', {
      token,
      platform: Platform.OS,
    }).catch((e) => console.warn('[Push] Token register failed:', e?.message));

    return token;
  } catch (e) {
    console.warn('[Push] registerPushToken error:', e instanceof Error ? e.message : e);
    return null;
  }
}

const SCREEN_ROUTES: Record<string, string> = {
  wallet: '/wallet',
  'seller-orders': '/owner/orders',
  'driver-deliveries': '/driver/deliveries',
  'herder-dashboard': '/herder-admin/dashboard',
  'herder-register': '/register-herder',
  orders: '/orders',
};

const TYPE_ROUTES: Record<string, string> = {
  order_new: '/owner/orders',
  order_confirmed: '/orders',
  order_paid: '/orders',
  order_status: '/orders',
  delivery: '/orders',
  delivery_assigned: '/driver/deliveries',
  delivery_start: '/driver/deliveries',
  delivery_done: '/orders',
  payment_success: '/wallet',
  wallet: '/wallet',
  flash_sale: '/flash-sale',
  live_start: '/live',
  'seller-orders': '/owner/orders',
};

/**
 * Мэдэгдлийн өгөгдлөөс аппын хуудас тодорхойлно (push дарах болон мэдэгдлийн жагсаалтад нэг дүрэм).
 * screen → тодорхой хуудас; захиалга худалдан авагчид бол захиалгын дэлгэрэнгүй.
 */
export function routeForNotificationData(raw: unknown): string {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const screen = typeof data.screen === 'string' ? data.screen : '';
  if (screen && SCREEN_ROUTES[screen]) return SCREEN_ROUTES[screen];
  if (screen.startsWith('/')) return screen;
  const type = typeof data.type === 'string' ? data.type : '';
  const orderId = typeof data.orderId === 'string' ? data.orderId : '';
  const buyerOrderTypes = ['order_paid', 'order_confirmed', 'order_status', 'delivery', 'delivery_done'];
  if (orderId && (!type || buyerOrderTypes.includes(type))) {
    return `/order/${encodeRouteParam(orderId)}`;
  }
  return TYPE_ROUTES[type] ?? '/notifications';
}

/**
 * Map a received notification to an in-app route.
 * Called from notification tap handler in the root layout.
 */
export function resolveNotificationRoute(
  response: NotificationResponse,
): string {
  return routeForNotificationData(response.notification.request.content.data);
}

/** Keep the older export name working — used elsewhere. */
export function setupNotificationListeners(
  onNotification: (n: Notification) => void,
  onResponse: (r: NotificationResponse) => void,
) {
  if (Platform.OS === 'web') return () => {};

  let active = true;
  let cleanup = () => {};

  void loadNotifications().then((Notifications) => {
    if (!active || !Notifications) return;

    const sub1 = Notifications.addNotificationReceivedListener(onNotification);
    const sub2 = Notifications.addNotificationResponseReceivedListener(onResponse);
    cleanup = () => {
      sub1.remove();
      sub2.remove();
    };
  });

  return () => {
    active = false;
    cleanup();
  };
}
