'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { createClient } from '@/lib/supabase/client';
import { hydrateAllDataFromCloud } from '@/lib/data/cloudSync';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isAuthPage = pathname === '/login' || pathname.startsWith('/auth');
  const isInvoicePage = pathname.startsWith('/invoices');
  const isStandalonePage = isAuthPage || isInvoicePage;

  useEffect(() => {
    if (isStandalonePage) {
      setAuthChecked(true);
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login');
      } else {
        setAuthChecked(true);
        // Hydrate all CRM entities from Supabase Cloud DB
        hydrateAllDataFromCloud();
      }
    }).catch(() => {
      router.replace('/login');
    });

    const handleFocus = () => {
      hydrateAllDataFromCloud();
    };
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        hydrateAllDataFromCloud();
      }
    }, 20000);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      clearInterval(interval);
    };
  }, [pathname, isStandalonePage, router]);

  // For /login, auth pages, and public/printable invoices: render ONLY page content
  if (isStandalonePage) {
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
    <div className="flex h-screen w-full overflow-hidden print:h-auto print:overflow-visible" style={{ backgroundColor: 'var(--md-background)' }}>
      {/* MD3 Navigation Drawer (Desktop collapsible / Mobile slide-in) */}
      <div className="print:hidden">
        <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-h-0 min-w-0 overflow-hidden print:h-auto print:overflow-visible">
        <div className="flex-shrink-0 print:hidden">
          <TopBar onOpenMobile={() => setMobileOpen(true)} />
        </div>
        <main
          className="flex-1 overflow-y-auto min-h-0 relative mobile-touch-scroll p-3 sm:p-4 md:px-6 md:py-3 w-full min-w-0 print:p-0 print:overflow-visible pb-[calc(84px+env(safe-area-inset-bottom,0px))] md:pb-3"
        >
          <div className="w-full min-w-0 print:max-w-none print:w-full" style={{ maxWidth: '1440px', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>

      {/* MD3 Mobile Bottom Navigation Bar in thumb reach zone */}
      <div className="print:hidden">
        <MobileBottomNav />
      </div>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden backdrop-blur-xs transition-opacity print:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
