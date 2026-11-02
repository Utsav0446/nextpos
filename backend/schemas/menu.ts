import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(2, 'English Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  name_gu: z.string().max(100, 'Name must be less than 100 characters').optional().or(z.literal('')),
  name_hi: z.string().max(100, 'Name must be less than 100 characters').optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  description_gu: z.string().optional().or(z.literal('')),
  description_hi: z.string().optional().or(z.literal('')),
});

export const menuItemSchema = z.object({
  category_id: z.coerce.number().int().positive('Please select a valid category'),
  name: z.string().min(2, 'English Name must be at least 2 characters').max(150, 'Name must be less than 150 characters'),
  name_gu: z.string().min(2, 'Gujarati Name must be at least 2 characters').max(150, 'Name must be less than 150 characters'),
  name_hi: z.string().min(2, 'Hindi Name must be at least 2 characters').max(150, 'Name must be less than 150 characters'),
  description: z.string().optional().or(z.literal('')),
  description_gu: z.string().optional().or(z.literal('')),
  description_hi: z.string().optional().or(z.literal('')),
  price: z.coerce.number().positive('Price must be greater than 0'),
  image_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  is_available: z.boolean().default(true),
  is_veg: z.boolean().default(true),
  preparation_time: z.coerce.number().int().nonnegative('Preparation time cannot be negative').optional(),
  allow_spice: z.boolean().default(true),
  allow_prep: z.boolean().default(true),
  allow_notes: z.boolean().default(true),
  allow_texture: z.boolean().default(false),
  default_spice: z.string().default('Regular'),
  default_prep: z.string().default('Regular'),
  default_texture: z.string().default('Regular'),
  show_popup: z.boolean().default(true),
  allow_sitting: z.boolean().default(true),
  allow_parcel: z.boolean().default(true),
  has_variants: z.boolean().default(false).optional(),
  variants: z.array(z.object({
    name: z.string(),
    price: z.coerce.number().nonnegative('Variant price must be 0 or greater')
  })).default([]).optional(),
  custom_options: z.array(z.object({
    name: z.string(),
    options: z.array(z.string()),
    defaultOption: z.string().optional()
  })).default([]),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type MenuItemInput = z.infer<typeof menuItemSchema>;
