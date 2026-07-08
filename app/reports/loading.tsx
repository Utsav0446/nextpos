import React from 'react';

export default function ReportsLoading() {
  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full select-none animate-pulse">
      {/* Header Controls Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="h-6 w-48 bg-zinc-200 rounded-lg" />
          <div className="h-4 w-96 bg-zinc-200 rounded-md mt-2" />
        </div>
        <div className="h-10 w-32 bg-zinc-200 rounded-xl" />
      </div>

      {/* Date Period Selector Skeleton */}
      <div className="bg-white border border-zinc-200 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-24 bg-zinc-200 rounded-lg" />
          ))}
        </div>
        <div className="h-9 w-64 bg-zinc-150 rounded-lg" />
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="p-5 bg-white border border-zinc-200 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 bg-zinc-200 rounded" />
              <div className="h-8 w-8 bg-zinc-150 rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="h-6 w-24 bg-zinc-200 rounded-md" />
              <div className="h-3 w-40 bg-zinc-200 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Additional Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white border border-zinc-200 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 bg-zinc-150 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-32 bg-zinc-200 rounded" />
              <div className="h-4 w-40 bg-zinc-200 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4.5 border-b border-zinc-100 bg-zinc-50/50">
          <div className="h-4 w-48 bg-zinc-200 rounded" />
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between pb-3 border-b border-zinc-100">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div key={idx} className="h-3 w-16 bg-zinc-200 rounded" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, rIdx) => (
            <div key={rIdx} className="flex justify-between items-center py-2">
              <div className="h-4 w-20 bg-zinc-200 rounded" />
              <div className="h-3 w-14 bg-zinc-150 rounded" />
              <div className="h-4 w-16 bg-zinc-200 rounded" />
              <div className="h-4 w-16 bg-zinc-200 rounded" />
              <div className="h-4 w-16 bg-zinc-200 rounded" />
              <div className="h-4 w-16 bg-zinc-200 rounded" />
              <div className="h-4 w-20 bg-zinc-200 rounded text-right" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
