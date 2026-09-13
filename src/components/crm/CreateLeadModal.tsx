'use client';

import React, { useState } from 'react';
import { X, UserCheck, Calendar, Phone, Check, GraduationCap, School, Info } from 'lucide-react';
import { FullLeadData } from '@/lib/data/mockData';
import { cn } from '@/lib/utils';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newLead: FullLeadData) => void;
}

export function CreateLeadModal({ isOpen, onClose, onCreated }: CreateLeadModalProps) {
  // Client type ticker: 'school_student' (minor, through parents) vs 'adult_student' (18+, self-sufficient)
  const [clientType, setClientType] = useState<'school_student' | 'adult_student'>('school_student');

  // Shared contact & profile state
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [telegram, setTelegram] = useState('');

  // School student fields
  const [studentName, setStudentName] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [parentNotes, setParentNotes] = useState('');

  // Adult student fields
  const [adultOccupation, setAdultOccupation] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Lead processing fields
  const [directionOrCourse, setDirectionOrCourse] = useState('Английский язык');
  const [source, setSource] = useState('Сайт школы');
  const [assignedTo, setAssignedTo] = useState('Елена Менеджер');
  const [nextAction, setNextAction] = useState('Первичный звонок / квалификация');
  const [nextActionDate, setNextActionDate] = useState('Сегодня, 14:00');
  const [studentNotes, setStudentNotes] = useState('');
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) {
      alert('Укажите ФИО и контактный телефон');
      return;
    }

    const isAdult = clientType === 'adult_student';

    const createdLead: FullLeadData = {
      id: `lead_${Date.now()}`,
      clientType,
      // For adult student: primary name is the student's name
      // For school pupil: primary name is the parent's name
      name: name.trim(),
      contact: contact.trim(),
      telegram: telegram ? (telegram.startsWith('@') ? telegram : `@${telegram}`) : undefined,
      studentName: isAdult ? name.trim() : (studentName.trim() || 'Не указан'),
      studentAge: isAdult ? adultOccupation.trim() || undefined : studentAge.trim() || undefined,
      directionOrCourse,
      source,
      assignedTo,
      status: 'new',
      nextAction,
      nextActionDate,
      comment,
      parentNotes: isAdult
        ? (emergencyContact ? `Экстренный контакт: ${emergencyContact}` : undefined)
        : (parentNotes || undefined),
      studentNotes: studentNotes || undefined,
      createdAt: new Date().toISOString(),
      interactions: [
        {
          id: `int_${Date.now()}`,
          occurredAt: 'Только что',
          channel: 'phone',
          type: 'initial_contact',
          author: 'Елена Менеджер',
          content: comment || (isAdult
            ? `Создана новая заявка: совершеннолетний студент (18+). Самостоятельное взаимодействие.`
            : `Создана новая заявка: школьник (вопросы решаются через родителей).`),
        },
      ],
    };

    onCreated(createdLead);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Новый лид / Обращение</h2>
              <p className="text-xs text-slate-500">Регистрация потенциального клиента в CRM-воронке</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Ticker / Segmented control: School student vs Adult student */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Тип клиента / Категория учащегося:
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setClientType('school_student')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all',
                  clientType === 'school_student'
                    ? 'bg-white text-blue-700 shadow-xs border border-blue-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                )}
              >
                <School className="h-4 w-4 text-blue-600" />
                <span>🎒 Школьник</span>
                <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">(до 18 лет)</span>
              </button>

              <button
                type="button"
                onClick={() => setClientType('adult_student')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all',
                  clientType === 'adult_student'
                    ? 'bg-white text-purple-700 shadow-xs border border-purple-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                )}
              >
                <GraduationCap className="h-4 w-4 text-purple-600" />
                <span>🎓 Студент / Взрослый</span>
                <span className="text-[10px] text-purple-500 font-medium hidden sm:inline">(18+)</span>
              </button>
            </div>

            {/* Dynamic context hint banner */}
            <div
              className={cn(
                'flex items-start gap-2 p-2.5 rounded-lg text-xs border transition-colors',
                clientType === 'school_student'
                  ? 'bg-blue-50/60 border-blue-200 text-blue-900'
                  : 'bg-purple-50/60 border-purple-200 text-purple-900'
              )}
            >
              <Info className="h-4 w-4 shrink-0 mt-0.5 opacity-80" />
              <p className="leading-snug">
                {clientType === 'school_student' ? (
                  <>
                    <span className="font-semibold">Ученик школы:</span> Все финансовые, договорные и организационные вопросы решаются через <strong>родителей</strong>. Основным контактным лицом является родитель (заказчик).
                  </>
                ) : (
                  <>
                    <span className="font-semibold">Совершеннолетний студент (18+):</span> Взаимодействует и оплачивает обучение <strong>самостоятельно</strong>. Договор заключается напрямую с учащимся.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* DYNAMIC FIELDS: School Student Mode */}
          {clientType === 'school_student' ? (
            <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/20 p-4">
              <div className="flex items-center gap-2 border-b border-blue-100 pb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">1</span>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Контакты родителя (заказчика)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">ФИО родителя *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Светлана Морозова"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Телефон родителя *</label>
                  <input
                    type="tel"
                    required
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="+7 (999) 000-00-00"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Telegram / Мессенджер родителя</label>
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="@sveta_morozova"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none bg-white"
                />
              </div>

              <div className="flex items-center gap-2 border-b border-blue-100 pb-2 pt-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">2</span>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Данные школьника (учащегося)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">Имя ребенка *</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Михаил"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Возраст / класс</label>
                  <input
                    type="text"
                    value={studentAge}
                    onChange={(e) => setStudentAge(e.target.value)}
                    placeholder="9 лет (3 класс)"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Заметки о родителе (предпочтения по общению)</label>
                <textarea
                  rows={2}
                  value={parentNotes}
                  onChange={(e) => setParentNotes(e.target.value)}
                  placeholder="Например: писать в Telegram, звонить строго после 18:00..."
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                />
              </div>
            </div>
          ) : (
            /* DYNAMIC FIELDS: Adult Student Mode (18+) */
            <div className="space-y-4 rounded-xl border border-purple-100 bg-purple-50/20 p-4">
              <div className="flex items-center gap-2 border-b border-purple-100 pb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-700">1</span>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Данные студента (совершеннолетнего)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">ФИО студента (учащегося) *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Алексей Романов"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Телефон студента (прямой) *</label>
                  <input
                    type="tel"
                    required
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="+7 (999) 555-44-33"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">Telegram / Мессенджер</label>
                  <input
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="@alex_romanov"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Возраст / Род занятий (вуз, работа)</label>
                  <input
                    type="text"
                    value={adultOccupation}
                    onChange={(e) => setAdultOccupation(e.target.value)}
                    placeholder="21 год, студент МГТУ / разработчик"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">
                  Экстренный контакт / Доверенное лицо <span className="text-slate-400 font-normal">(опционально)</span>
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Родственник/родитель: Ольга Васильевна, +7 (903) 123-45-67"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none bg-white"
                />
              </div>
            </div>
          )}

          {/* COURSE & SOURCE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">Направление / Курс</label>
              <select
                value={directionOrCourse}
                onChange={(e) => setDirectionOrCourse(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none bg-white"
              >
                <option value="Английский язык">Английский язык</option>
                <option value="Робототехника">Робототехника</option>
                <option value="Олимпиадная математика">Олимпиадная математика</option>
                <option value="Подготовка к экзаменам">Подготовка к экзаменам</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Источник обращения</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none bg-white"
              >
                <option value="Сайт школы">Сайт школы</option>
                <option value="Instagram">Instagram</option>
                <option value="Рекомендация друзей">Рекомендация друзей</option>
                <option value="Листовка у школы">Листовка у школы</option>
                <option value="Яндекс.Карты">Яндекс.Карты</option>
              </select>
            </div>
          </div>

          {/* NEXT ACTION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">Следующее действие</label>
              <input
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="Позвонить..."
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Срок выполнения</label>
              <input
                type="text"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                placeholder="Сегодня, 16:00"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none bg-white"
              />
            </div>
          </div>

          {/* NOTES & COMMENTS */}
          <div>
            <label className="text-xs font-medium text-slate-700">
              {clientType === 'school_student' ? 'Заметки и особенности ученика' : 'Цель обучения и уровень подготовки'}
            </label>
            <textarea
              rows={2}
              value={studentNotes}
              onChange={(e) => setStudentNotes(e.target.value)}
              placeholder={
                clientType === 'school_student'
                  ? 'Характер ребенка, уровень подготовки, интересы, особенности восприятия...'
                  : 'Текущий уровень (A2/B1), цель обучения (работа/IELTS), предпочтения по расписанию...'
              }
              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Общий комментарий к заявке</label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Пожелания по времени, скидкам, источнику..."
              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors',
                clientType === 'adult_student'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              <Check className="h-4 w-4" />
              Добавить {clientType === 'adult_student' ? 'студента' : 'лида'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
