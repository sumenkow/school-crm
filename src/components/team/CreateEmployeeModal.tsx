'use client';

import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Shield,
  GraduationCap,
  Eye,
  EyeOff,
  Copy,
  Check,
  Phone,
  Mail,
  User,
  Key,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface CreateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultRole?: 'admin' | 'teacher';
}

export function CreateEmployeeModal({
  isOpen,
  onClose,
  onSuccess,
  defaultRole = 'teacher',
}: CreateEmployeeModalProps) {
  const toast = useToast();
  const [role, setRole] = useState<'admin' | 'teacher'>(defaultRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Result credential screen
  const [createdCredentials, setCreatedCredentials] = useState<{
    fullName: string;
    email: string;
    password?: string;
    role: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let generated = '';
    for (let i = 0; i < 10; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError('Заполните обязательные поля');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim() || undefined,
          full_name: fullName.trim(),
          role,
          phone: phone.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Не удалось создать учетную запись');
      } else {
        const finalPassword = data.user?.generatedPassword || password || 'Задано пользователем';
        setCreatedCredentials({
          fullName: fullName.trim(),
          email: email.trim(),
          password: finalPassword,
          role: role === 'admin' ? 'Администратор' : 'Преподаватель',
        });
        toast.success(`Учетная запись сотрудника «${fullName}» успешно создана!`);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setError('Сетевая ошибка при создании учетной записи');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `Данные для входа в School CRM:\nАдрес: ${typeof window !== 'undefined' ? window.location.origin : ''}/login\nЛогин: ${createdCredentials.email}\nПароль: ${createdCredentials.password}\nДолжность: ${createdCredentials.role}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Данные для входа скопированы в буфер обмена!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleClose = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setError('');
    setCreatedCredentials(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Создать учетную запись сотрудника</h2>
              <p className="text-xs text-slate-500">Добавление администратора или преподавателя</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        {createdCredentials ? (
          <div className="p-6 space-y-4 text-xs">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-center space-y-2">
              <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                <CheckCircle2 size={22} />
              </div>
              <h3 className="text-sm font-bold text-emerald-950">Сотрудник успешно зарегистрирован!</h3>
              <p className="text-[11px] text-emerald-800">
                Передайте сотруднику данные для первого входа в CRM систему:
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 font-mono">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-sans">ФИО:</span>
                <span className="font-bold text-slate-900 font-sans">{createdCredentials.fullName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-sans">Роль:</span>
                <span className="font-bold text-blue-700 font-sans">{createdCredentials.role}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-sans">Логин (Email):</span>
                <span className="font-bold text-slate-900">{createdCredentials.email}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-sans">Пароль:</span>
                <span className="font-bold text-slate-900 bg-amber-100/70 px-1.5 py-0.5 rounded text-amber-900">
                  {createdCredentials.password}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Скопировано в буфер!' : 'Скопировать данные для сотрудника'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Готово
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-800 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Role Switcher (Toggle between Admin and Teacher) */}
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                Должность и уровень доступа:
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold text-xs transition-all ${
                    role === 'teacher'
                      ? 'bg-white text-blue-700 shadow-xs border border-blue-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GraduationCap size={16} className={role === 'teacher' ? 'text-blue-600' : 'text-slate-400'} />
                  Преподаватель
                </button>

                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold text-xs transition-all ${
                    role === 'admin'
                      ? 'bg-white text-purple-700 shadow-xs border border-purple-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Shield size={16} className={role === 'admin' ? 'text-purple-600' : 'text-slate-400'} />
                  Администратор
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                {role === 'teacher'
                  ? 'Преподаватель имеет доступ только к своему расписанию, журналу посещаемости и назначенным группам.'
                  : 'Администратор управляет учениками, лидами, расписанием занятий, задачами и платежами.'}
              </p>
            </div>

            {/* Full name */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                ФИО сотрудника <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Иванов Иван Иванович"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Email (логин) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="employee@school.ru"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Телефон
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="+7 (999) 000-00-00"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Password with generator */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-bold">
                  Пароль для первого входа
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                >
                  <Sparkles size={12} />
                  Сгенерировать надежный
                </button>
              </div>
              <div className="relative">
                <Key size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Минимум 6 символов или оставьте пустым"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Если оставить поле пустым, пароль будет сгенерирован автоматически и показан вам.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
              >
                <UserPlus size={15} />
                {loading ? 'Создание...' : `Создать учетную запись (${role === 'admin' ? 'Администратор' : 'Преподаватель'})`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
