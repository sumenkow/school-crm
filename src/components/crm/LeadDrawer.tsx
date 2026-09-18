import React, { useState } from 'react';
import { X, MessageCircle, Send, Phone, User, CheckCircle2, AlertCircle, ArrowRight, Layers } from 'lucide-react';
import { FullLeadData } from '@/lib/data/mockData';
import { useToast } from '@/context/ToastContext';
import { ConvertLeadModal } from './ConvertLeadModal';

interface LeadDrawerProps {
  isOpen: boolean;
  lead: FullLeadData | null;
  onClose: () => void;
  onConverted?: (studentId: string) => void;
}

export function LeadDrawer({ isOpen, lead, onClose, onConverted }: LeadDrawerProps) {
  const toast = useToast();
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [studentType, setStudentType] = useState<'school_student' | 'adult_student'>('school_student');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Array<{ date: string; author: string; text: string }>>([
    { date: '18.09 11:30', author: 'Родитель', text: 'Попросили отсрочку до пятницы' },
    { date: '18.09 10:15', author: 'Анастасия (Админ)', text: 'Отправлен шаблон расписания в WA' },
  ]);

  if (!isOpen || !lead) return null;

  const phoneFormatted = (lead.contact || '').replace(/\D/g, '');

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments(prev => [
      {
        date: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        author: 'Руководитель',
        text: newComment.trim(),
      },
      ...prev,
    ]);
    setNewComment('');
    toast.success('Заметка добавлена');
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[80] bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      
      {/* 720px Slide Drawer */}
      <div className="fixed inset-y-0 right-0 z-[90] w-full sm:w-[720px] bg-white shadow-2xl transition-transform duration-300 flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-purple-100 text-purple-700 border border-purple-200">
              {lead.status === 'trial_scheduled' ? 'Пробный назначен' : lead.status === 'trial_held' ? 'Пробный проведен' : 'Лид'}
            </span>
            <h2 className="text-lg font-bold text-slate-900 truncate max-w-sm">Лид: {lead.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsConvertOpen(true)}
              className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 size={15} /> Зачислить
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content: 2 Columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 overflow-y-auto">
          
          {/* Left Column: Form & Training Parameters */}
          <div className="p-6 space-y-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Анкета и параметры обучения</h3>

            {/* Type selector */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Тип учащегося</label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setStudentType('school_student')}
                  className={`py-1.5 rounded-lg transition-all ${studentType === 'school_student' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}
                >
                  Ребенок
                </button>
                <button
                  type="button"
                  onClick={() => setStudentType('adult_student')}
                  className={`py-1.5 rounded-lg transition-all ${studentType === 'adult_student' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}
                >
                  Взрослый
                </button>
              </div>
            </div>

            {/* Contacts */}
            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Телефон:</span>
                <a 
                  href={`https://wa.me/${phoneFormatted}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="font-bold text-emerald-600 hover:underline flex items-center gap-1"
                >
                  <MessageCircle size={14} /> {lead.contact}
                </a>
              </div>
              {studentType === 'school_student' && (
                <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                  <span className="text-slate-500">Родитель:</span>
                  <span className="font-semibold text-slate-700">{lead.parentFirstName ? `${lead.parentLastName || ''} ${lead.parentFirstName}` : lead.name}</span>
                </div>
              )}
            </div>

            {/* Course Settings */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700">Настройки курса</h4>
              
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-slate-500 block mb-1">Предмет / Курс</label>
                  <select className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium">
                    <option>{lead.directionOrCourse || 'Английский язык'}</option>
                    <option>Олимпиадная математика</option>
                    <option>Робототехника</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 block mb-1">Группа</label>
                  <select className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium">
                    <option>Вт/Чт 18:00 (A2-B1) • 4/6 мест</option>
                    <option>Пн/Ср 16:30 (Начинающие) • 2/6 мест</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 block mb-1">Преподаватель</label>
                  <input
                    type="text"
                    value="Иванова Мария"
                    disabled
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-100 text-slate-600 font-medium"
                  />
                </div>

                <div>
                  <label className="text-slate-500 block mb-1">Тариф</label>
                  <select className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-medium">
                    <option>Абонемент 8 зан. (120 € / 7 600 ₽)</option>
                    <option>Разовое занятие (20 € / 1 500 ₽)</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Timeline & Communications */}
          <div className="p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Таймлайн и коммуникации</h3>

              {/* Quick WhatsApp Templates */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1.5">Быстрые шаблоны</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      window.open(`https://wa.me/${phoneFormatted}?text=${encodeURIComponent('Здравствуйте! Напоминаем о пробном занятии.')}`, '_blank');
                    }}
                    className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <MessageCircle size={12} /> Напомнить в WA
                  </button>
                  <button 
                    onClick={() => {
                      toast.success('Шаблон счета скопирован');
                    }}
                    className="text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Отправить счет
                  </button>
                </div>
              </div>

              {/* Timeline Feed */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-slate-600">Лента событий</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {comments.map((c, i) => (
                    <div key={i} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                      <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                        <span className="font-bold text-slate-700">{c.author}</span>
                        <span>{c.date}</span>
                      </div>
                      <p className="text-slate-600">{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="pt-3 border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Новая заметка / указание..."
                className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                <Send size={13} />
              </button>
            </form>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Статус:</span>
            <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg">
              {lead.status === 'trial_held' ? 'Пробный проведен' : 'Ждет решения'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                toast.success('Лид переведен в отказ');
                onClose();
              }}
              className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            >
              Отказ
            </button>
            <button
              onClick={() => setIsConvertOpen(true)}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              Зачислить в ученики <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>

      {/* Convert Lead Modal */}
      <ConvertLeadModal
        isOpen={isConvertOpen}
        lead={lead}
        onClose={() => setIsConvertOpen(false)}
        onSuccess={(studentId) => {
          if (onConverted) onConverted(studentId);
          onClose();
        }}
      />
    </>
  );
}
