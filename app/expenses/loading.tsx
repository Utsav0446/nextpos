import React from 'react';
import { Wallet } from 'lucide-react';

export default function ExpensesLoading() {
  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full animate-pulse">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-300 dark:text-zinc-700 tracking-tight flex items-center gap-2">
            Expenses Log <Wallet className="w-4 h-4 text-zinc-300 dark:text-zinc-700" />
          </h1>
          <div className="h-3 w-40 bg-zinc-200 dark:bg-zinc-800 rounded mt-1.5" />
        </div>
      </div>

      {/* Expense log table skeleton */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-8 w-24 bg-zinc-250 dark:bg-zinc-800 rounded-lg" />
        </div>
        <div className="flex flex-col gap-3.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-zinc-50 dark:border-zinc-900 last:border-0">
              <div className="flex flex-col gap-1.5">
                <div className="h-3.5 w-36 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-20 bg-zinc-150 dark:bg-zinc-850 rounded" />
              </div>
              <div className="flex gap-4 items-center">
                <div className="h-3.5 w-16 bg-zinc-150 dark:bg-zinc-850 rounded" />
                <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded font-bold" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
