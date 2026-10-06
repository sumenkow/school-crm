'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Video, Check, Sparkles } from 'lucide-react';
import { getStoredLessons } from '@/lib/data/lessonStorage';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { FullLessonData } from '@/lib/data/mockData';

interface OfferLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientChatId?: string;
  recipientId?: string;
  recipientType?: 'student' | 'lead' | 'parent';
  onSendOffer: (messageText: string, replyMarkup?: any) => void;
}

export function OfferLessonModal({
  isOpen,
  onClose,
  recipientName,
  recipientChatId,
  recipientId,
  recipientType,
  onSendOffer,
}: OfferLessonModalProps) {
  const [activeTab, setActiveTab] = useState<'group' | 'individual'>('group');
  const [availableLessons, setAvailableLessons] = useState<any[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    try {
      const lessons = getStoredLessons();
      const groups = getStoredGroups();

      // Find planned lessons with available seats
      const openLessons = lessons
        .filter((l) => l.status === 'scheduled' || l.status === 'planned')
        .map((l) => {
          const group = groups.find((g) => g.id === l.groupId);
          const maxCapacity = (l as any).capacity || group?.capacity || 8;
          const occupied = l.students?.length || 0;
          const available = Math.max(0, maxCapacity - occupied);

          return {
            id: l.id,
            groupName: l.groupName || l.courseName,
            courseName: l.courseName,
            date: l.dateFormatted || l.date,
            time: `${l.startTime} – ${l.endTime}`,
            teacherName: l.teacherName,
            availableSeats: available,
            maxCapacity,
            isIndividual: Boolean(l.isIndividual),
          };
        })
        .filter((l) => l.availableSeats > 0)
        .slice(0, 8);

      setAvailableLessons(openLessons);
      if (openLessons.length > 0) {
        setSelectedLessonId(openLessons[0].id);
      }
    } catch (e) {
      console.error('Error loading lessons for offer:', e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedLesson = availableLessons.find((l) => l.id === selectedLessonId) || availableLessons[0];

  const handleSend = () => {
    if (!selectedLesson) return;

    const appBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://youeuropecrmtest.vercel.app';
    const params = new URLSearchParams();
    params.set('lessonId', selectedLesson.id);
    if (recipientChatId) params.set('chatId', recipientChatId);
    if (recipientId) {
      if (recipientType === 'student') params.set('studentId', recipientId);
      else if (recipientType === 'parent') params.set('parentId', recipientId);
      else if (recipientType === 'lead') params.set('leadId', recipientId);
      else params.set('studentId', recipientId);
    }
    const bookingLink = `${appBaseUrl}/mini-app?${params.toString()}`;

    const text = [
      `Здравствуйте, ${recipientName || 'дорогой родитель'}! Предлагаем подходящее занятие:`,
      ``,
      `📚 *${selectedLesson.groupName}*`,
      `📅 ${selectedLesson.date} • ${selectedLesson.time}`,
      `👤 Преподаватель: ${selectedLesson.teacherName}`,
      `🟢 Свободно: ${selectedLesson.availableSeats} из ${selectedLesson.maxCapacity} мест`,
      ``,
      `Нажмите кнопку ниже, чтобы подтвердить запись в один клик:`,
    ].join('\n');

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '🚀 Записаться на это занятие',
            web_app: { url: bookingLink },
          },
        ],
      ],
    };

    onSendOffer(text, replyMarkup);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-5 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Предложить занятие</h3>
              <p className="text-[10px] text-slate-400">Отправка интерактивной карточки родителю ({recipientName})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={15} />
          </button>
        </div>

        {/* Lessons List with available seats */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-700">Выберите подходящее занятие:</p>
          
          <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
            {availableLessons.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Нет доступных занятий со свободными местами</p>
            ) : (
              availableLessons.map((l) => {
                const isSelected = selectedLessonId === l.id;
                return (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLessonId(l.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900">{l.groupName}</p>
                      <p className="text-[10px] text-slate-500">
                        {l.date} • {l.time} • {l.teacherName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                        {l.availableSeats} мест
                      </span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check size={10} />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Live Preview (Screen 12) */}
        {selectedLesson && (
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-[11px]">
            <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">Предпросмотр карточки в Telegram:</p>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
              <p className="font-bold text-slate-900">{selectedLesson.groupName}</p>
              <p className="text-slate-600">📅 {selectedLesson.date} • {selectedLesson.time}</p>
              <p className="text-slate-600">👤 {selectedLesson.teacherName}</p>
              <p className="text-emerald-600 font-semibold">🟢 Свободно: {selectedLesson.availableSeats} места</p>
              <div className="pt-1.5">
                <div className="w-full py-1.5 bg-blue-600 text-white font-bold text-center rounded-lg text-[10px]">
                  Записать {recipientName.split(' ')[0] || 'ученика'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!selectedLesson}
            onClick={handleSend}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs cursor-pointer transition-colors"
          >
            Отправить в Telegram
          </button>
        </div>
      </div>
    </div>
  );
}
