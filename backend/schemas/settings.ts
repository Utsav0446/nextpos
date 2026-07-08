import { z } from 'zod';

export const settingsSchema = z.object({
  restaurant_name: z.string().min(2, 'Restaurant name must be at least 2 characters').max(100, 'Restaurant name must be less than 100 characters'),
  address: z.string().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable().or(z.literal('')),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']),
  gst_percentage: z.coerce.number().min(0, 'GST percentage cannot be negative').max(100, 'GST percentage cannot exceed 100'),
  gstin: z.string().optional().nullable().or(z.literal('')),
  printer_name: z.string().optional().nullable().or(z.literal('')),
  print_kot_automatically: z.boolean().default(true),
  enable_token_number: z.boolean().default(true),
  printer_ip: z.string().optional().nullable().or(z.literal('')),
  printer_port: z.coerce.number().int().min(1).max(65535).default(9100),
  bill_printer_ip: z.string().optional().nullable().or(z.literal('')),
  bill_printer_port: z.coerce.number().int().min(1).max(65535).default(9100),
  kot_printer_ip: z.string().optional().nullable().or(z.literal('')),
  kot_printer_port: z.coerce.number().int().min(1).max(65535).default(9100),
  enable_gst: z.boolean().default(true),
  logo_url: z.string().optional().nullable().or(z.literal('')),
  receipt_header: z.string().optional().nullable().or(z.literal('')),
  receipt_footer: z.string().optional().nullable().or(z.literal('')),
  kot_copies: z.coerce.number().int().min(1).max(5).default(1),
  paper_width: z.string().default('80mm'),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
