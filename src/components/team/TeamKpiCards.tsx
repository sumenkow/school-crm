'use client';

import React from 'react';
import { Users2, GraduationCap, Shield, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TeamKpiStats {
  total: number;
  teachers: number;
  admins: number;
  owners: number;
}

interface TeamKpiCardsProps {
  stats: TeamKpiStats;
  selectedRole?: string;
  onSelectRole?: (role: 'all' | 'teacher' | 'admin' | 'owner') => void;
}

export function TeamKpiCards({ stats, selectedRole = 'all', onSelectRole }: TeamKpiCardsProps) {
  const cards = [
    {
      id: 'all' as const,
      title: 'Всего сотрудников',
      count: stats.total,
      subtitle: 'Все активные и приглашенные',
      icon: Users2,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
    },
    {
      id: 'teacher' as const,
      title: 'Преподаватели',
      count: stats.teachers,
      subtitle: 'Ведут занятия и группы',
      icon: GraduationCap,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
    },
    {
      id: 'admin' as const,
      title: 'Администраторы',
      count: stats.admins,
      subtitle: 'Операционное управление',
      icon: Shield,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
    },
    {
      id: 'owner' as const,
      title: 'Владелец',
      count: stats.owners,
      subtitle: 'Суперпользователь (Owner)',
      icon: Crown,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedRole === card.id;

        return (
          <div
            key={card.id}
            onClick={() => onSelectRole?.(card.id)}
            className={cn(
              'group relative flex items-center justify-between p-4 rounded-xl bg-white border transition-all cursor-pointer shadow-2xs',
              isSelected
                ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-xs'
                : 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
            )}
          >
            <div className="min-w-0 pr-3">
              <span className="text-xs font-medium text-slate-500 block truncate">
                {card.title}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {card.count}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                {card.subtitle}
              </span>
            </div>

            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
                card.bgColor,
                card.color
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
