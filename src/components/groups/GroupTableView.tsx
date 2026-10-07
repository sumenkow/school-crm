'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Calendar,
  Clock,
  BookOpen,
  MoreHorizontal,
  Edit,
  PlusCircle,
  Trash2,
  RotateCcw,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GroupPresentationItem } from '@/features/groups/lib/groupsWorkspaceEngine';

export interface GroupTableViewProps {
  groups: GroupPresentationItem[];
  onEdit: (groupId: string) => void;
  onAddLesson: (groupId: string) => void;
  onDelete: (groupId: string, groupName: string) => void;
  onRestore: (groupId: string, groupName: string) => void;
}

export function GroupTableView({
  groups,
  onEdit,
  onAddLesson,
  onDelete,
  onRestore,
}: GroupTableViewProps) {
  const router = useRouter();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.group-table-menu')) {
        setActiveMenuId(null);
      }
    };
    if (activeMenuId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeMenuId]);

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-xs text-slate-500 shadow-xs">
        Группы не найдены
      </div>
    );
  }

  return (
    <div
      ref={menuContainerRef}
      className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4 font-semibold">Группа</th>
              <th className="py-3 px-3 font-semibold">Расписание (мск)</th>
              <th className="py-3 px-3 font-semibold">Преподаватель</th>
              <th className="py-3 px-3 font-semibold">Ученики</th>
              <th className="py-3 px-3 font-semibold">Свободно</th>
              <th className="py-3 px-3 font-semibold">Статус</th>
              <th className="py-3 px-3 font-semibold">Ближайшее занятие</th>
              <th className="py-3 px-4 text-right font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {groups.map((group) => {
              const isMenuOpen = activeMenuId === group.id;

              return (
                <tr
                  key={group.id}
                  onClick={() => {
                    if (!group.isDeleted) {
                      router.push(group.href);
                    }
                  }}
                  className={cn(
                    'transition-colors group/row',
                    !group.isDeleted ? 'hover:bg-slate-50/80 cursor-pointer' : 'bg-slate-50/40'
                  )}
                >
                  {/* 1. Group Column: Marker + Name + Course */}
                  <td className="py-3 px-4 min-w-[200px]">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white shadow-2xs"
                        style={{ backgroundColor: group.courseColorIndicator }}
                        title={group.courseName}
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 group-hover/row:text-blue-600 transition-colors block truncate">
                          {group.name}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate">
                          {group.courseCategory}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* 2. Schedule Column */}
                  <td className="py-3 px-3 min-w-[150px]">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{group.schedule}</span>
                    </div>
                  </td>

                  {/* 3. Teacher Column */}
                  <td className="py-3 px-3 min-w-[150px]">
                    <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                      <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{group.teacherName}</span>
                    </div>
                  </td>

                  {/* 4. Students Column: X / Y + mini bar */}
                  <td className="py-3 px-3 min-w-[120px]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
                        <span>{group.enrolledCount} / {group.capacity}</span>
                        <span className="text-slate-500 font-normal text-[10px]">{group.occupancyPercent}%</span>
                      </div>
                      <div className="h-1.5 w-24 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-300',
                            group.isFull ? 'bg-emerald-600' : 'bg-blue-600'
                          )}
                          style={{ width: `${group.occupancyPercent}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* 5. Free Spots Badge */}
                  <td className="py-3 px-3 min-w-[100px] whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex rounded-lg px-2 py-0.5 text-[11px] font-semibold',
                        group.isFull
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                      )}
                    >
                      {group.freeSpotsLabel}
                    </span>
                  </td>

                  {/* 6. Status Badge */}
                  <td className="py-3 px-3 min-w-[90px] whitespace-nowrap">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[10px] font-semibold border',
                        group.statusBadge.bg,
                        group.statusBadge.text,
                        group.statusBadge.border
                      )}
                    >
                      {group.statusBadge.label}
                    </span>
                  </td>

                  {/* 7. Nearest Lesson Column */}
                  <td className="py-3 px-3 min-w-[170px]">
                    {group.nextLesson ? (
                      <Link
                        href={`/calendar/lessons/${group.nextLesson.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="group/nlesson inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-900 font-medium transition-colors"
                      >
                        <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">
                          {group.nextLesson.dayOfWeekLabel ? `${group.nextLesson.dayOfWeekLabel}, ` : ''}
                          {group.nextLesson.dateFormatted} • {group.nextLesson.timeFormatted}
                        </span>
                        <ChevronRight className="h-3 w-3 text-blue-500 group-hover/nlesson:translate-x-0.5 transition-transform shrink-0" />
                      </Link>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Нет запланированных</span>
                    )}
                  </td>

                  {/* 8. Actions Column */}
                  <td className="py-3 px-4 text-right min-w-[130px] whitespace-nowrap">
                    <div
                      className="inline-flex items-center justify-end gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!group.isDeleted ? (
                        <Link
                          href={group.href}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-2xs"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Открыть</span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRestore(group.id, group.name)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Восстановить</span>
                        </button>
                      )}

                      {/* 3-Dots Menu */}
                      <div className="group-table-menu relative">
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(isMenuOpen ? null : group.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                          title="Действия"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {isMenuOpen && (
                          <div className="absolute right-0 top-8 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl text-left animate-in fade-in zoom-in-95 duration-100">
                            {!group.isDeleted ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onEdit(group.id);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                  <Edit className="h-3.5 w-3.5 text-blue-600" />
                                  <span>Редактировать группу</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onAddLesson(group.id);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                  <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Добавить занятие</span>
                                </button>
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onDelete(group.id, group.name);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                  <span>Удалить в архив</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onRestore(group.id, group.name);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              >
                                <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Восстановить группу</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
