'use client';

import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  CreditCard,
  BookOpen,
  GraduationCap,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsTabKey } from '../types';

export interface AnalyticsTabsNavProps {
  activeTab: AnalyticsTabKey;
  onTabChange: (tab: AnalyticsTabKey) => void;
}

interface TabConfig {
  key: AnalyticsTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isReady?: boolean;
}

const TABS: TabConfig[] = [
  {
    key: 'diagnostics',
    label: 'Диагностика',
    icon: BarChart3,
    isReady: true,
  },
  {
    key: 'sales',
    label: 'Продажи и конверсия',
    icon: TrendingUp,
    isReady: false,
  },
  {
    key: 'retention',
    label: 'Ученики и удержание',
    icon: Users,
    isReady: false,
  },
  {
    key: 'finance',
    label: 'Финансы и доходность',
    icon: CreditCard,
    isReady: false,
  },
  {
    key: 'groups',
    label: 'Группы',
    icon: BookOpen,
    isReady: false,
  },
  {
    key: 'teachers',
    label: 'Преподаватели',
    icon: GraduationCap,
    isReady: false,
  },
  {
    key: 'reports',
    label: 'Детальные отчеты',
    icon: FileText,
    isReady: false,
  },
];

export function AnalyticsTabsNav({ activeTab, onTabChange }: AnalyticsTabsNavProps) {
  return (
    <div className="h-10 border-b border-slate-200/80 mb-5 flex items-center gap-2 text-xs font-semibold overflow-x-auto no-scrollbar">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={cn(
              'rounded-xl px-3.5 py-2 flex items-center gap-2 transition-all cursor-pointer shrink-0 select-none',
              isActive
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-semibold'
            )}
          >
            <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-white' : 'text-slate-500')} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
