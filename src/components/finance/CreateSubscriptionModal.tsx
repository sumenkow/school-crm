'use client';

import React, { useState } from 'react';
import { X, Calendar, Clock, DollarSign, Check } from 'lucide-react';
import { FullSubscriptionData, INITIAL_STUDENTS } from '@/lib/data/mockData';

interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newSub: FullSubscriptionData) => void;
}

export function CreateSubscriptionModal({ isOpen, onClose, onCreated }: CreateSubscriptionModalProps) {
  const [studentId, setStudentId] = useState('1');
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');
  const [price, setPrice] = useState('7600');
  const [lessonsTotal, setLessonsTotal] = useState(8);
  const [status, setStatus] = useState<FullSubscriptionData['status']>('active');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const selectedStudent = INITIAL_STUDENTS.find((s) => s.id === studentId) || INITIAL_STUDENTS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numPrice = Number(price);
    const newSub: FullSubscriptionData = {
      id: `sub_${Date.now()}`,
      studentId: selectedStudent.id,
      studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
      courseName: selectedStudent.groups[0]?.courseName || 'Английский язык',
      groupName: selectedStudent.groups[0]?.name || 'Основная группа',
      startDate,
      endDate,
      renewalDate: new Date(endDate).toLocaleDateString('ru-RU'),
      price: numPrice,
      priceFormatted: `${numPrice.toLocaleString('ru-RU')} ₽`,
      status,
      lessonsTotal: Number(lessonsTotal),
      lessonsAttended: 0,
      notes: notes || `Абонемент на ${lessonsTotal} уроков`,
    };

    onCreated(newSub);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Оформить / продлить абонемент</h2>
              <p className="text-xs text-slate-500">Период обучения и лимит занятий ученика</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700">Ученик *</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {INITIAL_STUDENTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.groups[0]?.name || 'Ученик'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">Дата начала периода *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Дата окончания периода *</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">Стоимость периода (₽) *</label>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Количество уроков в пакете</label>
              <input
                type="number"
                min="1"
                max="50"
                value={lessonsTotal}
                onChange={(e) => setLessonsTotal(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Статус абонемента</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
            >
              <option value="active">Активен (Действует)</option>
              <option value="frozen">Заморожен</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Примечание к абонементу</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Скидка 10%, второй ребенок и т.д."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Check className="h-4 w-4" />
              Оформить абонемент
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
