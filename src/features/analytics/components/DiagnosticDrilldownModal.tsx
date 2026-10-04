'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, ExternalLink, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiagnosticIssue, AnalyticsTabKey } from '../types';

export interface DiagnosticDrilldownModalProps {
  issue: DiagnosticIssue | null;
  onClose: () => void;
  onNavigateTab?: (tab: AnalyticsTabKey) => void;
}

export function DiagnosticDrilldownModal({
  issue,
  onClose,
  onNavigateTab,
}: DiagnosticDrilldownModalProps) {
  const router = useRouter();

  if (!issue) return null;

  const handleMainAction = () => {
    onClose();
    if (issue.drillDownTab && onNavigateTab) {
      onNavigateTab(issue.drillDownTab);
    } else if (issue.drillDownUrl) {
      router.push(issue.drillDownUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="space-y-1 pr-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {issue.title}
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {issue.deltaBadge}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {issue.scaleText} • {issue.statsText}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Affected Items List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Выявленные сущности ({issue.affectedItems.length}):</span>
            <span className="text-slate-400 font-normal">Прямой переход к объекту</span>
          </div>

          {issue.affectedItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-emerald-500" />
              Отклонений не обнаружено, все показатели соответствуют норме.
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-50">
              {issue.affectedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/90 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="text-[11px] text-slate-500 truncate">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.value && (
                      <span className="text-xs font-semibold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200/80">
                        {item.value}
                      </span>
                    )}
                    {item.link && (
                      <Link
                        href={item.link}
                        onClick={onClose}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold hover:text-blue-800 p-1"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Закрыть
          </button>

          <button
            type="button"
            onClick={handleMainAction}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <span>{issue.drillDownActionLabel}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
