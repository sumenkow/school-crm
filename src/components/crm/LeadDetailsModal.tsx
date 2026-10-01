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
  Plus,
  Send,
  MessageSquare,
  ExternalLink,
  Edit2,
  Save,
  Check,
  User,
  GraduationCap
} from 'lucide-react';
import { FullLeadData, TimelineInteraction, FullGroupData, FullTaskData } from '@/lib/data/mockData';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getTasksForLead, updateUnifiedTaskStatus, createUnifiedTask } from '@/lib/data/taskManager';
import { saveLeadToStorage, syncLeadToSupabase } from '@/lib/data/leadStorage';
import { triggerWhatsAppContact, triggerTelegramContact } from '@/lib/data/contactWorkflows';
import { ConvertLeadModal } from './ConvertLeadModal';
import { TelegramConnectModal } from '@/components/telegram/TelegramConnectModal';
import { TelegramChatBox } from '@/components/telegram/TelegramChatBox';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { cn } from '@/lib/utils';
import { formatPhone, normalizePhone } from '@/app/crm/page';

export const WhatsAppIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={cn('fill-current', className)} viewBox="0 0 24 24">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

export const TelegramIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={cn('fill-current', className)} viewBox="0 0 24 24">
    <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.536-.196 1.006.128.833.942z" />
  </svg>
);

export interface LeadDetailsModalProps {
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

export function LeadDetailsModal({
  isOpen,
  lead,
  onClose,
  onUpdateLead,
  onConverted,
  onStatusChange,
}: LeadDetailsModalProps) {
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
  const [isTelegramConnectOpen, setIsTelegramConnectOpen] = useState(false);
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

      getTasksForLead(lead.id).then(setTasks).catch(() => setTasks([]));
      const g = getStoredGroups().filter(group => !group.isDeleted);
      setGroups(g);
      if (g.length > 0) setSelectedGroup(g[0].id);
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const phoneClean = normalizePhone(contactPhone || lead.contact);
  const waLink = `https://wa.me/${phoneClean}`;
  const tgLink = telegram
    ? `https://t.me/${telegram.replace('@', '')}`
    : `https://wa.me/${phoneClean}`;

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
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        onClick={onClose}
      >
        {/* Modal Window (Centered Dialog) */}
        <div
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide uppercase',
                status === 'paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                status === 'lost' || (status as string) === 'no_response' ? 'bg-slate-200 text-slate-700 border border-slate-300' :
                'bg-blue-100 text-blue-800 border border-blue-200'
              )}>
                {STAGE_OPTIONS.find(s => s.key === status)?.label || status}
              </span>
              <h3 className="font-bold text-slate-900 text-base truncate">
                Карточка лида: {lead.name}
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <Link
                href={`/crm/leads/${lead.id}`}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                title="Перейти на страницу лида"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Modal Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* 1. Contact Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">Данные контакта и ученика</h4>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Редактировать
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveContactDetails}
                      className="inline-flex items-center gap-1 text-xs font-bold text-white bg-blue-600 px-3 py-1 rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" /> Сохранить
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3 p-4 rounded-xl border border-blue-200 bg-blue-50/20">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ФИО Родителя / Контакта</label>
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Имя ребенка</label>
                      <input
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="Например: Анна"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Возраст / Класс</label>
                      <input
                        type="text"
                        value={studentAge}
                        onChange={(e) => setStudentAge(e.target.value)}
                        placeholder="12 лет"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Телефон</label>
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Telegram</label>
                      <input
                        type="text"
                        value={telegram}
                        onChange={(e) => setTelegram(e.target.value)}
                        placeholder="@username"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Направление / Курс</label>
                    <input
                      type="text"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-base font-bold text-slate-900">{lead.name}</div>
                      {lead.studentName && lead.studentName !== lead.name && lead.clientType !== 'adult_student' && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          Ребенок: <strong className="text-slate-800">{lead.studentName}</strong>
                          {lead.studentAge && <span> ({lead.studentAge})</span>}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-md block">
                        {lead.directionOrCourse}
                      </span>
                      {lead.source && (
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 block" title="Источник обращения">
                          {lead.source}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Phone + Action buttons (Identical to Student & Parent Cards) */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <a
                      href={phoneClean ? `tel:${phoneClean}` : '#'}
                      title="Позвонить по телефону"
                      className="font-mono text-xs text-slate-600 font-semibold hover:text-blue-600 hover:underline flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      {formatPhone(lead.contact)}
                    </a>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(lead.contact);
                          toast.success(`Номер скопирован: ${lead.contact}`);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                        title="Скопировать"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>

                      {/* WhatsApp Button (Identical styling to student/parent card) */}
                      {phoneClean && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          title="Написать в WhatsApp"
                          className="w-7 h-7 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white flex items-center justify-center transition-all border border-[#25D366]/20 cursor-pointer"
                        >
                          <WhatsAppIcon className="w-4 h-4" />
                        </a>
                      )}

                      {/* Telegram Button (Identical styling to student/parent card) */}
                      {lead.telegram ? (
                        <a
                          href={tgLink}
                          target="_blank"
                          rel="noreferrer"
                          title={`Написать в Telegram (${lead.telegram})`}
                          className="w-7 h-7 rounded-lg bg-[#229ED9]/10 hover:bg-[#229ED9] text-[#229ED9] hover:text-white flex items-center justify-center transition-all border border-[#229ED9]/20 cursor-pointer"
                        >
                          <TelegramIcon className="w-4 h-4" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsTelegramConnectOpen(true)}
                          title="Подключить к Telegram-боту"
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-[#229ED9] text-slate-400 hover:text-white flex items-center justify-center transition-all border border-slate-200 cursor-pointer"
                        >
                          <TelegramIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Funnel Stage Selector */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-xs">Этап воронки</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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

            {/* 3. Book Trial Lesson */}
            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span>Запись на пробный урок в календарь</span>
                </div>
                {!isBookingTrial && (
                  <button
                    type="button"
                    onClick={() => setIsBookingTrial(true)}
                    className="px-3 py-1 rounded-lg bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors cursor-pointer"
                  >
                    {lead.trialDate ? 'Изменить дату' : 'Записать'}
                  </button>
                )}
              </div>

              {lead.trialDate && !isBookingTrial && (
                <div className="p-2.5 rounded-lg bg-white border border-purple-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Назначенный урок:</span>
                  <span className="font-bold text-purple-800">{lead.trialDate}</span>
                </div>
              )}

              {isBookingTrial && (
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Выберите группу</label>
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
                      placeholder="Например: Чт 18 сен, 16:30"
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
                      className="px-3.5 py-1.5 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors cursor-pointer"
                    >
                      Сохранить запись
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Tasks & Next Actions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs">Задачи и контроль поручений ({tasks.length})</h4>
                <button
                  type="button"
                  onClick={() => setIsAddingTask(!isAddingTask)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Назначить задачу
                </button>
              </div>

              {isAddingTask && (
                <form onSubmit={handleAddTask} className="p-3 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Что нужно сделать (например: позвонить маме)..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTaskDue}
                      onChange={(e) => setNewTaskDue(e.target.value)}
                      placeholder="Срок: Сегодня, 17:00"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 cursor-pointer"
                    >
                      Создать
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-1.5">
                {tasks.length === 0 ? (
                  <div className="text-center py-3 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                    Нет назначенных задач
                  </div>
                ) : (
                  tasks.map(t => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs"
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
                      <span className="text-[11px] text-slate-400 shrink-0 ml-2">
                        {t.dueDateFormatted || t.dueDate}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 5. Timeline / Communication Feed */}
            <div className="space-y-3">
              {/* Telegram In-CRM Direct Chat */}
              <TelegramChatBox
                recipientType="lead"
                recipientId={lead.id}
                recipientName={lead.name}
                telegramHandle={lead.telegram}
                telegramChatId={lead.telegramChatId}
                onOpenConnectModal={() => setIsTelegramConnectOpen(true)}
                onMessageSent={(newInt) => {
                  const updatedLead: FullLeadData = {
                    ...lead,
                    interactions: [newInt, ...(lead.interactions || [])],
                  };
                  saveLeadToStorage(updatedLead);
                  syncLeadToSupabase(updatedLead);
                  onUpdateLead?.(updatedLead);
                }}
              />

              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pt-2">
                <MessageSquare className="h-4 w-4 text-slate-500" />
                История взаимодействия
              </h4>

              <form onSubmit={handleAddTimelineNote} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Добавить заметку о созвоне или впечатлениях..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="p-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(!lead.interactions || lead.interactions.length === 0) ? (
                  <div className="text-center py-3 text-slate-400 text-xs">
                    История пока пуста
                  </div>
                ) : (
                  lead.interactions.map((int, i) => (
                    <div key={int.id || i} className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-700">{int.author}</span>
                        <span>{int.occurredAt}</span>
                      </div>
                      <p className="text-slate-600 text-xs leading-relaxed">{int.content}</p>
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

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="text-xs text-slate-500">
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
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                Зачислить в ученики
              </button>
            </div>
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

      {/* Telegram Connect Modal */}
      <TelegramConnectModal
        isOpen={isTelegramConnectOpen}
        onClose={() => setIsTelegramConnectOpen(false)}
        targetType="lead"
        targetId={lead.id}
        targetName={lead.name}
        currentTelegram={lead.telegram}
        onSaveManualTelegram={(handle) => {
          const updatedLead: FullLeadData = {
            ...lead,
            telegram: handle,
          };
          saveLeadToStorage(updatedLead);
          syncLeadToSupabase(updatedLead);
          onUpdateLead?.(updatedLead);
        }}
      />
    </>
  );
}
