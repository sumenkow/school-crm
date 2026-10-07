'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Users,
  Video,
  Clock,
  MoreHorizontal,
  Edit,
  PlusCircle,
  Trash2,
  RotateCcw,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GroupPresentationItem } from '@/features/groups/lib/groupsWorkspaceEngine';

export interface GroupCardProps {
  group: GroupPresentationItem;
  onEdit: (groupId: string) => void;
  onAddLesson: (groupId: string) => void;
  onDelete: (groupId: string, groupName: string) => void;
  onRestore: (groupId: string, groupName: string) => void;
  onStatusClick?: (status: string) => void;
}

export function GroupCard({
  group,
  onEdit,
  onAddLesson,
  onDelete,
  onRestore,
  onStatusClick,
}: GroupCardProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isMenuOpen]);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if menu, buttons or links were clicked
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('.group-card-menu')) {
      return;
    }
    if (!group.isDeleted) {
      router.push(group.href);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'group/card relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md min-w-0 w-full',
        !group.isDeleted ? 'cursor-pointer' : 'opacity-90'
      )}
    >
      {/* Top Section */}
      <div className="min-w-0 flex-1">
        {/* Header: Dot + Group Name + Status + 3-dots Menu */}
        <div className="flex items-start justify-between gap-2.5 min-w-0">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            {/* Color Indicator Marker */}
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white shadow-2xs"
              style={{ backgroundColor: group.courseColorIndicator }}
              title={group.courseName}
            />
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block truncate">
                {group.courseCategory}
              </span>
              <h3
                className="text-sm font-bold text-slate-900 group-hover/card:text-blue-600 transition-colors truncate"
                title={group.name}
              >
                {group.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Clickable Status Badge */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStatusClick?.(group.status);
              }}
              title={`Фильтровать по статусу: ${group.statusBadge.label}`}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-semibold border shrink-0 transition-opacity hover:opacity-80 cursor-pointer',
                group.statusBadge.bg,
                group.statusBadge.text,
                group.statusBadge.border
              )}
            >
              {group.statusBadge.label}
            </button>

            {/* Context 3-Dots Menu */}
            <div className="group-card-menu relative" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen((prev) => !prev);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                title="Действия с группой"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {isMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-8 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100"
                >
                  {!group.isDeleted ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
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
                          setIsMenuOpen(false);
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
                          setIsMenuOpen(false);
                          onDelete(group.id, group.name);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        <span>В архив</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
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
        </div>

        {/* Metadata Rows: Schedule, Teacher, Room */}
        <div className="mt-3 space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-800 truncate min-w-0">{group.schedule}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate min-w-0">
              Преподаватель: <strong className="text-slate-800 font-semibold">{group.teacherName}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Video className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="text-blue-700 font-medium truncate min-w-0">{group.room}</span>
          </div>
        </div>

        {/* Capacity & Progress Bar */}
        <div className="mt-3.5 rounded-xl bg-slate-50/80 p-2.5 border border-slate-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">
              Ученики: <strong className="text-slate-900 font-semibold">{group.enrolledCount} / {group.capacity}</strong>
            </span>
            <span
              className={cn(
                'font-semibold text-[11px] px-2 py-0.5 rounded-md',
                group.isFull
                  ? 'bg-slate-200/80 text-slate-700'
                  : 'bg-emerald-100/80 text-emerald-800'
              )}
            >
              {group.freeSpotsLabel}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                group.isFull ? 'bg-emerald-600' : 'bg-blue-600'
              )}
              style={{ width: `${group.occupancyPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Section: Nearest Lesson Banner + Primary CTA Action Button */}
      <div className="mt-3.5 space-y-2.5 pt-3 border-t border-slate-100">
        {/* Nearest Lesson Banner */}
        {group.nextLesson ? (
          <Link
            href={`/calendar/lessons/${group.nextLesson.id}`}
            onClick={(e) => e.stopPropagation()}
            className="group/lesson flex items-center justify-between rounded-xl bg-blue-50/60 hover:bg-blue-50 p-2 border border-blue-100 text-xs transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-slate-700 truncate min-w-0">
              <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="truncate">
                Ближайшее занятие:{' '}
                <strong className="text-slate-900 font-semibold">
                  {group.nextLesson.dayOfWeekLabel ? `${group.nextLesson.dayOfWeekLabel}, ` : ''}
                  {group.nextLesson.dateFormatted}
                </strong>{' '}
                в <strong className="text-slate-900 font-semibold">{group.nextLesson.timeFormatted}</strong>
              </span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-blue-600 shrink-0 group-hover/lesson:translate-x-0.5 transition-transform" />
          </Link>
        ) : (
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 p-2 border border-slate-100 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            <span className="truncate">Нет запланированных уроков</span>
          </div>
        )}

        {/* Action Button */}
        {group.isDeleted ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRestore(group.id, group.name);
            }}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 py-1.5 text-xs font-semibold text-emerald-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Восстановить группу</span>
          </button>
        ) : (
          <Link
            href={group.href}
            onClick={(e) => e.stopPropagation()}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 py-1.5 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Открыть →</span>
          </Link>
        )}
      </div>
    </div>
  );
}
