'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Users, UserPlus, Phone, Send, Mail, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStoredParents, saveParentToStorage, ParentRecord } from '@/lib/data/parentStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';

interface LinkParentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  onParentLinked: (linkedParent: any) => void;
}

export function LinkParentModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  onParentLinked,
}: LinkParentModalProps) {
  const [tab, setTab] = useState<'existing' | 'new'>('existing');

  // Existing parents lookup
  const [allParents, setAllParents] = useState<ParentRecord[]>([]);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [existingRelationship, setExistingRelationship] = useState('Мама');
  const [existingIsPrimary, setExistingIsPrimary] = useState(false);

  // New parent form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [relationshipType, setRelationshipType] = useState('Мама');
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Gather unique parents from parentStorage and studentStorage
      const stored = getStoredParents();
      const parentMap = new Map<string, ParentRecord>();

      for (const p of stored) {
        if (p.id) parentMap.set(p.id, p);
      }

      const students = getStoredStudents();
      for (const st of students) {
        if (st.parents) {
          for (const pr of st.parents) {
            if (pr.id && !parentMap.has(pr.id)) {
              parentMap.set(pr.id, {
                id: pr.id,
                name: (pr as any).name || `${pr.firstName || ''} ${pr.lastName || ''}`.trim() || 'Родитель',
                phone: pr.phone || '',
                telegram: pr.telegram,
                whatsapp: pr.whatsapp,
                email: pr.email,
                preferredChannel: (pr as any).preferredChannel || 'Telegram',
                relationshipType: pr.relationshipType || 'Родитель',
                children: [],
                totalPaid: '0 €',
                balanceStatus: 'paid',
              });
            }
          }
        }
      }

      const list = Array.from(parentMap.values());
      setAllParents(list);
      if (list.length > 0 && !selectedParentId) {
        setSelectedParentId(list[0].id);
      }
    }
  }, [isOpen, selectedParentId]);

  if (!isOpen) return null;

  const handleSubmitExisting = (e: React.FormEvent) => {
    e.preventDefault();
    const parent = allParents.find((p) => p.id === selectedParentId);
    if (!parent) return;

    const parts = (parent.name || '').trim().split(' ');
    const fName = parts[0] || 'Родитель';
    const lName = parts.slice(1).join(' ') || '';

    const linkedObj = {
      id: parent.id,
      name: parent.name,
      firstName: fName,
      lastName: lName,
      phone: parent.phone || '',
      email: parent.email,
      telegram: parent.telegram,
      whatsapp: parent.whatsapp,
      preferredChannel: (parent.preferredChannel as any) || 'telegram',
      relationshipType: existingRelationship,
      isPrimary: existingIsPrimary,
    };

    onParentLinked(linkedObj);
  };

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;

    const parentId = `par_${Date.now()}`;
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    const newRecord: ParentRecord = {
      id: parentId,
      name: fullName,
      phone: phone.trim(),
      email: email.trim() || undefined,
      telegram: telegram.trim() || undefined,
      preferredChannel: 'Telegram',
      relationshipType,
      children: [
        {
          id: studentId,
          name: studentName,
          group: '',
        },
      ],
      totalPaid: '0 €',
      balanceStatus: 'paid',
      createdAt: new Date().toISOString(),
    };

    saveParentToStorage(newRecord);

    const linkedObj = {
      id: parentId,
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      telegram: telegram.trim() || undefined,
      preferredChannel: 'telegram',
      relationshipType,
      isPrimary,
    };

    onParentLinked(linkedObj);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-6 overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Привязать родителя</h2>
              <p className="text-xs text-slate-500">Ученик: {studentName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="p-6 pb-0">
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => setTab('existing')}
              className={cn(
                'flex-1 py-2 font-semibold rounded-lg transition-all text-center cursor-pointer',
                tab === 'existing'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              Выбрать из базы ({allParents.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('new')}
              className={cn(
                'flex-1 py-2 font-semibold rounded-lg transition-all text-center cursor-pointer',
                tab === 'new'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              + Создать нового
            </button>
          </div>
        </div>

        {/* Tab 1: Existing Parent */}
        {tab === 'existing' ? (
          <form onSubmit={handleSubmitExisting} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">Родитель из базы</label>
              {allParents.length === 0 ? (
                <p className="text-xs text-slate-400 mt-1">В базе пока нет других родителей. Создайте нового.</p>
              ) : (
                <select
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:border-blue-500 focus:outline-none"
                >
                  {allParents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.phone ? `(${p.phone})` : ''} — {p.relationshipType || 'Родитель'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Степень родства</label>
              <select
                value={existingRelationship}
                onChange={(e) => setExistingRelationship(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:border-blue-500 focus:outline-none"
              >
                <option value="Мама">Мама</option>
                <option value="Папа">Папа</option>
                <option value="Бабушка">Бабушка</option>
                <option value="Дедушка">Дедушка</option>
                <option value="Опекун">Опекун</option>
                <option value="Другое">Другое</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={existingIsPrimary}
                onChange={(e) => setExistingIsPrimary(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-700">Основное контактное лицо</span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={!selectedParentId}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Привязать к профилю
              </button>
            </div>
          </form>
        ) : (
          /* Tab 2: Create New Parent */
          <form onSubmit={handleSubmitNew} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Имя *</label>
                <input
                  type="text"
                  required
                  placeholder="Имя"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Фамилия</label>
                <input
                  type="text"
                  placeholder="Фамилия"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Телефон</label>
              <input
                type="tel"
                placeholder="+7 (999) 000-00-00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Telegram</label>
                <input
                  type="text"
                  placeholder="@username"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Степень родства</label>
              <select
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:border-blue-500 focus:outline-none"
              >
                <option value="Мама">Мама</option>
                <option value="Папа">Папа</option>
                <option value="Бабушка">Бабушка</option>
                <option value="Дедушка">Дедушка</option>
                <option value="Опекун">Опекун</option>
                <option value="Другое">Другое</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-700">Основное контактное лицо</span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={!firstName.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Создать и привязать
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
