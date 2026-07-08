import { NextResponse } from 'next/server';
import { supabase } from '@/db';

export async function GET() {
  try {
    const { data: items, error } = await supabase
      .from('menu_items')
      .select(`
        id, name, category_id,
        category:categories(name, deleted_at)
      `)
      .is('deleted_at', null)
      .order('id', { ascending: true });

    if (error) throw error;

    const stats: Record<string, { categoryId: number | null, catDeleted: boolean, count: number, items: string[] }> = {};
    (items || []).forEach(r => {
      const categoryName = r.category?.name;
      const key = categoryName || `Unknown (${r.category_id})`;
      if (!stats[key]) {
        stats[key] = {
          categoryId: r.category_id,
          catDeleted: !!r.category?.deleted_at,
          count: 0,
          items: []
        };
      }
      stats[key].count++;
      stats[key].items.push(r.name);
    });

    return NextResponse.json({
      totalActiveItems: items?.length || 0,
      stats
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
