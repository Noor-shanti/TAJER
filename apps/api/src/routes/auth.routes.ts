import { Hono } from 'hono';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDbClient, shouldUseLocalFallback } from '../db/client';
import { UnauthorizedError } from '../errors/custom.errors';
import { authMiddleware } from '../middleware/auth.middleware';
import type { Env, Variables } from '../types/env.types';

const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const loginSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

// POST /api/v1/auth/login
authRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const { username, password } = loginSchema.parse(body);

  let merchantRow: { id: number; username: string; password_hash: string } | null = null;
  let authenticated = false;
  const useLocalFallback = shouldUseLocalFallback(c.env);

  if (!useLocalFallback) {
    try {
      const db = getDbClient(c.env);
      const result = await db.execute({
        sql: 'SELECT * FROM merchant WHERE username = ?',
        args: [username],
      });

      if (result.rows.length > 0) {
        merchantRow = {
          id: Number(result.rows[0]!.id),
          username: String(result.rows[0]!.username),
          password_hash: String(result.rows[0]!.password_hash),
        };
        authenticated = await bcrypt.compare(password, merchantRow.password_hash);
      }
    } catch {
      throw new UnauthorizedError('تعذر الاتصال بقاعدة البيانات، حاول لاحقاً');
    }
  }

  if (!authenticated && useLocalFallback && username === 'merchant' && password === 'password123') {
    authenticated = true;
    merchantRow = { id: 1, username: 'merchant', password_hash: '' };
  }

  if (!authenticated || !merchantRow) {
    throw new UnauthorizedError('اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  const secret = new TextEncoder().encode(c.env.JWT_SECRET || 'super-secret-key-for-development-at-least-32-chars');

  const accessToken = await new SignJWT({
    sub: String(merchantRow.id),
    username: String(merchantRow.username),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15d')
    .sign(secret);

  return c.json({
    success: true,
    data: {
      accessToken,
      merchant: {
        id: merchantRow.id,
        username: merchantRow.username,
      },
    },
  });
});

// GET /api/v1/auth/me
authRoutes.get('/me', authMiddleware, async (c) => {
  const merchantId = c.get('merchantId');
  const merchantUsername = c.get('merchantUsername');

  return c.json({
    success: true,
    data: {
      id: merchantId,
      username: merchantUsername,
    },
  });
});

export default authRoutes;
