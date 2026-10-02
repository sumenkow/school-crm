'use client';

import React from 'react';
import { useRole } from '@/context/RoleContext';
import { FileText, Sparkles, Plus, Calendar } from 'lucide-react';

interface HeaderGreetingProps {
  onOpenReport?: () => void;
  onOpenExecutiveReport?: () => void;
  onOpenCreateLead?: () => void;
}

export function HeaderGreeting({
  onOpenReport,
  onOpenExecutiveReport,
  onOpenCreateLead,
}: HeaderGreetingProps) {
  const { userName, role } = useRole();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Доброе утро';
    if (hour >= 12 && hour < 18) return 'Добрый день';
    if (hour >= 18 && hour < 23) return 'Добрый вечер';
    return 'Доброй ночи';
  };

  const todayFormatted = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const capitalizedDate = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);
  const displayName = userName || (role === 'owner' ? 'Руководитель' : 'Администратор');

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {getGreeting()}, {displayName}! Вот что происходит в вашей школе сегодня.
        </h1>
        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            {capitalizedDate}
          </span>
          <span>•</span>
          <span className="text-slate-600 font-semibold">
            {role === 'owner' ? 'Кабинет владельца школы' : 'Оперативная панель управления'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        {onOpenReport && (
          <button
            type="button"
            onClick={onOpenReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Дневной отчёт</span>
          </button>
        )}

        {onOpenExecutiveReport && (
          <button
            type="button"
            onClick={onOpenExecutiveReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/70 hover:bg-indigo-100 transition-all cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Сводка дня</span>
          </button>
        )}

        {onOpenCreateLead && (
          <button
            type="button"
            onClick={onOpenCreateLead}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer shadow-xs shadow-blue-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Новый лид</span>
          </button>
        )}
      </div>
    </div>
  );
}
