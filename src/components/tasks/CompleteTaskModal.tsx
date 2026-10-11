'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, X, Sparkles, User, Tag } from 'lucide-react';
import { FullTaskData, FullLeadData } from '@/lib/data/mockData';
import { useRole } from '@/context/RoleContext';
import { getStoredLeads, saveLeadToStorage, syncLeadToSupabase } from '@/lib/data/leadStorage';
import { cn } from '@/lib/utils';

export interface CompleteTaskModalProps {
  isOpen: boolean;
  task: FullTaskData | null;
  onClose: () => void;
  onComplete: (taskId: string, completionResult: string, completedByName: string) => Promise<void> | void;
}

const OUTCOME_PRESETS = [
  { label: 'Информация получена', style: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' },
  { label: 'Не удалось связаться', style: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100' },
  { label: 'Требуется повторный контакт', style: 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100' },
  { label: 'Отказ клиента', style: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100' },
];

export function CompleteTaskModal({
  isOpen,
  task,
  onClose,
  onComplete,
}: CompleteTaskModalProps) {
  const { userName } = useRole();
  const [resultText, setResultText] = useState('');
  const [performer, setPerformer] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [languageLevel, setLanguageLevel] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      setResultText('');
      setSelectedPreset(null);
      setLanguageLevel('');
      setStudentAge('');
      setPerformer(userName || task.assignedTo || 'Администратор');
    }
  }, [isOpen, task, userName]);

  if (!isOpen || !task) return null;

  const handleSelectPreset = (preset: string) => {
    setSelectedPreset(preset);
    if (!resultText.trim() || OUTCOME_PRESETS.some(p => p.label === resultText.trim())) {
      setResultText(preset);
    } else if (!resultText.includes(preset)) {
      setResultText(`${preset}: ${resultText}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultText.trim()) return;

    try {
      setIsSubmitting(true);

      // If this task was tied to a lead and lead attributes were enriched
      if (task.leadId && (languageLevel.trim() || studentAge.trim())) {
        try {
          const leads = getStoredLeads(true);
          const currentLead = leads.find(l => l.id === task.leadId);
          if (currentLead) {
            const extraNotes: string[] = [];
            if (languageLevel.trim()) extraNotes.push(`Уровень: ${languageLevel.trim()}`);
            if (studentAge.trim()) extraNotes.push(`Возраст: ${studentAge.trim()} лет`);

            const existingNotes = currentLead.studentNotes || currentLead.comment || '';
            const updatedNotes = existingNotes
              ? `${existingNotes} | ${extraNotes.join(', ')}`
              : extraNotes.join(', ');

            const updatedLead: FullLeadData = {
              ...currentLead,
              level: languageLevel.trim() || currentLead.level,
              studentAge: studentAge.trim() || currentLead.studentAge,
              studentNotes: updatedNotes,
            };
            saveLeadToStorage(updatedLead);
            syncLeadToSupabase(updatedLead);
          }
        } catch (e) {
          console.warn('Could not update lead attributes during task completion:', e);
        }
      }

      await onComplete(
        task.id,
        resultText.trim(),
        performer.trim() || userName || 'Администратор'
      );
      onClose();
    } catch (err) {
      console.error('Failed to complete task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 leading-snug">Завершение поручения</h3>
              <p className="text-[11px] text-slate-500 truncate max-w-[260px]">{task.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Outcome presets */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Стандартный результат контакта</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {OUTCOME_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleSelectPreset(p.label)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg border text-left text-[11px] font-semibold transition-all cursor-pointer',
                    p.style,
                    selectedPreset === p.label ? 'ring-2 ring-slate-800 shadow-xs' : 'opacity-85'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Результат выполнения / отчет <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={resultText}
              onChange={(e) => setResultText(e.target.value)}
              placeholder="Опишите результат выполнения (например: дозвонился, согласовали расписание, уровень немецкого А2)..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Optional inline lead details update if task is linked to lead */}
          {task.leadId && (
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-purple-600" />
                <span>Обновить сведения по лиду (опционально)</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Уровень немецкого / языка</label>
                  <input
                    type="text"
                    value={languageLevel}
                    onChange={(e) => setLanguageLevel(e.target.value)}
                    placeholder="Например: А1, В1"
                    className="h-7.5 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Возраст ребёнка</label>
                  <input
                    type="text"
                    value={studentAge}
                    onChange={(e) => setStudentAge(e.target.value)}
                    placeholder="Например: 12"
                    className="h-7.5 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Кто выполнил
            </label>
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={performer}
                onChange={(e) => setPerformer(e.target.value)}
                className="h-8.5 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !resultText.trim()}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Завершить поручение</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
