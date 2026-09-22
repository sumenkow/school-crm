'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminCoursesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings?tab=courses');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-2">
        <p className="text-sm font-semibold text-slate-700">Переход в настройки направлений...</p>
      </div>
    </div>
  );
}
