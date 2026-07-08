'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { Expense } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { saveExpenseAction, deleteExpenseAction } from '@/actions/expenses';
import { formatCurrency, formatDateOnly } from '@/utils/format';
import { exportToCSV } from '@/utils/export';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { expenseSchema, ExpenseInput } from '@/schemas/expense';
import { Search, Plus, Edit2, Trash2, Download, Calendar, Filter, Wallet } from 'lucide-react';

interface ExpenseManagerProps {
  initialExpenses: Expense[];
  currencySymbol: string;
}

const CATEGORY_OPTIONS = [
  { value: 'Vegetables', label: 'Vegetables & Groceries' },
  { value: 'Salary', label: 'Staff Salary' },
  { value: 'Rent', label: 'Store Rent' },
  { value: 'Utilities', label: 'Utilities (Electricity/Water)' },
  { value: 'Gas', label: 'LPG Gas Cylinder' },
  { value: 'Others', label: 'Miscellaneous/Others' },
];

function getISODateOnly(d: any): string {
  if (!d) return '';
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ExpenseManager({ initialExpenses, currencySymbol }: ExpenseManagerProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: 'Vegetables',
      amount: 0,
      reason: '',
      notes: '',
      expense_date: getISODateOnly(new Date()),
    },
  });

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchesCategory = selectedCategory === 'all' || exp.category === selectedCategory;
      const matchesSearch = exp.reason.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const expDate = getISODateOnly(exp.expense_date);
      const matchesStart = !startDate || expDate >= startDate;
      const matchesEnd = !endDate || expDate <= endDate;

      return matchesCategory && matchesSearch && matchesStart && matchesEnd;
    });
  }, [expenses, selectedCategory, searchQuery, startDate, endDate]);

  // Aggregate sum
  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  }, [filteredExpenses]);

  const openAddModal = () => {
    setEditingExpenseId(null);
    reset({
      category: 'Vegetables',
      amount: 0,
      reason: '',
      notes: '',
      expense_date: getISODateOnly(new Date()),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    reset({
      category: exp.category,
      amount: Number(exp.amount),
      reason: exp.reason,
      notes: exp.notes || '',
      expense_date: getISODateOnly(exp.expense_date),
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: ExpenseInput) => {
    const res = await saveExpenseAction(editingExpenseId, data);
    if (res.error) {
      toast(res.error, 'error');
    } else {
      toast(editingExpenseId ? 'Expense log updated.' : 'Expense log created.', 'success');
      setIsModalOpen(false);
      window.location.reload();
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Delete this expense log?')) return;
    const res = await deleteExpenseAction(id);
    if (res.error) {
      toast(res.error, 'error');
    } else {
      toast('Expense log deleted.', 'info');
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const handleExportCSV = () => {
    const dataToExport = filteredExpenses.map((e) => ({
      ID: e.id,
      Category: e.category,
      Amount: Number(e.amount),
      Reason: e.reason,
      Notes: e.notes || '',
      Date: getISODateOnly(e.expense_date),
    }));
    exportToCSV(dataToExport, `expenses_export_${getISODateOnly(new Date())}.csv`);
    toast('Expenses exported to CSV.', 'success');
  };

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Expenses Log</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Track and verify restaurant money outflows and overheads.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportCSV} variant="outline" className="text-xs bg-white dark:bg-zinc-900">
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
          <Button onClick={openAddModal} className="text-xs font-semibold">
            <Plus className="w-4 h-4 mr-1.5" /> Log Expense
          </Button>
        </div>
      </div>

      {/* Aggregate Widget */}
      <div className="bg-zinc-900 text-white dark:bg-zinc-900 border dark:border-zinc-800 p-5 rounded-2xl flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 dark:bg-zinc-800 rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5 text-zinc-100" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Total Filtered Outflows</p>
            <p className="text-lg font-extrabold mt-0.5">{formatCurrency(totalAmount, currencySymbol === '$' ? 'USD' : 'INR')}</p>
          </div>
        </div>
        <span className="text-[10px] text-zinc-400 font-semibold">{filteredExpenses.length} Records</span>
      </div>

      {/* Filters Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5 bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-2xl shadow-xs">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider pl-1">Search Reason</span>
          <div className="relative">
            <Search className="absolute left-3 top-3.5 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="e.g. Rice bags, salary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-xs focus:outline-none"
            />
          </div>
        </div>

        <Select
          label="Category"
          options={[{ value: 'all', label: 'All Categories' }, ...CATEGORY_OPTIONS]}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider pl-1">Start Date</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-xs focus:outline-none text-zinc-800 dark:text-zinc-200"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider pl-1">End Date</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-xs focus:outline-none text-zinc-800 dark:text-zinc-200"
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              <th className="px-6 py-4">Expense Date</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Reason / Notes</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-zinc-400">
                  No expense records found. Click &ldquo;Log Expense&rdquo; to create.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20 transition-colors">
                  <td className="px-6 py-4.5 text-zinc-800 dark:text-zinc-200 font-semibold">
                    {formatDateOnly(exp.expense_date)}
                  </td>
                  <td className="px-6 py-4.5">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-6 py-4.5">
                    <p className="font-bold text-zinc-850 dark:text-zinc-250">{exp.reason}</p>
                    {exp.notes && <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{exp.notes}</p>}
                  </td>
                  <td className="px-6 py-4.5 font-bold text-red-650 dark:text-red-400">
                    -{formatCurrency(exp.amount, currencySymbol === '$' ? 'USD' : 'INR')}
                  </td>
                  <td className="px-6 py-4.5 text-right">
                    <div className="flex justify-end gap-2.5">
                      <button
                        onClick={() => openEditModal(exp)}
                        className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-250 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Edit Log"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(exp.id)}
                        className="text-zinc-400 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                        title="Delete Log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog Form */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExpenseId ? 'Modify Expense Log' : 'Log Expense'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Select
            label="Expense Category"
            options={CATEGORY_OPTIONS}
            error={errors.category?.message}
            {...register('category')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount Outflow"
              type="number"
              step="0.01"
              placeholder="1500"
              error={errors.amount?.message}
              {...register('amount', { valueAsNumber: true })}
            />
            <Input
              label="Expense Date"
              type="date"
              error={errors.expense_date?.message}
              {...register('expense_date')}
            />
          </div>

          <Input
            label="Reason"
            type="text"
            placeholder="e.g. Milk & curd supply for week"
            error={errors.reason?.message}
            {...register('reason')}
          />

          <div className="w-full flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Internal Notes</label>
            <textarea
              placeholder="Invoice billing numbers, cash recipient names, details..."
              {...register('notes')}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all h-20 resize-none"
            />
          </div>

          <Button type="submit" className="w-full mt-4 py-3 text-xs font-bold" isLoading={isPending}>
            {editingExpenseId ? 'Save Changes' : 'Register Outflow'}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
