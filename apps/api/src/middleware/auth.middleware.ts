import type { MiddlewareHandler } from 'hono';
import { jwtVerify } from 'jose';
import { UnauthorizedError } from '../errors/custom.errors';
import type { Env, Variables } from '../types/env.types';

export const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('رمز الحساب مفقود');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new UnauthorizedError('رمز الحساب غير صالح');
  }

  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    c.set('merchantId', Number(payload.sub));
    c.set('merchantUsername', String(payload.username));

    await next();
  } catch {
    throw new UnauthorizedError('رمز الجلسة منتهي الصلاحية أو غير صالح');
  }
};
