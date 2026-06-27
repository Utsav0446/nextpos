import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  description: z.string().optional().or(z.literal('')),
});

export const menuItemSchema = z.object({
  category_id: z.coerce.number().int().positive('Please select a valid category'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(150, 'Name must be less than 150 characters'),
  description: z.string().optional().or(z.literal('')),
  price: z.coerce.number().positive('Price must be greater than 0'),
  image_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  is_available: z.boolean().default(true),
  is_veg: z.boolean().default(true),
  preparation_time: z.coerce.number().int().nonnegative('Preparation time cannot be negative').optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type MenuItemInput = z.infer<typeof menuItemSchema>;
