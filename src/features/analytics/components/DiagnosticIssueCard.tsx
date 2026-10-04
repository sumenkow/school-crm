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
          <div className="h-5 w-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-[10px] shrink-0">
            !
          </div>
        );
      case 'churn_risk':
        return (
          <div className="h-5 w-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-3 w-3" />
          </div>
        );
      case 'underfilled_groups':
        return (
          <div className="h-5 w-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-3 w-3" />
          </div>
        );
      case 'stale_leads':
        return (
          <div className="h-5 w-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="h-3 w-3" />
          </div>
        );
      case 'teacher_attendance':
        return (
          <div className="h-5 w-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <GraduationCap className="h-3 w-3" />
          </div>
        );
      default:
        return (
          <div className="h-5 w-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-3 w-3" />
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
        'h-[110px] p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs flex flex-col justify-between',
        'transition-all duration-150 cursor-pointer relative group select-none min-w-0',
        'hover:shadow-xs hover:border-slate-300 active:scale-[0.99]'
      )}
    >
      {/* 1. Top row: Micro icon + Chevron */}
      <div className="flex items-center justify-between">
        {getIssueIcon()}
        <div className="text-slate-300 group-hover:text-slate-500 transition-colors">
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* 2. Problem Title */}
      <div className="min-w-0 my-0.5">
        <h4 className="font-semibold text-xs text-slate-900 leading-snug line-clamp-2" title={issue.title}>
          {issue.title}
        </h4>
      </div>

      {/* 3. Metrics & Note line */}
      <div className="min-w-0">
        {issue.id === 'trial_conversion' ? (
          <div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">{issue.statsText}</span>
              <span className="font-bold text-rose-600">{issue.deltaBadge}</span>
            </div>
            <p className="text-[10.5px] text-slate-400 truncate mt-0.5">{issue.scaleText}</p>
          </div>
        ) : issue.id === 'churn_risk' ? (
          <div>
            <p className="text-[10.5px] text-slate-400 truncate">{issue.statsText}</p>
            <p className="text-xs font-bold text-rose-600 mt-0.5">{issue.deltaBadge}</p>
          </div>
        ) : issue.id === 'underfilled_groups' ? (
          <div>
            <p className="text-[10.5px] text-slate-400 truncate">{issue.statsText}</p>
            <p className="text-xs font-bold text-rose-600 mt-0.5">{issue.deltaBadge}</p>
          </div>
        ) : issue.id === 'stale_leads' ? (
          <div>
            <p className="text-[10.5px] text-slate-400 truncate">{issue.scaleText || issue.statsText}</p>
            <p className="text-xs font-bold text-blue-600 mt-0.5">{issue.deltaBadge}</p>
          </div>
        ) : (
          <div>
            <p className="text-[10.5px] text-slate-400 truncate" title={issue.scaleText}>
              {issue.scaleText}
            </p>
            <p className="text-xs font-bold text-purple-600 mt-0.5">{issue.deltaBadge}</p>
          </div>
        )}
      </div>
    </div>
  );
}
