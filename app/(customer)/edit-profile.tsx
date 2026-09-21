import { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { put } from '../../src/services/api';
import { useAuth } from '../../src/store/auth';
import { C, F, R, UI } from '../../src/shared/design';
import { AppButton, AppCard, AppHeader, AppScreen, AppTopBar } from '../../src/shared/ui/AppUI';
import { RequireAuthScreen } from '../../src/shared/ui/RequireAuthScreen';

export default function EditProfileScreen() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  const saveMut = useMutation({
    mutationFn: (data: any) => put('/user/profile', data),
    onSuccess: () => Alert.alert('Амжилттай', 'Профайл хадгалагдлаа.'),
    onError: (error: any) => Alert.alert('Алдаа', error?.message || 'Профайл хадгалж чадсангүй.'),
  });

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) setAvatar(result.assets[0].uri);
  };

  const save = () => {
    if (!name.trim()) {
      Alert.alert('Нэр оруулна уу');
      return;
    }
    saveMut.mutate({ name: name.trim(), phone: phone.trim() });
  };

  if (!user) {
    return (
      <RequireAuthScreen
        title="Профайл засах"
        subtitle="Профайлын мэдээллээ шинэчлэхийн тулд нэвтэрнэ үү."
        icon="person-outline"
        accent={C.primary}
        returnTo="/edit-profile"
      />
    );
  }

  return (
    <AppScreen keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ headerShown: false }} />
      <AppTopBar eyebrow="Профайл" title="Профайл засах" showBack={false} />
      <AppHeader
        title="Профайл засах"
        subtitle="Нэр, утас болон зураг зэрэг үндсэн мэдээллээ шинэчилнэ."
        icon="person-outline"
        accent={C.primary}
      />

      <AppCard style={styles.avatarCard}>
        <TouchableOpacity activeOpacity={0.86} style={styles.avatarWrap} onPress={pickAvatar}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarImg} />
          ) : (
            <Ionicons name="person-outline" size={40} color={C.textMuted} />
          )}
          <View style={styles.cameraIcon}>
                <Ionicons name="camera-outline" size={15} color={C.bgCard} />
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarTitle}>{user?.name || 'Хэрэглэгч'}</Text>
        <Text style={styles.avatarSub}>{user?.email || user?.phone || 'Профайлын мэдээлэл'}</Text>
      </AppCard>

      <AppCard style={styles.formCard}>
        <Field label="Нэр" icon="person-outline" value={name} onChangeText={setName} placeholder="Таны нэр" />
        <Field label="Утас" icon="call-outline" value={phone} onChangeText={setPhone} placeholder="Утасны дугаар" keyboardType="phone-pad" />

        <Text style={styles.label}>Имэйл</Text>
        <View style={styles.readonlyField}>
          <Ionicons name="mail-outline" size={18} color={C.textMuted} />
          <Text style={styles.readonlyText}>{user?.email || '-'}</Text>
        </View>
      </AppCard>

      <AppButton
        label={saveMut.isPending ? 'Хадгалж байна' : 'Хадгалах'}
        icon="checkmark"
        disabled={saveMut.isPending}
        onPress={save}
      />

      {saveMut.isPending ? <ActivityIndicator color={C.brand} style={styles.saving} /> : null}
    </AppScreen>
  );
}

function Field({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad';
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={18} color={C.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          keyboardType={keyboardType}
          style={styles.input}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarCard: { alignItems: 'center', marginBottom: R.md },
  avatarWrap: {
    width: 104,
    height: 104,
    borderRadius: R.full,
    backgroundColor: C.bgSection,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  avatarImg: { width: 104, height: 104, borderRadius: R.full },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: R.full,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.bgCard,
  },
  avatarTitle: { ...F.h4, color: C.text, marginTop: R.md },
  avatarSub: { ...F.small, color: C.textMuted, marginTop: 2 },
  formCard: { marginBottom: R.md },
  fieldBlock: { marginBottom: R.md },
  label: { ...F.small, color: C.textSub, fontWeight: '900', marginBottom: R.sm },
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
  },
  input: { flex: 1, color: C.text, fontSize: 14, paddingVertical: R.sm },
  readonlyField: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.sm,
    backgroundColor: C.bgSection,
    borderRadius: UI.controlRadius,
    paddingHorizontal: R.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  readonlyText: { ...F.small, color: C.textMuted },
  saving: { marginTop: R.md },
});
