import { useAuth } from './auth';
import { useCart } from './cart';
import { queryClient } from '../services/queryClient';
import { clear as clearHerderQueue } from '../features/herder/queue';
import { registerPushToken } from '../lib/notifications';

function userIdOf(user: unknown): string | null {
  const u = user as { id?: string; _id?: string } | null;
  return u?.id || u?._id || null;
}

let installed = false;

/**
 * Хэрэглэгч солигдоход өмнөх хүний өгөгдөл (захиалга, бараа, хэтэвч, чат г.м.) кэшээс харагдахаас сэргийлнэ.
 * - Нэг хэрэглэгчээс нөгөө рүү эсвэл зочноос нэвтрэхэд: серверээс татсан бүх кэшийг цэвэрлэнэ.
 * - Гарахад (эсвэл сесс хүчингүй болоход): кэш, сагс, малчны илгээгдээгүй дарааллыг цэвэрлэнэ.
 * Зочноос нэвтрэхэд сагс хадгалагдана.
 */
export function installSessionIsolation(): void {
  if (installed) return;
  installed = true;
  let previous = userIdOf(useAuth.getState().user);
  useAuth.subscribe((state) => {
    const next = userIdOf(state.user);
    if (next === previous) return;
    const wasSignedIn = previous !== null;
    previous = next;
    queryClient.clear();
    if (wasSignedIn) {
      useCart.getState().clear();
      void clearHerderQueue();
    }
    // Шинэ хэрэглэгч нэвтэрмэгц энэ утасны мэдэгдлийг түүнд холбоно (серверт өмнөх эзнээс салгагдана)
    if (next) void registerPushToken().catch(() => null);
  });
}
