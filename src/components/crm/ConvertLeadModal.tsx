import React, { useState } from 'react';
import { X, CheckCircle2, Copy, Send, CreditCard, Calendar, User, BookOpen, Layers } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { FullLeadData } from '@/lib/data/mockData';
import { convertLeadToStudentTransaction } from '@/lib/data/conversionHelper';

interface ConvertLeadModalProps {
  isOpen: boolean;
  lead: FullLeadData | null;
  onClose: () => void;
  onSuccess: (studentId: string) => void;
}

export function ConvertLeadModal({ isOpen, lead, onClose, onSuccess }: ConvertLeadModalProps) {
  const toast = useToast();
  const [studentType, setStudentType] = useState<'school_student' | 'adult_student'>('school_student');
  const [parentName, setParentName] = useState(lead?.parentFirstName ? `${lead.parentLastName || ''} ${lead.parentFirstName || ''}`.trim() : lead?.name || '');
  const [parentPhone, setParentPhone] = useState(lead?.contact || '');
  const [courseName, setCourseName] = useState(lead?.directionOrCourse || 'Английский язык');
  const [groupName, setGroupName] = useState('Вт/Чт 18:00 (A2-B1)');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [tariffAmount, setTariffAmount] = useState<number>(120);
  const [currency, setCurrency] = useState<'EUR' | 'RUB'>('EUR');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'bank_transfer'>('card');
  const [autoCreateInvoice, setAutoCreateInvoice] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await convertLeadToStudentTransaction({
        lead,
        studentType,
        parentName: studentType === 'school_student' ? parentName : undefined,
        parentPhone: studentType === 'school_student' ? parentPhone : undefined,
        courseName,
        groupName,
        startDate,
        tariffAmount,
        currency,
        paymentMethod,
        autoCreateInvoice,
      });

      toast.success('Ученик зачислен в группу. Счет сформирован');
      if (res.payUrl) {
        navigator.clipboard.writeText(res.payUrl);
        toast.success('Ссылка на оплату скопирована в буфер');
      }
      onSuccess(res.studentId);
      onClose();
    } catch (err) {
      toast.error('Ошибка зачисления лида');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-800">Зачисление в ученики</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Target Student Info */}
          <div className="bg-emerald-50/60 border border-emerald-100 p-3.5 rounded-xl space-y-1">
            <p className="text-xs text-emerald-800 font-medium">Конвертация лида:</p>
            <p className="text-base font-bold text-slate-900">{lead.name}</p>
            <p className="text-xs text-slate-500">{lead.contact} • {lead.directionOrCourse}</p>
          </div>

          {/* Student Type Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Тип учащегося</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStudentType('school_student')}
                className={`py-2 rounded-lg transition-all ${studentType === 'school_student' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}
              >
                👶 Ребенок (с родителем)
              </button>
              <button
                type="button"
                onClick={() => setStudentType('adult_student')}
                className={`py-2 rounded-lg transition-all ${studentType === 'adult_student' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}
              >
                👤 Взрослый
              </button>
            </div>
          </div>

          {studentType === 'school_student' && (
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">ФИО Родителя</label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Телефон родителя</label>
                <input
                  type="text"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white"
                  required
                />
              </div>
            </div>
          )}

          {/* Group & Course Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Направление/Курс</label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Группа</label>
              <select
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 font-medium"
              >
                <option>Вт/Чт 18:00 (A2-B1)</option>
                <option>Пн/Ср 16:30 (Начинающие)</option>
                <option>Сб 10:00 (Интенсив)</option>
              </select>
            </div>
          </div>

          {/* Start Date & Tariff */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Дата старта</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Стоимость</label>
              <input
                type="number"
                value={tariffAmount}
                onChange={(e) => setTariffAmount(Number(e.target.value))}
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Валюта</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 font-bold"
              >
                <option value="EUR">EUR (€)</option>
                <option value="RUB">RUB (₽)</option>
              </select>
            </div>
          </div>

          {/* Payment Gateway / Method */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Способ оплаты</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50"
            >
              <option value="card">💳 Ссылка для онлайн-оплаты (Stripe / Карта)</option>
              <option value="cash">💵 Наличные / терминал в школе</option>
              <option value="bank_transfer">🏛️ Банковский перевод (Счет / SEPA)</option>
            </select>
          </div>

          {/* Auto create invoice checkbox */}
          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={autoCreateInvoice}
              onChange={(e) => setAutoCreateInvoice(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600"
            />
            <span className="text-xs font-medium text-slate-700">Выставить счет на первый месяц автоматически</span>
          </label>

          {/* Buttons */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <CheckCircle2 size={16} /> Подтвердить зачисление и сформировать счет
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
