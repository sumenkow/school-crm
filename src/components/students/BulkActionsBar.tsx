'use client';

import React from 'react';
import { MessageSquare, UserCheck, Download, X } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onWhatsAppBroadcast: () => void;
  onChangeTeacher: () => void;
  onExport: () => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onWhatsAppBroadcast,
  onChangeTeacher,
  onExport,
  onClearSelection,
}: BulkActionsBarProps) {
  if (selectedCount < 2) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Selected Indicator */}
      <span className="text-xs font-bold text-slate-300 whitespace-nowrap">
        Выбрано: <strong className="text-white font-extrabold">{selectedCount}</strong> уч.
      </span>

      <div className="h-4 w-px bg-slate-700" />

      {/* Action 1: WhatsApp Broadcast */}
      <button
        type="button"
        onClick={onWhatsAppBroadcast}
        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span>Рассылка WhatsApp</span>
      </button>

      {/* Action 2: Change Teacher */}
      <button
        type="button"
        onClick={onChangeTeacher}
        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        <UserCheck className="w-3.5 h-3.5" />
        <span>Сменить преподавателя</span>
      </button>

      {/* Action 3: Export Excel / CSV */}
      <button
        type="button"
        onClick={onExport}
        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Экспорт в Excel / CSV</span>
      </button>

      {/* Clear selection */}
      <button
        type="button"
        onClick={onClearSelection}
        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        title="Сбросить выбор"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
