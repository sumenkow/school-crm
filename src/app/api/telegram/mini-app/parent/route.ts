import { NextRequest, NextResponse } from 'next/server';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { FullStudentData } from '@/lib/data/mockData';
import { createAdminClient } from '@/lib/supabase/admin';

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

// Helper to calculate student age
function calculateAge(birthDateStr?: string): number {
  if (!birthDateStr) return 14;
  try {
    const bd = new Date(birthDateStr);
    if (isNaN(bd.getTime())) return 14;
    const diff = Date.now() - bd.getTime();
    return Math.max(4, Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)));
  } catch {
    return 14;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = (searchParams.get('chatId') || searchParams.get('telegram') || '').trim();
    const username = (searchParams.get('username') || '').trim();
    const parentId = (searchParams.get('parentId') || '').trim();
    const studentId = (searchParams.get('studentId') || '').trim();
    const leadId = (searchParams.get('leadId') || '').trim();
    const tgFirstName = (searchParams.get('tgFirstName') || '').trim();
    const tgLastName = (searchParams.get('tgLastName') || '').trim();

    const searchTerms: string[] = [];
    if (chatId) {
      searchTerms.push(chatId);
      searchTerms.push(chatId.replace(/^@/, ''));
    }
    if (username) {
      searchTerms.push(username.replace(/^@/, ''));
      searchTerms.push(`@${username.replace(/^@/, '')}`);
    }

    let matchedParent: any = null;
    let matchedChildren: any[] = [];

    // =========================================================================
    // 1. QUERY SUPABASE (Real Production Data)
    // =========================================================================
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const supabase = createAdminClient();

        // 1.1 Direct parentId lookup
        if (parentId) {
          const { data: pData } = await supabase.from('parents').select('*').eq('id', parentId).maybeSingle();
          if (pData) {
            matchedParent = {
              id: pData.id,
              firstName: pData.first_name || pData.fullName?.split(' ')[0] || '',
              lastName: pData.last_name || pData.fullName?.split(' ').slice(1).join(' ') || '',
              phone: pData.phone,
              telegram: pData.telegram,
            };

            // Fetch children
            const { data: chData } = await supabase.from('students').select('*').eq('parent_id', pData.id);
            if (chData && chData.length > 0) {
              matchedChildren = chData;
            }
          }
        }

        // 1.2 Direct studentId lookup
        if (!matchedParent && studentId) {
          const { data: sData } = await supabase.from('students').select('*').eq('id', studentId).maybeSingle();
          if (sData) {
            matchedChildren = [sData];
            if (sData.parent_id) {
              const { data: pData } = await supabase.from('parents').select('*').eq('id', sData.parent_id).maybeSingle();
              if (pData) {
                matchedParent = {
                  id: pData.id,
                  firstName: pData.first_name || pData.full_name?.split(' ')[0] || '',
                  lastName: pData.last_name || pData.full_name?.split(' ').slice(1).join(' ') || '',
                  phone: pData.phone,
                  telegram: pData.telegram,
                };
              }
            }
            if (!matchedParent) {
              matchedParent = {
                id: sData.id,
                firstName: sData.first_name || sData.full_name?.split(' ')[0] || '',
                lastName: sData.last_name || sData.full_name?.split(' ').slice(1).join(' ') || '',
                phone: sData.phone,
                telegram: sData.telegram,
              };
            }
          }
        }

        // 1.3 Search by Telegram chatId or username across parents
        if (!matchedParent && searchTerms.length > 0) {
          const { data: allParents } = await supabase.from('parents').select('*');
          if (allParents && allParents.length > 0) {
            const foundParent = allParents.find((p) => {
              if (!p.telegram) return false;
              const pNorm = String(p.telegram).replace(/^@/, '').toLowerCase().trim();
              return searchTerms.some((t) => t.toLowerCase() === pNorm);
            });

            if (foundParent) {
              matchedParent = {
                id: foundParent.id,
                firstName: foundParent.first_name || foundParent.full_name?.split(' ')[0] || '',
                lastName: foundParent.last_name || foundParent.full_name?.split(' ').slice(1).join(' ') || '',
                phone: foundParent.phone,
                telegram: foundParent.telegram,
              };

              const { data: chData } = await supabase.from('students').select('*').eq('parent_id', foundParent.id);
              if (chData && chData.length > 0) {
                matchedChildren = chData;
              }
            }
          }
        }

        // 1.4 Search by Telegram chatId or username across students
        if (!matchedParent && searchTerms.length > 0) {
          const { data: allStudents } = await supabase.from('students').select('*');
          if (allStudents && allStudents.length > 0) {
            const foundStudent = allStudents.find((s) => {
              if (!s.telegram) return false;
              const sNorm = String(s.telegram).replace(/^@/, '').toLowerCase().trim();
              return searchTerms.some((t) => t.toLowerCase() === sNorm);
            });

            if (foundStudent) {
              matchedChildren = [foundStudent];
              if (foundStudent.parent_id) {
                const { data: pData } = await supabase.from('parents').select('*').eq('id', foundStudent.parent_id).maybeSingle();
                if (pData) {
                  matchedParent = {
                    id: pData.id,
                    firstName: pData.first_name || pData.full_name?.split(' ')[0] || '',
                    lastName: pData.last_name || pData.full_name?.split(' ').slice(1).join(' ') || '',
                    phone: pData.phone,
                    telegram: pData.telegram,
                  };
                }
              }
              if (!matchedParent) {
                matchedParent = {
                  id: foundStudent.id,
                  firstName: foundStudent.first_name || foundStudent.full_name?.split(' ')[0] || '',
                  lastName: foundStudent.last_name || foundStudent.full_name?.split(' ').slice(1).join(' ') || '',
                  phone: foundStudent.phone,
                  telegram: foundStudent.telegram,
                };
              }
            }
          }
        }

        // 1.5 Search by Lead
        if (!matchedParent && (leadId || searchTerms.length > 0)) {
          let leadQuery = supabase.from('leads').select('*');
          if (leadId) {
            leadQuery = leadQuery.eq('id', leadId);
          }
          const { data: leads } = await leadQuery;
          if (leads && leads.length > 0) {
            const foundLead = leadId
              ? leads[0]
              : leads.find((l) => {
                  if (!l.telegram) return false;
                  const lNorm = String(l.telegram).replace(/^@/, '').toLowerCase().trim();
                  return searchTerms.some((t) => t.toLowerCase() === lNorm);
                });

            if (foundLead) {
              const pName = foundLead.parent_name || foundLead.name || '';
              const parts = pName.split(' ');
              matchedParent = {
                id: `lead_${foundLead.id}`,
                firstName: parts[0] || '',
                lastName: parts.slice(1).join(' ') || '',
                phone: foundLead.phone || foundLead.contact,
                telegram: foundLead.telegram,
              };

              if (foundLead.student_name) {
                const chParts = foundLead.student_name.split(' ');
                matchedChildren = [
                  {
                    id: `lead_ch_${foundLead.id}`,
                    first_name: chParts[0] || 'Ребенок',
                    last_name: chParts.slice(1).join(' ') || '',
                    birth_date: '2012-05-10',
                  },
                ];
              }
            }
          }
        }
      } catch (dbErr) {
        console.warn('Supabase lookup in /api/telegram/mini-app/parent fallback:', dbErr);
      }
    }

    // =========================================================================
    // 2. IN-MEMORY STORAGE FALLBACK (For offline, dev or mock tests)
    // =========================================================================
    if (!matchedParent) {
      const allStudents = getStoredStudents();

      for (const st of allStudents) {
        if (!st.parents || st.parents.length === 0) continue;
        for (const p of st.parents) {
          if (parentId && p.id === parentId) {
            matchedParent = p;
            break;
          }
          if (chatId || username) {
            const normP = (p.telegram || '').replace(/^@/, '').trim().toLowerCase();
            const normPhone = (p.phone || '').replace(/[^0-9]/g, '');
            const queryPhone = chatId.replace(/[^0-9]/g, '');

            if (searchTerms.some((t) => t.toLowerCase() === normP) || (queryPhone.length > 5 && normPhone === queryPhone)) {
              matchedParent = p;
              break;
            }
          }
        }
        if (matchedParent) break;
      }

      // Check student itself
      if (!matchedParent && (studentId || chatId || username)) {
        const foundSt = allStudents.find((s) => {
          if (studentId && s.id === studentId) return true;
          if (s.telegram) {
            const sNorm = s.telegram.replace(/^@/, '').toLowerCase().trim();
            return searchTerms.some((t) => t.toLowerCase() === sNorm);
          }
          return false;
        });

        if (foundSt) {
          matchedChildren = [foundSt];
          if (foundSt.parents && foundSt.parents.length > 0) {
            matchedParent = foundSt.parents[0];
          } else {
            matchedParent = {
              id: foundSt.id,
              firstName: foundSt.firstName,
              lastName: foundSt.lastName,
              phone: foundSt.phone,
              telegram: foundSt.telegram,
            };
          }
        }
      }

      // Populate children if parent was matched
      if (matchedParent && matchedChildren.length === 0) {
        matchedChildren = allStudents.filter((st) => {
          if (!st.parents) return false;
          return st.parents.some((p) => {
            if (p.id === matchedParent.id) return true;
            if (p.telegram && matchedParent.telegram && p.telegram.replace(/^@/, '') === matchedParent.telegram.replace(/^@/, '')) return true;
            if (p.phone && matchedParent.phone && p.phone === matchedParent.phone) return true;
            return false;
          });
        });
      }
    }

    // =========================================================================
    // 3. TELEGRAM USERNAME / FIRST NAME FALLBACK (Zero Mock Data Ban)
    // =========================================================================
    // If not found in CRM database, but Telegram WebApp sent tgFirstName:
    if (!matchedParent && (tgFirstName || username || chatId)) {
      matchedParent = {
        id: `tg_${chatId || username || 'guest'}`,
        firstName: tgFirstName || username || '',
        lastName: tgLastName || '',
        telegram: username ? `@${username.replace(/^@/, '')}` : (chatId ? `@${chatId}` : ''),
      };
    }

    // Format children
    const formattedChildren = matchedChildren.map((ch: any) => ({
      id: ch.id,
      firstName: ch.first_name || ch.firstName || '',
      lastName: ch.last_name || ch.lastName || '',
      fullName: (`${ch.first_name || ch.firstName || ''} ${ch.last_name || ch.lastName || ''}`).trim() || 'Ученик',
      age: calculateAge(ch.birth_date || ch.birthDate),
      grade: ch.grade,
      birthDate: ch.birth_date || ch.birthDate,
    }));

    return NextResponse.json({
      success: true,
      parent: matchedParent
        ? {
            id: matchedParent.id,
            firstName: matchedParent.firstName || matchedParent.first_name || '',
            lastName: matchedParent.lastName || matchedParent.last_name || '',
            phone: matchedParent.phone || '',
            telegram: matchedParent.telegram || '',
            avatarUrl: '/avatars/parent_default.png',
          }
        : undefined,
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
