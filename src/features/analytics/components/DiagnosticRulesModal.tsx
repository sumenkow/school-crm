'use client';

import React, { useState } from 'react';
import { X, Sliders, RotateCcw, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { DiagnosticRules, DEFAULT_DIAGNOSTIC_RULES } from '../types';

export interface DiagnosticRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: DiagnosticRules;
  onSave: (rules: DiagnosticRules) => void;
}

export function DiagnosticRulesModal({
  isOpen,
  onClose,
  rules,
  onSave,
}: DiagnosticRulesModalProps) {
  const [localRules, setLocalRules] = useState<DiagnosticRules>(rules);

  if (!isOpen) return null;

  const handleReset = () => {
    setLocalRules(DEFAULT_DIAGNOSTIC_RULES);
  };

  const handleSave = () => {
    onSave(localRules);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Настройка правил диагностики
              </h3>
              <p className="text-xs text-slate-500">
                Пороговые значения для выявления аномалий и рисков
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-4 text-xs">
          {/* Rule 1: Trial Conversion */}
          <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span>Целевая конверсия пробных в оплату:</span>
              <span className="font-bold text-blue-600">{localRules.minTrialConversionRate}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="80"
              step="5"
              value={localRules.minTrialConversionRate}
              onChange={(e) =>
                setLocalRules({ ...localRules, minTrialConversionRate: Number(e.target.value) })
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Если конверсия ниже порога, карточка помечается как критическое отклонение.
            </p>
          </div>

          {/* Rule 2: Churn Attendance */}
          <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span>Порог риска оттока ученика (посещаемость):</span>
              <span className="font-bold text-amber-600">&lt; {localRules.maxChurnAttendanceRate}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="90"
              step="5"
              value={localRules.maxChurnAttendanceRate}
              onChange={(e) =>
                setLocalRules({ ...localRules, maxChurnAttendanceRate: Number(e.target.value) })
              }
              className="w-full accent-amber-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Ученики с явкой ниже указанного процента попадают в категорию риска.
            </p>
          </div>

          {/* Rule 3: Group Occupancy */}
          <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span>Минимальная заполненность групп:</span>
              <span className="font-bold text-amber-600">{localRules.minGroupOccupancyRate}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="90"
              step="5"
              value={localRules.minGroupOccupancyRate}
              onChange={(e) =>
                setLocalRules({ ...localRules, minGroupOccupancyRate: Number(e.target.value) })
              }
              className="w-full accent-amber-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Группы с заполнением меньше порога сигнализируют о недополученной выручке.
            </p>
          </div>

          {/* Rule 4: Stale Lead Time */}
          <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span>Лимит времени на первый контакт с лидом:</span>
              <span className="font-bold text-blue-600">{localRules.maxLeadContactHours} ч</span>
            </div>
            <input
              type="range"
              min="4"
              max="48"
              step="4"
              value={localRules.maxLeadContactHours}
              onChange={(e) =>
                setLocalRules({ ...localRules, maxLeadContactHours: Number(e.target.value) })
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Новые заявки без звонка дольше указанного времени считаются зависшими.
            </p>
          </div>

          {/* Rule 5: Teacher Attendance */}
          <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span>Порог средней посещаемости преподавателя:</span>
              <span className="font-bold text-purple-600">{localRules.minTeacherAttendanceRate}%</span>
            </div>
            <input
              type="range"
              min="60"
              max="95"
              step="5"
              value={localRules.minTeacherAttendanceRate}
              onChange={(e) =>
                setLocalRules({ ...localRules, minTeacherAttendanceRate: Number(e.target.value) })
              }
              className="w-full accent-purple-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Если явка на уроках педагога падает ниже нормы, это выводится в отчет.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Сбросить
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              Сохранить правила
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
