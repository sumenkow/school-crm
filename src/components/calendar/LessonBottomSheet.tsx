'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Clock,
  Video,
  Copy,
  Check,
  MessageCircle,
  Send,
  UserCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { FullLessonData } from '@/lib/data/mockData';
import { saveLessonToStorage, recordLessonAttendanceBatch } from '@/lib/data/lessonStorage';
import { getStudentLessonPaymentStatus } from '@/lib/data/lessonPaymentStatusHelper';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export interface MobileAttendanceItem {
  studentId: string;
  name: string;
  status: 'present' | 'absent' | 'excused';
  chargeBalance: boolean;
}

interface LessonBottomSheetProps {
  isOpen: boolean;
  lesson: FullLessonData | null;
  onClose: () => void;
  onSaved?: (updatedLesson: FullLessonData) => void;
}

export function LessonBottomSheet({
  isOpen,
  lesson,
  onClose,
  onSaved,
}: LessonBottomSheetProps) {
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [topic, setTopic] = useState('');
  const [homework, setHomework] = useState('');
  const [attendance, setAttendance] = useState<MobileAttendanceItem[]>([]);
  const [copiedZoom, setCopiedZoom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && lesson) {
      setTopic(lesson.topic || '');
      setHomework(lesson.homework || '');
      const list: MobileAttendanceItem[] = (lesson.students || []).map((s) => ({
        studentId: s.id,
        name: s.name,
        status:
          s.attendanceStatus === 'excused'
            ? 'excused'
            : s.attendanceStatus === 'absent'
            ? 'absent'
            : 'present',
        chargeBalance: true,
      }));
      setAttendance(list);
    }
  }, [isOpen, lesson]);

  if (!isOpen || !lesson || !mounted) return null;

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'excused') => {
    setAttendance((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
    );
  };

  const handleMarkAllPresent = () => {
    setAttendance((prev) => prev.map((s) => ({ ...s, status: 'present' })));
    toast.success('Все ученики отмечены как присутствующие');
  };

  const handleCopyZoom = () => {
    if (lesson.onlineMeetingUrl) {
      navigator.clipboard.writeText(lesson.onlineMeetingUrl);
      setCopiedZoom(true);
      setTimeout(() => setCopiedZoom(false), 2000);
    }
  };

  const handleCompleteAndDeduct = async () => {
    if (!lesson) return;
    setIsSubmitting(true);

    try {
      // 1. Update batch attendance & student records
      recordLessonAttendanceBatch({
        lessonId: lesson.id,
        topic: topic.trim() || lesson.topic,
        homework: homework.trim() || undefined,
        teacherName: lesson.teacherName,
        studentRecords: attendance.map((a) => ({
          studentId: a.studentId,
          studentName: a.name,
          status: a.status,
        })),
      });

      // 2. Build updated lesson
      const updatedLesson: FullLessonData = {
        ...lesson,
        status: 'completed',
        topic: topic.trim() || lesson.topic,
        homework: homework.trim() || undefined,
        students: (lesson.students || []).map((s) => {
          const att = attendance.find((a) => a.studentId === s.id);
          return {
            ...s,
            attendanceStatus: att ? att.status : s.attendanceStatus,
          };
        }),
      };

      saveLessonToStorage(updatedLesson);

      // 3. Supabase Cloud Sync
      try {
        const supabase = createClient();
        await supabase
          .from('lessons')
          .update({
            status: 'completed',
            topic: updatedLesson.topic,
            homework: updatedLesson.homework,
            updated_at: new Date().toISOString(),
          })
          .eq('id', updatedLesson.id);

        const attendancePayload = attendance.map((st) => ({
          lesson_id: updatedLesson.id,
          student_id: st.studentId,
          status: st.status,
          charge_balance: st.status === 'present' || (st.status === 'absent' && st.chargeBalance),
          updated_at: new Date().toISOString(),
        }));

        await supabase
          .from('lesson_attendance')
          .upsert(attendancePayload, { onConflict: 'lesson_id,student_id' });
      } catch (err) {
        console.warn('Supabase sync warning:', err);
      }

      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updatedLesson }));
      window.dispatchEvent(new CustomEvent('crm-students-changed'));

      toast.success('Посещаемость сохранена');
      if (onSaved) onSaved(updatedLesson);
      onClose();
    } catch (err: any) {
      console.error('Failed to complete lesson:', err);
      toast.error('Ошибка при сохранении посещаемости');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative w-full h-[85dvh] max-h-[85dvh] rounded-t-2xl bg-white flex flex-col shadow-2xl overflow-hidden z-10">
        
        {/* Drag Handle & Header */}
        <div className="flex-shrink-0 bg-white border-b border-slate-100 px-4 py-3 flex flex-col gap-2">
          <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto" />
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {lesson.groupName}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {lesson.startTime} – {lesson.endTime}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                    lesson.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : lesson.status === 'rescheduled'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-blue-100 text-blue-800'
                  )}
                >
                  {lesson.status === 'completed'
                    ? 'Завершен'
                    : lesson.status === 'rescheduled'
                    ? 'Перенесен'
                    : 'Запланирован'}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {lesson.topic || 'Занятие группы'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Преподаватель: <strong className="text-slate-700">{lesson.teacherName}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 pb-10">
          
          {/* Quick Actions (Zoom / WhatsApp) */}
          <div className="grid grid-cols-2 gap-2">
            {lesson.onlineMeetingUrl ? (
              <a
                href={lesson.onlineMeetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs active:bg-indigo-700 transition-colors"
              >
                <Video className="w-4 h-4" />
                <span>Войти в Zoom</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={handleCopyZoom}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200"
              >
                <Video className="w-4 h-4 text-slate-500" />
                <span>Ссылка не задана</span>
              </button>
            )}

            {lesson.onlineMeetingUrl ? (
              <button
                type="button"
                onClick={handleCopyZoom}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs"
              >
                {copiedZoom ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedZoom ? 'Скопировано' : 'Скопировать Zoom'}</span>
              </button>
            ) : (
              <a
                href="https://t.me"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs"
              >
                <MessageCircle className="w-4 h-4 text-blue-600" />
                <span>Чат группы</span>
              </a>
            )}
          </div>

          {/* Attendance Header with 'Отметить всех' */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Журнал посещаемости ({attendance.length})
              </span>
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 active:bg-emerald-100"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Отметить всех</span>
              </button>
            </div>

            {/* Student List */}
            <div className="space-y-2">
              {attendance.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-xl">
                  В группе нет учеников
                </p>
              ) : (
                attendance.map((st) => {
                  const payStatus = getStudentLessonPaymentStatus(st.studentId);
                  return (
                    <div
                      key={st.studentId}
                      className="p-3 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {st.name.charAt(0)}
                          </div>
                          <span className="text-xs font-bold text-slate-900 truncate">{st.name}</span>
                        </div>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold border shrink-0', payStatus.badgeClass)}>
                          {payStatus.label}
                        </span>
                      </div>

                      {/* 3 Status Buttons */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.studentId, 'present')}
                          className={cn(
                            'py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center',
                            st.status === 'present'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          )}
                        >
                          🟢 Был
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.studentId, 'excused')}
                          className={cn(
                            'py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center',
                            st.status === 'excused'
                              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          )}
                        >
                          🟡 Болезнь
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.studentId, 'absent')}
                          className={cn(
                            'py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center',
                            st.status === 'absent'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          )}
                        >
                          🔴 Неявка
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Topic & Homework Fields */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Тема занятия</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Тема урока..."
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Домашнее задание</label>
              <textarea
                rows={2}
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                placeholder="Домашнее задание..."
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

        </div>

        {/* Sticky Action Footer */}
        <div className="flex-shrink-0 p-4 bg-white border-t border-slate-200 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-[0_-8px_20px_rgba(0,0,0,0.06)] flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleCompleteAndDeduct}
            disabled={isSubmitting}
            className="flex-[2] py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Сохранение...' : 'Завершить урок и списать'}</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
