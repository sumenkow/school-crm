'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Check,
  Sliders,
  Sparkles,
  Layers,
  Clock,
  Palette,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';

export interface PipelineStageConfig {
  key: string;
  label: string;
  color: string;
  slaHours: number;
  description: string;
  isActive: boolean;
}

const DEFAULT_STAGES: PipelineStageConfig[] = [
  {
    key: 'new',
    label: 'Новые',
    color: 'blue',
    slaHours: 24,
    description: 'Первичные заявки с сайта, мессенджеров и рекламных кампаний',
    isActive: true,
  },
  {
    key: 'contacted',
    label: 'Связались',
    color: 'indigo',
    slaHours: 48,
    description: 'Первый контакт установлен, ведется квалификация потребностей',
    isActive: true,
  },
  {
    key: 'trial_scheduled',
    label: 'Пробный назначен',
    color: 'purple',
    slaHours: 72,
    description: 'Назначена дата и время пробного занятия в расписании',
    isActive: true,
  },
  {
    key: 'trial_attended',
    label: 'Пробный пройден',
    color: 'emerald',
    slaHours: 24,
    description: 'Ученик посетил занятие, сбор обратной связи от преподавателя',
    isActive: true,
  },
  {
    key: 'decision',
    label: 'Принимают решение',
    color: 'amber',
    slaHours: 48,
    description: 'Согласование расписания группы и выставление счета на оплату',
    isActive: true,
  },
  {
    key: 'paid',
    label: 'Оплачено',
    color: 'emerald',
    slaHours: 0,
    description: 'Оплата получена, конверсия в действующего ученика школы',
    isActive: true,
  },
  {
    key: 'lost',
    label: 'Архив / Отказ',
    color: 'rose',
    slaHours: 0,
    description: 'Отказ клиента с фиксацией причины для последующих касаний',
    isActive: true,
  },
];

const STORAGE_KEY = 'crm_pipeline_settings_v1';

interface PipelineSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (stages: PipelineStageConfig[]) => void;
}

export function PipelineSettingsModal({ isOpen, onClose, onSave }: PipelineSettingsModalProps) {
  const toast = useToast();
  const [stages, setStages] = useState<PipelineStageConfig[]>(DEFAULT_STAGES);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setStages(parsed);
          }
        }
      } catch (err) {
        console.error('Failed to parse pipeline settings', err);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleStage = (key: string) => {
    // Stage 'new' and 'paid' are critical and cannot be disabled
    if (key === 'new' || key === 'paid') {
      toast.info('Ключевые этапы воронки не могут быть отключены');
      return;
    }
    setStages((prev) =>
      prev.map((s) => (s.key === key ? { ...s, isActive: !s.isActive } : s))
    );
  };

  const handleUpdateLabel = (key: string, label: string) => {
    setStages((prev) =>
      prev.map((s) => (s.key === key ? { ...s, label } : s))
    );
  };

  const handleUpdateSla = (key: string, slaHours: number) => {
    setStages((prev) =>
      prev.map((s) => (s.key === key ? { ...s, slaHours: Math.max(0, slaHours) } : s))
    );
  };

  const handleResetToDefault = () => {
    setStages(DEFAULT_STAGES);
    toast.info('Настройки сброшены к значениям по умолчанию');
  };

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stages));
        window.dispatchEvent(new CustomEvent('crm-pipeline-settings-changed', { detail: stages }));
      } catch (e) {
        console.error('Failed to save pipeline settings', e);
      }
    }
    toast.success('Настройки воронки успешно сохранены');
    onSave?.(stages);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Настройки воронки продаж</h2>
              <p className="text-xs text-slate-500">
                Управление этапами воронки лидов, SLA-сроками и отображением
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
            <span className="font-semibold text-slate-700">Этапы воронки ({stages.length})</span>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>По умолчанию</span>
            </button>
          </div>

          <div className="space-y-3">
            {stages.map((stage, idx) => (
              <div
                key={stage.key}
                className={cn(
                  'rounded-xl border p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                  stage.isActive
                    ? 'border-slate-200 bg-white shadow-2xs'
                    : 'border-slate-200/60 bg-slate-50/60 opacity-60'
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-400 w-5 shrink-0">
                    {idx + 1}.
                  </span>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={stage.label}
                        onChange={(e) => handleUpdateLabel(stage.key, e.target.value)}
                        className="text-xs font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                      />
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full shrink-0',
                          stage.color === 'blue' && 'bg-blue-500',
                          stage.color === 'indigo' && 'bg-indigo-500',
                          stage.color === 'purple' && 'bg-purple-500',
                          stage.color === 'emerald' && 'bg-emerald-500',
                          stage.color === 'amber' && 'bg-amber-500',
                          stage.color === 'rose' && 'bg-rose-500'
                        )}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 px-1 truncate">
                      {stage.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  {stage.slaHours > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[11px]">SLA:</span>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={stage.slaHours}
                        onChange={(e) => handleUpdateSla(stage.key, Number(e.target.value))}
                        className="w-10 text-center font-bold text-slate-800 bg-white border border-slate-200 rounded px-1 text-xs"
                      />
                      <span className="text-[11px]">ч.</span>
                    </div>
                  )}

                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stage.isActive}
                      onChange={() => handleToggleStage(stage.key)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 relative" />
                    <span className="text-xs font-medium text-slate-700">
                      {stage.isActive ? 'Вкл' : 'Выкл'}
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3.5">
          <p className="text-[11px] text-slate-400">
            Изменения применяются ко всем активным воронкам
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Сохранить настройки
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
