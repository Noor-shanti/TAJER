export interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET?: string;
  NODE_ENV?: 'development' | 'production' | 'test';
}

export interface Variables {
  merchantId?: number;
  merchantUsername?: string;
}
