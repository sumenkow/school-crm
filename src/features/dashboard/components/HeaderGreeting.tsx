'use client';

import React from 'react';
import { useRole } from '@/context/RoleContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FULL_MONTH_NAMES_RU } from '../lib/analyticsHelpers';

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

  const getCleanName = () => {
    if (!userName) return role === 'owner' ? 'Андрей' : 'Администратор';
    const cleaned = userName
      .replace(/\s*(Разработчик|Руководитель|Администратор|Владелец|Учитель|Педагог|Manager|Admin|Developer|Owner)\b/gi, '')
      .trim();
    return cleaned ? cleaned.split(' ')[0] : userName.split(' ')[0];
  };

  const displayName = getCleanName();
  const now = new Date();
  const currentMonthName = FULL_MONTH_NAMES_RU[now.getMonth()];
  const currentYear = now.getFullYear();

  return (
    <div className="flex items-center justify-between gap-3 h-9 sm:h-10">
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
          {getGreeting()}, {displayName}!
        </h1>
        <p className="text-xs text-slate-400 mt-0.5 leading-none font-medium">
          Вот что происходит в вашей школе сегодня.
        </p>
      </div>

      {/* Compact Month Switcher */}
      <div className="flex items-center gap-1 bg-white border border-slate-200/90 rounded-lg px-2 py-0.5 shadow-2xs">
        <button
          type="button"
          className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          title="Предыдущий месяц"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-bold text-slate-800 px-1 select-none">
          {currentMonthName} {currentYear}
        </span>
        <button
          type="button"
          className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          title="Следующий месяц"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
