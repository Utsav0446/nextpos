import { z } from 'zod';

export const orderItemSchema = z.object({
  menu_item_id: z.number().int().positive(),
  name: z.string().min(1),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  price: z.number().nonnegative(),
});

export const orderSchema = z.object({
  customer_name: z.string().optional().nullable().or(z.literal('')),
  table_number: z.string().optional().nullable().or(z.literal('')),
  order_type: z.enum(['Dine-In', 'Takeaway']),
  status: z.enum(['Pending', 'Preparing', 'Completed', 'Cancelled']).default('Pending'),
  items: z.array(orderItemSchema).min(1, 'Order must contain at least one item'),
  discount: z.coerce.number().nonnegative('Discount cannot be negative').default(0),
  tax: z.coerce.number().nonnegative('Tax cannot be negative').default(0),
  subtotal: z.coerce.number().nonnegative('Subtotal cannot be negative'),
  grand_total: z.coerce.number().nonnegative('Grand total cannot be negative'),
  notes: z.string().optional().nullable().or(z.literal('')),
  payment_type: z.enum(['Cash', 'UPI', 'Card']).optional().nullable(),
  paid_amount: z.coerce.number().nonnegative('Paid amount cannot be negative').default(0),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
