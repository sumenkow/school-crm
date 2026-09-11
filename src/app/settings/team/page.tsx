'use client';

import React, { useState } from 'react';
import { UserPlus, Send, CheckCircle2, AlertCircle, Mail, User, Shield } from 'lucide-react';
import { useRole } from '@/context/RoleContext';
import type { UserRole } from '@/types';

const ROLES: { value: 'admin' | 'teacher'; label: string; description: string }[] = [
  { value: 'admin', label: 'Администратор', description: 'Управление учениками, лидами, финансами. Без аналитики и настроек.' },
  { value: 'teacher', label: 'Преподаватель', description: 'Свои занятия, группы, журнал посещаемости.' },
];

export default function TeamPage() {
  const { isOwner } = useRole();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'teacher'>('teacher');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  if (!isOwner) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h1 className="md-headline-medium" style={{ color: 'var(--md-on-surface)' }}>Команда</h1>
        </div>
        <div className="md-card-outlined" style={{ padding: '40px', textAlign: 'center' }}>
          <Shield size={48} style={{ color: 'var(--md-on-surface-variant)', margin: '0 auto 16px' }} />
          <p className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>Только для владельца</p>
          <p className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)', marginTop: '8px' }}>
            Управление командой доступно только владельцу школы.
          </p>
        </div>
      </div>
    );
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, full_name: fullName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка при отправке приглашения');
      } else {
        setSuccess(`Приглашение отправлено на ${email}. Сотрудник получит письмо с ссылкой для входа.`);
        setEmail('');
        setFullName('');
        setRole('teacher');
      }
    } catch {
      setError('Сетевая ошибка. Проверьте подключение и попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Header */}
      <div>
        <h1 className="md-headline-medium" style={{ color: 'var(--md-on-surface)' }}>Команда</h1>
        <p className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)', marginTop: '4px' }}>
          Пригласите сотрудников — они получат email с ссылкой для входа
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Invite form */}
        <div className="md-card-elevated" style={{ padding: '24px' }}>
          <div className="flex items-center gap-3" style={{ marginBottom: '24px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              backgroundColor: 'var(--md-primary-container)',
              color: 'var(--md-on-primary-container)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserPlus size={20} />
            </div>
            <h2 className="md-title-medium" style={{ color: 'var(--md-on-surface)' }}>
              Пригласить сотрудника
            </h2>
          </div>

          <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Full name */}
            <div>
              <label className="md-label-large" style={{ color: 'var(--md-on-surface-variant)', display: 'block', marginBottom: '6px' }}>
                <User size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Имя и фамилия
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Мария Иванова"
                className="md-input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Email */}
            <div>
              <label className="md-label-large" style={{ color: 'var(--md-on-surface-variant)', display: 'block', marginBottom: '6px' }}>
                <Mail size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="teacher@school.ru"
                className="md-input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Role selector */}
            <div>
              <label className="md-label-large" style={{ color: 'var(--md-on-surface-variant)', display: 'block', marginBottom: '10px' }}>
                <Shield size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Роль в системе
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ROLES.map((r) => (
                  <label
                    key={r.value}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px',
                      padding: '14px',
                      borderRadius: '12px',
                      border: `2px solid ${role === r.value ? 'var(--md-primary)' : 'var(--md-outline-variant)'}`,
                      backgroundColor: role === r.value ? 'var(--md-primary-container)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={role === r.value}
                      onChange={() => setRole(r.value)}
                      style={{ marginTop: '2px', accentColor: 'var(--md-primary)' }}
                    />
                    <div>
                      <p className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>{r.label}</p>
                      <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)', marginTop: '2px' }}>
                        {r.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Feedback */}
            {error && (
              <div style={{
                backgroundColor: 'var(--md-error-container)', color: 'var(--md-on-error-container)',
                borderRadius: '12px', padding: '12px 16px',
                display: 'flex', alignItems: 'flex-start', gap: '10px',
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span className="md-body-medium">{error}</span>
              </div>
            )}
            {success && (
              <div style={{
                backgroundColor: 'var(--md-success-container)', color: 'var(--md-on-success-container)',
                borderRadius: '12px', padding: '12px 16px',
                display: 'flex', alignItems: 'flex-start', gap: '10px',
              }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span className="md-body-medium">{success}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="md-btn md-btn-filled"
              style={{ justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Отправка...' : (
                <>
                  <Send size={18} />
                  Отправить приглашение
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <div className="md-card-filled" style={{ padding: '20px' }}>
            <h3 className="md-title-small" style={{ color: 'var(--md-on-surface)', marginBottom: '12px' }}>
              Как работает приглашение
            </h3>
            {[
              { step: '1', text: 'Вы вводите email и роль сотрудника' },
              { step: '2', text: 'Сотрудник получает письмо со ссылкой для входа' },
              { step: '3', text: 'Он переходит по ссылке и задаёт свой пароль' },
              { step: '4', text: 'Система открывается с его ролью автоматически' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3" style={{ marginBottom: '10px' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: 'var(--md-primary)', color: 'var(--md-on-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700,
                }}>
                  {item.step}
                </div>
                <p className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)', paddingTop: '2px' }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div className="md-card-outlined" style={{ padding: '16px' }}>
            <p className="md-label-medium" style={{ color: 'var(--md-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Права ролей
            </p>
            {[
              { role: 'Владелец', rights: 'Полный доступ ко всему, включая аналитику, настройки и управление командой' },
              { role: 'Администратор', rights: 'Ученики, лиды, финансы, задачи, группы, преподаватели' },
              { role: 'Преподаватель', rights: 'Только свои занятия, группы и журнал посещаемости' },
            ].map((item) => (
              <div key={item.role} style={{ marginBottom: '10px' }}>
                <p className="md-label-large" style={{ color: 'var(--md-on-surface)' }}>{item.role}</p>
                <p className="md-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>{item.rights}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
