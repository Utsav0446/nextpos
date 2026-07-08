import React from 'react';

export default function OrdersLoading() {
  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full bg-zinc-50 select-none animate-pulse overflow-hidden">
      {/* Left side: Menu items & search */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-6">
        {/* Top search & title */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <div className="h-6 w-32 bg-zinc-200 rounded-lg" />
            <div className="h-3 w-48 bg-zinc-200 rounded mt-1.5" />
          </div>
          <div className="h-10 w-full sm:w-64 bg-zinc-200 rounded-xl" />
        </div>

        {/* Categories slider skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-9 w-24 bg-zinc-200 rounded-full shrink-0" />
          ))}
        </div>

        {/* Menu Items Grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={idx} className="bg-white border border-zinc-200 rounded-2xl p-3 flex flex-col justify-between space-y-3 min-h-[160px]">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-28 bg-zinc-200 rounded" />
                  <div className="h-3 w-36 bg-zinc-200 rounded" />
                </div>
                <div className="h-4 w-4 bg-zinc-200 rounded-full shrink-0" />
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-zinc-50 mt-auto">
                <div className="h-5 w-12 bg-zinc-200 rounded" />
                <div className="h-7 w-7 bg-zinc-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right side: Cart Summary sidebar */}
      <div className="w-full lg:w-[380px] bg-white border-t lg:border-t-0 lg:border-l border-zinc-200 p-4 sm:p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-zinc-100">
            <div className="h-5 w-24 bg-zinc-200 rounded" />
            <div className="h-4 w-12 bg-zinc-200 rounded" />
          </div>

          {/* Cart items list skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="flex justify-between items-center gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-32 bg-zinc-200 rounded" />
                  <div className="h-2.5 w-16 bg-zinc-200 rounded" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-6 w-16 bg-zinc-150 rounded" />
                  <div className="h-3.5 w-10 bg-zinc-200 rounded text-right" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom checkout details */}
        <div className="mt-8 space-y-4 pt-4 border-t border-zinc-100">
          <div className="flex justify-between">
            <div className="h-3 w-16 bg-zinc-200 rounded" />
            <div className="h-3.5 w-12 bg-zinc-200 rounded" />
          </div>
          <div className="flex justify-between">
            <div className="h-3 w-16 bg-zinc-200 rounded" />
            <div className="h-3.5 w-12 bg-zinc-200 rounded" />
          </div>
          <div className="flex justify-between pt-2 border-t border-zinc-50">
            <div className="h-4 w-20 bg-zinc-200 rounded" />
            <div className="h-5 w-16 bg-zinc-200 rounded" />
          </div>
          <div className="h-12 w-full bg-zinc-200 rounded-2xl mt-4" />
        </div>
      </div>
    </div>
  );
}
