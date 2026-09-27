import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import categoriesRoutes from './routes/categories.routes';
import customersRoutes from './routes/customers.routes';
import invoicesRoutes from './routes/invoices.routes';
import productsRoutes from './routes/products.routes';
import unitsRoutes from './routes/units.routes';
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
app.route('/api/v1/customers', customersRoutes);
app.route('/api/v1/categories', categoriesRoutes);
app.route('/api/v1/units', unitsRoutes);
app.route('/api/v1/products', productsRoutes);
app.route('/api/v1/invoices', invoicesRoutes);

export default app;
