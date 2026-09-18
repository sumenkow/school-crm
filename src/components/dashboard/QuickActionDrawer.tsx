import React from 'react';
import { X, MessageCircle, Calendar, CreditCard, Phone, Ban, FileBox, CheckCircle, Copy } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { savePaymentToStorage, settleOverduePayments } from '@/lib/data/paymentStorage';
import { saveLeadToStorage } from '@/lib/data/leadStorage';
import { saveTaskToStorage } from '@/lib/data/taskStorage';

export type DrawerType = 'debt' | 'trial' | 'churn' | 'teacher' | null;

export interface DrawerState {
  isOpen: boolean;
  type: DrawerType;
  entityId: string | null;
  initialData?: any;
}

interface QuickActionDrawerProps {
  state: DrawerState;
  onClose: () => void;
  onSuccess: (type: DrawerType, entityId: string) => void;
}

export function QuickActionDrawer({ state, onClose, onSuccess }: QuickActionDrawerProps) {
  const toast = useToast();

  if (!state.isOpen) return null;

  const data = state.initialData || {};

  const handleAction = (actionName: string) => {
    // 1. Supabase persistence based on action type
    if (state.type === 'debt') {
      savePaymentToStorage({
        id: `pay_${Date.now()}`,
        studentId: state.entityId || '1',
        studentName: data.name || 'Ученик',
        courseName: 'Английский язык',
        groupName: 'Основная группа',
        amount: 150,
        amountFormatted: '150 €',
        paymentDate: new Date().toLocaleDateString('ru-RU'),
        periodLabel: 'Оплата задолженности',
        status: 'paid',
        paymentMethod: 'card',
        currency: 'EUR',
        paymentType: 'subscription',
        recordedBy: 'Администратор',
      });
      settleOverduePayments(state.entityId || '1', 150);
    } else if (state.type === 'trial') {
      saveLeadToStorage({
        id: state.entityId || `lead_${Date.now()}`,
        name: data.name || 'Лид',
        contact: data.phone || '+123456789',
        status: 'trial_scheduled',
        directionOrCourse: 'Английский',
        source: 'Сайт',
        assignedTo: 'Анастасия (Админ)',
        createdAt: new Date().toISOString(),
        interactions: [],
      });
    } else if (state.type === 'churn') {
      saveTaskToStorage({
        id: state.entityId || `task_${Date.now()}`,
        title: `Отток: ${data.name || ''}`,
        taskType: 'Retention',
        assignedTo: 'Анастасия (Админ)',
        dueDate: new Date().toISOString().slice(0, 10),
        dueDateFormatted: new Date().toLocaleDateString('ru-RU'),
        status: 'done',
        priority: 'high',
        isOverdue: false,
      });
    }

    // 2. Mock API completion & UI update
    setTimeout(() => {
      toast.success(`${actionName} успешно выполнено`);
      if (state.entityId && state.type) {
        onSuccess(state.type, state.entityId);
      }
      onClose();
    }, 300);
  };

  const renderContent = () => {
    switch (state.type) {
      case 'debt':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{data.name || 'Ученик'}</h3>
              <p className="text-sm text-slate-500">{data.description || 'Долг по оплате'}</p>
            </div>
            
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-rose-600 font-semibold uppercase tracking-wider mb-1">Сумма к оплате</p>
                <p className="text-2xl font-black text-rose-700">150 €</p>
              </div>
              <CreditCard className="w-8 h-8 text-rose-300" />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 block">Способ оплаты</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50">
                <option>Оплата картой (Stripe)</option>
                <option>Наличные (Cash)</option>
                <option>Перевод на счет (SEPA)</option>
              </select>
            </div>

            <div className="space-y-3 pt-4">
              <button 
                onClick={() => handleAction('Фиксация оплаты')}
                className="w-full bg-slate-900 text-white rounded-xl py-3 font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} /> Зафиксировать оплату
              </button>
              <button 
                onClick={() => {
                   navigator.clipboard.writeText('https://pay.stripe.com/...');
                   toast.success('Ссылка скопирована!');
                }}
                className="w-full bg-white text-slate-700 border border-slate-200 rounded-xl py-3 font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <Copy size={18} /> Скопировать ссылку на оплату
              </button>
            </div>
          </div>
        );

      case 'trial':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{data.name || 'Лид'}</h3>
              <p className="text-sm text-slate-500">{data.description || 'Пробный урок'}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Преподаватель</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50">
                  <option>Мария Иванова (Английский)</option>
                  <option>Дмитрий Соколов (Робототехника)</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Дата</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Время</label>
                  <input type="time" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50" />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={() => handleAction('Назначение пробного')}
                className="w-full bg-blue-600 text-white rounded-xl py-3 font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Calendar size={18} /> Назначить в календарь
              </button>
            </div>
          </div>
        );

      case 'churn':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{data.name || 'Ученик'}</h3>
              <p className="text-sm text-rose-500 font-medium">Риск оттока!</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Пропусков подряд</p>
                  <p className="text-xl font-bold text-slate-800">3</p>
               </div>
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Баланс часов</p>
                  <p className="text-xl font-bold text-slate-800">12</p>
               </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <button 
                onClick={() => handleAction('Звонок родителю')}
                className="w-full bg-indigo-50 text-indigo-700 rounded-xl py-3 font-medium hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
              >
                <Phone size={18} /> Позвонить родителю
              </button>
              <button 
                onClick={() => handleAction('Заморозка абонемента')}
                className="w-full bg-slate-100 text-slate-700 rounded-xl py-3 font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <Ban size={18} /> Заморозить абонемент
              </button>
              <button 
                onClick={() => handleAction('Перевод в отказ')}
                className="w-full bg-rose-50 text-rose-700 rounded-xl py-3 font-medium hover:bg-rose-100 transition-colors flex items-center justify-center gap-2 mt-4"
              >
                <FileBox size={18} /> Перевести в архив/отказ
              </button>
            </div>
          </div>
        );

      case 'teacher':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{data.name || 'Преподаватель'}</h3>
              <p className="text-sm text-slate-500">{data.role || 'Предмет'}</p>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
               <div className="bg-blue-50 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] text-blue-600 font-bold uppercase">Загрузка</p>
                  <p className="text-lg font-black text-blue-800">{data.load || '0%'}</p>
               </div>
               <div className="bg-emerald-50 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase">Retention</p>
                  <p className="text-lg font-black text-emerald-800">94%</p>
               </div>
               <div className="bg-purple-50 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] text-purple-600 font-bold uppercase">Пробные</p>
                  <p className="text-lg font-black text-purple-800">8/10</p>
               </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-sm font-bold text-slate-800 mb-2">Расписание на сегодня</h4>
              <div className="space-y-2">
                 <div className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700">14:00 - 15:30</span>
                    <span className="text-slate-500">Группа A-2</span>
                 </div>
                 <div className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700">16:00 - 17:30</span>
                    <span className="text-slate-500">Группа B-1</span>
                 </div>
              </div>
            </div>

            <div className="space-y-3 pt-6">
              <button 
                onClick={() => {
                  toast.success('Открыт календарь');
                  onClose();
                }}
                className="w-full bg-slate-900 text-white rounded-xl py-3 font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <Calendar size={18} /> Полное расписание
              </button>
              <button 
                onClick={() => {
                  toast.success('Открыт чат Telegram');
                }}
                className="w-full bg-sky-50 text-sky-700 rounded-xl py-3 font-medium hover:bg-sky-100 transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} /> Написать в Telegram
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] bg-slate-900/20 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      <div 
        className="fixed inset-y-0 right-0 z-[110] w-[440px] bg-white shadow-2xl transition-transform duration-300 translate-x-0 flex flex-col"
        style={{ transform: state.isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">
            {state.type === 'debt' ? 'Работа с долгом' :
             state.type === 'trial' ? 'Назначение пробного' :
             state.type === 'churn' ? 'Работа с оттоком' :
             state.type === 'teacher' ? 'Профиль преподавателя' : 'Действие'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </div>
    </>
  );
}
