'use client';

import React, { useState } from 'react';
import { X, Users, Tag, AlertTriangle, Check, Trash2, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CHURN_REASONS, ChurnReasonId } from '@/lib/data/churnStorage';


interface BulkChangeGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (groupId: string | null) => void;
  groups: Array<{ id: string; name: string; courseName?: string; teacherName?: string; schedule?: string }>;
  selectedCount: number;
}

export function BulkChangeGroupModal({
  isOpen,
  onClose,
  onConfirm,
  groups,
  selectedCount,
}: BulkChangeGroupModalProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(groups[0]?.id || null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Изменить группу</h2>
              <p className="text-xs text-slate-500">Для {selectedCount} выбранных учеников</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Выберите целевую группу
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedGroupId(null)}
                className={cn(
                  'w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer',
                  selectedGroupId === null
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                )}
              >
                <div>
                  <span className="text-xs font-semibold text-slate-800">Без группы</span>
                  <p className="text-[11px] text-slate-500">Открепить учеников от текущих групп</p>
                </div>
                {selectedGroupId === null && (
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                )}
              </button>

              {groups.map((group) => {
                const isSelected = selectedGroupId === group.id;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer',
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    )}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-slate-800 block truncate">
                        {group.name}
                      </span>
                      <p className="text-[11px] text-slate-500 truncate">
                        {group.teacherName ? `Преподаватель: ${group.teacherName}` : ''}
                        {group.schedule ? ` · ${group.schedule}` : ''}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50/60 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selectedGroupId)}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Применить изменения
          </button>
        </div>
      </div>
    </div>
  );
}

interface BulkChangeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    status: 'active' | 'trial' | 'paused' | 'archived',
    churnReasonId?: ChurnReasonId,
    churnComment?: string
  ) => void;
  selectedCount: number;
}

const STATUS_OPTIONS: Array<{
  id: 'active' | 'trial' | 'paused' | 'archived';
  label: string;
  desc: string;
  badgeClass: string;
}> = [
  {
    id: 'active',
    label: 'Активен',
    desc: 'Ученик посещает занятия и участвует в расписании',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'trial',
    label: 'Пробный',
    desc: 'Записан на пробное занятие или тестируется',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    id: 'paused',
    label: 'Пауза (Заморозка)',
    desc: 'Обучение временно приостановлено по заявлению',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: 'archived',
    label: 'В архиве',
    desc: 'Обучение завершено или ученик выбыл',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
];

export function BulkChangeStatusModal({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
}: BulkChangeStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'trial' | 'paused' | 'archived'>('active');
  const [churnReasonId, setChurnReasonId] = useState<ChurnReasonId | null>(null);
  const [churnComment, setChurnComment] = useState('');

  const isArchiving = selectedStatus === 'archived';
  const canSave = !isArchiving || churnReasonId !== null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Изменить статус</h2>
              <p className="text-xs text-slate-500">Для {selectedCount} выбранных учеников</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-2.5">
          {STATUS_OPTIONS.map((opt) => {
            const isSelected = selectedStatus === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => { setSelectedStatus(opt.id); setChurnReasonId(null); setChurnComment(''); }}
                className={cn(
                  'w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer',
                  isSelected
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold border', opt.badgeClass)}>
                      {opt.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{opt.desc}</p>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                )}
              </button>
            );
          })}

          {/* Churn reason section — shown only when archiving */}
          {isArchiving && (
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                Причина ухода <span className="text-rose-500">*</span>
              </div>
              <div className="space-y-1.5">
                {CHURN_REASONS.map((reason) => (
                  <label
                    key={reason.id}
                    className={cn(
                      'flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all',
                      churnReasonId === reason.id
                        ? 'border-rose-400 bg-rose-50/50 ring-1 ring-rose-400'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    )}
                  >
                    <input
                      type="radio"
                      name="churn_reason_bulk"
                      value={reason.id}
                      checked={churnReasonId === reason.id}
                      onChange={() => setChurnReasonId(reason.id)}
                      className="sr-only"
                    />
                    <span className="text-base leading-none">{reason.emoji}</span>
                    <span className="text-xs text-slate-800">{reason.label}</span>
                    {churnReasonId === reason.id && (
                      <Check className="w-3.5 h-3.5 text-rose-500 ml-auto shrink-0" />
                    )}
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Комментарий (необязательно)
                </label>
                <textarea
                  value={churnComment}
                  onChange={(e) => setChurnComment(e.target.value)}
                  rows={2}
                  placeholder="Уточните причину ухода..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50/60 border-t border-slate-100 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selectedStatus, churnReasonId ?? undefined, churnComment || undefined)}
            disabled={!canSave}
            className={cn(
              'px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors cursor-pointer',
              canSave
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-slate-300 cursor-not-allowed'
            )}
          >
            {isArchiving && !canSave ? 'Выберите причину' : 'Применить статус'}
          </button>
        </div>
      </div>
    </div>
  );
}


interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedCount: number;
}

export function BulkDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
}: BulkDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Удаление учеников</h2>
              <p className="text-xs text-slate-500">Перемещение в архив/удаленные</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 text-rose-900 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              Вы собираетесь переместить в удаленные <strong>{selectedCount} учеников</strong>.
              Их данные не будут стерты безвозвратно — вы всегда сможете восстановить их в разделе «Удаленные».
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50/60 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Переместить в удаленные ({selectedCount})
          </button>
        </div>
      </div>
    </div>
  );
}
