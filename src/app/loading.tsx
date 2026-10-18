import React from 'react';

export default function Loading() {
  return (
    <div className="flex flex-col flex-1 h-full w-full p-4 sm:p-6 space-y-6 animate-pulse select-none" aria-busy="true" aria-label="Загрузка страницы…">
      {/* Top bar skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200/80 rounded-xl" />
          <div className="h-3.5 w-72 bg-slate-100 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-slate-200/60 rounded-xl" />
          <div className="h-9 w-32 bg-slate-200/80 rounded-xl" />
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-slate-200/60 rounded-md" />
              <div className="h-4 w-4 bg-slate-100 rounded-full" />
            </div>
            <div className="h-6 w-16 bg-slate-200/80 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Main Workspace Skeleton */}
      <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-5 shadow-2xs space-y-4">
        {/* Table/Content Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="h-4 w-36 bg-slate-200/70 rounded-md" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-slate-100 rounded-lg" />
            <div className="h-8 w-24 bg-slate-100 rounded-lg" />
          </div>
        </div>

        {/* Rows */}
        {[1, 2, 3, 4, 5, 6].map((row) => (
          <div key={row} className="flex items-center gap-4 py-2 border-b border-slate-50 last:border-b-0">
            <div className="h-4 w-4 bg-slate-100 rounded" />
            <div className="h-4 w-32 bg-slate-200/60 rounded" />
            <div className="h-4 w-44 bg-slate-100 rounded hidden sm:block" />
            <div className="h-4 w-20 bg-slate-100 rounded ml-auto" />
            <div className="h-6 w-16 bg-slate-200/50 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
