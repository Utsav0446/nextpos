import { supabase } from '@/db';
import { Expense } from '@/types';
import { clearReportsCache } from './reports';

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

  let req = supabase
    .from('expenses')
    .select('*');

  if (category) {
    req = req.eq('category', category);
  }
  if (startDate) {
    req = req.gte('expense_date', startDate);
  }
  if (endDate) {
    req = req.lte('expense_date', endDate);
  }
  if (search) {
    req = req.or(`reason.ilike.%${search}%,notes.ilike.%${search}%`);
  }

  req = req.order('expense_date', { ascending: false })
            .order('created_at', { ascending: false });

  if (limit !== undefined && offset !== undefined) {
    req = req.range(offset, offset + limit - 1);
  }

  const { data, error } = await req;
  if (error) throw error;
  return data || [];
}

export async function countExpenses(options: Omit<GetExpensesOptions, 'limit' | 'offset'> = {}): Promise<number> {
  const { search, category, startDate, endDate } = options;

  let req = supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true });

  if (category) {
    req = req.eq('category', category);
  }
  if (startDate) {
    req = req.gte('expense_date', startDate);
  }
  if (endDate) {
    req = req.lte('expense_date', endDate);
  }
  if (search) {
    req = req.or(`reason.ilike.%${search}%,notes.ilike.%${search}%`);
  }

  const { count, error } = await req;
  if (error) throw error;
  return count || 0;
}

export async function createExpense(expense: {
  category: string;
  amount: number;
  reason: string;
  notes?: string | null;
  expense_date: string;
}): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      category: expense.category,
      amount: expense.amount,
      reason: expense.reason,
      notes: expense.notes || null,
      expense_date: expense.expense_date,
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('audit_logs')
    .insert({
      action: 'CREATE_EXPENSE',
      details: `Expense of ${expense.amount} under ${expense.category} added for ${expense.reason}`,
    });

  clearReportsCache();
  return data;
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
  const { data, error } = await supabase
    .from('expenses')
    .update({
      category: expense.category,
      amount: expense.amount,
      reason: expense.reason,
      notes: expense.notes || null,
      expense_date: expense.expense_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;

  await supabase
    .from('audit_logs')
    .insert({
      action: 'UPDATE_EXPENSE',
      details: `Expense #${id} updated. New amount: ${expense.amount}`,
    });

  clearReportsCache();
  return data;
}

export async function deleteExpense(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) throw error;

  await supabase
    .from('audit_logs')
    .insert({
      action: 'DELETE_EXPENSE',
      details: `Expense #${id} deleted`,
    });

  clearReportsCache();
  return true;
}

export async function getExpenseSummaryByCategory(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('category, amount')
    .gte('expense_date', startDate)
    .lte('expense_date', endDate);

  if (error) throw error;

  const summaryMap: Record<string, number> = {};
  (data || []).forEach(row => {
    summaryMap[row.category] = (summaryMap[row.category] || 0) + Number(row.amount);
  });

  return Object.entries(summaryMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}
