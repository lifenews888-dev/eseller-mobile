import React, {
  useState, useEffect, useRef
} from 'react'
import { Stack, router, usePathname } from 'expo-router'
import { View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as Updates  from 'expo-updates'
import { SafeAreaProvider }
  from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider }
  from '@tanstack/react-query'
import { GestureHandlerRootView }
  from 'react-native-gesture-handler'
import AsyncStorage
  from '@react-native-async-storage/async-storage'
import * as Sentry from '@sentry/react-native'

// Sentry init — production-only, guard against missing native module
try {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
    enabled: !__DEV__,
    tracesSampleRate: 0.1,
    environment: __DEV__ ? 'development' : 'production',
  })
} catch (e) {
  console.warn('[Sentry] init failed (native module missing — will work after next EAS build):', e)
}
import { useAuth }  from '../src/store/auth'
import { useRemoteConfig } from '../src/config/remoteFlags'
import { routeByRole } from '../src/shared/routing'
import { runSessionGate } from '../src/shared/sessionGate'
import {
  configureNotificationHandler,
  registerPushToken,
  resolveNotificationRoute,
  setupNotificationListeners,
} from '../src/lib/notifications'
import { C }        from '../src/shared/design'
import SplashScreen
  from '../src/shared/ui/SplashScreen'
import OnboardingScreen
  from '../src/shared/ui/OnboardingScreen'
import { AppShellBottomNav }
  from '../src/shared/ui/AppUI'
import { ErrorBoundary }
  from '../src/shared/ui/ErrorBoundary'

configureNotificationHandler()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry:                2,
      staleTime:            1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
})

function AppContent() {
  const [showSplash,     setSplash]      =
    useState(true)
  const [showOnboarding, setOnboarding]  =
    useState(false)
  // Cold-start session gate. While this runs we keep the splash overlay so
  // there's no flash of public UI between the splash dismissal and the
  // biometric prompt / silent restore. See src/shared/sessionGate.ts.
  const [gateRunning, setGateRunning] = useState(true)
  const [gateBlocked, setGateBlocked] = useState(false)
  const { user } = useAuth()
  const pathname = usePathname()
  const hasAutoRouted = useRef(false)

  // Run the gate exactly once. It reads SecureStore('token'), prompts
  // biometric if enabled, and calls restoreSession on success. While the
  // gate is running we hold the splash so the user never lands on a public
  // tab thinking they were logged out.
  //
  // Two non-authenticated terminal states require bouncing to login:
  //   - biometric-failed: user dismissed the prompt or it errored. Token
  //     was preserved; they can retry from login.
  //   - session-invalid: /auth/me rejected a stored token (terminal) OR a
  //     transient/offline error left state empty. Either way the user has
  //     nothing to operate on and shouldn't see protected UI. The login
  //     screen reads SESSION_INVALIDATED_KEY itself to decide whether to
  //     surface the "session expired" alert (only set on real 401, not on
  //     transient network errors).
  useEffect(() => {
    let cancelled = false
    runSessionGate()
      .then((result) => {
        if (cancelled) return
        if (__DEV__) console.log('[gate] result:', result)
        if (result.status === 'biometric-failed' || result.status === 'session-invalid') {
          setGateBlocked(true)
        }
      })
      .catch((e) => {
        if (__DEV__) console.warn('[gate] unexpected throw:', e)
      })
      .finally(() => {
        if (!cancelled) setGateRunning(false)
      })
    return () => { cancelled = true }
  }, [])

  // If the gate ended in biometric-failed (user dismissed the prompt or it
  // errored), bounce them to the login screen so they have a way out.
  useEffect(() => {
    if (gateRunning) return
    if (!gateBlocked) return
    try { router.replace('/login' as never) } catch {}
  }, [gateRunning, gateBlocked])

  // OTA update шалгах
  useEffect(() => {
    async function checkUpdates() {
      try {
        if (__DEV__) return
        const update = await Updates.checkForUpdateAsync()
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync()
          await Updates.reloadAsync()
        }
      } catch {}
    }
    checkUpdates()
  }, [])

  useEffect(() => {
    AsyncStorage.getItem('onboarded')
      .then(v => {
        if (!v) setOnboarding(true)
      })
      .catch(() => {})
  }, [])

  // Remote config: hydrate from cache synchronously-ish, then fetch.
  // Fires once on mount; refresh() self-throttles via lastFetched.
  useEffect(() => {
    const { hydrate, refresh } = useRemoteConfig.getState()
    hydrate().finally(() => { refresh() })
  }, [])

  // Push token бүртгэх + foreground/tap listeners (нэвтэрсэн үед)
  useEffect(() => {
    if (!user) return
    const isAuthEntry =
      pathname === '/login' ||
      pathname === '/register' ||
      pathname === '/otp' ||
      pathname === '/forgot-password' ||
      pathname.startsWith('/(auth)')
    if (pathname !== '/' && !isAuthEntry) return

    registerPushToken()

    const cleanup = setupNotificationListeners((n) => {
      console.log('[Push]', n.request.content.title, n.request.content.body)
    }, (r) => {
      const route = resolveNotificationRoute(r)
      try {
        router.push(route as never)
      } catch (e) {
        console.warn('[Push] route error:', e)
      }
    })

    return cleanup
  }, [user])

  // Auto-route DRIVER/SELLER to their own navigation group on cold start.
  // BUYER + STORE keep the default (tabs) entry so role-branching / legacy
  // screens continue to work for them.
  useEffect(() => {
    if (showSplash || showOnboarding) return
    if (!user) return
    // Stack navigator mount болсны дараа route хийх
    const timer = setTimeout(() => {
      const role = (user.role ?? '').toLowerCase()
      routeByRole(role)
    }, 100)
    return () => clearTimeout(timer)
  }, [user, showSplash, showOnboarding, pathname])

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem(
        'onboarded', 'true'
      )
    } catch {}
    setOnboarding(false)
  }

  // 1. Splash. Hold it open while the cold-start session gate is still
  // running so we never flash unauthenticated UI before the biometric
  // prompt or silent restoreSession finishes.
  if (showSplash || gateRunning) {
    return (
      <SplashScreen
        onDone={() => setSplash(false)}
      />
    )
  }

  // 2. Onboarding
  if (showOnboarding && !user) {
    return (
      <OnboardingScreen
        onDone={finishOnboarding}
      />
    )
  }

  // 3. Main app
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1 }}>
        <Stack
      screenOptions={{
        headerShown:  false,
        contentStyle: { backgroundColor: C.bg },
        animation:    'slide_from_right',
        headerStyle:  { backgroundColor: C.bgCard },
        headerShadowVisible: false,
        headerTintColor: C.text,
        headerTitleStyle: { color: C.text, fontSize: 16, fontWeight: '800' },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen
        name="product/[id]"
        options={{
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      <Stack.Screen name="cart" />
      <Stack.Screen name="checkout" />
      <Stack.Screen
        name="chat/[id]"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="track/search" />
      <Stack.Screen name="track/[code]" />
      <Stack.Screen name="terms" options={{ headerShown: false }} />
      <Stack.Screen name="privacy" options={{ headerShown: false }} />
      <Stack.Screen name="partner" options={{ headerShown: false }} />
      <Stack.Screen name="feedback" options={{ headerShown: false }} />
      <Stack.Screen name="[slug]" options={{ headerShown: false }} />
      <Stack.Screen
        name="feed/create"
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <Stack.Screen name="storefront/[slug]" />
      {/* Customer screens */}
      <Stack.Screen name="(customer)/flash-sale" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)/wallet" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)/addresses" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)/returns" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)/coupons" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)/edit-profile" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)/notification-settings" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)/help" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)/register-shop" options={{ headerShown: false }} />
      <Stack.Screen name="open-shop" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)/services" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)/tier-details" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)/security" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)/about" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)/contact" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)/legal/privacy" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)/legal/terms" options={{ headerShown: false }} />
      <Stack.Screen name="receipt/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="review/[orderId]" options={{ headerShown: false }} />
      {/* Seller + Driver groups now have their own Tabs layout */}
      <Stack.Screen name="(owner)" options={{ headerShown: false }} />
      <Stack.Screen name="owner" options={{ headerShown: false }} />
      <Stack.Screen name="(seller)" options={{ headerShown: false }} />
      <Stack.Screen name="seller" options={{ headerShown: false }} />
      <Stack.Screen name="(driver)" options={{ headerShown: false }} />
      <Stack.Screen name="driver" options={{ headerShown: false }} />
      <Stack.Screen name="(herder)" options={{ headerShown: false }} />
      <Stack.Screen name="herder-admin" options={{ headerShown: false }} />
      <Stack.Screen name="(coordinator)" options={{ headerShown: false }} />
      <Stack.Screen name="coordinator" options={{ headerShown: false }} />
      <Stack.Screen name="feed/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)/wishlist" options={{ headerShown: false }} />
      <Stack.Screen name="chat/ai-support" options={{ headerShown: false }} />
        </Stack>
      </View>
      <AppShellBottomNav />
    </View>
  )
}

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <StatusBar style="dark" />
            <AppContent />
          </ErrorBoundary>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

// Wrap with Sentry if available, otherwise export raw (native module may be missing on OTA-only updates)
let WrappedLayout: typeof RootLayout = RootLayout
try {
  WrappedLayout = Sentry.wrap(RootLayout) as typeof RootLayout
} catch {}

export default WrappedLayout




