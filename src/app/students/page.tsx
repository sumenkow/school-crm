'use client';

import React, { useState } from 'react';
import { Search, Filter, Plus, Phone, Mail, MoreHorizontal, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const students = [
    {
      id: '1',
      name: 'Иван Смирнов',
      status: 'active',
      parent: 'Ольга Смирнова (Мама)',
      parentPhone: '+7 (999) 123-45-67',
      group: 'English B1 Teens',
      course: 'Английский язык',
      teacher: 'Мария Иванова',
      attendanceRate: '94%',
      paymentStatus: 'paid',
      subscriptionEnd: '30.09.2026',
    },
    {
      id: '2',
      name: 'Мария Кузнецова',
      status: 'active',
      parent: 'Дмитрий Кузнецов (Отец)',
      parentPhone: '+7 (999) 234-56-78',
      group: 'Robotics Junior',
      course: 'Робототехника',
      teacher: 'Денис Смирнов',
      attendanceRate: '100%',
      paymentStatus: 'overdue',
      subscriptionEnd: '25.08.2026',
    },
    {
      id: '3',
      name: 'Анна Васильева',
      status: 'trial',
      parent: 'Елена Васильева (Мама)',
      parentPhone: '+7 (999) 345-67-89',
      group: 'Kids English A1',
      course: 'Английский язык',
      teacher: 'Мария Иванова',
      attendanceRate: '—',
      paymentStatus: 'expected',
      subscriptionEnd: '—',
    },
    {
      id: '4',
      name: 'Сергей Попов',
      status: 'paused',
      parent: 'Татьяна Попова (Мама)',
      parentPhone: '+7 (999) 456-78-90',
      group: 'English B1 Teens',
      course: 'Английский язык',
      teacher: 'Мария Иванова',
      attendanceRate: '82%',
      paymentStatus: 'paid',
      subscriptionEnd: '15.10.2026',
    },
    {
      id: '5',
      name: 'Екатерина Морозова',
      status: 'active',
      parent: 'Игорь Морозов (Отец)',
      parentPhone: '+7 (999) 567-89-01',
      group: 'Kids Math Safari',
      course: 'Математика',
      teacher: 'Ольга Соколова',
      attendanceRate: '88%',
      paymentStatus: 'paid',
      subscriptionEnd: '05.10.2026',
    },
  ];

  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.group.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.parent.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ученики</h1>
          <p className="text-sm text-slate-500">
            Единая база учеников школы • Всего: 124 ученика (114 активных)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" />
            + Новый ученик
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск по имени ученика, родителю или группе..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <span>Статус:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="trial">Пробные</option>
            <option value="paused">На паузе</option>
            <option value="churned">Ушедшие</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600">
              <tr>
                <th className="py-3.5 pl-4 pr-3">Ученик</th>
                <th className="px-3 py-3.5">Статус</th>
                <th className="px-3 py-3.5">Родитель / Контакт</th>
                <th className="px-3 py-3.5">Группа / Курс</th>
                <th className="px-3 py-3.5">Преподаватель</th>
                <th className="px-3 py-3.5 text-center">Посещаемость</th>
                <th className="px-3 py-3.5">Оплата / Абонемент</th>
                <th className="py-3.5 pl-3 pr-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 pl-4 pr-3 font-semibold text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-xs">
                        {student.name[0]}
                      </div>
                      <span>{student.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 font-semibold text-[10px]',
                        student.status === 'active' && 'bg-emerald-100 text-emerald-800',
                        student.status === 'trial' && 'bg-purple-100 text-purple-800',
                        student.status === 'paused' && 'bg-amber-100 text-amber-800'
                      )}
                    >
                      {student.status === 'active' && 'Активен'}
                      {student.status === 'trial' && 'Пробный'}
                      {student.status === 'paused' && 'На паузе'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-800">{student.parent}</p>
                    <p className="text-[11px] text-slate-500">{student.parentPhone}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-800">{student.group}</p>
                    <p className="text-[11px] text-slate-500">{student.course}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{student.teacher}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-semibold text-slate-800">{student.attendanceRate}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      {student.paymentStatus === 'paid' && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Оплачен
                        </span>
                      )}
                      {student.paymentStatus === 'overdue' && (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                          <AlertCircle className="h-3.5 w-3.5" /> Долг
                        </span>
                      )}
                      {student.paymentStatus === 'expected' && (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                          <Clock className="h-3.5 w-3.5" /> Ожидается
                        </span>
                      )}
                    </div>
                    {student.subscriptionEnd !== '—' && (
                      <p className="text-[10px] text-slate-400">до {student.subscriptionEnd}</p>
                    )}
                  </td>
                  <td className="py-3 pl-3 pr-4 text-right">
                    <button className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
