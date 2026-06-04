import React, { useEffect, useState } from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';

type DeliveryStatus = 'picked' | 'route' | 'delivered';
type DeliveryDetailParams = {
  id?: string;
  from?: string;
  to?: string;
  customerName?: string;
  customerPhone?: string;
  items?: string;
  fee?: string;
  status?: string;
  'ui-standard'?: string;
};

const STATUS_OPTIONS: Array<{ key: DeliveryStatus; label: string }> = [
  { key: 'picked', label: 'Авсан' },
  { key: 'route', label: 'Замдаа' },
  { key: 'delivered', label: 'Хүргэсэн' },
];

function normalizeDeliveryStatus(value?: string | string[] | null): DeliveryStatus {
  const raw = Array.isArray(value) ? value[0] : value;
  return STATUS_OPTIONS.some((option) => option.key === raw) ? (raw as DeliveryStatus) : 'picked';
}

function buildDeliveryDetailParams(params: DeliveryDetailParams, status: DeliveryStatus) {
  const nextParams: Record<string, string> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (key === 'status') return;
    if (value) nextParams[key] = value;
  });

  if (status !== 'picked') nextParams.status = status;
  return nextParams;
}

export default function DeliveryDetailScreen() {
  const params = useLocalSearchParams<DeliveryDetailParams>();
  const { id, from, to, customerName, customerPhone, items, fee } = params;
  const [status, setStatus] = useState<DeliveryStatus>(() => normalizeDeliveryStatus(params.status));

  useEffect(() => {
    setStatus(normalizeDeliveryStatus(params.status));
  }, [params.status]);

  const selectStatus = (nextStatus: DeliveryStatus) => {
    setStatus(nextStatus);
    const routeParams = buildDeliveryDetailParams(params, nextStatus);

    router.replace(
      Object.keys(routeParams).length
        ? ({ pathname: '/driver/delivery-detail' as any, params: routeParams } as any)
        : ('/driver/delivery-detail' as any),
    );
  };

  const toAddress = paramText(to, 'Хаяг ороогүй');
  const phone = paramText(customerPhone, '');

  const callCustomer = () => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const openMap = () => {
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(toAddress)}`);
  };

  return (
    <AppScreen>
      <AppTopBar eyebrow="Жолооч" title="Хүргэлт" />
      <AppHeader
        title="Хүргэлтийн дэлгэрэнгүй"
        subtitle={`#${paramText(id, 'шинэ').slice(-6).toUpperCase()}`}
        icon="car-outline"
        accent={C.driver}
      />

      <View style={{ gap: R.md }}>
        <InfoCard title="Авах хаяг" value={paramText(from, 'Авах хаяг ороогүй')} />

        <InfoCard title="Хүргэх хаяг" value={toAddress}>
          <AppButton
            label="Газрын зураг"
            icon="map-outline"
            onPress={openMap}
            style={{ alignSelf: 'flex-start', backgroundColor: C.driver, borderColor: C.driver }}
          />
        </InfoCard>

        <InfoCard title="Хэрэглэгч" value={paramText(customerName, 'Нэр ороогүй')}>
          <Text style={{ ...F.small, color: C.textSub, marginTop: 4 }}>
            {phone || 'Утас ороогүй'}
          </Text>
          <AppButton
            label="Залгах"
            icon="call-outline"
            variant="success"
            disabled={!phone}
            onPress={callCustomer}
            style={{ alignSelf: 'flex-start', marginTop: R.sm }}
          />
        </InfoCard>

        <AppCard>
          <Text style={{ ...F.small, color: C.textSub, fontWeight: '800' }}>
            Хүргэлтийн төлбөр
          </Text>
          <Text style={{ ...F.h2, color: C.driver, marginTop: R.xs }}>
            {Number(paramText(fee, '0')).toLocaleString()}₮
          </Text>
          {!!items && (
            <Text style={{ ...F.small, color: C.textSub, marginTop: R.xs }}>
              {paramText(items, '')}
            </Text>
          )}
        </AppCard>

        <AppCard style={{ gap: R.sm }}>
          <Text style={{ ...F.small, color: C.textSub, fontWeight: '800' }}>
            Хүргэлтийн төлөв
          </Text>
          <View style={{ flexDirection: 'row', gap: R.sm }}>
            {STATUS_OPTIONS.map((option) => (
              <StatusButton
                key={option.key}
                active={status === option.key}
                label={option.label}
                onPress={() => selectStatus(option.key)}
              />
            ))}
          </View>
        </AppCard>

        <AppButton
          label="Буцах"
          icon="arrow-back"
          variant="secondary"
          onPress={() => router.back()}
        />
      </View>
    </AppScreen>
  );
}

function InfoCard({
  title,
  value,
  children,
}: {
  title: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <AppCard>
      <Text style={{ ...F.small, color: C.textSub, fontWeight: '800' }}>{title}</Text>
      <Text style={{ ...F.body, color: C.text, fontWeight: '700', marginTop: R.xs }}>
        {value}
      </Text>
      {children ? <View style={{ marginTop: R.sm }}>{children}</View> : null}
    </AppCard>
  );
}

function StatusButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 42,
        borderRadius: UI.controlRadius,
        backgroundColor: active ? C.driver : C.bgSection,
        borderWidth: 1,
        borderColor: active ? C.driver : C.border,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: R.xs,
      }}
    >
      <Text
        style={{ ...F.small, color: active ? C.bgCard : C.textSub, fontWeight: '800' }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function paramText(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value || fallback;
}
