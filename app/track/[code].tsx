import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

const STEPS = [
  { key: 'PENDING', label: 'Захиалга хүлээгдэж байна', icon: 'time-outline' },
  { key: 'CONFIRMED', label: 'Захиалга баталгаажсан', icon: 'checkmark-circle-outline' },
  { key: 'PREPARING', label: 'Бараа бэлдэж байна', icon: 'cube-outline' },
  { key: 'DELIVERING', label: 'Хүргэлтэнд гарсан', icon: 'car-outline' },
  { key: 'DELIVERED', label: 'Хүргэгдсэн', icon: 'checkmark-done-outline' },
] as const;

export default function TrackScreen() {
  const { code } = useLocalSearchParams();
  const layout = useAppLayoutMetrics();
  const [isFocused, setIsFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  const { data, isLoading } = useQuery({
    queryKey: ['track', code],
    queryFn: () => get(`/tracking/${code}`),
    refetchInterval: isFocused ? 30000 : false,
    enabled: !!code,
  });

  const order = (data as any)?.data?.order || (data as any)?.order || data;
  const rawStep = STEPS.findIndex((step) => step.key === String(order?.status || '').toLocaleUpperCase('en-US'));
  const currentStep = rawStep >= 0 ? rawStep : 0;
  const activeStep = STEPS[currentStep];
  const orderKey = getOrderKey(order);

  if (isLoading) {
    return (
      <AppScreen contentContainerStyle={{ flexGrow: 1 }}>
        <AppTopBar eyebrow="Захиалга" title={`#${String(code || '')}`} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.driver} />
          <Text style={{ ...F.small, color: C.textSub, marginTop: R.md }}>Хүргэлтийн явц ачаалж байна...</Text>
        </View>
      </AppScreen>
    );
  }

  if (!code || !order) {
    return (
      <AppScreen contentContainerStyle={{ flexGrow: 1 }}>
        <AppTopBar eyebrow="Хүргэлт" title="Хүргэлт шалгах" />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <AppCard style={{ alignItems: 'center', gap: R.sm }}>
            <Ionicons name="navigate-circle-outline" size={48} color={C.textMuted} />
            <Text style={{ ...F.h4, color: C.text, textAlign: 'center' }}>Хүргэлтийн мэдээлэл олдсонгүй</Text>
            <Text style={{ ...F.small, color: C.textSub, textAlign: 'center' }}>
              Tracking кодоо шалгаад дахин оруулна уу.
            </Text>
            <AppButton
              label="Код дахин оруулах"
              icon="search-outline"
              style={{ backgroundColor: C.driver, borderColor: C.driver }}
              onPress={() => router.replace('/track/search' as any)}
            />
          </AppCard>
        </View>
      </AppScreen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <AppScreen contentContainerStyle={{ paddingBottom: layout.screenBottom + 96 }}>
        <AppTopBar eyebrow="Захиалга" title={`#${String(code || '')}`} />

        <AppHeader
          title={`Захиалга #${String(code || '')}`}
          subtitle="Хүргэлтийн явц 30 секунд тутам шинэчлэгдэнэ."
          icon="navigate-circle-outline"
          accent={C.driver}
        />

        <AppCard style={{ alignItems: 'center', gap: R.sm, marginBottom: R.md }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: R.full,
            backgroundColor: C.driver + '16',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={activeStep.icon} size={32} color={C.driver} />
        </View>
        <Text style={{ ...F.h3, color: C.text, textAlign: 'center' }}>{activeStep.label}</Text>
        {order?.estimatedDelivery ? (
          <Text style={{ ...F.small, color: C.textMuted, textAlign: 'center' }}>
            Тооцоолсон цаг: {new Date(order.estimatedDelivery).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        ) : null}
        </AppCard>

        <AppCard style={{ marginBottom: R.md }}>
        <Text style={{ ...F.h4, color: C.text, marginBottom: R.md }}>Хүргэлтийн явц</Text>
        {STEPS.map((step, index) => {
          const done = index <= currentStep;
          const current = index === currentStep;
          return (
            <View key={step.key} style={{ flexDirection: 'row' }}>
              <View style={{ alignItems: 'center', marginRight: R.md, width: 24 }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: R.full,
                    backgroundColor: done ? C.driver : C.bgSection,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: done ? 0 : 1,
                    borderColor: C.border,
                    zIndex: 1,
                  }}
                >
              {done ? <Ionicons name="checkmark" size={14} color={C.bgCard} /> : null}
                </View>
                {index < STEPS.length - 1 ? (
                  <View
                    style={{
                      width: 2,
                      flex: 1,
                      minHeight: 32,
                      backgroundColor: index < currentStep ? C.driver : C.border,
                      marginVertical: R.xs,
                    }}
                  />
                ) : null}
              </View>
              <View style={{ flex: 1, paddingBottom: index < STEPS.length - 1 ? R.xl : 0 }}>
                <Text style={{ ...F.small, color: done ? C.text : C.textMuted, fontWeight: current ? '900' : '500' }}>
                  {step.label}
                </Text>
                {current ? <Text style={{ ...F.tiny, color: C.driver, marginTop: 2 }}>Одоогийн төлөв</Text> : null}
              </View>
            </View>
          );
        })}
        </AppCard>

        {order?.driver ? (
          <AppCard style={{ flexDirection: 'row', alignItems: 'center', gap: R.md }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: R.full,
              backgroundColor: C.driver + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="person-outline" size={24} color={C.driver} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...F.small, color: C.text, fontWeight: '900' }}>{order.driver.name}</Text>
            <Text style={{ ...F.tiny, color: C.textMuted }}>Жолооч</Text>
          </View>
          {order.driver.phone ? (
            <AppButton
              label="Залгах"
              icon="call-outline"
              variant="ghost"
              onPress={() => Linking.openURL(`tel:${order.driver.phone}`)}
              style={{ minHeight: 38, paddingVertical: 6 }}
            />
          ) : null}
          </AppCard>
        ) : null}
      </AppScreen>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          flexDirection: 'row',
          gap: R.sm,
          backgroundColor: C.bgCard,
          padding: UI.screenPad,
          paddingBottom: layout.insets.bottom + R.lg,
          borderTopWidth: 1,
          borderTopColor: C.border,
        }}
      >
        <AppButton
          label="Өөр код"
          icon="search-outline"
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() => router.push('/track/search' as any)}
        />
        {orderKey ? (
          <AppButton
            label="Захиалга"
            icon="receipt-outline"
            style={{ flex: 1.2, backgroundColor: C.driver, borderColor: C.driver }}
            onPress={() => router.push(`/order/${orderKey}` as any)}
          />
        ) : null}
      </View>
    </View>
  );
}

function getOrderKey(order: any) {
  const key = order?._id ?? order?.id ?? order?.orderId;
  return key ? String(key) : '';
}
