import React from 'react';
import { X, ChevronRight, LogOut, Globe, DollarSign, Shield, Settings } from 'lucide-react';
import { useLanguage, SupportedLanguage } from '@/context/LanguageContext';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/context/ToastContext';
import { createClient } from '@/lib/supabase/client';
import { CountryFlag } from '@/components/common/CountryFlag';

interface ProfileSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSchoolSettings?: () => void;
}

export function ProfileSettingsSheet({ isOpen, onClose, onOpenSchoolSettings }: ProfileSettingsSheetProps) {
  const { language, setLanguage, t } = useLanguage();
  const { role, userName, userEmail, setRole, isDevAccount, isOwnerAccount, accountRole } = useRole();
  const toast = useToast();

  const [currency, setCurrencyState] = React.useState<'EUR' | 'RUB'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('crm_currency') as 'EUR' | 'RUB') || 'EUR';
    }
    return 'EUR';
  });

  if (!isOpen) return null;

  const handleCurrencyChange = (curr: 'EUR' | 'RUB') => {
    setCurrencyState(curr);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_currency', curr);
    }
    toast.success(`Валюта по умолчанию: ${curr}`);
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_locale', lang);
    }
    toast.success(lang === 'ru' ? '🇷🇺 Русский' : lang === 'en' ? '🇬🇧 English' : '🇩🇪 Deutsch');
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {}
    window.location.href = '/login';
  };

  const roleLabel = role === 'owner' || role === 'developer' ? 'Владелец' : role === 'admin' ? 'Администратор' : 'Преподаватель';
  const avatarLetter = userName ? userName.charAt(0).toUpperCase() : 'A';

  return (
    <>
      {/* Dark Overlay */}
      <div 
        className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="fixed bottom-0 inset-x-0 z-[70] bg-white rounded-t-3xl shadow-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom,20px))] p-5 max-w-lg mx-auto border-t border-slate-100 animate-in slide-in-from-bottom duration-250">
        
        {/* Swipe Handle */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4" />

        {/* Profile Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
              {avatarLetter}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{userName || 'Пользователь'}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  {roleLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500">{userEmail || 'admin@school.com'}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sheet Content */}
        <div className="space-y-5 pt-4">
          
          {/* Language Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Язык интерфейса</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { key: 'ru', flag: 'ru', label: 'RU' },
                { key: 'en', flag: 'en', label: 'EN' },
                { key: 'de', flag: 'de', label: 'DE' },
              ].map((item) => {
                const isActive = language === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleLanguageChange(item.key as SupportedLanguage)}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CountryFlag country={item.key as any} size={15} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Currency Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Валюта по умолчанию</label>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { key: 'EUR', label: '€ EUR' },
                { key: 'RUB', label: '₽ RUB' },
              ].map((item) => {
                const isActive = currency === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleCurrencyChange(item.key as 'EUR' | 'RUB')}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RBAC Role Switcher (Owner / Dev Only) */}
          {(isDevAccount || isOwnerAccount) && (
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Режим отображения (RBAC)</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRole(accountRole === 'developer' ? 'developer' : 'owner')}
                  className={`py-2 rounded-lg text-[11px] font-semibold transition-all ${role === 'owner' || role === 'developer' ? 'bg-purple-600 text-white font-bold shadow-xs' : 'text-slate-600'}`}
                >
                  Владелец
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`py-2 rounded-lg text-[11px] font-semibold transition-all ${role === 'admin' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600'}`}
                >
                  Админ
                </button>
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`py-2 rounded-lg text-[11px] font-semibold transition-all ${role === 'teacher' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-600'}`}
                >
                  Педагог
                </button>
              </div>
            </div>
          )}

          {/* Link to School Settings */}
          <div 
            onClick={() => {
              onClose();
              if (onOpenSchoolSettings) onOpenSchoolSettings();
              else window.location.href = '/settings';
            }}
            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Settings size={16} className="text-slate-500" />
              <span>Настройки школы и интеграции</span>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3 text-rose-600 font-bold text-xs bg-rose-50 rounded-xl hover:bg-rose-100 active:bg-rose-200 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={16} /> Выйти из аккаунта
          </button>

        </div>
      </div>
    </>
  );
}
