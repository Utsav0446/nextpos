import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

import { supabase } from './db/index';

async function migrate() {
  console.log('Starting migration for printers and print queue...');

  const migrationSql = `
    ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS custom_options JSONB DEFAULT '[]'::jsonb;

    DROP TABLE IF EXISTS print_queue;
    ALTER TABLE restaurant_settings
      DROP COLUMN IF EXISTS printer_name,
      DROP COLUMN IF EXISTS print_kot_automatically,
      DROP COLUMN IF EXISTS printer_ip,
      DROP COLUMN IF EXISTS printer_port,
      DROP COLUMN IF EXISTS bill_printer_ip,
      DROP COLUMN IF EXISTS bill_printer_port,
      DROP COLUMN IF EXISTS kot_printer_ip,
      DROP COLUMN IF EXISTS kot_printer_port,
      DROP COLUMN IF EXISTS token_printer_ip,
      DROP COLUMN IF EXISTS token_printer_port,
      DROP COLUMN IF EXISTS kot_copies,
      DROP COLUMN IF EXISTS paper_width;

    NOTIFY pgrst, 'reload schema';
  `;

  // Try both sql and query_text to ensure RPC compatibility
  let res = await supabase.rpc('exec_sql', { sql: migrationSql });
  if (res.error) {
    res = await supabase.rpc('exec_sql', { query_text: migrationSql, query_params: [] });
  }

  if (res.error) {
    console.error('Migration failed:', res.error);
  } else {
    console.log('Migration successful: Dropped printers and print_queue tables.');
  }
}

migrate();

