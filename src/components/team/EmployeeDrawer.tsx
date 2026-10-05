'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  GraduationCap,
  Crown,
  Key,
  Copy,
  Check,
  Calendar,
  Clock,
  ExternalLink,
  Users,
  History,
  Lock,
  Mail,
  Phone,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { getStoredGroups } from '@/lib/data/groupStorage';
import type { FullGroupData } from '@/lib/data/mockData';

export interface TeamMemberData {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'admin' | 'teacher';
  phone?: string;
  telegram?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  two_factor_enabled?: boolean;
}

interface EmployeeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMemberData | null;
  onSave?: (updatedMember: TeamMemberData) => Promise<void> | void;
  onDeactivateToggle?: (memberId: string, currentStatus: boolean) => Promise<void> | void;
  onResetPassword?: (memberId: string) => Promise<string | null> | void;
}

export function EmployeeDrawer({
  isOpen,
  onClose,
  member,
  onSave,
  onDeactivateToggle,
  onResetPassword,
}: EmployeeDrawerProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'main' | 'roles' | 'schedule' | 'history'>('main');

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [telegram, setTelegram] = useState('');
  const [role, setRole] = useState<'owner' | 'admin' | 'teacher'>('teacher');
  const [isActive, setIsActive] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Groups for teacher schedule
  const [teacherGroups, setTeacherGroups] = useState<FullGroupData[]>([]);

  useEffect(() => {
    if (member) {
      setFullName(member.full_name || '');
      setEmail(member.email || '');
      setPhone(member.phone || '');
      setTelegram(member.telegram || '');
      setRole(member.role || 'teacher');
      setIsActive(member.is_active !== false);
      setTwoFactorEnabled(!!member.two_factor_enabled);
      setNewPassword('');
      setActiveTab('main');

      // Load groups if teacher
      if (member.role === 'teacher') {
        const allGroups = getStoredGroups();
        const matched = allGroups.filter((g) => {
          const tName = (g.teacherName || '').toLowerCase();
          const mName = (member.full_name || '').toLowerCase();
          return tName.includes(mName) || mName.includes(tName);
        });
        setTeacherGroups(matched.length > 0 ? matched : allGroups.slice(0, 2));
      } else {
        setTeacherGroups([]);
      }
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const isOwner = member.role === 'owner';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
    toast.success('Email скопирован в буфер обмена');
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    toast.info('Новый пароль сгенерирован');
  };

  const handleCopyPassword = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
    toast.success('Пароль скопирован в буфер обмена');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Укажите имя сотрудника');
      return;
    }

    setSaving(true);
    try {
      const updated: TeamMemberData = {
        ...member,
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        telegram: telegram.trim() || undefined,
        role: isOwner ? 'owner' : role,
        is_active: isOwner ? true : isActive,
        two_factor_enabled: twoFactorEnabled,
      };

      await onSave?.(updated);
      toast.success('Данные сотрудника успешно сохранены');
      onClose();
    } catch {
      toast.error('Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (roleName: string) => {
    switch (roleName) {
      case 'owner':
        return { label: 'Владелец', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Crown };
      case 'admin':
        return { label: 'Администратор', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Shield };
      case 'teacher':
        return { label: 'Преподаватель', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: GraduationCap };
      default:
        return { label: roleName, color: 'bg-slate-50 text-slate-700 border-slate-200', icon: User };
    }
  };

  const roleInfo = getRoleBadge(member.role);
  const RoleIcon = roleInfo.icon;

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name[0] || 'U').toUpperCase();
  };

  const tabs = [
    { id: 'main', label: 'Основное' },
    { id: 'roles', label: 'Роли и права' },
    { id: 'schedule', label: 'Расписание' },
    { id: 'history', label: 'История' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200/80 bg-slate-50/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold text-base shadow-xs">
                {getInitials(member.full_name)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">
                    {member.full_name}
                  </h2>
                  {isOwner && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                      Системная роль
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                      roleInfo.color
                    )}
                  >
                    <RoleIcon className="h-3 w-3" />
                    {roleInfo.label}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                      member.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        member.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                      )}
                    />
                    {member.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mt-6 border-b border-slate-200/60 pb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2',
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: ОСНОВНОЕ */}
          {activeTab === 'main' && (
            <div className="space-y-6">
              {/* Personal Data */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Личные данные
                </h3>
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      ФИО сотрудника <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="Например: Анна Смирнова"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Электронная почта (логин)
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          readOnly
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50/70 text-slate-600 cursor-default"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="Скопировать email"
                      >
                        {copiedEmail ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedEmail ? 'Скопировано' : 'Копировать'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Телефон
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          placeholder="+7 981 715-53-37"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Telegram
                      </label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={telegram}
                          onChange={(e) => setTelegram(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          placeholder="@username"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security & Additional Info */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Дополнительная информация и безопасность
                </h3>

                <div className="space-y-3">
                  {/* 2FA Toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Двухфакторная аутентификация (2FA)
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          Запрос одноразового кода подтверждения через Telegram или почту
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={twoFactorEnabled}
                        onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Metadata cards */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                      <span className="text-slate-400 block mb-0.5">Дата добавления</span>
                      <span className="font-semibold text-slate-800">
                        {member.created_at ? new Date(member.created_at).toLocaleDateString('ru-RU') : '11 сентября 2026'}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                      <span className="text-slate-400 block mb-0.5">Последний вход</span>
                      <span className="font-semibold text-slate-800">
                        {member.last_login || 'Сегодня, 14:20'}
                      </span>
                    </div>
                  </div>

                  {/* Password Reset Section */}
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-slate-500" />
                        <span className="text-xs font-bold text-slate-800">Сброс пароля сотрудника</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        Сгенерировать
                      </button>
                    </div>

                    {newPassword ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          readOnly
                          value={newPassword}
                          className="flex-1 px-3 py-1.5 text-xs font-mono bg-slate-100 border border-slate-200 rounded-lg text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={handleCopyPassword}
                          className="px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                        >
                          {copiedPassword ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          Копировать
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        Нажмите «Сгенерировать», чтобы создать временный пароль для входа сотрудника.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: РОЛИ И ПРАВА */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Роль в системе
                </h3>

                {isOwner ? (
                  <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/60 space-y-2">
                    <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                      <Crown className="h-4 w-4 text-purple-700" />
                      Владелец (Owner) — Системная роль
                    </div>
                    <p className="text-xs text-purple-800 leading-relaxed">
                      Роль Владельца школы является защищенной системной сущностью. Она предоставляет полный,
                      неотзываемый доступ ко всем модулям, финансовым отчетам и политике безопасности.
                      Понижение роли или деактивация владельца заблокированы на уровне ядра CRM.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={cn(
                        'p-4 rounded-xl border text-left transition-all',
                        role === 'admin'
                          ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm text-slate-900 mb-1">
                        <Shield className="h-4 w-4 text-blue-600" />
                        Администратор
                      </div>
                      <p className="text-xs text-slate-500 leading-snug">
                        Управление CRM, учениками, расписанием и фиксация платежей
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('teacher')}
                      className={cn(
                        'p-4 rounded-xl border text-left transition-all',
                        role === 'teacher'
                          ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center gap-2 font-bold text-sm text-slate-900 mb-1">
                        <GraduationCap className="h-4 w-4 text-emerald-600" />
                        Преподаватель
                      </div>
                      <p className="text-xs text-slate-500 leading-snug">
                        Доступ к своим группам, журналу посещаемости и урокам
                      </p>
                    </button>
                  </div>
                )}
              </div>

              {/* Granted Permissions Summary */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Предоставленные возможности
                </h3>

                <div className="space-y-2">
                  {(role === 'owner' || isOwner) && (
                    <>
                      <div className="flex items-center gap-2.5 text-xs text-slate-700 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Полный доступ к финансовым отчетам, P&L и банковским счетам</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-slate-700 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Управление составом команды, назначение ролей и аудит</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-slate-700 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Экспорт базы данных, резервное копирование и интеграция Telegram</span>
                      </div>
                    </>
                  )}

                  {role === 'admin' && !isOwner && (
                    <>
                      <div className="flex items-center gap-2.5 text-xs text-slate-700 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Ведение воронки продаж, создание лидов и смена стадий сделок</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-slate-700 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Управление группами, расписанием занятий и фиксация оплат</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-slate-700 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Импорт контактов из Excel и создание карточек преподавателей</span>
                      </div>
                    </>
                  )}

                  {role === 'teacher' && !isOwner && (
                    <>
                      <div className="flex items-center gap-2.5 text-xs text-slate-700 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Отметка посещаемости и ведение электронного журнала</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-slate-700 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Просмотр списка закрепленных групп и контактов учеников</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-slate-700 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Добавление комментариев к урокам и домашних заданий</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: РАСПИСАНИЕ И НАГРУЗКА */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              {member.role === 'teacher' ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Учебная нагрузка
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Закрепленные онлайн-группы и расписание уроков
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {teacherGroups.length} активных групп
                    </span>
                  </div>

                  <div className="space-y-3">
                    {teacherGroups.map((group) => (
                      <div
                        key={group.id}
                        className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              {group.name}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {group.courseName || 'Иностранные языки'}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {group.students?.length || 6} учеников
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <Clock className="h-3.5 w-3.5" />
                            {group.schedule || 'Пн, Чт • 18:00–19:30'}
                          </span>
                          <a
                            href={`/groups/${group.id}`}
                            className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                          >
                            В группу <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                  <div className="flex items-center gap-2.5 text-slate-800 font-bold text-sm">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    Рабочие часы онлайн-школы
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Сотрудники с ролью <strong>{roleInfo.label}</strong> осуществляют операционное и административное
                    сопровождение школы в соответствии с общими рабочими часами платформы:
                  </p>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 flex justify-between">
                    <span>График работы:</span>
                    <strong className="text-slate-900">Пн – Вс, 09:00 – 21:00</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ИСТОРИЯ */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Журнал активности сотрудника
              </h3>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                <div className="relative">
                  <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-white" />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800 block">Успешная авторизация в CRM</span>
                    <span className="text-[11px] text-slate-400">Сегодня, 14:20 • IP: 188.163.74.12</span>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-indigo-500 ring-4 ring-white" />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800 block">Обновление настроек безопасности</span>
                    <span className="text-[11px] text-slate-400">3 октября 2026, 11:05 • Подтверждено 2FA</span>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-slate-400 ring-4 ring-white" />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800 block">Создание профиля пользователя</span>
                    <span className="text-[11px] text-slate-400">
                      {member.created_at ? new Date(member.created_at).toLocaleDateString('ru-RU') : '11 сентября 2026'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
          <div>
            {!isOwner && (
              <button
                type="button"
                onClick={() => onDeactivateToggle?.(member.id, member.is_active)}
                className={cn(
                  'px-3 py-2 text-xs font-semibold rounded-lg border transition-colors',
                  member.is_active
                    ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                )}
              >
                {member.is_active ? 'Деактивировать' : 'Активировать'}
              </button>
            )}

            {isOwner && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <Lock className="h-3.5 w-3.5 text-purple-600" />
                <span>Суперпользователь защищен</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
