import Constants from 'expo-constants';
import { storageService } from '../storage/secureStore';

function getDefaultBaseUrl() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    '';
  const host = hostUri ? hostUri.split(':')[0] : 'localhost';
  return `http://${host}:8787/api/v1`;
}

// On a real phone, localhost points to the phone. Use Expo's LAN host instead.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || getDefaultBaseUrl();

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  idempotencyKey?: string;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, idempotencyKey, headers, ...customConfig } = options;

  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const token = await storageService.getAccessToken();

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  if (idempotencyKey) {
    defaultHeaders['x-idempotency-key'] = idempotencyKey;
  }

  const response = await fetch(url, {
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    const errorMessage = data.error?.message || 'حدث خطأ في الاتصال بالخادم';
    const error = new Error(errorMessage) as Error & { status: number; details?: unknown };
    error.status = response.status;
    error.details = data.error?.details;
    throw error;
  }

  return data;
}
