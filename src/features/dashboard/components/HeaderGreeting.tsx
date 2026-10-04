'use client';

import React from 'react';
import { useRole } from '@/context/RoleContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FULL_MONTH_NAMES_RU } from '../lib/analyticsHelpers';
import { cn } from '@/lib/utils';

interface HeaderGreetingProps {
  selectedDate?: Date;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onResetMonth?: () => void;
  onOpenReport?: () => void;
  onOpenExecutiveReport?: () => void;
  onOpenCreateLead?: () => void;
}

export function HeaderGreeting({
  selectedDate,
  onPrevMonth,
  onNextMonth,
  onResetMonth,
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
    if (!userName) return role === 'owner' ? 'Владелец' : role === 'developer' ? 'Разработчик' : role === 'teacher' ? 'Преподаватель' : 'Администратор';
    const cleaned = userName
      .replace(/\s*(Разработчик|Руководитель|Администратор|Владелец|Учитель|Педагог|Manager|Admin|Developer|Owner)\b/gi, '')
      .trim();
    return cleaned ? cleaned.split(' ')[0] : userName.split(' ')[0];
  };

  const displayName = getCleanName();
  const activeDate = selectedDate || new Date();
  const currentMonthName = FULL_MONTH_NAMES_RU[activeDate.getMonth()];
  const currentYear = activeDate.getFullYear();

  const now = new Date();
  const isCurrentMonth = activeDate.getMonth() === now.getMonth() && activeDate.getFullYear() === now.getFullYear();

  return (
    <div className="flex items-center justify-between gap-3 h-9 sm:h-10">
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
          {getGreeting()}, {displayName}!
        </h1>
        <p className="text-xs text-slate-400 mt-0.5 leading-none font-medium">
          {isCurrentMonth ? 'Вот что происходит в вашей школе сегодня.' : `Архивные и расчетные данные за ${currentMonthName.toLowerCase()} ${currentYear} г.`}
        </p>
      </div>

      {/* Compact Month Switcher */}
      <div className="flex items-center gap-1 bg-white border border-slate-200/90 rounded-lg px-2 py-0.5 shadow-2xs">
        <button
          type="button"
          onClick={onPrevMonth}
          className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          title="Предыдущий месяц"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onResetMonth}
          className={cn(
            "text-xs font-bold px-1 select-none transition-colors cursor-pointer",
            isCurrentMonth ? "text-slate-800" : "text-blue-600 hover:underline"
          )}
          title={isCurrentMonth ? undefined : "Вернуться к текущему месяцу"}
        >
          {currentMonthName} {currentYear}
        </button>
        <button
          type="button"
          onClick={onNextMonth}
          className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          title="Следующий месяц"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
