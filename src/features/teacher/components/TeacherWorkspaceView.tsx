'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Users,
  Video,
  ExternalLink,
  Plus,
  ClipboardList,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Laptop,
  MoreVertical,
  X,
  FileText,
  Send,
  AlertCircle,
  HelpCircle,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useRole } from '@/context/RoleContext';
import { useTeacherWorkspaceData } from '@/features/teacher/hooks/useTeacherWorkspaceData';
import { TeacherLessonRow, TeacherAttentionAlert } from '@/features/teacher/lib/teacherWorkspaceEngine';
import { ScheduleLessonModal } from '@/components/calendar/ScheduleLessonModal';
import SendHomeworkModal from '@/components/lessons/SendHomeworkModal';
import { LessonDetailsDrawer } from '@/components/calendar/LessonDetailsDrawer';
import { getStoredLessonById } from '@/lib/data/lessonStorage';
import { FullLessonData } from '@/lib/data/mockData';

export function TeacherWorkspaceView() {
  const { t } = useLanguage();
  const router = useRouter();
  const { role, isOwnerAccount, isDevAccount, userName } = useRole();

  const {
    data,
    selectedDate,
    setSelectedDate,
    selectedTeacherId,
    setSelectedTeacherId,
    availableTeachers,
    refresh,
  } = useTeacherWorkspaceData({
    teacherName: role === 'teacher' && userName ? userName : undefined,
  });

  // Modals & Drawers state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
  const [homeworkLessonId, setHomeworkLessonId] = useState<string | null>(null);
  const [selectedDrawerLesson, setSelectedDrawerLesson] = useState<FullLessonData | null>(null);
  const [activeMenuLessonId, setActiveMenuLessonId] = useState<string | null>(null);

  const { teacher, selectedDateFormatted, kpis, nextLesson, todayLessons, groups, attentionAlerts } = data;

  const handleOpenLesson = (lessonId: string) => {
    const full = getStoredLessonById(lessonId);
    if (full) {
      setSelectedDrawerLesson(full);
    } else {
      router.push(`/calendar/lessons/${lessonId}`);
    }
  };

  const handleOpenJournal = (lessonId: string) => {
    router.push(`/teacher/attendance?lessonId=${lessonId}`);
  };

  const handleOpenHomework = (lessonId: string) => {
    setHomeworkLessonId(lessonId);
    setIsHomeworkModalOpen(true);
  };

  return (
    <div className="h-full min-h-0 flex flex-col p-4 lg:p-5 gap-3 bg-slate-50/70 text-slate-800 antialiased overflow-hidden select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER BAR
      ───────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
                Кабинет преподавателя
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200/80">
                {teacher.name || 'Преподаватель'}
              </span>

              {/* Developer / Owner teacher switcher preview */}
              {(isOwnerAccount || isDevAccount) && availableTeachers.length > 0 && (
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="text-[11px] text-slate-400 font-medium">Режим проверки:</span>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-700 font-semibold cursor-pointer shadow-2xs hover:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    title="Выбрать преподавателя (доступно владельцу / разработчику)"
                  >
                    {availableTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {selectedDateFormatted}
            </p>
          </div>
        </div>

        {/* Header Compact Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить занятие</span>
          </button>

          <Link
            href="/teacher/attendance"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors shadow-2xs"
          >
            <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
            <span>Журнал посещаемости</span>
          </Link>

          <Link
            href="/groups"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors shadow-2xs"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>Мои группы</span>
          </Link>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. COMPACT KPI STRIP (4 METRICS)
      ───────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0" aria-label="Показатели дня">
        {/* KPI 1: Уроков сегодня */}
        <div className="flex items-center gap-3 p-2.5 px-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-900 leading-none tabular-nums">
                {kpis.lessonsTodayCount}
              </span>
              <span className="text-xs font-medium text-slate-600 truncate">уроков сегодня</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold truncate mt-0.5">
              {kpis.lessonsTodayChangeLabel || 'активное расписание'}
            </p>
          </div>
        </div>

        {/* KPI 2: Моих групп */}
        <div className="flex items-center gap-3 p-2.5 px-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-900 leading-none tabular-nums">
                {kpis.groupsCount}
              </span>
              <span className="text-xs font-medium text-slate-600 truncate">моих групп</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
              Всего {kpis.totalGroupStudentsCount} учеников
            </p>
          </div>
        </div>

        {/* KPI 3: Учеников сегодня */}
        <div className="flex items-center gap-3 p-2.5 px-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-900 leading-none tabular-nums">
                {kpis.studentsTodayCount}
              </span>
              <span className="text-xs font-medium text-slate-600 truncate">учеников сегодня</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
              из {kpis.activeStudentsPoolCount} активных
            </p>
          </div>
        </div>

        {/* KPI 4: Посещаемость */}
        <div className="flex items-center gap-3 p-2.5 px-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-900 leading-none tabular-nums">
                {kpis.attendanceRate30d}%
              </span>
              <span className="text-xs font-medium text-slate-600 truncate">посещаемость</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
              <span className="text-slate-400 truncate">за 30 дней</span>
              {kpis.attendanceDeltaLabel && (
                <span className="text-emerald-600 font-semibold">{kpis.attendanceDeltaLabel}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN 2-COLUMN WORKSPACE GRID (Desktop Zero-Scroll)
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5 overflow-hidden">
        {/* ── LEFT COLUMN (8 cols / ~68% width) ── */}
        <div className="lg:col-span-8 flex flex-col gap-3 min-h-0 overflow-hidden">
          {/* 3.1. FOCUS BLOCK: СЛЕДУЮЩИЙ УРОК (P0) */}
          <section
            className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between shrink-0 relative overflow-hidden"
            aria-label="Следующий урок"
          >
            {/* Header / Subhead */}
            <div className="flex items-center justify-between gap-2 pb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  Следующий урок
                </h2>
                {nextLesson?.timeUntilFormatted && (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {nextLesson.timeUntilFormatted}
                  </span>
                )}
              </div>

              {nextLesson && (
                <button
                  onClick={() => handleOpenLesson(nextLesson.id)}
                  className="text-xs text-slate-500 hover:text-blue-600 font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {nextLesson.isTrial ? 'Пробное занятие' : `${nextLesson.presentCount || nextLesson.studentsCount} из ${nextLesson.studentsCount} подтвердили`}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {nextLesson ? (
              <div className="space-y-3">
                {/* Main Lesson Body */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                        {nextLesson.timeRangeFormatted}
                      </span>
                      <Link
                        href={`/groups/${nextLesson.groupId}`}
                        className="text-lg font-bold text-slate-900 hover:text-blue-600 transition-colors inline-flex items-center gap-1 truncate"
                      >
                        {nextLesson.groupName}
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                    </div>

                    {/* Metadata strip */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        <Video className="w-3.5 h-3.5 text-blue-600" />
                        {nextLesson.room}
                      </span>
                      <span>•</span>
                      <span>{nextLesson.studentsCount} учеников</span>
                      <span>•</span>
                      <span>{nextLesson.isIndividual ? 'Индивидуально' : 'Группа'}</span>
                    </div>

                    {/* Topic */}
                    <div className="text-xs text-slate-600 line-clamp-1">
                      <span className="font-semibold text-slate-700">Тема:</span>{' '}
                      <span className="text-slate-800">{nextLesson.topic}</span>
                    </div>
                  </div>

                  {/* Icon illustration box */}
                  <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-blue-50/80 border border-blue-100 text-blue-600 items-center justify-center shrink-0">
                    <Laptop className="w-8 h-8 opacity-80" />
                  </div>

                  {/* Actions Stack */}
                  <div className="flex flex-col gap-1.5 shrink-0 w-36">
                    <button
                      onClick={() => handleOpenJournal(nextLesson.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Открыть журнал</span>
                    </button>

                    {nextLesson.onlineMeetingUrl && (
                      <a
                        href={nextLesson.onlineMeetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200 transition-colors shadow-2xs"
                      >
                        <Video className="w-3.5 h-3.5 text-blue-600" />
                        <span>Перейти в Zoom</span>
                      </a>
                    )}

                    <button
                      onClick={() => handleOpenLesson(nextLesson.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 transition-colors"
                    >
                      <FileText className="w-3 h-3 text-slate-400" />
                      <span>Карточка урока</span>
                    </button>
                  </div>
                </div>

                {/* Optional Warning alert callout */}
                {nextLesson.unconfirmedCount && nextLesson.unconfirmedCount > 0 ? (
                  <div className="flex items-center justify-between p-2 px-3 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-800 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-semibold">
                        {nextLesson.unconfirmedCount} ученика не подтвердили участие
                      </span>
                    </div>
                    <button
                      onClick={() => handleOpenLesson(nextLesson.id)}
                      className="font-bold text-amber-700 hover:underline inline-flex items-center"
                    >
                      Детали <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs">
                На выбранную дату нет запланированных уроков.
              </div>
            )}
          </section>

          {/* 3.2. SCHEDULE TODAY TABLE (P1) */}
          <section
            className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col overflow-hidden"
            aria-label="Расписание на сегодня"
          >
            {/* Table Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Расписание на сегодня</h2>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {todayLessons.length}
                </span>
              </div>

              <Link
                href="/calendar"
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 transition-colors"
              >
                Все занятия →
              </Link>
            </div>

            {/* Table Head Row */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
              <div className="col-span-2">Время</div>
              <div className="col-span-5">Группа / урок</div>
              <div className="col-span-1 text-center">Ученики</div>
              <div className="col-span-2 text-center">Статус</div>
              <div className="col-span-2 text-right">Действия</div>
            </div>

            {/* Table Scrollable Body (Strictly Chronological & Deduped) */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0">
              {todayLessons.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  На сегодня уроков нет.
                </div>
              ) : (
                todayLessons.map((lesson) => {
                  const isCurrent = lesson.operationalState === 'in_progress';
                  const isStartingSoon = lesson.operationalState === 'starting_soon';

                  return (
                    <div
                      key={lesson.id}
                      className={cn(
                        'grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-slate-50/90 transition-colors text-xs relative group',
                        isCurrent && 'bg-blue-50/40 font-medium',
                        isStartingSoon && 'bg-amber-50/30'
                      )}
                    >
                      {/* Colored vertical status line */}
                      <div
                        className={cn(
                          'absolute left-0 inset-y-1 w-1 rounded-r-full',
                          lesson.operationalState === 'completed' && 'bg-emerald-500',
                          lesson.operationalState === 'in_progress' && 'bg-blue-500',
                          lesson.operationalState === 'starting_soon' && 'bg-amber-500',
                          lesson.operationalState === 'planned' && 'bg-slate-300',
                          lesson.operationalState === 'journal_missing' && 'bg-amber-500',
                          lesson.operationalState === 'cancelled' && 'bg-slate-300'
                        )}
                      />

                      {/* 1. Time */}
                      <div className="col-span-2 font-mono font-semibold text-slate-900 pl-1.5">
                        {lesson.timeRangeFormatted}
                      </div>

                      {/* 2. Group & Course/Topic */}
                      <div className="col-span-5 min-w-0 pr-2">
                        <div className="font-bold text-slate-900 truncate">
                          <Link
                            href={`/groups/${lesson.groupId}`}
                            className="hover:text-blue-600 transition-colors"
                          >
                            {lesson.groupName}
                          </Link>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {lesson.topic || lesson.courseName}
                        </div>
                      </div>

                      {/* 3. Students count */}
                      <div className="col-span-1 text-center font-bold text-slate-700 tabular-nums">
                        {lesson.studentsCount}
                      </div>

                      {/* 4. Operational Status Badge */}
                      <div className="col-span-2 flex justify-center">
                        <span
                          className={cn(
                            'px-2 py-0.5 text-[11px] font-semibold rounded-full border truncate',
                            lesson.stateBadge.bg,
                            lesson.stateBadge.text,
                            lesson.stateBadge.border
                          )}
                        >
                          {lesson.stateBadge.label}
                        </span>
                      </div>

                      {/* 5. Context Actions */}
                      <div className="col-span-2 flex items-center justify-end gap-1.5">
                        {lesson.primaryAction.type === 'fill_journal' || lesson.primaryAction.type === 'view_journal' || lesson.primaryAction.type === 'open_journal' ? (
                          <button
                            onClick={() => handleOpenJournal(lesson.id)}
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors shadow-2xs cursor-pointer',
                              lesson.primaryAction.style === 'primary' && 'bg-blue-600 hover:bg-blue-700 text-white',
                              lesson.primaryAction.style === 'warning' && 'bg-amber-500 hover:bg-amber-600 text-white',
                              lesson.primaryAction.style === 'secondary' && 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                            )}
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>{lesson.primaryAction.label}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenLesson(lesson.id)}
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors shadow-2xs cursor-pointer',
                              lesson.primaryAction.style === 'primary' && 'bg-blue-600 hover:bg-blue-700 text-white',
                              lesson.primaryAction.style === 'secondary' && 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                            )}
                          >
                            <FileText className="w-3 h-3" />
                            <span>{lesson.primaryAction.label}</span>
                          </button>
                        )}

                        {/* Secondary Dropdown Menu Trigger */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActiveMenuLessonId(activeMenuLessonId === lesson.id ? null : lesson.id)
                            }
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition-colors"
                            title="Дополнительно"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {activeMenuLessonId === lesson.id && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95">
                              <button
                                onClick={() => {
                                  setActiveMenuLessonId(null);
                                  handleOpenLesson(lesson.id);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                <span>Карточка урока</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveMenuLessonId(null);
                                  handleOpenJournal(lesson.id);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                                <span>Журнал посещаемости</span>
                              </button>

                              {lesson.onlineMeetingUrl && (
                                <a
                                  href={lesson.onlineMeetingUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() => setActiveMenuLessonId(null)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Video className="w-3.5 h-3.5 text-blue-500" />
                                  <span>Ссылка Zoom</span>
                                </a>
                              )}

                              <button
                                onClick={() => {
                                  setActiveMenuLessonId(null);
                                  handleOpenHomework(lesson.id);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Send className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Домашнее задание</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* ── RIGHT COLUMN (4 cols / ~32% width) ── */}
        <div className="lg:col-span-4 flex flex-col gap-3 min-h-0 overflow-hidden">
          {/* 3.3. МОИ ГРУППЫ (P2) */}
          <section
            className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col overflow-hidden"
            aria-label="Мои группы"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Мои группы</h2>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {groups.length}
                </span>
              </div>

              <Link
                href="/groups"
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 transition-colors"
              >
                Все группы →
              </Link>
            </div>

            {/* Groups list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0 p-1">
              {groups.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  У вас пока нет активных групп.
                </div>
              ) : (
                groups.map((grp, idx) => {
                  const dotColors = [
                    'bg-blue-500',
                    'bg-emerald-500',
                    'bg-amber-500',
                    'bg-purple-500',
                    'bg-sky-500',
                    'bg-rose-500',
                  ];
                  const dotColor = dotColors[idx % dotColors.length];

                  return (
                    <Link
                      key={grp.id}
                      href={`/groups/${grp.id}`}
                      className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl transition-colors text-xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        <span className={cn('w-2 h-2 rounded-full shrink-0', dotColor)} />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {grp.name}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {grp.courseName}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-slate-700 tabular-nums">
                          {grp.studentsCount} уч.
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {grp.scheduleFormatted}
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </section>

          {/* 3.4. ТРЕБУЕТ ВНИМАНИЯ (P1) */}
          <section
            className="p-3.5 bg-amber-50/40 rounded-2xl border border-amber-200/90 shadow-2xs flex flex-col shrink-0"
            aria-label="Требует внимания"
          >
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">Требует внимания</h2>
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">
                  {attentionAlerts.length}
                </span>
              </div>
            </div>

            <div className="space-y-2 mt-1">
              {attentionAlerts.length === 0 ? (
                <div className="p-3 text-center text-xs text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200 font-medium">
                  ✅ Все журналы и задания заполнены вовремя
                </div>
              ) : (
                attentionAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-2.5 bg-white rounded-xl border border-amber-200/80 shadow-2xs flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full mt-1.5 shrink-0',
                          alert.severity === 'critical' && 'bg-rose-500',
                          alert.severity === 'warning' && 'bg-amber-500',
                          alert.severity === 'info' && 'bg-blue-500'
                        )}
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 leading-snug truncate">
                          {alert.title}
                        </div>
                        {alert.subtitle && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {alert.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (alert.lessonId) {
                          if (alert.actionType === 'open_journal') {
                            handleOpenJournal(alert.lessonId);
                          } else if (alert.actionType === 'send_homework') {
                            handleOpenHomework(alert.lessonId);
                          } else {
                            handleOpenLesson(alert.lessonId);
                          }
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold shrink-0 inline-flex items-center cursor-pointer"
                    >
                      {alert.actionLabel}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          4. INTEGRATED MODALS & DRAWERS
      ───────────────────────────────────────────────────────────── */}
      {/* Schedule Lesson Modal */}
      <ScheduleLessonModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onScheduled={() => {
          setIsScheduleModalOpen(false);
          refresh();
        }}
        initialTeacherId={selectedTeacherId}
      />

      {/* Send Homework Modal */}
      {isHomeworkModalOpen && (
        <SendHomeworkModal
          isOpen={isHomeworkModalOpen}
          onClose={() => setIsHomeworkModalOpen(false)}
          lesson={
            (() => {
              const target = todayLessons.find((l) => l.id === homeworkLessonId) || nextLesson;
              return {
                id: target?.id || 'l5',
                groupName: target?.groupName || 'English B1 Teens',
                courseName: target?.courseName || 'Английский язык',
                date: target?.date || new Date().toISOString().slice(0, 10),
                startTime: target?.startTime || '18:45',
                endTime: target?.endTime || '20:15',
                teacherName: teacher.name || 'Мария Иванова',
                topic: target?.topic || 'Тема урока',
                homework: target?.homework,
              };
            })()
          }
          onSentSuccess={() => {
            setIsHomeworkModalOpen(false);
            refresh();
          }}
        />
      )}

      {/* Lesson Details Drawer */}
      {selectedDrawerLesson && (
        <LessonDetailsDrawer
          lesson={selectedDrawerLesson}
          isOpen={Boolean(selectedDrawerLesson)}
          onClose={() => setSelectedDrawerLesson(null)}
          onEdit={() => {}}
          onLessonUpdated={() => {
            refresh();
          }}
        />
      )}
    </div>
  );
}
