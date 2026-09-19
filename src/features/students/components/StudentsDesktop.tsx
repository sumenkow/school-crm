'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, Copy, Phone, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StudentListItem } from '@/app/students/page';
import { restoreStudent } from '@/lib/data/studentStorage';
import { useToast } from '@/context/ToastContext';

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
  onRefreshStudents,
}: StudentsDesktopProps) {
  const toast = useToast();
  const [activeCoursePopoverId, setActiveCoursePopoverId] = useState<string | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  const handleCopyPhone = (e: React.MouseEvent, phone: string, studentId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!phone || phone === '—') return;
    navigator.clipboard.writeText(phone.replace(/\D/g, ''));
    setCopiedPhoneId(studentId);
    toast.success(`Номер ${phone} скопирован!`);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  return (
    <div className="hidden md:block w-full overflow-visible">
      <table className="w-full table-fixed border-collapse text-left text-xs">
        <colgroup>
          <col className="w-[44px]" />   {/* Чекбокс */}
          <col className="w-[18%]" />    {/* Ученик */}
          <col className="w-[20%]" />    {/* Представитель */}
          <col className="w-[20%]" />    {/* Курс */}
          <col className="w-[15%]" />    {/* Учитель */}
          <col className="w-[11%]" />    {/* Посещаемость */}
          <col className="w-[16%]" />    {/* Статус оплаты */}
        </colgroup>

        <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-3.5 py-3 text-center">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={onSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                title="Выбрать всех"
              />
            </th>
            <th className="px-3.5 py-3">
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
            <th className="px-3.5 py-3">ПРЕДСТАВИТЕЛЬ</th>
            <th className="px-3.5 py-3">КУРС</th>
            <th className="px-3.5 py-3">УЧИТЕЛЬ</th>
            <th className="px-3.5 py-3 text-center">
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
            <th className="px-3.5 py-3">
              <button
                type="button"
                onClick={() => onSortToggle('finance')}
                className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-blue-600 cursor-pointer"
              >
                <span>СТАТУС ОПЛАТЫ</span>
                {sortField === 'finance' ? (
                  sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                )}
              </button>
            </th>
            {statusFilter === 'deleted' && (
              <th className="px-3.5 py-3 text-right">ДЕЙСТВИЕ</th>
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
              const parentCleanName = student.parentName
                ? student.parentName.replace(/\s*\([^)]*\)/, '').trim()
                : '';
              const phoneClean = (student.parentPhone || '').replace(/\D/g, '');

              // Date formatting for paidUntil without year (e.g. "28.09.2026" -> "28.09")
              const rawPaidUntil = student.paidUntil || '28.09';
              const formattedPaidUntil = rawPaidUntil.split('.').slice(0, 2).join('.');

              return (
                <tr
                  key={student.id}
                  className={cn(
                    'h-14 transition-colors border-b border-slate-100',
                    isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'
                  )}
                >
                  {/* Чекбокс */}
                  <td className="px-3.5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectRow(student.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>

                  {/* 1. УЧЕНИК */}
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Link href={`/students/${student.id}`} className="relative shrink-0 block">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 hover:border-blue-400 transition-colors">
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
                      </Link>
                      <div className="min-w-0">
                        <Link
                          href={`/students/${student.id}`}
                          className="font-semibold text-sm text-slate-900 hover:text-blue-600 transition-colors block truncate"
                        >
                          {student.name}
                        </Link>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {student.isAdult ? 'Студент' : 'Школьник'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* 2. ПРЕДСТАВИТЕЛЬ */}
                  <td className="px-3.5 py-3">
                    {student.parentId ? (
                      <div className="min-w-0 space-y-0.5">
                        <Link
                          href={`/parents/${student.parentId}`}
                          className="text-xs font-semibold text-slate-800 hover:text-blue-600 hover:underline truncate block"
                          title={parentCleanName}
                        >
                          {parentCleanName}
                        </Link>
                        <div className="flex items-center justify-between gap-1.5 min-w-0">
                          <a
                            href={phoneClean ? `tel:${phoneClean}` : '#'}
                            onClick={(e) => e.stopPropagation()}
                            title="Позвонить по телефону"
                            className="font-mono text-[11px] text-slate-500 hover:text-blue-600 hover:underline whitespace-nowrap block shrink-0"
                          >
                            {student.parentPhone || '—'}
                          </a>
                          {phoneClean && (
                            <div className="flex items-center gap-1 shrink-0">
                              {/* WhatsApp button */}
                              <a
                                href={`https://wa.me/${phoneClean}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Написать в WhatsApp"
                                className="w-6 h-6 rounded bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white flex items-center justify-center transition-all border border-[#25D366]/20 cursor-pointer"
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5" />
                              </a>

                              {/* Telegram button */}
                              <a
                                href={student.telegram ? `https://t.me/${student.telegram.replace('@', '')}` : `https://wa.me/${phoneClean}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Написать в Telegram"
                                className="w-6 h-6 rounded bg-[#229ED9]/10 hover:bg-[#229ED9] text-[#229ED9] hover:text-white flex items-center justify-center transition-all border border-[#229ED9]/20 cursor-pointer"
                              >
                                <TelegramIcon className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <span className="text-slate-400 font-semibold">—</span>
                      </div>
                    )}
                  </td>

                  {/* 3. КУРС */}
                  <td className="px-3.5 py-3">
                    {student.groups.length > 0 ? (
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Link
                            href={`/calendar/lessons/${student.groups[0].nextLessonId || student.groups[0].id}`}
                            className="text-xs font-semibold text-blue-600 hover:underline truncate"
                          >
                            {student.groups[0].name}
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
                        <span className="text-[11px] text-slate-400 block truncate">
                          → {student.groups[0].nextLessonDate || 'Ср 21 сен, 18:45'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 select-none">— Без группы</span>
                    )}
                  </td>

                  {/* 4. УЧИТЕЛЬ */}
                  <td className="px-3.5 py-3">
                    {student.teacherId ? (
                      <Link
                        href={`/teachers/${student.teacherId}`}
                        className="text-xs font-medium text-slate-800 hover:text-blue-600 hover:underline block truncate"
                      >
                        {student.teacherName}
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400 select-none">—</span>
                    )}
                  </td>

                  {/* 5. ПОСЕЩАЕМОСТЬ (Traffic light + micro progress bar) */}
                  <td className="px-3.5 py-3 text-center">
                    <Link
                      href={`/students/${student.id}?tab=attendance`}
                      className="flex flex-col items-center justify-center gap-1 group cursor-pointer w-full"
                    >
                      <span
                        className={cn(
                          'text-xs font-bold',
                          student.attendanceRate >= 90
                            ? 'text-slate-700'
                            : student.attendanceRate >= 70
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        )}
                      >
                        {student.attendanceRate}%
                      </span>
                      <div className="w-11 h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
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
                    </Link>
                  </td>

                  {/* 6. СТАТУС ОПЛАТЫ */}
                  <td className="px-3.5 py-3">
                    <Link
                      href={`/students/${student.id}?tab=finance`}
                      className="block group"
                    >
                      {student.financeStatus === 'active_sub' && (
                        <div>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1 whitespace-nowrap">
                            ✓ Оплачено до {formattedPaidUntil}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">абонемент</div>
                        </div>
                      )}
                      {student.financeStatus === 'deposit' && (
                        <div>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1 whitespace-nowrap">
                            Депозит: +{student.balanceEur} €
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {student.balanceRub?.toLocaleString('ru-RU')} ₽
                          </div>
                        </div>
                      )}
                      {student.financeStatus === 'debt' && (
                        <div>
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2 py-0.5 rounded-lg whitespace-nowrap inline-block">
                            Долг: -{student.debtEur} €
                          </span>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                            {student.debtRub?.toLocaleString('ru-RU')} ₽
                          </div>
                        </div>
                      )}
                      {student.financeStatus === 'trial' && (
                        <div>
                          <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold px-2 py-0.5 rounded-lg inline-block">
                            Пробный
                          </span>
                        </div>
                      )}
                    </Link>
                  </td>

                  {statusFilter === 'deleted' && (
                    <td className="px-3.5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
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
