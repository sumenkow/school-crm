'use client';

import React, { useState } from 'react';
import { X, CheckSquare, Calendar, Clock, User, Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FullTaskData, INITIAL_STUDENTS, INITIAL_LEADS } from '@/lib/data/mockData';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { createUnifiedTask } from '@/lib/data/taskManager';
import { useRole } from '@/context/RoleContext';

export interface StudentTaskScope {
  id: string;
  name: string;
  parents?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    relationshipType?: string;
  }>;
}

export interface ParentTaskScope {
  id: string;
  name: string;
  children?: Array<{
    id: string;
    name: string;
  }>;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newTask: FullTaskData) => void;
  defaultStudentId?: string;
  defaultParentId?: string;
  defaultLeadId?: string;
  studentScope?: StudentTaskScope;
  parentScope?: ParentTaskScope;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onCreated,
  defaultStudentId,
  defaultParentId,
  defaultLeadId,
  studentScope,
  parentScope,
}: CreateTaskModalProps) {
  const { role, userName } = useRole();
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState<FullTaskData['taskType']>('Retention');
  const [assignedTo, setAssignedTo] = useState('Елена Менеджер');
  const [priority, setPriority] = useState<FullTaskData['priority']>('medium');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueTime, setDueTime] = useState('15:00');
  const [scopedTarget, setScopedTarget] = useState<string>('student');
  const [scopedChildTarget, setScopedChildTarget] = useState<string>('family');
  const [relatedEntity, setRelatedEntity] = useState<'student' | 'lead' | 'parent' | 'none'>(
    defaultStudentId ? 'student' : defaultParentId ? 'parent' : defaultLeadId ? 'lead' : 'student'
  );
  const [selectedEntityId, setSelectedEntityId] = useState(defaultStudentId || defaultParentId || defaultLeadId || '1');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Укажите название задачи');
      return;
    }

    setIsSubmitting(true);
    const allStudents = typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS;

    let studentId: string | undefined;
    let studentName: string | undefined;
    let parentId: string | undefined;
    let parentName: string | undefined;
    let leadId: string | undefined;
    let leadName: string | undefined;

    if (studentScope) {
      studentId = studentScope.id;
      studentName = studentScope.name;
      if (scopedTarget !== 'student') {
        const parent = studentScope.parents?.find((p) => p.id === scopedTarget);
        if (parent) {
          parentId = parent.id;
          parentName = `${parent.firstName} ${parent.lastName}`.trim();
        }
      }
    } else if (parentScope) {
      parentId = parentScope.id;
      parentName = parentScope.name;
      if (scopedChildTarget !== 'family') {
        const child = parentScope.children?.find((c) => c.id === scopedChildTarget);
        if (child) {
          studentId = child.id;
          studentName = child.name;
        }
      }
    } else if (relatedEntity === 'student') {
      const st = allStudents.find((s) => s.id === selectedEntityId) || INITIAL_STUDENTS.find((s) => s.id === selectedEntityId);
      studentId = selectedEntityId;
      studentName = st ? `${st.firstName} ${st.lastName}` : undefined;
      if (st?.parents && st.parents.length > 0) {
        parentId = st.parents[0].id;
        parentName = `${st.parents[0].firstName} ${st.parents[0].lastName}`.trim();
      }
    } else if (relatedEntity === 'parent') {
      parentId = selectedEntityId;
    } else if (relatedEntity === 'lead') {
      const ld = INITIAL_LEADS.find((l) => l.id === selectedEntityId);
      leadId = selectedEntityId;
      leadName = ld ? ld.name : undefined;
    }

    try {
      const newTask = await createUnifiedTask({
        title,
        taskType,
        priority,
        dueDate,
        dueDateFormatted: `${new Date(dueDate).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}, ${dueTime}`,
        description,
        assignedTo,
        studentId,
        studentName,
        parentId,
        parentName,
        leadId,
        leadName,
        createdByRole: role,
        createdByName: userName || 'Руководитель',
      });

      onCreated(newTask);
      onClose();
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Новая задача</h2>
              <p className="text-xs text-slate-500">Поручение команде с привязкой к клиенту</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700">Что нужно сделать? *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Позвонить маме после пробного урока..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">Тип задачи</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as FullTaskData['taskType'])}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              >
                <option value="CRM Сделка">CRM Сделка</option>
                <option value="Retention">Забота / Retention</option>
                <option value="Финансы">Финансы / Оплата</option>
                <option value="Продление">Продление абонемента</option>
                <option value="Оргвопрос">Оргвопрос</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Приоритет</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as FullTaskData['priority'])}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              >
                <option value="high">Высокий (Срочно)</option>
                <option value="medium">Средний</option>
                <option value="low">Низкий</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700">Срок (Дата)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Время</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Ответственный сотрудник</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
            >
              <option value="Елена Менеджер">Елена Менеджер</option>
              <option value="Александр Руководитель">Александр Руководитель</option>
              <option value="Мария Иванова">Мария Иванова (Преподаватель)</option>
            </select>
          </div>

          {/* Link to Entity */}
          {studentScope ? (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Связать задачу с клиентом:
                </label>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  Только этот ученик или семья
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setScopedTarget('student')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors',
                    scopedTarget === 'student'
                      ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-xs ring-1 ring-blue-300'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <User className="h-3.5 w-3.5" />
                  Ученик: {studentScope.name}
                </button>
                {(studentScope.parents || []).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setScopedTarget(p.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors',
                      scopedTarget === p.id
                        ? 'bg-purple-50 border-purple-400 text-purple-800 shadow-xs ring-1 ring-purple-300'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <Users className="h-3.5 w-3.5" />
                    {p.relationshipType || 'Родитель'}: {p.firstName} {p.lastName}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                Задача будет создана в карточке {studentScope.name}
                {scopedTarget !== 'student' ? ' с привязкой к родителю' : ''}. Выбор других учеников заблокирован.
              </p>
            </div>
          ) : parentScope ? (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Связать задачу с семьей:
                </label>
                <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                  Семья: {parentScope.name}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setScopedChildTarget('family')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors',
                    scopedChildTarget === 'family'
                      ? 'bg-purple-50 border-purple-400 text-purple-800 shadow-xs ring-1 ring-purple-300'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <Users className="h-3.5 w-3.5" />
                  Вся семья ({parentScope.name})
                </button>
                {(parentScope.children || []).map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setScopedChildTarget(ch.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors',
                      scopedChildTarget === ch.id
                        ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-xs ring-1 ring-blue-300'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <User className="h-3.5 w-3.5" />
                    Ребенок: {ch.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="text-xs font-medium text-slate-700">Связать с клиентом:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRelatedEntity('student')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium border ${relatedEntity === 'student' ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  Ученик
                </button>
                <button
                  type="button"
                  onClick={() => setRelatedEntity('lead')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium border ${relatedEntity === 'lead' ? 'bg-purple-50 border-purple-300 text-purple-800' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  Лид CRM
                </button>
                <button
                  type="button"
                  onClick={() => setRelatedEntity('none')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium border ${relatedEntity === 'none' ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  Без привязки
                </button>
              </div>

              {relatedEntity === 'student' && (
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
                >
                  {INITIAL_STUDENTS.map((s) => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.groups[0]?.name || 'Ученик'})</option>
                  ))}
                </select>
              )}

              {relatedEntity === 'lead' && (
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none"
                >
                  {INITIAL_LEADS.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} — {l.directionOrCourse}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-700">Подробное описание</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Дополнительные детали задачи..."
              className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-xs focus:outline-none"
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
              Создать задачу
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
