import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full select-none animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="h-6 w-48 bg-zinc-200 rounded-lg" />
          <div className="h-4 w-72 bg-zinc-200 rounded-md mt-2" />
        </div>
        <div className="h-8 w-36 bg-zinc-200 rounded-xl" />
      </div>

      {/* KPI Cards Row skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="p-5 bg-white border border-zinc-200 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 bg-zinc-200 rounded" />
              <div className="h-8 w-8 bg-zinc-150 rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="h-6 w-28 bg-zinc-200 rounded-md" />
              <div className="h-3 w-40 bg-zinc-200 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom row grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products Card skeleton */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 h-[340px] flex flex-col justify-between">
          <div className="h-4 w-40 bg-zinc-200 rounded mb-4" />
          <div className="flex-1 space-y-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex justify-between items-center py-1">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-zinc-200 rounded" />
                  <div className="h-3.5 w-32 bg-zinc-200 rounded" />
                </div>
                <div className="flex gap-4">
                  <div className="h-3 w-16 bg-zinc-150 rounded" />
                  <div className="h-3.5 w-12 bg-zinc-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Logs Card skeleton */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 h-[340px] flex flex-col justify-between">
          <div className="h-4 w-40 bg-zinc-200 rounded mb-4" />
          <div className="flex-1 space-y-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-zinc-200 shrink-0 mt-1.5" />
                <div className="space-y-1.5 flex-1">
                  <div className="flex justify-between">
                    <div className="h-2.5 w-16 bg-zinc-200 rounded" />
                    <div className="h-2.5 w-20 bg-zinc-150 rounded" />
                  </div>
                  <div className="h-3 w-full bg-zinc-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
