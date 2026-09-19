'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Phone,
  Plus,
  CheckSquare,
  Edit,
  GraduationCap,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FullStudentData, FullLessonData } from '@/lib/data/mockData';
import { formatAgeAndGrade, formatBirthDate } from '@/lib/data/studentAgeHelper';

const WhatsAppIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={cn('fill-current', className)} viewBox="0 0 24 24">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

const TelegramIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={cn('fill-current', className)} viewBox="0 0 24 24">
    <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.536-.196 1.006.128.833.942z" />
  </svg>
);

export interface StudentProfileDesktopProps {
  student: FullStudentData;
  finSummary: {
    formattedDeposit: string;
    formattedDebt: string;
    formattedNet: string;
    breakdownSummary: string;
  };
  studentDeposit: number;
  studentOverdueDebt: number;
  upcomingLesson: FullLessonData | null;
  role: string;
  isSaving?: boolean;
  onOpenPaymentModal: () => void;
  onOpenCreateTaskModal: () => void;
  onOpenEditStudentModal: () => void;
  onConvertAdultModal: () => void;
  onDeleteStudent: () => void;
  onSelectTab: (tabKey: string) => void;
}

export function StudentProfileDesktop({
  student,
  finSummary,
  studentDeposit,
  studentOverdueDebt,
  upcomingLesson,
  role,
  onOpenPaymentModal,
  onOpenCreateTaskModal,
  onOpenEditStudentModal,
  onConvertAdultModal,
  onDeleteStudent,
  onSelectTab,
}: StudentProfileDesktopProps) {
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const phoneClean = (student.phone || student.parents?.[0]?.phone || '').replace(/\D/g, '');
  const telegramClean = (student.telegram || student.parents?.[0]?.telegram || '').replace('@', '');

  const primaryParent = student.parents?.[0];
  const cleanParentName = primaryParent
    ? `${primaryParent.firstName} ${primaryParent.lastName}`.replace(/\s*\([^)]*\)/, '').trim()
    : '';

  // Age & Grade text
  const birthDateStr = student.birthDate ? formatBirthDate(student.birthDate) : '';
  const ageGradeStr = formatAgeAndGrade(student.birthDate, student.grade);

  // Attendance calculation
  const attendanceRateNum = typeof student.attendanceStats?.attendanceRate === 'number'
    ? student.attendanceStats.attendanceRate
    : parseInt(String(student.attendanceStats?.attendanceRate || '100'), 10) || 100;

  // Paid Until formatting
  const rawPaidUntil = student.finance?.activeSubscription?.renewalDate || '28.09';
  const formattedPaidUntil = rawPaidUntil.split('.').slice(0, 2).join('.');

  return (
    <div className="hidden md:block w-full space-y-4">
      {/* LEVEL 1: Identification & Action Bar Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Student Identity */}
          <div className="flex items-center gap-4 min-w-0">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-sm border border-blue-400/20">
                {student.firstName[0]}{student.lastName[0]}
              </div>
              <span
                className={cn(
                  'absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-white',
                  student.status === 'active'
                    ? 'bg-emerald-500'
                    : student.status === 'trial'
                    ? 'bg-purple-500'
                    : 'bg-amber-500'
                )}
              />
            </div>

            <div className="min-w-0 space-y-1">
              {/* Top line: Name + Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 truncate">
                  {student.firstName} {student.lastName}
                </h1>

                {/* Status Badge */}
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 font-semibold text-[11px] border',
                    student.status === 'active' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    student.status === 'trial' && 'bg-purple-50 text-purple-700 border-purple-200',
                    student.status === 'paused' && 'bg-amber-50 text-amber-700 border-amber-200'
                  )}
                >
                  {student.status === 'active' ? 'Активен' : student.status === 'trial' ? 'Пробный' : 'На паузе'}
                </span>

                {/* Category Badge */}
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 font-semibold text-[11px] border inline-flex items-center gap-1',
                    student.studentType === 'adult_student'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  )}
                >
                  {student.studentType === 'adult_student' ? (
                    <>
                      <GraduationCap className="h-3 w-3 text-purple-600" />
                      Студент
                    </>
                  ) : (
                    <>Школьник</>
                  )}
                </span>
              </div>

              {/* Bottom line: Age/Grade, Phone with WA/TG buttons */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                {(birthDateStr || ageGradeStr) && (
                  <span className="font-semibold text-slate-800">
                    {birthDateStr}
                    {birthDateStr && ageGradeStr && ' · '}
                    {ageGradeStr}
                  </span>
                )}

                {student.phone && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <a
                      href={phoneClean ? `tel:${phoneClean}` : '#'}
                      className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-600 hover:underline font-mono text-[11px] font-semibold"
                    >
                      <Phone className="h-3 w-3 text-slate-400" />
                      {student.phone}
                    </a>
                    {phoneClean && (
                      <div className="flex items-center gap-1 shrink-0">
                        {/* WhatsApp icon button */}
                        <a
                          href={`https://wa.me/${phoneClean}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-5 h-5 rounded bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white flex items-center justify-center transition-all border border-[#25D366]/20 cursor-pointer"
                          title="Написать в WhatsApp"
                        >
                          <WhatsAppIcon className="w-3 h-3" />
                        </a>

                        {/* Telegram icon button */}
                        <a
                          href={telegramClean ? `https://t.me/${telegramClean}` : `https://wa.me/${phoneClean}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-5 h-5 rounded bg-[#229ED9]/10 hover:bg-[#229ED9] text-[#229ED9] hover:text-white flex items-center justify-center transition-all border border-[#229ED9]/20 cursor-pointer"
                          title="Написать в Telegram"
                        >
                          <TelegramIcon className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action Hierarchy Bar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 1. + Внести оплату */}
            {role !== 'teacher' && (
              <button
                type="button"
                onClick={onOpenPaymentModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Внести оплату
              </button>
            )}

            {/* 2. ✓ Создать задачу */}
            <button
              type="button"
              onClick={onOpenCreateTaskModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <CheckSquare className="h-3.5 w-3.5 text-purple-600" />
              Создать задачу
            </button>

            {/* 3. ··· (Ещё) Dropdown */}
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
                title="Дополнительные действия"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {isMoreDropdownOpen && (
                <div className="absolute right-0 mt-2 z-50 w-56 rounded-xl bg-white p-1.5 shadow-xl border border-slate-200 text-xs animate-in fade-in duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreDropdownOpen(false);
                      onOpenEditStudentModal();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                  >
                    <Edit className="h-3.5 w-3.5 text-blue-600" />
                    <span>Редактировать профиль</span>
                  </button>

                  {student.studentType !== 'adult_student' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreDropdownOpen(false);
                        onConvertAdultModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors font-medium cursor-pointer"
                    >
                      <GraduationCap className="h-3.5 w-3.5 text-purple-600" />
                      <span>Сменить категорию на студента</span>
                    </button>
                  )}

                  {role !== 'teacher' && (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreDropdownOpen(false);
                          onDeleteStudent();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors font-medium cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        <span>Архивировать / Удалить</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LEVEL 2: Metrics Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs grid grid-cols-4 gap-4 divide-x divide-slate-100">
        {/* Block 1: КУРС И ГРУППА */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            КУРС И ГРУППА
          </span>
          {student.groups.length > 0 ? (
            <div className="space-y-0.5">
              <Link
                href={`/calendar/lessons/${(student.groups[0] as any).nextLessonId || student.groups[0].id}`}
                className="text-xs font-bold text-slate-900 hover:text-blue-600 hover:underline block truncate"
              >
                {student.groups[0].name}
                {student.groups.length > 1 && (
                  <span className="ml-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">
                    +{student.groups.length - 1}
                  </span>
                )}
              </Link>
              <Link
                href={`/teachers/${(student as any).teacherId || '1'}`}
                className="text-[11px] text-slate-500 hover:text-blue-600 hover:underline block truncate"
              >
                Преподаватель: {student.groups[0]?.teacherName || (student as any).teacherName || 'Мария Иванова'}
              </Link>
              {upcomingLesson && upcomingLesson.date ? (
                <Link
                  href={`/calendar/lessons/${upcomingLesson.id}`}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline block truncate"
                  title="Перейти к карточке ближайшего урока"
                >
                  → Следующее занятие: {upcomingLesson.date}{upcomingLesson.startTime ? `, ${upcomingLesson.startTime}` : ''}
                </Link>
              ) : (
                <span className="text-[11px] text-slate-400 block truncate">
                  → Следующее занятие: —
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-medium block mt-1">— Без группы</span>
          )}
        </div>

        {/* Block 2: ПРЕДСТАВИТЕЛЬ (Bugfix: display parent if present in student.parents regardless of adult_student) */}
        <div className="pl-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            ПРЕДСТАВИТЕЛЬ
          </span>
          {primaryParent ? (
            <div className="space-y-0.5">
              <Link
                href={`/parents/${primaryParent.id}`}
                className="text-xs font-bold text-slate-900 hover:text-blue-600 hover:underline block truncate"
              >
                {cleanParentName}
              </Link>
              <div className="flex items-center gap-1.5">
                <a
                  href={primaryParent.phone ? `tel:${primaryParent.phone.replace(/\D/g, '')}` : '#'}
                  className="text-[11px] text-slate-500 hover:text-blue-600 font-mono"
                >
                  {primaryParent.phone || '—'}
                </a>
                {primaryParent.phone && (
                  <a
                    href={`https://wa.me/${primaryParent.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-4 h-4 rounded bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white flex items-center justify-center transition-colors shrink-0"
                    title="WhatsApp родителя"
                  >
                    <WhatsAppIcon className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-medium block mt-1">—</span>
          )}
        </div>

        {/* Block 3: ПОСЕЩАЕМОСТЬ */}
        <div
          onClick={() => onSelectTab('attendance')}
          className="pl-4 space-y-1 cursor-pointer hover:bg-slate-50/60 p-1 -m-1 rounded-xl transition-colors group"
          title="Перейти к посещаемости"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block group-hover:text-blue-600">
            ПОСЕЩАЕМОСТЬ
          </span>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-extrabold',
                attendanceRateNum >= 90
                  ? 'text-emerald-600'
                  : attendanceRateNum >= 70
                  ? 'text-amber-600'
                  : 'text-rose-600'
              )}
            >
              {attendanceRateNum}%
            </span>
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  attendanceRateNum >= 90
                    ? 'bg-emerald-500'
                    : attendanceRateNum >= 70
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                )}
                style={{ width: `${Math.min(attendanceRateNum, 100)}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] text-slate-400 block">Посещено уроков</span>
        </div>

        {/* Block 4: СТАТУС ОПЛАТЫ */}
        <div
          onClick={() => onSelectTab('finance')}
          className="pl-4 space-y-1 cursor-pointer hover:bg-slate-50/60 p-1 -m-1 rounded-xl transition-colors group"
          title="Перейти к финансам"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block group-hover:text-blue-600">
            СТАТУС ОПЛАТЫ
          </span>
          {studentOverdueDebt > 0 ? (
            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2 py-0.5 rounded-lg inline-block">
              Долг: -{studentOverdueDebt} €
            </span>
          ) : (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2 py-0.5 rounded-lg inline-block">
              ✓ Оплачено до {formattedPaidUntil}
            </span>
          )}
          <div className="text-[11px] text-slate-500 font-medium truncate">
            Депозит: {finSummary.formattedDeposit || '0 €'}
          </div>
        </div>
      </div>
    </div>
  );
}
