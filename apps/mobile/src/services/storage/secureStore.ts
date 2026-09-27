import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'merchant_access_token';
const MERCHANT_USER_KEY = 'merchant_user_info';

const isWeb = Platform.OS === 'web';

export const storageService = {
  async setAccessToken(token: string): Promise<void> {
    if (isWeb) {
      try {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
      } catch (e) {
        console.warn('LocalStorage not available:', e);
      }
      return;
    }
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  },

  async getAccessToken(): Promise<string | null> {
    if (isWeb) {
      try {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
      } catch {
        return null;
      }
    }
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  async removeAccessToken(): Promise<void> {
    if (isWeb) {
      try {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
      } catch (e) {
        console.warn('LocalStorage not available:', e);
      }
      return;
    }
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  },

  async setMerchantUser(user: { id: number; username: string }): Promise<void> {
    const val = JSON.stringify(user);
    if (isWeb) {
      try {
        localStorage.setItem(MERCHANT_USER_KEY, val);
      } catch (e) {
        console.warn('LocalStorage not available:', e);
      }
      return;
    }
    await SecureStore.setItemAsync(MERCHANT_USER_KEY, val);
  },

  async getMerchantUser(): Promise<{ id: number; username: string } | null> {
    let data: string | null = null;
    if (isWeb) {
      try {
        data = localStorage.getItem(MERCHANT_USER_KEY);
      } catch {
        data = null;
      }
    } else {
      data = await SecureStore.getItemAsync(MERCHANT_USER_KEY);
    }

    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  async clearAll(): Promise<void> {
    if (isWeb) {
      try {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(MERCHANT_USER_KEY);
      } catch (e) {
        console.warn('LocalStorage not available:', e);
      }
      return;
    }
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(MERCHANT_USER_KEY);
  },
};
