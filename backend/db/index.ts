import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing from environment variables. Check .env.local');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export async function query(text: string, params: any[] = []) {
  const trimmed = text.trim().toUpperCase();
  if (
    trimmed === 'BEGIN' || 
    trimmed === 'COMMIT' || 
    trimmed === 'ROLLBACK' || 
    trimmed === 'BEGIN;' || 
    trimmed === 'COMMIT;' || 
    trimmed === 'ROLLBACK;'
  ) {
    return { rows: [], rowCount: 0 };
  }

  const serializedParams = params.map(p => {
    if (p === null || p === undefined) return null;
    if (p instanceof Date) return p.toISOString();
    if (Array.isArray(p)) {
      return '{' + p.map(val => {
        if (val === null || val === undefined) return 'NULL';
        return String(val);
      }).join(',') + '}';
    }
    return String(p);
  });

  const { data, error } = await supabase.rpc('exec_sql', {
    query_text: text,
    query_params: serializedParams
  });

  if (error) {
    console.error('SQL Execution Error via Supabase RPC:', error.message, 'Query:', text, 'Params:', params);
    throw new Error(error.message);
  }

  const rows = data || [];
  return {
    rows,
    rowCount: rows.length,
  };
}

export const pool = {
  connect: async () => {
    return {
      query: (text: string, params: any[] = []) => query(text, params),
      release: () => {},
    };
  },
  query: (text: string, params: any[] = []) => query(text, params),
};
