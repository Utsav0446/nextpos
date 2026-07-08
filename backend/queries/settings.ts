import { supabase } from '@/db';
import { RestaurantSettings } from '@/types';

let cachedSettings: RestaurantSettings | null = null;

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
        print_kot_automatically: true,
        enable_token_number: true,
        printer_ip: '127.0.0.1',
        printer_port: 9100,
        bill_printer_ip: '127.0.0.1',
        bill_printer_port: 9100,
        kot_printer_ip: '127.0.0.1',
        kot_printer_port: 9100,
        enable_gst: true,
        receipt_header: 'Welcome!',
        receipt_footer: 'Thank you! Visit again!',
        kot_copies: 1,
        paper_width: '80mm',
      })
      .select()
      .single();

    if (insertError) throw insertError;
    cachedSettings = inserted;
    return cachedSettings;
  }

  cachedSettings = data;
  return cachedSettings;
}

export async function updateSettings(settings: {
  restaurant_name: string;
  address?: string | null;
  phone?: string | null;
  gstin?: string | null;
  gst_percentage: number;
  currency: string;
  printer_name?: string | null;
  print_kot_automatically: boolean;
  enable_token_number: boolean;
  printer_ip?: string | null;
  printer_port: number;
  bill_printer_ip?: string | null;
  bill_printer_port: number;
  kot_printer_ip?: string | null;
  kot_printer_port: number;
  enable_gst: boolean;
  logo_url?: string | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  kot_copies: number;
  paper_width: string;
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
      printer_name: settings.printer_name || null,
      print_kot_automatically: settings.print_kot_automatically,
      enable_token_number: settings.enable_token_number,
      printer_ip: settings.printer_ip || null,
      printer_port: settings.printer_port,
      bill_printer_ip: settings.bill_printer_ip || '127.0.0.1',
      bill_printer_port: settings.bill_printer_port || 9100,
      kot_printer_ip: settings.kot_printer_ip || '127.0.0.1',
      kot_printer_port: settings.kot_printer_port || 9100,
      enable_gst: settings.enable_gst,
      logo_url: settings.logo_url || null,
      receipt_header: settings.receipt_header || null,
      receipt_footer: settings.receipt_footer || null,
      kot_copies: settings.kot_copies || 1,
      paper_width: settings.paper_width || '80mm',
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

  return cachedSettings;
}
