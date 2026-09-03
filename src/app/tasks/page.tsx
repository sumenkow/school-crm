'use client';

import React, { useState } from 'react';
import { Plus, CheckSquare, Clock, AlertCircle, CheckCircle2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TasksPage() {
  const [filter, setFilter] = useState('all');

  const tasks = [
    {
      id: '1',
      title: 'Позвонить маме Михаила (3 пропуска подряд)',
      type: 'Retention / Забота',
      client: 'Ольга Смирнова',
      assignedTo: 'Елена Менеджер',
      dueDate: 'Сегодня, 14:00',
      priority: 'high',
      status: 'open',
    },
    {
      id: '2',
      title: 'Отправить договор и ссылку на оплату для лида Наталья',
      type: 'CRM Сделка',
      client: 'Наталья Ковалева',
      assignedTo: 'Елена Менеджер',
      dueDate: 'Сегодня, 17:00',
      priority: 'high',
      status: 'open',
    },
    {
      id: '3',
      title: 'Проверить оплату за сентябрь у группы Robotics Junior',
      type: 'Финансы',
      client: 'Дмитрий Кузнецов',
      assignedTo: 'Александр Руководитель',
      dueDate: 'Завтра, 12:00',
      priority: 'medium',
      status: 'in_progress',
    },
    {
      id: '4',
      title: 'Запросить обратную связь после пробного урока B2',
      type: 'CRM Follow-up',
      client: 'Артем Павлов',
      assignedTo: 'Елена Менеджер',
      dueDate: '04.09.2026',
      priority: 'low',
      status: 'open',
    },
    {
      id: '5',
      title: 'Подготовить учебные материалы для English Kids A1',
      type: 'Учебный процесс',
      client: 'Группа Kids A1',
      assignedTo: 'Мария Иванова',
      dueDate: '01.09.2026',
      priority: 'medium',
      status: 'done',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Задачи и поручения</h1>
          <p className="text-sm text-slate-500">
            Контроль договоренностей с родителями, оплат и рабочих дел команды
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          + Новая задача
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex gap-2">
            {['all', 'open', 'in_progress', 'done'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  filter === tab ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                {tab === 'all' && 'Все задачи'}
                {tab === 'open' && 'К выполнению'}
                {tab === 'in_progress' && 'В работе'}
                {tab === 'done' && 'Выполненные'}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {tasks
            .filter((t) => filter === 'all' || t.status === filter)
            .map((task) => (
              <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <button className="mt-0.5 text-slate-400 hover:text-blue-600">
                    {task.status === 'done' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <div className="h-4 w-4 rounded border-2 border-slate-300 hover:border-blue-500" />
                    )}
                  </button>
                  <div>
                    <h4 className={cn('text-sm font-semibold', task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-900')}>
                      {task.title}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600">{task.type}</span>
                      <span>Клиент: <strong className="text-slate-700">{task.client}</strong></span>
                      <span>• Ответственный: <strong className="text-slate-700">{task.assignedTo}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-medium">{task.dueDate}</span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                      task.priority === 'high' && 'bg-rose-100 text-rose-800',
                      task.priority === 'medium' && 'bg-amber-100 text-amber-800',
                      task.priority === 'low' && 'bg-slate-100 text-slate-700'
                    )}
                  >
                    {task.priority === 'high' && 'Срочно'}
                    {task.priority === 'medium' && 'Средний'}
                    {task.priority === 'low' && 'Низкий'}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
