'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Flame,
  Clock,
  User,
  Phone,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Calendar,
  AlertCircle,
  Tag,
  CheckCircle2,
  ListPlus,
  Send,
  Edit3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';

export interface UrgentTaskItem {
  id: string;
  title: string;
  detail: string;
  deadline: string;
  priority: 'high' | 'medium' | 'normal';
  completed: boolean;
  assignedTo?: string;
  clientName?: string;
  phone?: string;
  category?: 'lead' | 'trial' | 'finance' | 'admin';
}

interface TaskDetailsCardModalProps {
  isOpen: boolean;
  task: UrgentTaskItem | null;
  onClose: () => void;
  onSave: (updatedTask: UrgentTaskItem) => void;
  onComplete: (taskId: string) => void;
  onCreateNextStage: (parentTaskId: string, nextTask: Omit<UrgentTaskItem, 'id'>) => void;
}

const NEXT_STAGE_PRESETS = [
  {
    type: 'trial',
    title: 'Назначить пробный онлайн-урок',
    detail: 'Согласовать время, группу и отправить ссылку на урок',
    defaultDeadline: 'Завтра до 12:00',
  },
  {
    type: 'finance',
    title: 'Выставить счёт и отправить ссылку на оплату',
    detail: 'Формирование чека и отправка платежной ссылки в WhatsApp',
    defaultDeadline: 'Сегодня до 17:00',
  },
  {
    type: 'lead',
    title: 'Повторный звонок родителю / Уточнить решение',
    detail: 'Выяснить впечатления ребенка, ответить на вопросы по курсу',
    defaultDeadline: 'Завтра до 15:00',
  },
  {
    type: 'contract',
    title: 'Отправить договор и регламент онлайн-обучения',
    detail: 'Запросить скан/фото подписанного соглашения',
    defaultDeadline: 'Сегодня до 18:00',
  },
  {
    type: 'schedule',
    title: 'Согласовать постоянное расписание с преподавателем',
    detail: 'Закрепить слот в онлайн-сетке и уведомить родителя',
    defaultDeadline: 'В течение 2 дней',
  },
];

export function TaskDetailsCardModal({
  isOpen,
  task,
  onClose,
  onSave,
  onComplete,
  onCreateNextStage,
}: TaskDetailsCardModalProps) {
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'normal'>('medium');
  const [completed, setCompleted] = useState(false);
  const [assignedTo, setAssignedTo] = useState('Анна Администратор');
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');

  // Next stage form state
  const [showNextStage, setShowNextStage] = useState(false);
  const [nextStageTitle, setNextStageTitle] = useState(NEXT_STAGE_PRESETS[0].title);
  const [nextStageDetail, setNextStageDetail] = useState(NEXT_STAGE_PRESETS[0].detail);
  const [nextStageDeadline, setNextStageDeadline] = useState(NEXT_STAGE_PRESETS[0].defaultDeadline);
  const [nextStagePriority, setNextStagePriority] = useState<'high' | 'medium' | 'normal'>('medium');
  const [nextStageAssignedTo, setNextStageAssignedTo] = useState('Анна Администратор');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDetail(task.detail);
      setDeadline(task.deadline);
      setPriority(task.priority);
      setCompleted(task.completed);
      setAssignedTo(task.assignedTo || 'Анна Администратор');
      setClientName(task.clientName || '');
      setPhone(task.phone || '');
      setShowNextStage(false);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSelectPreset = (preset: typeof NEXT_STAGE_PRESETS[0]) => {
    setNextStageTitle(preset.title);
    setNextStageDetail(preset.detail);
    setNextStageDeadline(preset.defaultDeadline);
  };

  const handleSaveChanges = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      toast.error('Укажите название задачи');
      return;
    }

    const updated: UrgentTaskItem = {
      ...task,
      title: title.trim(),
      detail: detail.trim(),
      deadline: deadline.trim(),
      priority,
      completed,
      assignedTo,
      clientName: clientName.trim(),
      phone: phone.trim(),
    };

    onSave(updated);

    // If next stage is also selected
    if (showNextStage && nextStageTitle.trim()) {
      onCreateNextStage(task.id, {
        title: nextStageTitle.trim(),
        detail: nextStageDetail.trim(),
        deadline: nextStageDeadline.trim(),
        priority: nextStagePriority,
        completed: false,
        assignedTo: nextStageAssignedTo,
        clientName: clientName.trim(),
        phone: phone.trim(),
        category: 'lead',
      });
    }

    onClose();
  };

  const handleCompleteAndNextStage = () => {
    // 1. Mark current completed
    const updated: UrgentTaskItem = {
      ...task,
      title: title.trim(),
      detail: detail.trim(),
      deadline: deadline.trim(),
      priority,
      completed: true,
      assignedTo,
      clientName: clientName.trim(),
      phone: phone.trim(),
    };
    onSave(updated);

    // 2. Create follow-up stage
    if (nextStageTitle.trim()) {
      onCreateNextStage(task.id, {
        title: nextStageTitle.trim(),
        detail: nextStageDetail.trim(),
        deadline: nextStageDeadline.trim(),
        priority: nextStagePriority,
        completed: false,
        assignedTo: nextStageAssignedTo,
        clientName: clientName.trim(),
        phone: phone.trim(),
        category: 'lead',
      });
      toast.success(`Задача «${task.title}» завершена, следующий этап назначен!`);
    } else {
      toast.success(`Задача «${task.title}» успешно завершена!`);
    }

    onClose();
  };

  const cleanPhone = phone.replace(/[^\d+]/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl my-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-blue-100 px-2 py-0.5 font-bold text-[10px] text-blue-800 uppercase tracking-wider">
                Карточка оперативной задачи
              </span>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-bold flex items-center gap-1',
                  priority === 'high' && 'bg-rose-100 text-rose-800',
                  priority === 'medium' && 'bg-amber-100 text-amber-800',
                  priority === 'normal' && 'bg-slate-100 text-slate-700'
                )}
              >
                {priority === 'high' && <Flame size={11} />}
                {priority === 'high' ? 'Срочно' : priority === 'medium' ? 'Средний приоритет' : 'Обычный'}
              </span>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-bold border',
                  completed
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                )}
              >
                {completed ? '✓ Завершена' : '● В работе'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {completed ? <span className="line-through text-slate-400">{title}</span> : title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveChanges} className="space-y-4">
          {/* Main task edit fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Суть задачи</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Что необходимо сделать..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Комментарий / Детали поручения</label>
              <textarea
                rows={2}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Пояснения к задаче, результат договоренностей..."
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Срок выполнения (дедлайн)</label>
              <div className="relative mt-1">
                <Clock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="до 12:00, Сегодня до 18:00..."
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Приоритет</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="high">🔥 Срочно (Высокий)</option>
                <option value="medium">⚡ Средний</option>
                <option value="normal">☕ Обычный</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Ответственный</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Анна Администратор">Анна Администратор</option>
                  <option value="Елена Менеджер">Елена Менеджер</option>
                  <option value="Алексей Преподаватель">Алексей Преподаватель</option>
                  <option value="Владелец школы">Владелец школы</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Клиент / Ученик (если есть)</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Имя ученика или родителя"
              />
            </div>
          </div>

          {/* Contact quick actions if phone exists */}
          {phone && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-slate-900">{phone}</span>
                {clientName && <span className="text-slate-500">({clientName})</span>}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${cleanPhone}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
                >
                  <Phone size={12} />
                  Позвонить
                </a>
                <a
                  href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                >
                  <MessageSquare size={12} />
                  WhatsApp
                </a>
              </div>
            </div>
          )}

          {/* Completion state toggle */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="task-complete-checkbox"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
                className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="task-complete-checkbox" className="text-xs font-bold text-slate-800 cursor-pointer">
                {completed ? 'Задача помечена как выполненная' : 'Отметить задачу выполненной'}
              </label>
            </div>

            {!completed && (
              <button
                type="button"
                onClick={() => setCompleted(true)}
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
              >
                <Check size={12} />
                Завершить
              </button>
            )}
          </div>

          {/* NEXT STAGE ACCORDION / TOGGLE */}
          <div className="border border-purple-200 bg-purple-50/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-purple-600 text-white">
                  <ListPlus size={14} />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Назначить следующий этап / задачу</h4>
                  <p className="text-[11px] text-slate-500">
                    Перевод цепочки работы с лидом/учеником на следующий шаг воронки
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowNextStage(!showNextStage)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-bold transition-all',
                  showNextStage
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                )}
              >
                {showNextStage ? 'Скрыть форму' : '+ Назначить этап'}
              </button>
            </div>

            {showNextStage && (
              <div className="pt-2 border-t border-purple-200/60 space-y-3 animate-in fade-in duration-150">
                {/* Quick Presets */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-purple-700 tracking-wider">
                    Быстрые сценарии следующего этапа:
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {NEXT_STAGE_PRESETS.map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={cn(
                          'text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all text-left',
                          nextStageTitle === preset.title
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-white border-purple-200 text-slate-700 hover:bg-purple-50'
                        )}
                      >
                        {preset.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-700">Название следующего этапа</label>
                    <input
                      type="text"
                      value={nextStageTitle}
                      onChange={(e) => setNextStageTitle(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="Например: Записать на пробный онлайн-урок"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-700">Инструкция / Комментарий к этапу</label>
                    <input
                      type="text"
                      value={nextStageDetail}
                      onChange={(e) => setNextStageDetail(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="Подробности для администратора..."
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700">Срок следующего этапа</label>
                    <input
                      type="text"
                      value={nextStageDeadline}
                      onChange={(e) => setNextStageDeadline(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="Завтра до 12:00"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700">Ответственный сотрудник</label>
                    <select
                      value={nextStageAssignedTo}
                      onChange={(e) => setNextStageAssignedTo(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="Анна Администратор">Анна Администратор</option>
                      <option value="Елена Менеджер">Елена Менеджер</option>
                      <option value="Алексей Преподаватель">Алексей Преподаватель</option>
                      <option value="Владелец школы">Владелец школы</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons footer */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Закрыть
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {showNextStage ? (
                <button
                  type="button"
                  onClick={handleCompleteAndNextStage}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition-colors"
                >
                  <ArrowRight size={14} />
                  Завершить и создать следующий этап
                </button>
              ) : null}

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
              >
                <Check size={14} />
                Сохранить изменения
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
