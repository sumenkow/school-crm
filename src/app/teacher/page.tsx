'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Check,
  X,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  BookOpen,
  Sparkles,
  Mail,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_LESSONS, FullLessonData } from '@/lib/data/mockData';
import { getStudentLessonPaymentStatus } from '@/lib/data/lessonPaymentStatusHelper';
import { recordLessonAttendanceBatch, getStoredLessons, saveLessonToStorage } from '@/lib/data/lessonStorage';
import SendHomeworkModal from '@/components/lessons/SendHomeworkModal';
import { ScheduleLessonModal } from '@/components/calendar/ScheduleLessonModal';
import { useLanguage } from '@/context/LanguageContext';

interface StudentAttendanceItem {
  id: string;
  name: string;
  status: 'present' | 'absent' | 'rescheduled' | 'not_marked';
  note?: string;
  consecutiveAbsences?: number;
}

export default function TeacherMobileDashboard() {
  const { t, language } = useLanguage();
  const locale = language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : 'ru-RU';
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('l5'); // Today's lesson (03.09.2026)
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Teacher's lessons
  const allStoredLessons = typeof window !== 'undefined' ? getStoredLessons() : INITIAL_LESSONS;
  const myLessons = allStoredLessons.filter((l) => l.teacherId === 't1' || l.teacherName?.includes('Мария'));

  // Today's lessons
  const todayLessons = myLessons.filter((l) => l.date === '2026-09-03' || l.date === new Date().toISOString().slice(0, 10));

  // Students for the active lesson (Zero technical IDs shown to teacher)
  const [studentsList, setStudentsList] = useState<StudentAttendanceItem[]>([
    { id: '1', name: 'Иван Смирнов', status: 'present', consecutiveAbsences: 0 },
    { id: '4', name: 'Сергей Попов', status: 'present', consecutiveAbsences: 0 },
    { id: 's5', name: 'Алина Белова', status: 'present', consecutiveAbsences: 0 },
    { id: 's6', name: 'Максим Захаров', status: 'absent', note: 'Заболел, предупредили', consecutiveAbsences: 2 },
    { id: 's7', name: 'Полина Григорьева', status: 'present', consecutiveAbsences: 0 },
    { id: 's8', name: 'Егор Романов', status: 'present', consecutiveAbsences: 0 },
    { id: 's9', name: 'София Федорова', status: 'present', consecutiveAbsences: 0 },
  ]);

  const [lessonTopic, setLessonTopic] = useState('Modal verbs of deduction (must / might / can’t)');
  const [homework, setHomework] = useState('Workbook p. 18-19, упр. 4-6');

  const currentLesson = myLessons.find((l) => l.id === selectedLessonId) || myLessons[0];

  const setStudentStatus = (studentId: string, newStatus: 'present' | 'absent' | 'rescheduled') => {
    setStudentsList((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        const nextStatus = s.status === newStatus ? 'not_marked' : newStatus;
        return { ...s, status: nextStatus };
      })
    );
    setSaveSuccess(false);
  };

  const handleUpdateNote = (studentId: string, noteText: string) => {
    setStudentsList((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, note: noteText } : s))
    );
  };

  const handleSaveAttendance = () => {
    recordLessonAttendanceBatch({
      lessonId: selectedLessonId,
      topic: lessonTopic,
      homework,
      teacherName: 'Мария Иванова',
      studentRecords: studentsList.map((s) => ({
        studentId: s.id,
        studentName: s.name,
        status: s.status,
        note: s.note,
      })),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const presentCount = studentsList.filter((s) => s.status === 'present').length;
  const absentCount = studentsList.filter((s) => s.status === 'absent').length;
  const rescheduledCount = studentsList.filter((s) => s.status === 'rescheduled').length;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Teacher Header Banner */}
      <div className="rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 p-5 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">
            {t('role.teacherCabinet', 'Кабинет преподавателя')}
          </span>
          <Link
            href="/teacher/attendance"
            className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/25 transition-colors"
          >
            {t('teacher.summaryAttendance', 'Сводный табель')} →
          </Link>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/15 pt-3">
          <p className="text-xs text-blue-100">
            {t('teacher.todaySubtitle', 'Сегодня:')} <strong>3 {t('calendar.dateRangeSept', 'сентября')}</strong> • {todayLessons.length} {t('calendar.lessonsCount', 'занятие')}
          </p>
          <button
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('action.scheduleLesson', 'Запланировать занятие')}
          </button>
        </div>
      </div>

      {/* Main Tab Switcher («Сегодня» vs «Моя неделя») */}
      <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('today')}
          className={cn(
            'flex-1 rounded-lg py-2 transition-all text-center cursor-pointer',
            activeTab === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          )}
        >
          {t('calendar.today', 'Сегодня')} ({todayLessons.length})
        </button>
        <button
          onClick={() => setActiveTab('week')}
          className={cn(
            'flex-1 rounded-lg py-2 transition-all text-center cursor-pointer',
            activeTab === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          )}
        >
          {t('teacher.myWeek', 'Моя неделя')} ({myLessons.length})
        </button>
      </div>

      {/* TAB 1: СЕГОДНЯ (ОСНОВНОЙ СЦЕНАРИЙ УЧИТЕЛЯ В 1 КЛИК) */}
      {activeTab === 'today' && (
        <div className="space-y-5">
          {/* Today Lessons selector */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('teacher.selectLessonToMark', 'Выберите занятие для отметки:')}
            </h2>
            {todayLessons.map((lesson) => {
              const isSelected = lesson.id === selectedLessonId;

              return (
                <div
                  key={lesson.id}
                  onClick={() => setSelectedLessonId(lesson.id)}
                  className={cn(
                    'rounded-2xl border p-4 transition-all shadow-xs cursor-pointer',
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-600">{lesson.startTime} – {lesson.endTime}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{lesson.room}</span>
                      <Link
                        href={`/calendar/lessons/${lesson.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-bold text-blue-600 hover:underline bg-white px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs"
                      >
                        {t('action.viewCard', 'Карточка урока')} ↗
                      </Link>
                    </div>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">{lesson.groupName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{lesson.courseName}</p>
                </div>
              );
            })}
          </div>

          {/* ATTENDANCE CARD (Section 11 UX) */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {/* Header with lesson info */}
            <div className="border-b border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-blue-600">{t('teacher.lessonJournal', 'Журнал занятия')}</span>
                  <h3 className="text-base font-extrabold text-slate-900">{currentLesson.groupName}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                    {currentLesson.startTime} – {currentLesson.endTime}
                  </span>
                  <Link
                    href={`/calendar/lessons/${currentLesson.id}`}
                    className="text-xs font-bold text-blue-600 hover:underline bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs"
                  >
                    {t('action.viewCard', 'Карточка урока')} ↗
                  </Link>
                </div>
              </div>

              {/* Topic and Homework */}
              <div className="mt-3 space-y-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">{t('hero.topic', 'Тема занятия')}:</label>
                  <input
                    type="text"
                    value={lessonTopic}
                    onChange={(e) => setLessonTopic(e.target.value)}
                    placeholder={t('teacher.topicPlaceholder', 'Тема урока...')}
                    className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">{t('hero.homework', 'Домашнее задание')}:</label>
                  <input
                    type="text"
                    value={homework}
                    onChange={(e) => setHomework(e.target.value)}
                    placeholder={t('teacher.homeworkPlaceholder', 'Задание на дом...')}
                    className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">{t('teacher.hwSavedToCard', 'ДЗ сохраняется в карточку урока')}</span>
                  <button
                    type="button"
                    onClick={() => setIsHomeworkModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 text-xs font-bold hover:bg-indigo-100 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Mail className="h-3.5 w-3.5 text-indigo-600" />
                    {t('action.sendHomework', 'Разослать ДЗ родителям')}
                  </button>
                </div>
              </div>
            </div>

            {/* Attendance summary pill */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">{t('teacher.marked', 'Отмечено')}:</span>
              <div className="flex items-center gap-3 font-bold text-xs">
                <span className="text-emerald-700">{t('status.present', 'Был')}: {presentCount}</span>
                <span className="text-rose-700">{t('status.absent', 'Не был')}: {absentCount}</span>
                <span className="text-amber-700">{t('status.rescheduled', 'Перенос')}: {rescheduledCount}</span>
              </div>
            </div>

            {/* Students List with 1-click status pills (Requirement 11) */}
            <div className="p-4 space-y-3">
              {studentsList.map((student) => (
                <div
                  key={student.id}
                  className={cn(
                    'rounded-xl border p-3.5 transition-all space-y-2',
                    student.status === 'present' && 'border-emerald-200 bg-emerald-50/40',
                    student.status === 'absent' && 'border-rose-200 bg-rose-50/40',
                    student.status === 'rescheduled' && 'border-amber-200 bg-amber-50/40',
                    student.status === 'not_marked' && 'border-slate-200 bg-white'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{student.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {(() => {
                          const payStatus = getStudentLessonPaymentStatus(student.id);
                          return (
                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold border', payStatus.badgeClass)}>
                              {payStatus.label}
                            </span>
                          );
                        })()}
                        {/* Warning if student missed multiple lessons (Requirement 11 & Dashboard alert) */}
                        {student.consecutiveAbsences && student.consecutiveAbsences >= 2 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <AlertTriangle className="h-3 w-3" />
                            {student.consecutiveAbsences} {t('teacher.consecutiveMisses', 'пропуска подряд!')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 1-Click Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setStudentStatus(student.id, 'present')}
                        className={cn(
                          'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer',
                          student.status === 'present'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700'
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {t('status.present', 'Был')}
                      </button>

                      <button
                        type="button"
                        onClick={() => setStudentStatus(student.id, 'absent')}
                        className={cn(
                          'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer',
                          student.status === 'absent'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-700'
                        )}
                      >
                        <X className="h-3.5 w-3.5" />
                        {t('status.absent', 'Н/Б')}
                      </button>

                      <button
                        type="button"
                        onClick={() => setStudentStatus(student.id, 'rescheduled')}
                        className={cn(
                          'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer',
                          student.status === 'rescheduled'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700'
                        )}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Optional Note / Teacher Comment on Student */}
                  <div>
                    <input
                      type="text"
                      value={student.note || ''}
                      onChange={(e) => handleUpdateNote(student.id, e.target.value)}
                      placeholder={t('lesson.teacherNotePlaceholder', 'Комментарии преподавателя...')}
                      className="w-full rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Save Button with Feedback */}
            <div className="border-t border-slate-100 bg-slate-50/70 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                {saveSuccess ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 animate-fade-in">
                    <CheckCircle2 className="h-4 w-4" /> {t('teacher.attendanceSaved', 'Посещаемость сохранена и статистика обновлена!')}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    {t('teacher.statsAutoUpdate', 'Статистика учеников и групп обновится автоматически')}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsHomeworkModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-700 shadow-2xs hover:bg-indigo-100 transition-all cursor-pointer"
                >
                  <Mail className="h-4 w-4 text-indigo-600" />
                  {t('lesson.sendHomeworkEmail', 'Разослать ДЗ на Email')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 active:scale-98 transition-all cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  {t('teacher.saveAttendance', 'Сохранить посещаемость')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: МОЯ НЕДЕЛЯ */}
      {activeTab === 'week' && (
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t('teacher.weeklyScheduleTitle', 'Расписание занятий на текущую неделю:')}
          </h2>

          <div className="space-y-3">
            {myLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md transition-all flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-blue-600">{lesson.dateFormatted}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-semibold text-slate-800">{lesson.startTime} – {lesson.endTime}</span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm mt-1">{lesson.groupName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{lesson.room} • {lesson.students.length} {t('calendar.studentsCount', 'учеников')}</p>
                  <p className="text-xs text-slate-600 mt-1 font-medium">{t('hero.topic', 'Тема')}: {lesson.topic}</p>
                </div>

                <div className="text-right">
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-[10px] font-semibold inline-block mb-2',
                      lesson.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    )}
                  >
                    {lesson.status === 'completed' ? t('status.completed', 'Завершён') : t('status.scheduled', 'Запланирован')}
                  </span>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedLessonId(lesson.id);
                        setIsHomeworkModalOpen(true);
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Mail size={12} />
                      {t('hero.homework', 'ДЗ')} →
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLessonId(lesson.id);
                        setActiveTab('today');
                      }}
                      className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      {t('teacher.lessonJournal', 'Журнал урока')} →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Send Homework Email */}
      {isHomeworkModalOpen && (
        <SendHomeworkModal
          isOpen={isHomeworkModalOpen}
          onClose={() => setIsHomeworkModalOpen(false)}
          lesson={{
            id: currentLesson.id,
            groupName: currentLesson.groupName,
            courseName: currentLesson.courseName,
            date: currentLesson.dateFormatted || currentLesson.date,
            startTime: currentLesson.startTime,
            endTime: currentLesson.endTime,
            teacherName: currentLesson.teacherName,
            topic: lessonTopic || currentLesson.topic,
            homework: homework || currentLesson.homework,
            students: studentsList.map((s) => ({ id: s.id, name: s.name })),
          }}
        />
      )}

      {/* MODAL: Schedule Lesson */}
      <ScheduleLessonModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onScheduled={() => setRefreshTrigger((prev) => prev + 1)}
      />
    </div>
  );
}
