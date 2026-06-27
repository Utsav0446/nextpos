import { query } from '@/db';
import { RestaurantSettings } from '@/types';

export async function getSettings(): Promise<RestaurantSettings> {
  const sql = 'SELECT * FROM restaurant_settings WHERE id = 1';
  const result = await query(sql);
  // Default fallback if seed failed
  if (result.rows.length === 0) {
    const insertSql = `
      INSERT INTO restaurant_settings (id, restaurant_name, address, phone, gstin, gst_percentage, currency)
      VALUES (1, 'Gastronomy POS', '123 Food Street, Culinary City', '+91 98765 43210', '22AAAAA0000A1Z5', 5.00, 'INR')
      RETURNING *
    `;
    const inserted = await query(insertSql);
    return inserted.rows[0];
  }
  return result.rows[0];
}

export async function updateSettings(settings: {
  restaurant_name: string;
  address?: string | null;
  phone?: string | null;
  gstin?: string | null;
  gst_percentage: number;
  currency: string;
  printer_name?: string | null;
}): Promise<RestaurantSettings> {
  const sql = `
    UPDATE restaurant_settings
    SET restaurant_name = $1, address = $2, phone = $3, gstin = $4, 
        gst_percentage = $5, currency = $6, printer_name = $7, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
    RETURNING *
  `;
  const result = await query(sql, [
    settings.restaurant_name,
    settings.address || null,
    settings.phone || null,
    settings.gstin || null,
    settings.gst_percentage,
    settings.currency,
    settings.printer_name || null,
  ]);
  
  await query(
    'INSERT INTO audit_logs (action, details) VALUES ($1, $2)',
    ['UPDATE_SETTINGS', `Restaurant settings updated. GST: ${settings.gst_percentage}%, Name: ${settings.restaurant_name}`]
  );
  
  return result.rows[0];
}
