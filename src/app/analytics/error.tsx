'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, LayoutDashboard, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

export default function AnalyticsErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error('Analytics page runtime error captured by boundary:', error);
  }, [error]);

  const handleResetFiltersAndCache = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('crm_diagnostic_rules_v1');
      }
    } catch (e) {
      console.warn('Could not clear diagnostic rules storage:', e);
    }
    reset();
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4 shadow-xs">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        Не удалось загрузить раздел аналитики
      </h2>
      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
        Произошла временная ошибка при обработке данных отчетов. Пожалуйста, обновите страницу или вернитесь на главную панель.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Повторить попытку
        </button>
        <button
          onClick={handleResetFiltersAndCache}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          title="Сбросить сохраненные фильтры и правила аномалий"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
          Сбросить фильтры и кэш
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          В дашборд
        </Link>
      </div>

      {/* Technical Diagnostics Details */}
      <div className="w-full max-w-xl text-left border border-slate-200 rounded-xl bg-slate-50/70 p-3 text-xs">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center justify-between w-full font-semibold text-slate-700 hover:text-slate-900 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Технические подробности сбоя
          </span>
          {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showDetails && (
          <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 font-mono text-[11px] text-slate-700 break-words">
            <div>
              <span className="font-bold text-slate-900">Ошибка:</span> {error?.name || 'Error'}: {error?.message || 'Неизвестная ошибка'}
            </div>
            {error?.digest && (
              <div>
                <span className="font-bold text-slate-900">Digest:</span> {error.digest}
              </div>
            )}
            {error?.stack && (
              <pre className="p-2 bg-slate-900 text-slate-100 rounded-lg text-[10px] overflow-x-auto max-h-48 whitespace-pre-wrap">
                {error.stack}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
