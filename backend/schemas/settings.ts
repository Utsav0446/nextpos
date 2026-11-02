import { z } from 'zod';

export const settingsSchema = z.object({
  restaurant_name: z.string().min(2, 'Restaurant name must be at least 2 characters').max(100, 'Restaurant name must be less than 100 characters'),
  address: z.string().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable().or(z.literal('')),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']),
  gst_percentage: z.coerce.number().min(0, 'GST percentage cannot be negative').max(100, 'GST percentage cannot exceed 100'),
  gstin: z.string().optional().nullable().or(z.literal('')),
  enable_token_number: z.boolean().default(true),
  enable_gst: z.boolean().default(true),
  logo_url: z.string().optional().nullable().or(z.literal('')),
  receipt_header: z.string().optional().nullable().or(z.literal('')),
  receipt_footer: z.string().optional().nullable().or(z.literal('')),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
