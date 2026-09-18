'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FullLeadData, FullPaymentData, FullLessonData } from '@/lib/data/mockData';
import { triggerWhatsAppContact } from '@/lib/data/contactWorkflows';

interface MobileActionCenterProps {
  rate: number;
  payments: FullPaymentData[];
  leads: FullLeadData[];
  lessons?: FullLessonData[];
  onOpenCreateLead: () => void;
}

interface UrgentTask {
  id: string;
  type: 'lead' | 'lesson' | 'debt';
  badgeText: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  phone?: string;
  leadId?: string;
  lessonId?: string;
  studentId?: string;
  debtAmount?: string;
}

export function MobileActionCenter({
  rate,
  payments,
  leads,
  lessons = [],
  onOpenCreateLead,
}: MobileActionCenterProps) {
  const router = useRouter();

  // 1. KPI Calculations
  const paidPayments = payments.filter((p) => p.status === 'paid' && p.amount > 0);
  const paidTotalEur = paidPayments.reduce((acc, p) => {
    const raw = typeof p.amount === 'number'
      ? p.amount
      : parseFloat(String(p.amount).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const isEur = raw <= 500 || String(p.amount).includes('€');
    return acc + (isEur ? raw : Math.round((raw / rate) * 100) / 100);
  }, 0);

  const revenueFact = Math.round(paidTotalEur) || 220;
  const revenuePlan = 6000;
  const revenuePercent = Math.min(100, Math.round((revenueFact / revenuePlan) * 100)) || 4;

  const activeStudents = 48;
  const newStudents = 7;

  const activeLeads = leads.filter((l) => l.status !== 'lost');
  const leadsCount = activeLeads.length || 18;
  const trialLeads = leads.filter(
    (l) => l.status === 'trial_scheduled' || l.status === 'trial_held'
  ).length || 5;

  const overduePayments = payments.filter((p) => p.status === 'overdue');
  const overdueTotalEur = overduePayments.reduce((acc, p) => {
    const raw = typeof p.amount === 'number'
      ? p.amount
      : parseFloat(String(p.amount).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const isEur = raw <= 500 || String(p.amount).includes('€');
    return acc + (isEur ? raw : Math.round((raw / rate) * 100) / 100);
  }, 0);

  const totalDebt = Math.round(overdueTotalEur) || 296;
  const debtorsCount = new Set(overduePayments.map((p) => p.studentId)).size || 3;

  // 2. Urgent Action Center Tasks (max 3-4 tasks)
  const pendingLead = leads.find((l) => l.status === 'new') || leads.find((l) => l.status === 'contacted') || leads[0];
  const overduePayment = overduePayments[0];

  const trialLesson = lessons.find(
    (l) => (l.trialStudentsCount && l.trialStudentsCount > 0) ||
           l.students?.some((s) => s.isTrial) ||
           l.topic?.toLowerCase().includes('пробн') ||
           l.groupName?.toLowerCase().includes('пробн')
  ) || lessons[0];

  const urgentTasks: UrgentTask[] = [
    {
      id: 'task_trial_today',
      type: 'lesson',
      badgeText: `Пробный урок • ${trialLesson?.startTime || '16:00'}`,
      badgeColor: 'text-purple-700',
      title: trialLesson?.students?.find((s) => s.isTrial)?.name || 'Даниил Морозов (7 лет)',
      subtitle: `${trialLesson?.courseName || trialLesson?.groupName || 'Робототехника'} • ${trialLesson?.room || 'Онлайн (Zoom)'}`,
      lessonId: trialLesson?.id || 'l1',
    },
    {
      id: `task_lead_${pendingLead?.id || 'new'}`,
      type: 'lead',
      badgeText: 'Новый лид (> 2ч)',
      badgeColor: 'text-amber-700',
      title: pendingLead?.name || 'Ольга (мама Алисы)',
      subtitle: `${pendingLead?.directionOrCourse || 'Робототехника'} • ${pendingLead?.contact || '+7 916 555-44-33'}`,
      phone: pendingLead?.contact || '+7 916 555-44-33',
      leadId: pendingLead?.id || 'lead1',
    },
    {
      id: `task_debt_${overduePayment?.id || '1'}`,
      type: 'debt',
      badgeText: 'Долг по оплате',
      badgeColor: 'text-rose-700',
      title: overduePayment?.studentName || 'Артем Васильев',
      subtitle: `${overduePayment?.courseName || overduePayment?.groupName || 'Английский язык'} • Долг: ${overduePayment?.amountFormatted || '84 €'}`,
      debtAmount: overduePayment?.amountFormatted || '84 €',
      studentId: overduePayment?.studentId || 's1',
      phone: (overduePayment as any)?.parentPhone || '+7 999 234-56-78',
    },
  ];

  // Month header text
  const currentMonthName = new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const capitalizedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);

  const handleOpenLesson = (lessonId?: string) => {
    if (lessonId) {
      router.push(`/calendar/lessons/${lessonId}`);
    } else {
      router.push('/calendar');
    }
  };

  const handleRemindDebt = (task: UrgentTask) => {
    if (task.phone) {
      triggerWhatsAppContact({
        phone: task.phone,
        clientName: task.title,
        studentId: task.studentId,
        template: `Здравствуйте! Напоминаем об оплате обучения в школе Smart Academy. Сумма задолженности: ${task.debtAmount || 'по счету'}.`,
      });
    } else if (task.studentId) {
      router.push(`/students/${task.studentId}`);
    } else {
      router.push('/finance?filter=overdue');
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 w-full max-w-full overflow-x-hidden">
      {/* Компактная шапка */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Smart Academy</h1>
          <p className="text-xs text-slate-500">{capitalizedMonth} • 1 € = {rate} ₽</p>
        </div>
        <button
          onClick={onOpenCreateLead}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-xl flex items-center gap-1 active:scale-95 transition-all shadow-xs"
        >
          + Лид
        </button>
      </header>

      {/* Сетка KPI 2x2 */}
      <section className="grid grid-cols-2 gap-2">
        <div
          onClick={() => router.push('/finance')}
          className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs cursor-pointer active:bg-slate-50 transition-colors"
        >
          <span className="text-xs text-slate-400 font-medium">Выручка</span>
          <div className="text-lg font-bold text-slate-900">{revenueFact} €</div>
          <span className="text-[11px] text-slate-500">
            план {revenuePlan} € ({revenuePercent}%)
          </span>
        </div>

        <div
          onClick={() => router.push('/students')}
          className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs cursor-pointer active:bg-slate-50 transition-colors"
        >
          <span className="text-xs text-slate-400 font-medium">Ученики</span>
          <div className="text-lg font-bold text-slate-900">{activeStudents}</div>
          <span className="text-[11px] text-emerald-600 font-medium">+{newStudents} новых</span>
        </div>

        <div
          onClick={() => router.push('/crm')}
          className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs cursor-pointer active:bg-slate-50 transition-colors"
        >
          <span className="text-xs text-slate-400 font-medium">Лиды в работе</span>
          <div className="text-lg font-bold text-slate-900">{leadsCount}</div>
          <span className="text-[11px] text-purple-600 font-medium">{trialLeads} на пробный</span>
        </div>

        <div
          onClick={() => router.push('/finance?filter=overdue')}
          className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs cursor-pointer active:bg-slate-50 transition-colors"
        >
          <span className="text-xs text-slate-400 font-medium">Долги</span>
          <div className="text-lg font-bold text-rose-600">{totalDebt} €</div>
          <span className="text-[11px] text-rose-500 font-medium">
            {debtorsCount} {debtorsCount === 1 ? 'ученик' : debtorsCount < 5 ? 'ученика' : 'учеников'}
          </span>
        </div>
      </section>

      {/* Action Center (Фокус дня) */}
      <section className="bg-amber-50/60 border border-amber-200/70 rounded-2xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
            ⚡️ Фокус на сегодня
          </span>
          <span className="text-xs bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full font-semibold">
            {urgentTasks.length} {urgentTasks.length === 1 ? 'задача' : urgentTasks.length < 5 ? 'задачи' : 'задач'}
          </span>
        </div>

        <div className="space-y-2">
          {urgentTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white p-3 rounded-xl border border-amber-100/80 flex items-center justify-between gap-2 shadow-xs transition-all"
            >
              <div
                className="min-w-0 flex-1 cursor-pointer"
                onClick={() => {
                  if (task.type === 'lead' && task.leadId) {
                    router.push(`/crm/leads/${task.leadId}`);
                  } else if (task.type === 'lesson') {
                    handleOpenLesson(task.lessonId);
                  } else if (task.type === 'debt' && task.studentId) {
                    router.push(`/students/${task.studentId}`);
                  }
                }}
              >
                <div className={`text-[11px] font-semibold ${task.badgeColor}`}>{task.badgeText}</div>
                <div className="text-sm font-bold text-slate-800 truncate">{task.title}</div>
                {task.subtitle && <div className="text-xs text-slate-500 truncate">{task.subtitle}</div>}
              </div>

              {task.type === 'lead' && (
                <button
                  onClick={() => {
                    const cleanPhone = (task.phone || '').replace(/\D/g, '');
                    if (cleanPhone) {
                      triggerWhatsAppContact({
                        phone: cleanPhone,
                        clientName: task.title,
                        leadId: task.leadId,
                        template: `Здравствуйте, ${task.title}! На связи онлайн-школа Smart Academy.`,
                      });
                    } else if (task.leadId) {
                      router.push(`/crm/leads/${task.leadId}`);
                    }
                  }}
                  className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-3 py-1.5 rounded-lg shrink-0 active:scale-95 transition-all shadow-2xs"
                >
                  WhatsApp
                </button>
              )}

              {task.type === 'lesson' && (
                <button
                  onClick={() => handleOpenLesson(task.lessonId)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg shrink-0 active:scale-95 transition-all"
                >
                  Урок
                </button>
              )}

              {task.type === 'debt' && (
                <button
                  onClick={() => handleRemindDebt(task)}
                  className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium px-3 py-1.5 rounded-lg shrink-0 active:scale-95 transition-all border border-rose-200/60"
                >
                  Напомнить
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
