'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentPeriod = searchParams.get('period') || 'week';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  const setPeriod = (period: string) => {
    const params = new URLSearchParams();
    params.set('period', period);
    router.push(`/reports?${params.toString()}`);
  };

  const handleCustomSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const start = data.get('startDate') as string;
    const end = data.get('endDate') as string;
    
    if (start && end) {
      const params = new URLSearchParams();
      params.set('period', 'custom');
      params.set('startDate', start);
      params.set('endDate', end);
      router.push(`/reports?${params.toString()}`);
    }
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-2xl shadow-xs">
      <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0 select-none">
        {['today', 'week', 'month', 'year'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize shrink-0 transition-all active:scale-[0.97] ${
              currentPeriod === p
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm'
                : 'bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-650 dark:text-zinc-400'
            }`}
          >
            {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'This Year'}
          </button>
        ))}
      </div>

      <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 text-xs w-full md:w-auto">
        <input
          type="date"
          name="startDate"
          defaultValue={startDate}
          className="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-zinc-850 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          required
        />
        <span className="text-zinc-400 font-bold">to</span>
        <input
          type="date"
          name="endDate"
          defaultValue={endDate}
          className="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-zinc-855 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          required
        />
        <button 
          type="submit" 
          className="px-4 py-2 bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-xl font-bold hover:bg-zinc-900 active:scale-[0.97] transition-all"
        >
          Query
        </button>
      </form>
    </div>
  );
}
