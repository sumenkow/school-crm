'use client';

import React, { useState } from 'react';
import { X, UserCheck, Calendar, Phone, Check } from 'lucide-react';
import { FullLeadData } from '@/lib/data/mockData';

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newLead: FullLeadData) => void;
}

export function CreateLeadModal({ isOpen, onClose, onCreated }: CreateLeadModalProps) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [telegram, setTelegram] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [directionOrCourse, setDirectionOrCourse] = useState('Английский язык');
  const [source, setSource] = useState('Сайт школы');
  const [assignedTo, setAssignedTo] = useState('Елена Менеджер');
  const [nextAction, setNextAction] = useState('Первичный звонок / квалификация');
  const [nextActionDate, setNextActionDate] = useState('Сегодня, 14:00');
  const [comment, setComment] = useState('');
  const [parentNotes, setParentNotes] = useState('');
  const [studentNotes, setStudentNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) {
      alert('Укажите имя и телефон для связи');
      return;
    }

    const createdLead: FullLeadData = {
      id: `lead_${Date.now()}`,
      name,
      contact,
      telegram: telegram ? (telegram.startsWith('@') ? telegram : `@${telegram}`) : undefined,
      studentName: studentName || 'Не указан',
      studentAge: studentAge || undefined,
      directionOrCourse,
      source,
      assignedTo,
      status: 'new',
      nextAction,
      nextActionDate,
      comment,
      parentNotes: parentNotes || undefined,
      studentNotes: studentNotes || undefined,
      createdAt: new Date().toISOString(),
      interactions: [
        {
          id: `int_${Date.now()}`,
          occurredAt: 'Только что',
          channel: 'phone',
          type: 'initial_contact',
          author: 'Елена Менеджер',
          content: comment || 'Создана новая заявка в CRM.',
        },
      ],
    };

    onCreated(createdLead);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Новый лид / Обращение</h2>
              <p className="text-xs text-slate-500">Регистрация потенциального клиента в воронке</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">Имя контакта (родитель) *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Светлана Иванова"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Телефон *</label>
              <input
                type="tel"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="+7 (999) 000-00-00"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">Имя ребенка / ученика</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Михаил"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Возраст / класс</label>
              <input
                type="text"
                value={studentAge}
                onChange={(e) => setStudentAge(e.target.value)}
                placeholder="9 лет (3 класс)"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">Направление / Курс</label>
              <select
                value={directionOrCourse}
                onChange={(e) => setDirectionOrCourse(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              >
                <option value="Английский язык">Английский язык</option>
                <option value="Робототехника">Робототехника</option>
                <option value="Олимпиадная математика">Олимпиадная математика</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Источник обращения</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              >
                <option value="Сайт школы">Сайт школы</option>
                <option value="Instagram">Instagram</option>
                <option value="Рекомендация друзей">Рекомендация друзей</option>
                <option value="Листовка у школы">Листовка у школы</option>
                <option value="Яндекс.Карты">Яндекс.Карты</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">Следующее действие</label>
              <input
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="Позвонить..."
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Срок выполнения</label>
              <input
                type="text"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                placeholder="Сегодня, 16:00"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Заметки и особенности ученика</label>
            <textarea
              rows={2}
              value={studentNotes}
              onChange={(e) => setStudentNotes(e.target.value)}
              placeholder="Характер ребенка, уровень подготовки, интересы, особенности восприятия..."
              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Заметки о родителе / контактном лице</label>
            <textarea
              rows={2}
              value={parentNotes}
              onChange={(e) => setParentNotes(e.target.value)}
              placeholder="Особенности общения (например: писать в Telegram, звонить после 18:00, строгая мама)..."
              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Общий комментарий к заявке</label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Пожелания по времени, скидкам, источнику..."
              className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
            />
          </div>

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
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 transition-colors"
            >
              <Check className="h-4 w-4" />
              Добавить лида
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
