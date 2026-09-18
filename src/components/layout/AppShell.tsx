'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { createClient } from '@/lib/supabase/client';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isAuthPage = pathname === '/login' || pathname.startsWith('/auth');

  useEffect(() => {
    if (isAuthPage) {
      setAuthChecked(true);
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login');
      } else {
        setAuthChecked(true);
      }
    }).catch(() => {
      router.replace('/login');
    });
  }, [pathname, isAuthPage, router]);

  // For /login and auth pages: render ONLY the page content, no CRM sidebar/topbar
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Prevent flashing CRM interface before checking session
  if (!authChecked) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--md-background)' }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid var(--md-outline-variant)',
              borderTopColor: 'var(--md-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p className="md-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
            Загрузка...
          </p>
        </div>
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden w-full min-w-0" style={{ backgroundColor: 'var(--md-background)' }}>
      {/* MD3 Navigation Drawer (Desktop collapsible / Mobile slide-in) */}
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden w-full">
        <TopBar onOpenMobile={() => setMobileOpen(true)} />
        <main
          className="flex-1 overflow-y-auto mobile-touch-scroll p-3 sm:p-5 md:p-6 w-full min-w-0 overflow-x-hidden"
          style={{
            paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div className="w-full min-w-0" style={{ maxWidth: '1280px', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>

      {/* MD3 Mobile Bottom Navigation Bar in thumb reach zone */}
      <MobileBottomNav />

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden backdrop-blur-xs transition-opacity"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
