'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StudentListItem } from '@/app/students/page';
import { restoreStudent } from '@/lib/data/studentStorage';
import { useToast } from '@/context/ToastContext';

const WhatsAppIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={cn('fill-current', className)} viewBox="0 0 24 24">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

const TelegramIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={cn('fill-current', className)} viewBox="0 0 24 24">
    <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.536-.196 1.006.128.833.942z" />
  </svg>
);

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
  onOpenTeacherModal: (teacherId: string, teacherName?: string) => void;
  onOpenStudentDrawer: (id: string, tab?: string) => void;
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
  const router = useRouter();
  const toast = useToast();
  const [activeCoursePopoverId, setActiveCoursePopoverId] = useState<string | null>(null);

  return (
    <div className="hidden md:block w-full overflow-visible">
      <table className="w-full table-fixed border-collapse text-left text-xs">
        <colgroup>
          <col className="w-[44px]" />   {/* Чекбокс */}
          <col className="w-[20%]" />    {/* Ученик */}
          <col className="w-[22%]" />    {/* Представитель */}
          <col className="w-[18%]" />    {/* Курс */}
          <col className="w-[14%]" />    {/* Учитель */}
          <col className="w-[10%]" />    {/* Посещаемость */}
          <col className="w-[16%]" />    {/* Баланс */}
        </colgroup>

        <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="py-3.5 pl-3 pr-1 text-center">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={onSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                title="Выбрать всех"
              />
            </th>
            <th className="py-3.5 px-2.5">
              <button
                type="button"
                onClick={() => onSortToggle('name')}
                className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-blue-600 cursor-pointer"
              >
                <span>УЧЕНИК</span>
                {sortField === 'name' ? (
                  sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                )}
              </button>
            </th>
            <th className="px-2.5 py-3.5">ПРЕДСТАВИТЕЛЬ</th>
            <th className="px-2.5 py-3.5">КУРС</th>
            <th className="px-2.5 py-3.5">УЧИТЕЛЬ</th>
            <th className="px-2.5 py-3.5 text-center">
              <button
                type="button"
                onClick={() => onSortToggle('attendanceRate')}
                className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-blue-600 cursor-pointer"
              >
                <span>ПОСЕЩАЕМОСТЬ</span>
                {sortField === 'attendanceRate' ? (
                  sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                )}
              </button>
            </th>
            <th className="px-2.5 py-3.5">
              <button
                type="button"
                onClick={() => onSortToggle('finance')}
                className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-blue-600 cursor-pointer"
              >
                <span>БАЛАНС</span>
                {sortField === 'finance' ? (
                  sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                )}
              </button>
            </th>
            {statusFilter === 'deleted' && (
              <th className="py-3.5 pl-2 pr-3 text-right">ДЕЙСТВИЕ</th>
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 text-slate-700">
          {students.length === 0 ? (
            <tr>
              <td colSpan={statusFilter === 'deleted' ? 8 : 7} className="py-8 text-center text-slate-500">
                {statusFilter === 'deleted' ? 'В списке удаленных ничего нет' : 'Ученики не найдены'}
              </td>
            </tr>
          ) : (
            students.map((student) => {
              const isSelected = selectedIds.includes(student.id);

              return (
                <tr
                  key={student.id}
                  onClick={() => {
                    if (statusFilter !== 'deleted') {
                      onOpenStudentDrawer(student.id);
                    }
                  }}
                  className={cn(
                    'h-14 transition-colors border-b border-slate-100 cursor-pointer',
                    isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'
                  )}
                >
                  {/* Checkbox */}
                  <td className="py-2.5 pl-3 pr-1 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectRow(student.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>

                  {/* 1. Ученик с аватаром-индикатором */}
                  <td className="py-2.5 px-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                          {student.initials}
                        </div>
                        <span
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white',
                            student.status === 'active'
                              ? 'bg-emerald-500'
                              : student.status === 'trial'
                              ? 'bg-purple-500'
                              : 'bg-amber-500'
                          )}
                        />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/students?id=${student.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenStudentDrawer(student.id);
                          }}
                          className="font-semibold text-sm text-slate-900 hover:text-blue-600 transition-colors block truncate"
                        >
                          {student.name}
                        </Link>
                        <span className="text-[11px] text-slate-400">
                          {student.isAdult ? 'Студент (18+)' : 'Школьник'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* 2. Представитель / Родитель */}
                  <td className="py-2.5 px-2.5">
                    <div className="flex items-center justify-between gap-1.5 max-w-full">
                      <div className="min-w-0">
                        {student.parentId ? (
                          <Link
                            href={`/parents/${student.parentId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-medium text-slate-800 hover:text-blue-600 truncate block"
                          >
                            {student.parentName} <span className="text-slate-400 font-normal">({student.parentRelation})</span>
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Сам ученик (18+)</span>
                        )}
                        <a
                          href={`tel:${(student.parentPhone || '').replace(/\D/g, '')}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-slate-500 hover:text-slate-800 block truncate"
                        >
                          {student.parentPhone}
                        </a>
                      </div>

                      {student.parentPhone && student.parentPhone !== '—' && (
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {/* WhatsApp Authentic Brand Button */}
                          <a
                            href={`https://wa.me/${(student.parentPhone || '').replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Написать в WhatsApp"
                            className="w-7 h-7 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white flex items-center justify-center transition-all border border-[#25D366]/20 shadow-2xs cursor-pointer"
                          >
                            <WhatsAppIcon className="w-4 h-4" />
                          </a>

                          {/* Telegram Authentic Brand Button */}
                          <a
                            href={student.telegram ? `https://t.me/${student.telegram.replace('@', '')}` : `https://wa.me/${(student.parentPhone || '').replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Написать в Telegram"
                            className="w-7 h-7 rounded-lg bg-[#229ED9]/10 hover:bg-[#229ED9] text-[#229ED9] hover:text-white flex items-center justify-center transition-all border border-[#229ED9]/20 shadow-2xs cursor-pointer"
                          >
                            <TelegramIcon className="w-4 h-4" />
                          </a>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 3. Курс / Урок */}
                  <td className="py-2.5 px-2.5">
                    {student.groups.length > 0 ? (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="min-w-0">
                          <Link
                            href={`/calendar/lessons/${student.groups[0].nextLessonId || student.groups[0].id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-semibold text-blue-600 hover:underline block truncate max-w-[150px]"
                          >
                            {student.groups[0].name}
                          </Link>
                          <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
                            ↳ {student.groups[0].nextLessonDate || 'Ср 21 сен, 18:45'}
                          </span>
                        </div>

                        {/* Badge & Hover Popover */}
                        {student.groups.length > 1 && (
                          <div
                            className="relative shrink-0"
                            onMouseEnter={() => setActiveCoursePopoverId(student.id)}
                            onMouseLeave={() => setActiveCoursePopoverId(null)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] px-1.5 py-0.5 rounded font-semibold cursor-pointer transition-colors">
                              +{student.groups.length - 1} курс
                            </span>

                            {/* Popover */}
                            {activeCoursePopoverId === student.id && (
                              <div className="absolute left-0 bottom-full mb-2 z-50 w-72 p-3.5 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 text-xs animate-in fade-in duration-150">
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
                                        onClick={(e) => e.stopPropagation()}
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
                    ) : (
                      <span
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-slate-400 cursor-default select-none"
                      >
                        — Без группы
                      </span>
                    )}
                  </td>

                  {/* 4. Учитель (Без эмодзи, динамическая привязка к student.teacherId) */}
                  <td className="py-2.5 px-2.5" onClick={(e) => e.stopPropagation()}>
                    {student.teacherId ? (
                      <button
                        type="button"
                        onClick={() => onOpenTeacherModal(student.teacherId!, student.teacherName)}
                        className="text-xs font-medium text-slate-700 hover:text-blue-600 hover:underline transition-colors text-left truncate block max-w-full cursor-pointer"
                        title="Открыть расписание преподавателя"
                      >
                        {student.teacherName}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 select-none">—</span>
                    )}
                  </td>

                  {/* 5. Посещаемость (text-center, cell affordance) */}
                  <td
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenStudentDrawer(student.id, 'attendance');
                    }}
                    title="Открыть журнал посещаемости"
                    className="py-2.5 px-2.5 text-center hover:bg-slate-100/80 cursor-pointer transition-colors"
                  >
                    <span
                      className={cn(
                        'text-xs font-bold',
                        student.attendanceRate >= 90
                          ? 'text-emerald-600'
                          : student.attendanceRate >= 75
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      )}
                    >
                      {student.attendanceRate}%
                    </span>
                  </td>

                  {/* 6. Баланс (cell affordance) */}
                  <td
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenStudentDrawer(student.id, 'finance');
                    }}
                    title="Открыть детализацию счета (Курс конвертации: 1 € = 100 ₽)"
                    className="py-2.5 px-2.5 whitespace-nowrap hover:bg-slate-100/80 cursor-pointer transition-colors"
                  >
                    {student.financeStatus === 'active_sub' && (
                      <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md truncate max-w-full">
                        ✓ Оплачено до {student.paidUntil || '28.09.2026'}
                      </span>
                    )}
                    {student.financeStatus === 'deposit' && (
                      <div>
                        <div className="text-xs font-bold text-emerald-600">+{student.balanceEur} €</div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {student.balanceRub?.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                    )}
                    {student.financeStatus === 'debt' && (
                      <div>
                        <div className="text-xs font-bold text-rose-600">-{student.debtEur} €</div>
                        <div className="text-[10px] text-rose-500 font-medium">
                          -{student.debtRub?.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                    )}
                    {student.financeStatus === 'trial' && (
                      <span className="inline-flex items-center text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                        Пробный урок
                      </span>
                    )}
                  </td>

                  {statusFilter === 'deleted' && (
                    <td className="py-2.5 pl-2 pr-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          restoreStudent(student.id);
                          onRefreshStudents();
                          toast.success(`Ученик ${student.name} восстановлен`);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Восстановить
                      </button>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
