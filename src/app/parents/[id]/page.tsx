'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { INITIAL_STUDENTS } from '@/lib/data/mockData';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Mail,
  Users,
  GraduationCap,
  CreditCard,
  Plus,
  Send,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ParentDetailsPage() {
  const params = useParams();
  const parentId = params.id as string;

  // Let's find parent from mock students
  const parent = {
    id: parentId,
    firstName: 'Ольга',
    lastName: 'Смирнова',
    phone: '+7 (999) 123-45-67',
    telegram: '@olga_smirnova',
    whatsapp: '+79991234567',
    email: 'olga.smirnova@example.com',
    preferredChannel: 'Telegram',
    notes: 'Предпочитает общение в Telegram после 18:00. Платит вовремя по карте.',
    children: [
      {
        id: '1',
        name: 'Иван Смирнов',
        age: '14 лет',
        group: 'English B1 Teens',
        course: 'Английский язык',
        teacher: 'Мария Иванова',
        status: 'active',
        attendance: '94%',
      },
    ],
    payments: [
      { id: 'pay1', studentName: 'Иван Смирнов', date: '01.09.2026', amount: '7 600 ₽', period: 'Сентябрь 2026', status: 'paid' },
      { id: 'pay2', studentName: 'Иван Смирнов', date: '01.08.2026', amount: '7 600 ₽', period: 'Август 2026', status: 'paid' },
    ],
  };

  const [interactions, setInteractions] = useState([
    {
      id: 'int1',
      occurredAt: 'Сегодня, 11:30',
      channel: 'telegram',
      author: 'Елена Менеджер',
      studentName: 'Иван Смирнов',
      content: 'Уточнила у мамы получение домашнего задания. Все скачали, вопросов нет.',
      result: 'Ученик готов к четвергу',
    },
    {
      id: 'int2',
      occurredAt: '01.09.2026, 14:10',
      channel: 'telegram',
      author: 'Елена Менеджер',
      studentName: 'Иван Смирнов',
      content: 'Отправлен электронный чек об оплате абонемента на сентябрь (7 600 ₽).',
      result: 'Успешно оплачено',
    },
  ]);

  const [newNote, setNewNote] = useState('');

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setInteractions((prev) => [
      {
        id: `int_${Date.now()}`,
        occurredAt: 'Только что',
        channel: 'telegram',
        author: 'Вы (Текущий пользователь)',
        studentName: 'Иван Смирнов',
        content: newNote,
        result: 'Зафиксировано в карточке семьи',
      },
      ...prev,
    ]);

    setNewNote('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Back link */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/parents" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Назад к списку родителей
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{parent.firstName} {parent.lastName}</span>
      </div>

      {/* Hero Parent Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 font-bold text-blue-700 text-2xl">
              {parent.firstName[0]}{parent.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {parent.firstName} {parent.lastName}
                </h1>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                  Канал: {parent.preferredChannel}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <a href={`tel:${parent.phone}`} className="hover:text-blue-600 font-medium">{parent.phone}</a>
                </div>
                {parent.telegram && (
                  <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{parent.telegram}</span>
                  </div>
                )}
                {parent.whatsapp && (
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{parent.whatsapp}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {parent.notes && (
          <p className="mt-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
            💡 <strong>Заметка о родителе:</strong> {parent.notes}
          </p>
        )}
      </div>

      {/* Children of this parent */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" />
          Дети семьи ({parent.children.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parent.children.map((child) => (
            <div key={child.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{child.name}</h4>
                  <span className="text-xs text-slate-500">{child.age}</span>
                </div>
                <p className="text-xs font-semibold text-blue-600 mt-1">{child.course}</p>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <p>Группа: <strong>{child.group}</strong></p>
                  <p>Преподаватель: {child.teacher}</p>
                  <p>Посещаемость: <strong className="text-emerald-600">{child.attendance}</strong></p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/60 text-right">
                <Link href={`/students/${child.id}`} className="text-xs font-semibold text-blue-600 hover:underline">
                  Карточка ученика →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unified Family Timeline */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          История взаимодействий с семьей (Единый Timeline)
        </h3>
        <p className="text-xs text-slate-500">
          Сквозная история по всем детям и родителю без дублирования записей
        </p>

        {/* Quick note form */}
        <form onSubmit={handleAddNote} className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Записать результат общения с родителем..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            <Send className="h-3.5 w-3.5" />
            Записать
          </button>
        </form>

        <div className="space-y-3 pt-2">
          {interactions.map((int) => (
            <div key={int.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{int.author}</span>
                  <span className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200 uppercase">
                    {int.channel}
                  </span>
                  <span className="text-slate-400">по поводу: <strong>{int.studentName}</strong></span>
                </div>
                <span className="text-[11px] text-slate-400">{int.occurredAt}</span>
              </div>
              <p className="text-slate-700 pt-1">{int.content}</p>
              {int.result && <p className="text-[11px] text-emerald-700 font-medium">✓ {int.result}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
