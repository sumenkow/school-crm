'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckSquare,
  MessageSquare,
  CreditCard,
  RefreshCw,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsFilters, DetailedReportsSubTabKey } from '../types';
import { useDetailedReportsData } from '../hooks/useDetailedReportsData';
import { AdminEfficiencyReport } from './AdminEfficiencyReport';
import { TasksSlaReport } from './TasksSlaReport';
import { CommunicationsReport } from './CommunicationsReport';
import { PaymentsReceivablesReport } from './PaymentsReceivablesReport';
import { RenewalsReport } from './RenewalsReport';
import { OperationsLogReport } from './OperationsLogReport';

export interface DetailedReportsSectionProps {
  filters: AnalyticsFilters;
  courses?: Array<{ id: string; name: string }>;
}

export function DetailedReportsSection({ filters }: DetailedReportsSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<DetailedReportsSubTabKey>('admin_efficiency');
  const data = useDetailedReportsData(filters);

  const subTabs: Array<{
    id: DetailedReportsSubTabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'admin_efficiency',
      label: 'Эффективность администраторов',
      icon: ShieldCheck,
    },
    {
      id: 'tasks_sla',
      label: 'Задачи и SLA',
      icon: CheckSquare,
    },
    {
      id: 'communications',
      label: 'Работа с обращениями',
      icon: MessageSquare,
    },
    {
      id: 'payments',
      label: 'Оплаты и дебиторка',
      icon: CreditCard,
    },
    {
      id: 'renewals',
      label: 'Продления и сопровождение',
      icon: RefreshCw,
    },
    {
      id: 'operations_log',
      label: 'Журнал операций',
      icon: History,
    },
  ];

  return (
    <div className="w-full space-y-3">
      {/* Sub-navigation bar for reports */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-1 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
                  isActive
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-white' : 'text-slate-500')} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Report View */}
      {activeSubTab === 'admin_efficiency' && (
        <AdminEfficiencyReport data={data} filters={filters} />
      )}
      {activeSubTab === 'tasks_sla' && (
        <TasksSlaReport data={data} filters={filters} />
      )}
      {activeSubTab === 'communications' && (
        <CommunicationsReport data={data} filters={filters} />
      )}
      {activeSubTab === 'payments' && (
        <PaymentsReceivablesReport data={data} filters={filters} />
      )}
      {activeSubTab === 'renewals' && (
        <RenewalsReport data={data} filters={filters} />
      )}
      {activeSubTab === 'operations_log' && (
        <OperationsLogReport data={data} filters={filters} />
      )}
    </div>
  );
}
