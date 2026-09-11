'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { School, Eye, EyeOff, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Неверный email или пароль'
          : error.message === 'Email not confirmed'
          ? 'Подтвердите email перед входом'
          : 'Ошибка входа. Попробуйте ещё раз.'
      );
      setLoading(false);
      return;
    }

    // Redirect handled by middleware after session cookie is set
    window.location.href = '/dashboard';
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        backgroundColor: 'var(--md-background)',
        padding: '24px',
      }}
    >
      {/* Login Card */}
      <div
        className="w-full max-w-sm"
        style={{
          backgroundColor: 'var(--md-surface-container-lowest)',
          borderRadius: '28px',
          padding: '40px 32px 32px',
          boxShadow: 'var(--md-elevation-1)',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center" style={{ marginBottom: '32px' }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: 'var(--md-primary)',
              color: 'var(--md-on-primary)',
              marginBottom: '16px',
            }}
          >
            <School size={32} />
          </div>
          <h1
            className="md-headline-small"
            style={{ color: 'var(--md-on-surface)', marginBottom: '4px', textAlign: 'center' }}
          >
            School CRM
          </h1>
          <p className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)', textAlign: 'center' }}>
            Войдите в систему управления
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Email field */}
          <div>
            <label
              className="md-label-large"
              style={{ color: 'var(--md-on-surface-variant)', display: 'block', marginBottom: '6px' }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@school.ru"
              className="md-input"
              style={{ width: '100%' }}
            />
          </div>

          {/* Password field */}
          <div>
            <label
              className="md-label-large"
              style={{ color: 'var(--md-on-surface-variant)', display: 'block', marginBottom: '6px' }}
            >
              Пароль
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="md-input"
                style={{ width: '100%', paddingRight: '48px' }}
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
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div
              style={{
                backgroundColor: 'var(--md-error-container)',
                color: 'var(--md-on-error-container)',
                borderRadius: '12px',
                padding: '12px 16px',
              }}
              className="md-body-medium"
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="md-btn md-btn-filled"
            style={{
              width: '100%',
              marginTop: '8px',
              opacity: loading ? 0.7 : 1,
              justifyContent: 'center',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg
                  style={{ animation: 'spin 1s linear infinite', width: '18px', height: '18px' }}
                  viewBox="0 0 24 24" fill="none"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
                </svg>
                Вход...
              </span>
            ) : (
              <>
                <LogIn size={18} />
                Войти
              </>
            )}
          </button>
        </form>

        {/* Footer note */}
        <p
          className="md-body-small"
          style={{
            color: 'var(--md-on-surface-variant)',
            textAlign: 'center',
            marginTop: '24px',
          }}
        >
          Нет доступа? Попросите руководителя<br />отправить вам приглашение.
        </p>
      </div>

      {/* Version */}
      <p className="md-label-small" style={{ color: 'var(--md-on-surface-variant)', marginTop: '24px' }}>
        School CRM • Material Design 3
      </p>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
