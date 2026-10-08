import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { X, Calendar, Send, Clock, BookOpen } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { getStoredLessons } from '@/lib/data/lessonStorage';

interface TeacherModalProps {
  isOpen: boolean;
  teacherData: any;
  onClose: () => void;
}

export function TeacherModal({ isOpen, teacherData, onClose }: TeacherModalProps) {
  const router = useRouter();
  const toast = useToast();

  const teacherLessons = useMemo(() => {
    if (!teacherData || typeof window === 'undefined') return [];
    const all = getStoredLessons();
    return all.filter((l) => l.teacherId === teacherData.id || l.teacherName === teacherData.name);
  }, [teacherData]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const todayLessons = useMemo(() => {
    return teacherLessons.filter((l) => l.date === todayStr);
  }, [teacherLessons, todayStr]);

  const stats = useMemo(() => {
    const total = teacherLessons.length;
    const completed = teacherLessons.filter((l) => l.status === 'completed').length;
    let totalRecords = 0;
    let presentRecords = 0;
    for (const l of teacherLessons) {
      if (l.students) {
        for (const s of l.students) {
          if (s.attendanceStatus && s.attendanceStatus !== 'not_marked') {
            totalRecords++;
            if (s.attendanceStatus === 'present') presentRecords++;
          }
        }
      }
    }
    const attendanceRate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 100;
    return {
      total,
      completed,
      attendanceRate,
    };
  }, [teacherLessons]);

  if (!isOpen || !teacherData) return null;

  const handleTelegramClick = () => {
    if (teacherData.telegram) {
      const cleanTg = teacherData.telegram.replace(/^@/, '').trim();
      window.open(`https://t.me/${cleanTg}`, '_blank', 'noopener,noreferrer');
    } else {
      toast.info('Telegram контакт не указан в профиле преподавателя');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
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
              <p className="text-xs text-slate-500 font-medium">
                {teacherData.role || 'Преподаватель'}{teacherData.subject ? ` • ${teacherData.subject}` : ''}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* KPI Metrics */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Показатели учебной работы</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100/80 text-center">
              <p className="text-[10px] font-bold text-emerald-600 uppercase">Посещаемость</p>
              <p className="text-xl font-black text-emerald-800 mt-0.5">{stats.attendanceRate}%</p>
              <p className="text-[9px] text-emerald-600 mt-0.5">Явка на уроках</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-xl border border-purple-100/80 text-center">
              <p className="text-[10px] font-bold text-purple-600 uppercase">Всего уроков</p>
              <p className="text-xl font-black text-purple-800 mt-0.5">{stats.total}</p>
              <p className="text-[9px] text-purple-600 mt-0.5">В расписании</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100/80 text-center">
              <p className="text-[10px] font-bold text-blue-600 uppercase">Проведено</p>
              <p className="text-xl font-black text-blue-800 mt-0.5">{stats.completed}</p>
              <p className="text-[9px] text-blue-600 mt-0.5">Завершено уроков</p>
            </div>
          </div>
        </div>

        {/* Schedule Today */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Занятия на сегодня</h4>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {todayLessons.length} {todayLessons.length === 1 ? 'урок' : 'уроков'}
            </span>
          </div>
          {todayLessons.length > 0 ? (
            <div className="space-y-2">
              {todayLessons.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock size={14} className="text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-700 shrink-0">{l.startTime} - {l.endTime}</span>
                    <span className="text-slate-500 truncate">• {l.groupName || l.courseName}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                    l.status === 'completed' ? 'text-emerald-600 bg-emerald-50' : 'text-blue-600 bg-blue-50'
                  }`}>
                    {l.status === 'completed' ? 'Проведен' : 'Запланирован'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
              <BookOpen className="w-5 h-5 mx-auto mb-1 text-slate-300" />
              Сегодня у преподавателя нет запланированных уроков
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
          <button 
            type="button"
            onClick={handleTelegramClick}
            className="flex-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-xl py-2.5 px-3 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send size={14} /> Написать в Telegram
          </button>
          
          <button 
            type="button"
            onClick={() => {
              router.push('/calendar');
              onClose();
            }}
            className="flex-1 bg-slate-900 text-white hover:bg-slate-800 rounded-xl py-2.5 px-3 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Calendar size={14} /> Расписание в календаре
          </button>
        </div>

      </div>
    </div>
  );
}
