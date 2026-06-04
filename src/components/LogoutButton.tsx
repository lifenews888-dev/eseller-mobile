import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../store/auth';
import { C, F, R, UI } from '../shared/design';

interface LogoutButtonProps {
  variant?: 'full' | 'menu-item' | 'icon';
}

export function LogoutButton({ variant = 'full' }: LogoutButtonProps) {
  const { logout } = useAuth();

  function handleLogout() {
    Alert.alert('Гарах', 'Аккаунтаасаа гарах уу?', [
      { text: 'Болих', style: 'cancel' },
      {
        text: 'Гарах',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login' as never);
        },
      },
    ]);
  }

  if (variant === 'icon') {
    return (
      <TouchableOpacity
        onPress={handleLogout}
        activeOpacity={0.84}
        style={styles.iconButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Гарах"
      >
        <Ionicons name="log-out-outline" size={18} color={C.error} />
      </TouchableOpacity>
    );
  }

  if (variant === 'menu-item') {
    return (
      <TouchableOpacity onPress={handleLogout} activeOpacity={0.84} style={styles.menuItem}>
        <Ionicons name="log-out-outline" size={20} color={C.error} />
        <Text style={styles.menuText}>Гарах</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={handleLogout} activeOpacity={0.84} style={styles.fullButton}>
      <Ionicons name="log-out-outline" size={18} color={C.error} />
      <Text style={styles.fullText}>Системээс гарах</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: UI.controlRadius,
    backgroundColor: C.errorDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${C.error}28`,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.md,
    paddingHorizontal: R.lg,
    paddingVertical: R.md,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  menuText: { ...F.body, color: C.error, fontWeight: '700' },
  fullButton: {
    minHeight: 46,
    backgroundColor: C.bgCard,
    borderRadius: UI.controlRadius,
    padding: R.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: R.sm,
    borderWidth: 1,
    borderColor: `${C.error}55`,
  },
  fullText: { ...F.body, color: C.error, fontWeight: '800' },
});
