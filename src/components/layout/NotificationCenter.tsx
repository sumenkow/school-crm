'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, Check, Clock, User, ChevronRight, CheckCheck, MessageSquare, AlertCircle, X, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole } from '@/context/RoleContext';
import { getStoredTasks } from '@/lib/data/taskStorage';
import { getStoredLessons } from '@/lib/data/lessonStorage';
import type { FullTaskData } from '@/lib/data/mockData';

export interface ManagerNotificationItem {
  id: string;
  taskId?: string;
  lessonId?: string;
  studentId?: string;
  studentName?: string;
  taskTitle: string;
  performedBy: string;
  actionType: 'completed' | 'rescheduled' | 'lesson_pending' | 'lesson_approved' | 'lesson_rejected';
  quoteText?: string;
  occurredAt: string;
  timestamp: number;
  isRead: boolean;
  linkUrl?: string;
}

const READ_NOTIFS_KEY = 'crm_read_notifications_v1';

export interface NotificationCenterProps {
  className?: string;
  triggerClassName?: string;
  panelPosition?: 'bottom-right' | 'sidebar';
}

export function NotificationCenter({
  className,
  triggerClassName,
  panelPosition = 'sidebar',
}: NotificationCenterProps = {}) {
  const { userName, role } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<ManagerNotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(READ_NOTIFS_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Save readIds to localStorage
  const saveReadIds = (ids: Set<string>) => {
    setReadIds(ids);
    try {
      localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(Array.from(ids)));
    } catch {}
  };

  // Helper to check if an action was performed by current logged-in user
  const isSelfAction = (executor: string, cUserName: string, cRole: string): boolean => {
    if (!executor) return false;
    const execClean = executor.trim().toLowerCase();
    const userClean = (cUserName || '').trim().toLowerCase();

    if (userClean && execClean === userClean) return true;

    // Strict role title matching for generic accounts
    if (cRole === 'admin' && (execClean === 'администратор' || execClean.includes('админ'))) return true;
    if (cRole === 'developer' && (execClean === 'разработчик' || execClean.includes('девелопер'))) return true;
    if (cRole === 'owner' && (execClean === 'владелец' || execClean === 'руководитель')) return true;

    return false;
  };

  // Build notifications list from tasks and lesson approval workflows
  const loadNotifications = async () => {
    const isManagerOrDev = role === 'developer' || role === 'owner' || role === 'admin';
    const currentUserName = userName || 'Руководитель';
    const notifs: ManagerNotificationItem[] = [];

    // 1. Task notifications for managers/devs
    if (isManagerOrDev) {
      try {
        const tasks = await getStoredTasks();
        tasks.forEach((t) => {
          if (t.status === 'done' && t.completedAt) {
            const executor = t.completedBy || t.assignedTo || 'Администратор';
            if (!isSelfAction(executor, currentUserName, role)) {
              const ts = new Date(t.completedAt).getTime() || Date.now();
              const notifId = `notif_done_${t.id}_${ts}`;
              notifs.push({
                id: notifId,
                taskId: t.id,
                studentId: t.studentId,
                studentName: t.studentName || 'Ученик',
                taskTitle: t.title,
                performedBy: executor,
                actionType: 'completed',
                quoteText: t.result,
                occurredAt: new Date(ts).toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                timestamp: ts,
                isRead: readIds.has(notifId),
                linkUrl: t.studentId ? `/students/${t.studentId}?tab=tasks` : undefined,
              });
            }
          }

          if (t.rescheduledReason && t.status !== 'done') {
            const executor = t.rescheduledBy || t.assignedTo || 'Администратор';
            if (!isSelfAction(executor, currentUserName, role)) {
              const ts = t.rescheduledAt ? new Date(t.rescheduledAt).getTime() : Date.now();
              const notifId = `notif_resched_${t.id}_${ts}`;
              notifs.push({
                id: notifId,
                taskId: t.id,
                studentId: t.studentId,
                studentName: t.studentName || 'Ученик',
                taskTitle: t.title,
                performedBy: executor,
                actionType: 'rescheduled',
                quoteText: `Перенос на ${t.dueDateFormatted || t.dueDate}: «${t.rescheduledReason}»`,
                occurredAt: t.rescheduledAt
                  ? new Date(t.rescheduledAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                  : new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
                timestamp: ts,
                isRead: readIds.has(notifId),
                linkUrl: t.studentId ? `/students/${t.studentId}?tab=tasks` : undefined,
              });
            }
          }
        });
      } catch (err) {
        console.warn('Tasks notification load error:', err);
      }
    }

    // 2. Lesson Approval Workflow notifications (media_1791210072516.jpg)
    try {
      const storedLessons = getStoredLessons();
      storedLessons.forEach((l) => {
        // Pending lesson: Admins/Managers need to review & confirm
        if (l.status === 'pending') {
          const ts = l.created_at ? new Date(l.created_at).getTime() : Date.now();
          const notifId = `notif_lesson_pending_${l.id}`;
          notifs.push({
            id: notifId,
            lessonId: l.id,
            taskTitle: 'Нужно подтвердить занятие',
            performedBy: l.teacherName || 'Преподаватель',
            actionType: 'lesson_pending',
            quoteText: `${l.teacherName || 'Преподаватель'} создала занятие ${l.groupName ? l.groupName.split('(')[0].trim() : 'Занятие'}, ${l.date} ${l.startTime}`,
            occurredAt: l.dateFormatted || l.date,
            timestamp: ts,
            isRead: readIds.has(notifId),
            linkUrl: '/calendar',
          });
        }

        // Rejected lesson: Notify teacher & admin with reason
        if (l.status === 'cancelled' && l.rejectionReason) {
          const ts = l.rejectedAt ? new Date(l.rejectedAt).getTime() : Date.now() - 3600000;
          const notifId = `notif_lesson_rejected_${l.id}`;
          notifs.push({
            id: notifId,
            lessonId: l.id,
            taskTitle: 'Занятие отклонено',
            performedBy: l.rejectedBy || 'Администратор',
            actionType: 'lesson_rejected',
            quoteText: `Ваше занятие ${l.date} ${l.startTime} отклонено. Причина: ${l.rejectionReason}`,
            occurredAt: l.dateFormatted || l.date,
            timestamp: ts,
            isRead: readIds.has(notifId),
            linkUrl: '/calendar',
          });
        }

        // Approved lesson: Notify teacher & admin
        if (l.status === 'planned' && (l.approvedAt || (l.timelineEvents && l.timelineEvents.some(e => e.type === 'approved' || e.comment?.includes('подтверждено'))))) {
          const ts = l.approvedAt ? new Date(l.approvedAt).getTime() : Date.now() - 7200000;
          const notifId = `notif_lesson_approved_${l.id}`;
          notifs.push({
            id: notifId,
            lessonId: l.id,
            taskTitle: 'Занятие подтверждено',
            performedBy: l.approvedBy || 'Администратор',
            actionType: 'lesson_approved',
            quoteText: `Ваше занятие ${l.date} ${l.startTime} подтверждено администратором.`,
            occurredAt: l.dateFormatted || l.date,
            timestamp: ts,
            isRead: readIds.has(notifId),
            linkUrl: '/calendar',
          });
        }
      });
    } catch (err) {
      console.warn('Lesson notifications load error:', err);
    }

    // Sort newest first
    notifs.sort((a, b) => b.timestamp - a.timestamp);
    setNotifications(notifs);
  };

  useEffect(() => {
    loadNotifications();

    const handleSync = () => loadNotifications();
    window.addEventListener('crm-tasks-changed', handleSync);
    window.addEventListener('crm-lessons-changed', handleSync);
    window.addEventListener('crm-notifications-changed', handleSync);
    window.addEventListener('crm-role-changed', handleSync);
    return () => {
      window.removeEventListener('crm-tasks-changed', handleSync);
      window.removeEventListener('crm-lessons-changed', handleSync);
      window.removeEventListener('crm-notifications-changed', handleSync);
      window.removeEventListener('crm-role-changed', handleSync);
    };
  }, [userName, role, readIds.size]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const handleMarkAllRead = () => {
    const allIds = new Set(readIds);
    notifications.forEach((n) => allIds.add(n.id));
    saveReadIds(allIds);
  };

  const handleMarkSingleRead = (id: string) => {
    const newIds = new Set(readIds);
    newIds.add(id);
    saveReadIds(newIds);
  };

  // Group notifications into time sections
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  const filteredNotifications = filterTab === 'unread'
    ? notifications.filter((n) => !readIds.has(n.id))
    : notifications;

  const todayNotifs = filteredNotifications.filter((n) => n.timestamp >= startOfToday);
  const yesterdayNotifs = filteredNotifications.filter((n) => n.timestamp >= startOfYesterday && n.timestamp < startOfToday);
  const olderNotifs = filteredNotifications.filter((n) => n.timestamp < startOfYesterday);

  const isFloating = panelPosition === 'bottom-right';

  return (
    <div
      className={cn(
        isFloating ? "fixed bottom-20 md:bottom-5 right-5 z-[9999] shrink-0 print:hidden" : "relative shrink-0",
        className
      )}
      ref={dropdownRef}
    >
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          isFloating
            ? "relative w-8 h-8 rounded-full border border-slate-200/90 bg-white/95 backdrop-blur-xs hover:bg-slate-50 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-md hover:shadow-lg text-slate-600 hover:text-slate-900"
            : "p-2 rounded-lg hover:bg-slate-100 text-slate-500 relative cursor-pointer flex items-center justify-center transition-colors",
          triggerClassName
        )}
        aria-label="Уведомления руководителя"
        title="Центр уведомлений"
      >
        <Bell className={isFloating ? "h-3.5 w-3.5 text-slate-600" : "w-4 h-4 text-slate-500"} />
        {unreadCount > 0 && (
          <span className={cn(
            "flex items-center justify-center rounded-full bg-rose-600 font-extrabold text-white shadow-xs animate-in zoom-in-50",
            isFloating ? "absolute -top-1 -right-1 h-3.5 min-w-[14px] px-1 text-[9px]" : "absolute top-0.5 right-0.5 h-3.5 min-w-[14px] px-0.5 text-[9px]"
          )}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel (~390px) */}
      {isOpen && (
        <div className={cn(
          "z-[120] w-80 sm:w-[390px] rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 overflow-hidden",
          isFloating ? "absolute right-0 bottom-10" : "absolute left-[-50px] sm:left-[-70px] bottom-full mb-2"
        )}>
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 bg-slate-50/90">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Уведомления</h3>
                <p className="text-[10px] text-slate-500">Оперативная лента занятий и поручений</p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors cursor-pointer shadow-2xs"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Прочитано всё
              </button>
            )}
          </div>

          {/* Filter Tabs: Все | Непрочитанные (count) (media_1791210072516.jpg) */}
          <div className="flex border-b border-slate-100 px-4 pt-1.5 gap-4 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={cn(
                "pb-2 text-xs font-semibold border-b-2 transition-all cursor-pointer",
                filterTab === 'all'
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              Все
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('unread')}
              className={cn(
                "pb-2 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
                filterTab === 'unread'
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              <span>Непрочитанные</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-500 text-white text-[9px] px-1.5 py-0.2 font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Notifications Content */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300 stroke-1" />
                {filterTab === 'unread' ? 'Нет непрочитанных уведомлений' : 'Новых оперативных уведомлений нет'}
              </div>
            ) : (
              <>
                {/* SECTION: TODAY */}
                {todayNotifs.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5 bg-slate-100/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Сегодня
                    </div>
                    {todayNotifs.map((item) => (
                      <NotificationCard key={item.id} item={item} onMarkRead={handleMarkSingleRead} onClose={() => setIsOpen(false)} />
                    ))}
                  </div>
                )}

                {/* SECTION: YESTERDAY */}
                {yesterdayNotifs.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5 bg-slate-100/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Вчера
                    </div>
                    {yesterdayNotifs.map((item) => (
                      <NotificationCard key={item.id} item={item} onMarkRead={handleMarkSingleRead} onClose={() => setIsOpen(false)} />
                    ))}
                  </div>
                )}

                {/* SECTION: OLDER */}
                {olderNotifs.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5 bg-slate-100/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Ранее
                    </div>
                    {olderNotifs.map((item) => (
                      <NotificationCard key={item.id} item={item} onMarkRead={handleMarkSingleRead} onClose={() => setIsOpen(false)} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer link to Calendar */}
          <div className="p-2.5 text-center border-t border-slate-100 bg-slate-50/80 shrink-0">
            <Link
              href="/calendar"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Показать все уведомления
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationCard({
  item,
  onMarkRead,
  onClose,
}: {
  item: ManagerNotificationItem;
  onMarkRead: (id: string) => void;
  onClose: () => void;
}) {
  const isDone = item.actionType === 'completed';
  const isRescheduled = item.actionType === 'rescheduled';
  const isLessonPending = item.actionType === 'lesson_pending';
  const isLessonRejected = item.actionType === 'lesson_rejected';
  const isLessonApproved = item.actionType === 'lesson_approved';

  return (
    <div
      onClick={() => onMarkRead(item.id)}
      className={cn(
        'p-3.5 transition-colors cursor-pointer relative hover:bg-slate-50/90 group',
        !item.isRead ? 'bg-blue-50/30' : 'bg-white'
      )}
    >
      {/* Unread Blue Marker */}
      {!item.isRead && (
        <span className="absolute left-2 top-4 h-2 w-2 rounded-full bg-blue-600" />
      )}

      <div className="pl-2 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            {isLessonPending ? (
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold text-[10px]">
                <Clock className="h-3.5 w-3.5" />
              </div>
            ) : isLessonRejected ? (
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-100 text-rose-700 font-bold text-[10px]">
                <X className="h-3.5 w-3.5" />
              </div>
            ) : isLessonApproved ? (
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                <Check className="h-3.5 w-3.5" />
              </div>
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 font-bold text-[10px] text-slate-700">
                {item.performedBy.charAt(0)}
              </div>
            )}
            <span className="font-bold text-slate-900">{item.performedBy}</span>
            <span
              className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                isDone || isLessonApproved
                  ? 'bg-emerald-100 text-emerald-800'
                  : isLessonPending
                  ? 'bg-blue-100 text-blue-800'
                  : isLessonRejected
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              )}
            >
              {isDone
                ? 'Выполнил'
                : isRescheduled
                ? 'Перенес'
                : isLessonPending
                ? 'Новое занятие'
                : isLessonRejected
                ? 'Отклонено'
                : 'Подтверждено'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">{item.occurredAt}</span>
        </div>

        {item.studentName && (
          <div className="text-xs">
            <span className="text-slate-500">Ученик: </span>
            {item.studentId ? (
              <Link
                href={`/students/${item.studentId}?tab=tasks`}
                onClick={onClose}
                className="font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
              >
                {item.studentName}
                <ChevronRight className="h-3 w-3" />
              </Link>
            ) : (
              <span className="font-semibold text-slate-800">{item.studentName}</span>
            )}
          </div>
        )}

        <p className="text-xs font-semibold text-slate-900">
          «{item.taskTitle}»
        </p>

        {/* Outcome Quote Block */}
        {item.quoteText && (
          <div className="rounded-lg bg-slate-100/70 p-2 text-[11px] text-slate-700 border border-slate-200/60 font-medium">
            {item.quoteText}
          </div>
        )}

        {item.linkUrl && (
          <div className="pt-1 flex justify-end">
            <Link
              href={item.linkUrl}
              onClick={onClose}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              Перейти к занятию →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
