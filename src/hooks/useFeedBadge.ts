import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../store/auth'
import { ListingAPI, SavedSearchAPI, readGuestChats } from '../services/listings'

/**
 * "Зар" табын тэмдэг: уншаагүй зарын чат + хадгалсан хайлтын шинэ зар.
 * Нэвтрээгүй бол энэ утсан дээрх зочин чатын уншаагүй хариу.
 */
export function useFeedBadge(): number {
  const token = useAuth((s) => s.token)
  const { data } = useQuery({
    queryKey: ['feed-badge', !!token],
    queryFn: async () => {
      let n = 0
      if (token) {
        const [chats, searches] = await Promise.all([
          ListingAPI.unread().catch(() => null),
          SavedSearchAPI.count().catch(() => null),
        ])
        n += Number(chats?.count) || 0
        n += Number(searches?.count) || 0
      }
      const guests = token ? [] : await readGuestChats()
      if (guests.length) {
        const g = await ListingAPI.guestUnread(guests).catch(() => null)
        n += Number(g?.count) || 0
      }
      return n
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  })
  return data || 0
}
