import React, { useState } from 'react';
import { X, User, BookOpen, CreditCard, MessageCircle, Calendar, CheckCircle2, Clock, Send, Award } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface StudentDrawerProps {
  isOpen: boolean;
  studentData: any;
  initialTab?: 'profile' | 'learning' | 'finance' | 'attendance';
  onClose: () => void;
}

export function StudentDrawer({ isOpen, studentData, initialTab = 'profile', onClose }: StudentDrawerProps) {
  const toast = useToast();
  const targetTab = initialTab === 'attendance' ? 'learning' : initialTab;
  const [activeTab, setActiveTab] = React.useState<'profile' | 'learning' | 'finance'>(targetTab);

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab === 'attendance' ? 'learning' : initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen || !studentData) return null;

  const phone = studentData.phone || studentData.parentPhone || '+79991234567';
  const phoneFormatted = phone.replace(/\D/g, '');

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[90] w-full sm:w-[560px] bg-white shadow-2xl transition-transform duration-300 flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
              {studentData.name ? studentData.name.charAt(0) : 'У'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{studentData.name}</h2>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Активный
                </span>
              </div>
              <p className="text-xs text-slate-500">{phone}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs Header */}
        <div className="flex border-b border-slate-100 bg-white px-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User size={14} /> Профиль
          </button>
          <button
            onClick={() => setActiveTab('learning')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'learning' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen size={14} /> Обучение и группы
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'finance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard size={14} /> Финансы
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Привязанные контакты</h4>
                <div className="text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ученик:</span>
                    <span className="font-semibold text-slate-800">{studentData.name}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200/60 pt-2">
                    <span className="text-slate-500">Родитель:</span>
                    <span className="font-semibold text-slate-800">{studentData.parentName || 'Смирнова Елена'}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200/60 pt-2">
                    <span className="text-slate-500">WhatsApp:</span>
                    <a 
                      href={`https://wa.me/${phoneFormatted}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="font-bold text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <MessageCircle size={13} /> {phone}
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 space-y-2">
                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Award size={14} /> Языковой паспорт
                </h4>
                <p className="text-xs text-blue-900 font-semibold">Текущий курс: Английский язык (B1)</p>
                <p className="text-xs text-blue-700">Проведено пробных уроков: 1 (15 сен 2026)</p>
                <p className="text-xs text-blue-700">Конвертирован из лида в CRM</p>
              </div>
            </div>
          )}

          {activeTab === 'learning' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700">Закрепленная группа</h4>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Активная</span>
                </div>
                <div className="text-xs space-y-1.5">
                  <p className="font-bold text-slate-900 text-sm">Вт/Чт 18:00 (A2-B1)</p>
                  <p className="text-slate-500">Преподаватель: <strong className="text-slate-700">Иванова Мария</strong></p>
                  <p className="text-slate-500">Кабинет: №3 (Главный корпус)</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <h4 className="text-xs font-bold text-slate-700">Баланс занятий</h4>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-slate-800">0 / 8</span>
                  <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    Ожидает оплаты
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Баланс пополнится автоматически после проведения платежа.</p>
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-4">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Счет за обучение</span>
                  <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">Ожидает оплаты</span>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">120 €</p>
                  <p className="text-xs text-slate-600">Первый абонемент (8 занятий)</p>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      toast.success('Оплата зафиксирована');
                      onClose();
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <CreditCard size={14} /> Внести оплату
                  </button>
                  <button
                    onClick={() => {
                      window.open(`https://wa.me/${phoneFormatted}?text=${encodeURIComponent('Здравствуйте! Напоминаем о необходимости оплаты счета.')}`, '_blank');
                    }}
                    className="px-3 py-2.5 bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1"
                  >
                    <MessageCircle size={14} /> Напомнить
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <span className="text-xs text-slate-500">ID: {studentData.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Закрыть
          </button>
        </div>

      </div>
    </>
  );
}
