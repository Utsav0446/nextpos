import { query } from '@/db';

export async function globalSearch(term: string) {
  if (!term || term.trim() === '') {
    return { menu: [], orders: [], expenses: [] };
  }

  const searchPattern = `%${term}%`;
  
  // 1. Search Active Menu Items
  const menuSql = `
    SELECT m.id, m.name, m.price, m.is_available, c.name as category_name, 'menu' as type 
    FROM menu_items m
    JOIN categories c ON m.category_id = c.id
    WHERE (m.name ILIKE $1 OR m.description ILIKE $1) AND m.deleted_at IS NULL
    ORDER BY m.name ASC
    LIMIT 5
  `;
  const menuRes = await query(menuSql, [searchPattern]);

  // 2. Search Orders
  const ordersSql = `
    SELECT id, customer_name, table_number, grand_total, status, order_type, 'order' as type 
    FROM orders 
    WHERE customer_name ILIKE $1 OR id::text = $2 OR table_number ILIKE $1
    ORDER BY created_at DESC
    LIMIT 5
  `;
  // Clean integer parser for numeric match
  const numericTerm = isNaN(Number(term)) ? -1 : Number(term);
  const ordersRes = await query(ordersSql, [searchPattern, numericTerm]);

  // 3. Search Expenses
  const expensesSql = `
    SELECT id, category, amount, reason, expense_date::text as date, 'expense' as type 
    FROM expenses 
    WHERE reason ILIKE $1 OR category ILIKE $1
    ORDER BY expense_date DESC
    LIMIT 5
  `;
  const expensesRes = await query(expensesSql, [searchPattern]);

  return {
    menu: menuRes.rows,
    orders: ordersRes.rows,
    expenses: expensesRes.rows,
  };
}
