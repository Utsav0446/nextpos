import React from 'react';
import { getExpenses } from '@/queries/expenses';
import { getSettings } from '@/queries/settings';
import ExpenseManager from '@/components/expenses/ExpenseManager';

export const revalidate = 0; // Dynamic server rendering to fetch real-time expenses logs

export default async function ExpensesPage() {
  const expenses = await getExpenses();
  const settings = await getSettings();

  const currencySymbol = settings.currency === 'USD' ? '$' : 
                         settings.currency === 'EUR' ? '€' : 
                         settings.currency === 'GBP' ? '£' : '₹';

  return (
    <ExpenseManager
      initialExpenses={expenses}
      currencySymbol={currencySymbol}
    />
  );
}
