import { z } from 'zod';

export const supplierSchema = z.object({
  name: z.string().min(2, 'Supplier name must be at least 2 characters'),
  contact_name: z.string().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable().or(z.literal('')),
  email: z.string().email('Please enter a valid email address').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable().or(z.literal('')),
});

export const inventoryItemSchema = z.object({
  name: z.string().min(2, 'Ingredient name must be at least 2 characters'),
  stock_quantity: z.coerce.number().nonnegative('Stock quantity cannot be negative'),
  unit: z.string().min(1, 'Unit is required (e.g. kg, ltr, pcs)'),
  low_stock_threshold: z.coerce.number().nonnegative('Threshold cannot be negative'),
  supplier_id: z.coerce.number().int().positive().nullable().optional(),
});

export const purchaseRecordSchema = z.object({
  inventory_id: z.coerce.number().int().positive('Please select an ingredient'),
  supplier_id: z.coerce.number().int().positive().nullable().optional(),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  unit_price: z.coerce.number().positive('Unit price must be greater than 0'),
  purchase_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Please select a valid date',
  }),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;
export type PurchaseRecordInput = z.infer<typeof purchaseRecordSchema>;
