import React from 'react';
import { Settings } from 'lucide-react';

export default function SettingsLoading() {
  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-3xl mx-auto w-full animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-5 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-zinc-300 dark:text-zinc-700 tracking-tight flex items-center gap-2">
            Restaurant Settings <Settings className="w-4 h-4 text-zinc-300 dark:text-zinc-700" />
          </h1>
          <div className="h-3 w-56 bg-zinc-200 dark:bg-zinc-800 rounded mt-1.5" />
        </div>
      </div>

      {/* Form sections Skeletons */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6 flex flex-col gap-6">
        {[1, 2, 3].map((section) => (
          <div key={section} className="flex flex-col gap-4 pb-6 border-b border-zinc-150 dark:border-zinc-800 last:border-0 last:pb-0">
            <div className="h-4.5 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((field) => (
                <div key={field} className="flex flex-col gap-2">
                  <div className="h-3 w-24 bg-zinc-150 dark:bg-zinc-850 rounded" />
                  <div className="h-9 w-full bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex justify-end pt-2">
          <div className="h-9 w-32 bg-zinc-250 dark:bg-zinc-800 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
