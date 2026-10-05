import { NextRequest, NextResponse } from 'next/server';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { FullStudentData } from '@/lib/data/mockData';

export const dynamic = 'force-dynamic';

export interface MiniAppParentResponse {
  success: boolean;
  parent?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    telegram?: string;
    avatarUrl?: string;
  };
  children: Array<{
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    age: number;
    grade?: string;
    birthDate?: string;
  }>;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId') || searchParams.get('telegram') || '';
    const parentId = searchParams.get('parentId') || '';

    const allStudents = getStoredStudents();

    // 1. Find matching parent from students' parents list
    let matchedParent: any = null;

    for (const st of allStudents) {
      if (!st.parents || st.parents.length === 0) continue;
      for (const p of st.parents) {
        if (parentId && p.id === parentId) {
          matchedParent = p;
          break;
        }
        if (chatId) {
          const normChat = chatId.replace(/^@/, '').trim().toLowerCase();
          const normTg = (p.telegram || '').replace(/^@/, '').trim().toLowerCase();
          const normPhone = (p.phone || '').replace(/[^0-9]/g, '');
          const queryPhone = chatId.replace(/[^0-9]/g, '');

          if (normTg === normChat || (queryPhone.length > 5 && normPhone === queryPhone)) {
            matchedParent = p;
            break;
          }
        }
      }
      if (matchedParent) break;
    }

    // Fallback: If no parent specified or in dev environment, use primary parent p1 (Ольга Смирнова / Соколова)
    if (!matchedParent) {
      const defaultStudent = allStudents.find((s) => s.parents && s.parents.length > 0);
      matchedParent = defaultStudent?.parents?.[0] || {
        id: 'p1',
        firstName: 'Ольга',
        lastName: 'Соколова',
        telegram: '@olga_sokolova',
        phone: '+7 (999) 123-45-67',
      };
    }

    // 2. Resolve all children (students) belonging to this parent
    const childrenList: FullStudentData[] = allStudents.filter((st) => {
      if (!st.parents) return false;
      return st.parents.some((p) => {
        if (p.id === matchedParent.id) return true;
        if (p.telegram && matchedParent.telegram && p.telegram.replace(/^@/, '') === matchedParent.telegram.replace(/^@/, '')) return true;
        if (p.phone && matchedParent.phone && p.phone === matchedParent.phone) return true;
        return false;
      });
    });

    // Helper to calculate student age
    const calculateAge = (birthDateStr?: string): number => {
      if (!birthDateStr) return 14;
      try {
        const bd = new Date(birthDateStr);
        if (isNaN(bd.getTime())) return 14;
        const diff = Date.now() - bd.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      } catch {
        return 14;
      }
    };

    // Format children response
    const formattedChildren = childrenList.map((ch) => ({
      id: ch.id,
      firstName: ch.firstName,
      lastName: ch.lastName,
      fullName: `${ch.firstName} ${ch.lastName}`.trim(),
      age: calculateAge(ch.birthDate),
      grade: ch.grade,
      birthDate: ch.birthDate,
    }));

    return NextResponse.json({
      success: true,
      parent: {
        id: matchedParent.id,
        firstName: matchedParent.firstName,
        lastName: matchedParent.lastName,
        phone: matchedParent.phone,
        telegram: matchedParent.telegram,
        avatarUrl: '/avatars/parent_default.png',
      },
      children: formattedChildren,
    });
  } catch (err: any) {
    console.error('Error fetching parent in Mini App:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
