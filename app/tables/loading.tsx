import React from 'react';

export default function TablesLoading() {
  return (
    <div className="flex-1 p-6 space-y-6 bg-zinc-50 select-none animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="h-6 w-48 bg-zinc-200 rounded-lg" />
          <div className="h-4 w-72 bg-zinc-200 rounded-md mt-2" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-32 bg-zinc-200 rounded-xl" />
          <div className="h-10 w-32 bg-zinc-200 rounded-xl" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 bg-white border border-zinc-200 rounded-2xl space-y-2">
            <div className="h-3 w-24 bg-zinc-200 rounded" />
            <div className="h-6 w-16 bg-zinc-200 rounded-md" />
          </div>
        ))}
      </div>

      {/* Filter and Search Bar Skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 border border-zinc-200 rounded-2xl">
        <div className="h-10 w-full sm:w-80 bg-zinc-150 rounded-xl" />
        <div className="flex gap-2 w-full sm:w-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-20 bg-zinc-200 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Grid of Tables Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 15 }).map((_, idx) => (
          <div key={idx} className="p-4 bg-white border border-zinc-200 rounded-2xl min-h-[140px] flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <div className="h-4 w-12 bg-zinc-200 rounded" />
                <div className="h-3 w-20 bg-zinc-200 rounded mt-1.5" />
              </div>
              <div className="h-5 w-16 bg-zinc-200 rounded-full" />
            </div>
            <div className="flex justify-between items-center pt-4 mt-auto border-t border-zinc-100">
              <div className="h-3 w-14 bg-zinc-200 rounded" />
              <div className="h-4 w-4 bg-zinc-200 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
