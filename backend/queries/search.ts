import { supabase } from '@/db';

export async function globalSearch(term: string) {
  if (!term || term.trim() === '') {
    return { menu: [], orders: [], expenses: [] };
  }

  const searchPattern = `%${term}%`;
  
  // 1. Search Active Menu Items
  const { data: menuData, error: menuErr } = await supabase
    .from('menu_items')
    .select(`
      id, name, price, is_available,
      category:categories(name)
    `)
    .is('deleted_at', null)
    .or(`name.ilike.${searchPattern},description.ilike.${searchPattern}`)
    .order('name', { ascending: true })
    .limit(5);

  if (menuErr) throw menuErr;

  const formattedMenu = (menuData || []).map((m: any) => ({
    id: m.id,
    name: m.name,
    price: m.price,
    is_available: m.is_available,
    category_name: m.category?.name || 'N/A',
    type: 'menu'
  }));

  // 2. Search Orders
  const numericTerm = isNaN(Number(term)) ? null : Number(term);
  let orFilter = `customer_name.ilike.${searchPattern},table_number.ilike.${searchPattern}`;
  if (numericTerm !== null) {
    orFilter += `,id.eq.${numericTerm}`;
  }

  const { data: ordersData, error: ordersErr } = await supabase
    .from('orders')
    .select('id, customer_name, table_number, grand_total, status, order_type')
    .or(orFilter)
    .order('created_at', { ascending: false })
    .limit(5);

  if (ordersErr) throw ordersErr;

  const formattedOrders = (ordersData || []).map((o: any) => ({
    id: o.id,
    customer_name: o.customer_name,
    table_number: o.table_number,
    grand_total: o.grand_total,
    status: o.status,
    order_type: o.order_type,
    type: 'order'
  }));

  // 3. Search Expenses
  const { data: expensesData, error: expensesErr } = await supabase
    .from('expenses')
    .select('id, category, amount, reason, expense_date')
    .or(`reason.ilike.${searchPattern},category.ilike.${searchPattern}`)
    .order('expense_date', { ascending: false })
    .limit(5);

  if (expensesErr) throw expensesErr;

  const formattedExpenses = (expensesData || []).map((e: any) => ({
    id: e.id,
    category: e.category,
    amount: e.amount,
    reason: e.reason,
    date: e.expense_date,
    type: 'expense'
  }));

  return {
    menu: formattedMenu,
    orders: formattedOrders,
    expenses: formattedExpenses,
  };
}
