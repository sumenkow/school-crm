'use client';

import React from 'react';
import {
  LayoutDashboard,
  Filter,
  Users,
  CreditCard,
  BookOpen,
  GraduationCap,
  FileSpreadsheet,
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
    icon: LayoutDashboard,
    isReady: true,
  },
  {
    key: 'sales',
    label: 'Продажи и конверсия',
    icon: Filter,
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
    label: 'Детальные отчёты',
    icon: FileSpreadsheet,
    isReady: false,
  },
];

export function AnalyticsTabsNav({ activeTab, onTabChange }: AnalyticsTabsNavProps) {
  return (
    <div className="h-[38px] bg-white rounded-xl p-1 border border-slate-200/70 shadow-2xs mb-3 flex items-center gap-1 text-xs font-semibold overflow-x-auto no-scrollbar">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={cn(
              'h-[30px] rounded-lg px-3 py-1 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 select-none text-xs',
              isActive
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
            )}
          >
            <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-white' : 'text-slate-400')} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
