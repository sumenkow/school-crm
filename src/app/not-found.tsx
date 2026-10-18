import React from 'react';
import Link from 'next/link';
import { Compass, Home, Users, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm">
        {/* Emblem */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#1565C0] border border-blue-100 shadow-2xs">
          <Compass className="h-8 w-8 stroke-[1.8] animate-pulse" />
        </div>

        {/* Status pill */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span>Код 404 • Ошибка навигации</span>
        </div>

        {/* Heading & description */}
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Страница не найдена
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
          Запрошенный раздел был перемещен или никогда не существовал. Проверьте правильность введенного адреса.
        </p>

        {/* Action buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
          <Link
            href="/dashboard"
            className="w-full sm:flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1565C0] px-4 text-xs sm:text-sm font-semibold text-white shadow-2xs hover:bg-[#1251A0] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Home className="h-4 w-4" />
            <span>На главную</span>
          </Link>
          <Link
            href="/crm"
            className="w-full sm:flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.99] transition-all cursor-pointer"
          >
            <Users className="h-4 w-4 text-slate-500" />
            <span>CRM и Лиды</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
