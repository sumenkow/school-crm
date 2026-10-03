'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Phone,
  Plus,
  CheckSquare,
  Edit,
  GraduationCap,
  Trash2,
  MoreHorizontal,
  Sparkles,
  Clock,
  FileText,
  BookOpen,
  TrendingUp,
  CreditCard,
  User,
  ChevronRight,
} from 'lucide-react';
import { cn, isEntityNew, formatPhone, getWhatsAppLink, getTelLink, normalizePhone } from '@/lib/utils';
import { FullStudentData, FullLessonData, INITIAL_GROUPS, INITIAL_TEACHERS } from '@/lib/data/mockData';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getStoredLessons, saveLessonToStorage } from '@/lib/data/lessonStorage';
import { formatAgeAndGrade, formatBirthDate } from '@/lib/data/studentAgeHelper';
import { useToast } from '@/context/ToastContext';
import { LessonModal } from '@/components/calendar/LessonModal';

function formatAbsenceDate(dStr: string): string {
  if (!dStr) return '';
  if (dStr.includes('.')) {
    const parts = dStr.split('.');
    if (parts.length >= 2) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
      if (m >= 1 && m <= 12) {
        return `${d} ${months[m - 1]}`;
      }
    }
  }
  return dStr.replace(/\s*202\d/, '').trim();
}

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

function formatNextLessonText(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return '—';

  let formattedDate = dateStr;
  let dayOfWeek = '';

  let d: Date | null = null;
  if (dateStr.includes('.')) {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      formattedDate = `${parts[0].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[2]}`;
    } else if (parts.length === 2) {
      const year = new Date().getFullYear();
      d = new Date(year, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      formattedDate = `${parts[0].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${year}`;
    }
  } else if (dateStr.includes('-')) {
    d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0');
      formattedDate = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
    }
  }

  if (d && !isNaN(d.getTime())) {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    dayOfWeek = days[d.getDay()];
  }

  const prefix = dayOfWeek ? `${dayOfWeek}, ${formattedDate}` : formattedDate;
  const timeSuffix = timeStr ? ` в ${timeStr}` : '';
  return `${prefix}${timeSuffix}`;
}

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
  onOpenTelegramConnect?: () => void;
  onOpenCreateInvoiceModal?: () => void;
  onOpenEnrollModal?: () => void;
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
  onOpenTelegramConnect,
  onOpenCreateInvoiceModal,
  onOpenEnrollModal,
}: StudentProfileDesktopProps) {
  const router = useRouter();
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [selectedLessonModal, setSelectedLessonModal] = useState<FullLessonData | null>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

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
    ? `${primaryParent.firstName || ''} ${primaryParent.lastName || ''}`.replace(/\s*\([^)]*\)/, '').trim() || 'Родитель'
    : '';

  // Safe initials
  const studentInitials = `${student.firstName?.[0] || (student as any).name?.[0] || 'У'}${student.lastName?.[0] || ''}`.toUpperCase();

  // Age & Grade text
  const birthDateStr = student.birthDate ? formatBirthDate(student.birthDate) : '';
  const ageGradeStr = formatAgeAndGrade(student.birthDate, student.grade);

  // Attendance calculation
  const attendanceRateNum = typeof student.attendanceStats?.attendanceRate === 'number'
    ? student.attendanceStats.attendanceRate
    : parseInt(String(student.attendanceStats?.attendanceRate || '100'), 10) || 100;

  // Last absence computation (single source of truth)
  const lastAbsence = React.useMemo(() => {
    const list: Array<{ date: string; status: 'absent' | 'excused' | 'sick'; notes?: string }> = [];

    // 1. From student's attendance history
    if (student.attendanceStats?.history) {
      for (const item of student.attendanceStats.history) {
        const s = item.status as string;
        if (s === 'absent' || s === 'excused' || s === 'sick') {
          list.push({
            date: item.date,
            status: s as 'absent' | 'excused' | 'sick',
            notes: item.reason || item.notes,
          });
        }
      }
    }

    // 2. From stored lessons
    if (typeof window !== 'undefined') {
      const storedLessons = getStoredLessons();
      for (const l of storedLessons) {
        const match = (l.students || []).find((s) => s.id === student.id);
        if (match && (match.attendanceStatus === 'absent' || match.attendanceStatus === 'excused')) {
          list.push({
            date: l.dateFormatted || l.date,
            status: match.attendanceStatus,
            notes: match.notes,
          });
        }
      }
    }

    if (list.length === 0) return null;

    const parseDateToMs = (dStr: string) => {
      if (!dStr) return 0;
      if (dStr.includes('.')) {
        const parts = dStr.split('.');
        if (parts.length >= 2) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parts[2] ? parseInt(parts[2], 10) : 2026;
          return new Date(y, m, d).getTime();
        }
      }
      const monthsRu: Record<string, number> = {
        'янв': 0, 'фев': 1, 'мар': 2, 'апр': 3, 'май': 4, 'мая': 4,
        'июн': 5, 'июл': 6, 'авг': 7, 'сен': 8, 'окт': 9, 'ноя': 10, 'дек': 11
      };
      for (const [key, idx] of Object.entries(monthsRu)) {
        if (dStr.toLowerCase().includes(key)) {
          const matchNum = dStr.match(/\d+/);
          const day = matchNum ? parseInt(matchNum[0], 10) : 1;
          return new Date(2026, idx, day).getTime();
        }
      }
      const parsed = new Date(dStr).getTime();
      return isNaN(parsed) ? 0 : parsed;
    };

    list.sort((a, b) => parseDateToMs(b.date) - parseDateToMs(a.date));
    return list[0];
  }, [student]);

  // Paid Until formatting
  const rawPaidUntil = student.finance?.activeSubscription?.renewalDate || '28.09';
  const formattedPaidUntil = (rawPaidUntil || '28.09').split('.').slice(0, 2).join('.');
  const studentGroups = student.groups || [];

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
                {studentInitials}
              </div>
              {isEntityNew(student.createdAt, (student as any).isNewUntil) && (
                <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-sm ring-2 ring-white z-10 inline-flex items-center gap-0.5">
                  NEW
                </span>
              )}
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
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  {student.firstName || ''} {student.lastName || ''}
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
                      href={getTelLink(student.phone)}
                      className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-600 hover:underline font-mono text-[11px] font-semibold"
                      title={formatPhone(student.phone)}
                    >
                      <Phone className="h-3 w-3 text-slate-400" />
                      {formatPhone(student.phone)}
                    </a>
                    {normalizePhone(student.phone) && (
                      <div className="flex items-center gap-1 shrink-0">
                        {/* WhatsApp icon button */}
                        <a
                          href={getWhatsAppLink(student.phone)}
                          target="_blank"
                          rel="noreferrer"
                          className="w-5 h-5 rounded bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white flex items-center justify-center transition-all border border-[#25D366]/20 cursor-pointer"
                          title="Написать в WhatsApp"
                        >
                          <WhatsAppIcon className="w-3 h-3" />
                        </a>

                        {/* Telegram icon button */}
                        {telegramClean ? (
                          <a
                            href={`https://t.me/${telegramClean}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-5 h-5 rounded bg-[#229ED9]/10 hover:bg-[#229ED9] text-[#229ED9] hover:text-white flex items-center justify-center transition-all border border-[#229ED9]/20 cursor-pointer"
                            title={`Написать в Telegram (@${telegramClean})`}
                          >
                            <TelegramIcon className="w-3 h-3" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={onOpenTelegramConnect}
                            className="w-5 h-5 rounded bg-slate-100 hover:bg-[#229ED9] text-slate-400 hover:text-white flex items-center justify-center transition-all border border-slate-200 cursor-pointer"
                            title="Подключить Telegram-бота"
                          >
                            <TelegramIcon className="w-3 h-3" />
                          </button>
                        )}
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

            {/* 2. 🧾 Выставить счёт */}
            {role !== 'teacher' && (
              <button
                type="button"
                onClick={onOpenCreateInvoiceModal}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 shadow-xs hover:bg-blue-100 transition-colors cursor-pointer"
                title="Сформировать европейский счёт на оплату (Faktúra)"
              >
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                Выставить счёт
              </button>
            )}

            {/* 3. ✓ Создать задачу */}
            <button
              type="button"
              onClick={onOpenCreateTaskModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <CheckSquare className="h-3.5 w-3.5 text-purple-600" />
              Создать задачу
            </button>

            {/* 4. ··· (Ещё) Dropdown */}
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

                  {role !== 'teacher' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreDropdownOpen(false);
                        onOpenCreateInvoiceModal?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-blue-600" />
                      <span>Выставить счёт (Faktúra)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreDropdownOpen(false);
                      onOpenTelegramConnect?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-[#229ED9]/10 hover:text-[#229ED9] transition-colors font-medium cursor-pointer"
                  >
                    <TelegramIcon className="h-3.5 w-3.5 text-[#229ED9]" />
                    <span>Подключить Telegram-бота</span>
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

      {/* LEVEL 2: 4-Card Summary Grid */}
      {(() => {
        const storedGroups = typeof window !== 'undefined' ? getStoredGroups() : INITIAL_GROUPS;
        const firstGroup = studentGroups[0];
        const cleanGroupName = firstGroup ? (firstGroup.name || '').replace(/\s*\([^)]*\)/g, '').trim() || firstGroup.name : '';
        const targetGroup = firstGroup
          ? storedGroups.find(
              (g) =>
                g.id === firstGroup.id ||
                g.name === cleanGroupName ||
                g.name === firstGroup.name ||
                g.courseName === firstGroup.courseName
            ) || { id: firstGroup.id || '1', name: cleanGroupName }
          : null;

        const presentLessonsCount = student.attendanceStats?.presentCount ?? 0;
        const totalLessonsCount =
          student.attendanceStats?.totalLessons ||
          presentLessonsCount + (student.attendanceStats?.absentCount ?? 0) ||
          16;

        const remLessons = student.finance?.activeSubscription?.lessonsRemaining;
        const lessonsRemainingText =
          typeof remLessons === 'number'
            ? `${remLessons} ${remLessons === 1 ? 'занятие' : remLessons >= 2 && remLessons <= 4 ? 'занятия' : 'занятий'}`
            : '';

        const contactName = cleanParentName || (student.studentType === 'adult_student' ? `${student.firstName} ${student.lastName}` : 'Не указан');
        const contactPhone = primaryParent?.phone || student.phone || '';
        const contactTelegramClean = (primaryParent?.telegram || student.telegram || '').replace('@', '');

        const circumference = 2 * Math.PI * 17; // r=17
        const strokeDashoffset = circumference - (Math.min(100, Math.max(0, attendanceRateNum)) / 100) * circumference;

        return (
          <div className="grid grid-cols-4 gap-4 mb-5">
            {/* КАРТОЧКА 1: «Текущая группа» */}
            <div
              onClick={() => {
                if (targetGroup) {
                  router.push(`/groups/${targetGroup.id}`);
                } else {
                  onOpenEnrollModal?.();
                }
              }}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:border-slate-200 transition-colors cursor-pointer relative group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span>Текущая группа</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>

              <div className="mt-3 min-w-0">
                {firstGroup ? (
                  <>
                    <h3 className="text-sm font-bold text-slate-900 truncate" title={cleanGroupName}>
                      {cleanGroupName}
                    </h3>
                    <p className="text-xs text-slate-500 truncate mt-0.5" title={firstGroup.courseName || cleanGroupName}>
                      {firstGroup.courseName ? `${cleanGroupName} / ${firstGroup.courseName}` : cleanGroupName}
                    </p>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-400">Без группы</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEnrollModal?.();
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Зачислить
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* КАРТОЧКА 2: «Посещаемость» */}
            <div
              onClick={() => onSelectTab('education')}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:border-slate-200 transition-colors cursor-pointer relative group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Посещаемость</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>

              <div className="mt-2 flex items-center gap-3">
                {/* Donut-индикатор (w-12 h-12) */}
                <div className="w-12 h-12 relative flex items-center justify-center shrink-0">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
                    <circle
                      cx="22"
                      cy="22"
                      r="17"
                      className="stroke-slate-100"
                      strokeWidth="4"
                      fill="transparent"
                    />
                    <circle
                      cx="22"
                      cy="22"
                      r="17"
                      className={cn(
                        'transition-all duration-500',
                        attendanceRateNum >= 80
                          ? 'stroke-emerald-500'
                          : attendanceRateNum >= 60
                          ? 'stroke-amber-500'
                          : 'stroke-rose-500'
                      )}
                      strokeWidth="4"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <span className="absolute text-[11px] font-extrabold text-slate-900">
                    {attendanceRateNum}%
                  </span>
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {presentLessonsCount} из {totalLessonsCount} занятий
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {lastAbsence ? (
                      lastAbsence.status === 'absent'
                        ? `${formatAbsenceDate(lastAbsence.date)} пропуск`
                        : `${formatAbsenceDate(lastAbsence.date)} болезнь`
                    ) : (
                      'Все по графику'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* КАРТОЧКА 3: «Баланс» */}
            <div
              onClick={() => role !== 'teacher' && onSelectTab('finance')}
              className={cn(
                'bg-white rounded-2xl p-4 border border-slate-100 shadow-sm transition-colors relative group flex flex-col justify-between',
                role !== 'teacher' ? 'hover:border-slate-200 cursor-pointer' : 'cursor-default'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Баланс</span>
                </div>
                {role !== 'teacher' && (
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                )}
              </div>

              <div className="mt-2 min-w-0 space-y-0.5">
                {role === 'teacher' ? (
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800">Обучение активно</span>
                    <p className="text-[11px] text-slate-400 italic">Финансы скрыты</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          'text-xl font-bold tracking-tight',
                          studentOverdueDebt > 0 ? 'text-rose-600' : 'text-slate-900'
                        )}
                      >
                        {studentOverdueDebt > 0 ? `-${studentOverdueDebt} €` : `${studentDeposit || 0} €`}
                      </span>
                      {lessonsRemainingText && (
                        <span className="text-xs font-semibold text-slate-500">
                          {lessonsRemainingText}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {studentOverdueDebt > 0
                        ? 'Задолженность по оплате'
                        : `Оплачено до ${student.paidUntil || formattedPaidUntil || '28.09.2026'}`}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* КАРТОЧКА 4: «Представитель» */}
            <div
              onClick={() => onSelectTab('profile')}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:border-slate-200 transition-colors cursor-pointer relative group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>{student.studentType === 'adult_student' ? 'Студент' : 'Представитель'}</span>
                  <span className="bg-slate-100 text-slate-600 text-[9.5px] font-medium px-1.5 py-0.5 rounded-md">
                    {student.studentType === 'adult_student' ? 'Прямой контакт' : 'Основной контакт'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>

              <div className="mt-2 min-w-0 space-y-1">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {contactName}
                </h4>
                <div className="flex items-center justify-between gap-1.5">
                  {contactPhone ? (
                    <a
                      href={getTelLink(contactPhone)}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-mono text-slate-600 hover:text-blue-600 truncate font-semibold"
                      title={formatPhone(contactPhone)}
                    >
                      {formatPhone(contactPhone)}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 font-mono">—</span>
                  )}

                  {normalizePhone(contactPhone) && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* WhatsApp */}
                      <a
                        href={getWhatsAppLink(contactPhone)}
                        target="_blank"
                        rel="noreferrer"
                        className="w-5 h-5 rounded bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white flex items-center justify-center transition-all border border-[#25D366]/20 cursor-pointer"
                        title="Написать в WhatsApp"
                      >
                        <WhatsAppIcon className="w-3 h-3" />
                      </a>

                      {/* Telegram */}
                      {contactTelegramClean ? (
                        <a
                          href={`https://t.me/${contactTelegramClean}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-5 h-5 rounded bg-[#229ED9]/10 hover:bg-[#229ED9] text-[#229ED9] hover:text-white flex items-center justify-center transition-all border border-[#229ED9]/20 cursor-pointer"
                          title={`Написать в Telegram (@${contactTelegramClean})`}
                        >
                          <TelegramIcon className="w-3 h-3" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={onOpenTelegramConnect}
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-[#229ED9] text-slate-400 hover:text-white flex items-center justify-center transition-all border border-slate-200 cursor-pointer"
                          title="Подключить Telegram-бота"
                        >
                          <TelegramIcon className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Lesson Modal (Unified with Calendar) */}
      <LessonModal
        isOpen={Boolean(selectedLessonModal)}
        lesson={selectedLessonModal}
        onClose={() => setSelectedLessonModal(null)}
        onSave={(updatedLesson) => {
          saveLessonToStorage(updatedLesson);
          setSelectedLessonModal(null);
          toast.success('Занятие успешно сохранено');
        }}
        onDelete={() => {
          setSelectedLessonModal(null);
          toast.success('Занятие удалено');
        }}
      />
    </div>
  );
}
