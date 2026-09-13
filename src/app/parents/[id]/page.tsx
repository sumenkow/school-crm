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
  AlertCircle,
  Edit,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { AddChildModal, AddedChildData } from '@/components/parents/AddChildModal';

export default function ParentDetailsPage() {
  const params = useParams();
  const { success } = useToast();
  const parentId = params.id as string;

  // Parent state
  const [parent, setParent] = useState({
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
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddChildModalOpen, setIsAddChildModalOpen] = useState(false);

  const handleChildAdded = (newChild: AddedChildData) => {
    // 1. Add child to parent's children list
    setParent((prev) => ({
      ...prev,
      children: [
        ...prev.children,
        {
          id: newChild.id,
          name: newChild.name,
          age: newChild.age,
          group: newChild.group,
          course: newChild.course,
          teacher: newChild.teacher,
          status: newChild.status,
          attendance: newChild.attendance,
        },
      ],
      payments: newChild.paymentStatus === 'paid'
        ? [
            {
              id: `pay_${Date.now()}`,
              studentName: newChild.name,
              date: new Date().toLocaleDateString('ru-RU'),
              amount: newChild.price,
              period: new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
              status: 'paid',
            },
            ...prev.payments,
          ]
        : prev.payments,
    }));

    // 2. Add event to family timeline
    setInteractions((prev) => [
      {
        id: `int_${Date.now()}`,
        occurredAt: 'Только что',
        channel: 'telegram',
        author: 'Администратор школы',
        studentName: newChild.name,
        content: `В семью зачислен ребенок: ${newChild.name} (${newChild.course}, группа «${newChild.group}», преподаватель ${newChild.teacher}). Тариф: ${newChild.subscriptionType} (${newChild.price}). Степень родства: ${newChild.relationshipType}.`,
        result: newChild.paymentStatus === 'paid' ? 'Оплачено и зачислено' : 'Ожидается оплата',
      },
      ...prev,
    ]);

    success(`Ребенок ${newChild.name} успешно добавлен в семью!`);
  };
  const [editForm, setEditForm] = useState({
    firstName: parent.firstName,
    lastName: parent.lastName,
    phone: parent.phone,
    telegram: parent.telegram,
    whatsapp: parent.whatsapp,
    email: parent.email,
    preferredChannel: parent.preferredChannel,
    notes: parent.notes,
  });

  const handleOpenEdit = () => {
    setEditForm({
      firstName: parent.firstName,
      lastName: parent.lastName,
      phone: parent.phone,
      telegram: parent.telegram,
      whatsapp: parent.whatsapp,
      email: parent.email,
      preferredChannel: parent.preferredChannel,
      notes: parent.notes,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveParent = (e: React.FormEvent) => {
    e.preventDefault();
    setParent((prev) => ({
      ...prev,
      firstName: editForm.firstName.trim() || prev.firstName,
      lastName: editForm.lastName.trim() || prev.lastName,
      phone: editForm.phone.trim() || prev.phone,
      telegram: editForm.telegram.trim() || prev.telegram,
      whatsapp: editForm.whatsapp.trim() || prev.whatsapp,
      email: editForm.email.trim() || prev.email,
      preferredChannel: editForm.preferredChannel,
      notes: editForm.notes.trim(),
    }));
    success('Данные родителя успешно обновлены!');
    setIsEditModalOpen(false);
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

          <div>
            <button
              type="button"
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Edit className="h-3.5 w-3.5 text-blue-600" />
              Изменить
            </button>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Дети семьи ({parent.children.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ученики, привязанные к данному родителю в рамках единого семейного аккаунта
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddChildModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-98 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Добавить ребенка
          </button>
        </div>

        {parent.children.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
            <p className="font-semibold">К этому родителю пока не привязано ни одного ребенка</p>
            <button
              type="button"
              onClick={() => setIsAddChildModalOpen(true)}
              className="mt-2 inline-flex items-center gap-1 text-blue-600 font-bold hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Добавить ребенка сейчас
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parent.children.map((child) => (
              <div
                key={child.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between hover:border-blue-300 hover:bg-white transition-all shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700 text-xs shadow-2xs">
                        {child.name.split(' ')[0]?.[0] || 'У'}
                        {child.name.split(' ')[1]?.[0] || ''}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{child.name}</h4>
                        <span className="text-[11px] text-slate-500">{child.age}</span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[10px] font-bold border',
                        child.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      )}
                    >
                      {child.status === 'active' ? 'Активен' : 'Пробный'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-blue-600 mt-3">{child.course}</p>
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    <p>
                      Группа: <strong>{child.group}</strong>
                    </p>
                    <p>Преподаватель: {child.teacher}</p>
                    <p>
                      Посещаемость: <strong className="text-emerald-600">{child.attendance}</strong>
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">ID: {child.id}</span>
                  <Link
                    href={`/students/${child.id}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Карточка ученика →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
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

      {/* EDIT PARENT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Edit className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Изменение данных родителя</h3>
                  <p className="text-xs text-slate-500">Контакты, предпочтительные каналы и заметки</p>
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

            <form onSubmit={handleSaveParent} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Имя</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Фамилия</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Телефон</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Основной канал связи</label>
                  <select
                    value={editForm.preferredChannel}
                    onChange={(e) => setEditForm({ ...editForm, preferredChannel: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden bg-white"
                  >
                    <option value="Telegram">Telegram</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Телефон">Телефон</option>
                    <option value="Email">Email</option>
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={editForm.whatsapp}
                    onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    placeholder="+79991234567"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Электронная почта (Email)</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Заметки и особенности взаимодействия</label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden resize-none"
                  placeholder="Удобное время для звонков, особенности..."
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  Сохранить изменения
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CHILD MODAL */}
      <AddChildModal
        isOpen={isAddChildModalOpen}
        onClose={() => setIsAddChildModalOpen(false)}
        parentId={parent.id}
        parentName={`${parent.firstName} ${parent.lastName}`}
        parentPhone={parent.phone}
        onChildAdded={handleChildAdded}
        existingChildrenIds={parent.children.map((c) => c.id)}
      />
    </div>
  );
}
