'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  X,
} from 'lucide-react';
import { cn, isEntityNew } from '@/lib/utils';
import type { StudentListItem } from '@/app/students/page';
import { restoreStudent } from '@/lib/data/studentStorage';
import { useToast } from '@/context/ToastContext';
import { TelegramChatBox } from '@/components/telegram/TelegramChatBox';

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
  onOpenStudentDrawer,
  onRefreshStudents,
}: StudentsDesktopProps) {
  const toast = useToast();
  const [activeCoursePopoverId, setActiveCoursePopoverId] = useState<string | null>(null);
  const [activeTelegramStudent, setActiveTelegramStudent] = useState<StudentListItem | null>(null);

  const handleStudentClick = (studentId: string, tab?: string) => {
    if (onOpenStudentDrawer) {
      onOpenStudentDrawer(studentId, tab);
    }
  };

  return (
    <div className="hidden md:block w-full overflow-visible bg-white rounded-2xl border border-slate-100 shadow-xs">
      <table className="w-full table-fixed border-collapse text-left text-xs">
        <colgroup>
          <col className="w-[44px]" />   {/* Чекбокс */}
          <col className="w-[21%]" />    {/* Ученик ⇅ */}
          <col className="w-[19%]" />    {/* Представитель */}
          <col className="w-[18%]" />    {/* Обучение */}
          <col className="w-[14%]" />    {/* Ближайшее занятие */}
          <col className="w-[10%]" />    {/* Посещаемость ⇅ */}
          <col className="w-[11%]" />    {/* Баланс ⇅ */}
          <col className="w-[7%]" />     {/* Статус */}
        </colgroup>

        {/* Шапка таблицы */}
        <thead className="h-10 bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
          <tr>
            <th className="px-3.5 py-2.5 text-center">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={onSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                title="Выбрать всех"
              />
            </th>
            <th className="px-3.5 py-2.5 text-left">
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
            <th className="px-3.5 py-2.5 text-left">ПРЕДСТАВИТЕЛЬ</th>
            <th className="px-3.5 py-2.5 text-left">ОБУЧЕНИЕ</th>
            <th className="px-3.5 py-2.5 text-left">БЛИЖАЙШЕЕ ЗАНЯТИЕ</th>
            <th className="px-3.5 py-2.5 text-center">
              <button
                type="button"
                onClick={() => onSortToggle('attendanceRate')}
                className="inline-flex items-center justify-center gap-1 font-semibold text-slate-600 hover:text-blue-600 cursor-pointer mx-auto"
              >
                <span>ПОСЕЩАЕМОСТЬ</span>
                {sortField === 'attendanceRate' ? (
                  sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                )}
              </button>
            </th>
            <th className="px-3.5 py-2.5 text-left">
              <button
                type="button"
                onClick={() => onSortToggle('finance')}
                className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-blue-600 cursor-pointer"
              >
                <span>БАЛАНС</span>
                {sortField === 'finance' ? (
                  sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                )}
              </button>
            </th>
            <th className="px-3.5 py-2.5 text-center">
              <span>СТАТУС</span>
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 text-slate-700">
          {students.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-12 text-center text-xs text-slate-500 font-medium">
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

              // Student age / subtitle
              const calculatedAge = getStudentAge(student.rawStudentObj?.birthDate);
              const ageDisplay = calculatedAge ? `${calculatedAge} лет` : student.isAdult ? 'Взрослый' : '14 лет';
              const categoryTitle = student.isAdult ? 'Студент' : 'Школьник';

              // Course & Subject info
              const primaryGroup = student.groups[0];
              const groupName = primaryGroup?.name || student.groupName || '— Без группы';
              const subjectName = primaryGroup ? getCourseSubject(groupName) : 'Основной курс';
              const subjectIcon = getSubjectIcon(subjectName);

              // Date formatting for paidUntil
              const rawPaidUntil = student.paidUntil || '28.09';
              const formattedPaidUntil = rawPaidUntil.split('.').slice(0, 2).join('.');

              return (
                <tr
                  key={student.id}
                  className={cn(
                    'h-[74px] max-h-[74px] transition-colors border-b border-slate-100 group/row',
                    isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'
                  )}
                >
                  {/* Чекбокс */}
                  <td className="px-3.5 py-2.5 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectRow(student.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>

                  {/* 1. КОЛОНКА: УЧЕНИК */}
                  <td className="px-3.5 py-2.5 align-middle">
                    <div className="flex items-center gap-2.5 min-w-0">
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
                          onClick={(e) => {
                            if (onOpenStudentDrawer) {
                              e.preventDefault();
                              handleStudentClick(student.id);
                            }
                          }}
                          className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors truncate block"
                          title={student.name}
                        >
                          {student.name}
                        </Link>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="truncate">
                            {categoryTitle} · {ageDisplay}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 2. КОЛОНКА: ПРЕДСТАВИТЕЛЬ И МЕССЕНДЖЕРЫ */}
                  <td className="px-3.5 py-2.5 align-middle">
                    {student.parentId || student.parentName ? (
                      <div className="min-w-0 space-y-0.5">
                        <Link
                          href={student.parentId ? `/parents/${student.parentId}` : '#'}
                          className="text-xs font-medium text-slate-800 hover:text-blue-600 truncate block"
                          title={parentCleanName || 'Представитель'}
                        >
                          {parentCleanName || 'Представитель'}
                        </Link>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] text-slate-400 font-mono truncate">
                            {student.parentPhone || '—'}
                          </span>
                          {phoneClean && (
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {/* WhatsApp Mini Button */}
                              <a
                                href={`https://wa.me/${phoneClean}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Написать в WhatsApp"
                                className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors cursor-pointer border border-emerald-200/60"
                              >
                                <WhatsAppIcon className="w-3 h-3" />
                              </a>

                              {/* Telegram Mini Button (In-CRM Integration) */}
                              <button
                                type="button"
                                onClick={() => setActiveTelegramStudent(student)}
                                title="Открыть Telegram-диалог в CRM"
                                className="w-5 h-5 rounded bg-sky-50 text-sky-600 hover:bg-sky-100 flex items-center justify-center transition-colors cursor-pointer border border-sky-200/60"
                              >
                                <TelegramIcon className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 font-medium">— Самостоятельно</div>
                    )}
                  </td>

                  {/* 3. КОЛОНКА: ОБУЧЕНИЕ (Группа / Курс) */}
                  <td className="px-3.5 py-2.5 align-middle">
                    {student.groups.length > 0 ? (
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Иконка предмета/направления */}
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60 shadow-2xs">
                          {subjectIcon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <Link
                              href={primaryGroup ? `/calendar/lessons/${primaryGroup.nextLessonId || primaryGroup.id}` : '#'}
                              className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors truncate block"
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
                                          <Link
                                            href={`/calendar/lessons/${g.nextLessonId || g.id}`}
                                            className="inline-block mt-1 text-blue-400 hover:text-blue-300 font-semibold text-xs"
                                          >
                                            Перейти к уроку →
                                          </Link>
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

                  {/* 4. КОЛОНКА: БЛИЖАЙШЕЕ ЗАНЯТИЕ */}
                  <td className="px-3.5 py-2.5 align-middle">
                    {student.groups.length > 0 ? (
                      <div className="min-w-0 space-y-0.5">
                        <Link
                          href={primaryGroup ? `/calendar/lessons/${primaryGroup.nextLessonId || primaryGroup.id}` : '#'}
                          className="text-xs font-medium text-slate-700 hover:text-blue-600 transition-colors truncate block"
                        >
                          {primaryGroup?.nextLessonDate || student.nextLessonDate || 'Ср 21 сен, 18:45'}
                        </Link>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {student.teacherId ? (
                            <span
                              onClick={() => {
                                if (onOpenTeacherModal && student.teacherId) {
                                  onOpenTeacherModal(student.teacherId, student.teacherName);
                                }
                              }}
                              className="hover:text-blue-600 cursor-pointer"
                            >
                              {student.teacherName}
                            </span>
                          ) : (
                            student.teacherName || 'Мария Иванова'
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 select-none">—</span>
                    )}
                  </td>

                  {/* 5. КОЛОНКА: ПОСЕЩАЕМОСТЬ */}
                  <td className="px-3.5 py-2.5 text-center align-middle">
                    <div
                      onClick={() => handleStudentClick(student.id, 'attendance')}
                      className="flex flex-col items-center justify-center group/att cursor-pointer w-full"
                    >
                      <span
                        className={cn(
                          'text-xs font-bold',
                          student.attendanceRate >= 90
                            ? 'text-slate-800'
                            : student.attendanceRate >= 70
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        )}
                      >
                        {student.attendanceRate}%
                      </span>
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1 border border-slate-200/50">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            student.attendanceRate >= 90
                              ? 'bg-emerald-500'
                              : student.attendanceRate >= 70
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          )}
                          style={{ width: `${Math.min(student.attendanceRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* 6. КОЛОНКА: БАЛАНС */}
                  <td className="px-3.5 py-2.5 align-middle">
                    <div
                      onClick={() => handleStudentClick(student.id, 'finance')}
                      className="group/fin min-w-0 cursor-pointer"
                    >
                      {student.financeStatus === 'active_sub' && (
                        <div className="space-y-0.5">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] font-semibold px-2 py-0.5 rounded-lg inline-flex items-center gap-1 whitespace-nowrap">
                            ✓ Оплачено до {formattedPaidUntil}
                          </span>
                          <div className="text-[11px] text-slate-400 font-normal truncate">
                            Баланс: {student.netBalanceEur > 0 ? `+${student.netBalanceEur} €` : `${student.netBalanceEur} €`}
                          </div>
                        </div>
                      )}
                      {student.financeStatus === 'deposit' && (
                        <div className="space-y-0.5">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] font-semibold px-2 py-0.5 rounded-lg inline-flex items-center gap-1 whitespace-nowrap">
                            Депозит: +{student.balanceEur} €
                          </span>
                          <div className="text-[11px] font-semibold text-emerald-600 truncate">
                            +{student.balanceEur} €
                          </div>
                        </div>
                      )}
                      {student.financeStatus === 'debt' && (
                        <div className="space-y-0.5">
                          <span className="bg-rose-50 text-rose-700 border border-rose-200/60 text-[11px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap inline-block">
                            Долг: -{student.debtEur} €
                          </span>
                          <div className="text-[11px] font-semibold text-rose-600 truncate">
                            -{student.debtEur} €
                          </div>
                        </div>
                      )}
                      {student.financeStatus === 'trial' && (
                        <div className="space-y-0.5">
                          <span className="bg-purple-50 text-purple-700 border border-purple-200/60 text-[11px] font-semibold px-2 py-0.5 rounded-lg inline-block">
                            Пробный
                          </span>
                          <div className="text-[11px] text-purple-700 font-medium truncate">
                            0 €
                          </div>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 7. КОЛОНКА: СТАТУС */}
                  <td className="px-3.5 py-2.5 text-center align-middle">
                    {student.isDeleted ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
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
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 font-semibold text-[11px] inline-block shadow-2xs',
                          student.status === 'active' && 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
                          student.status === 'trial' && 'bg-purple-50 text-purple-700 border border-purple-200/60',
                          student.status === 'paused' && 'bg-amber-50 text-amber-700 border border-amber-200/60',
                          student.status === 'archived' && 'bg-slate-100 text-slate-600 border border-slate-200'
                        )}
                      >
                        {student.status === 'active' && 'Активен'}
                        {student.status === 'trial' && 'Пробный'}
                        {student.status === 'paused' && 'Пауза'}
                        {student.status === 'archived' && 'Архив'}
                      </span>
                    )}
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
    </div>
  );
}

