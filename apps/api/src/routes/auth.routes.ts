import { Hono } from 'hono';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDbClient } from '../db/client';
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

  const db = getDbClient(c.env);
  const result = await db.execute({
    sql: 'SELECT * FROM merchant WHERE username = ?',
    args: [username],
  });

  if (result.rows.length === 0) {
    throw new UnauthorizedError('اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  const merchantRow = result.rows[0]!;
  const isValidPassword = await bcrypt.compare(password, String(merchantRow.password_hash));

  if (!isValidPassword) {
    throw new UnauthorizedError('اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  const secret = new TextEncoder().encode(c.env.JWT_SECRET);
  
  // Access Token (15 days for merchant mobile app ease-of-use)
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
        id: Number(merchantRow.id),
        username: String(merchantRow.username),
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
