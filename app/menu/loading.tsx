import React from 'react';
import { UtensilsCrossed } from 'lucide-react';

export default function MenuLoading() {
  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full animate-pulse">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-300 dark:text-zinc-700 tracking-tight flex items-center gap-2">
            Menu Management <UtensilsCrossed className="w-4 h-4 text-zinc-300 dark:text-zinc-700" />
          </h1>
          <div className="h-3 w-44 bg-zinc-200 dark:bg-zinc-800 rounded mt-1.5" />
        </div>
      </div>

      {/* Category Tabs Skeleton */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-zinc-200 dark:border-zinc-800">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg shrink-0" />
        ))}
      </div>

      {/* Grid of Menu Items Skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 6].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-5 flex flex-col gap-3"
          >
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1.5">
                <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-12 bg-zinc-150 dark:bg-zinc-850 rounded-full" />
              </div>
              <div className="h-5 w-14 bg-zinc-250 dark:bg-zinc-800 rounded" />
            </div>
            <div className="h-10 w-full bg-zinc-150 dark:bg-zinc-850 rounded" />
            <div className="flex justify-between items-center mt-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
              <div className="h-3.5 w-16 bg-zinc-150 dark:bg-zinc-850 rounded" />
              <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
