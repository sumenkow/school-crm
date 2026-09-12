'use client';

import React, { useState } from 'react';
import { X, School, Building2, Phone, Mail, MapPin, Clock, Check } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export interface SchoolProfileData {
  name: string;
  slogan: string;
  legalEntity: string;
  inn: string;
  ogrn: string;
  bankAccount: string;
  bankName: string;
  bik: string;
  phone: string;
  email: string;
  branchName: string;
  address: string;
  roomsDescription: string;
  workHours: string;
  timezone: string;
}

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

  const handleChange = (field: keyof SchoolProfileData, value: string) => {
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
              Филиалы и учебные аудитории
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Название филиала</label>
                <input
                  type="text"
                  value={formData.branchName}
                  onChange={(e) => handleChange('branchName', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="Центральный филиал"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Фактический адрес</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="г. Москва, ул. Ленина, д. 42"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Аудитории и лаборатории</label>
                <input
                  type="text"
                  value={formData.roomsDescription}
                  onChange={(e) => handleChange('roomsDescription', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="3 аудитории, 1 IT-лаборатория"
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

          {/* Юридические реквизиты */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">
              Юридические реквизиты (для договоров и оплат)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Юридическое наименование</label>
                <input
                  type="text"
                  value={formData.legalEntity}
                  onChange={(e) => handleChange('legalEntity', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="ООО «Смарт Академи» / ИП Смирнов А.В."
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">ИНН</label>
                <input
                  type="text"
                  value={formData.inn}
                  onChange={(e) => handleChange('inn', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="7701234567"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">ОГРН / ОГРНИП</label>
                <input
                  type="text"
                  value={formData.ogrn}
                  onChange={(e) => handleChange('ogrn', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="1234567890123"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Расчетный счет</label>
                <input
                  type="text"
                  value={formData.bankAccount}
                  onChange={(e) => handleChange('bankAccount', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="40802810000000000000"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Банк / БИК</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-hidden"
                  placeholder="АО «ТБанк», БИК 044525974"
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
