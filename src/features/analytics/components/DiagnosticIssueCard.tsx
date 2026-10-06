'use client';

import React from 'react';
import {
  TrendingDown,
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
  const getIssueIcon = () => {
    if (issue.isHealthy) {
      return (
        <div className="h-3.5 w-3.5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="h-2.5 w-2.5" />
        </div>
      );
    }

    switch (issue.id) {
      case 'trial_conversion':
        return (
          <div className="h-3.5 w-3.5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <TrendingDown className="h-2.5 w-2.5" />
          </div>
        );
      case 'churn_risk':
        return (
          <div className="h-3.5 w-3.5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-2.5 w-2.5" />
          </div>
        );
      case 'underfilled_groups':
        return (
          <div className="h-3.5 w-3.5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Users className="h-2.5 w-2.5" />
          </div>
        );
      case 'stale_leads':
        return (
          <div className="h-3.5 w-3.5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="h-2.5 w-2.5" />
          </div>
        );
      case 'teacher_attendance':
        return (
          <div className="h-3.5 w-3.5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <GraduationCap className="h-2.5 w-2.5" />
          </div>
        );
      default:
        return (
          <div className="h-3.5 w-3.5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-2.5 w-2.5" />
          </div>
        );
    }
  };

  const handleClick = () => {
    onClick();
  };

  const handleActionClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (issue.drillDownTab && onNavigateTab) {
      onNavigateTab(issue.drillDownTab);
    } else {
      onClick();
    }
  };

  const formatDeltaBadge = (deltaBadge?: string) => {
    if (!deltaBadge) return '';
    const clean = deltaBadge.replace(/[()]/g, '').trim();
    if (!clean) return '';
    if (clean.startsWith('+') || clean.startsWith('-')) {
      return clean;
    }
    if (/^\d/.test(clean)) {
      return `+${clean}`;
    }
    return clean;
  };

  const renderKpiRow = () => {
    if (issue.isHealthy) {
      return (
        <div
          className="flex items-center gap-1 text-[10px] leading-tight font-medium min-w-0"
          title={issue.deltaBadge ? `${issue.statsText} (${issue.deltaBadge})` : issue.statsText}
        >
          <span className="text-slate-600 truncate">{issue.statsText}</span>
          {issue.deltaBadge && (
            <span className="font-bold text-emerald-600 shrink-0">({issue.deltaBadge})</span>
          )}
        </div>
      );
    }

    switch (issue.id) {
      case 'trial_conversion': {
        const cleanDelta = issue.deltaBadge ? issue.deltaBadge.replace(/[()]/g, '').trim() : '';
        return (
          <div
            className="flex items-center gap-1 text-[10px] leading-tight font-medium min-w-0"
            title={cleanDelta ? `${issue.statsText} (${cleanDelta})` : issue.statsText}
          >
            <span className="text-slate-700 truncate">{issue.statsText}</span>
            {cleanDelta && (
              <span className="font-bold text-rose-600 shrink-0">
                ({cleanDelta})
              </span>
            )}
          </div>
        );
      }
      case 'churn_risk': {
        const delta = formatDeltaBadge(issue.deltaBadge);
        return (
          <div
            className="flex items-center gap-1 text-[10px] leading-tight font-medium min-w-0"
            title={delta ? `${issue.statsText} (${delta})` : issue.statsText}
          >
            <span className="text-slate-700 truncate">{issue.statsText}</span>
            {delta && (
              <span className="font-bold text-rose-600 shrink-0">
                ({delta})
              </span>
            )}
          </div>
        );
      }
      case 'underfilled_groups':
        return (
          <div
            className="flex items-center gap-1 text-[10px] leading-tight font-medium min-w-0"
            title={issue.deltaBadge ? `Потеря: ${issue.deltaBadge}` : 'Потеря выручки'}
          >
            <span className="text-slate-500 shrink-0">Потеря:</span>
            <span className="font-bold text-rose-600 shrink-0 whitespace-nowrap">{issue.deltaBadge}</span>
          </div>
        );
      case 'stale_leads': {
        const delta = formatDeltaBadge(issue.deltaBadge);
        return (
          <div
            className="flex items-center gap-1 text-[10px] leading-tight font-medium min-w-0"
            title={delta ? `${issue.statsText} (${delta})` : issue.statsText}
          >
            <span className="text-slate-700 truncate">{issue.statsText}</span>
            {delta && (
              <span className="font-bold text-blue-600 shrink-0">
                ({delta})
              </span>
            )}
          </div>
        );
      }
      case 'teacher_attendance':
        return (
          <div
            className="flex items-center gap-1 text-[10px] leading-tight font-medium min-w-0"
            title={issue.deltaBadge ? `Спад явки: ${issue.deltaBadge}` : 'Спад явки'}
          >
            <span className="text-slate-500 shrink-0">Спад явки:</span>
            <span className="font-bold text-purple-600 shrink-0 whitespace-nowrap">{issue.deltaBadge}</span>
          </div>
        );
      default:
        return (
          <div
            className="flex items-center gap-1 text-[10px] leading-tight font-medium min-w-0"
            title={issue.deltaBadge ? `${issue.statsText} (${issue.deltaBadge})` : issue.statsText}
          >
            <span className="text-slate-700 truncate">{issue.statsText}</span>
            {issue.deltaBadge && (
              <span className="font-bold text-slate-600 shrink-0">({issue.deltaBadge})</span>
            )}
          </div>
        );
    }
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        'h-[74px] p-1.5 bg-white border border-slate-200/90 rounded-lg shadow-2xs flex items-stretch gap-1.5 overflow-hidden',
        'transition-all duration-150 cursor-pointer relative group select-none min-w-0',
        'hover:shadow-xs hover:border-slate-300'
      )}
    >
      {/* 1. Status icon badge pinned to upper left */}
      <div className="shrink-0 pt-0.5">
        {getIssueIcon()}
      </div>

      {/* 2. Textual content & KPI metrics block in 2-3 compact lines */}
      <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
        {/* Row 1: Problem Title */}
        <h4
          className="font-semibold text-[11px] text-slate-900 leading-tight truncate"
          title={issue.title}
        >
          {issue.title}
        </h4>

        {/* Row 2: KPI & Dynamics */}
        {renderKpiRow()}

        {/* Row 3: Subtext / Context */}
        {issue.scaleText && (
          <div
            className="text-[10px] leading-tight text-slate-400 truncate"
            title={issue.scaleText}
          >
            {issue.scaleText}
          </div>
        )}
      </div>

      {/* 3. Navigation Chevron «>» button */}
      <button
        type="button"
        onClick={handleActionClick}
        aria-label={`Перейти: ${issue.title}`}
        title={issue.drillDownActionLabel || 'Перейти к разделу'}
        className="shrink-0 self-center text-slate-300 hover:text-slate-600 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all p-0.5 rounded hover:bg-slate-100 cursor-pointer"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
