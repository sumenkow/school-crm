'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Users,
  Download,
  Filter,
  Check,
  Sparkles,
  MessageSquarePlus,
  Send,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_GROUPS, INITIAL_STUDENTS, TeacherComment } from '@/lib/data/mockData';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';

export default function TeacherAttendanceJournalPage() {
  const toast = useToast();
  const { userName } = useRole();
  const [selectedGroupId, setSelectedGroupId] = useState('1');

  // Teacher comment modal state
  const [commentModalStudent, setCommentModalStudent] = useState<{ id: string; name: string } | null>(null);
  const [commentCategory, setCommentCategory] = useState<'progress' | 'homework' | 'behavior' | 'general'>('progress');
  const [commentTopic, setCommentTopic] = useState('');
  const [commentContent, setCommentContent] = useState('');

  const group = INITIAL_GROUPS.find((g) => g.id === selectedGroupId) || INITIAL_GROUPS[0];

  // Dates of lessons for this group in September
  const [lessonDates, setLessonDates] = useState([
    { date: '01.09', day: 'Пн', isCompleted: true },
    { date: '04.09', day: 'Чт', isCompleted: true },
    { date: '08.09', day: 'Пн', isCompleted: false },
    { date: '11.09', day: 'Чт', isCompleted: false },
    { date: '15.09', day: 'Пн', isCompleted: false },
    { date: '18.09', day: 'Чт', isCompleted: false },
    { date: '22.09', day: 'Пн', isCompleted: false },
    { date: '25.09', day: 'Чт', isCompleted: false },
  ]);

  const [activeLessonIdx, setActiveLessonIdx] = useState(2); // Current lesson: 08.09

  // Attendance matrix state
  const [matrix, setMatrix] = useState([
    {
      studentId: '1',
      studentName: 'Иван Смирнов',
      records: ['present', 'present', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'],
      rate: '100%',
      consecutiveAbsences: 0,
    },
    {
      studentId: '4',
      studentName: 'Сергей Попов',
      records: ['present', 'rescheduled', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'],
      rate: '100%',
      consecutiveAbsences: 0,
    },
    {
      studentId: 's5',
      studentName: 'Алина Белова',
      records: ['present', 'present', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'],
      rate: '100%',
      consecutiveAbsences: 0,
    },
    {
      studentId: 's6',
      studentName: 'Максим Захаров',
      records: ['absent', 'absent', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'],
      rate: '0%',
      consecutiveAbsences: 2,
    },
    {
      studentId: 's7',
      studentName: 'Полина Григорьева',
      records: ['present', 'present', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'],
      rate: '100%',
      consecutiveAbsences: 0,
    },
    {
      studentId: 's8',
      studentName: 'Егор Романов',
      records: ['present', 'absent', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'],
      rate: '50%',
      consecutiveAbsences: 1,
    },
    {
      studentId: 's9',
      studentName: 'София Федорова',
      records: ['present', 'present', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending'],
      rate: '100%',
      consecutiveAbsences: 0,
    },
  ]);

  // Fast action: Mark all present for active lesson in 1 click
  const handleMarkAllPresent = () => {
    setMatrix((prev) =>
      prev.map((row) => {
        const newRecords = [...row.records];
        newRecords[activeLessonIdx] = 'present';
        return {
          ...row,
          records: newRecords,
          consecutiveAbsences: 0,
        };
      })
    );

    // Mark lesson date as completed
    setLessonDates((prev) =>
      prev.map((ld, i) => (i === activeLessonIdx ? { ...ld, isCompleted: true } : ld))
    );

    toast.success(`Все ученики (${matrix.length} чел.) отмечены присутствующими на занятии ${lessonDates[activeLessonIdx].date}!`);
  };

  // Toggle single cell status on click
  const handleToggleCell = (rowIndex: number, dateIndex: number) => {
    setMatrix((prev) => {
      const next = [...prev];
      const row = { ...next[rowIndex] };
      const records = [...row.records];
      const current = records[dateIndex];

      let newStatus = 'present';
      if (current === 'present') newStatus = 'absent';
      else if (current === 'absent') newStatus = 'rescheduled';
      else if (current === 'rescheduled') newStatus = 'pending';
      else newStatus = 'present';

      records[dateIndex] = newStatus;
      row.records = records;

      if (newStatus === 'present') row.consecutiveAbsences = 0;
      else if (newStatus === 'absent') row.consecutiveAbsences += 1;

      next[rowIndex] = row;
      return next;
    });
  };

  const handleSaveComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentModalStudent || !commentContent.trim()) return;

    const now = new Date();
    const dateFormatted = `${now.toLocaleDateString('ru-RU')}, ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;

    const newComment: TeacherComment = {
      id: `tc_${Date.now()}`,
      studentId: commentModalStudent.id,
      author: userName || 'Мария Иванова (Преподаватель)',
      date: dateFormatted,
      groupName: group.name,
      lessonTopic: commentTopic.trim() || `Урок ${lessonDates[activeLessonIdx].date}`,
      category: commentCategory,
      content: commentContent.trim(),
    };

    // Find student in INITIAL_STUDENTS and append
    const idx = INITIAL_STUDENTS.findIndex((s) => s.id === commentModalStudent.id);
    if (idx !== -1) {
      INITIAL_STUDENTS[idx].teacherComments = [
        newComment,
        ...(INITIAL_STUDENTS[idx].teacherComments || []),
      ];
    }

    toast.success(`Комментарий сохранен в карточку ученика «${commentModalStudent.name}»!`);
    setCommentModalStudent(null);
    setCommentContent('');
    setCommentTopic('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/teacher" className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Назад в кабинет преподавателя
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Сводный табель посещаемости</span>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Журнал посещаемости группы
          </h1>
          <p className="text-sm text-slate-500">
            Электронная ведомость посещений занятий на Сентябрь 2026
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Group selector */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs text-xs">
            <span className="text-slate-500 font-medium">Группа:</span>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="font-bold text-slate-900 focus:outline-none bg-transparent"
            >
              {INITIAL_GROUPS.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* QUICK WIN BUTTON: Mark All Present in 1 click */}
          <button
            onClick={handleMarkAllPresent}
            className="md-btn md-btn-filled inline-flex items-center gap-2 text-xs font-bold"
            style={{
              backgroundColor: '#059669',
              color: '#FFFFFF',
              height: '38px',
              padding: '0 16px',
            }}
          >
            <Check size={16} />
            Отметить всех присутствующими ({lessonDates[activeLessonIdx].date})
          </button>
        </div>
      </div>

      {/* Alert if student has consecutive absences */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900">
          <p className="font-bold">Анализ посещаемости: выявлен риск оттока</p>
          <p className="mt-0.5 text-amber-800">
            Ученик <strong>Максим Захаров</strong> пропустил 2 занятия подряд. При следующем пропуске система автоматически уведомит администратора для звонка родителю.
          </p>
        </div>
      </div>

      {/* Attendance Matrix Table (Табель) */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/90 font-semibold text-slate-600">
              <tr>
                <th className="py-3.5 pl-4 pr-3 sticky left-0 bg-slate-50/95 z-10 min-w-[200px]">Ученик</th>
                {lessonDates.map((ld, i) => {
                  const isCurrent = i === activeLessonIdx;
                  return (
                    <th
                      key={i}
                      onClick={() => setActiveLessonIdx(i)}
                      className={`px-2 py-3 text-center min-w-[64px] cursor-pointer transition-colors ${
                        isCurrent ? 'bg-blue-100/70 border-b-2 border-blue-600' : 'hover:bg-slate-100'
                      }`}
                      title="Нажмите, чтобы сделать урок активным для отметки"
                    >
                      <div className={`font-bold ${isCurrent ? 'text-blue-700' : 'text-slate-800'}`}>{ld.date}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{ld.day}</div>
                    </th>
                  );
                })}
                <th className="px-4 py-3.5 text-center font-bold text-slate-900 min-w-[90px]">
                  Посещаемость
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {matrix.map((row, rIdx) => (
                <tr key={row.studentId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 pl-4 pr-3 font-semibold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100">
                    <div className="flex items-center justify-between pr-2 gap-2">
                      <Link href={`/students/${row.studentId}`} className="hover:text-blue-600 truncate">
                        {row.studentName}
                      </Link>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {row.consecutiveAbsences >= 2 && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold text-rose-700">
                            {row.consecutiveAbsences} проп.
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCommentModalStudent({ id: row.studentId, name: row.studentName });
                            setCommentTopic(`Урок ${lessonDates[activeLessonIdx].date} • ${group.name}`);
                          }}
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                          title="Оставить комментарий преподавателя в карточку ученика"
                        >
                          <MessageSquarePlus size={11} />
                          Отзыв
                        </button>
                      </div>
                    </div>
                  </td>

                  {row.records.map((rec, dIdx) => (
                    <td
                      key={dIdx}
                      onClick={() => handleToggleCell(rIdx, dIdx)}
                      className="px-2 py-2 text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                      style={{ minHeight: '44px' }}
                      title="Кликните для смены статуса (Был / Пропуск / Перенос)"
                    >
                      <div className="flex items-center justify-center h-8 w-8 mx-auto">
                        {rec === 'present' && (
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs shadow-xs">
                            ✓
                          </span>
                        )}
                        {rec === 'absent' && (
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-800 font-bold text-xs shadow-xs">
                            ✗
                          </span>
                        )}
                        {rec === 'rescheduled' && (
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-bold text-xs shadow-xs">
                            П
                          </span>
                        )}
                        {rec === 'pending' && (
                          <span className="text-slate-300 font-medium hover:text-slate-400 text-base">—</span>
                        )}
                      </div>
                    </td>
                  ))}

                  <td className="px-4 py-3 text-center font-bold">
                    <span className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs',
                      parseInt(row.rate) >= 80 ? 'text-emerald-700 bg-emerald-50' : parseInt(row.rate) >= 50 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50'
                    )}>
                      {row.rate}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="border-t border-slate-100 bg-slate-50 p-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-6">
            <span className="font-semibold text-slate-700">Обозначения:</span>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-100 font-bold text-emerald-800 text-[11px]">✓</span>
              <span>Присутствовал</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-rose-100 font-bold text-rose-800 text-[11px]">✗</span>
              <span>Отсутствовал</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-amber-100 font-bold text-amber-800 text-[11px]">П</span>
              <span>Перенос / Справка</span>
            </div>
          </div>
          <span className="text-[11px] text-slate-400">💡 Кликните по ячейке для быстрой смены статуса</span>
        </div>
      </div>

      {/* MODAL: КОММЕНТАРИЙ ПРЕПОДАВАТЕЛЯ В КАРТОЧКУ УЧЕНИКА */}
      {commentModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <MessageSquarePlus size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Комментарий преподавателя в карточку ученика
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ученик: <strong>{commentModalStudent.name}</strong> • Группа: {group.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCommentModalStudent(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveComment} className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 font-medium block mb-1">Категория отзыва:</label>
                  <select
                    value={commentCategory}
                    onChange={(e) => setCommentCategory(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400"
                  >
                    <option value="progress">🌟 Успеваемость и прогресс</option>
                    <option value="homework">📚 Домашнее задание</option>
                    <option value="behavior">⚡ Поведение и дисциплина</option>
                    <option value="general">💬 Общий комментарий</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 font-medium block mb-1">Урок / тема:</label>
                  <input
                    type="text"
                    value={commentTopic}
                    onChange={(e) => setCommentTopic(e.target.value)}
                    placeholder="Тема занятия..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1 text-xs">
                  Текст комментария преподавателя:
                </label>
                <textarea
                  rows={4}
                  required
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Как ученик проявил себя на уроке? Замечания по домашней работе, успехи или рекомендации..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">
                  Сохранится в таймлайн ученика
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCommentModalStudent(null)}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 transition-colors"
                  >
                    <Send size={13} />
                    Сохранить в карточку
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
