'use client';

import React, { useState } from 'react';
import { Plus, Search, Calendar, Phone, MessageSquare, ArrowRight, DollarSign, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CrmPage() {
  const columns = [
    { key: 'new', label: 'Новые обращения', color: 'border-blue-300 bg-blue-50/30' },
    { key: 'contacted', label: 'В работе / Звонок', color: 'border-amber-300 bg-amber-50/30' },
    { key: 'trial_scheduled', label: 'Пробное назначено', color: 'border-purple-300 bg-purple-50/30' },
    { key: 'trial_held', label: 'Пробное проведено', color: 'border-indigo-300 bg-indigo-50/30' },
    { key: 'thinking', label: 'Думают / Счёт', color: 'border-teal-300 bg-teal-50/30' },
    { key: 'paid', label: 'Оплачено (Успех)', color: 'border-emerald-300 bg-emerald-50/30' },
  ];

  const leads = [
    {
      id: '1',
      name: 'Светлана (мама)',
      childName: 'Михаил (9 лет)',
      contact: '+7 (999) 444-11-22',
      direction: 'Робототехника',
      status: 'new',
      source: 'Instagram',
      nextAction: 'Позвонить для подбора времени',
      nextDate: 'Сегодня, 12:00',
    },
    {
      id: '2',
      name: 'Артем Павлов',
      childName: 'Сам (16 лет)',
      contact: '+7 (999) 555-22-33',
      direction: 'English B2',
      status: 'trial_scheduled',
      source: 'Сайт школы',
      trialDate: '04.09.2026 18:00',
      nextAction: 'Отправить напоминание за 2 часа',
      nextDate: '04.09',
    },
    {
      id: '3',
      name: 'Наталья Ковалева',
      childName: 'Алиса (7 лет)',
      contact: '+7 (999) 666-33-44',
      direction: 'Kids English A1',
      status: 'trial_held',
      source: 'Рекомендация',
      trialDate: '02.09.2026',
      offerAmount: '7 800 ₽',
      nextAction: 'Узнать решение и отправить договор',
      nextDate: 'Сегодня, 17:00',
    },
    {
      id: '4',
      name: 'Виктория Соколова',
      childName: 'Даниил (11 лет)',
      contact: '+7 (999) 777-88-99',
      direction: 'Математика',
      status: 'paid',
      source: 'Листовка',
      offerAmount: '8 400 ₽',
      nextAction: 'Зачислен в группу Math-2',
      nextDate: 'Завершено',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">CRM Лиды и воронка</h1>
          <p className="text-sm text-slate-500">
            Управление заявками, пробными занятиями и конверсией в учеников
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          + Новый лид
        </button>
      </div>

      {/* Kanban Board View */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.key);

          return (
            <div
              key={col.key}
              className="flex w-72 shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-100/70 p-3 shadow-xs"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-1 pb-3">
                <span className="text-xs font-bold text-slate-800">{col.label}</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-slate-600 shadow-xs">
                  {colLeads.length}
                </span>
              </div>

              {/* Cards in column */}
              <div className="space-y-3 flex-1">
                {colLeads.length === 0 ? (
                  <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 text-[11px] text-slate-400">
                    Нет заявок
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-bold text-slate-900 text-sm">{lead.name}</h4>
                        <span className="text-[10px] text-slate-400">{lead.source}</span>
                      </div>
                      <p className="text-xs font-semibold text-blue-600 mt-0.5">{lead.direction}</p>
                      <p className="text-[11px] text-slate-500">Ученик: {lead.childName}</p>

                      <div className="mt-2.5 space-y-1 text-[11px] text-slate-600 border-t border-slate-100 pt-2">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{lead.contact}</span>
                        </div>
                        {lead.trialDate && (
                          <div className="flex items-center gap-1.5 text-purple-700 font-medium">
                            <Calendar className="h-3 w-3 text-purple-500" />
                            <span>Пробное: {lead.trialDate}</span>
                          </div>
                        )}
                        {lead.offerAmount && (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                            <DollarSign className="h-3 w-3 text-emerald-500" />
                            <span>Сумма: {lead.offerAmount}</span>
                          </div>
                        )}
                      </div>

                      {/* Next Action Box */}
                      <div className="mt-2.5 rounded-lg bg-amber-50/80 p-2 border border-amber-200/60 text-[11px]">
                        <p className="text-amber-900 font-medium leading-tight">
                          → {lead.nextAction}
                        </p>
                        <p className="text-amber-700 text-[10px] mt-0.5 font-semibold">
                          Срок: {lead.nextDate}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
