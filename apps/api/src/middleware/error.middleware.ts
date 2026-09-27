import type { Context } from 'hono';
import { ZodError } from 'zod';
import { AppError } from '../errors/custom.errors';

export function errorHandler(err: Error, c: Context) {
  console.error('[API Error]:', err);

  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
      err.statusCode as any
    );
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'بيانات غير صحيحة',
          details,
        },
      },
      400
    );
  }

  // Internal Server Error (Hide internal details from client)
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'حدث خطأ غير متوقع في الخادم',
      },
    },
    500
  );
}
