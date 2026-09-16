'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLanguage, LANGUAGE_LABELS, SupportedLanguage } from '@/context/LanguageContext';
import { useRole } from '@/context/RoleContext';
import { School, Eye, EyeOff, LogIn, Sparkles, UserCheck, Shield, MonitorPlay } from 'lucide-react';

export default function LoginPage() {
  const { language, setLanguage, t } = useLanguage();
  const { setRole } = useRole();
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

  const handleQuickDemoLogin = (role: 'owner' | 'teacher' | 'admin') => {
    setRole(role);
    window.location.href = role === 'teacher' ? '/teacher' : '/dashboard';
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6"
      style={{
        backgroundColor: 'var(--md-background)',
        paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Top language selector */}
      <div className="mb-4 flex items-center gap-1 bg-white/80 p-1 rounded-full border border-slate-200 shadow-2xs">
        {(['ru', 'en', 'de'] as SupportedLanguage[]).map((langKey) => {
          const isSelected = language === langKey;
          const meta = LANGUAGE_LABELS[langKey];
          return (
            <button
              key={langKey}
              type="button"
              onClick={() => setLanguage(langKey)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{meta.flag}</span>
              <span>{meta.short}</span>
            </button>
          );
        })}
      </div>

      {/* Login Card */}
      <div
        className="w-full max-w-sm rounded-3xl p-6 sm:p-8 bg-white shadow-md border border-slate-200/80"
        style={{
          backgroundColor: 'var(--md-surface-container-lowest, #FFFFFF)',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-md mb-3"
            style={{
              backgroundColor: 'var(--md-primary, #1565C0)',
            }}
          >
            <School size={28} />
          </div>
          <h1
            className="text-xl font-extrabold tracking-tight text-slate-900 text-center"
          >
            School CRM
          </h1>
          <p className="text-xs text-slate-500 text-center mt-1">
            {t('app.subtitle', 'Единая система управления школой')}
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
              marginTop: '4px',
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

        {/* Quick Demo Logins for instant mobile review */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5">
            Быстрый вход для проверки (1 клик):
          </p>
          <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('owner')}
              className="px-2 py-2 rounded-xl bg-purple-50 text-purple-800 hover:bg-purple-100 active:scale-95 transition-all text-center flex flex-col items-center gap-1 border border-purple-200/60"
              title="Войти как Директор"
            >
              <Shield size={16} className="text-purple-600" />
              <span className="text-[10px] font-bold">Директор</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('teacher')}
              className="px-2 py-2 rounded-xl bg-blue-50 text-blue-800 hover:bg-blue-100 active:scale-95 transition-all text-center flex flex-col items-center gap-1 border border-blue-200/60"
              title="Войти как Учитель"
            >
              <MonitorPlay size={16} className="text-blue-600" />
              <span className="text-[10px] font-bold">Учитель</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin')}
              className="px-2 py-2 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all text-center flex flex-col items-center gap-1 border border-emerald-200/60"
              title="Войти как Администратор"
            >
              <UserCheck size={16} className="text-emerald-600" />
              <span className="text-[10px] font-bold">Админ</span>
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p
          className="md-body-small"
          style={{
            color: 'var(--md-on-surface-variant)',
            textAlign: 'center',
            marginTop: '16px',
            fontSize: '11px',
          }}
        >
          YouEurope School CRM • Mobile Optimized
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
