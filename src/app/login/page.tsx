'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLanguage, LANGUAGE_LABELS, SupportedLanguage } from '@/context/LanguageContext';

import { School, Eye, EyeOff, LogIn } from 'lucide-react';
import { CountryFlag } from '@/components/common/CountryFlag';

export default function LoginPage() {
  const { language, setLanguage, t } = useLanguage();
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
          ? t('login.errorInvalidCredentials')
          : error.message === 'Email not confirmed'
          ? t('login.errorEmailNotConfirmed')
          : t('login.errorGeneral')
      );
      setLoading(false);
      return;
    }

    // Redirect handled by middleware after session cookie is set
    window.location.href = '/dashboard';
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
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CountryFlag country={langKey} size={15} />
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
              {t('login.passwordLabel')}
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
                aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
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
                {t('login.signingIn')}
              </span>
            ) : (
              <>
                <LogIn size={18} />
                {t('login.submitBtn')}
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
            marginTop: '16px',
            fontSize: '11px',
          }}
        >
          YouEurope School CRM • Mobile Optimized
        </p>
      </div>

      {/* Version */}
      <p className="md-label-small" style={{ color: 'var(--md-on-surface-variant)', marginTop: '24px' }}>
        School CRM • v2.4
      </p>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
