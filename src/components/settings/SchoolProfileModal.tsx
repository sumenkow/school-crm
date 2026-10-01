'use client';

import React, { useState } from 'react';
import { X, School, Building2, Phone, Mail, MapPin, Clock, Check } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

import { SchoolProfileData } from '@/lib/data/schoolSettingsStorage';
export type { SchoolProfileData };

interface SchoolProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SchoolProfileData;
  onSave: (data: SchoolProfileData) => void;
}

export function SchoolProfileModal({ isOpen, onClose, data, onSave }: SchoolProfileModalProps) {
  const { success } = useToast();
  const [formData, setFormData] = useState<SchoolProfileData>(data);

  if (!isOpen) return null;

  const handleChange = <K extends keyof SchoolProfileData>(field: K, value: SchoolProfileData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    success('Данные профиля школы успешно обновлены');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <School className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Профиль школы и реквизиты</h2>
              <p className="text-xs text-slate-500">Название, юридические данные, адреса и филиалы</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Section: Основное */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-blue-600" />
              Основная информация
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Название школы / центра</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="Smart Academy"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Слоган / Краткое описание</label>
                <input
                  type="text"
                  value={formData.slogan}
                  onChange={(e) => handleChange('slogan', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="Центр детского развития и робототехники"
                />
              </div>
            </div>
          </div>

          {/* Section: Контакты */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-blue-600" />
              Контакты школы
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Телефон школы</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="+7 (495) 000-00-00"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Электронная почта</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="info@school.ru"
                  required
                />
              </div>
            </div>
          </div>

            {/* Филиалы и помещения */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                Формат обучения и онлайн-классы
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Название филиала / платформы</label>
                  <input
                    type="text"
                    value={formData.branchName}
                    onChange={(e) => handleChange('branchName', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    placeholder="Онлайн-школа (Основной аккаунт)"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Формат занятий</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    placeholder="Онлайн (Zoom, Google Meet, Miro)"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Онлайн-комнаты / Классы</label>
                  <input
                    type="text"
                    value={formData.roomsDescription}
                    onChange={(e) => handleChange('roomsDescription', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                    placeholder="Интерактивные онлайн-комнаты"
                  />
                </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Режим работы</label>
                <input
                  type="text"
                  value={formData.workHours}
                  onChange={(e) => handleChange('workHours', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="Пн-Сб 09:00 - 21:00"
                />
              </div>
            </div>
          </div>

          {/* Юридические и банковские реквизиты (SEPA / Tatra banka) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">
                Банковские реквизиты для счетов (SEPA / Tatra banka)
              </h3>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Европейский стандарт (EUR)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Владелец счёта (Kontoinhaber)</label>
                <input
                  type="text"
                  value={formData.accountHolder || formData.legalEntity || ''}
                  onChange={(e) => handleChange('accountHolder', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="Ekaterina Nezhenkina"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Наименование банка (Banka)</label>
                <input
                  type="text"
                  value={formData.bankName || ''}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="Tatra banka, a.s."
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">IBAN счёта</label>
                <input
                  type="text"
                  value={formData.iban || formData.bankAccount || ''}
                  onChange={(e) => {
                    handleChange('iban', e.target.value);
                    handleChange('bankAccount', e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold focus:border-blue-500 focus:outline-hidden"
                  placeholder="SK34 1100 0000 0029 3766 3128"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">SWIFT / BIC код</label>
                <input
                  type="text"
                  value={formData.swiftBic || 'TATRSKBX'}
                  onChange={(e) => handleChange('swiftBic', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold focus:border-blue-500 focus:outline-hidden"
                  placeholder="TATRSKBX"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Следующий номер счёта (Faktur Nummer)</label>
                <input
                  type="number"
                  value={formData.nextInvoiceNumber || 20260342}
                  onChange={(e) => handleChange('nextInvoiceNumber', parseInt(e.target.value, 10) || 20260342)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold focus:border-blue-500 focus:outline-hidden"
                  placeholder="20260342"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Статус НДС (VAT note)</label>
                <input
                  type="text"
                  value={formData.vatNote || 'Nicht umsatzsteuerpflichtig / Neplatiteľ DPH'}
                  onChange={(e) => handleChange('vatNote', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="Nicht umsatzsteuerpflichtig / Neplatiteľ DPH"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              Сохранить изменения
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
