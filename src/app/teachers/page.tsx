'use client';

import React from 'react';
import { Plus, Phone, MessageSquare, Mail, Calendar, GraduationCap } from 'lucide-react';

export default function TeachersPage() {
  const teachers = [
    {
      id: '1',
      name: 'Мария Иванова',
      role: 'Ведущий преподаватель английского',
      phone: '+7 (999) 777-11-22',
      telegram: '@maria_english',
      email: 'maria@school.ru',
      activeGroupsCount: 4,
      studentsTotal: 28,
      lessonsPerWeek: 8,
      status: 'active',
    },
    {
      id: '2',
      name: 'Денис Смирнов',
      role: 'Преподаватель робототехники и IT',
      phone: '+7 (999) 777-33-44',
      telegram: '@denis_robotics',
      email: 'denis@school.ru',
      activeGroupsCount: 2,
      studentsTotal: 14,
      lessonsPerWeek: 4,
      status: 'active',
    },
    {
      id: '3',
      name: 'Ольга Соколова',
      role: 'Преподаватель олимпиадной математики',
      phone: '+7 (999) 777-55-66',
      telegram: '@olga_math',
      email: 'olga@school.ru',
      activeGroupsCount: 3,
      studentsTotal: 18,
      lessonsPerWeek: 6,
      status: 'active',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Преподаватели</h1>
          <p className="text-sm text-slate-500">
            Список педагогического состава, контакты и текущая учебная нагрузка
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          + Добавить преподавателя
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {teachers.map((t) => (
          <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700 text-lg">
                {t.name[0]}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{t.name}</h3>
                <p className="text-xs text-slate-500">{t.role}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{t.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-blue-600 font-medium">{t.telegram}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center border border-slate-100">
              <div>
                <p className="text-base font-bold text-slate-900">{t.activeGroupsCount}</p>
                <p className="text-[10px] text-slate-500">Группы</p>
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">{t.studentsTotal}</p>
                <p className="text-[10px] text-slate-500">Учеников</p>
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">{t.lessonsPerWeek}</p>
                <p className="text-[10px] text-slate-500">Уроков / нед</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-right">
              <button className="text-xs font-semibold text-blue-600 hover:underline">
                Расписание и группы →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
