'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, Check, Clock, User, ChevronRight, CheckCheck, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole } from '@/context/RoleContext';
import { getStoredTasks } from '@/lib/data/taskStorage';
import type { FullTaskData } from '@/lib/data/mockData';

export interface ManagerNotificationItem {
  id: string;
  taskId: string;
  studentId?: string;
  studentName?: string;
  taskTitle: string;
  performedBy: string;
  actionType: 'completed' | 'rescheduled';
  quoteText?: string;
  occurredAt: string;
  timestamp: number;
  isRead: boolean;
}

const READ_NOTIFS_KEY = 'crm_read_notifications_v1';

export function NotificationCenter() {
  const { userName, role } = useRole();
  const [isOpen, setIsOpen] = useState(false);
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

  // Build notifications list from tasks
  const loadNotifications = async () => {
    const isManagerOrDev = role === 'developer' || role === 'owner' || role === 'admin';
    if (!isManagerOrDev) {
      setNotifications([]);
      return;
    }

    const tasks = await getStoredTasks();
    const currentUserName = userName || 'Руководитель';
    const notifs: ManagerNotificationItem[] = [];

    tasks.forEach((t) => {
      // 1. Task completed notification
      if (t.status === 'done' && t.completedAt) {
        const executor = t.completedBy || t.assignedTo || 'Администратор';
        // Only notify OTHER managers/devs, suppress self-actions
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
          });
        }
      }

      // 2. Task rescheduled notification
      if (t.rescheduledReason && t.status !== 'done') {
        const executor = t.rescheduledBy || t.assignedTo || 'Администратор';
        // Only notify OTHER managers/devs, suppress self-actions
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
          });
        }
      }
    });

    // Sort newest first
    notifs.sort((a, b) => b.timestamp - a.timestamp);
    setNotifications(notifs);
  };

  useEffect(() => {
    loadNotifications();

    const handleSync = () => loadNotifications();
    window.addEventListener('crm-tasks-changed', handleSync);
    window.addEventListener('crm-notifications-changed', handleSync);
    window.addEventListener('crm-role-changed', handleSync);
    return () => {
      window.removeEventListener('crm-tasks-changed', handleSync);
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

  const todayNotifs = notifications.filter((n) => n.timestamp >= startOfToday);
  const yesterdayNotifs = notifications.filter((n) => n.timestamp >= startOfYesterday && n.timestamp < startOfToday);
  const olderNotifs = notifications.filter((n) => n.timestamp < startOfYesterday);

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative touch-target-44 sm:h-10 sm:w-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
        aria-label="Уведомления руководителя"
        title="Центр уведомлений руководителя"
      >
        <Bell className="h-4 w-4 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white shadow-xs animate-in zoom-in-50">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel (~400px) */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 sm:w-[410px] rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/80">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Уведомления руководителя</h3>
                <p className="text-[10px] text-slate-500">Оперативная лента исполнения поручений</p>
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

          {/* Notifications Content */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300 stroke-1" />
                Новых оперативных уведомлений нет
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
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 font-bold text-[10px] text-slate-700">
              {item.performedBy.charAt(0)}
            </div>
            <span className="font-bold text-slate-900">{item.performedBy}</span>
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')}>
              {isDone ? 'Выполнил' : 'Перенес'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">{item.occurredAt}</span>
        </div>

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

        <p className="text-xs font-semibold text-slate-900">
          «{item.taskTitle}»
        </p>

        {/* Outcome Quote Block */}
        {item.quoteText && (
          <div className="rounded-lg bg-slate-100/70 p-2 text-[11px] text-slate-700 border border-slate-200/60 font-medium italic">
            «{item.quoteText}»
          </div>
        )}

        {item.studentId && (
          <div className="pt-1 flex justify-end">
            <Link
              href={`/students/${item.studentId}?tab=tasks`}
              onClick={onClose}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              К задаче →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
