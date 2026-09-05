'use client';

import React, { useState } from 'react';
import { X, User, Users, AlertTriangle, Check, Phone, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NewStudentData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  status: string;
  parent: string;
  parentPhone: string;
  group: string;
  course: string;
  teacher: string;
  attendanceRate: string;
  paymentStatus: string;
  subscriptionEnd: string;
}

interface CreateStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newStudent: NewStudentData) => void;
}

export function CreateStudentModal({ isOpen, onClose, onCreated }: CreateStudentModalProps) {
  // Student fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');
  const [group, setGroup] = useState('English B1 Teens');

  // Parent fields
  const [parentMode, setParentMode] = useState<'new' | 'existing'>('new');
  const [parentFirstName, setParentFirstName] = useState('');
  const [parentLastName, setParentLastName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentTelegram, setParentTelegram] = useState('');
  const [relationshipType, setRelationshipType] = useState('Мама');
  const [preferredChannel, setPreferredChannel] = useState('telegram');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      alert('Пожалуйста, укажите имя и фамилию ученика');
      return;
    }

    const createdStudent = {
      id: `std_${Date.now()}`,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      status,
      parent: parentFirstName ? `${parentFirstName} ${parentLastName} (${relationshipType})` : 'Контакт не указан',
      parentPhone: parentPhone || '—',
      group,
      course: group.includes('English') ? 'Английский язык' : 'Робототехника',
      teacher: 'Мария Иванова',
      attendanceRate: '100%',
      paymentStatus: 'paid',
      subscriptionEnd: '30.09.2026',
    };

    onCreated(createdStudent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Новый ученик</h2>
              <p className="text-xs text-slate-500">Зачисление ученика и привязка родителя без дублирования</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* SECTION 1: ДАННЫЕ УЧЕНИКА */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Данные ученика
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Имя *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Иван"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Фамилия *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Смирнов"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Дата рождения</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Статус</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                >
                  <option value="active">Активен (зачислен)</option>
                  <option value="trial">Пробный ученик</option>
                  <option value="paused">На паузе</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Телефон ученика (если есть)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Telegram ученика</label>
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="@username"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ГРУППА */}
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Зачисление в группу
            </h3>
            <div>
              <label className="text-xs font-medium text-slate-700">Выберите группу</label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              >
                <option value="English B1 Teens">English B1 Teens (Пн/Чт 18:45) • Свободно 1 место</option>
                <option value="Robotics Junior">Robotics Junior (Ср/Сб 15:00) • Свободно 4 места</option>
                <option value="Kids Math Safari">Kids Math Safari (Чт 16:00) • Свободно 1 место</option>
              </select>
            </div>
          </div>

          {/* SECTION 3: РОДИТЕЛЬ / СЕМЬЯ */}
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                3. Родитель / Контактное лицо
              </h3>
              <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setParentMode('new')}
                  className={cn('rounded-md px-2.5 py-1 font-medium transition-all', parentMode === 'new' ? 'bg-white shadow-xs font-semibold text-slate-900' : 'text-slate-500')}
                >
                  Новый родитель
                </button>
                <button
                  type="button"
                  onClick={() => setParentMode('existing')}
                  className={cn('rounded-md px-2.5 py-1 font-medium transition-all', parentMode === 'existing' ? 'bg-white shadow-xs font-semibold text-slate-900' : 'text-slate-500')}
                >
                  Выбрать из существующих
                </button>
              </div>
            </div>

            {parentMode === 'new' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-slate-50/60 p-3.5 border border-slate-200">
                <div>
                  <label className="text-xs font-medium text-slate-700">Имя родителя</label>
                  <input
                    type="text"
                    value={parentFirstName}
                    onChange={(e) => setParentFirstName(e.target.value)}
                    placeholder="Ольга"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Фамилия родителя</label>
                  <input
                    type="text"
                    value={parentLastName}
                    onChange={(e) => setParentLastName(e.target.value)}
                    placeholder="Смирнова"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Кем приходится</label>
                  <select
                    value={relationshipType}
                    onChange={(e) => setRelationshipType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Мама">Мама</option>
                    <option value="Отец">Отец</option>
                    <option value="Бабушка/Дедушка">Бабушка / Дедушка</option>
                    <option value="Опекун">Опекун</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Телефон родителя *</label>
                  <input
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="+7 (999) 123-45-67"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Telegram родителя</label>
                  <input
                    type="text"
                    value={parentTelegram}
                    onChange={(e) => setParentTelegram(e.target.value)}
                    placeholder="@parent_tg"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Основной канал связи</label>
                  <select
                    value={preferredChannel}
                    onChange={(e) => setPreferredChannel(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="telegram">Telegram</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="phone">Телефон</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50/60 p-3.5 border border-slate-200">
                <label className="text-xs font-medium text-slate-700">Выберите семью / родителя из базы</label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none"
                  onChange={(e) => {
                    const selected = e.target.value;
                    if (selected === 'p1') {
                      setParentFirstName('Ольга');
                      setParentLastName('Смирнова');
                      setParentPhone('+7 (999) 123-45-67');
                    } else if (selected === 'p3') {
                      setParentFirstName('Дмитрий');
                      setParentLastName('Кузнецов');
                      setParentPhone('+7 (999) 234-56-78');
                    }
                  }}
                >
                  <option value="">-- Выберите родителя --</option>
                  <option value="p1">Ольга Смирнова (+7 999 123-45-67) — Семья Смирновых</option>
                  <option value="p3">Дмитрий Кузнецов (+7 999 234-56-78) — Дети: Мария, Артём</option>
                  <option value="p4">Елена Васильева (+7 999 345-67-89) — Дочь: Анна</option>
                </select>
                <p className="mt-2 text-[11px] text-slate-500">
                  💡 Привязка к существующему родителю автоматически добавит ученика в единый профиль семьи.
                </p>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Check className="h-4 w-4" />
              Создать ученика
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
