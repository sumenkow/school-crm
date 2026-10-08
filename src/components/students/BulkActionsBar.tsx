'use client';

import React from 'react';
import {
  Check,
  MessageSquare,
  Users,
  Tag,
  Download,
  Trash2,
  X,
  Send,
} from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onSendMessage?: () => void;
  onSendHomework?: () => void;
  onChangeGroup?: () => void;
  onChangeStatus?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onSendMessage,
  onSendHomework,
  onChangeGroup,
  onChangeStatus,
  onExport,
  onDelete,
  onClearSelection,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white border border-slate-200 shadow-2xl rounded-2xl px-5 py-2.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* 1. Индикатор выбора */}
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
          <Check className="w-3 h-3 stroke-[3]" />
        </div>
        <span className="text-xs font-bold text-slate-800 whitespace-nowrap">
          Выбрано: {selectedCount}
        </span>
      </div>

      {/* Разделитель */}
      <div className="h-5 w-px bg-slate-200 shrink-0" />

      {/* 2. Кнопки действий */}
      <div className="flex items-center gap-2">
        {/* Написать */}
        {onSendMessage && (
          <button
            type="button"
            onClick={onSendMessage}
            className="h-8 px-3 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200/80 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
          >
            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
            <span>Написать</span>
          </button>
        )}

        {/* Отправить ДЗ */}
        {onSendHomework && (
          <button
            type="button"
            onClick={onSendHomework}
            className="h-8 px-3 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200/80 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
          >
            <Send className="w-3.5 h-3.5 text-slate-500" />
            <span>Отправить ДЗ</span>
          </button>
        )}

        {/* Изменить группу */}
        {onChangeGroup && (
          <button
            type="button"
            onClick={onChangeGroup}
            className="h-8 px-3 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200/80 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Изменить группу</span>
          </button>
        )}

        {/* Изменить статус */}
        {onChangeStatus && (
          <button
            type="button"
            onClick={onChangeStatus}
            className="h-8 px-3 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200/80 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
          >
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            <span>Изменить статус</span>
          </button>
        )}

        {/* Экспорт */}
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="h-8 px-3 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200/80 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Экспорт</span>
          </button>
        )}

        {/* Удалить */}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="h-8 px-3 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ml-1 shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Удалить</span>
          </button>
        )}
      </div>

      {/* 3. Кнопка сброса выбора */}
      <button
        type="button"
        onClick={onClearSelection}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer ml-1"
        title="Снять выбор"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

