'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { FullTaskData } from '@/lib/data/mockData';
import { useRole } from '@/context/RoleContext';

export interface CompleteTaskModalProps {
  isOpen: boolean;
  task: FullTaskData | null;
  onClose: () => void;
  onComplete: (taskId: string, completionResult: string, completedByName: string) => Promise<void> | void;
}

export function CompleteTaskModal({
  isOpen,
  task,
  onClose,
  onComplete,
}: CompleteTaskModalProps) {
  const { userName } = useRole();
  const [resultText, setResultText] = useState('');
  const [performer, setPerformer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      setResultText('');
      setPerformer(userName || task.assignedTo || 'Администратор');
    }
  }, [isOpen, task, userName]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultText.trim()) return;

    try {
      setIsSubmitting(true);
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
              <h3 className="text-sm font-bold text-slate-900 leading-snug">Завершение задачи</h3>
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
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Результат выполнения / отчет <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={resultText}
              onChange={(e) => setResultText(e.target.value)}
              placeholder="Опишите результат выполнения (например: дозвонился, согласовали расписание, счет оплачен)..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Кто выполнил
            </label>
            <input
              type="text"
              value={performer}
              onChange={(e) => setPerformer(e.target.value)}
              className="h-8.5 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
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
              <span>Завершить задачу</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
