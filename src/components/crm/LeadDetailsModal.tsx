'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  GraduationCap,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Target,
  CreditCard,
  Globe,
  Settings,
  AlertCircle,
  FileText,
  Paperclip,
  Mail,
  ArrowRight,
  MoreHorizontal,
  CalendarClock
} from 'lucide-react';
import { FullLeadData, TimelineInteraction, FullGroupData, FullTaskData } from '@/lib/data/mockData';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getTasksForLead, updateUnifiedTaskStatus, createUnifiedTask } from '@/lib/data/taskManager';
import { saveLeadToStorage, syncLeadToSupabase } from '@/lib/data/leadStorage';
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
  { key: 'new', label: '1. Новые', color: 'blue' },
  { key: 'contacted', label: '2. В работе', color: 'indigo' },
  { key: 'trial_scheduled', label: '3. Пробное назначено', color: 'purple' },
  { key: 'trial_held', label: '4. Пробное проведено', color: 'amber' },
  { key: 'thinking', label: '5. Думают / Счёт', color: 'orange' },
  { key: 'paid', label: '6. Оплачено', color: 'emerald' },
  { key: 'lost', label: '7. Отказ / Архив', color: 'slate' },
] as const;

const EDIT_SECTIONS = [
  { id: 'main', label: 'Основные данные', icon: FileText },
  { id: 'contact', label: 'Контакт (родитель)', icon: User },
  { id: 'student', label: 'Ученик', icon: GraduationCap },
  { id: 'need', label: 'Потребность', icon: Target },
  { id: 'trial', label: 'Пробный урок', icon: Calendar },
  { id: 'source', label: 'Источник', icon: Globe },
  { id: 'deal', label: 'Сделка', icon: CreditCard },
  { id: 'extra', label: 'Дополнительно', icon: Settings },
] as const;

type EditSectionId = typeof EDIT_SECTIONS[number]['id'];

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

  // Mode & Tabs
  const [isEditing, setIsEditing] = useState(false);
  const [activeEditSection, setActiveEditSection] = useState<EditSectionId>('contact');
  const [activeTab, setActiveTab] = useState<'history' | 'whatsapp' | 'telegram' | 'notes'>('history');

  // Modal sub-states
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
  const [quickNote, setQuickNote] = useState('');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // Editable form fields
  const [parentName, setParentName] = useState('');
  const [parentRole, setParentRole] = useState<'Мама' | 'Папа' | 'Сам ученик' | 'Родитель'>('Мама');
  const [studentName, setStudentName] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [studentGrade, setStudentGrade] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [course, setCourse] = useState('');
  const [level, setLevel] = useState('');
  const [goal, setGoal] = useState('');
  const [source, setSource] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [status, setStatus] = useState<FullLeadData['status']>('new');
  const [generalComment, setGeneralComment] = useState('');

  // Sync state when lead changes
  useEffect(() => {
    if (lead) {
      setParentName(lead.name || '');
      setParentRole(
        lead.parentNotes?.includes('Папа') ? 'Папа' :
        lead.clientType === 'adult_student' ? 'Сам ученик' : 'Мама'
      );
      setStudentName(lead.studentName || lead.studentFirstName || '');
      setStudentAge(lead.studentAge || '');
      setStudentGrade(lead.studentGrade || lead.grade || '');
      setContactPhone(lead.contact || '');
      setEmail(lead.parentNotes?.includes('@') ? lead.parentNotes : '');
      setTelegram(lead.telegram || '');
      setCourse(lead.directionOrCourse || 'Английский язык');
      setLevel(lead.level || 'A2 Elementary');
      setGoal(lead.studentNotes || 'Подтянуть школьную программу, подготовка к экзамену');
      setSource(lead.source || 'Сайт / Форма заявки');
      setAssignedTo(lead.assignedTo || userName || 'Анна Смирнова');
      setOfferAmount(lead.offerAmount || '120 € / мес.');
      setStatus(lead.status || 'new');
      setGeneralComment(lead.comment || '');
      setTrialDateTime(lead.trialDate || '');

      setIsEditing(false);
      setIsBookingTrial(false);
      setIsAddingTask(false);
      setIsAddMenuOpen(false);

      if (lead.id) {
        getTasksForLead(lead.id).then((res) => setTasks(Array.isArray(res) ? res : [])).catch(() => setTasks([]));
      }
      const g = getStoredGroups().filter(group => !group.isDeleted);
      setGroups(g);
      if (g.length > 0) setSelectedGroup(g[0].id);
    }
  }, [lead, userName]);

  if (!isOpen || !lead) return null;

  const phoneClean = normalizePhone(contactPhone || lead.contact);
  const waLink = phoneClean ? `https://wa.me/${phoneClean}` : '#';
  const tgLink = telegram
    ? `https://t.me/${String(telegram).replace('@', '')}`
    : (phoneClean ? `https://wa.me/${phoneClean}` : '#');

  // Helper metrics
  const daysInCrm = (() => {
    if (!lead?.createdAt) return '3 дня';
    try {
      const parts = String(lead.createdAt).split('.');
      if (parts.length === 3) {
        const createdDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (!isNaN(createdDate.getTime())) {
          const diffDays = Math.max(1, Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));
          return `${diffDays} дн.`;
        }
      }
    } catch {
      // fallback
    }
    return '3 дня';
  })();

  const lastContactFormatted = (() => {
    if (Array.isArray(lead?.interactions) && lead.interactions.length > 0) {
      return lead.interactions[0]?.occurredAt || lead.createdAt || 'Недавно';
    }
    return lead?.createdAt || 'Недавно';
  })();

  // Actions
  const handleSaveAll = () => {
    if (!lead) return;

    const updatedLead: FullLeadData = {
      ...lead,
      name: parentName.trim() || lead.name,
      parentFirstName: (parentName || '').split(' ')[1] || lead.parentFirstName,
      parentLastName: (parentName || '').split(' ')[0] || lead.parentLastName,
      parentNotes: `${parentRole}. ${email ? `Email: ${email}` : ''}`.trim(),
      studentName: studentName.trim() || undefined,
      studentFirstName: (studentName || '').split(' ')[0] || undefined,
      studentLastName: (studentName || '').split(' ')[1] || undefined,
      studentAge: studentAge.trim() || undefined,
      studentGrade: studentGrade.trim() || undefined,
      grade: studentGrade.trim() || undefined,
      contact: contactPhone.trim() || lead.contact,
      telegram: telegram.trim() || undefined,
      directionOrCourse: course.trim() || lead.directionOrCourse,
      level: level.trim() || lead.level,
      studentNotes: goal.trim() || lead.studentNotes,
      source: source.trim() || lead.source,
      assignedTo: assignedTo.trim() || lead.assignedTo,
      offerAmount: offerAmount.trim() || lead.offerAmount,
      comment: generalComment.trim() || lead.comment,
      status: status,
      trialDate: trialDateTime.trim() || lead.trialDate,
    };

    saveLeadToStorage(updatedLead);
    syncLeadToSupabase(updatedLead);
    onUpdateLead?.(updatedLead);
    setIsEditing(false);
    toast.success('Карточка лида успешно сохранена');
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
    toast.success(`Этап изменен на: ${STAGE_OPTIONS.find(s => s.key === newStatus)?.label || newStatus}`);
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
      interactions: [trialInteraction, ...(Array.isArray(lead.interactions) ? lead.interactions : [])],
    };

    saveLeadToStorage(updatedLead);
    syncLeadToSupabase(updatedLead);
    onUpdateLead?.(updatedLead);
    setStatus('trial_scheduled');
    setIsBookingTrial(false);
    toast.success(`Пробный урок зафиксирован в группе «${grpName}»`);
  };

  const handleAddTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const created = await createUnifiedTask({
        title: newTaskTitle.trim(),
        leadId: lead.id,
        leadName: lead.name,
        studentName: lead.studentName,
        dueDate: newTaskDue || 'Сегодня, 17:00',
        dueDateFormatted: newTaskDue || 'Сегодня, 17:00',
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

  const handleAddTimelineNote = (contentToAdd: string) => {
    if (!contentToAdd.trim() || !lead) return;

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeFormatted = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const newInt: TimelineInteraction = {
      id: `int_note_${Date.now()}`,
      occurredAt: `${dateFormatted}, ${timeFormatted}`,
      channel: 'other',
      type: 'follow_up',
      author: userName || 'Администратор',
      content: contentToAdd.trim(),
    };

    const updatedLead: FullLeadData = {
      ...lead,
      interactions: [newInt, ...(Array.isArray(lead.interactions) ? lead.interactions : [])],
    };

    saveLeadToStorage(updatedLead);
    syncLeadToSupabase(updatedLead);
    onUpdateLead?.(updatedLead);
    toast.success('Заметка сохранена');
  };

  const interactionsList = Array.isArray(lead?.interactions) ? lead.interactions : [];

  return (
    <>
      {/* Centered Modal Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150 overflow-hidden"
        onClick={onClose}
      >
        {/* Modal Window */}
        <div
          className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150 text-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ========================================================================= */}
          {/* MODAL HEADER */}
          {/* ========================================================================= */}
          <div className="px-5 sm:px-6 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {/* Stage Badge */}
              <span className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase border flex items-center gap-1.5 shrink-0',
                status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                status === 'contacted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                status === 'trial_scheduled' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                status === 'trial_held' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                status === 'thinking' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                status === 'lost' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                'bg-blue-50 text-blue-700 border-blue-200'
              )}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {STAGE_OPTIONS.find(s => s.key === status)?.label || status}
              </span>

              {/* Lead Name & Meta */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg truncate">
                    Карточка лида: {lead.name}
                  </h3>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2 truncate">
                  <span>Создан {lead.createdAt || '12.09.2024'}</span>
                  <span>•</span>
                  <span>{daysInCrm} в CRM</span>
                </div>
              </div>
            </div>

            {/* Header Action Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {!isEditing ? (
                <>
                  {/* + Добавить ▾ Dropdown Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      <span>Добавить</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {isAddMenuOpen && (
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-20 animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddMenuOpen(false);
                            setIsAddingTask(true);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          <span>Назначить задачу</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddMenuOpen(false);
                            setIsBookingTrial(true);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2 cursor-pointer"
                        >
                          <Calendar className="w-4 h-4 text-purple-600" />
                          <span>Записать на пробный</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddMenuOpen(false);
                            setIsConvertOpen(true);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 cursor-pointer"
                        >
                          <GraduationCap className="w-4 h-4 text-emerald-600" />
                          <span>Зачислить в ученики</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setActiveEditSection('contact');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition-colors border border-blue-200/80 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Редактировать</span>
                  </button>

                  {/* Link to Full Lead Page */}
                  <Link
                    href={`/crm/leads/${lead.id}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                    title="Открыть на отдельной странице"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                    Режим редактирования
                  </span>
                </div>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BODY VIEW MODE */}
          {/* ========================================================================= */}
          {!isEditing ? (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-slate-50/40">
              {/* TOP 3 SUMMARY CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. Contact / Parent Card */}
                <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        <span>Контакт / Родитель</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold lowercase first-letter:uppercase border border-blue-100">
                        {parentRole}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                      {lead.name}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <a
                      href={phoneClean ? `tel:${phoneClean}` : '#'}
                      className="font-mono text-xs font-semibold text-slate-700 hover:text-blue-600 flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {formatPhone(lead.contact)}
                    </a>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(lead.contact);
                          toast.success(`Номер скопирован: ${lead.contact}`);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Скопировать"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {phoneClean && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          title="Написать в WhatsApp"
                          className="w-6 h-6 rounded-md bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white flex items-center justify-center transition-all border border-[#25D366]/20"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {lead.telegram ? (
                        <a
                          href={tgLink}
                          target="_blank"
                          rel="noreferrer"
                          title={`Написать в Telegram (${lead.telegram})`}
                          className="w-6 h-6 rounded-md bg-[#229ED9]/10 hover:bg-[#229ED9] text-[#229ED9] hover:text-white flex items-center justify-center transition-all border border-[#229ED9]/20"
                        >
                          <TelegramIcon className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsTelegramConnectOpen(true)}
                          title="Подключить Telegram"
                          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-[#229ED9] text-slate-400 hover:text-white flex items-center justify-center transition-all border border-slate-200"
                        >
                          <TelegramIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Student Card */}
                <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                        <span>Ученик</span>
                      </div>
                      <span className="text-slate-500 font-medium">
                        {lead.studentAge || 'Возраст не указан'}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                      {lead.studentName || lead.name}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                      {lead.directionOrCourse}
                    </span>
                    {lead.level && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {lead.level}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      💻 Онлайн
                    </span>
                  </div>
                </div>

                {/* 3. Deal & Meta Card */}
                <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-2 text-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Сделка и источник</span>
                      </div>
                      <span className="text-slate-400 text-[10px]">{lead.source}</span>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs text-slate-500 font-medium">Сумма:</span>
                      <span className="font-bold text-slate-900 text-base text-emerald-700">
                        {lead.offerAmount || '120 € / мес.'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>Ответственный:</span>
                      <span className="font-medium text-slate-700">{lead.assignedTo || 'Анна Смирнова'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Посл. контакт:</span>
                      <span className="font-medium text-slate-700">{lastContactFormatted}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* HORIZONTAL FUNNEL STEPPER */}
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Этап воронки (1 клик для переключения):
                  </span>
                  <span className="text-xs font-bold text-blue-700">
                    {STAGE_OPTIONS.find(s => s.key === status)?.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
                  {STAGE_OPTIONS.map((st) => {
                    const isActive = status === st.key;
                    return (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => handleStageSelect(st.key as any)}
                        className={cn(
                          'px-2 py-1.5 rounded-lg border text-left text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-between gap-1',
                          isActive
                            ? st.key === 'paid'
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                              : st.key === 'lost'
                              ? 'bg-slate-700 border-slate-700 text-white shadow-xs'
                              : 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                        )}
                      >
                        <span className="truncate">{st.label}</span>
                        {isActive && <Check className="w-3 h-3 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3 OPERATIONAL ACTION CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. Следующее действие */}
                <div className="bg-white rounded-xl p-4 border border-amber-200 bg-amber-50/20 shadow-2xs space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Следующее действие</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                        Сегодня, 17:00
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-800 mt-2 line-clamp-2">
                      {tasks.find(t => t.status === 'open')?.title || lead.nextAction || 'Позвонить по результатам пробного урока'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60">
                    <button
                      type="button"
                      onClick={() => {
                        const openTask = tasks.find(t => t.status === 'open');
                        if (openTask) {
                          handleToggleTask(openTask.id, 'open');
                        } else {
                          toast.success('Действие выполнено');
                        }
                      }}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Выполнить</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingTask(true)}
                      className="py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Перенести
                    </button>
                  </div>
                </div>

                {/* 2. Пробный урок */}
                <div className="bg-white rounded-xl p-4 border border-purple-200 bg-purple-50/20 shadow-2xs space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-purple-900 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-purple-600" />
                        <span>Пробный урок</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                        60 мин
                      </span>
                    </div>

                    <div className="mt-2">
                      <div className="text-xs font-bold text-purple-900">
                        {lead.trialDate || 'Чт 18 сен, 16:30'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Группа: <strong className="text-slate-700">{groups[0]?.name || 'EPD Teens 2'}</strong> ({lead.directionOrCourse})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-purple-200/60">
                    <button
                      type="button"
                      onClick={() => setIsBookingTrial(true)}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Изменить дату</span>
                    </button>
                    <Link
                      href="/schedule"
                      className="py-1.5 px-2.5 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-purple-700 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>В расписание</span>
                    </Link>
                  </div>
                </div>

                {/* 3. Потребность и цель */}
                <div className="bg-white rounded-xl p-4 border border-blue-200 bg-blue-50/20 shadow-2xs space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-blue-600" />
                        <span>Потребность</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                        {level}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 mt-2 line-clamp-2">
                      {goal || lead.studentNotes || 'Подтянуть школьную программу, подготовка к экзамену'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-blue-200/60 text-[11px]">
                    <span className="text-slate-500">Пн, Ср • 16:00 - 18:00</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setActiveEditSection('need');
                      }}
                      className="font-bold text-blue-700 hover:underline cursor-pointer"
                    >
                      Подробнее ▾
                    </button>
                  </div>
                </div>
              </div>

              {/* BOTTOM SECTION: TABS & QUICK NOTES */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
                {/* Left 2 Cols: Tabs (История, WhatsApp, Telegram, Заметки) */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
                  {/* Tab Headers */}
                  <div className="flex items-center border-b border-slate-200 px-3 bg-slate-50/60 overflow-x-auto gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className={cn(
                        'px-3 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer',
                        activeTab === 'history'
                          ? 'border-blue-600 text-blue-700 bg-white'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      )}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>История</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                        {interactionsList.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('telegram')}
                      className={cn(
                        'px-3 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer',
                        activeTab === 'telegram'
                          ? 'border-[#229ED9] text-[#229ED9] bg-white'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      )}
                    >
                      <TelegramIcon className="w-3.5 h-3.5" />
                      <span>Telegram</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('whatsapp')}
                      className={cn(
                        'px-3 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer',
                        activeTab === 'whatsapp'
                          ? 'border-[#25D366] text-[#25D366] bg-white'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      )}
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('notes')}
                      className={cn(
                        'px-3 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer',
                        activeTab === 'notes'
                          ? 'border-amber-500 text-amber-700 bg-white'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      )}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Задачи ({tasks.length})</span>
                    </button>
                  </div>

                  {/* Tab Body */}
                  <div className="p-4 flex-1">
                    {activeTab === 'history' && (
                      <div className="space-y-3">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleAddTimelineNote(newComment);
                            setNewComment('');
                          }}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Добавить заметку о звонке или договоренности..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="submit"
                            className="px-3.5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs transition-colors cursor-pointer shrink-0"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </form>

                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {interactionsList.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-xs">
                              История взаимодействий пока пуста
                            </div>
                          ) : (
                            interactionsList.map((int, i) => (
                              <div key={int.id || i} className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                  <span className="font-semibold text-slate-700">{int.author}</span>
                                  <span>{int.occurredAt}</span>
                                </div>
                                <p className="text-slate-700 text-xs leading-relaxed">{int.content}</p>
                                {int.result && (
                                  <span className="inline-block mt-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                                    {int.result}
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === 'telegram' && (
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
                            interactions: [newInt, ...(Array.isArray(lead.interactions) ? lead.interactions : [])],
                          };
                          saveLeadToStorage(updatedLead);
                          syncLeadToSupabase(updatedLead);
                          onUpdateLead?.(updatedLead);
                        }}
                      />
                    )}

                    {activeTab === 'whatsapp' && (
                      <div className="p-4 rounded-xl border border-[#25D366]/30 bg-[#25D366]/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[#25D366] font-bold text-xs">
                            <WhatsAppIcon className="w-4 h-4" />
                            <span>Чат WhatsApp ({lead.contact})</span>
                          </div>
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-[#25D366] text-white font-bold text-xs hover:bg-[#20ba5a] transition-colors"
                          >
                            Открыть диалог
                          </a>
                        </div>
                        <p className="text-xs text-slate-600">
                          Нажмите кнопку выше для мгновенного перехода в WhatsApp Web или приложение с автоматической подстановкой шаблона сообщения.
                        </p>
                      </div>
                    )}

                    {activeTab === 'notes' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">Задачи по лиду</span>
                          <button
                            type="button"
                            onClick={() => setIsAddingTask(true)}
                            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Назначить задачу
                          </button>
                        </div>

                        {isAddingTask && (
                          <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
                            <input
                              type="text"
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              placeholder="Текст задачи..."
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={newTaskDue}
                                onChange={(e) => setNewTaskDue(e.target.value)}
                                placeholder="Срок: Сегодня, 18:00"
                                className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddTask()}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs"
                              >
                                Создать
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {tasks.length === 0 ? (
                            <div className="text-center py-4 text-slate-400 text-xs">
                              Нет активных задач
                            </div>
                          ) : (
                            tasks.map(t => (
                              <div
                                key={t.id}
                                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
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
                    )}
                  </div>
                </div>

                {/* Right 1 Col: Quick Notes Widget */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>Заметки менеджера</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200/70 text-xs text-slate-700 leading-relaxed min-h-[90px]">
                      {lead.comment || 'Мама очень заинтересована в подготовке к гимназии. Ученик ранее занимался с репетитором, хорошая база.'}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!quickNote.trim()) return;
                        handleAddTimelineNote(`[Заметка]: ${quickNote.trim()}`);
                        setQuickNote('');
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <input
                        type="text"
                        value={quickNote}
                        onChange={(e) => setQuickNote(e.target.value)}
                        placeholder="Быстрая заметка..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="p-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* BODY EDIT MODE */
            /* ========================================================================= */
            <div className="flex-1 flex overflow-hidden bg-slate-50/50">
              {/* Left Section Navigator Sidebar */}
              <div className="w-56 border-r border-slate-200 bg-white p-3 space-y-1 shrink-0 overflow-y-auto hidden sm:block">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
                  Разделы анкеты
                </div>
                {EDIT_SECTIONS.map((sec) => {
                  const Icon = sec.icon;
                  const isSelected = activeEditSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setActiveEditSection(sec.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all cursor-pointer',
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )}
                    >
                      <Icon className={cn('w-4 h-4', isSelected ? 'text-blue-600' : 'text-slate-400')} />
                      <span>{sec.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Form Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 1. Контакт (родитель) */}
                <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4 shadow-2xs">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Контактное лицо (родитель)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                        ФИО Родителя / Контакта
                      </label>
                      <input
                        type="text"
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                        Кем приходится ученику
                      </label>
                      <div className="flex items-center gap-1.5">
                        {(['Мама', 'Папа', 'Сам ученик', 'Родитель'] as const).map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setParentRole(role)}
                            className={cn(
                              'px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer',
                              parentRole === role
                                ? 'bg-blue-600 text-white border-blue-600 font-bold'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            )}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Телефон</label>
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="parent@example.com"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Telegram</label>
                      <input
                        type="text"
                        value={telegram}
                        onChange={(e) => setTelegram(e.target.value)}
                        placeholder="@username"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Ученик */}
                <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4 shadow-2xs">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                    <GraduationCap className="w-4 h-4 text-purple-600" />
                    Данные ученика
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Имя ученика</label>
                      <input
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="Матвей"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Возраст</label>
                      <input
                        type="text"
                        value={studentAge}
                        onChange={(e) => setStudentAge(e.target.value)}
                        placeholder="12 лет"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Класс</label>
                      <input
                        type="text"
                        value={studentGrade}
                        onChange={(e) => setStudentGrade(e.target.value)}
                        placeholder="6 класс"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Потребность и курс */}
                <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4 shadow-2xs">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    Потребность, курс и цели
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                        Направление / Курс
                      </label>
                      <input
                        type="text"
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                        Уровень знаний
                      </label>
                      <select
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="A0 Starter">A0 Starter (С нуля)</option>
                        <option value="A1 Elementary">A1 Elementary</option>
                        <option value="A2 Pre-Intermediate">A2 Pre-Intermediate</option>
                        <option value="B1 Intermediate">B1 Intermediate</option>
                        <option value="B2 Upper-Intermediate">B2 Upper-Intermediate</option>
                        <option value="C1 Advanced">C1 Advanced</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Цель обучения</label>
                    <input
                      type="text"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      placeholder="Например: Подтянуть оценки, сдать вступительный экзамен..."
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 4. Сделка и источник */}
                <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4 shadow-2xs">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    Параметры сделки и источник
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                        Потенциальная сумма (€)
                      </label>
                      <input
                        type="text"
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                        placeholder="120 € / мес."
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Источник</label>
                      <input
                        type="text"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        placeholder="Сайт / Форма заявки"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                        Ответственный менеджер
                      </label>
                      <input
                        type="text"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL FOOTER */}
          {/* ========================================================================= */}
          <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
            {!isEditing ? (
              <>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Лид синхронизирован с облаком</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStageSelect('lost')}
                    className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    В отказ
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConvertOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Зачислить в ученики
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Отмена
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveAll}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Сохранить изменения
                  </button>
                </div>
              </>
            )}
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

      {/* Trial Lesson Booking Modal */}
      {isBookingTrial && (
        <div
          className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setIsBookingTrial(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>Запись на пробный урок</span>
              </div>
              <button
                type="button"
                onClick={() => setIsBookingTrial(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  Выберите группу
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.courseName}) • {g.schedule}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  Дата и время пробного урока
                </label>
                <input
                  type="text"
                  value={trialDateTime}
                  onChange={(e) => setTrialDateTime(e.target.value)}
                  placeholder="Чт 18 сен, 16:30"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBookingTrial(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleBookTrial}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors"
              >
                Сохранить запись
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
