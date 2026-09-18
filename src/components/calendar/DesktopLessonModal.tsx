'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, Video, ExternalLink, Check, Copy, User, Lock } from 'lucide-react';
import { FullLessonData } from '@/lib/data/mockData';
import { saveLessonToStorage, recordLessonAttendanceBatch } from '@/lib/data/lessonStorage';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { useLanguage } from '@/context/LanguageContext';
import { getStudentLessonPaymentStatus } from '@/lib/data/lessonPaymentStatusHelper';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export interface StudentAttendanceItem {
  studentId: string;
  name: string;
  status: 'present' | 'absent' | 'excused';
  chargeBalance: boolean;
}

interface DesktopLessonModalProps {
  isOpen: boolean;
  lesson: FullLessonData | null;
  onClose: () => void;
  onSave: (updatedLesson: FullLessonData) => void;
}

export function DesktopLessonModal({
  isOpen,
  lesson,
  onClose,
  onSave,
}: DesktopLessonModalProps) {
  const toast = useToast();
  const { role } = useRole();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  // Editable fields
  const [topic, setTopic] = useState('');
  const [homework, setHomework] = useState('');
  const [zoomUrl, setZoomUrl] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [room, setRoom] = useState('');
  const [attendance, setAttendance] = useState<StudentAttendanceItem[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEditSchedule = ['developer', 'owner', 'admin', 'administrator'].includes(role);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && lesson) {
      setTopic(lesson.topic || '');
      setHomework(lesson.homework || '');
      setZoomUrl(lesson.onlineMeetingUrl || '');
      setDate(lesson.date || new Date().toISOString().slice(0, 10));
      setStartTime(lesson.startTime || '18:45');
      setEndTime(lesson.endTime || '20:15');
      setTeacherName(lesson.teacherName || '');
      setRoom(lesson.room || '');

      const initialAttendance: StudentAttendanceItem[] = (lesson.students || []).map((s) => ({
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

      setAttendance(initialAttendance);
    }
  }, [isOpen, lesson]);

  if (!isOpen || !lesson || !mounted) return null;

  const handleMarkAllPresent = () => {
    setAttendance((prev) => prev.map((s) => ({ ...s, status: 'present' })));
    toast.success('Все ученики отмечены как присутствующие');
  };

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'excused') => {
    setAttendance((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
    );
  };

  const handleToggleChargeBalance = (studentId: string) => {
    setAttendance((prev) =>
      prev.map((s) =>
        s.studentId === studentId ? { ...s, chargeBalance: !s.chargeBalance } : s
      )
    );
  };

  const handleCopyLink = () => {
    if (zoomUrl) {
      navigator.clipboard.writeText(zoomUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSave = async () => {
    if (!lesson) return;
    setIsSubmitting(true);

    try {
      const dateFormatted = new Date(date).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const dayOfWeek = new Date(date).getDay() === 0 ? 6 : new Date(date).getDay() - 1;

      // 1. Record attendance batch (updates student history & localStorage)
      recordLessonAttendanceBatch({
        lessonId: lesson.id,
        topic: topic.trim() || lesson.topic,
        homework: homework.trim() || undefined,
        teacherName: teacherName || lesson.teacherName,
        studentRecords: attendance.map((a) => ({
          studentId: a.studentId,
          studentName: a.name,
          status: a.status,
          note: a.status === 'absent' && !a.chargeBalance ? 'Без списания баланса' : undefined,
        })),
      });

      // 2. Build updated lesson object
      const updatedLesson: FullLessonData = {
        ...lesson,
        date,
        dateFormatted,
        dayOfWeek,
        startTime,
        endTime,
        topic: topic.trim() || 'Тема урока',
        homework: homework.trim() || undefined,
        onlineMeetingUrl: zoomUrl.trim() || undefined,
        teacherName: teacherName.trim() || lesson.teacherName,
        room: room.trim() || lesson.room,
        status: 'completed',
        students: (lesson.students || []).map((s) => {
          const att = attendance.find((a) => a.studentId === s.id);
          return {
            ...s,
            attendanceStatus: att ? att.status : s.attendanceStatus,
          };
        }),
      };

      // 3. Persist to local & in-memory storage
      saveLessonToStorage(updatedLesson);

      // 4. Supabase cloud sync
      try {
        const supabase = createClient();
        await supabase
          .from('lessons')
          .update({
            topic: updatedLesson.topic,
            homework: updatedLesson.homework,
            zoom_url: updatedLesson.onlineMeetingUrl,
            date: updatedLesson.date,
            start_time: updatedLesson.startTime,
            end_time: updatedLesson.endTime,
            status: 'completed',
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
        console.warn('Supabase save notice:', err);
      }

      // 5. Notify global listeners
      window.dispatchEvent(new CustomEvent('crm-lessons-changed', { detail: updatedLesson }));
      window.dispatchEvent(new CustomEvent('crm-students-changed'));

      toast.success('Данные занятия и посещаемость сохранены');
      onSave(updatedLesson);
      onClose();
    } catch (err: any) {
      console.error('Failed to save desktop lesson:', err);
      toast.error(err.message || 'Ошибка при сохранении занятия');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="hidden md:flex fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden z-10 border border-slate-100">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {lesson.groupName}
              </span>
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {lesson.dateFormatted || lesson.date}
              </span>
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {startTime} – {endTime}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 leading-snug">
              Журнал и параметры занятия
            </h3>
            <p className="text-xs text-slate-500">
              Преподаватель: <strong className="text-slate-700 font-semibold">{teacherName || lesson.teacherName}</strong>
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 min-h-0">
          
          {/* Zoom / Online Link Section */}
          <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5 uppercase">
                <Video className="w-4 h-4 text-indigo-600" />
                <span>Ссылка на онлайн-класс (Zoom / Meet)</span>
              </label>
              {zoomUrl && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-indigo-200"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink ? 'Скопировано' : 'Скопировать'}</span>
                  </button>
                  <a
                    href={zoomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <span>Войти в Zoom</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
            <input
              type="url"
              value={zoomUrl}
              onChange={(e) => setZoomUrl(e.target.value)}
              placeholder="https://zoom.us/j/123456789 или https://meet.google.com/..."
              className="w-full text-xs font-medium border border-indigo-200 rounded-xl px-3 py-2 bg-white text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-indigo-300"
            />
          </div>

          {/* Topic & Homework Inputs */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
              Тема урока
            </label>
            <input 
              type="text" 
              value={topic} 
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white placeholder:text-slate-400 shadow-2xs"
              placeholder="Например: Present Perfect vs Past Simple & Speaking Practice"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
              Домашнее задание
            </label>
            <textarea 
              rows={3}
              value={homework} 
              onChange={(e) => setHomework(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white placeholder:text-slate-400 leading-relaxed shadow-2xs"
              placeholder="Упражнения 4-6, стр. 32; выучить 10 глаголов..."
            />
          </div>

          {/* Schedule parameters (Date & Time) - Editable for Admins/Owners */}
          {canEditSchedule && (
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Дата</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white text-slate-800"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Время начала</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white text-slate-800"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Время окончания</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white text-slate-800"
                />
              </div>
            </div>
          )}

          {!canEditSchedule && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <Lock className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Режим преподавателя: изменять время урока и состав группы может только администратор</span>
            </div>
          )}

          {/* Interactive Attendance List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase">
                Посещаемость учеников ({attendance.length})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                  title="Поставить статус 'Был' всем ученикам группы"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Отметить всех</span>
                </button>
                <span className="text-xs text-slate-400">Синхронизируется с балансом</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
              {attendance.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  В группе нет прикрепленных учеников
                </div>
              ) : (
                attendance.map((st) => {
                  const payStatus = getStudentLessonPaymentStatus(st.studentId);
                  return (
                    <div 
                      key={st.studentId} 
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/70 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{st.name}</span>
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold border', payStatus.badgeClass)}>
                            {payStatus.label}
                          </span>
                        </div>
                        {st.status === 'absent' && (
                          <label className="mt-1 flex items-center gap-1.5 text-xs text-rose-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={st.chargeBalance}
                              onChange={() => handleToggleChargeBalance(st.studentId)}
                              className="rounded text-rose-600 focus:ring-rose-500 h-3.5 w-3.5 border-rose-300"
                            />
                            <span>Списать занятие с баланса</span>
                          </label>
                        )}
                      </div>

                      {/* Segmented Attendance Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                          type="button"
                          onClick={() => handleStatusChange(st.studentId, 'present')}
                          className={cn(
                            'px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer border',
                            st.status === 'present' 
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          )}
                        >
                          🟢 Был
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleStatusChange(st.studentId, 'absent')}
                          className={cn(
                            'px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer border',
                            st.status === 'absent' 
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs' 
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          )}
                        >
                          🔴 Пропуск
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleStatusChange(st.studentId, 'excused')}
                          className={cn(
                            'px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer border',
                            st.status === 'excused' 
                              ? 'bg-amber-500 text-white border-amber-500 shadow-xs' 
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          )}
                        >
                          🟡 Болезнь
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Sticky Action Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button 
            type="button"
            onClick={onClose} 
            disabled={isSubmitting}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <button 
            type="button"
            onClick={handleSave} 
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
