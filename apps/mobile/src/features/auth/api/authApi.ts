import { apiClient } from '../../../services/api/client';
import { storageService } from '../../../services/storage/secureStore';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: true;
  data: {
    accessToken: string;
    merchant: {
      id: number;
      username: string;
    };
  };
}

export const authApi = {
  async login(payload: LoginPayload): Promise<LoginResponse['data']> {
    const res = await apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    await storageService.setAccessToken(res.data.accessToken);
    await storageService.setMerchantUser(res.data.merchant);

    return res.data;
  },

  async logout(): Promise<void> {
    await storageService.clearAll();
  },
};
