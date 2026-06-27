import { query } from '@/db';
import { Expense } from '@/types';

interface GetExpensesOptions {
  search?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export async function getExpenses(options: GetExpensesOptions = {}): Promise<Expense[]> {
  const { search, category, startDate, endDate, limit, offset } = options;
  const params: any[] = [];
  let paramCount = 1;

  let sql = `
    SELECT * FROM expenses
    WHERE 1=1
  `;

  if (category) {
    sql += ` AND category = $${paramCount}`;
    params.push(category);
    paramCount++;
  }

  if (startDate) {
    sql += ` AND expense_date >= $${paramCount}`;
    params.push(startDate);
    paramCount++;
  }

  if (endDate) {
    sql += ` AND expense_date <= $${paramCount}`;
    params.push(endDate);
    paramCount++;
  }

  if (search) {
    sql += ` AND (reason ILIKE $${paramCount} OR notes ILIKE $${paramCount})`;
    params.push(`%${search}%`);
    paramCount++;
  }

  sql += ` ORDER BY expense_date DESC, created_at DESC`;

  if (limit !== undefined && offset !== undefined) {
    sql += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
  }

  const result = await query(sql, params);
  return result.rows;
}

export async function countExpenses(options: Omit<GetExpensesOptions, 'limit' | 'offset'> = {}): Promise<number> {
  const { search, category, startDate, endDate } = options;
  const params: any[] = [];
  let paramCount = 1;

  let sql = `
    SELECT COUNT(*) FROM expenses
    WHERE 1=1
  `;

  if (category) {
    sql += ` AND category = $${paramCount}`;
    params.push(category);
    paramCount++;
  }

  if (startDate) {
    sql += ` AND expense_date >= $${paramCount}`;
    params.push(startDate);
    paramCount++;
  }

  if (endDate) {
    sql += ` AND expense_date <= $${paramCount}`;
    params.push(endDate);
    paramCount++;
  }

  if (search) {
    sql += ` AND (reason ILIKE $${paramCount} OR notes ILIKE $${paramCount})`;
    params.push(`%${search}%`);
    paramCount++;
  }

  const result = await query(sql, params);
  return parseInt(result.rows[0].count);
}

export async function createExpense(expense: {
  category: string;
  amount: number;
  reason: string;
  notes?: string | null;
  expense_date: string;
}): Promise<Expense> {
  const sql = `
    INSERT INTO expenses (category, amount, reason, notes, expense_date)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const result = await query(sql, [
    expense.category,
    expense.amount,
    expense.reason,
    expense.notes || null,
    expense.expense_date,
  ]);
  
  await query(
    'INSERT INTO audit_logs (action, details) VALUES ($1, $2)',
    ['CREATE_EXPENSE', `Expense of ${expense.amount} under ${expense.category} added for ${expense.reason}`]
  );

  return result.rows[0];
}

export async function updateExpense(
  id: number,
  expense: {
    category: string;
    amount: number;
    reason: string;
    notes?: string | null;
    expense_date: string;
  }
): Promise<Expense | null> {
  const sql = `
    UPDATE expenses
    SET category = $1, amount = $2, reason = $3, notes = $4, expense_date = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
  `;
  const result = await query(sql, [
    expense.category,
    expense.amount,
    expense.reason,
    expense.notes || null,
    expense.expense_date,
    id,
  ]);

  await query(
    'INSERT INTO audit_logs (action, details) VALUES ($1, $2)',
    ['UPDATE_EXPENSE', `Expense #${id} updated. New amount: ${expense.amount}`]
  );

  return result.rows[0] || null;
}

export async function deleteExpense(id: number): Promise<boolean> {
  const sql = 'DELETE FROM expenses WHERE id = $1';
  const result = await query(sql, [id]);

  await query(
    'INSERT INTO audit_logs (action, details) VALUES ($1, $2)',
    ['DELETE_EXPENSE', `Expense #${id} deleted`]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function getExpenseSummaryByCategory(startDate: string, endDate: string) {
  const sql = `
    SELECT category, SUM(amount) as total
    FROM expenses
    WHERE expense_date >= $1 AND expense_date <= $2
    GROUP BY category
    ORDER BY total DESC
  `;
  const result = await query(sql, [startDate, endDate]);
  return result.rows.map(row => ({
    category: row.category,
    total: Number(row.total)
  }));
}
