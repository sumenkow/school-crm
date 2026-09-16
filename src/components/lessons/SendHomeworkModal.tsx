'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Check,
  AlertCircle,
  X,
  Users,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  FileText,
  Eye,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { saveInteractionToStorage } from '@/lib/data/timelineStorage';
import { TimelineInteraction } from '@/lib/data/mockData';

interface RecipientItem {
  studentId: string;
  studentName: string;
  parentId?: string;
  parentName?: string;
  parentRelationship?: string;
  email: string;
  telegram?: string;
  preferredChannel?: string;
  selected: boolean;
}

export interface SendHomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: {
    id?: string;
    groupName: string;
    courseName?: string;
    date: string;
    startTime?: string;
    endTime?: string;
    teacherName: string;
    topic?: string;
    homework?: string;
    students?: Array<{ id: string; name: string }>;
  };
  onSentSuccess?: () => void;
}

export default function SendHomeworkModal({
  isOpen,
  onClose,
  lesson,
  onSentSuccess,
}: SendHomeworkModalProps) {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [topic, setTopic] = useState(lesson.topic || '');
  const [homework, setHomework] = useState(lesson.homework || '');
  const [deadline, setDeadline] = useState('К следующему занятию');
  const [teacherComment, setTeacherComment] = useState('');
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    message: string;
  } | null>(null);

  // Synchronize initial state whenever modal opens or lesson changes
  useEffect(() => {
    if (!isOpen) return;

    setTopic(lesson.topic || '');
    setHomework(lesson.homework || '');
    setDeadline('К следующему занятию');
    setTeacherComment('');
    setSendResult(null);
    setActiveTab('form');

    // Build recipient list by looking up students and their parents
    const allStudents = getStoredStudents();
    const lessonStudentIds = new Set((lesson.students || []).map((s) => s.id));

    // Also match by groupName if students list in lesson is empty or incomplete
    const groupStudents = allStudents.filter(
      (s) =>
        lessonStudentIds.has(s.id) ||
        s.groups.some((g) => g.name === lesson.groupName || lesson.groupName.includes(g.name))
    );

    // Fallback: if no group match, use lesson.students directly
    const targetStudents =
      groupStudents.length > 0
        ? groupStudents
        : (lesson.students || []).map((ls) => {
            const found = allStudents.find((s) => s.id === ls.id || `${s.firstName} ${s.lastName}` === ls.name);
            return (
              found || {
                id: ls.id,
                firstName: ls.name.split(' ')[0] || ls.name,
                lastName: ls.name.split(' ').slice(1).join(' ') || '',
                studentType: 'school_student' as const,
                parents: [],
                groups: [],
                attendanceStats: { totalLessons: 0, presentCount: 0, absentCount: 0, rescheduledCount: 0, attendanceRate: '100%', history: [] },
                finance: { activeSubscription: null as any, deposit: { balance: 0, balanceFormatted: '0 ₽', currency: 'RUB', pricePerLesson: 1050, pricePerLessonFormatted: '1 050 ₽' }, payments: [] },
                interactions: [],
                tasks: [],
              }
            );
          });

    const list: RecipientItem[] = [];

    targetStudents.forEach((st) => {
      const studentFullName = `${st.firstName} ${st.lastName}`.trim();
      const parents = st.parents || [];

      if (parents.length > 0) {
        parents.forEach((p) => {
          const hasContact = Boolean((p.email && p.email.includes('@')) || (p.telegram && p.telegram.trim()));
          list.push({
            studentId: st.id,
            studentName: studentFullName,
            parentId: p.id,
            parentName: `${p.firstName} ${p.lastName}`.trim(),
            parentRelationship: p.relationshipType || 'Родитель',
            email: p.email || '',
            telegram: p.telegram || '',
            preferredChannel: p.preferredChannel || 'email',
            selected: hasContact,
          });
        });
      } else {
        // Adult student or student without parent record
        const directEmail = (st as any).email || (st.studentType === 'adult_student' ? `${st.firstName.toLowerCase()}@example.com` : '');
        const directTelegram = (st as any).telegram || '';
        const hasContact = Boolean((directEmail && directEmail.includes('@')) || directTelegram);

        list.push({
          studentId: st.id,
          studentName: studentFullName,
          parentName: st.studentType === 'adult_student' ? studentFullName : undefined,
          parentRelationship: st.studentType === 'adult_student' ? 'Студент (18+)' : 'Основной контакт',
          email: directEmail,
          telegram: directTelegram,
          preferredChannel: 'email',
          selected: hasContact,
        });
      }
    });

    setRecipients(list);
  }, [isOpen, lesson]);

  const selectedCount = recipients.filter((r) => r.selected && (r.email.trim() || r.telegram?.trim())).length;
  const missingEmailCount = recipients.filter((r) => !r.email || !r.email.includes('@')).length;
  const missingContactCount = recipients.filter((r) => !r.email?.includes('@') && !r.telegram?.trim()).length;

  if (!isOpen) return null;

  const handleToggleRecipient = (index: number) => {
    setRecipients((prev) =>
      prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleUpdateEmail = (index: number, newEmail: string) => {
    setRecipients((prev) =>
      prev.map((r, i) =>
        i === index
          ? {
              ...r,
              email: newEmail,
              selected: Boolean((newEmail && newEmail.includes('@')) || r.telegram?.trim()),
            }
          : r
      )
    );
  };

  const handleUpdateTelegram = (index: number, newTelegram: string) => {
    setRecipients((prev) =>
      prev.map((r, i) =>
        i === index
          ? {
              ...r,
              telegram: newTelegram,
              selected: Boolean(newTelegram.trim() || (r.email && r.email.includes('@'))),
            }
          : r
      )
    );
  };

  const handleSelectAll = (select: boolean) => {
    setRecipients((prev) =>
      prev.map((r) => ({
        ...r,
        selected: select ? Boolean((r.email && r.email.includes('@')) || r.telegram?.trim()) : false,
      }))
    );
  };

  const handleSendHomework = async () => {
    if (!homework.trim()) {
      toast.error('Пожалуйста, введите текст домашнего задания');
      return;
    }

    const activeRecipients = recipients.filter((r) => r.selected && ((r.email && r.email.trim()) || (r.telegram && r.telegram.trim())));

    if (activeRecipients.length === 0) {
      toast.error('Выберите хотя бы одного получателя с указанным email или telegram');
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const response = await fetch('/api/lessons/notify/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'homework',
          lessonId: lesson.id,
          groupName: lesson.groupName,
          courseName: lesson.courseName,
          lessonDate: lesson.date,
          teacherName: lesson.teacherName,
          topic: topic.trim() || 'Урок',
          homework: homework.trim(),
          deadline: deadline.trim(),
          customMessage: teacherComment.trim() || undefined,
          recipients: activeRecipients.map((r) => ({
            studentId: r.studentId,
            studentName: r.studentName,
            parentName: r.parentName,
            email: r.email?.trim() || undefined,
            telegram: r.telegram?.trim() || undefined,
            channel: (r.preferredChannel?.toLowerCase() as any) || (r.email && r.telegram ? 'both' : r.telegram ? 'telegram' : 'email'),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Не удалось отправить сообщения');
      }

      // Record Timeline interactions for each recipient
      const now = new Date();
      const timeFormatted = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

      activeRecipients.forEach((rec) => {
        const channelDesc = rec.preferredChannel === 'telegram'
          ? `✈️ Telegram (${rec.telegram})`
          : rec.preferredChannel === 'both'
          ? `📧 Email (${rec.email}) + ✈️ Telegram (${rec.telegram})`
          : `📧 Email (${rec.email})`;

        const interaction: TimelineInteraction = {
          id: `int_hw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          studentId: rec.studentId,
          parentId: rec.parentId,
          occurredAt: `Сегодня, ${timeFormatted}`,
          author: lesson.teacherName || 'Преподаватель',
          channel: (rec.preferredChannel === 'telegram' ? 'telegram' : 'email') as any,
          type: 'organizational',
          content: `Рассылка ДЗ по теме «${topic.trim() || 'Урок'}» успешно отправлена через ${channelDesc}. Срок сдачи: ${deadline}.`,
        };

        saveInteractionToStorage(interaction);
      });

      setSendResult({
        success: true,
        sentCount: data.sentCount || activeRecipients.length,
        failedCount: data.failedCount || 0,
        message: data.message || `Домашнее задание успешно разослано ${activeRecipients.length} получателям!`,
      });

      toast.success(data.message || `ДЗ успешно отправлено родителям (${activeRecipients.length} сообщений)!`);

      if (onSentSuccess) {
        onSentSuccess();
      }
    } catch (err: any) {
      console.error('Failed to send homework:', err);
      toast.error(err.message || 'Ошибка при отправке рассылки');
      setSendResult({
        success: false,
        sentCount: 0,
        failedCount: activeRecipients.length,
        message: err.message || 'Произошла ошибка при отправке сообщений',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-6 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md shadow-inner">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                  Почтовая рассылка родителям
                </span>
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  Домашнее задание: {lesson.groupName}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Subheader info pill */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-blue-100 bg-white/10 px-3.5 py-2 rounded-xl backdrop-blur-xs">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-200" />
              {lesson.date} {lesson.startTime && `(${lesson.startTime} – ${lesson.endTime})`}
            </span>
            <span className="text-white/40">•</span>
            <span>Преподаватель: <strong>{lesson.teacherName}</strong></span>
          </div>
        </div>

        {/* Tab switcher: Редактирование vs Предпросмотр */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-2 shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={cn(
              'flex items-center gap-2 pb-3 px-4 border-b-2 transition-all',
              activeTab === 'form'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <FileText size={14} />
            Настройка рассылки ({selectedCount} получателей)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={cn(
              'flex items-center gap-2 pb-3 px-4 border-b-2 transition-all',
              activeTab === 'preview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <Eye size={14} />
            Предпросмотр письма
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {/* Result Alert Banner */}
          {sendResult && (
            <div
              className={cn(
                'rounded-2xl p-4 border flex items-start gap-3',
                sendResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              )}
            >
              {sendResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold">{sendResult.message}</p>
                {sendResult.success && (
                  <p className="mt-1 text-[11px] text-emerald-700">
                    Факт отправки зафиксирован в Timeline истории учеников и родителей.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'form' ? (
            <>
              {/* 1. Fields for Topic, Homework & Deadline */}
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Тема прошедшего занятия:
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Например: Past Simple vs Present Perfect"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-800">
                      📝 Текст домашнего задания: <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">Обязательное поле</span>
                  </div>
                  <textarea
                    rows={4}
                    required
                    value={homework}
                    onChange={(e) => setHomework(e.target.value)}
                    placeholder="Подробно опишите задание (номера страниц, упражнения, ссылки на материалы)..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ⏰ Срок выполнения (дедлайн):
                    </label>
                    <input
                      type="text"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      placeholder="К следующему уроку (18.09.2026)"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      💡 Дополнительные рекомендации:
                    </label>
                    <input
                      type="text"
                      value={teacherComment}
                      onChange={(e) => setTeacherComment(e.target.value)}
                      placeholder="Например: обратить внимание на неправильные глаголы"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Recipients Selection (Parents & Emails) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <h3 className="font-bold text-slate-900 text-sm">
                      Получатели (Родители и Студенты)
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(true)}
                      className="text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      Выбрать всех ({recipients.length})
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(false)}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-800"
                    >
                      Снять выбор
                    </button>
                  </div>
                </div>

                {missingEmailCount > 0 && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-center gap-2 text-amber-900">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      У <strong>{missingEmailCount}</strong> получателей не указан email. Вы можете ввести его прямо в строке ниже.
                    </span>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden shadow-xs">
                  {recipients.map((item, idx) => {
                    const hasEmail = Boolean(item.email && item.email.includes('@'));

                    return (
                      <div
                        key={`${item.studentId}_${item.parentId || idx}`}
                        className={cn(
                          'p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors',
                          item.selected ? 'bg-blue-50/30' : 'bg-white hover:bg-slate-50/60'
                        )}
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            disabled={!hasEmail}
                            onChange={() => handleToggleRecipient(idx)}
                            className="mt-0.5 sm:mt-0 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-40"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">
                                {item.studentName}
                              </span>
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                {item.parentRelationship}: {item.parentName || 'Сам ученик'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pl-7 sm:pl-0">
                          <Mail className={cn('h-3.5 w-3.5', hasEmail ? 'text-slate-400' : 'text-amber-500')} />
                          <input
                            type="email"
                            value={item.email}
                            onChange={(e) => handleUpdateEmail(idx, e.target.value)}
                            placeholder="email@example.com"
                            className={cn(
                              'w-56 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1',
                              hasEmail
                                ? 'border border-slate-200 bg-white text-slate-800 focus:ring-blue-500'
                                : 'border border-amber-300 bg-amber-50/50 text-amber-900 focus:ring-amber-500 placeholder-amber-400'
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Live Email Preview */
            <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-4">
              <div className="mb-3 flex items-center justify-between text-slate-500">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-600">
                  Так будет выглядеть письмо в почтовом ящике родителя:
                </span>
                <span className="text-[11px]">
                  Тема: <strong>📖 Домашнее задание: {topic || lesson.groupName} ({lesson.date})</strong>
                </span>
              </div>

              <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden max-w-xl mx-auto">
                <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-5 text-white">
                  <div className="text-[10px] font-bold uppercase text-blue-200">
                    Образовательный центр
                  </div>
                  <h3 className="text-lg font-extrabold mt-0.5">📖 Домашнее задание</h3>
                  <div className="text-xs text-blue-100 mt-0.5">
                    Группа: <strong>{lesson.groupName}</strong>
                  </div>
                </div>

                <div className="p-5 space-y-4 text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">Здравствуйте, Ольга Смирнова!</p>
                  <p className="text-slate-600">
                    Направляем информацию по прошедшему занятию ученика <strong>Иван Смирнов</strong> и задание для самостоятельной подготовки.
                  </p>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">📅 Дата урока:</span>
                      <span className="font-bold text-slate-900">{lesson.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">👨‍🏫 Преподаватель:</span>
                      <span className="font-semibold text-slate-800">{lesson.teacherName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">🎯 Тема занятия:</span>
                      <span className="font-bold text-blue-700">{topic || 'Тема не указана'}</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 border-l-4 border-l-blue-600 rounded-xl p-3.5 space-y-2">
                    <div className="font-bold text-blue-900">📝 Задание на дом:</div>
                    <p className="text-slate-800 whitespace-pre-line leading-relaxed font-medium">
                      {homework || 'Домашнее задание пока не заполнено.'}
                    </p>
                    {deadline && (
                      <div className="pt-2 border-t border-blue-200 text-blue-800 font-semibold">
                        ⏰ Срок сдачи: {deadline}
                      </div>
                    )}
                  </div>

                  {teacherComment && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-1">
                      <div className="font-bold text-purple-900">💡 Рекомендация преподавателя:</div>
                      <p className="text-purple-950">{teacherComment}</p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-3 text-center text-[10px] text-slate-400 border-t border-slate-100">
                  Сформировано автоматически через School CRM
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 bg-slate-50/90 p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Выбрано получателей: <strong className="text-slate-900 font-bold">{selectedCount}</strong> из {recipients.length}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Закрыть
            </button>

            <button
              type="button"
              onClick={handleSendHomework}
              disabled={isSending || selectedCount === 0 || !homework.trim()}
              className={cn(
                'w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all',
                isSending || selectedCount === 0 || !homework.trim()
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-98'
              )}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Отправка через Resend...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Отправить {selectedCount > 0 ? `(${selectedCount})` : ''}
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
