import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import type { Env, Variables } from './types/env.types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global Middlewares
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key'],
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Centralized Error Handling
app.onError(errorHandler);

// Health Check Endpoint
app.get('/api/v1/health', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'merchant-sales-api',
    },
  });
});

// Route Mounting
app.route('/api/v1/auth', authRoutes);

export default app;
