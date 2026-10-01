'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  Phone,
  Copy,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Send,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Edit2,
  Save,
  Check
} from 'lucide-react';
import { FullLeadData, TimelineInteraction, FullGroupData, FullTaskData } from '@/lib/data/mockData';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getTasksForLead, updateUnifiedTaskStatus, createUnifiedTask } from '@/lib/data/taskManager';
import { saveLeadToStorage, syncLeadToSupabase } from '@/lib/data/leadStorage';
import { triggerWhatsAppContact, triggerTelegramContact } from '@/lib/data/contactWorkflows';
import { ConvertLeadModal } from './ConvertLeadModal';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { cn } from '@/lib/utils';

interface LeadDrawerProps {
  isOpen: boolean;
  lead: FullLeadData | null;
  onClose: () => void;
  onUpdateLead?: (updated: FullLeadData) => void;
  onConverted?: (studentId: string) => void;
  onStatusChange?: (leadId: string, newStatus: FullLeadData['status']) => void;
}

const STAGE_OPTIONS = [
  { key: 'new', label: '1. Новые' },
  { key: 'contacted', label: '2. В работе' },
  { key: 'trial_scheduled', label: '3. Пробное назначено' },
  { key: 'trial_held', label: '4. Пробное проведено' },
  { key: 'thinking', label: '5. Думают / Счёт' },
  { key: 'paid', label: '6. Оплачено (Успех)' },
  { key: 'lost', label: '7. Отказ / Архив' },
] as const;

export function LeadDrawer({
  isOpen,
  lead,
  onClose,
  onUpdateLead,
  onConverted,
  onStatusChange,
}: LeadDrawerProps) {
  const toast = useToast();
  const { userName } = useRole();

  const [isEditing, setIsEditing] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isBookingTrial, setIsBookingTrial] = useState(false);
  const [groups, setGroups] = useState<FullGroupData[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [trialDateTime, setTrialDateTime] = useState<string>('');
  const [tasks, setTasks] = useState<FullTaskData[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Editable fields
  const [parentName, setParentName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [course, setCourse] = useState('');
  const [status, setStatus] = useState<FullLeadData['status']>('new');

  useEffect(() => {
    if (lead) {
      setParentName(lead.name || '');
      setStudentName(lead.studentName || '');
      setStudentAge(lead.studentAge || '');
      setContactPhone(lead.contact || '');
      setTelegram(lead.telegram || '');
      setCourse(lead.directionOrCourse || '');
      setStatus(lead.status);
      setIsEditing(false);
      setIsBookingTrial(false);
      setIsAddingTask(false);

      // Load tasks
      getTasksForLead(lead.id).then(setTasks).catch(() => setTasks([]));
      // Load groups for trial booking
      const g = getStoredGroups().filter(group => !group.isDeleted);
      setGroups(g);
      if (g.length > 0) setSelectedGroup(g[0].id);
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const phoneDigits = (contactPhone || lead.contact || '').replace(/[^\d+]/g, '');

  const handleSaveContactDetails = () => {
    if (!lead) return;
    const updatedLead: FullLeadData = {
      ...lead,
      name: parentName.trim() || lead.name,
      studentName: studentName.trim() || undefined,
      studentAge: studentAge.trim() || undefined,
      contact: contactPhone.trim() || lead.contact,
      telegram: telegram.trim() || undefined,
      directionOrCourse: course.trim() || lead.directionOrCourse,
      status: status,
    };

    saveLeadToStorage(updatedLead);
    syncLeadToSupabase(updatedLead);
    onUpdateLead?.(updatedLead);
    setIsEditing(false);
    toast.success('Данные лида обновлены');
  };

  const handleStageSelect = (newStatus: FullLeadData['status']) => {
    setStatus(newStatus);
    if (!lead) return;
    if (onStatusChange) {
      onStatusChange(lead.id, newStatus);
    } else {
      const updatedLead = { ...lead, status: newStatus };
      saveLeadToStorage(updatedLead);
      syncLeadToSupabase(updatedLead);
      onUpdateLead?.(updatedLead);
    }
  };

  const handleBookTrial = () => {
    if (!selectedGroup) {
      toast.error('Выберите группу для пробного урока');
      return;
    }
    const grp = groups.find(g => g.id === selectedGroup);
    const grpName = grp?.name || 'Выбранная группа';
    const grpCourse = grp?.courseName || lead.directionOrCourse;
    const dt = trialDateTime || 'Согласовывается';

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeFormatted = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const trialInteraction: TimelineInteraction = {
      id: `int_trial_${Date.now()}`,
      occurredAt: `${dateFormatted}, ${timeFormatted}`,
      channel: 'other',
      type: 'trial',
      author: userName || 'Администратор',
      content: `Записан(а) на пробный урок в группу «${grpName}» (${grpCourse}). Дата/время: ${dt}`,
      result: `Пробный урок: ${grpName}`,
    };

    const updatedLead: FullLeadData = {
      ...lead,
      status: 'trial_scheduled',
      trialDate: dt,
      directionOrCourse: grpCourse,
      interactions: [trialInteraction, ...(lead.interactions || [])],
    };

    saveLeadToStorage(updatedLead);
    syncLeadToSupabase(updatedLead);
    onUpdateLead?.(updatedLead);
    setStatus('trial_scheduled');
    setIsBookingTrial(false);
    toast.success(`Пробный урок зафиксирован в группе «${grpName}»`);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const created = await createUnifiedTask({
        title: newTaskTitle.trim(),
        leadId: lead.id,
        leadName: lead.name,
        studentName: lead.studentName,
        dueDate: newTaskDue || 'Сегодня',
        dueDateFormatted: newTaskDue || 'Сегодня',
        taskType: 'CRM Сделка',
        priority: 'high',
        assignedTo: userName || 'Администратор',
      });

      setTasks(prev => [created, ...prev]);
      setNewTaskTitle('');
      setNewTaskDue('');
      setIsAddingTask(false);
      toast.success('Задача по лиду создана');
    } catch {
      toast.error('Не удалось создать задачу');
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'done' ? 'open' : 'done';
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
    await updateUnifiedTaskStatus(taskId, nextStatus);
    toast.success(nextStatus === 'done' ? 'Задача выполнена' : 'Задача открыта заново');
  };

  const handleAddTimelineNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !lead) return;

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeFormatted = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const newInt: TimelineInteraction = {
      id: `int_note_${Date.now()}`,
      occurredAt: `${dateFormatted}, ${timeFormatted}`,
      channel: 'other',
      type: 'follow_up',
      author: userName || 'Администратор',
      content: newComment.trim(),
    };

    const updatedLead: FullLeadData = {
      ...lead,
      interactions: [newInt, ...(lead.interactions || [])],
    };

    saveLeadToStorage(updatedLead);
    syncLeadToSupabase(updatedLead);
    onUpdateLead?.(updatedLead);
    setNewComment('');
    toast.success('Заметка сохранена в историю общения');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container (Desktop: 480-520px) */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] bg-white shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn(
              'px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide uppercase',
              status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
              status === 'lost' || (status as string) === 'no_response' ? 'bg-slate-200 text-slate-700' :
              'bg-blue-100 text-blue-800'
            )}>
              {STAGE_OPTIONS.find(s => s.key === status)?.label || status}
            </span>
            <span className="text-xs text-slate-400">ID: {lead.id}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href={`/crm/leads/${lead.id}`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
              title="Открыть полную страницу лида"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {/* Section: Main Info & Edit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Данные контакта</h3>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  <Edit2 className="h-3 w-3" /> Редактировать
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveContactDetails}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 px-2.5 py-1 rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <Save className="h-3 w-3" /> Сохранить
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2.5 p-3 rounded-xl border border-blue-200 bg-blue-50/30">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ФИО Родителя / Контакта</label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Имя ребенка</label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Например: Анна"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Возраст / Класс</label>
                    <input
                      type="text"
                      value={studentAge}
                      onChange={(e) => setStudentAge(e.target.value)}
                      placeholder="12 лет"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Телефон</label>
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Telegram</label>
                    <input
                      type="text"
                      value={telegram}
                      onChange={(e) => setTelegram(e.target.value)}
                      placeholder="@username"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Направление / Курс</label>
                  <input
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div>
                  <div className="text-sm font-bold text-slate-900">{lead.name}</div>
                  {lead.studentName && lead.studentName !== lead.name && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      Ребенок: <strong className="text-slate-700">{lead.studentName}</strong>
                      {lead.studentAge && <span> ({lead.studentAge})</span>}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="font-mono text-xs text-slate-700 font-semibold">{lead.contact}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(lead.contact);
                        toast.success(`Номер скопирован: ${lead.contact}`);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                      title="Скопировать"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerWhatsAppContact({
                        phone: lead.contact,
                        leadId: lead.id,
                        leadName: lead.name,
                        author: userName || 'Администратор',
                      })}
                      className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] border border-emerald-200/60 cursor-pointer"
                      title="Написать в WhatsApp"
                    >
                      WA
                    </button>
                    {lead.telegram && (
                      <button
                        type="button"
                        onClick={() => triggerTelegramContact({
                          telegram: lead.telegram,
                          phone: lead.contact,
                          leadId: lead.id,
                          leadName: lead.name,
                          author: userName || 'Администратор',
                        })}
                        className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-[10px] border border-sky-200/60 cursor-pointer"
                        title="Написать в Telegram"
                      >
                        TG
                      </button>
                    )}
                    <a
                      href={`tel:${phoneDigits}`}
                      className="p-1 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Позвонить"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-slate-500 text-[11px]">
                  <span>Курс: <strong className="text-purple-700">{lead.directionOrCourse}</strong></span>
                  <span>Источник: <strong>{lead.source}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Section: Stage Selector */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-xs">Этап воронки</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {STAGE_OPTIONS.map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => handleStageSelect(st.key as any)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between',
                    status === st.key
                      ? st.key === 'paid'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                        : 'bg-blue-50 border-blue-300 text-blue-800 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <span className="truncate">{st.label}</span>
                  {status === st.key && <Check className="h-3 w-3 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Book Trial Lesson */}
          <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs">
                <Calendar className="h-3.5 w-3.5 text-purple-600" />
                <span>Запись на пробный урок</span>
              </div>
              {!isBookingTrial && (
                <button
                  type="button"
                  onClick={() => setIsBookingTrial(true)}
                  className="px-2.5 py-1 rounded-md bg-purple-600 text-white font-bold text-[11px] hover:bg-purple-700 transition-colors cursor-pointer"
                >
                  {lead.trialDate ? 'Изменить запись' : 'Записать'}
                </button>
              )}
            </div>

            {lead.trialDate && !isBookingTrial && (
              <div className="p-2 rounded-lg bg-white border border-purple-100 flex items-center justify-between">
                <span className="text-slate-600">Назначено на:</span>
                <span className="font-bold text-purple-700">{lead.trialDate}</span>
              </div>
            )}

            {isBookingTrial && (
              <div className="space-y-2 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Группа из расписания</label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.courseName}) • {g.schedule}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Дата и время урока</label>
                  <input
                    type="text"
                    value={trialDateTime}
                    onChange={(e) => setTrialDateTime(e.target.value)}
                    placeholder="Например: Пн 15 сен, 18:45"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsBookingTrial(false)}
                    className="text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleBookTrial}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors cursor-pointer"
                  >
                    Сохранить в календарь
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section: Tasks */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs">Задачи по сделке ({tasks.length})</h4>
              <button
                type="button"
                onClick={() => setIsAddingTask(!isAddingTask)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Добавить
              </button>
            </div>

            {isAddingTask && (
              <form onSubmit={handleAddTask} className="p-3 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Что нужно сделать (например: позвонить в 15:00)..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                    placeholder="Срок: Сегодня / 15.09"
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 cursor-pointer"
                  >
                    Создать
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-1.5">
              {tasks.length === 0 ? (
                <div className="text-center py-3 border border-dashed border-slate-200 rounded-xl text-slate-400 text-[11px]">
                  Нет назначенных задач
                </div>
              ) : (
                tasks.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/60"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={t.status === 'done'}
                        onChange={() => handleToggleTask(t.id, t.status)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 cursor-pointer"
                      />
                      <span className={cn('truncate', t.status === 'done' ? 'line-through text-slate-400' : 'font-medium text-slate-800')}>
                        {t.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                      {t.dueDateFormatted || t.dueDate}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section: Timeline & Interactions */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
              История взаимодействия
            </h4>

            <form onSubmit={handleAddTimelineNote} className="flex items-center gap-1.5">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Добавить заметку о созвоне или встрече..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(!lead.interactions || lead.interactions.length === 0) ? (
                <div className="text-center py-3 text-slate-400 text-[11px]">
                  История пока пуста
                </div>
              ) : (
                lead.interactions.map((int, i) => (
                  <div key={int.id || i} className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-700">{int.author}</span>
                      <span>{int.occurredAt}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{int.content}</p>
                    {int.result && (
                      <span className="inline-block mt-0.5 text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100">
                        {int.result}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            {status === 'paid' ? (
              <span className="text-emerald-700 font-bold">Лид оплачен</span>
            ) : status === 'lost' ? (
              <span className="text-slate-500 font-semibold">В архиве / отказ</span>
            ) : (
              <span>В процессе согласования</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleStageSelect('lost')}
              className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              В отказ
            </button>
            <button
              type="button"
              onClick={() => setIsConvertOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Зачислить в ученики
            </button>
          </div>
        </div>
      </div>

      {/* Convert to Student Modal */}
      <ConvertLeadModal
        isOpen={isConvertOpen}
        lead={lead}
        onClose={() => setIsConvertOpen(false)}
        onSuccess={(studentId) => {
          if (onConverted) onConverted(studentId);
          onClose();
        }}
      />
    </>
  );
}
