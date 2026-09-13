'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Send,
  Shield,
  Building2,
  Lock,
  KeyRound,
  Check,
  Edit3,
  LogOut,
  Bell,
  CheckCircle2,
  Calendar,
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/context/ToastContext';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types';
import { cn } from '@/lib/utils';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const roleDescriptions: Record<UserRole, { title: string; subtitle: string; badgeClass: string; permissions: string[] }> = {
  owner: {
    title: 'Владелец школы (Суперадмин)',
    subtitle: 'Полный неограниченный доступ ко всем разделам и данным',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    permissions: [
      'Управление финансовыми отчетами, выручкой и кассой',
      'Настройки организации, курсов и реквизитов',
      'Резервное копирование и экспорт базы в Excel/Google Sheets',
      'Управление сотрудниками, ставками и ролями пользователей',
      'Полная воронка CRM, лиды, задачи и расписание',
    ],
  },
  admin: {
    title: 'Управляющий / Администратор',
    subtitle: 'Оперативное управление школой, клиентами и расписанием',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    permissions: [
      'Ведение воронки продаж, работа с лидами и задачами',
      'Прием оплат, выставление счетов и учет абонементов',
      'Формирование групп, расписания и назначение кабинетов',
      'Перенос и отмена уроков, коммуникация с родителями',
      'Контроль посещаемости и ведение базы учеников',
    ],
  },
  teacher: {
    title: 'Преподаватель',
    subtitle: 'Педагогическая деятельность и журнал посещаемости',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    permissions: [
      'Просмотр личного расписания занятий и онлайн-комнат',
      'Ведение электронного журнала посещаемости',
      'Добавление педагогических заметок об учениках',
      'Инициирование переноса уроков с фиксацией в таймлайне',
      'Быстрая связь с родителями учеников через WhatsApp',
    ],
  },
};

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { role, setRole, isOwnerAccount, userName, userEmail, userPhone, userTelegram, updateProfile } = useRole();
  const toast = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    userName: userName || 'Алексей Смирнов',
    userEmail: userEmail || 'admin@smartacademy.ru',
    userPhone: userPhone || '+7 (999) 123-45-67',
    userTelegram: userTelegram || '@alex_smart',
    role: role || 'owner',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    notifyTelegram: true,
    notifyEmail: true,
  });

  const [passwordError, setPasswordError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync formData when modal opens or profile changes
  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        userName: userName || 'Алексей Смирнов',
        userEmail: userEmail || 'admin@smartacademy.ru',
        userPhone: userPhone || '+7 (999) 123-45-67',
        userTelegram: userTelegram || '@alex_smart',
        role: role || 'owner',
      }));
      setIsEditing(false);
      setPasswordError('');
    }
  }, [isOpen, userName, userEmail, userPhone, userTelegram, role]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (formData.newPassword) {
      if (formData.newPassword.length < 6) {
        setPasswordError('Новый пароль должен содержать не менее 6 символов');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setPasswordError('Новые пароли не совпадают');
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateProfile({
        userName: formData.userName.trim(),
        userEmail: formData.userEmail.trim(),
        userPhone: formData.userPhone.trim(),
        userTelegram: formData.userTelegram.trim(),
        role: formData.role as UserRole,
      });

      // Update password via Supabase if requested
      if (formData.newPassword) {
        try {
          const supabase = createClient();
          await supabase.auth.updateUser({ password: formData.newPassword });
        } catch {
          // Ignore offline/demo error
        }
      }

      toast.success('Профиль учетной записи успешно обновлен');
      setIsEditing(false);
    } catch {
      toast.error('Произошла ошибка при сохранении профиля');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const currentRoleInfo = roleDescriptions[role] || roleDescriptions.owner;
  const avatarLetter = (userName || 'А').charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-6 overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Карточка профиля учетной записи</h2>
              <p className="text-xs text-slate-500">Персональные данные, настройки безопасности и права доступа</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
            title="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* 1. HERO PROFILE CARD */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-slate-50 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-2xl font-bold text-white shadow-md">
                  {avatarLetter}
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
                  </span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{userName || 'Пользователь CRM'}</h3>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold border', currentRoleInfo.badgeClass)}>
                      {currentRoleInfo.title.split(' ')[0]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">{userEmail || 'admin@smartacademy.ru'}</p>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>Smart Academy • Центральный филиал</span>
                  </p>
                </div>
              </div>

              {/* Action Button: Edit Profile */}
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all shrink-0 active:scale-98"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Изменить профиль
                </button>
              )}
            </div>
          </div>

          {/* 2. MODE SWITCH: VIEW vs EDIT */}
          {!isEditing ? (
            /* VIEW MODE */
            <div className="space-y-6">
              {/* Section: Personal Info */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-blue-600" />
                    Персональные данные
                  </span>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" />
                    Изменить
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">ФИО сотрудника</p>
                    <p className="font-semibold text-slate-900">{userName || 'Не указано'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Электронная почта</p>
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {userEmail || 'Не указан'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Контактный телефон</p>
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {userPhone || '+7 (999) 123-45-67'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Telegram для уведомлений</p>
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Send className="h-3.5 w-3.5 text-blue-500" />
                      {userTelegram || '@alex_smart'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section: Role and Access Permissions */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2 gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-purple-600" />
                    Уровень доступа и роль в системе
                  </span>
                  {isOwnerAccount && (
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                      Учетная запись владельца
                    </span>
                  )}
                </div>

                {/* Role switcher ONLY for owner account */}
                {isOwnerAccount ? (
                  <div className="rounded-xl bg-purple-50/70 border border-purple-200/80 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        Переключение роли интерфейса CRM
                      </span>
                      <span className="text-[10px] font-bold text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200">
                        Только для владельца
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-800 leading-relaxed">
                      Вы можете переключить режим работы системы на <strong>Администратора</strong> или <strong>Преподавателя</strong>. Выбранная роль немедленно применится ко всему интерфейсу (боковое меню, главный дашборд, доступ к разделам) и останется активной до следующего переключения в этой карточке.
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-1.5">
                      {(['owner', 'admin', 'teacher'] as UserRole[]).map((r) => {
                        const isActive = role === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              setRole(r);
                              toast.info(`Режим роли переключен на «${roleDescriptions[r].title.split(' ')[0]}». Изменения применены ко всему интерфейсу.`);
                            }}
                            className={cn(
                              'py-2 px-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer shadow-2xs',
                              isActive
                                ? 'bg-purple-700 text-white border-purple-700 ring-2 ring-purple-400'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                            )}
                          >
                            {r === 'owner' ? 'Владелец' : r === 'admin' ? 'Администратор' : 'Преподаватель'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">Роль учетной записи: {currentRoleInfo.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Роль назначается владельцем школы в разделе управления командой и не может быть изменена пользователем.
                    </p>
                  </div>
                )}

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{currentRoleInfo.title}</p>
                      <p className="text-slate-500 text-[11px]">{currentRoleInfo.subtitle}</p>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Активна
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-600 mb-2">Разрешенные операции роли:</p>
                    <ul className="space-y-1.5">
                      {currentRoleInfo.permissions.map((perm, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{perm}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Section: Organization & Session */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-3">
                  <Building2 className="h-4 w-4 text-slate-600" />
                  Учебное заведение и сессия
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="text-slate-400 font-medium">Школа</p>
                    <p className="font-semibold text-slate-900">Smart Academy</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Филиал</p>
                    <p className="font-semibold text-slate-900">Центральный (ул. Ленина, 42)</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Статус учетной записи</p>
                    <p className="font-semibold text-emerald-600 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      Подтвержден / Активен
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* EDIT MODE */
            <form onSubmit={handleSave} className="space-y-5">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-800 flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <Edit3 className="h-4 w-4 text-blue-600" />
                  Редактирование профиля учетной записи
                </span>
                <span className="text-[11px] text-blue-600">Все изменения сохраняются в системе</span>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ФИО сотрудника *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.userName}
                    onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    placeholder="Иван Иванов"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Электронная почта *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.userEmail}
                    onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    value={formData.userPhone}
                    onChange={(e) => setFormData({ ...formData, userPhone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    placeholder="+7 (999) 000-00-00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Telegram (никнейм)
                  </label>
                  <input
                    type="text"
                    value={formData.userTelegram}
                    onChange={(e) => setFormData({ ...formData, userTelegram: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    placeholder="@username"
                  />
                </div>
              </div>

              {/* Role Select - ONLY if owner account */}
              {isOwnerAccount ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Роль в CRM
                    </label>
                    <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      Доступно владельцу
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'owner', label: 'Владелец', desc: 'Полный доступ' },
                      { key: 'admin', label: 'Администратор', desc: 'Управление' },
                      { key: 'teacher', label: 'Преподаватель', desc: 'Уроки и журнал' },
                    ].map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: r.key as UserRole })}
                        className={cn(
                          'p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                          formData.role === r.key
                            ? 'border-purple-600 bg-purple-50/70 text-purple-950 ring-1 ring-purple-600 font-bold'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        )}
                      >
                        <p className="text-xs font-bold">{r.label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{r.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">Роль в CRM:</span> {currentRoleInfo.title}
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Роль сотрудника назначается владельцем школы и не может быть изменена в профиле.
                  </p>
                </div>
              )}

              {/* Password change section */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="h-4 w-4 text-slate-500" />
                  Смена пароля (необязательно)
                </span>

                {passwordError && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs text-rose-700 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      Новый пароль
                    </label>
                    <input
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                      placeholder="Минимум 6 символов"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      Повторите новый пароль
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
                      placeholder="Повтор пароля"
                    />
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setPasswordError('');
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-98 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Сохранить изменения
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Выйти из аккаунта
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
