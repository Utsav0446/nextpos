import { supabase } from '@/db';
import { RestaurantSettings } from '@/types';

let cachedSettings: RestaurantSettings | null = null;

export function clearSettingsCache() {
  cachedSettings = null;
}

export async function getSettings(): Promise<RestaurantSettings> {
  if (cachedSettings) {
    return cachedSettings;
  }

  const { data, error } = await supabase
    .from('restaurant_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  
  if (!data) {
    // Insert default settings if they don't exist
    const { data: inserted, error: insertError } = await supabase
      .from('restaurant_settings')
      .insert({
        id: 1,
        restaurant_name: 'Gastronomy POS',
        address: '123 Food Street, Culinary City',
        phone: '+91 98765 43210',
        gstin: '22AAAAA0000A1Z5',
        gst_percentage: 5.00,
        currency: 'INR',

        enable_gst: true,
        receipt_header: 'Welcome!',
        receipt_footer: 'Thank you! Visit again!',
        enable_token_number: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    cachedSettings = inserted;
    return cachedSettings!;
  }

  cachedSettings = data;
  return cachedSettings!;
}

export async function updateSettings(settings: {
  restaurant_name: string;
  address?: string | null;
  phone?: string | null;
  gstin?: string | null;
  gst_percentage: number;
  currency: string;
  enable_token_number: boolean;
  enable_gst: boolean;
  logo_url?: string | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;

}): Promise<RestaurantSettings> {
  const { data, error } = await supabase
    .from('restaurant_settings')
    .update({
      restaurant_name: settings.restaurant_name,
      address: settings.address || null,
      phone: settings.phone || null,
      gstin: settings.gstin || null,
      gst_percentage: settings.gst_percentage,
      currency: settings.currency,
      enable_token_number: settings.enable_token_number,
      enable_gst: settings.enable_gst,
      logo_url: settings.logo_url || null,
      receipt_header: settings.receipt_header || null,
      receipt_footer: settings.receipt_footer || null,

      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select()
    .single();

  if (error) throw error;
  cachedSettings = data;

  // Log activity
  await supabase
    .from('audit_logs')
    .insert({
      action: 'UPDATE_SETTINGS',
      details: `Restaurant settings updated. GST enabled: ${settings.enable_gst}, GST: ${settings.gst_percentage}%, Name: ${settings.restaurant_name}, Logo URL: ${settings.logo_url ? 'Yes' : 'No'}`,
    });

  return cachedSettings!;
}
