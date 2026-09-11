'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  UserPlus,
  Trash2,
  Copy,
  Check,
  Shield,
  GraduationCap,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Users2,
  Plus
} from 'lucide-react';
import { useRole } from '@/context/RoleContext';

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'admin' | 'teacher';
  phone?: string;
  is_active: boolean;
  created_at: string;
}

const ROLES_INFO = {
  owner: {
    label: 'Владелец',
    bg: 'var(--md-tertiary-container, #EEDCFF)',
    color: 'var(--md-on-tertiary-container, #28123C)',
    desc: 'Полный доступ ко всем разделам, аналитике школы, настройкам и управлению сотрудниками.',
  },
  admin: {
    label: 'Администратор',
    bg: 'var(--md-secondary-container)',
    color: 'var(--md-on-secondary-container)',
    desc: 'Управление учениками, родителями, группами, лидами, расписанием и фиксация оплат.',
  },
  teacher: {
    label: 'Преподаватель',
    bg: 'var(--md-primary-container)',
    color: 'var(--md-on-primary-container)',
    desc: 'Доступ только к своим занятиям, журналу посещаемости и группам, которые он ведет.',
  },
};

function TeamContent() {
  const { isOwner, role: currentRole } = useRole();
  const searchParams = useSearchParams();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Modal / Form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'teacher'>('teacher');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Created credential modal
  const [createdUser, setCreatedUser] = useState<{
    email: string;
    password?: string;
    fullName: string;
    role: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate strong random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    return res;
  };

  // Open modal with pre-selected role
  const openCreateModalForRole = useCallback((targetRole: 'admin' | 'teacher') => {
    setRole(targetRole);
    generatePassword();
    setCreateError('');
    setShowCreateModal(true);
  }, []);

  // Check URL query params for ?role=teacher or ?role=admin
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'teacher' || roleParam === 'admin') {
      openCreateModalForRole(roleParam);
    }
  }, [searchParams, openCreateModalForRole]);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ошибка загрузки команды');
      } else {
        setMembers(data.users || []);
      }
    } catch {
      setError('Не удалось подключиться к серверу');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) {
      loadTeam();
    }
  }, [isOwner, loadTeam]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          full_name: fullName.trim(),
          role,
          phone: phone.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error || 'Ошибка при создании учетной записи');
      } else {
        setCreatedUser({
          email: email.trim(),
          password: data.user?.generatedPassword || password,
          fullName: fullName.trim(),
          role: ROLES_INFO[role].label,
        });
        setShowCreateModal(false);
        setFullName('');
        setEmail('');
        setPhone('');
        setPassword('');
        loadTeam();
      }
    } catch {
      setCreateError('Сетевая ошибка при создании пользователя');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Вы действительно хотите удалить учетную запись «${name}»? Доступ будет немедленно отозван.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/auth/users?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Ошибка удаления');
      } else {
        setActionSuccess(`Сотрудник ${name} удален`);
        setTimeout(() => setActionSuccess(''), 4000);
        loadTeam();
      }
    } catch {
      alert('Ошибка при удалении');
    }
  };

  const copyCredentials = () => {
    if (!createdUser) return;
    const text = `Данные для доступа в School CRM:\nАдрес: ${window.location.origin}/login\nЛогин: ${createdUser.email}\nПароль: ${createdUser.password}\nРоль: ${createdUser.role}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!isOwner && currentRole !== 'owner') {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="md-headline-medium" style={{ color: 'var(--md-on-surface)' }}>Команда</h1>
        <div className="md-card-outlined" style={{ padding: '48px', textAlign: 'center' }}>
          <Shield size={48} style={{ color: 'var(--md-on-surface-variant)', margin: '0 auto 16px' }} />
          <p className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>Доступ ограничен</p>
          <p className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)', marginTop: '8px' }}>
            Раздел создания и управления учетными записями доступен только владельцу школы.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Header with Quick Role-Specific Create Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="md-headline-medium" style={{ color: 'var(--md-on-surface)' }}>
            Команда и учетные записи
          </h1>
          <p className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
            Создавайте учетные записи с разграничением прав для преподавателей и администраторов
          </p>
        </div>

        {/* Buttons with pre-assigned roles */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openCreateModalForRole('teacher')}
            className="md-btn md-btn-filled"
            style={{ gap: '8px' }}
          >
            <GraduationCap size={18} />
            + Добавить преподавателя
          </button>
          <button
            onClick={() => openCreateModalForRole('admin')}
            className="md-btn md-btn-tonal"
            style={{ gap: '8px' }}
          >
            <Shield size={18} />
            + Добавить администратора
          </button>
        </div>
      </div>

      {/* Success banner */}
      {actionSuccess && (
        <div
          style={{
            backgroundColor: 'var(--md-success-container)',
            color: 'var(--md-on-success-container)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={18} />
          <span className="md-body-medium">{actionSuccess}</span>
        </div>
      )}

      {/* Roles comparison cards WITH DIRECT ACTION BUTTONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Teacher Card */}
        <div
          className="md-card-outlined flex flex-col justify-between"
          style={{
            padding: '18px',
            gap: '12px',
            borderColor: 'var(--md-primary)',
            backgroundColor: 'var(--md-surface-container-low)',
          }}
        >
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
              <span
                className="md-label-medium"
                style={{
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  backgroundColor: ROLES_INFO.teacher.bg,
                  color: ROLES_INFO.teacher.color,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <GraduationCap size={14} />
                Преподаватель
              </span>
            </div>
            <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
              {ROLES_INFO.teacher.desc}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openCreateModalForRole('teacher')}
            className="md-btn md-btn-filled md-btn-sm"
            style={{ width: '100%', justifyContent: 'center', gap: '6px', marginTop: '8px' }}
          >
            <Plus size={14} />
            Создать аккаунт учителя
          </button>
        </div>

        {/* Admin Card */}
        <div
          className="md-card-outlined flex flex-col justify-between"
          style={{
            padding: '18px',
            gap: '12px',
            borderColor: 'var(--md-outline)',
            backgroundColor: 'var(--md-surface-container-low)',
          }}
        >
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
              <span
                className="md-label-medium"
                style={{
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  backgroundColor: ROLES_INFO.admin.bg,
                  color: ROLES_INFO.admin.color,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Shield size={14} />
                Администратор
              </span>
            </div>
            <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
              {ROLES_INFO.admin.desc}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openCreateModalForRole('admin')}
            className="md-btn md-btn-tonal md-btn-sm"
            style={{ width: '100%', justifyContent: 'center', gap: '6px', marginTop: '8px' }}
          >
            <Plus size={14} />
            Создать аккаунт администратора
          </button>
        </div>

        {/* Owner Card */}
        <div
          className="md-card-outlined flex flex-col justify-between"
          style={{
            padding: '18px',
            gap: '12px',
            backgroundColor: 'var(--md-surface-container-low)',
          }}
        >
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
              <span
                className="md-label-medium"
                style={{
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  backgroundColor: ROLES_INFO.owner.bg,
                  color: ROLES_INFO.owner.color,
                  fontWeight: 600,
                }}
              >
                Владелец школы
              </span>
            </div>
            <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
              {ROLES_INFO.owner.desc}
            </p>
          </div>
          <div style={{ paddingTop: '8px' }}>
            <span
              className="md-label-small"
              style={{
                display: 'inline-block',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--md-surface-container-high)',
                color: 'var(--md-on-surface-variant)',
                width: '100%',
                textAlign: 'center',
              }}
            >
              Ваша текущая роль
            </span>
          </div>
        </div>
      </div>

      {/* Team table / list */}
      <div className="md-card-elevated" style={{ padding: '0', overflow: 'hidden' }}>
        <div
          className="flex items-center justify-between"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--md-outline-variant)',
          }}
        >
          <div className="flex items-center gap-2">
            <Users2 size={20} style={{ color: 'var(--md-primary)' }} />
            <h2 className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>
              Сотрудники ({members.length})
            </h2>
          </div>
          <button
            onClick={loadTeam}
            disabled={loading}
            className="md-btn md-btn-text md-btn-sm"
            style={{ gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Обновить
          </button>
        </div>

        {error ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--md-error)' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
            <p className="md-body-medium">{error}</p>
          </div>
        ) : loading && members.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
              Загрузка списка команды...
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--md-surface-container-low)', borderBottom: '1px solid var(--md-outline-variant)' }}>
                  <th style={{ padding: '12px 20px' }} className="md-label-large">Сотрудник</th>
                  <th style={{ padding: '12px 20px' }} className="md-label-large">Email (Логин)</th>
                  <th style={{ padding: '12px 20px' }} className="md-label-large">Роль</th>
                  <th style={{ padding: '12px 20px' }} className="md-label-large">Телефон</th>
                  <th style={{ padding: '12px 20px' }} className="md-label-large">Дата добавления</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }} className="md-label-large">Действия</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const rInfo = ROLES_INFO[m.role] || ROLES_INFO.teacher;
                  const isCurrent = m.role === 'owner';
                  return (
                    <tr
                      key={m.id}
                      style={{
                        borderBottom: '1px solid var(--md-outline-variant)',
                        transition: 'background-color 0.1s',
                      }}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div className="flex items-center gap-3">
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: rInfo.bg,
                              color: rInfo.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '14px',
                            }}
                          >
                            {(m.full_name || m.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>
                              {m.full_name || 'Без имени'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
                          {m.email}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          className="md-label-small"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            backgroundColor: rInfo.bg,
                            color: rInfo.color,
                            fontWeight: 600,
                          }}
                        >
                          {m.role === 'teacher' && <GraduationCap size={12} />}
                          {m.role === 'admin' && <Shield size={12} />}
                          {rInfo.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
                          {m.phone || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                          {m.created_at ? new Date(m.created_at).toLocaleDateString('ru-RU') : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {!isCurrent && (
                          <button
                            onClick={() => handleDelete(m.id, m.full_name || m.email)}
                            title="Удалить сотрудника"
                            className="md-btn md-btn-text md-btn-sm"
                            style={{ color: 'var(--md-error)', padding: '6px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create User Account with pre-selected role */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="w-full max-w-lg md-card-elevated"
            style={{
              padding: '28px',
              backgroundColor: 'var(--md-surface-container-lowest)',
              borderRadius: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
              <div className="flex items-center gap-3">
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    backgroundColor: role === 'teacher' ? 'var(--md-primary-container)' : 'var(--md-secondary-container)',
                    color: role === 'teacher' ? 'var(--md-on-primary-container)' : 'var(--md-on-secondary-container)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {role === 'teacher' ? <GraduationCap size={20} /> : <Shield size={20} />}
                </div>
                <div>
                  <h2 className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>
                    Новый {role === 'teacher' ? 'преподаватель' : 'администратор'}
                  </h2>
                  <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                    {role === 'teacher'
                      ? 'Доступ к занятиям, группам и журналу посещаемости'
                      : 'Доступ к ученикам, лидам, финансам и задачам'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="md-btn md-btn-text md-btn-sm"
                style={{ padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Role selection tabs in modal */}
              <div>
                <label className="md-label-large" style={{ color: 'var(--md-on-surface-variant)', display: 'block', marginBottom: '8px' }}>
                  Назначенная роль:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: `2px solid ${role === 'teacher' ? 'var(--md-primary)' : 'var(--md-outline-variant)'}`,
                      backgroundColor: role === 'teacher' ? 'var(--md-primary-container)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <GraduationCap size={18} style={{ color: role === 'teacher' ? 'var(--md-primary)' : 'var(--md-on-surface-variant)' }} />
                    <span className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>Преподаватель</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: `2px solid ${role === 'admin' ? 'var(--md-primary)' : 'var(--md-outline-variant)'}`,
                      backgroundColor: role === 'admin' ? 'var(--md-primary-container)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Shield size={18} style={{ color: role === 'admin' ? 'var(--md-primary)' : 'var(--md-on-surface-variant)' }} />
                    <span className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>Администратор</span>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="md-label-large" style={{ color: 'var(--md-on-surface-variant)', display: 'block', marginBottom: '6px' }}>
                  ФИО сотрудника *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Иванова Ольга Петровна"
                  className="md-input"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Email */}
              <div>
                <label className="md-label-large" style={{ color: 'var(--md-on-surface-variant)', display: 'block', marginBottom: '6px' }}>
                  Email (логин для входа) *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="olga.teacher@school.ru"
                  className="md-input"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="md-label-large" style={{ color: 'var(--md-on-surface-variant)', display: 'block', marginBottom: '6px' }}>
                  Телефон
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  className="md-input"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Password with generator */}
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
                  <label className="md-label-large" style={{ color: 'var(--md-on-surface-variant)' }}>
                    Пароль *
                  </label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="md-label-small"
                    style={{
                      color: 'var(--md-primary)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <RefreshCw size={12} />
                    Сгенерировать
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Пароль для входа"
                    className="md-input"
                    style={{ width: '100%', paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--md-on-surface-variant)',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {createError && (
                <div
                  style={{
                    backgroundColor: 'var(--md-error-container)',
                    color: 'var(--md-on-error-container)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span className="md-body-medium">{createError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2" style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="md-btn md-btn-text"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="md-btn md-btn-filled"
                >
                  {createLoading ? 'Создание...' : `Создать ${role === 'teacher' ? 'учителя' : 'администратора'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal with Credentials to Copy */}
      {createdUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="w-full max-w-md md-card-elevated"
            style={{
              padding: '28px',
              backgroundColor: 'var(--md-surface-container-lowest)',
              borderRadius: '24px',
            }}
          >
            <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--md-success-container)',
                  color: 'var(--md-on-success-container)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={20} />
              </div>
              <div>
                <h3 className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>
                  Учетная запись создана!
                </h3>
                <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                  Передайте данные сотруднику для первого входа
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--md-surface-container)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                margin: '16px 0',
              }}
            >
              <div>
                <span className="md-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>Сотрудник:</span>
                <p className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>{createdUser.fullName}</p>
              </div>
              <div>
                <span className="md-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>Роль:</span>
                <p className="md-label-large" style={{ color: 'var(--md-primary)' }}>{createdUser.role}</p>
              </div>
              <div>
                <span className="md-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>Логин (Email):</span>
                <p className="md-label-large" style={{ color: 'var(--md-on-surface)', fontFamily: 'monospace' }}>{createdUser.email}</p>
              </div>
              <div>
                <span className="md-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>Пароль:</span>
                <p className="md-label-large" style={{ color: 'var(--md-on-surface)', fontFamily: 'monospace' }}>{createdUser.password}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={copyCredentials}
                className="md-btn md-btn-filled"
                style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Данные скопированы!' : 'Скопировать данные для сотрудника'}
              </button>
              <button
                onClick={() => setCreatedUser(null)}
                className="md-btn md-btn-outlined"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeamManagementPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Загрузка...</div>}>
      <TeamContent />
    </Suspense>
  );
}
