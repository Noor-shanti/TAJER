import { storageService } from '../storage/secureStore';

// Default development API host (Local Cloudflare Worker or Remote URL)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787/api/v1';

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
    defaultHeaders['Authorization'] = `Bearer ${token}`;
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
    const error = new Error(errorMessage) as Error & { status: number; details?: any };
    error.status = response.status;
    error.details = data.error?.details;
    throw error;
  }

  return data;
}
