'use client';

import React from 'react';
import {
  TrendingDown,
  UserMinus,
  Users,
  Clock,
  GraduationCap,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsTabKey, DiagnosticIssue } from '../types';

export interface DiagnosticIssueCardProps {
  issue: DiagnosticIssue;
  onClick: () => void;
  onNavigateTab?: (tab: AnalyticsTabKey) => void;
}

export function DiagnosticIssueCard({
  issue,
  onClick,
  onNavigateTab,
}: DiagnosticIssueCardProps) {
  const getStatusBadge = () => {
    if (issue.isHealthy) {
      return {
        label: 'В норме',
        dot: '🟢',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      };
    }
    switch (issue.id) {
      case 'trial_conversion':
        return {
          label: 'Критическая',
          dot: '🔴',
          className: 'bg-rose-50 text-rose-700 border-rose-200/80',
        };
      case 'churn_risk':
        return {
          label: 'Высокий риск',
          dot: '🟠',
          className: 'bg-amber-50 text-amber-700 border-amber-200/80',
        };
      case 'underfilled_groups':
        return {
          label: 'Потеря выручки',
          dot: '🟡',
          className: 'bg-amber-50/80 text-amber-800 border-amber-200/80',
        };
      case 'stale_leads':
        return {
          label: 'Требует внимания',
          dot: '🔵',
          className: 'bg-blue-50 text-blue-700 border-blue-200/80',
        };
      case 'teacher_attendance':
        return {
          label: 'Снижение показателей',
          dot: '🟣',
          className: 'bg-purple-50 text-purple-700 border-purple-200/80',
        };
      default:
        return {
          label: 'Внимание',
          dot: '🟡',
          className: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  const status = getStatusBadge();

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (issue.drillDownTab && onNavigateTab) {
      onNavigateTab(issue.drillDownTab);
    } else {
      onClick();
    }
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'h-[118px] p-2.5 px-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs flex flex-col justify-between',
        'transition-all duration-150 cursor-pointer relative group select-none min-w-0',
        'hover:shadow-xs hover:border-slate-300 active:scale-[0.99]'
      )}
    >
      {/* 1. Top row: Micro icon + Status pill */}
      <div className="flex items-center justify-between">
        <div
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-bold border',
            status.className
          )}
        >
          <span>{status.dot}</span>
          <span>{status.label}</span>
        </div>
        <div className="text-slate-300 group-hover:text-slate-500 transition-colors">
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* 2. Problem Title */}
      <div className="min-w-0">
        <h4 className="font-bold text-xs text-slate-900 leading-tight truncate" title={issue.title}>
          {issue.title}
        </h4>
      </div>

      {/* 3. Main Metric & Delta */}
      <div className="flex items-center justify-between gap-1 text-[11px] min-w-0">
        <span className="text-slate-500 font-medium truncate max-w-[62%]">
          {issue.statsText}
        </span>
        <span
          className={cn(
            'font-bold px-1 py-0.2 rounded text-[10.5px] whitespace-nowrap',
            issue.deltaType === 'negative'
              ? 'text-rose-600 bg-rose-50 border border-rose-100'
              : issue.deltaType === 'positive'
              ? 'text-emerald-700 bg-emerald-50 border border-emerald-100'
              : 'text-slate-700 bg-slate-100'
          )}
        >
          {issue.deltaBadge}
        </span>
      </div>

      {/* 4. Bottom row: Short explanation + Action CTA */}
      <div className="flex items-center justify-between text-[10.5px] pt-1 border-t border-slate-100/80 min-w-0">
        <span className="text-slate-400 truncate max-w-[50%]" title={issue.scaleText}>
          {issue.scaleText}
        </span>
        <button
          type="button"
          onClick={handleActionClick}
          className="font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-0.5 shrink-0 transition-colors cursor-pointer"
        >
          <span>{issue.drillDownActionLabel}</span>
        </button>
      </div>
    </div>
  );
}
