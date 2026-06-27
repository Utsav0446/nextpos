'use server';

import { revalidatePath } from 'next/cache';
import { createExpense, updateExpense, deleteExpense } from '@/queries/expenses';
import { expenseSchema, ExpenseInput } from '@/schemas/expense';
import { getCurrentUser } from '@/lib/auth';

export async function saveExpenseAction(id: number | null, data: ExpenseInput) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  const parsed = expenseSchema.safeParse(data);
  if (!parsed.success) {
    return { error: 'Invalid inputs. Please verify amount and date fields.' };
  }

  try {
    if (id) {
      await updateExpense(id, parsed.data);
    } else {
      await createExpense(parsed.data);
    }
    revalidatePath('/expenses');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to save expense record.' };
  }
}

export async function deleteExpenseAction(id: number) {
  const admin = await getCurrentUser();
  if (!admin) return { error: 'Unauthorized action.' };

  try {
    await deleteExpense(id);
    revalidatePath('/expenses');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete expense record.' };
  }
}
