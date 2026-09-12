'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { INITIAL_LEADS, FullLeadData, TimelineInteraction } from '@/lib/data/mockData';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Phone,
  MessageSquare,
  Mail,
  User,
  Users,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Plus,
  ArrowRight,
  CheckSquare,
  Sparkles,
  BookOpen,
  Edit,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/context/ToastContext';

export default function LeadDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const { userName } = useRole();
  const toast = useToast();

  const [lead, setLead] = useState<FullLeadData>(() => {
    return INITIAL_LEADS.find((l) => l.id === leadId) || INITIAL_LEADS[0];
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: lead.name,
    contact: lead.contact,
    telegram: lead.telegram || '',
    studentName: lead.studentName || '',
    studentAge: lead.studentAge || '',
    directionOrCourse: lead.directionOrCourse || '',
    source: lead.source,
    assignedTo: lead.assignedTo,
    parentNotes: lead.parentNotes || '',
    studentNotes: lead.studentNotes || '',
  });

  const handleOpenEdit = () => {
    setEditForm({
      name: lead.name,
      contact: lead.contact,
      telegram: lead.telegram || '',
      studentName: lead.studentName || '',
      studentAge: lead.studentAge || '',
      directionOrCourse: lead.directionOrCourse || '',
      source: lead.source,
      assignedTo: lead.assignedTo,
      parentNotes: lead.parentNotes || '',
      studentNotes: lead.studentNotes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveLead = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: FullLeadData = {
      ...lead,
      name: editForm.name.trim() || lead.name,
      contact: editForm.contact.trim() || lead.contact,
      telegram: editForm.telegram.trim() || undefined,
      studentName: editForm.studentName.trim() || lead.studentName,
      studentAge: editForm.studentAge.trim() || undefined,
      directionOrCourse: editForm.directionOrCourse.trim() || lead.directionOrCourse,
      source: editForm.source.trim() || lead.source,
      assignedTo: editForm.assignedTo.trim() || lead.assignedTo,
      parentNotes: editForm.parentNotes.trim() || undefined,
      studentNotes: editForm.studentNotes.trim() || undefined,
    };
    setLead(updated);

    const idx = INITIAL_LEADS.findIndex((l) => l.id === lead.id);
    if (idx !== -1) {
      INITIAL_LEADS[idx] = updated;
    }

    toast.success('Данные лида успешно обновлены!');
    setIsEditModalOpen(false);
  };

  // Timeline note state
  const [newNoteText, setNewNoteText] = useState('');
  const [newChannel, setNewChannel] = useState<'telegram' | 'whatsapp' | 'phone' | 'call'>('telegram');
  const [newFollowUpDate, setNewFollowUpDate] = useState('');
  const [selectedNextActionPreset, setSelectedNextActionPreset] = useState('');
  const [customNextAction, setCustomNextAction] = useState('');
  const [conversionSuccess, setConversionSuccess] = useState(false);

  const nextActionPresets = [
    { key: 'first_call', label: '📞 Первичный звонок и выявление потребностей' },
    { key: 'schedule_trial', label: '📅 Записать на бесплатный пробный урок' },
    { key: 'remind_trial', label: '⏰ Напомнить о пробном уроке (за 24ч)' },
    { key: 'feedback_trial', label: '💬 Узнать впечатления после пробного урока' },
    { key: 'send_offer', label: '📄 Отправить предложение и расписание групп' },
    { key: 'send_invoice', label: '💳 Выставить счет и реквизиты на оплату' },
    { key: 'payment_control', label: '💰 Проконтролировать поступление оплаты' },
    { key: 'clarify_decision', label: '❓ Уточнить итоговое решение семьи' },
    { key: 'follow_up_later', label: '⏳ Повторный контакт через 3 дня (думают)' },
    { key: 'custom', label: '✏️ Свой вариант (ввести вручную)...' },
  ];

  const setQuickDate = (hoursAhead: number, targetHour?: number) => {
    const d = new Date();
    if (targetHour !== undefined) {
      d.setDate(d.getDate() + Math.max(1, Math.floor(hoursAhead / 24)));
      d.setHours(targetHour, 0, 0, 0);
    } else {
      d.setHours(d.getHours() + hoursAhead);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    setNewFollowUpDate(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const formatFollowUpDateForDisplay = (val: string) => {
    if (!val) return '';
    if (!val.includes('T')) return val;
    try {
      const d = new Date(val);
      return d.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return val;
    }
  };

  // Statuses list
  const statuses = [
    { key: 'new', label: 'Новый' },
    { key: 'contacted', label: 'В работе' },
    { key: 'trial_scheduled', label: 'Пробное назначено' },
    { key: 'trial_held', label: 'Пробное проведено' },
    { key: 'thinking', label: 'Думает / Предложение' },
    { key: 'paid', label: 'Оплачено (Успех)' },
    { key: 'lost', label: 'Потерян' },
    { key: 'no_response', label: 'Не отвечает' },
  ] as const;

  const handleStatusChange = (newStatus: FullLeadData['status']) => {
    if (newStatus === lead.status) return;

    const oldStatusObj = statuses.find((s) => s.key === lead.status);
    const newStatusObj = statuses.find((s) => s.key === newStatus);

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeFormatted = now.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const statusChangeInteraction: TimelineInteraction = {
      id: `status_change_${Date.now()}`,
      studentId: lead.convertedStudentId,
      occurredAt: `${dateFormatted}, ${timeFormatted}`,
      channel: 'other',
      type: 'status_change',
      author: userName || 'Администратор',
      content: `Сменил(а) статус воронки: «${oldStatusObj?.label || lead.status}» → «${newStatusObj?.label || newStatus}»`,
      result: `Этап воронки: ${newStatusObj?.label || newStatus}`,
    };

    const updatedInteractions = [statusChangeInteraction, ...lead.interactions];

    setLead((prev) => ({
      ...prev,
      status: newStatus,
      interactions: updatedInteractions,
    }));

    // Update in-memory INITIAL_LEADS so it persists across views
    const idx = INITIAL_LEADS.findIndex((l) => l.id === lead.id);
    if (idx !== -1) {
      INITIAL_LEADS[idx] = {
        ...INITIAL_LEADS[idx],
        status: newStatus,
        interactions: updatedInteractions,
      };
    }

    toast.success(`Статус изменен на «${newStatusObj?.label}» и зафиксирован в таймлайне`);
  };

  const handleAddInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    // Determine next action text
    let resolvedNextAction = '';
    if (selectedNextActionPreset === 'custom') {
      resolvedNextAction = customNextAction.trim();
    } else if (selectedNextActionPreset) {
      const found = nextActionPresets.find((p) => p.key === selectedNextActionPreset);
      resolvedNextAction = found ? found.label.replace(/^[^a-zA-Zа-яА-ЯёЁ]+/, '') : selectedNextActionPreset;
    } else {
      resolvedNextAction = customNextAction.trim();
    }

    const resolvedDate = formatFollowUpDateForDisplay(newFollowUpDate);

    const newInteraction: TimelineInteraction = {
      id: `int_${Date.now()}`,
      studentId: lead.convertedStudentId,
      occurredAt: `Сегодня, ${timeStr}`,
      channel: newChannel,
      type: 'follow_up',
      author: userName || 'Администратор',
      content: newNoteText,
      result: 'Зафиксировано менеджером',
      nextAction: resolvedNextAction || undefined,
      followUpDate: resolvedDate || undefined,
    };

    const updatedInteractions = [newInteraction, ...lead.interactions];

    setLead((prev) => ({
      ...prev,
      interactions: updatedInteractions,
      nextAction: resolvedNextAction || prev.nextAction,
      nextActionDate: resolvedDate || prev.nextActionDate,
    }));

    const idx = INITIAL_LEADS.findIndex((l) => l.id === lead.id);
    if (idx !== -1) {
      INITIAL_LEADS[idx] = {
        ...INITIAL_LEADS[idx],
        interactions: updatedInteractions,
        nextAction: resolvedNextAction || lead.nextAction,
        nextActionDate: resolvedDate || lead.nextActionDate,
      };
    }

    toast.success('Заметка добавлена в историю общения');
    setNewNoteText('');
    setSelectedNextActionPreset('');
    setCustomNextAction('');
    setNewFollowUpDate('');
  };

  const handleConvertToStudent = () => {
    if (confirm(`Конвертировать лида "${lead.name}" в постоянного ученика и создать профиль семьи?`)) {
      setLead((prev) => ({
        ...prev,
        status: 'paid',
        convertedStudentId: '1',
        convertedParentId: 'p1',
      }));
      setConversionSuccess(true);
      setTimeout(() => setConversionSuccess(false), 3500);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/crm" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Назад к CRM воронке
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{lead.name}</span>
      </div>

      {/* Hero Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 font-bold text-purple-700 text-2xl shadow-sm">
              {lead.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                  {lead.directionOrCourse}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">Источник: {lead.source}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                {lead.name}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Потенциальный ученик: <strong className="text-slate-800">{lead.studentName}</strong> {lead.studentAge && `(${lead.studentAge})`}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <a href={`tel:${lead.contact}`} className="hover:text-blue-600 font-medium">{lead.contact}</a>
                </div>
                {lead.telegram && (
                  <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{lead.telegram}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-slate-500">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>Ответственный: <strong>{lead.assignedTo}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Edit className="h-3.5 w-3.5 text-purple-600" />
              Изменить
            </button>
            {lead.status === 'paid' && lead.convertedStudentId ? (
              <Link
                href={`/students/${lead.convertedStudentId}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Ученик зачислен → Карточка
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleConvertToStudent}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                Конвертировать в ученика
              </button>
            )}
          </div>
        </div>

        {/* Regulated Status Switcher (Requirement 12) */}
        <div className="mt-6 border-t border-slate-100 pt-4">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
            Текущий статус лида в воронке:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {statuses.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => handleStatusChange(s.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                  lead.status === s.key
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Urgent Next Action Alert Box */}
        {lead.nextAction && (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 border border-amber-200/70 text-xs text-amber-900 flex items-start justify-between gap-3">
            <div>
              <span className="font-bold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                Следующее запланированное действие:
              </span>
              <p className="mt-1 text-slate-800 font-medium">{lead.nextAction}</p>
              {lead.nextActionDate && (
                <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
                  Срок выполнения: {lead.nextActionDate}
                </p>
              )}
            </div>
            <Link
              href="/tasks"
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-bold text-amber-900 border border-amber-300 shadow-xs hover:bg-amber-50"
            >
              <CheckSquare className="h-3 w-3" />
              Создать задачу
            </Link>
          </div>
        )}

        {/* If Lost: Loss Reason */}
        {lead.status === 'lost' && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3.5 border border-rose-200 text-xs text-rose-800">
            <strong>Причина потери клиента:</strong> {lead.lossReason || 'Причина не указана'}
          </div>
        )}
      </div>

      {/* Notes & Characteristics (Student & Parent) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Student Notes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>🎓 Заметки и особенности ученика ({lead.studentName || 'Ученик'})</span>
              </span>
            </div>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {lead.studentNotes || 'Заметки об ученике не указаны при создании лида.'}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
            Переносится в карточку ученика при конвертации
          </div>
        </div>

        {/* Parent Notes */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>👨‍👩‍👧 Заметки о родителе ({lead.name})</span>
              </span>
            </div>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {lead.parentNotes || 'Особых комментариев по родителю нет.'}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
            Переносится в карточку семьи и реестр родителей
          </div>
        </div>
      </div>

      {/* TIMELINE ВЗАИМОДЕЙСТВИЙ (Section 13) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-purple-600" />
          Timeline истории общения с лидом
        </h3>
        <p className="text-xs text-slate-500">
          Каждое взаимодействие (звонок, сообщение, пробный урок) фиксируется отдельной записью с результатом и датой follow-up.
        </p>

        {/* Add note form */}
        <form onSubmit={handleAddInteraction} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">Канал связи:</span>
              <select
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value as 'telegram' | 'whatsapp' | 'phone' | 'call')}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="telegram">Telegram</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">Телефонный звонок</option>
                <option value="call">Очная встреча</option>
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-purple-600" />
                Срок follow-up:
              </span>
              <input
                type="datetime-local"
                value={newFollowUpDate}
                onChange={(e) => setNewFollowUpDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400 font-medium"
              />
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setQuickDate(2)}
                  className="rounded-md bg-purple-50 text-purple-700 px-1.5 py-0.5 hover:bg-purple-100 font-semibold transition-colors"
                >
                  +2ч
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(24, 12)}
                  className="rounded-md bg-purple-50 text-purple-700 px-1.5 py-0.5 hover:bg-purple-100 font-semibold transition-colors"
                >
                  Завтра 12:00
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(72, 16)}
                  className="rounded-md bg-purple-50 text-purple-700 px-1.5 py-0.5 hover:bg-purple-100 font-semibold transition-colors"
                >
                  Через 3 дня
                </button>
              </div>
            </div>
          </div>

          <textarea
            rows={2}
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="О чем договорились? Итоги звонка или сообщения родителю..."
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed"
          />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                Следующее действие:
              </span>
              <select
                value={selectedNextActionPreset}
                onChange={(e) => setSelectedNextActionPreset(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-purple-400"
              >
                <option value="">-- Выберите следующее действие из регламента --</option>
                {nextActionPresets.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedNextActionPreset === 'custom' && (
              <input
                type="text"
                value={customNextAction}
                onChange={(e) => setCustomNextAction(e.target.value)}
                placeholder="Введите индивидуальное следующее действие..."
                className="w-full rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400"
                autoFocus
              />
            )}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              Действие зафиксируется в таймлайне и обновит статус карточки лида
            </span>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              Записать в Timeline
            </button>
          </div>
        </form>

        {/* Timeline Records */}
        <div className="space-y-3 pt-2">
          {lead.interactions.map((int) => {
            if (int.type === 'status_change') {
              return (
                <div
                  key={int.id}
                  className="rounded-xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 via-purple-50/40 to-indigo-50/90 p-3.5 text-xs shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs shrink-0">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{int.author}</span>
                          <span className="rounded-full bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider">
                            Смена этапа воронки
                          </span>
                        </div>
                        <p className="text-slate-800 font-medium mt-0.5">{int.content}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-indigo-700/80 font-semibold whitespace-nowrap bg-white/90 px-2.5 py-1 rounded-md border border-indigo-100 self-start sm:self-auto">
                      {int.occurredAt}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div key={int.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{int.author}</span>
                    <span className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200 uppercase">
                      {int.channel}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">{int.occurredAt}</span>
                </div>
                <p className="text-slate-700 pt-1 leading-relaxed">{int.content}</p>
                {int.result && <p className="text-[11px] text-emerald-700 font-medium">✓ Результат: {int.result}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* EDIT LEAD MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Edit className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Изменение данных лида</h3>
                  <p className="text-xs text-slate-500">Контакт, ребенок, курс и примечания</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Имя родителя / контакта</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Телефон контакта</label>
                  <input
                    type="text"
                    value={editForm.contact}
                    onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                    placeholder="+7 (999) 000-00-00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Имя ребенка</label>
                  <input
                    type="text"
                    value={editForm.studentName}
                    onChange={(e) => setEditForm({ ...editForm, studentName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                    placeholder="Анна"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Возраст ребенка</label>
                  <input
                    type="text"
                    value={editForm.studentAge}
                    onChange={(e) => setEditForm({ ...editForm, studentAge: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                    placeholder="10 лет"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Курс / Направление</label>
                  <input
                    type="text"
                    value={editForm.directionOrCourse}
                    onChange={(e) => setEditForm({ ...editForm, directionOrCourse: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                    placeholder="Английский язык"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Источник заявки</label>
                  <select
                    value={editForm.source}
                    onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden bg-white"
                  >
                    <option value="Сайт">Сайт</option>
                    <option value="Яндекс.Директ">Яндекс.Директ</option>
                    <option value="ВКонтакте">ВКонтакте</option>
                    <option value="Telegram">Telegram</option>
                    <option value="Рекомендация">Рекомендация (Сарафанное радио)</option>
                    <option value="Другое">Другое</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Telegram</label>
                  <input
                    type="text"
                    value={editForm.telegram}
                    onChange={(e) => setEditForm({ ...editForm, telegram: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ответственный менеджер</label>
                  <input
                    type="text"
                    value={editForm.assignedTo}
                    onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                    placeholder="Менеджер"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Комментарий / Заметки о родителе</label>
                <textarea
                  rows={2}
                  value={editForm.parentNotes}
                  onChange={(e) => setEditForm({ ...editForm, parentNotes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden resize-none"
                  placeholder="Особенности общения, удобное время для звонка..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Комментарий / Особенности ученика</label>
                <textarea
                  rows={2}
                  value={editForm.studentNotes}
                  onChange={(e) => setEditForm({ ...editForm, studentNotes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden resize-none"
                  placeholder="Уровень подготовки, интересы, особенности характера..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  Сохранить изменения
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
