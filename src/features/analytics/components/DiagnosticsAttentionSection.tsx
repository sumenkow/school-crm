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
    <div className="rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-2xs flex flex-col justify-between h-[106px] shrink-0 overflow-hidden">
      {/* 1. Header of the Attention block */}
      <div className="h-[18px] flex items-center justify-between">
        {/* Left: Icon + Title + Total Count Badge + Subtitle */}
        <div className="flex items-center gap-1.5">
          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-rose-50 text-rose-600 border border-rose-100 shadow-2xs">
            <AlertTriangle className="h-2.5 w-2.5" />
          </div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-bold text-slate-900 leading-none">
              Что требует внимания
            </h3>
            <span className="rounded-full bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0.2 font-bold">
              {totalIssuesCount}
            </span>
            <p className="hidden xl:inline text-[10px] text-slate-400 truncate ml-1 leading-none">
              Автоматически выявленные проблемы и отклонения
            </p>
          </div>
        </div>

        {/* Right: Issue filter pills & Rules link */}
        <div className="flex items-center gap-1 text-[10px]">
          <div className="p-0.5 rounded-lg bg-slate-100/90 border border-slate-200/60 flex items-center gap-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={cn(
                'h-4.5 px-1.5 py-0 text-[10px] font-semibold rounded-md transition-all cursor-pointer inline-flex items-center leading-none',
                filterMode === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              )}
            >
              <span>Все проблемы</span>
              <span className={cn('ml-1 px-1 py-0 rounded-full text-[9px] font-bold', filterMode === 'all' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700')}>
                {issues.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('critical')}
              className={cn(
                'h-4.5 px-1.5 py-0 text-[10px] font-semibold rounded-md transition-all cursor-pointer inline-flex items-center leading-none',
                filterMode === 'critical'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              )}
            >
              <span>Только критичные</span>
              <span className={cn('ml-1 px-1 py-0 rounded-full text-[9px] font-bold', filterMode === 'critical' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700')}>
                {criticalIssuesCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('mine')}
              className={cn(
                'h-4.5 px-1.5 py-0 text-[10px] font-semibold rounded-md transition-all cursor-pointer inline-flex items-center leading-none',
                filterMode === 'mine'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              )}
            >
              <span>Только мои</span>
              <span className={cn('ml-1 px-1 py-0 rounded-full text-[9px] font-bold', filterMode === 'mine' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700')}>
                {mineIssuesCount}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsRulesModalOpen(true)}
            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50/70 transition-colors cursor-pointer"
          >
            <span>Настроить правила</span>
            <ArrowRight className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {/* 2. Horizontal Grid of 5 Cards */}
      <div className="grid grid-cols-5 gap-1.5">
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
