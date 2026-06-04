import { useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, post, put } from '../../src/services/api';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar, useAppLayoutMetrics } from '../../src/shared/ui/AppUI';

const DISTRICTS = [
  'Баянгол',
  'Баянзүрх',
  'Сүхбаатар',
  'Чингэлтэй',
  'Хан-Уул',
  'Сонгинохайрхан',
  'Налайх',
  'Багануур',
];

export default function AddressesScreen() {
  const qc = useQueryClient();
  const layout = useAppLayoutMetrics();
  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['addresses'], queryFn: () => get('/buyer/addresses') });
  const addresses = (data as any)?.addresses || [];

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [detail, setDetail] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const reset = () => {
    setName('');
    setPhone('');
    setDistrict('');
    setDetail('');
    setIsDefault(false);
    setEditId(null);
    setShowForm(false);
  };

  const saveMut = useMutation({
    mutationFn: (body: any) => editId ? put(`/buyer/addresses/${editId}`, body) : post('/buyer/addresses', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      reset();
    },
    onError: (error: any) => Alert.alert('Алдаа', error?.message || 'Хаяг хадгалж чадсангүй.'),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del(`/buyer/addresses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
    onError: (error: any) => Alert.alert('Алдаа', error?.message || 'Хаяг устгаж чадсангүй.'),
  });

  const openCreate = () => {
    reset();
    setShowForm(true);
  };

  const openEdit = (address: any) => {
    setName(address.name ?? '');
    setPhone(address.phone ?? '');
    setDistrict(address.district ?? '');
    setDetail(address.detail ?? address.address ?? '');
    setIsDefault(!!address.isDefault);
    setEditId(String(address.id ?? address._id));
    setShowForm(true);
  };

  const save = () => {
    if (!name || !phone || !district) {
      Alert.alert('Мэдээлэл дутуу', 'Хүлээн авагч, утас, дүүргээ бөглөнө үү.');
      return;
    }
    saveMut.mutate({ name, phone, district, detail, isDefault });
  };

  return (
    <View style={styles.screen}>
      <AppScreen
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.brand} />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: showForm ? layout.screenBottom : layout.screenBottom + 96 }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <AppTopBar eyebrow="Профайл" title="Хүргэлтийн хаяг" showBack={false} />
        <AppHeader
          title="Хүргэлтийн хаяг"
          subtitle="Захиалга хийхдээ ашиглах хаягуудаа хадгалж удирдана."
          icon="location-outline"
          accent={C.primary}
        />

        {showForm ? (
          <AddressForm
            editId={editId}
            name={name}
            phone={phone}
            district={district}
            detail={detail}
            isDefault={isDefault}
            isSaving={saveMut.isPending}
            setName={setName}
            setPhone={setPhone}
            setDistrict={setDistrict}
            setDetail={setDetail}
            setIsDefault={setIsDefault}
            onCancel={reset}
            onSave={save}
          />
        ) : null}

        {isLoading ? (
          <AppCard style={styles.centerCard}>
            <ActivityIndicator color={C.brand} />
            <Text style={styles.mutedText}>Хаягууд ачаалж байна...</Text>
          </AppCard>
        ) : addresses.length === 0 && !showForm ? (
          <AppCard style={styles.centerCard}>
            <Ionicons name="location-outline" size={46} color={C.textMuted} />
            <Text style={styles.emptyTitle}>Хаяг байхгүй</Text>
            <Text style={styles.mutedText}>Анхны хүргэлтийн хаягаа нэмээрэй.</Text>
          </AppCard>
        ) : (
          <View style={styles.addressList}>
            {addresses.map((address: any) => (
              <AddressCard
                key={address.id ?? address._id}
                address={address}
                onEdit={() => openEdit(address)}
                onDelete={() => {
                  const id = String(address.id ?? address._id);
                  Alert.alert('Устгах уу?', 'Энэ хаягийг жагсаалтаас устгана.', [
                    { text: 'Болих', style: 'cancel' },
                    { text: 'Устгах', style: 'destructive', onPress: () => delMut.mutate(id) },
                  ]);
                }}
              />
            ))}
          </View>
        )}
      </AppScreen>

      {!showForm ? (
        <View style={[styles.fixedActions, { paddingBottom: layout.insets.bottom + R.lg }]}>
          <AppButton
            label="Шинэ хаяг нэмэх"
            icon="add"
            onPress={openCreate}
          />
        </View>
      ) : null}
    </View>
  );
}

function AddressForm({
  editId,
  name,
  phone,
  district,
  detail,
  isDefault,
  isSaving,
  setName,
  setPhone,
  setDistrict,
  setDetail,
  setIsDefault,
  onCancel,
  onSave,
}: {
  editId: string | null;
  name: string;
  phone: string;
  district: string;
  detail: string;
  isDefault: boolean;
  isSaving: boolean;
  setName: (value: string) => void;
  setPhone: (value: string) => void;
  setDistrict: (value: string) => void;
  setDetail: (value: string) => void;
  setIsDefault: (value: boolean) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <AppCard style={styles.formCard}>
      <Text style={styles.formTitle}>{editId ? 'Хаяг засах' : 'Шинэ хаяг'}</Text>
      <Field placeholder="Хүлээн авагч" value={name} onChangeText={setName} icon="person-outline" />
      <Field placeholder="Утас" value={phone} onChangeText={setPhone} icon="call-outline" keyboardType="phone-pad" />

      <Text style={styles.fieldLabel}>Дүүрэг</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.districtRow}>
        {DISTRICTS.map((item) => {
          const active = district === item;
          return (
            <TouchableOpacity
              key={item}
              activeOpacity={0.84}
              onPress={() => setDistrict(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item} дүүрэг сонгох`}
              style={[styles.districtChip, active ? styles.districtChipActive : null]}
            >
              <Text style={[styles.districtText, active ? styles.districtTextActive : null]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TextInput
        style={[styles.input, styles.detailInput]}
        placeholder="Дэлгэрэнгүй хаяг"
        placeholderTextColor={C.textMuted}
        value={detail}
        onChangeText={setDetail}
        multiline
        textAlignVertical="top"
      />

      <TouchableOpacity
        activeOpacity={0.84}
        style={styles.defaultRow}
        onPress={() => setIsDefault(!isDefault)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isDefault }}
        accessibilityLabel="Үндсэн хаяг болгох"
      >
        <Ionicons name={isDefault ? 'checkbox' : 'square-outline'} size={22} color={isDefault ? C.primary : C.textMuted} />
        <Text style={styles.defaultText}>Үндсэн хаяг болгох</Text>
      </TouchableOpacity>

      <View style={styles.formActions}>
        <AppButton label="Болих" icon="close" variant="ghost" style={styles.formButton} onPress={onCancel} />
        <AppButton
          label={isSaving ? 'Хадгалж байна' : 'Хадгалах'}
          icon="checkmark"
          disabled={isSaving}
          style={styles.formButton}
          onPress={onSave}
        />
      </View>
    </AppCard>
  );
}

function Field({
  icon,
  ...props
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'phone-pad';
}) {
  return (
    <View style={styles.inputWrap}>
      <Ionicons name={icon} size={18} color={C.textMuted} />
      <TextInput
        {...props}
        accessibilityLabel={props.placeholder}
        placeholderTextColor={C.textMuted}
        style={styles.inputInline}
      />
    </View>
  );
}

function AddressCard({ address, onEdit, onDelete }: { address: any; onEdit: () => void; onDelete: () => void }) {
  return (
    <AppCard style={[styles.addressCard, address.isDefault ? styles.defaultCard : null]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="location" size={18} color={address.isDefault ? C.primary : C.textMuted} />
          <Text style={styles.addressName} numberOfLines={1}>{address.name}</Text>
          {address.isDefault ? <Badge label="Үндсэн" /> : null}
        </View>
        <View style={styles.iconActions}>
          <IconAction icon="create-outline" color={C.primary} label={`${address.name} засах`} onPress={onEdit} />
          <IconAction icon="trash-outline" color={C.error} label={`${address.name} устгах`} onPress={onDelete} />
        </View>
      </View>
      <Text style={styles.addressPhone}>{address.phone}</Text>
      <Text style={styles.addressDetail}>{address.district} · {address.detail ?? address.address ?? ''}</Text>
    </AppCard>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function IconAction({ icon, color, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; color: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={[styles.iconAction, { backgroundColor: `${color}18` }]}
    >
      <Ionicons name={icon} size={16} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  fixedActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.bgCard,
    padding: UI.screenPad,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  centerCard: { alignItems: 'center', gap: R.sm },
  emptyTitle: { ...F.body, color: C.text, fontWeight: '900', textAlign: 'center' },
  mutedText: { ...F.small, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
  formCard: { marginBottom: R.md },
  formTitle: { ...F.h4, color: C.text, marginBottom: R.md },
  inputWrap: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
    backgroundColor: C.bgSection,
    borderRadius: UI.controlRadius,
    paddingHorizontal: R.md,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: R.sm,
  },
  inputInline: { flex: 1, color: C.text, fontSize: 14, paddingVertical: R.sm },
  input: {
    minHeight: 48,
    backgroundColor: C.bgSection,
    borderRadius: UI.controlRadius,
    padding: R.md,
    color: C.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  detailInput: { minHeight: 84, marginBottom: R.sm },
  fieldLabel: { ...F.small, color: C.text, fontWeight: '900', marginBottom: R.sm },
  districtRow: { gap: R.sm, paddingBottom: R.sm },
  districtChip: {
    backgroundColor: C.bgSection,
    borderRadius: R.full,
    paddingHorizontal: R.md,
    paddingVertical: R.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  districtChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  districtText: { ...F.small, color: C.textSub, fontWeight: '800' },
  districtTextActive: { color: C.bgCard },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: R.sm, marginBottom: R.md },
  defaultText: { ...F.small, color: C.text, fontWeight: '800' },
  formActions: { flexDirection: 'row', gap: R.sm },
  formButton: { flex: 1 },
  addressList: { gap: R.sm },
  addressCard: { padding: R.md },
  defaultCard: { borderColor: C.primary, backgroundColor: C.primaryDim },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: R.md, marginBottom: R.xs },
  cardTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: R.sm },
  addressName: { ...F.body, color: C.text, fontWeight: '900', flex: 1 },
  addressPhone: { ...F.small, color: C.textSub, marginTop: 2 },
  addressDetail: { ...F.tiny, color: C.textMuted, marginTop: 3 },
  iconActions: { flexDirection: 'row', gap: R.sm },
  iconAction: {
    width: 32,
    height: 32,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { backgroundColor: C.bgCard, borderRadius: R.full, paddingHorizontal: R.sm, paddingVertical: 3 },
  badgeText: { ...F.tiny, color: C.primary, fontWeight: '900' },
});
