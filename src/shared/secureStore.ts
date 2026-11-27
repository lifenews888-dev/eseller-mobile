import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoSecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const webKey = (key: string) => `secure:${key}`;

export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(webKey(key));
  }

  return ExpoSecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(webKey(key), value);
    return;
  }

  await ExpoSecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(webKey(key));
    return;
  }

  await ExpoSecureStore.deleteItemAsync(key);
}
