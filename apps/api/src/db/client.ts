import { createClient, type Client } from '@libsql/client';
import type { Env } from '../types/env.types';

export function shouldUseLocalFallback(env: Env): boolean {
  return !env.TURSO_DATABASE_URL || env.TURSO_DATABASE_URL.startsWith('file:');
}

export function getDbClient(env: Env): Client {
  if (!env.TURSO_DATABASE_URL) {
    throw new Error('TURSO_DATABASE_URL is not set in environment secrets');
  }
  if (env.TURSO_DATABASE_URL.startsWith('file:')) {
    throw new Error('Local file database is not available inside the Worker runtime');
  }

  return createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
}
