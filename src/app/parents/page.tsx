'use client';

import React, { useState } from 'react';
import { Search, Plus, Phone, MessageSquare, Mail, Users, MoreHorizontal } from 'lucide-react';

export default function ParentsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const parents = [
    {
      id: '1',
      name: 'Ольга Смирнова',
      phone: '+7 (999) 123-45-67',
      telegram: '@olga_smirnova',
      whatsapp: '+79991234567',
      preferredChannel: 'Telegram',
      children: [{ name: 'Иван Смирнов', group: 'English B1 Teens' }],
      totalPaid: '38 400 ₽',
      balanceStatus: 'paid',
    },
    {
      id: '2',
      name: 'Дмитрий Кузнецов',
      phone: '+7 (999) 234-56-78',
      telegram: '@dkuznetsov',
      whatsapp: '+79992345678',
      preferredChannel: 'WhatsApp',
      children: [
        { name: 'Мария Кузнецова', group: 'Robotics Junior' },
        { name: 'Артём Кузнецов', group: 'Kids Math Safari' }
      ],
      totalPaid: '54 000 ₽',
      balanceStatus: 'debt',
    },
    {
      id: '3',
      name: 'Елена Васильева',
      phone: '+7 (999) 345-67-89',
      telegram: '@elena_v',
      whatsapp: '+79993456789',
      preferredChannel: 'Phone',
      children: [{ name: 'Анна Васильева', group: 'Kids English A1' }],
      totalPaid: '0 ₽',
      balanceStatus: 'trial',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Родители и контакты</h1>
          <p className="text-sm text-slate-500">
            Реестр контактных лиц и законных представителей • Единый профиль семьи
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          + Новый контакт
        </button>
      </div>

      <div className="flex rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск родителя по имени, телефону или ребенку..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {parents.map((p) => (
          <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                  <span className="inline-block mt-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-100">
                    Канал: {p.preferredChannel}
                  </span>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <a href={`tel:${p.phone}`} className="hover:text-blue-600 font-medium">{p.phone}</a>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                  <span className="font-medium text-slate-700">{p.telegram}</span>
                </div>
              </div>

              {/* Children */}
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Дети ({p.children.length}):
                </p>
                <div className="space-y-1.5">
                  {p.children.map((child, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs">
                      <span className="font-semibold text-slate-800">{child.name}</span>
                      <span className="text-[11px] text-slate-500">{child.group}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Всего оплат: <strong className="text-slate-800">{p.totalPaid}</strong></span>
              <button className="text-blue-600 font-semibold hover:underline">
                Карточка семьи →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
