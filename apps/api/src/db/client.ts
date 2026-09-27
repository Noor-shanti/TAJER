import { createClient, type Client } from '@libsql/client';
import type { Env } from '../types/env.types';

export function getDbClient(env: Env): Client {
  if (!env.TURSO_DATABASE_URL) {
    throw new Error('TURSO_DATABASE_URL is not set in environment secrets');
  }

  return createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
}
