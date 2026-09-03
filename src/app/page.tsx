'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/RoleContext';

export default function HomePage() {
  const router = useRouter();
  const { role } = useRole();

  useEffect(() => {
    if (role === 'teacher') {
      router.replace('/teacher');
    } else {
      router.replace('/dashboard');
    }
  }, [role, router]);

  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="flex items-center gap-3 text-slate-500">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span className="text-sm font-medium">Загрузка интерфейса...</span>
      </div>
    </div>
  );
}
