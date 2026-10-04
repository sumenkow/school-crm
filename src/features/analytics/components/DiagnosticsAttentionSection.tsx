'use client';

import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsFilters, AnalyticsTabKey, DiagnosticIssue } from '../types';
import { useDiagnosticsAnomalies } from '../hooks/useDiagnosticsAnomalies';
import { PERIOD_OPTIONS } from '../hooks/useAnalyticsFilters';
import { DiagnosticIssueCard } from './DiagnosticIssueCard';
import { DiagnosticRulesModal } from './DiagnosticRulesModal';
import { DiagnosticDrilldownModal } from './DiagnosticDrilldownModal';

export interface DiagnosticsAttentionSectionProps {
  filters: AnalyticsFilters;
  onNavigateTab?: (tab: AnalyticsTabKey) => void;
}

export function DiagnosticsAttentionSection({
  filters,
  onNavigateTab,
}: DiagnosticsAttentionSectionProps) {
  const {
    issues,
    filteredIssues,
    filterMode,
    setFilterMode,
    totalIssuesCount,
    criticalIssuesCount,
    mineIssuesCount,
    rules,
    setRules,
  } = useDiagnosticsAnomalies(filters);

  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<DiagnosticIssue | null>(null);

  const periodLabel =
    PERIOD_OPTIONS.find((p) => p.value === filters.period)?.label || 'выбранный период';

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs space-y-3">
      {/* 1. Header of the Attention block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 border-b border-slate-100 pb-2.5">
        {/* Left: Icon + Title + Total Count Badge + Subtitle */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-100 shadow-2xs">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm lg:text-base font-bold text-slate-900">
                Что требует внимания
              </h3>
              <span className="rounded-full bg-rose-100 text-rose-700 text-xs px-2 py-0.2 font-bold">
                {totalIssuesCount}
              </span>
            </div>
            <p className="text-[11.5px] text-slate-400">
              Автоматически выявленные проблемы и отклонения за {periodLabel}
            </p>
          </div>
        </div>

        {/* Right: Issue filter pills & Rules link */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <div className="flex items-center gap-0.5 bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer',
                filterMode === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              )}
            >
              Все проблемы {issues.length}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('critical')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer',
                filterMode === 'critical'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              )}
            >
              Критические {criticalIssuesCount}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('mine')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer',
                filterMode === 'mine'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              )}
            >
              Только мои {mineIssuesCount}
            </button>
          </div>

          <div className="h-3.5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

          <button
            type="button"
            onClick={() => setIsRulesModalOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50/70 transition-colors cursor-pointer"
          >
            <span>Настроить правила</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* 2. Horizontal Grid of 5 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {filteredIssues.map((issue) => (
          <DiagnosticIssueCard
            key={issue.id}
            issue={issue}
            onClick={() => setSelectedIssue(issue)}
            onNavigateTab={onNavigateTab}
          />
        ))}
      </div>

      {/* 3. Drill-down Detail Modal */}
      <DiagnosticDrilldownModal
        issue={selectedIssue}
        onClose={() => setSelectedIssue(null)}
        onNavigateTab={onNavigateTab}
      />

      {/* 4. Rules Settings Modal */}
      <DiagnosticRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        rules={rules}
        onSave={setRules}
      />
    </div>
  );
}
