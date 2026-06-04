import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { post } from '../services/api';
import { C } from '../shared/design';
import type { Notification, NotificationResponse } from 'expo-notifications';

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

/**
 * Map a received notification's `data.type` to an in-app route.
 * Called from notification tap handler in the root layout.
 */
export function resolveNotificationRoute(
  response: NotificationResponse,
): string {
  const data = (response.notification.request.content.data ?? {}) as Record<string, string>;

  // Explicit screen override wins
  if (data.screen) return data.screen;

  const routes: Record<string, string> = {
    order_new: '/owner/orders',
    order_confirmed: '/orders',
    order_paid: '/orders',
    delivery_start: '/driver/deliveries',
    delivery_done: '/orders',
    payment_success: '/wallet',
    promo: '/',
    gold_expiry: '/gold',
    flash_sale: '/flash-sale',
    live_start: '/live',
    'seller-orders': '/owner/orders',
  };

  return routes[data.type] ?? '/';
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
