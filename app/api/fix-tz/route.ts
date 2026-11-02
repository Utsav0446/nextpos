import { NextResponse } from 'next/server';
import { supabase } from '@/db';

export async function GET() {
  try {
    const queries = [
      'ALTER TABLE orders ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE \'UTC\'',
      'ALTER TABLE order_items ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE \'UTC\'',
      'ALTER TABLE menu_items ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE \'UTC\'',
      'ALTER TABLE categories ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE \'UTC\'',
      'ALTER TABLE restaurant_tables ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE \'UTC\'',
      'ALTER TABLE inventory_items ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE \'UTC\'',
      'ALTER TABLE inventory_transactions ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE \'UTC\'',
      'ALTER TABLE daily_expenses ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE \'UTC\'',
      'ALTER TABLE daily_cash_register ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE \'UTC\''
    ];

    const results = [];
    for (const q of queries) {
      const { error } = await supabase.rpc('execute_sql', { sql_query: q });
      if (error) {
        // If execute_sql RPC doesn't exist, this will fail. We'll handle it manually if needed.
        results.push({ query: q, error });
      } else {
        results.push({ query: q, success: true });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
