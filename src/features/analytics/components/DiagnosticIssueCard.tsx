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
  const getIssueIcon = () => {
    switch (issue.id) {
      case 'trial_conversion':
        return (
          <div className="h-3.5 w-3.5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-[9px] shrink-0">
            !
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
            <AlertTriangle className="h-2.5 w-2.5" />
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
    if (issue.drillDownTab && onNavigateTab) {
      onNavigateTab(issue.drillDownTab);
    } else {
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        'h-[74px] p-1.5 bg-white border border-slate-200/90 rounded-lg shadow-2xs flex flex-col justify-between overflow-hidden',
        'transition-all duration-150 cursor-pointer relative group select-none min-w-0',
        'hover:shadow-xs hover:border-slate-300'
      )}
    >
      {/* 1. Top row: Micro icon + Chevron */}
      <div className="flex items-center justify-between">
        {getIssueIcon()}
        <div className="text-slate-300 group-hover:text-slate-500 transition-colors">
          <ChevronRight className="h-3 w-3" />
        </div>
      </div>

      {/* 2. Problem Title */}
      <div className="min-w-0">
        <h4 className="font-semibold text-[11px] text-slate-900 leading-tight line-clamp-1 truncate" title={issue.title}>
          {issue.title}
        </h4>
      </div>

      {/* 3. Metrics & Note line */}
      <div className="flex items-center justify-between text-[10px] leading-tight min-w-0">
        {issue.id === 'trial_conversion' ? (
          <>
            <span className="text-[10px] text-slate-500 truncate">{issue.statsText}</span>
            <span className="text-[10px] font-bold text-rose-600 shrink-0 ml-1">{issue.deltaBadge}</span>
          </>
        ) : issue.id === 'churn_risk' ? (
          <>
            <span className="text-[10px] text-slate-500 truncate" title={issue.statsText}>{issue.statsText}</span>
            <span className="text-[10px] font-bold text-rose-600 shrink-0 ml-1">{issue.deltaBadge}</span>
          </>
        ) : issue.id === 'underfilled_groups' ? (
          <>
            <span className="text-[10px] text-slate-500 truncate" title={issue.statsText}>{issue.statsText}</span>
            <span className="text-[10px] font-bold text-rose-600 shrink-0 ml-1">{issue.deltaBadge}</span>
          </>
        ) : issue.id === 'stale_leads' ? (
          <>
            <span className="text-[10px] text-slate-500 truncate" title={issue.scaleText || issue.statsText}>
              {issue.scaleText || issue.statsText}
            </span>
            <span className="text-[10px] font-bold text-blue-600 shrink-0 ml-1">{issue.deltaBadge}</span>
          </>
        ) : (
          <>
            <span className="text-[10px] text-slate-500 truncate" title={issue.scaleText}>
              {issue.scaleText}
            </span>
            <span className="text-[10px] font-bold text-purple-600 shrink-0 ml-1">{issue.deltaBadge}</span>
          </>
        )}
      </div>
    </div>
  );
}
