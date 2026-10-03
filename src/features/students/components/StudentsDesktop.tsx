'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Globe,
  Code2,
  Calculator,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Calendar,
  MoreHorizontal,
  X,
  User,
  CreditCard,
  MessageSquare,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { cn, isEntityNew, formatPhone, getWhatsAppLink, normalizePhone } from '@/lib/utils';
import type { StudentListItem } from '@/app/students/page';
import { restoreStudent, saveStudentToStorage } from '@/lib/data/studentStorage';
import { getStoredLessons, saveLessonToStorage } from '@/lib/data/lessonStorage';
import type { FullLessonData, FullStudentData } from '@/lib/data/mockData';
import { useToast } from '@/context/ToastContext';
import { TelegramChatBox } from '@/components/telegram/TelegramChatBox';
import { LessonModal } from '@/components/calendar/LessonModal';

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

function getCourseSubject(groupName: string): string {
  const gn = (groupName || '').toLowerCase();
  if (gn.includes('english') || gn.includes('англ') || gn.includes('b1') || gn.includes('a2') || gn.includes('c1') || gn.includes('teens')) {
    return 'Английский язык';
  }
  if (gn.includes('math') || gn.includes('матем') || gn.includes('алгебр') || gn.includes('геометр')) {
    return 'Математика';
  }
  if (gn.includes('code') || gn.includes('програм') || gn.includes('python') || gn.includes('scratch') || gn.includes('web') || gn.includes('it')) {
    return 'Программирование';
  }
  if (gn.includes('робот') || gn.includes('robot')) {
    return 'Робототехника';
  }
  if (gn.includes('дизайн') || gn.includes('design') || gn.includes('art')) {
    return 'Графический дизайн';
  }
  if (gn.includes('испан') || gn.includes('spanish')) {
    return 'Испанский язык';
  }
  if (gn.includes('немец') || gn.includes('deutsch')) {
    return 'Немецкий язык';
  }
  return 'Основной курс';
}

function getSubjectIcon(subject: string) {
  if (subject === 'Английский язык' || subject.includes('язык')) {
    return <Globe className="w-3.5 h-3.5" />;
  }
  if (subject === 'Программирование' || subject === 'Робототехника') {
    return <Code2 className="w-3.5 h-3.5" />;
  }
  if (subject === 'Математика') {
    return <Calculator className="w-3.5 h-3.5" />;
  }
  return <BookOpen className="w-3.5 h-3.5" />;
}

function getStudentAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 && age < 100 ? age : null;
}

interface UpcomingLessonInfo {
  lessonId: string;
  dateDayFormatted: string; // e.g. "Вт, 21 сен"
  timeFormatted: string;    // e.g. "18:45 – 20:15"
  lessonObj: FullLessonData;
}

function findUpcomingLessonForStudent(
  student: StudentListItem,
  allLessons: FullLessonData[]
): UpcomingLessonInfo | null {
  const studentGroupIds = new Set((student.groups || []).map((g) => String(g.id).trim()));
  const studentGroupNames = new Set((student.groups || []).map((g) => (g.name || '').toLowerCase().trim()));
  const studentFullName = student.name.toLowerCase().trim();

  const parseLessonDateMs = (l: FullLessonData): number => {
    if (!l.date) return 0;
    let isoDate = l.date;
    if (l.date.includes('.')) {
      const parts = l.date.split('.');
      if (parts.length === 3) {
        isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    const time = l.startTime && l.startTime.length >= 4 ? l.startTime : '00:00';
    const parsed = new Date(`${isoDate}T${time.length === 5 ? time + ':00' : time}`).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  const candidates = allLessons.filter((l) => {
    if (l.status === 'cancelled') return false;

    const matchesGroupId = l.groupId && studentGroupIds.has(String(l.groupId).trim());
    const matchesGroupName = l.groupName && studentGroupNames.has(l.groupName.toLowerCase().trim());
    const matchesStudentList =
      Array.isArray(l.students) &&
      l.students.some(
        (s) => String(s.id) === String(student.id) || (s.name && s.name.toLowerCase().trim() === studentFullName)
      );

    return Boolean(matchesGroupId || matchesGroupName || matchesStudentList);
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => parseLessonDateMs(a) - parseLessonDateMs(b));
  const next = candidates[0];

  const lessonMs = parseLessonDateMs(next);
  let dateDayFormatted = next.dateFormatted || next.date;
  if (lessonMs > 0) {
    const d = new Date(lessonMs);
    const weekday = d.toLocaleDateString('ru-RU', { weekday: 'short' });
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const dayMonth = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    dateDayFormatted = `${capitalizedWeekday}, ${dayMonth}`;
  }

  const timeFormatted = `${next.startTime || '18:45'} – ${next.endTime || '20:15'}`;

  return {
    lessonId: next.id,
    dateDayFormatted,
    timeFormatted,
    lessonObj: next,
  };
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Активен';
    case 'trial':
      return 'Пробный';
    case 'paused':
      return 'Пауза';
    case 'archived':
      return 'Архив';
    default:
      return 'Активен';
  }
}

type SortField = 'name' | 'attendanceRate' | 'finance';
type SortOrder = 'default' | 'asc' | 'desc';

interface StudentsDesktopProps {
  students: StudentListItem[];
  selectedIds: string[];
  allFilteredSelected: boolean;
  onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleSelectRow: (id: string) => void;
  sortField: SortField | null;
  sortOrder: SortOrder;
  onSortToggle: (field: SortField) => void;
  statusFilter: string;
  onOpenTeacherModal?: (teacherId: string, teacherName?: string) => void;
  onSelectStudent?: (id: string, tab?: string) => void;
  onOpenStudentDrawer?: (id: string, tab?: string) => void;
  onRefreshStudents: () => void;
}

export function StudentsDesktop({
  students,
  selectedIds,
  allFilteredSelected,
  onSelectAll,
  onToggleSelectRow,
  sortField,
  sortOrder,
  onSortToggle,
  statusFilter,
  onOpenTeacherModal,
  onSelectStudent,
  onOpenStudentDrawer,
  onRefreshStudents,
}: StudentsDesktopProps) {
  const router = useRouter();
  const toast = useToast();
  const [activeCoursePopoverId, setActiveCoursePopoverId] = useState<string | null>(null);
  const [activeTelegramStudent, setActiveTelegramStudent] = useState<StudentListItem | null>(null);
  const [activeStatusDropdownId, setActiveStatusDropdownId] = useState<string | null>(null);
  const [activeActionsRowId, setActiveActionsRowId] = useState<string | null>(null);
  const [selectedLessonModal, setSelectedLessonModal] = useState<FullLessonData | null>(null);

  // Memoized lesson storage retrieval to prevent excessive re-renders
  const allLessons = useMemo(() => {
    return typeof window !== 'undefined' ? getStoredLessons() : [];
  }, [students]);

  const handleStudentClick = (studentId: string, tab?: string) => {
    if (onSelectStudent) {
      onSelectStudent(studentId, tab);
    } else if (onOpenStudentDrawer) {
      onOpenStudentDrawer(studentId, tab);
    } else {
      router.push(tab ? `/students/${studentId}?tab=${tab}` : `/students/${studentId}`);
    }
  };

  const handleStatusChange = (
    student: StudentListItem,
    newStatus: 'active' | 'trial' | 'paused' | 'archived'
  ) => {
    setActiveStatusDropdownId(null);
    const updatedStudent: FullStudentData = {
      ...student.rawStudentObj,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    saveStudentToStorage(updatedStudent);
    onRefreshStudents();
    toast.success(`Статус ученика ${student.name} изменен на «${getStatusLabel(newStatus)}»`);
  };

  const handleDeleteStudent = (student: StudentListItem) => {
    setActiveActionsRowId(null);
    const updatedStudent: FullStudentData = {
      ...student.rawStudentObj,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    };
    saveStudentToStorage(updatedStudent);
    onRefreshStudents();
    toast.success(`Ученик ${student.name} перемещен в удаленные`);
  };

  return (
    <div className="hidden md:block w-full overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-xs">
      <table className="w-full table-fixed border-collapse text-left text-xs">
        <colgroup>
          <col className="w-[36px]" />   {/* Чекбокс 36px */}
          <col className="w-[210px]" />  {/* Ученик 210px */}
          <col className="w-[175px]" />  {/* Представитель 175px (1-2 символа до значков) */}
          <col className="w-[180px]" />  {/* Обучение 180px */}
          <col className="w-[135px]" />  {/* Ближайшее занятие 135px (без ...) */}
          <col className="w-[118px]" />  {/* Посещаемость 118px (расширен под заголовок) */}
          <col className="w-[70px]" />   {/* Баланс 70px (смещен вправо к статусу) */}
          <col className="w-[90px]" />   {/* Статус 90px */}
          <col className="w-[36px]" />   {/* Действия ··· 36px */}
        </colgroup>

        {/* Шапка таблицы */}
        <thead className="h-10 bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
          <tr>
            <th className="px-1 py-2 text-center">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={onSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                title="Выбрать всех"
              />
            </th>
            <th className="pl-1.5 pr-2 py-2 text-left">
              <button
                type="button"
                onClick={() => onSortToggle('name')}
                className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-blue-600 cursor-pointer"
              >
                <span>УЧЕНИК</span>
                {sortField === 'name' ? (
                  sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                )}
              </button>
            </th>
            <th className="px-2 py-2 text-left">ПРЕДСТАВИТЕЛЬ</th>
            <th className="px-2 py-2 text-left">ОБУЧЕНИЕ</th>
            <th className="px-2 py-2 text-left">БЛИЖАЙШЕЕ ЗАНЯТИЕ</th>
            <th className="px-2 py-2 text-center">
              <button
                type="button"
                onClick={() => onSortToggle('attendanceRate')}
                className="inline-flex items-center justify-center gap-1 font-semibold text-slate-600 hover:text-blue-600 cursor-pointer mx-auto whitespace-nowrap"
              >
                <span>ПОСЕЩАЕМОСТЬ</span>
                {sortField === 'attendanceRate' ? (
                  sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                )}
              </button>
            </th>
            <th className="px-1 py-2 text-left">
              <button
                type="button"
                onClick={() => onSortToggle('finance')}
                className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-blue-600 cursor-pointer whitespace-nowrap"
              >
                <span>БАЛАНС</span>
                {sortField === 'finance' ? (
                  sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                )}
              </button>
            </th>
            <th className="px-1 py-2 text-center">
              <span>СТАТУС</span>
            </th>
            <th className="px-1 py-2 text-center">
              <span className="sr-only">Действия</span>
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 text-slate-700">
          {students.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-12 text-center text-xs text-slate-500 font-medium">
                {statusFilter === 'deleted' ? 'В списке удаленных ничего нет' : 'Ученики не найдены'}
              </td>
            </tr>
          ) : (
            students.map((student) => {
              const isSelected = selectedIds.includes(student.id);
              const parentCleanName = student.parentName
                ? student.parentName.replace(/\s*\([^)]*\)/, '').trim()
                : '';
              const phoneClean = (student.parentPhone || '').replace(/\D/g, '');

              // Student age / category
              const calculatedAge = getStudentAge(student.rawStudentObj?.birthDate);
              const ageDisplay = calculatedAge ? `${calculatedAge} лет` : student.isAdult ? 'Взрослый' : '14 лет';
              const categoryTitle = student.isAdult ? 'Студент' : 'Школьник';

              // Course & Subject info
              const primaryGroup = student.groups[0];
              const groupName = primaryGroup?.name || student.groupName || '— Без группы';
              const subjectName = primaryGroup ? getCourseSubject(groupName) : 'Основной курс';
              const subjectIcon = getSubjectIcon(subjectName);

              // 1. Ближайшее занятие (реальный поиск из getStoredLessons)
              const upcomingLesson = findUpcomingLessonForStudent(student, allLessons);

              // 2. Посещаемость (дробь + процент)
              const attendanceRate = student.attendanceRate;
              const presentCount =
                student.rawStudentObj.attendanceStats?.presentCount ??
                Math.round((attendanceRate / 100) * 16);
              const totalLessonsCount =
                student.rawStudentObj.attendanceStats?.totalLessons ||
                (presentCount + (student.rawStudentObj.attendanceStats?.absentCount ?? (attendanceRate < 100 ? 1 : 0))) ||
                16;

              // 3. Баланс (EUR + RUB конвертация)
              const netBalance = student.netBalanceEur;
              const hasDebt = student.debtEur > 0 || netBalance < 0 || student.financeStatus === 'debt';
              const hasDeposit = student.balanceEur > 0 || netBalance > 0 || student.financeStatus === 'deposit';

              const rubAmount =
                student.balanceRub ||
                student.debtRub ||
                Math.abs(Math.round(netBalance * 98));
              const rubFormatted = rubAmount > 0 ? `≈ ${rubAmount.toLocaleString('ru-RU')} ₽` : '';

              // 4. Статус ученика
              const isAttention =
                student.isChurnRisk ||
                (student.absentLessons !== undefined && student.absentLessons >= 3) ||
                student.debtEur > 0 ||
                student.attendanceRate < 80;

              return (
                <tr
                  key={student.id}
                  className={cn(
                    'h-[74px] max-h-[74px] transition-colors border-b border-slate-100 group/row relative',
                    isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'
                  )}
                >
                  {/* Чекбокс */}
                  <td className="px-1 py-2 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectRow(student.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>

                  {/* 1. КОЛОНКА: УЧЕНИК */}
                  <td className="pl-1.5 pr-2 py-2 align-middle">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        onClick={() => handleStudentClick(student.id)}
                        className="relative shrink-0 cursor-pointer group/avatar"
                      >
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 group-hover/avatar:border-blue-400 group-hover/avatar:bg-blue-50 transition-colors">
                          {student.initials}
                        </div>
                        {isEntityNew(student.createdAt, student.isNewUntil) && (
                          <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-white text-[8px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-tighter shadow-xs ring-1 ring-white z-10">
                            NEW
                          </span>
                        )}
                        <span
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white',
                            student.status === 'active'
                              ? 'bg-emerald-500'
                              : student.status === 'trial'
                              ? 'bg-purple-500'
                              : student.status === 'paused'
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
                          )}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/students/${student.id}`}
                          className="text-xs font-semibold text-slate-900 hover:text-blue-600 hover:underline transition-colors truncate block cursor-pointer"
                          title={student.name}
                        >
                          {student.name}
                        </Link>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {categoryTitle} · {ageDisplay}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 2. КОЛОНКА: ПРЕДСТАВИТЕЛЬ И МЕССЕНДЖЕРЫ (1-2 символа зазор до иконок) */}
                  <td className="px-2 py-2 align-middle">
                    {student.parentId || student.parentName ? (
                      <div className="flex items-center justify-between gap-1.5 min-w-0">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={student.parentId ? `/parents/${student.parentId}` : '#'}
                            className="text-xs font-semibold text-slate-800 hover:text-blue-600 truncate block transition-colors"
                            title={parentCleanName || 'Представитель'}
                          >
                            {parentCleanName || 'Представитель'}
                          </Link>
                          <div
                            className="text-[11px] text-slate-600 font-mono whitespace-nowrap mt-0.5"
                            title={formatPhone(student.parentPhone)}
                          >
                            {formatPhone(student.parentPhone)}
                          </div>
                        </div>

                        {normalizePhone(student.parentPhone) && (
                          <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {/* WhatsApp Button (24x24) */}
                            <a
                              href={getWhatsAppLink(student.parentPhone)}
                              target="_blank"
                              rel="noreferrer"
                              title="Написать в WhatsApp"
                              className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors cursor-pointer border border-emerald-200/70 shadow-2xs"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5" />
                            </a>

                            {/* Telegram Button (24x24) */}
                            <button
                              type="button"
                              onClick={() => setActiveTelegramStudent(student)}
                              title="Открыть Telegram-диалог в CRM"
                              className="w-6 h-6 rounded-md bg-sky-50 text-sky-600 hover:bg-sky-100 flex items-center justify-center transition-colors cursor-pointer border border-sky-200/70 shadow-2xs"
                            >
                              <TelegramIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 font-medium">— Самостоятельно</div>
                    )}
                  </td>

                  {/* 3. КОЛОНКА: ОБУЧЕНИЕ (Группа / Курс) */}
                  <td className="px-2 py-2 align-middle">
                    {student.groups.length > 0 ? (
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Иконка предмета/направления */}
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60 shadow-2xs">
                          {subjectIcon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <Link
                              href={primaryGroup ? `/groups/${primaryGroup.id}` : '#'}
                              className="text-xs font-semibold text-slate-900 hover:text-blue-600 cursor-pointer transition-colors truncate block"
                              title={groupName}
                            >
                              {groupName}
                            </Link>

                            {student.groups.length > 1 && (
                              <div
                                className="relative shrink-0 inline-flex items-center"
                                onMouseEnter={() => setActiveCoursePopoverId(student.id)}
                                onMouseLeave={() => setActiveCoursePopoverId(null)}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1 py-0.2 rounded cursor-pointer hover:bg-blue-100 transition-colors">
                                  +{student.groups.length - 1}
                                </span>

                                {/* Popover */}
                                {activeCoursePopoverId === student.id && (
                                  <div className="absolute left-0 bottom-full mb-2 z-50 w-72 p-3.5 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 text-xs animate-in fade-in duration-150 font-normal">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
                                      Дополнительные курсы ({student.groups.length - 1})
                                    </div>
                                    <div className="space-y-2.5">
                                      {student.groups.slice(1).map((g) => (
                                        <div key={g.id} className="space-y-1">
                                          <div className="font-bold text-white text-sm">{g.name}</div>
                                          <div className="text-slate-300 text-xs flex items-center gap-1.5">
                                            <span>🗓 {g.schedule}</span>
                                            {g.room && <span>• {g.room}</span>}
                                          </div>
                                          <div className="text-slate-400 text-[11px]">
                                            Преподаватель: {g.teacherName}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveCoursePopoverId(null);
                                              const lesson = allLessons.find((l) => l.id === g.nextLessonId || l.groupId === g.id);
                                              if (lesson) {
                                                setSelectedLessonModal(lesson);
                                              }
                                            }}
                                            className="inline-block mt-1 text-blue-400 hover:text-blue-300 font-semibold text-xs cursor-pointer text-left"
                                          >
                                            Перейти к уроку →
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {subjectName}
                          </div>
                        </div>

                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 ml-auto" />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 select-none pl-1">— Без группы</span>
                    )}
                  </td>

                  {/* 4. КОЛОНКА: БЛИЖАЙШЕЕ ЗАНЯТИЕ (Без многоточий) */}
                  <td className="px-2 py-2 align-middle">
                    {upcomingLesson ? (
                      <button
                        type="button"
                        onClick={() => {
                          const lesson = upcomingLesson.lessonObj || allLessons.find((l) => l.id === upcomingLesson.lessonId);
                          if (lesson) {
                            setSelectedLessonModal(lesson);
                          }
                        }}
                        className="w-full text-left p-1 -m-1 rounded-lg hover:bg-slate-100/80 transition-colors group/lesson cursor-pointer block"
                        title="Открыть карточку урока"
                      >
                        <div className="flex items-center text-xs font-semibold text-slate-800 group-hover/lesson:text-blue-600 transition-colors whitespace-nowrap">
                          <Calendar className="w-3.5 h-3.5 text-blue-600 mr-1.5 shrink-0" />
                          <span className="whitespace-nowrap">{upcomingLesson.dateDayFormatted}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap pl-5">
                          {upcomingLesson.timeFormatted}
                        </div>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-normal italic select-none whitespace-nowrap">
                        Нет занятий
                      </span>
                    )}
                  </td>

                  {/* 5. КОЛОНКА: ПОСЕЩАЕМОСТЬ */}
                  <td className="px-2 py-2 text-center align-middle">
                    <div
                      onClick={() => handleStudentClick(student.id, 'attendance')}
                      className="flex flex-col items-center justify-center group/att cursor-pointer w-full"
                    >
                      <span className="text-xs font-bold text-slate-900 group-hover/att:text-blue-600 transition-colors leading-tight">
                        {attendanceRate}%
                      </span>
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden my-1 border border-slate-200/40">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            attendanceRate >= 85
                              ? 'bg-emerald-500'
                              : attendanceRate >= 70
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          )}
                          style={{ width: `${Math.min(attendanceRate, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium leading-tight">
                        {presentCount} / {totalLessonsCount}
                      </span>
                    </div>
                  </td>

                  {/* 6. КОЛОНКА: БАЛАНС (Смещен вправо к статусу) */}
                  <td className="px-1 py-2 align-middle">
                    <div
                      onClick={() => handleStudentClick(student.id, 'finance')}
                      className="group/fin min-w-0 cursor-pointer space-y-0.5"
                    >
                      {hasDebt ? (
                        <div className="inline-block text-xs font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200/60 whitespace-nowrap">
                          -{student.debtEur || Math.abs(netBalance)} €
                        </div>
                      ) : hasDeposit ? (
                        <div className="inline-block text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60 whitespace-nowrap">
                          +{student.balanceEur || netBalance} €
                        </div>
                      ) : student.status === 'trial' || student.financeStatus === 'trial' ? (
                        <div className="inline-block text-xs font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md border border-purple-200/60 whitespace-nowrap">
                          Пробный
                        </div>
                      ) : (
                        <div className="inline-block text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/60 whitespace-nowrap">
                          0 €
                        </div>
                      )}

                      {rubFormatted && (
                        <div className="text-[10px] text-slate-400 font-normal truncate whitespace-nowrap">
                          {rubFormatted}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 7. КОЛОНКА: СТАТУС (Интерактивный выпадающий селектор) */}
                  <td className="px-1 py-2 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                    {student.isDeleted ? (
                      <button
                        type="button"
                        onClick={() => {
                          restoreStudent(student.id);
                          onRefreshStudents();
                          toast.success(`Ученик ${student.name} восстановлен`);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                        title="Восстановить ученика"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Вернуть</span>
                      </button>
                    ) : (
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveStatusDropdownId(
                              activeStatusDropdownId === student.id ? null : student.id
                            )
                          }
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 transition-all cursor-pointer shadow-2xs border whitespace-nowrap',
                            isAttention && student.status === 'active'
                              ? 'bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100'
                              : student.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100'
                              : student.status === 'trial'
                              ? 'bg-purple-50 text-purple-700 border-purple-200/60 hover:bg-purple-100'
                              : student.status === 'paused'
                              ? 'bg-amber-50 text-amber-700 border-amber-200/60 hover:bg-amber-100'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          )}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full shrink-0',
                              isAttention && student.status === 'active'
                                ? 'bg-rose-500 animate-pulse'
                                : student.status === 'active'
                                ? 'bg-emerald-500'
                                : student.status === 'trial'
                                ? 'bg-purple-500'
                                : student.status === 'paused'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            )}
                          />
                          <span>
                            {isAttention && student.status === 'active'
                              ? 'Внимание'
                              : getStatusLabel(student.status)}
                          </span>
                          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                        </button>

                        {/* Status Dropdown Menu */}
                        {activeStatusDropdownId === student.id && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setActiveStatusDropdownId(null)}
                            />
                            <div className="absolute right-0 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-40 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Сменить статус
                              </div>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student, 'active')}
                                className={cn(
                                  'w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors cursor-pointer',
                                  student.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                                    : 'text-slate-700 hover:bg-slate-50'
                                )}
                              >
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span>Активен</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student, 'trial')}
                                className={cn(
                                  'w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors cursor-pointer',
                                  student.status === 'trial'
                                    ? 'bg-purple-50 text-purple-800 font-semibold'
                                    : 'text-slate-700 hover:bg-slate-50'
                                )}
                              >
                                <span className="h-2 w-2 rounded-full bg-purple-500" />
                                <span>Пробный</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student, 'paused')}
                                className={cn(
                                  'w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors cursor-pointer',
                                  student.status === 'paused'
                                    ? 'bg-amber-50 text-amber-800 font-semibold'
                                    : 'text-slate-700 hover:bg-slate-50'
                                )}
                              >
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                <span>Пауза</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student, 'archived')}
                                className={cn(
                                  'w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors cursor-pointer',
                                  student.status === 'archived'
                                    ? 'bg-slate-100 text-slate-800 font-semibold'
                                    : 'text-slate-700 hover:bg-slate-50'
                                )}
                              >
                                <span className="h-2 w-2 rounded-full bg-slate-400" />
                                <span>В архив</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </td>

                  {/* 8. ДЕЙСТВИЯ СТРОКИ «···» */}
                  <td className="px-1 py-2 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveActionsRowId(
                            activeActionsRowId === student.id ? null : student.id
                          )
                        }
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Действия по ученику"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* Row Actions Menu */}
                      {activeActionsRowId === student.id && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setActiveActionsRowId(null)}
                          />
                          <div className="absolute right-0 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-40 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveActionsRowId(null);
                                handleStudentClick(student.id, 'profile');
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg text-left transition-colors cursor-pointer"
                            >
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>Открыть профиль</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveActionsRowId(null);
                                handleStudentClick(student.id, 'finance');
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg text-left transition-colors cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                              <span>История оплат</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveActionsRowId(null);
                                setActiveTelegramStudent(student);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg text-left transition-colors cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                              <span>Написать в Telegram</span>
                            </button>

                            <div className="my-1 border-t border-slate-100" />

                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(student)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg text-left transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>Удалить ученика</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* In-CRM Telegram Chat Dialog Modal */}
      {activeTelegramStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <TelegramIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Telegram-диалог: {activeTelegramStudent.name}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {activeTelegramStudent.parentName ? `Родитель: ${activeTelegramStudent.parentName}` : 'Личный чат с учеником'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTelegramStudent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-[80vh] overflow-y-auto">
              <TelegramChatBox
                recipientType="student"
                recipientId={activeTelegramStudent.id}
                recipientName={activeTelegramStudent.name}
                telegramHandle={activeTelegramStudent.telegram}
                onMessageSent={() => {
                  onRefreshStudents();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* In-CRM Lesson Modal (Unified with Calendar) */}
      <LessonModal
        isOpen={Boolean(selectedLessonModal)}
        lesson={selectedLessonModal}
        onClose={() => setSelectedLessonModal(null)}
        onSave={(updatedLesson) => {
          saveLessonToStorage(updatedLesson);
          setSelectedLessonModal(null);
          onRefreshStudents();
          toast.success('Занятие успешно сохранено');
        }}
        onDelete={() => {
          setSelectedLessonModal(null);
          onRefreshStudents();
          toast.success('Занятие удалено');
        }}
      />
    </div>
  );
}

