import { useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HerderAPI } from '../../../src/features/herder/api';
import type {
  ApplicationsResponse,
  ApplicationStatus,
  CoordinatorApplication,
} from '../../../src/features/herder/types';
import { C, F, R, UI } from '../../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar, useAppLayoutMetrics } from '../../../src/shared/ui/AppUI';

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: 'Хүлээгдэж',
  under_review: 'Хянагдаж',
  approved: 'Баталгаажсан',
  rejected: 'Татгалзсан',
};

const STATUS_COLOR: Record<ApplicationStatus, string> = {
  pending: C.gold,
  under_review: C.primary,
  approved: C.success,
  rejected: C.error,
};

const LIVESTOCK_LABEL: Record<string, string> = {
  horse: 'Морь',
  cow: 'Үхэр',
  sheep: 'Хонь',
  goat: 'Ямаа',
  camel: 'Тэмээ',
};

export default function CoordinatorApplicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const layout = useAppLayoutMetrics();

  const list = useQuery({
    queryKey: ['coordinator', 'applications', 'all'],
    queryFn: () => HerderAPI.coordinator.applications.list({ status: 'all' }),
    staleTime: 30_000,
  });

  const application: CoordinatorApplication | undefined = useMemo(() => {
    if (!id) return undefined;

    const caches = qc.getQueriesData<ApplicationsResponse>({ queryKey: ['coordinator', 'applications'] });
    for (const [, data] of caches) {
      const hit = data?.applications.find((item) => item.id === id);
      if (hit) return hit;
    }

    return list.data?.applications.find((item) => item.id === id);
  }, [id, qc, list.data]);

  const review = useMutation({
    mutationFn: ({ action, rejectReason }: { action: 'approve' | 'reject' | 'request_review'; rejectReason?: string }) =>
      HerderAPI.coordinator.applications.review(id as string, action, rejectReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coordinator'] });
      setRejectOpen(false);
      setReason('');
      router.back();
    },
    onError: (error: Error) => Alert.alert('Алдаа', error.message),
  });

  const onApprove = () => {
    Alert.alert(
      'Баталгаажуулах',
      `${application?.herderName}-ийг идэвхтэй малчин болгох уу?`,
      [
        { text: 'Болих', style: 'cancel' },
        { text: 'Баталгаажуулах', onPress: () => review.mutate({ action: 'approve' }) },
      ],
    );
  };

  const onReject = () => {
    const text = reason.trim();
    if (!text) {
      Alert.alert('Анхаар', 'Татгалзах шалтгаанаа оруулна уу');
      return;
    }
    review.mutate({ action: 'reject', rejectReason: text });
  };

  if (list.isLoading && !application) {
    return (
      <AppScreen>
        <AppTopBar eyebrow="Координатор" title="Өргөдөл" />
        <AppCard style={{ alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
          <ActivityIndicator color={C.herder} />
        </AppCard>
      </AppScreen>
    );
  }

  if (!application) {
    return (
      <AppScreen>
        <AppTopBar eyebrow="Координатор" title="Өргөдөл" />
        <AppCard style={{ alignItems: 'center', gap: R.sm }}>
          <Ionicons name="alert-circle-outline" size={44} color={C.textMuted} />
          <Text style={{ ...F.h4, color: C.text, textAlign: 'center' }}>Өргөдөл олдсонгүй</Text>
          <Text style={{ ...F.small, color: C.textSub, textAlign: 'center' }}>
            Жагсаалт руу буцаад өргөдлөө дахин сонгоно уу.
          </Text>
          <AppButton label="Буцах" icon="arrow-back" variant="ghost" onPress={() => router.back()} />
        </AppCard>
      </AppScreen>
    );
  }

  const canReview = application.status === 'pending' || application.status === 'under_review';
  const livestockLines = Object.entries(application.livestock ?? {})
    .filter(([, value]) => typeof value === 'number' && value > 0)
    .map(([key, value]) => `${LIVESTOCK_LABEL[key] ?? key}: ${value}`);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <AppScreen contentContainerStyle={{ paddingBottom: canReview ? layout.screenBottom + 32 : layout.screenBottom }}>
        <AppTopBar
          eyebrow="Өргөдөл гаргагч"
          title={application.herderName}
          right={<StatusBadge status={application.status} />}
        />

        <AppHeader
          title="Малчны өргөдөл"
          subtitle="Бүртгэл, байршил, мал, банк болон баримтын мэдээлэл."
          icon="document-text-outline"
          accent={C.herder}
        />

        <Section title="Хувийн мэдээлэл">
          <Row label="Регистр" value={application.registerNumber} />
          <Row
            label="Утас"
            value={application.phone}
            cta="Залгах"
            onPress={() => Linking.openURL(`tel:${application.phone}`)}
          />
          {application.user?.email ? <Row label="И-мэйл" value={application.user.email} /> : null}
        </Section>

        <Section title="Байршил">
          <Row label="Аймаг" value={`${application.provinceName} (${application.province})`} />
          <Row label="Сум" value={application.district} />
        </Section>

        <Section title="Мал">
          {livestockLines.length > 0 ? (
            livestockLines.map((line) => (
              <View key={line} style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm, paddingVertical: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: R.full, backgroundColor: C.herder }} />
                <Text style={{ ...F.small, color: C.text, fontWeight: '700' }}>{line}</Text>
              </View>
            ))
          ) : (
            <Text style={{ ...F.small, color: C.textMuted }}>Мэдээлэл оруулаагүй</Text>
          )}
          {application.aDansNumber ? <Row label="А данс" value={application.aDansNumber} /> : null}
        </Section>

        <Section title="Баримт бичиг">
          {application.vetCertUri ? (
            <View>
              <Text style={{ ...F.small, color: C.textSub, marginBottom: R.sm }}>Мал эмнэлгийн гэрчилгээ</Text>
              <Image
                source={{ uri: application.vetCertUri }}
                style={{ width: '100%', height: 180, borderRadius: UI.controlRadius, backgroundColor: C.bgSection }}
                resizeMode="cover"
              />
            </View>
          ) : (
            <Text style={{ ...F.small, color: C.textMuted }}>Гэрчилгээ upload хийгээгүй</Text>
          )}
        </Section>

        <Section title="Банк">
          {application.bankInfo ? (
            <>
              <Row label="Банк" value={application.bankInfo.bankName} />
              <Row label="Данс" value={application.bankInfo.accountNumber} />
              {application.bankInfo.accountName ? <Row label="Нэр" value={application.bankInfo.accountName} /> : null}
            </>
          ) : (
            <Text style={{ ...F.small, color: C.textMuted }}>Банкны мэдээлэл алга</Text>
          )}
        </Section>

        {application.notes ? (
          <Section title="Тэмдэглэл">
            <Text style={{ ...F.small, color: C.text }}>{application.notes}</Text>
          </Section>
        ) : null}
      </AppScreen>

      {canReview ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: R.md,
            paddingBottom: layout.insets.bottom + R.md,
            backgroundColor: C.bgCard,
            borderTopWidth: 1,
            borderTopColor: C.border,
            flexDirection: 'row',
            gap: R.sm,
          }}
        >
          <AppButton
            label="Татгалзах"
            icon="close"
            variant="ghost"
            disabled={review.isPending}
            onPress={() => setRejectOpen(true)}
            style={{ flex: 1, borderColor: C.error }}
            textStyle={{ color: C.error }}
          />
          <AppButton
            label={review.isPending ? 'Илгээж байна' : 'Баталгаажуулах'}
            icon="checkmark"
            variant="success"
            disabled={review.isPending}
            onPress={onApprove}
            style={{
              flex: 1.6,
              backgroundColor: review.isPending ? C.border2 : C.herder,
              borderColor: review.isPending ? C.border2 : C.herder,
            }}
          />
        </View>
      ) : null}

      <Modal transparent visible={rejectOpen} animationType="fade" onRequestClose={() => setRejectOpen(false)}>
          <View style={{ flex: 1, backgroundColor: C.text + '73', justifyContent: 'center', padding: UI.screenPad }}>
          <AppCard elevated style={{ gap: R.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: R.sm }}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: UI.controlRadius,
                  backgroundColor: C.errorDim,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close-circle-outline" size={21} color={C.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...F.h3, color: C.text }}>Татгалзах шалтгаан</Text>
                <Text style={{ ...F.small, color: C.textSub }}>
                  Өргөдөл гаргагчид харагдах тул тодорхой бичнэ үү.
                </Text>
              </View>
            </View>

            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="жш: Мал эмнэлгийн гэрчилгээ хүчинтэй биш байна"
              placeholderTextColor={C.textMuted}
              multiline
              style={{
                minHeight: 92,
                backgroundColor: C.bgSection,
                borderRadius: UI.controlRadius,
                borderWidth: 1,
                borderColor: C.border,
                padding: R.md,
                color: C.text,
                textAlignVertical: 'top',
              }}
            />

            <View style={{ flexDirection: 'row', gap: R.sm }}>
              <AppButton
                label="Болих"
                variant="ghost"
                onPress={() => {
                  setRejectOpen(false);
                  setReason('');
                }}
                style={{ flex: 1 }}
              />
              <AppButton
                label="Татгалзах"
                icon="send"
                variant="success"
                disabled={review.isPending}
                onPress={onReject}
                style={{
                  flex: 1,
                  backgroundColor: review.isPending ? C.border2 : C.error,
                  borderColor: review.isPending ? C.border2 : C.error,
                }}
              />
            </View>
          </AppCard>
        </View>
      </Modal>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AppCard style={{ marginBottom: R.md }}>
      <Text style={{ ...F.h4, color: C.text, marginBottom: R.sm }}>{title}</Text>
      {children}
    </AppCard>
  );
}

function Row({
  label,
  value,
  onPress,
  cta,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  cta?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: R.md,
        paddingVertical: R.xs,
      }}
    >
      <Text style={{ ...F.small, color: C.textSub }}>{label}</Text>
      {onPress ? (
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={onPress}
          style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: R.xs }}
        >
          <Text style={{ ...F.small, color: C.herder, fontWeight: '800', textAlign: 'right' }} numberOfLines={2}>
            {value}
          </Text>
          {cta ? <Text style={{ ...F.tiny, color: C.herder, fontWeight: '800' }}>{cta}</Text> : null}
        </TouchableOpacity>
      ) : (
        <Text style={{ ...F.small, color: C.text, fontWeight: '700', flex: 1, textAlign: 'right' }} numberOfLines={3}>
          {value}
        </Text>
      )}
    </View>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <View
      style={{
        backgroundColor: STATUS_COLOR[status] + '22',
        borderRadius: R.full,
        paddingHorizontal: R.sm,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: STATUS_COLOR[status] + '33',
      }}
    >
      <Text style={{ ...F.tiny, color: STATUS_COLOR[status], fontWeight: '900' }}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}
