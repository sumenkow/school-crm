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
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiagnosticIssue } from '../types';

export interface DiagnosticIssueCardProps {
  issue: DiagnosticIssue;
  onClick: () => void;
}

export function DiagnosticIssueCard({ issue, onClick }: DiagnosticIssueCardProps) {
  const getIcon = () => {
    if (issue.isHealthy) {
      return <CheckCircle2 className="h-4 w-4" />;
    }
    switch (issue.id) {
      case 'trial_conversion':
        return <TrendingDown className="h-4 w-4" />;
      case 'churn_risk':
        return <UserMinus className="h-4 w-4" />;
      case 'underfilled_groups':
        return <Users className="h-4 w-4" />;
      case 'stale_leads':
        return <Clock className="h-4 w-4" />;
      case 'teacher_attendance':
        return <GraduationCap className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityStyles = () => {
    if (issue.isHealthy) {
      return {
        badgeBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        deltaBg: 'bg-emerald-50 text-emerald-700 border-emerald-100/60',
        cardBorder: 'hover:border-emerald-300',
        indicator: 'bg-emerald-500',
      };
    }
    switch (issue.severity) {
      case 'critical':
        return {
          badgeBg: 'bg-rose-50 text-rose-600 border-rose-100',
          deltaBg: 'bg-rose-50 text-rose-600 border-rose-100/60',
          cardBorder: 'hover:border-rose-300',
          indicator: 'bg-rose-500',
        };
      case 'warning':
        return {
          badgeBg: 'bg-amber-50 text-amber-600 border-amber-100',
          deltaBg: 'bg-amber-50 text-amber-600 border-amber-100/60',
          cardBorder: 'hover:border-amber-300',
          indicator: 'bg-amber-500',
        };
      case 'info':
        return {
          badgeBg: 'bg-blue-50 text-blue-600 border-blue-100',
          deltaBg: 'bg-blue-50 text-blue-600 border-blue-100/60',
          cardBorder: 'hover:border-blue-300',
          indicator: 'bg-blue-500',
        };
      case 'notice':
        return {
          badgeBg: 'bg-purple-50 text-purple-600 border-purple-100',
          deltaBg: 'bg-purple-50 text-purple-600 border-purple-100/60',
          cardBorder: 'hover:border-purple-300',
          indicator: 'bg-purple-500',
        };
      default:
        return {
          badgeBg: 'bg-slate-50 text-slate-600 border-slate-100',
          deltaBg: 'bg-slate-50 text-slate-600 border-slate-100/60',
          cardBorder: 'hover:border-slate-300',
          indicator: 'bg-slate-400',
        };
    }
  };

  const styles = getSeverityStyles();

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
        'p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs flex flex-col justify-between',
        'transition-all duration-150 cursor-pointer relative group min-h-[160px] min-w-0 select-none',
        'hover:shadow-xs active:scale-[0.99]',
        styles.cardBorder
      )}
    >
      {/* Top row: Icon + Chevron */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div
            className={cn(
              'h-7 w-7 rounded-xl flex items-center justify-center border transition-transform duration-150 group-hover:scale-105',
              styles.badgeBg
            )}
          >
            {getIcon()}
          </div>
          <div className="flex items-center gap-1">
            {!issue.isHealthy && (
              <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', styles.indicator)} />
            )}
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Title */}
        <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-2 min-h-[2rem]">
          {issue.title}
        </h4>
      </div>

      {/* Middle row: Stats & Delta Badge */}
      <div className="my-2 space-y-1">
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <span className="text-xs text-slate-500 font-medium truncate max-w-[65%]">
            {issue.statsText}
          </span>
          <span
            className={cn(
              'text-[10.5px] font-bold px-1.5 py-0.5 rounded-md border whitespace-nowrap',
              styles.deltaBg
            )}
          >
            {issue.deltaBadge}
          </span>
        </div>
      </div>

      {/* Bottom row: Scale / affected count */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span className="truncate pr-1">{issue.scaleText}</span>
        <span className="text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Детали →
        </span>
      </div>
    </div>
  );
}
