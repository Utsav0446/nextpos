import React from 'react';
import { Receipt } from 'lucide-react';

export default function BillingLoading() {
  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full animate-pulse">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-300 dark:text-zinc-700 tracking-tight flex items-center gap-2">
            Billing & Settlement <Receipt className="w-4 h-4 text-zinc-300 dark:text-zinc-700" />
          </h1>
          <div className="h-3 w-40 bg-zinc-200 dark:bg-zinc-800 rounded mt-1.5" />
        </div>
      </div>

      {/* Two columns: Pending Orders list & Bill Detail */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Pending Orders (width ~1/3) */}
        <div className="w-full lg:w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-5 flex flex-col gap-4 shrink-0">
          <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-2 p-3 border border-zinc-100 dark:border-zinc-800 rounded-xl">
              <div className="flex justify-between">
                <div className="h-3.5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-3.5 w-12 bg-zinc-250 dark:bg-zinc-800 rounded" />
              </div>
              <div className="h-3 w-28 bg-zinc-150 dark:bg-zinc-850 rounded" />
            </div>
          ))}
        </div>

        {/* Right Column: Bill Details (width ~2/3) */}
        <div className="flex-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex flex-col gap-1.5">
              <div className="h-4 w-36 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-3 w-20 bg-zinc-150 dark:bg-zinc-850 rounded" />
            </div>
            <div className="h-8 w-24 bg-zinc-250 dark:bg-zinc-800 rounded-lg" />
          </div>
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between py-1">
                <div className="h-3.5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-3.5 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-4 flex flex-col gap-2.5">
            <div className="flex justify-between">
              <div className="h-3.5 w-16 bg-zinc-150 dark:bg-zinc-850 rounded" />
              <div className="h-3.5 w-12 bg-zinc-150 dark:bg-zinc-850 rounded" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded font-bold" />
              <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
