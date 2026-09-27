import { Hono } from 'hono';
import { getDbClient } from '../db/client';
import { authMiddleware } from '../middleware/auth.middleware';
import type { Env, Variables } from '../types/env.types';
import { createUnitSchema } from '../validators/schemas';

const unitsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();
unitsRoutes.use('*', authMiddleware);

// GET /api/v1/units
unitsRoutes.get('/', async (c) => {
  const db = getDbClient(c.env);
  const result = await db.execute('SELECT * FROM product_units ORDER BY id ASC');

  const units = result.rows.map((row) => ({
    id: Number(row.id),
    nameAr: String(row.name_ar),
    nameEn: String(row.name_en),
    symbol: String(row.symbol),
    createdAt: String(row.created_at),
  }));

  return c.json({
    success: true,
    data: units,
  });
});

// POST /api/v1/units
unitsRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const data = createUnitSchema.parse(body);
  const db = getDbClient(c.env);

  const result = await db.execute({
    sql: 'INSERT INTO product_units (name_ar, name_en, symbol) VALUES (?, ?, ?) RETURNING id, created_at',
    args: [data.nameAr, data.nameEn, data.symbol],
  });

  const row = result.rows[0]!;
  return c.json(
    {
      success: true,
      data: {
        id: Number(row.id),
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        symbol: data.symbol,
        createdAt: String(row.created_at),
      },
    },
    201
  );
});

export default unitsRoutes;
