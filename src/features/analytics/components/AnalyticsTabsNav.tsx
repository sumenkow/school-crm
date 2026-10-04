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
    <div className="h-7 bg-white rounded-lg p-0.5 border border-slate-200/70 shadow-2xs flex items-center gap-0.5 text-[11px] font-semibold overflow-x-auto no-scrollbar shrink-0">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={cn(
              'h-[24px] rounded-md px-2 py-0.5 flex items-center gap-1 text-[11px] select-none shrink-0 transition-all cursor-pointer',
              isActive
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
            )}
          >
            <Icon className={cn('h-3 w-3', isActive ? 'text-white' : 'text-slate-400')} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
