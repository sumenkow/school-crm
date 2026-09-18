import React from 'react';
import { X, Calendar, MessageCircle, Send, Award, Users, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface TeacherModalProps {
  isOpen: boolean;
  teacherData: any;
  onClose: () => void;
}

export function TeacherModal({ isOpen, teacherData, onClose }: TeacherModalProps) {
  const toast = useToast();

  if (!isOpen || !teacherData) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full h-[100dvh] sm:h-auto sm:max-w-xl bg-white sm:rounded-2xl shadow-xl p-6 z-10 flex flex-col space-y-6 overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-lg font-bold shadow-md">
              {teacherData.name ? teacherData.name.charAt(0) : 'Т'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{teacherData.name}</h3>
              <p className="text-xs text-slate-500 font-medium">{teacherData.role || 'Преподаватель'} • Активен</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* KPI Metrics */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Метрики эффективности (KPI)</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100/80 text-center">
              <p className="text-[10px] font-bold text-emerald-600 uppercase">Retention</p>
              <p className="text-xl font-black text-emerald-800 mt-0.5">94%</p>
              <p className="text-[9px] text-emerald-600 mt-0.5">Удержание учеников</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-xl border border-purple-100/80 text-center">
              <p className="text-[10px] font-bold text-purple-600 uppercase">Конверсия</p>
              <p className="text-xl font-black text-purple-800 mt-0.5">80%</p>
              <p className="text-[9px] text-purple-600 mt-0.5">Пробные в оплат</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100/80 text-center">
              <p className="text-[10px] font-bold text-blue-600 uppercase">Посещаемость</p>
              <p className="text-xl font-black text-blue-800 mt-0.5">98%</p>
              <p className="text-[9px] text-blue-600 mt-0.5">Без срывов и отмен</p>
            </div>
          </div>
        </div>

        {/* Schedule Today */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Нагрузка на сегодня</h4>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {teacherData.count || 12} учеников
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-slate-400" />
                <span className="font-bold text-slate-700">14:00 - 15:30</span>
                <span className="text-slate-500">• Группа Английский A2</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Завершено</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-slate-400" />
                <span className="font-bold text-slate-700">16:00 - 17:30</span>
                <span className="text-slate-500">• Группа Английский B1</span>
              </div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Идет урок</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
          <button 
            type="button"
            onClick={() => toast.success('Переход в Telegram...')}
            className="flex-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-xl py-2.5 px-3 text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Send size={14} /> Написать в Telegram
          </button>
          
          <button 
            type="button"
            onClick={() => {
              toast.success('Открываем календарь...');
              onClose();
            }}
            className="flex-1 bg-slate-900 text-white hover:bg-slate-800 rounded-xl py-2.5 px-3 text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Calendar size={14} /> Расписание в календаре
          </button>
        </div>

      </div>
    </div>
  );
}
