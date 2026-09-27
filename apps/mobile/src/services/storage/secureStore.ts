import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'merchant_access_token';
const MERCHANT_USER_KEY = 'merchant_user_info';

export const storageService = {
  async setAccessToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  },

  async getAccessToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  async removeAccessToken(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  },

  async setMerchantUser(user: { id: number; username: string }): Promise<void> {
    await SecureStore.setItemAsync(MERCHANT_USER_KEY, JSON.stringify(user));
  },

  async getMerchantUser(): Promise<{ id: number; username: string } | null> {
    const data = await SecureStore.getItemAsync(MERCHANT_USER_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  async clearAll(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(MERCHANT_USER_KEY);
  },
};
