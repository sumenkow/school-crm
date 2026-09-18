'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
  X,
  CreditCard,
  Wallet,
  MinusCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FullLeadData, INITIAL_LEADS, TimelineInteraction, INITIAL_STUDENTS, FullTaskData, splitFullName, buildFullName } from '@/lib/data/mockData';
import { getLeadFinancialSummary } from '@/lib/data/balanceHelper';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { getTasksForLead, updateUnifiedTaskStatus } from '@/lib/data/taskManager';
import { getCombinedLeadTimeline, sortTimelineChronologicalDesc } from '@/lib/data/timelineStorage';
import { syncLeadNameCascade } from '@/lib/data/nameCascadeSync';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { savePaymentToStorage } from '@/lib/data/paymentStorage';
import { saveTaskToStorage } from '@/lib/data/taskStorage';
import { triggerWhatsAppContact, triggerTelegramContact } from '@/lib/data/contactWorkflows';
import { CreateStudentModal, NewStudentData, CreateStudentInitialData } from '@/components/students/CreateStudentModal';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { UpcomingPaymentAlert } from '@/components/common/UpcomingPaymentAlert';
import { getUpcomingPaymentForLead } from '@/lib/data/upcomingPaymentsHelper';

export default function LeadDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const { userName } = useRole();
  const toast = useToast();

  const [lead, setLead] = useState<FullLeadData>(() => {
    const fromMem = INITIAL_LEADS.find((l) => l.id === leadId);
    if (fromMem) return fromMem;
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('crm_leads_v2');
        if (stored) {
          const list: FullLeadData[] = JSON.parse(stored);
          const found = list.find((l) => l.id === leadId);
          if (found) return found;
        }
      }
    } catch {}
    return INITIAL_LEADS[0];
  });

  const [leadTasks, setLeadTasks] = useState<FullTaskData[]>([]);

  // Sync tasks and timeline when updated anywhere in the CRM
  useEffect(() => {
    async function loadTasksAndTimeline() {
      try {
        const tasks = await getTasksForLead(leadId);
        setLeadTasks(tasks);

        const combinedTimeline = getCombinedLeadTimeline(leadId, lead.interactions, lead.convertedStudentId);
        if (combinedTimeline.length !== lead.interactions.length) {
          setLead((prev) => ({
            ...prev,
            interactions: combinedTimeline,
          }));
        }
      } catch (e) {
        console.error('Failed to sync lead tasks/timeline:', e);
      }
    }

    loadTasksAndTimeline();

    const handleSync = () => {
      loadTasksAndTimeline();
    };

    window.addEventListener('crm-tasks-changed', handleSync);
    window.addEventListener('crm-timeline-interactions-changed', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      window.removeEventListener('crm-tasks-changed', handleSync);
      window.removeEventListener('crm-timeline-interactions-changed', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [leadId, lead.convertedStudentId]);

  const handleToggleLeadTask = async (taskId: string) => {
    const currentTask = leadTasks.find((t) => t.id === taskId);
    const newStatus = currentTask?.status === 'done' ? 'open' : 'done';

    setLeadTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await updateUnifiedTaskStatus(taskId, newStatus, {
        performedBy: userName || 'Администратор',
      });
      toast.success(newStatus === 'done' ? 'Задача выполнена!' : 'Задача открыта заново');
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [editForm, setEditForm] = useState(() => {
    const pFio = splitFullName(lead.name || '');
    const sFio = splitFullName(lead.studentName || '');
    return {
      parentLastName: lead.parentLastName || pFio.lastName || '',
      parentFirstName: lead.parentFirstName || pFio.firstName || '',
      parentMiddleName: lead.parentMiddleName || pFio.middleName || '',
      studentLastName: lead.studentLastName || sFio.lastName || '',
      studentFirstName: lead.studentFirstName || sFio.firstName || '',
      studentMiddleName: lead.studentMiddleName || sFio.middleName || '',
      contact: lead.contact?.startsWith('+') ? lead.contact : (lead.contact ? `+${lead.contact}` : '+'),
      telegram: lead.telegram || '',
      studentAge: lead.studentAge || '',
      directionOrCourse: lead.directionOrCourse || '',
      source: lead.source,
      assignedTo: lead.assignedTo,
      parentNotes: lead.parentNotes || '',
      studentNotes: lead.studentNotes || '',
    };
  });

  const handleOpenEdit = () => {
    const pFio = splitFullName(lead.name || '');
    const sFio = splitFullName(lead.studentName || '');
    setEditForm({
      parentLastName: lead.parentLastName || pFio.lastName || '',
      parentFirstName: lead.parentFirstName || pFio.firstName || '',
      parentMiddleName: lead.parentMiddleName || pFio.middleName || '',
      studentLastName: lead.studentLastName || sFio.lastName || '',
      studentFirstName: lead.studentFirstName || sFio.firstName || '',
      studentMiddleName: lead.studentMiddleName || sFio.middleName || '',
      contact: lead.contact?.startsWith('+') ? lead.contact : (lead.contact ? `+${lead.contact}` : '+'),
      telegram: lead.telegram || '',
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

    const isAdult = lead.clientType === 'adult_student';
    const fullParent = buildFullName(editForm.parentLastName, editForm.parentFirstName, editForm.parentMiddleName);
    const fullStudent = buildFullName(editForm.studentLastName, editForm.studentFirstName, editForm.studentMiddleName);

    const effectiveName = isAdult ? (fullStudent || lead.name || '') : (fullParent || lead.name || '');
    const effectiveStudentName = fullStudent || lead.studentName || '';

    const updated: FullLeadData = {
      ...lead,
      name: effectiveName,
      parentLastName: isAdult ? undefined : (editForm.parentLastName.trim() || undefined),
      parentFirstName: isAdult ? undefined : (editForm.parentFirstName.trim() || undefined),
      parentMiddleName: isAdult ? undefined : (editForm.parentMiddleName.trim() || undefined),
      studentLastName: editForm.studentLastName.trim() || undefined,
      studentFirstName: editForm.studentFirstName.trim() || (effectiveStudentName ? effectiveStudentName.split(' ')[0] : '') || '',
      studentMiddleName: editForm.studentMiddleName.trim() || undefined,
      studentName: effectiveStudentName || undefined,
      contact: editForm.contact.trim() || lead.contact,
      telegram: editForm.telegram.trim() || undefined,
      studentAge: editForm.studentAge.trim() || undefined,
      directionOrCourse: editForm.directionOrCourse.trim() || lead.directionOrCourse,
      source: editForm.source.trim() || lead.source,
      assignedTo: editForm.assignedTo.trim() || lead.assignedTo,
      parentNotes: editForm.parentNotes.trim() || undefined,
      studentNotes: editForm.studentNotes.trim() || undefined,
    };
    setLead(updated);

    // Update in-memory
    const idx = INITIAL_LEADS.findIndex((l) => l.id === lead.id);
    if (idx !== -1) {
      INITIAL_LEADS[idx] = updated;
    }

    // Persist to localStorage
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('crm_leads_v2');
        let list: FullLeadData[] = stored ? JSON.parse(stored) : [...INITIAL_LEADS];
        const idxStored = list.findIndex((l) => l.id === lead.id);
        if (idxStored !== -1) {
          list[idxStored] = updated;
        } else {
          list.unshift(updated);
        }
        localStorage.setItem('crm_leads_v2', JSON.stringify(list));
        import('@/lib/data/leadStorage').then((m) => m.syncLeadToSupabase(updated));
      }
    } catch (err) {
      console.error(err);
    }

    // Cascade name changes across cards, student, parent, tasks, timeline, payments
    syncLeadNameCascade(lead.id, {
      contactName: effectiveName,
      studentName: effectiveStudentName,
    });

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
    { key: 'first_call', label: 'Первичный звонок и выявление потребностей' },
    { key: 'schedule_trial', label: 'Записать на бесплатный пробный урок' },
    { key: 'remind_trial', label: 'Напомнить о пробном уроке (за 24ч)' },
    { key: 'feedback_trial', label: 'Узнать впечатления после пробного урока' },
    { key: 'send_offer', label: 'Отправить предложение и расписание групп' },
    { key: 'send_invoice', label: 'Выставить счет и реквизиты на оплату' },
    { key: 'payment_control', label: 'Проконтролировать поступление оплаты' },
    { key: 'clarify_decision', label: 'Уточнить итоговое решение семьи' },
    { key: 'follow_up_later', label: 'Повторный контакт через 3 дня (думают)' },
    { key: 'custom', label: 'Свой вариант (ввести вручную)...' },
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

  // Lead Payment & Deposit Deduction state
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isDeductModalOpen, setIsDeductModalOpen] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState('5000');
  const [paymentPurpose, setPaymentPurpose] = useState('Предоплата за курс');
  const [paymentType, setPaymentType] = useState<'prepayment' | 'subscription' | 'one_time'>('prepayment');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer' | 'cash' | 'invoice'>('card');
  const [paymentComment, setPaymentComment] = useState('');
  const [autoSetStatusPaid, setAutoSetStatusPaid] = useState(true);

  const [deductAmount, setDeductAmount] = useState('1000');
  const [deductPurpose, setDeductPurpose] = useState('Оплата пробного занятия');
  const [deductComment, setDeductComment] = useState('');

  const leadDeposit = lead.finance?.deposit?.balance || 0;
  const leadPayments = lead.finance?.payments || [];
  const totalLeadPaid = leadPayments
    .filter((p) => !p.amount.startsWith('-') && p.status === 'paid')
    .reduce((sum, p) => sum + (p.numAmount || parseFloat(p.amount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0), 0);

  const leadFinSummary = useMemo(() => {
    return getLeadFinancialSummary(lead);
  }, [lead]);

  const handleRecordLeadPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(paymentAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    if (num <= 0) {
      toast.error('Введите корректную сумму оплаты');
      return;
    }

    const todayStr = new Date().toLocaleDateString('ru-RU');
    const timeStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const currentDeposit = lead.finance?.deposit?.balance || 0;
    const newDeposit = currentDeposit + num;

    const methodLabels: Record<string, string> = {
      card: 'Банковская карта',
      bank_transfer: 'Перевод по СБП',
      cash: 'Наличные',
      invoice: 'Безналичный расчет (счет)',
    };
    const methodLabel = methodLabels[paymentMethod] || 'Банковская карта';

    const newPaymentRecord = {
      id: `pay_lead_${Date.now()}`,
      date: todayStr,
      amount: `${num.toLocaleString('ru-RU')} ₽`,
      numAmount: num,
      period: paymentPurpose,
      method: methodLabel,
      status: 'paid' as const,
      type: paymentType,
      comment: paymentComment || undefined,
    };

    const paymentInteraction: TimelineInteraction = {
      id: `int_pay_${Date.now()}`,
      studentId: lead.convertedStudentId,
      occurredAt: `Сегодня, ${timeStr}`,
      channel: 'other',
      type: 'status_change',
      author: userName || 'Администратор',
      content: `Принята оплата ${num.toLocaleString('ru-RU')} ₽ от лида. Назначение: «${paymentPurpose}» (способ: ${methodLabel}). Зачислено на депозит лида. Текущий баланс: ${newDeposit.toLocaleString('ru-RU')} ₽.${paymentComment ? ` Комментарий: ${paymentComment}` : ''}`,
      result: 'Оплата получена (до квалификации)',
    };

    let updatedStatus = lead.status;
    let statusInteractions: TimelineInteraction[] = [];
    if (autoSetStatusPaid && lead.status !== 'paid') {
      updatedStatus = 'paid';
      statusInteractions.push({
        id: `status_change_${Date.now()}`,
        studentId: lead.convertedStudentId,
        occurredAt: `Сегодня, ${timeStr}`,
        channel: 'other',
        type: 'status_change',
        author: userName || 'Администратор',
        content: `Сменил(а) статус воронки: «${lead.status}» → «Оплачено (Успех)» в связи с поступлением оплаты`,
        result: 'Этап воронки: Оплачено (Успех)',
      });
    }

    const updatedInteractions = [
      ...statusInteractions,
      paymentInteraction,
      ...lead.interactions,
    ];

    const updatedLead: FullLeadData = {
      ...lead,
      status: updatedStatus,
      interactions: updatedInteractions,
      finance: {
        deposit: {
          balance: newDeposit,
          balanceFormatted: `${newDeposit.toLocaleString('ru-RU')} ₽`,
          currency: 'RUB',
        },
        payments: [newPaymentRecord, ...(lead.finance?.payments || [])],
      },
    };

    setLead(updatedLead);

    // Save in INITIAL_LEADS & localStorage
    const idx = INITIAL_LEADS.findIndex((l) => l.id === lead.id);
    if (idx !== -1) {
      INITIAL_LEADS[idx] = updatedLead;
    }
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('crm_leads_v2');
        let list: FullLeadData[] = stored ? JSON.parse(stored) : [...INITIAL_LEADS];
        const idxStored = list.findIndex((l) => l.id === lead.id);
        if (idxStored !== -1) {
          list[idxStored] = updatedLead;
        } else {
          list.unshift(updatedLead);
        }
        localStorage.setItem('crm_leads_v2', JSON.stringify(list));
        import('@/lib/data/leadStorage').then((m) => m.syncLeadToSupabase(updatedLead));
      }
    } catch (err) {
      console.error(err);
    }

    // Save to global payments so actual revenue / finance updates dynamically
    savePaymentToStorage({
      id: newPaymentRecord.id,
      studentId: lead.convertedStudentId || `lead_${lead.id}`,
      studentName: lead.studentName || lead.name,
      parentId: lead.convertedParentId,
      parentName: lead.name,
      courseName: lead.directionOrCourse || 'Курс',
      groupName: 'Лид (до квалификации)',
      amount: num,
      amountFormatted: `${num.toLocaleString('ru-RU')} ₽`,
      paymentDate: todayStr,
      periodLabel: paymentPurpose,
      status: 'paid',
      paymentMethod,
      currency: 'RUB',
      paymentType,
      recordedBy: userName || 'Администратор',
      comment: `Оплата от лида «${lead.name}» (${paymentPurpose})`,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm-leads-changed', { detail: updatedLead }));
    }

    toast.success(`Платёж ${num.toLocaleString('ru-RU')} ₽ зафиксирован! Депозит лида: ${newDeposit.toLocaleString('ru-RU')} ₽`);
    setIsRecordPaymentOpen(false);
    setPaymentComment('');
  };

  const handleDeductLeadDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(deductAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const currentDeposit = lead.finance?.deposit?.balance || 0;

    if (num <= 0) {
      toast.error('Введите корректную сумму для списания');
      return;
    }
    if (num > currentDeposit) {
      toast.error(`Недостаточно средств на депозите (доступно ${currentDeposit.toLocaleString('ru-RU')} ₽)`);
      return;
    }

    const todayStr = new Date().toLocaleDateString('ru-RU');
    const timeStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const newDeposit = currentDeposit - num;

    const deductionRecord = {
      id: `pay_deduct_lead_${Date.now()}`,
      date: todayStr,
      amount: `-${num.toLocaleString('ru-RU')} ₽`,
      numAmount: -num,
      period: deductPurpose,
      method: 'Списание с депозита',
      status: 'paid' as const,
      type: 'deduction' as const,
      comment: deductComment || undefined,
    };

    const deductionInteraction: TimelineInteraction = {
      id: `int_deduct_${Date.now()}`,
      studentId: lead.convertedStudentId,
      occurredAt: `Сегодня, ${timeStr}`,
      channel: 'other',
      type: 'status_change',
      author: userName || 'Администратор',
      content: `Списано ${num.toLocaleString('ru-RU')} ₽ с депозита лида. Назначение: «${deductPurpose}». Остаток на депозите: ${newDeposit.toLocaleString('ru-RU')} ₽.${deductComment ? ` Комментарий: ${deductComment}` : ''}`,
      result: 'Списание с баланса лида',
    };

    const updatedInteractions = [deductionInteraction, ...lead.interactions];

    const updatedLead: FullLeadData = {
      ...lead,
      interactions: updatedInteractions,
      finance: {
        deposit: {
          balance: newDeposit,
          balanceFormatted: `${newDeposit.toLocaleString('ru-RU')} ₽`,
          currency: 'RUB',
        },
        payments: [deductionRecord, ...(lead.finance?.payments || [])],
      },
    };

    setLead(updatedLead);

    // Save in INITIAL_LEADS & localStorage
    const idx = INITIAL_LEADS.findIndex((l) => l.id === lead.id);
    if (idx !== -1) {
      INITIAL_LEADS[idx] = updatedLead;
    }
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('crm_leads_v2');
        let list: FullLeadData[] = stored ? JSON.parse(stored) : [...INITIAL_LEADS];
        const idxStored = list.findIndex((l) => l.id === lead.id);
        if (idxStored !== -1) {
          list[idxStored] = updatedLead;
        } else {
          list.unshift(updatedLead);
        }
        localStorage.setItem('crm_leads_v2', JSON.stringify(list));
        import('@/lib/data/leadStorage').then((m) => m.syncLeadToSupabase(updatedLead));
      }
    } catch (err) {
      console.error(err);
    }

    // Save deduction to global payments
    savePaymentToStorage({
      id: deductionRecord.id,
      studentId: lead.convertedStudentId || `lead_${lead.id}`,
      studentName: lead.studentName || lead.name,
      parentId: lead.convertedParentId,
      parentName: lead.name,
      courseName: lead.directionOrCourse || 'Курс',
      groupName: 'Лид (до квалификации)',
      amount: -num,
      amountFormatted: `-${num.toLocaleString('ru-RU')} ₽`,
      paymentDate: todayStr,
      periodLabel: `Списание: ${deductPurpose}`,
      status: 'paid',
      paymentMethod: 'deposit_deduction' as any,
      currency: 'RUB',
      paymentType: 'prepayment',
      recordedBy: userName || 'Администратор',
      comment: `Списание с депозита лида «${lead.name}» (${deductPurpose})`,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm-leads-changed', { detail: updatedLead }));
    }

    toast.success(`Списано ${num.toLocaleString('ru-RU')} ₽. Остаток на депозите: ${newDeposit.toLocaleString('ru-RU')} ₽`);
    setIsDeductModalOpen(false);
    setDeductComment('');
  };

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);

  useEffect(() => {
    const handleCloseAll = () => {
      setIsEditModalOpen(false);
      setIsRecordPaymentOpen(false);
      setIsDeductModalOpen(false);
      setIsEnrollModalOpen(false);
      setIsCreateTaskModalOpen(false);
      setIsOutcomeModalOpen(false);
    };
    window.addEventListener('close-all-modals', handleCloseAll);
    return () => window.removeEventListener('close-all-modals', handleCloseAll);
  }, []);

  const handleOutcomeSelected = (outcomeType: 'trial' | 'thinking' | 'no_response' | 'lost') => {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeFormatted = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    let newStatus: FullLeadData['status'] = lead.status;
    let interactionContent = '';
    let taskTitle = '';
    let taskDueDays = 0;
    let taskPriority: FullTaskData['priority'] = 'medium';

    if (outcomeType === 'trial') {
      newStatus = 'trial_scheduled';
      interactionContent = `Итог контакта: Согласован пробный урок по курсу «${lead.directionOrCourse}». Назначена подготовка.`;
      taskTitle = `Провести пробный урок: ${lead.studentName || lead.name}`;
      taskDueDays = 1;
      taskPriority = 'high';
    } else if (outcomeType === 'thinking') {
      newStatus = 'thinking';
      interactionContent = `Итог контакта: Клиент взял паузу на обдумывание / согласование графика.`;
      taskTitle = `Контроль решения (думают): ${lead.name}`;
      taskDueDays = 2;
      taskPriority = 'medium';
    } else if (outcomeType === 'no_response') {
      newStatus = 'no_response';
      interactionContent = `Итог контакта: Не ответил на звонок / сообщение. Запланирован повторный контакт.`;
      taskTitle = `Повторный звонок (не ответил): ${lead.name}`;
      taskDueDays = 1;
      taskPriority = 'high';
    } else if (outcomeType === 'lost') {
      newStatus = 'lost';
      interactionContent = `Итог контакта: Отказ от обучения. Заявка переведена в архив.`;
    }

    const newInteraction: TimelineInteraction = {
      id: `int_${Date.now()}`,
      studentId: lead.convertedStudentId,
      occurredAt: `${dateFormatted}, ${timeFormatted}`,
      channel: 'phone',
      type: outcomeType === 'trial' ? 'trial' : 'follow_up',
      author: userName || 'Администратор',
      content: interactionContent,
      result: outcomeType === 'trial' ? 'Пробное назначено' : outcomeType === 'thinking' ? 'Думают' : outcomeType === 'no_response' ? 'Не ответил' : 'Отказ',
    };

    const updatedInteractions = [newInteraction, ...lead.interactions];
    const nextDate = new Date(Date.now() + taskDueDays * 24 * 60 * 60 * 1000);
    const nextDateFormatted = nextDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });

    const updatedLead: FullLeadData = {
      ...lead,
      status: newStatus,
      nextAction: taskTitle || lead.nextAction,
      nextActionDate: taskDueDays > 0 ? `Через ${taskDueDays} дн. (${nextDateFormatted})` : lead.nextActionDate,
      interactions: updatedInteractions,
    };

    setLead(updatedLead);

    const idx = INITIAL_LEADS.findIndex((l) => l.id === lead.id);
    if (idx !== -1) {
      INITIAL_LEADS[idx] = updatedLead;
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('crm_leads_v2');
        const list: FullLeadData[] = stored ? JSON.parse(stored) : [];
        const foundIdx = list.findIndex((l) => l.id === lead.id);
        if (foundIdx !== -1) {
          list[foundIdx] = updatedLead;
        } else {
          list.unshift(updatedLead);
        }
        localStorage.setItem('crm_leads_v2', JSON.stringify(list));
        import('@/lib/data/leadStorage').then((m) => m.syncLeadToSupabase(updatedLead));
      } catch (e) {
        console.error('Failed to persist lead outcome', e);
      }
    }

    if (taskTitle) {
      try {
        const taskDueIso = nextDate.toISOString().slice(0, 10);
        saveTaskToStorage({
          id: `task_${Date.now()}`,
          title: taskTitle,
          taskType: 'CRM Сделка',
          leadId: lead.id,
          leadName: lead.name,
          dueDate: taskDueIso,
          dueDateFormatted: nextDateFormatted,
          status: 'open',
          priority: taskPriority,
          assignedTo: lead.assignedTo || 'Елена Менеджер',
          description: interactionContent,
          isOverdue: false,
        });
      } catch (err) {
        console.error('Failed to create follow-up task', err);
      }
    }

    setIsOutcomeModalOpen(false);
    toast.success(`Итог контакта зафиксирован. Статус воронки: ${newStatus}`);
  };

  const getInitialStudentData = (): CreateStudentInitialData => {
    const isAdult = lead.clientType === 'adult_student';
    let sFirst = '';
    let sLast = '';
    let pFirst = '';
    let pLast = '';

    if (isAdult) {
      const rawStudent = (lead.name || lead.studentName || '').trim();
      const sParts = rawStudent.split(' ');
      sFirst = sParts[0] || '';
      sLast = sParts.slice(1).join(' ');
    } else {
      const rawStudent = (lead.studentName || '').trim();
      const sParts = rawStudent.split(' ');
      sFirst = sParts[0] || '';
      sLast = sParts.slice(1).join(' ');

      const rawParent = (lead.name || '').trim();
      const pParts = rawParent.split(' ');
      pFirst = pParts[0] || '';
      pLast = pParts.slice(1).join(' ');

      if (!sLast && pLast) {
        sLast = pLast;
      }
    }

    let matchedGroup = 'English B1 Teens';
    const dLower = (lead.directionOrCourse || '').toLowerCase();
    if (dLower.includes('робот')) matchedGroup = 'Robotics Junior';
    else if (dLower.includes('мат')) matchedGroup = 'Kids Math Safari';

    return {
      studentType: isAdult ? 'adult_student' : 'school_student',
      firstName: sFirst,
      lastName: sLast,
      phone: lead.contact,
      telegram: lead.telegram || '',
      group: matchedGroup,
      course: lead.directionOrCourse,
      parentMode: 'new',
      parentFirstName: pFirst,
      parentLastName: pLast,
      parentPhone: isAdult ? '' : lead.contact,
      parentTelegram: isAdult ? '' : (lead.telegram || ''),
      relationshipType: isAdult ? 'Экстренный контакт' : 'Мама',
      preferredChannel: 'telegram',
      notes: [lead.studentNotes, lead.parentNotes, lead.comment].filter(Boolean).join('\n\n'),
      sourceLeadId: lead.id,
      sourceLeadName: lead.name,
      leadInteractions: lead.interactions,
      leadFinance: lead.finance,
    };
  };

  const handleStudentCreated = (newStudent: NewStudentData) => {
    const enrollmentInteraction: TimelineInteraction = {
      id: `int_${Date.now()}`,
      studentId: newStudent.id,
      occurredAt: 'Только что',
      channel: 'other',
      type: 'status_change',
      author: userName || 'Администратор',
      content: `Успешная конвертация в ученика! Создана карточка ученика «${newStudent.name}», семейный профиль, зачислен в группу «${newStudent.group}».`,
      result: 'Конверсия завершена',
    };

    const updatedInteractions = [enrollmentInteraction, ...lead.interactions];

    const updatedLead: FullLeadData = {
      ...lead,
      status: 'paid',
      convertedStudentId: newStudent.id,
      convertedParentId: newStudent.parentId,
      interactions: updatedInteractions,
    };

    setLead(updatedLead);

    const idx = INITIAL_LEADS.findIndex((l) => l.id === lead.id);
    if (idx !== -1) {
      INITIAL_LEADS[idx] = updatedLead;
    }

    setIsEnrollModalOpen(false);
    setConversionSuccess(true);
    toast.success(`Лид успешно сконвертирован! Карточка ученика «${newStudent.name}» сохранена.`);
    router.push(`/students/${newStudent.id}?tab=education`);
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

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <a href={`tel:${lead.contact.replace(/[^\d+]/g, '')}`} className="hover:text-blue-600 font-medium">{lead.contact}</a>
                </div>
                <button
                  type="button"
                  onClick={() => triggerWhatsAppContact({
                    phone: lead.contact,
                    leadId: lead.id,
                    leadName: lead.name,
                    author: userName || 'Администратор',
                  })}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer text-xs"
                >
                  WhatsApp
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 font-bold border border-sky-200 hover:bg-sky-100 transition-colors cursor-pointer text-xs"
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>{lead.telegram}</span>
                  </button>
                )}
                <div className="flex items-center gap-1.5 text-slate-500">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>Ответственный: <strong>{lead.assignedTo}</strong></span>
                </div>
              </div>

              {/* Financial status badges */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {leadFinSummary.isNegative ? (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 inline-flex items-center gap-1.5 shadow-2xs animate-pulse">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    Баланс: {leadFinSummary.formattedNet} (Долг: {leadFinSummary.formattedDebt})
                  </span>
                ) : leadFinSummary.deposit > 0 ? (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5 shadow-2xs">
                    <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                    Депозит: {leadFinSummary.formattedDeposit}
                  </span>
                ) : totalLeadPaid > 0 ? (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1.5 shadow-2xs">
                    <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                    Оплачено: {totalLeadPaid.toLocaleString('ru-RU')} ₽ (депозит израсходован)
                  </span>
                ) : (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    Баланс: 0 ₽ (оплата не поступала)
                  </span>
                )}
                {lead.status === 'paid' && (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Этап: Оплачено (Успех)
                  </span>
                )}
              </div>

              {/* End-to-end linked student/parent debt or deposit alert banner */}
              {leadFinSummary.linkedStudent && (
                <div className={cn(
                  "mt-3 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border text-xs",
                  leadFinSummary.linkedStudent.debt > 0 ? "bg-rose-50/90 border-rose-200 text-rose-900" : "bg-blue-50/70 border-blue-200 text-slate-800"
                )}>
                  <div className="flex items-center gap-2">
                    <User className={cn("h-4 w-4 shrink-0", leadFinSummary.linkedStudent.debt > 0 ? "text-rose-600" : "text-blue-600")} />
                    <div>
                      <span className="font-bold">Связанный ученик: {leadFinSummary.linkedStudent.name}</span>
                      {leadFinSummary.linkedStudent.debt > 0 ? (
                        <span className="ml-2 font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                          Задолженность: -{leadFinSummary.linkedStudent.debt.toLocaleString('ru-RU')} ₽
                        </span>
                      ) : leadFinSummary.linkedStudent.deposit > 0 ? (
                        <span className="ml-2 font-semibold text-emerald-700">
                          Депозит: +{leadFinSummary.linkedStudent.deposit.toLocaleString('ru-RU')} ₽
                        </span>
                      ) : (
                        <span className="ml-2 text-slate-500">Баланс: 0 ₽</span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/students/${leadFinSummary.linkedStudent.id}`}
                    className={cn(
                      "font-bold hover:underline inline-flex items-center gap-1 shrink-0 text-xs",
                      leadFinSummary.linkedStudent.debt > 0 ? "text-rose-700" : "text-blue-700"
                    )}
                  >
                    Карточка ученика →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsOutcomeModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700 shadow-xs hover:bg-purple-100 hover:border-purple-400 transition-all cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              Записать итог контакта
            </button>
            <button
              type="button"
              onClick={() => setIsRecordPaymentOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3.5 py-2 text-xs font-bold text-emerald-700 shadow-xs hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
              Принять оплату
            </button>
            {leadDeposit > 0 && (
              <button
                type="button"
                onClick={() => setIsDeductModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/90 px-3.5 py-2 text-xs font-bold text-amber-800 shadow-xs hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <MinusCircle className="h-3.5 w-3.5 text-amber-600" />
                Списать с баланса
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/60 px-3.5 py-2 text-xs font-semibold text-blue-700 shadow-xs hover:bg-blue-100 transition-colors"
            >
              <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
              Поставить задачу
            </button>
            <button
              type="button"
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Edit className="h-3.5 w-3.5 text-purple-600" />
              Изменить
            </button>
            {lead.status === 'paid' && lead.convertedStudentId ? (
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/students/${lead.convertedStudentId}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Ученик зачислен → Карточка ученика
                </Link>
                {lead.convertedParentId && (
                  <Link
                    href={`/parents/${lead.convertedParentId}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100"
                  >
                    Карточка родителя →
                  </Link>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(true)}
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
            <button
              type="button"
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-bold text-amber-900 border border-amber-300 shadow-xs hover:bg-amber-50"
            >
              <CheckSquare className="h-3 w-3" />
              Создать задачу
            </button>
          </div>
        )}

        {/* UPCOMING PAYMENT DEADLINE ALERT (Раздел 2 ТЗ) */}
        {getUpcomingPaymentForLead(lead.id) && (
          <UpcomingPaymentAlert item={getUpcomingPaymentForLead(lead.id)} className="mt-4" />
        )}

        {/* If Lost: Loss Reason */}
        {lead.status === 'lost' && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3.5 border border-rose-200 text-xs text-rose-800">
            <strong>Причина потери клиента:</strong> {lead.lossReason || 'Причина не указана'}
          </div>
        )}
      </div>

      {/* ЛИД ФИНАНСЫ И ДЕПОЗИТ (Оплата до квалификации и списание) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              Финансы и депозит лида (оплата до квалификации)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Лид может вносить предоплату или депозит до зачисления в группу, а средства могут быть списаны за пробные уроки, бронь или диагностику.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsRecordPaymentOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Принять оплату
            </button>
            {leadDeposit > 0 && (
              <button
                type="button"
                onClick={() => setIsDeductModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 shadow-xs hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <MinusCircle className="h-3.5 w-3.5 text-amber-600" />
                Списать с баланса
              </button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className={cn(
            "rounded-xl border p-3.5",
            leadFinSummary.isNegative ? "border-rose-300 bg-rose-50/80" : leadFinSummary.deposit > 0 ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50/70"
          )}>
            <span className={cn("text-[11px] font-medium", leadFinSummary.isNegative ? "text-rose-700" : "text-slate-500")}>
              Сквозной баланс (лид + семья):
            </span>
            <p className={cn("text-xl font-black mt-0.5", leadFinSummary.isNegative ? "text-rose-700" : leadFinSummary.deposit > 0 ? "text-emerald-700" : "text-slate-900")}>
              {leadFinSummary.formattedNet}
            </p>
            <p className={cn("text-[11px] mt-0.5 font-semibold", leadFinSummary.isNegative ? "text-rose-600" : leadFinSummary.deposit > 0 ? "text-emerald-600" : "text-slate-500")}>
              {leadFinSummary.isNegative
                ? `Задолженность: ${leadFinSummary.formattedDebt}`
                : leadFinSummary.deposit > 0
                ? `Доступно: ${leadFinSummary.formattedDeposit}`
                : 'Баланс нулевой'}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
            <span className="text-slate-500 text-[11px] font-medium">Текущий депозит лида:</span>
            <p className="text-xl font-black text-emerald-700 mt-0.5">
              +{leadDeposit.toLocaleString('ru-RU')} ₽
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">
              {leadDeposit > 0 ? 'Доступно для списания' : 'Депозит нулевой'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <span className="text-slate-500 text-[11px] font-medium">Всего поступило от лида:</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              {totalLeadPaid.toLocaleString('ru-RU')} ₽
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Сумма всех платежей до зачисления
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <span className="text-slate-500 text-[11px] font-medium">Статус этапа воронки:</span>
            <p className="text-base font-bold text-slate-900 mt-1 flex items-center gap-1.5">
              {lead.status === 'paid' ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Оплачено (Успех)
                </span>
              ) : (
                <span className="text-slate-700">
                  {statuses.find((s) => s.key === lead.status)?.label || lead.status}
                </span>
              )}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {lead.status === 'paid' ? 'Готов к зачислению' : 'Оплата до зачисления'}
            </p>
          </div>
        </div>

        {/* Transactions list */}
        {leadPayments.length > 0 ? (
          <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Дата</th>
                  <th className="py-2.5 px-3">Назначение / Операция</th>
                  <th className="py-2.5 px-3">Способ</th>
                  <th className="py-2.5 px-3">Сумма</th>
                  <th className="py-2.5 px-3">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leadPayments.map((p) => {
                  const isDeduct = p.amount.startsWith('-');
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-600">{p.date}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {p.period}
                        {p.comment && (
                          <span className="block text-[11px] font-normal text-slate-500">
                            {p.comment}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{p.method}</td>
                      <td className={cn(
                        "py-2.5 px-3 font-bold",
                        isDeduct ? "text-amber-700" : "text-emerald-700"
                      )}>
                        {p.amount}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          {isDeduct ? 'Списано' : 'Оплачено'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
            По этому лиду еще не зафиксировано платежей или списаний. Нажмите «Принять оплату», чтобы внести аванс, бронь или оплату за пробное занятие.
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
                <span>О ребенке ({lead.studentName || 'Ученик'})</span>
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
                <span>О родителе ({lead.name})</span>
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

      {/* ПРЕДСТОЯЩИЕ ЗАДАЧИ ПО ЛИДУ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">Предстоящие задачи и поручения</h3>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-800">
              {leadTasks.filter((t) => t.status === 'open').length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateTaskModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer border border-purple-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Поставить задачу
          </button>
        </div>

        {leadTasks.length > 0 ? (
          <div className="space-y-2">
            {leadTasks.map((t) => {
              const isDone = t.status === 'done';
              return (
                <div
                  key={t.id}
                  className={cn(
                    'flex items-start justify-between gap-3 p-3 rounded-xl border transition-all text-xs',
                    isDone
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : t.priority === 'high'
                      ? 'bg-rose-50/50 border-rose-200'
                      : 'bg-white border-slate-200 shadow-2xs'
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => handleToggleLeadTask(t.id)}
                      className="mt-0.5 h-4 w-4 rounded-sm border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('font-bold', isDone ? 'line-through text-slate-400' : 'text-slate-900')}>
                          {t.title}
                        </span>
                        {t.priority === 'high' && !isDone && (
                          <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-700">
                            Срочно
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          Срок: {t.dueDateFormatted || t.dueDate}
                        </span>
                        {t.assignedTo && (
                          <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-medium">
                            Отв: {t.assignedTo}
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-[11px] text-slate-600 mt-1">{t.description}</p>
                      )}
                    </div>
                  </div>

                  <span className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                    isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  )}>
                    {isDone ? 'Выполнено' : 'В работе'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-2">
            Нет активных задач по лиду. Нажмите «Поставить задачу», чтобы зафиксировать поручение.
          </p>
        )}
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
                <option value="call">Онлайн-встреча (Zoom / Meet)</option>
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
          {sortTimelineChronologicalDesc(lead.interactions).map((int) => {
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
                {int.result && <p className="text-[11px] text-emerald-700 font-medium">Результат: {int.result}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* EDIT LEAD MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-0 sm:my-8">
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
              {/* Parent Name (3 fields: Фамилия, Имя, Отчество) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ФИО родителя / контакта *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={editForm.parentLastName}
                    onChange={(e) => setEditForm({ ...editForm, parentLastName: e.target.value })}
                    placeholder="Фамилия"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                  />
                  <input
                    type="text"
                    required
                    value={editForm.parentFirstName}
                    onChange={(e) => setEditForm({ ...editForm, parentFirstName: e.target.value })}
                    placeholder="Имя *"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                  />
                  <input
                    type="text"
                    value={editForm.parentMiddleName}
                    onChange={(e) => setEditForm({ ...editForm, parentMiddleName: e.target.value })}
                    placeholder="Отчество"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Student Name (3 fields: Фамилия, Имя, Отчество) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ФИО ученика *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={editForm.studentLastName}
                    onChange={(e) => setEditForm({ ...editForm, studentLastName: e.target.value })}
                    placeholder="Фамилия"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                  />
                  <input
                    type="text"
                    required
                    value={editForm.studentFirstName}
                    onChange={(e) => setEditForm({ ...editForm, studentFirstName: e.target.value })}
                    placeholder="Имя *"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                  />
                  <input
                    type="text"
                    value={editForm.studentMiddleName}
                    onChange={(e) => setEditForm({ ...editForm, studentMiddleName: e.target.value })}
                    placeholder="Отчество"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Телефон контакта *</label>
                  <input
                    type="tel"
                    value={editForm.contact}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditForm({ ...editForm, contact: v.startsWith('+') ? v : '+' + v.replace(/^\+*/, '') });
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                    placeholder="+XXXXXXXXXXX"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Возраст / класс</label>
                  <input
                    type="text"
                    value={editForm.studentAge}
                    onChange={(e) => setEditForm({ ...editForm, studentAge: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                    placeholder="9 лет (3 класс)"
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
                <label className="block font-semibold text-slate-700 mb-1">О родителе</label>
                <textarea
                  rows={2}
                  value={editForm.parentNotes}
                  onChange={(e) => setEditForm({ ...editForm, parentNotes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-hidden resize-none"
                  placeholder="Особенности общения, удобное время для звонка..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">О ребенке</label>
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

      {/* CONVERT LEAD TO STUDENT MODAL (STUDENT CARD) */}
      <CreateStudentModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        initialData={getInitialStudentData()}
        onCreated={handleStudentCreated}
      />

      {/* CREATE TASK MODAL (PRE-LINKED TO LEAD) */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        defaultLeadId={lead.id}
        onCreated={(newTask) => {
          setIsCreateTaskModalOpen(false);
          toast.success(`Задача «${newTask.title}» добавлена в очередь!`);
        }}
      />

      {/* LEAD RECORD PAYMENT MODAL (Оплата до квалификации) */}
      {isRecordPaymentOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Прием оплаты от лида</h2>
                  <p className="text-xs text-slate-500">Фиксация поступления денег до зачисления в группу</p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordPaymentOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordLeadPayment} className="p-6 space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900">
                <p>
                  <strong>Лид:</strong> {lead.name} • <strong>Ученик:</strong> {lead.studentName || '—'}
                </p>
                <p className="text-blue-700 mt-0.5">
                  Текущий баланс депозита лида: <strong>{leadDeposit.toLocaleString('ru-RU')} ₽</strong>
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Сумма оплаты (₽) *
                </label>
                <input
                  type="text"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Назначение платежа *
                </label>
                <select
                  value={paymentPurpose}
                  onChange={(e) => {
                    setPaymentPurpose(e.target.value);
                    if (e.target.value.includes('Предоплата') || e.target.value.includes('депозит') || e.target.value.includes('Бронь')) {
                      setPaymentType('prepayment');
                    } else if (e.target.value.includes('пробн')) {
                      setPaymentType('one_time');
                    } else {
                      setPaymentType('subscription');
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Предоплата за курс">Предоплата за курс (зачисление на депозит)</option>
                  <option value="Бронирование места в группе">Бронирование места в группе (аванс)</option>
                  <option value="Оплата за пробное занятие / диагностику">Оплата за пробное занятие / диагностику</option>
                  <option value="Полная оплата первого месяца">Полная оплата первого месяца обучения</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Способ оплаты *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="card">Банковская карта (эквайринг)</option>
                  <option value="bank_transfer">Перевод по СБП</option>
                  <option value="cash">Наличные в кассу</option>
                  <option value="invoice">Безналичный расчет (счет организации)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Комментарий к платежу
                </label>
                <input
                  type="text"
                  value={paymentComment}
                  onChange={(e) => setPaymentComment(e.target.value)}
                  placeholder="Например: бронь слота на субботу 11:00"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="auto_set_paid"
                  checked={autoSetStatusPaid}
                  onChange={(e) => setAutoSetStatusPaid(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="auto_set_paid" className="text-slate-800 font-medium cursor-pointer">
                  Перевести этап лида в <strong>«Оплачено (Успех)»</strong> после фиксации этого платежа
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Зафиксировать поступление
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAD DEDUCT FROM DEPOSIT MODAL (Списание средств с баланса лида) */}
      {isDeductModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <MinusCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Списание с депозита лида</h2>
                  <p className="text-xs text-slate-500">Удержание средств за оказанные услуги до зачисления</p>
                </div>
              </div>
              <button
                onClick={() => setIsDeductModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDeductLeadDeposit} className="p-6 space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
                <p>
                  Доступный баланс депозита лида: <strong>{leadDeposit.toLocaleString('ru-RU')} ₽</strong>
                </p>
                <p className="text-amber-800 mt-0.5">
                  Сумма списания будет вычтена из депозита и зафиксирована в финансовом журнале школы.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Сумма списания (₽) *
                </label>
                <input
                  type="text"
                  required
                  value={deductAmount}
                  onChange={(e) => setDeductAmount(e.target.value)}
                  placeholder="1000"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Назначение списания *
                </label>
                <select
                  value={deductPurpose}
                  onChange={(e) => setDeductPurpose(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="Оплата пробного занятия">Оплата пробного занятия</option>
                  <option value="Диагностическое тестирование уровня">Диагностическое тестирование уровня</option>
                  <option value="Учебные материалы и пособия">Учебные материалы и пособия</option>
                  <option value="Удержание за бронирование слота">Удержание за бронирование слота</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Комментарий
                </label>
                <input
                  type="text"
                  value={deductComment}
                  onChange={(e) => setDeductComment(e.target.value)}
                  placeholder="Например: списано после проведения пробного урока"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeductModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors cursor-pointer"
                >
                  <MinusCircle className="h-3.5 w-3.5" />
                  Списать с баланса
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD CONTACT OUTCOME BOTTOM SHEET MODAL (Requirement: 4 buttons) */}
      {isOutcomeModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs">
          <div className="relative flex flex-col w-full max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
            {/* Sticky Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 bg-slate-50/90 sticky top-0 z-10 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">Записать итог контакта</h3>
                <p className="text-xs text-slate-500">Лид: {lead.name} • {lead.directionOrCourse}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOutcomeModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body: 4 Action Buttons */}
            <div className="p-4 sm:p-6 space-y-3 overflow-y-auto flex-1">
              {/* BUTTON 1: TRIAL */}
              <button
                type="button"
                onClick={() => handleOutcomeSelected('trial')}
                className="w-full flex items-start gap-3.5 p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 hover:bg-purple-100/60 hover:border-purple-300 text-left transition-all group cursor-pointer"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold shrink-0 text-lg group-hover:scale-105 transition-transform">
                  🎯
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">Пробное занятие</span>
                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">Статус: Пробное</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Клиент готов к пробному уроку. Переводит в «Пробное назначено» и ставит задачу на проведение.
                  </p>
                </div>
              </button>

              {/* BUTTON 2: THINKING */}
              <button
                type="button"
                onClick={() => handleOutcomeSelected('thinking')}
                className="w-full flex items-start gap-3.5 p-3.5 rounded-xl border border-teal-200 bg-teal-50/40 hover:bg-teal-100/60 hover:border-teal-300 text-left transition-all group cursor-pointer"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700 font-bold shrink-0 text-lg group-hover:scale-105 transition-transform">
                  🤔
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">Думают / Счёт отправлен</span>
                    <span className="text-[11px] font-semibold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-full">Задача +2 дня</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Взяли паузу или согласовывают расписание. Ставит задачу на повторный контакт через 2 дня.
                  </p>
                </div>
              </button>

              {/* BUTTON 3: NO RESPONSE */}
              <button
                type="button"
                onClick={() => handleOutcomeSelected('no_response')}
                className="w-full flex items-start gap-3.5 p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-100/60 hover:border-amber-300 text-left transition-all group cursor-pointer"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 font-bold shrink-0 text-lg group-hover:scale-105 transition-transform">
                  📞
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">Не ответил</span>
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">Перезвон +1 день</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Сброс звонка или неотвеченное сообщение. Ставит задачу перезвонить завтра.
                  </p>
                </div>
              </button>

              {/* BUTTON 4: LOST */}
              <button
                type="button"
                onClick={() => handleOutcomeSelected('lost')}
                className="w-full flex items-start gap-3.5 p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-100/60 hover:border-rose-300 text-left transition-all group cursor-pointer"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 font-bold shrink-0 text-lg group-hover:scale-105 transition-transform">
                  ❌
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">Отказ</span>
                    <span className="text-[11px] font-semibold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full">Статус: Потерян</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Не устроила стоимость или расписание. Фиксирует отказ и архивирует заявку.
                  </p>
                </div>
              </button>
            </div>

            {/* Sticky Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end sticky bottom-0 z-10 shrink-0 pb-[calc(14px+env(safe-area-inset-bottom,0px))]">
              <button
                type="button"
                onClick={() => setIsOutcomeModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
