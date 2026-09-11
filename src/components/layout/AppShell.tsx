'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
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
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--md-background)' }}>
      {/* MD3 Navigation Drawer */}
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <TopBar onOpenMobile={() => setMobileOpen(true)} />
        <main
          className="flex-1 overflow-y-auto"
          style={{ padding: '24px 24px 48px' }}
        >
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
