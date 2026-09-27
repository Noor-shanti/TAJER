import { z } from 'zod';

// Customer Schemas
export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, 'اسم الزبون مطلوب'),
  phone: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// Category Schemas
export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'اسم التصنيف مطلوب'),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

// Product Unit Schemas
export const createUnitSchema = z.object({
  nameAr: z.string().trim().min(1, 'الاسم بالعربية مطلوب'),
  nameEn: z.string().trim().min(1, 'الاسم بالإنجليزية مطلوب'),
  symbol: z.string().trim().min(1, 'الرمز مطلوب').transform((v) => v.toUpperCase()),
});

// Product Schemas
export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'اسم المنتج مطلوب'),
  categoryId: z.number().int().positive().optional().nullable(),
  unitId: z.number().int().positive('وحدة القياس مطلوبة'),
  currentPrice: z.number().int().nonnegative('السعر يجب أن يكون صفرا أو أكثر'), // In minor units (agorot)
});

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// Invoice Line Item Input Schema
export const createInvoiceItemSchema = z.object({
  productId: z.number().int().positive().optional().nullable(),
  productNameSnapshot: z.string().trim().min(1, 'اسم المنتج مطلوب'),
  unitNameSnapshot: z.string().trim().min(1, 'وحدة المنتج مطلوبة'),
  quantity: z.number().int().positive('الكمية يجب أن تكون أكبر من صفر'), // Scale 1000
  unitPrice: z.number().int().nonnegative('سعر الوحدة يجب أن يكون صفرا أو أكثر'), // Minor units
  discountType: z.enum(['NONE', 'FIXED', 'PERCENTAGE']).default('NONE'),
  discountValue: z.number().int().nonnegative().default(0),
});

// Create Invoice Schema
export const createInvoiceSchema = z.object({
  customerId: z.number().int().positive('الزبون مطلوب'),
  items: z.array(createInvoiceItemSchema).min(1, 'يجب إضافة منتج واحد على الأقل في الفاتورة'),
  discountType: z.enum(['NONE', 'FIXED', 'PERCENTAGE']).default('NONE'),
  discountValue: z.number().int().nonnegative().default(0),
  initialPaymentAmount: z.number().int().nonnegative().default(0), // Minor units
  notes: z.string().trim().optional().nullable(),
  idempotencyKey: z.string().uuid().optional(),
});

// Create Payment Schema
export const createPaymentSchema = z.object({
  amount: z.number().int().positive('مبلغ الدفعة يجب أن يكون أكبر من صفر'), // Minor units
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'OTHER']).default('CASH'),
  notes: z.string().trim().optional().nullable(),
  idempotencyKey: z.string().uuid().optional(),
});
