'use client';

import { FullStudentData, INITIAL_STUDENTS, INITIAL_GROUPS, TimelineInteraction } from './mockData';
import { saveInteractionToStorage, sortTimelineChronologicalDesc } from './timelineStorage';
import { savePaymentToStorage } from './paymentStorage';
import { syncStudentNameCascade, syncParentNameCascade } from './nameCascadeSync';
import { persistEntityToCloud } from './cloudSync';

const STUDENTS_STORAGE_KEY = 'crm_students_v2';

/**
 * Ensures any student object (whether from localStorage, Supabase, or mockData)
 * has all required arrays, objects, and string fields initialized to prevent runtime crashes.
 */
export function normalizeStudent(st: any): FullStudentData {
  if (!st || typeof st !== 'object') {
    return INITIAL_STUDENTS[0];
  }
  const firstName = st.firstName || (st.name ? st.name.split(' ')[0] : '') || 'Ученик';
  const lastName = st.lastName || (st.name ? st.name.split(' ').slice(1).join(' ') : '') || '';
  const fullName = st.name || `${firstName} ${lastName}`.trim() || 'Ученик';

  return {
    id: String(st.id || `st_${Date.now()}`),
    firstName: firstName,
    lastName: lastName,
    birthDate: st.birthDate || undefined,
    grade: st.grade || '',
    phone: st.phone || undefined,
    telegram: st.telegram || undefined,
    email: st.email || undefined,
    status: (st.status as any) || 'active',
    studentType: st.studentType || 'school_student',
    notes: st.notes || '',
    createdAt: st.createdAt || new Date().toISOString(),
    updatedAt: st.updatedAt || new Date().toISOString(),
    isNewUntil: st.isNewUntil || undefined,
    parents: Array.isArray(st.parents)
      ? st.parents.map((p: any) => ({
          id: p.id || `par_${Date.now()}`,
          name: p.name || `${p.firstName || 'Родитель'} ${p.lastName || ''}`.trim(),
          firstName: p.firstName || (p.name ? p.name.split(' ')[0] : '') || 'Родитель',
          lastName: p.lastName || (p.name ? p.name.split(' ').slice(1).join(' ') : '') || '',
          phone: p.phone || '',
          email: p.email || undefined,
          telegram: p.telegram || undefined,
          whatsapp: p.whatsapp || undefined,
          relationshipType: p.relationshipType || 'Родитель',
          isPrimary: Boolean(p.isPrimary),
          createdAt: p.createdAt || new Date().toISOString(),
          isNewUntil: p.isNewUntil || undefined,
        }))
      : (st.parentName || st.parentPhone)
      ? [{
          id: `par_${st.id || Date.now()}`,
          name: st.parentName || 'Родитель',
          firstName: st.parentName ? st.parentName.split(' ')[0] : 'Родитель',
          lastName: st.parentName ? st.parentName.split(' ').slice(1).join(' ') : '',
          phone: st.parentPhone || '',
          relationshipType: 'Родитель',
          isPrimary: true,
          createdAt: st.createdAt || new Date().toISOString(),
          isNewUntil: st.isNewUntil || undefined,
        }]
      : [],
    groups: Array.isArray(st.groups) ? st.groups : [],
    attendanceStats: st.attendanceStats || {
      totalLessons: 0,
      presentCount: 0,
      absentCount: 0,
      rescheduledCount: 0,
      attendanceRate: '100%',
      history: [],
    },
    finance: st.finance
      ? {
          activeSubscription: st.finance.activeSubscription
            ? {
                ...st.finance.activeSubscription,
                price:
                  typeof st.finance.activeSubscription.price === 'string' &&
                  (st.finance.activeSubscription.price.includes('₽') || st.finance.activeSubscription.price.toLowerCase().includes('руб'))
                    ? `${Math.round(parseFloat(st.finance.activeSubscription.price.replace(/[^\d.-]/g, '') || '0') / 100).toLocaleString('ru-RU')} €`
                    : st.finance.activeSubscription.price,
              }
            : (null as any),
          deposit: st.finance.deposit
            ? {
                balance:
                  st.finance.deposit.currency === 'RUB'
                    ? Math.round((st.finance.deposit.balance || 0) / 100)
                    : (st.finance.deposit.balance || 0),
                balanceFormatted:
                  st.finance.deposit.currency === 'RUB'
                    ? `${Math.round((st.finance.deposit.balance || 0) / 100).toLocaleString('ru-RU')} €`
                    : typeof st.finance.deposit.balanceFormatted === 'string' &&
                      (st.finance.deposit.balanceFormatted.includes('₽') || st.finance.deposit.balanceFormatted.toLowerCase().includes('руб'))
                    ? `${(st.finance.deposit.balance || 0).toLocaleString('ru-RU')} €`
                    : st.finance.deposit.balanceFormatted || `${(st.finance.deposit.balance || 0).toLocaleString('ru-RU')} €`,
                currency: 'EUR',
                pricePerLesson: st.finance.deposit.pricePerLesson
                  ? st.finance.deposit.currency === 'RUB'
                    ? Math.round(st.finance.deposit.pricePerLesson / 100)
                    : st.finance.deposit.pricePerLesson
                  : 12,
                pricePerLessonFormatted: st.finance.deposit.pricePerLessonFormatted
                  ? st.finance.deposit.pricePerLessonFormatted.includes('₽') || st.finance.deposit.pricePerLessonFormatted.toLowerCase().includes('руб')
                    ? `${(st.finance.deposit.currency === 'RUB' ? Math.round(st.finance.deposit.pricePerLesson / 100) : st.finance.deposit.pricePerLesson).toLocaleString('ru-RU')} €`
                    : st.finance.deposit.pricePerLessonFormatted
                  : '12 €',
              }
            : {
                balance: 0,
                balanceFormatted: '0 €',
                currency: 'EUR',
                pricePerLesson: 12,
                pricePerLessonFormatted: '12 €',
              },
          payments: Array.isArray(st.finance.payments)
            ? st.finance.payments.map((p: any) => ({
                ...p,
                currency: 'EUR',
                amount:
                  typeof p.amount === 'string' && (p.amount.includes('₽') || p.amount.toLowerCase().includes('руб'))
                    ? `${Math.round(parseFloat(p.amount.replace(/[^\d.-]/g, '') || '0') / 100).toLocaleString('ru-RU')} €`
                    : p.amount,
                amountFormatted:
                  typeof p.amountFormatted === 'string' &&
                  (p.amountFormatted.includes('₽') || p.amountFormatted.toLowerCase().includes('руб'))
                    ? `${Math.round(parseFloat(p.amountFormatted.replace(/[^\d.-]/g, '') || '0') / 100).toLocaleString('ru-RU')} €`
                    : p.amountFormatted || (typeof p.amount === 'number' ? `${p.amount.toLocaleString('ru-RU')} €` : p.amount),
              }))
            : [],
        }
      : {
          activeSubscription: null as any,
          deposit: {
            balance: 0,
            balanceFormatted: '0 €',
            currency: 'EUR',
            pricePerLesson: 12,
            pricePerLessonFormatted: '12 €',
          },
          payments: [],
        },
    price:
      typeof st.price === 'string' && (st.price.includes('₽') || st.price.toLowerCase().includes('руб'))
        ? `${Math.round(parseFloat(st.price.replace(/[^\d.-]/g, '') || '0') / 100).toLocaleString('ru-RU')} €`
        : st.price,
    deposit: st.deposit
      ? {
          ...st.deposit,
          currency: 'EUR',
          balance:
            st.deposit.currency === 'RUB' ? Math.round((st.deposit.balance || 0) / 100) : (st.deposit.balance || 0),
          balanceFormatted:
            st.deposit.currency === 'RUB'
              ? `${Math.round((st.deposit.balance || 0) / 100).toLocaleString('ru-RU')} €`
              : typeof st.deposit.balanceFormatted === 'string' &&
                (st.deposit.balanceFormatted.includes('₽') || st.deposit.balanceFormatted.toLowerCase().includes('руб'))
              ? `${(st.deposit.balance || 0).toLocaleString('ru-RU')} €`
              : st.deposit.balanceFormatted || `${(st.deposit.balance || 0).toLocaleString('ru-RU')} €`,
        }
      : undefined,
    payments: Array.isArray(st.payments)
      ? st.payments.map((p: any) => ({
          ...p,
          currency: 'EUR',
          amount:
            typeof p.amount === 'string' && (p.amount.includes('₽') || p.amount.toLowerCase().includes('руб'))
              ? `${Math.round(parseFloat(p.amount.replace(/[^\d.-]/g, '') || '0') / 100).toLocaleString('ru-RU')} €`
              : p.amount,
          amountFormatted:
            typeof p.amountFormatted === 'string' &&
            (p.amountFormatted.includes('₽') || p.amountFormatted.toLowerCase().includes('руб'))
              ? `${Math.round(parseFloat(p.amountFormatted.replace(/[^\d.-]/g, '') || '0') / 100).toLocaleString('ru-RU')} €`
              : p.amountFormatted || (typeof p.amount === 'number' ? `${p.amount.toLocaleString('ru-RU')} €` : p.amount),
        }))
      : undefined,
    interactions: Array.isArray(st.interactions) ? st.interactions : [],
    comments: Array.isArray(st.comments) ? st.comments : [],
    teacherComments: Array.isArray(st.teacherComments) ? st.teacherComments : [],
    tasks: Array.isArray(st.tasks) ? st.tasks : [],
    documents: Array.isArray(st.documents) ? st.documents : [],
  };
}

/**
 * Loads all students from localStorage merged with INITIAL_STUDENTS.
 * Any edits or status/type changes saved in localStorage take priority.
 */
export function getStoredStudents(): FullStudentData[] {
  if (typeof window === 'undefined') return INITIAL_STUDENTS.map((s) => normalizeStudent(s));
  try {
    const raw = localStorage.getItem(STUDENTS_STORAGE_KEY);
    if (!raw) return INITIAL_STUDENTS.map((s) => normalizeStudent(s));
    const stored: FullStudentData[] = JSON.parse(raw);
    if (!Array.isArray(stored) || stored.length === 0) return INITIAL_STUDENTS.map((s) => normalizeStudent(s));

    // Deduplicate stored by ID
    const seenIds = new Set<string>();
    const result: FullStudentData[] = [];

    for (const st of stored) {
      if (!st || !st.id) continue;
      if (seenIds.has(st.id)) continue;
      seenIds.add(st.id);
      result.push(st);
    }

    for (const initSt of INITIAL_STUDENTS) {
      if (!initSt || !initSt.id) continue;
      if (seenIds.has(initSt.id)) continue;
      seenIds.add(initSt.id);
      result.push(initSt);
    }

    // Hydrate all student groups to ensure bidirectional sync with groups and normalize
    return result.map((st) => normalizeStudent(hydrateStudentGroups(st)));
  } catch (err) {
    console.error('Failed to parse stored students:', err);
    return INITIAL_STUDENTS.map((st) => normalizeStudent(hydrateStudentGroups(st)));
  }
}

/**
 * Ensures student.groups includes all groups where student is listed as enrolled,
 * and strictly prevents duplicate enrollments (by group ID and normalized group name).
 */
export function hydrateStudentGroups(student: FullStudentData): FullStudentData {
  if (typeof window === 'undefined') return student;
  try {
    let allGroups: any[] = [];
    const rawGroups = localStorage.getItem('crm_groups_master_v2');
    if (rawGroups) {
      try {
        allGroups = JSON.parse(rawGroups);
      } catch (e) {}
    }
    if (!Array.isArray(allGroups) || allGroups.length === 0) {
      allGroups = INITIAL_GROUPS;
    }

    const normalizeGroupName = (n?: string) => (n || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();

    // Clean and deduplicate existing groups
    const uniqueGroups: any[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    for (const g of student.groups || []) {
      if (!g) continue;
      const cleanName = (g.name || g.courseName || '').replace(/\s*\([^)]*\)/g, '').trim();
      const normName = normalizeGroupName(cleanName);
      const gid = String(g.id || '').trim();

      if (gid && seenIds.has(gid)) continue;
      if (normName && seenNames.has(normName)) continue;

      if (gid) seenIds.add(gid);
      if (normName) seenNames.add(normName);

      uniqueGroups.push({
        ...g,
        name: cleanName,
      });
    }

    const studentFullName = `${student.firstName} ${student.lastName}`.toLowerCase().trim();

    for (const grp of allGroups) {
      if (!grp || !grp.id) continue;
      const isEnrolled = (grp.students || []).some(
        (s: any) =>
          String(s.id) === String(student.id) ||
          (s.name && s.name.toLowerCase().trim() === studentFullName)
      );

      const cleanGrpName = (grp.name || grp.courseName || '').replace(/\s*\([^)]*\)/g, '').trim();
      const normGrpName = normalizeGroupName(cleanGrpName);
      const grpId = String(grp.id).trim();

      if (isEnrolled) {
        if (!seenIds.has(grpId) && !seenNames.has(normGrpName)) {
          uniqueGroups.push({
            id: grp.id,
            name: cleanGrpName,
            courseName: grp.courseName || cleanGrpName,
            teacherName: grp.teacherName || 'Мария Иванова',
            schedule: grp.schedule || 'Пн, Чт • 18:45–20:15',
            status: (grp.status as any) || 'active',
            joinedAt: '01.09.2026',
          });
          seenIds.add(grpId);
          if (normGrpName) seenNames.add(normGrpName);
        }
      }
    }

    return {
      ...student,
      groups: uniqueGroups,
    };
  } catch (err) {
    return student;
  }
}

/**
 * Loads all students directly from Supabase cloud database and merges with in-memory state.
 */
export async function fetchStudentsFromSupabase(): Promise<FullStudentData[]> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data: dbStudents, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && dbStudents && dbStudents.length > 0) {
      for (const dbStudent of dbStudents) {
        const existingIdx = INITIAL_STUDENTS.findIndex((s) => s.id === dbStudent.id);
        const mappedStudent: Partial<FullStudentData> = {
          id: dbStudent.id,
          firstName: dbStudent.first_name,
          lastName: dbStudent.last_name,
          birthDate: dbStudent.birth_date ? new Date(dbStudent.birth_date).toLocaleDateString('ru-RU') : undefined,
          phone: dbStudent.phone || undefined,
          telegram: dbStudent.telegram || undefined,
          status: (dbStudent.status as any) || 'active',
          notes: dbStudent.notes || undefined,
        };

        if (existingIdx !== -1) {
          INITIAL_STUDENTS[existingIdx] = { ...INITIAL_STUDENTS[existingIdx], ...mappedStudent };
        } else {
          INITIAL_STUDENTS.unshift({
            id: dbStudent.id,
            firstName: dbStudent.first_name,
            lastName: dbStudent.last_name,
            birthDate: dbStudent.birth_date ? new Date(dbStudent.birth_date).toLocaleDateString('ru-RU') : undefined,
            grade: '1 класс',
            phone: dbStudent.phone || undefined,
            telegram: dbStudent.telegram || undefined,
            status: (dbStudent.status as any) || 'active',
            studentType: 'school_student',
            notes: dbStudent.notes || undefined,
            parents: [],
            groups: [],
            attendanceStats: {
              totalLessons: 0,
              presentCount: 0,
              absentCount: 0,
              rescheduledCount: 0,
              attendanceRate: '100%',
              history: [],
            },
            finance: {
              activeSubscription: null as any,
              deposit: { balance: 0, balanceFormatted: '0 €', currency: 'EUR', pricePerLesson: 12, pricePerLessonFormatted: '12 €' },
              payments: [],
            },
            interactions: [],
            comments: [],
            tasks: [],
            documents: [],
            createdAt: dbStudent.created_at || new Date().toISOString(),
            updatedAt: dbStudent.updated_at || new Date().toISOString(),
          } as FullStudentData);
        }
      }
    }
  } catch (err) {
    console.warn('Supabase students fetch warning:', err);
  }

  return getStoredStudents();
}

/**
 * Persists student data to Supabase cloud database and in-memory store.
 * Dispatches a custom window event 'crm-students-changed' so all views sync in real time.
 */
export function saveStudentToStorage(student: FullStudentData): void {
  let studentToSave = normalizeStudent(student);

  // 1. Update in-memory INITIAL_STUDENTS
  const idx = INITIAL_STUDENTS.findIndex((s) => s.id === studentToSave.id);
  if (idx !== -1) {
    INITIAL_STUDENTS[idx] = studentToSave;
  } else {
    INITIAL_STUDENTS.unshift(studentToSave);
  }

  // 2. Cascade student name update across payments, groups, tasks, timeline, leads
  if (studentToSave.firstName || studentToSave.lastName) {
    syncStudentNameCascade(studentToSave.id, {
      firstName: studentToSave.firstName,
      lastName: studentToSave.lastName,
    });
  }

  // 3. Cascade parent names if updated
  if (studentToSave.parents && studentToSave.parents.length > 0) {
    studentToSave.parents.forEach((p) => {
      if (p.id) {
        syncParentNameCascade(p.id, {
          firstName: p.firstName,
          lastName: p.lastName,
          phone: p.phone,
          email: p.email,
          telegram: p.telegram,
          whatsapp: p.whatsapp,
        });
      }
    });
  }

  // 4. Direct localStorage and Supabase Cloud DB write
  if (typeof window !== 'undefined') {
    try {
      const currentStudents = getStoredStudents();
      let sIdx = currentStudents.findIndex((s) => s.id === studentToSave.id);
      if (sIdx === -1) {
        try {
          const { getEquivalentIds } = require('./timelineStorage');
          const eqSet = getEquivalentIds(studentToSave.id);
          sIdx = currentStudents.findIndex((s) => eqSet.has(s.id));
        } catch {}
      }

      if (sIdx !== -1) {
        currentStudents[sIdx] = studentToSave;
      } else {
        currentStudents.unshift(studentToSave);
      }
      localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(currentStudents));

      // Persist to Supabase Cloud DB via sync layer
      persistEntityToCloud('student', studentToSave);

      // Notify other views if not currently reconciling
      if (!isReconcilingGlobally) {
        window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: studentToSave }));
      }
    } catch (err) {
      console.error('Failed to save student to storage:', err);
    }
  }
}

/**
 * Finds student by id from unified storage with alias/UUID equivalence matching.
 */
export function getStudentById(id: string): FullStudentData | undefined {
  if (!id) return undefined;
  const list = getStoredStudents();
  const match = list.find((s) => s.id === id);
  if (match) return normalizeStudent(match);

  // Fallback 1: check with equivalence set (handles '1' vs 'b1111111-1111-4111-8111-111111111111')
  try {
    const { getEquivalentIds } = require('./timelineStorage');
    const eqSet = getEquivalentIds(id);
    const eqMatch = list.find((s) => eqSet.has(s.id));
    if (eqMatch) return normalizeStudent(eqMatch);
  } catch {}

  // Fallback 2: check raw localStorage if recently written before state sync
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STUDENTS_STORAGE_KEY);
      if (raw) {
        const stored: any[] = JSON.parse(raw);
        const direct = stored.find((s) => s.id === id);
        if (direct) return normalizeStudent(hydrateStudentGroups(direct));
      }
    } catch {}
  }
  return undefined;
}

/**
 * Deducts one lesson fee from the student's prepayment deposit balance.
 * Logs an expense interaction and updates payment history.
 */
export function deductLessonFromDeposit(
  studentId: string,
  amountToDeduct?: number,
  lessonTopic?: string
): { success: boolean; newBalance: number; message: string; updatedStudent?: FullStudentData } {
  const students = getStoredStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student) {
    return { success: false, newBalance: 0, message: 'Ученик не найден' };
  }

  const currentDeposit = student.finance?.deposit || {
    balance: 0,
    balanceFormatted: '0 €',
    currency: 'EUR',
    pricePerLesson: 12,
    pricePerLessonFormatted: '12 €',
  };

  const deduct = amountToDeduct || currentDeposit.pricePerLesson || 12;
  const currencySymbol = '€';
  const newBalance = (currentDeposit.balance || 0) - deduct;
  const formattedBalance = `${newBalance.toLocaleString('ru-RU')} ${currencySymbol}`;
  const formattedDeduct = `${deduct.toLocaleString('ru-RU')} ${currencySymbol}`;

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const nowFormatted = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const todayStr = now.toLocaleDateString('ru-RU');

  const expenseInteraction: TimelineInteraction = {
    id: `int_deduct_${Date.now()}`,
    studentId: student.id,
    studentName: `${student.firstName} ${student.lastName}`,
    parentId: student.parents?.[0]?.id,
    parentName: student.parents?.[0] ? `${student.parents[0].firstName} ${student.parents[0].lastName}` : undefined,
    occurredAt: nowFormatted,
    createdAt: now.toISOString(),
    channel: 'other',
    type: 'status_change',
    author: 'Система (списание по стоимости курса)',
    content: `Списана оплата за онлайн-занятие ${lessonTopic ? `«${lessonTopic}»` : ''} (-${formattedDeduct}). Остаток на депозите: ${formattedBalance}.`,
    result: newBalance >= 0 ? 'Списание с депозита' : 'Депозит исчерпан (долг)',
    targetType: student.studentType === 'adult_student' ? 'student' : 'parent',
    targetName: `${student.firstName} ${student.lastName}`,
    targetRole: student.studentType === 'adult_student' ? 'Студент' : 'Родитель',
  };

  const expensePaymentRecord = {
    id: `pay_deduct_${Date.now()}`,
    date: todayStr,
    period: lessonTopic ? `Занятие: ${lessonTopic}` : 'Онлайн-занятие (списание)',
    amount: `-${formattedDeduct}`,
    method: 'Списание с депозита',
    status: (newBalance >= 0 ? 'paid' : 'overdue') as 'paid' | 'overdue',
  };

  const updatedStudent: FullStudentData = {
    ...student,
    finance: {
      ...student.finance,
      deposit: {
        ...currentDeposit,
        balance: newBalance,
        balanceFormatted: formattedBalance,
      },
      payments: [expensePaymentRecord, ...(student.finance?.payments || [])],
    },
    interactions: [expenseInteraction, ...(student.interactions || [])],
  };

  saveStudentToStorage(updatedStudent);
  saveInteractionToStorage(expenseInteraction);

  // Record in global payment storage
  savePaymentToStorage({
    id: expensePaymentRecord.id,
    studentId: student.id,
    studentName: `${student.firstName} ${student.lastName}`,
    parentId: student.parents?.[0]?.id,
    parentName: student.parents?.[0] ? `${student.parents[0].firstName} ${student.parents[0].lastName}` : undefined,
    courseName: student.groups?.[0]?.courseName || 'Онлайн-курс',
    groupName: student.groups?.[0]?.name || 'Основная группа',
    amount: -deduct,
    amountFormatted: `-${formattedDeduct}`,
    paymentDate: todayStr,
    periodLabel: lessonTopic ? `Занятие: ${lessonTopic}` : 'Списание за занятие',
    status: newBalance >= 0 ? 'paid' : 'overdue',
    paymentMethod: 'deposit_deduction' as any,
    currency: (currentDeposit.currency as any) || 'EUR',
    paymentType: 'prepayment',
    recordedBy: 'Система',
    comment: `Списано с баланса депозита за онлайн-занятие. Остаток: ${formattedBalance}`,
  });

    return {
    success: true,
    newBalance,
    message: `Списано ${formattedDeduct}. Остаток на депозите: ${formattedBalance}`,
    updatedStudent,
  };
}

/**
 * Clears overdue payment statuses for a student in student storage.
 */
export function settleStudentOverdueDebts(studentId: string): void {
  const student = getStudentById(studentId);
  if (!student) return;

  const currentPayments = student.finance?.payments || [];
  let changed = false;
  const updatedPayments = currentPayments.map((p) => {
    if (p.status === 'overdue') {
      changed = true;
      return { ...p, status: 'paid' as const };
    }
    return p;
  });

  if (changed) {
    const updatedStudent: FullStudentData = {
      ...student,
      finance: {
        ...student.finance,
        payments: updatedPayments,
      },
    };
    saveStudentToStorage(updatedStudent);
  }
}

/**
 * Automatically settles overdue course debts using available deposit funds for a student.
 * Ensures that a student never has an active overdue debt while having unused deposit funds.
 * If deposit >= debt: debt is marked 'paid', deposit is reduced by debt amount.
 * If deposit < debt: deposit is reduced to 0, debt is partially reduced.
 */
const studentSettlementLock = new Set<string>();
const familySettlementLock = new Set<string>();

export function settleDebtsFromDeposit(studentId: string): {
  settled: boolean;
  settledAmount: number;
  remainingDeposit: number;
  remainingDebt: number;
} {
  if (studentSettlementLock.has(studentId)) {
    return { settled: false, settledAmount: 0, remainingDeposit: 0, remainingDebt: 0 };
  }
  studentSettlementLock.add(studentId);

  try {
    const student = getStudentById(studentId);
    if (!student) {
      return { settled: false, settledAmount: 0, remainingDeposit: 0, remainingDebt: 0 };
    }

    const currentDeposit = student.finance?.deposit;
  let availableDeposit = currentDeposit?.balance || 0;
  if (availableDeposit <= 0) {
    return { settled: false, settledAmount: 0, remainingDeposit: 0, remainingDebt: 0 };
  }

  let allStoredPayments: any[] = [];
  try {
    const { getStoredPayments } = require('./paymentStorage');
    allStoredPayments = getStoredPayments();
  } catch (e) {
    console.error('Failed to get stored payments for deposit settlement:', e);
  }

  const globalOverdue = allStoredPayments.filter(
    (p: any) => p.studentId === studentId && p.status === 'overdue'
  );
  const studentOverdue = (student.finance?.payments || []).filter((p) => p.status === 'overdue');

  if (globalOverdue.length === 0 && studentOverdue.length === 0) {
    return { settled: false, settledAmount: 0, remainingDeposit: availableDeposit, remainingDebt: 0 };
  }

  let settledAmount = 0;
  const todayStr = new Date().toLocaleDateString('ru-RU');
  const currencySymbol = '€';
  let studentPayments = [...(student.finance?.payments || [])];
  const newInteractions: TimelineInteraction[] = [];

  // 1. Settle in global payment storage
  const updatedGlobalPayments = allStoredPayments.map((p: any) => {
    if (p.studentId === studentId && p.status === 'overdue' && availableDeposit > 0) {
      const debtAmount = typeof p.amount === 'number'
        ? p.amount
        : parseFloat(String(p.amount).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;

      if (debtAmount <= 0) return p;

      if (availableDeposit >= debtAmount) {
        // Full payoff
        availableDeposit -= debtAmount;
        settledAmount += debtAmount;

        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const nowFormatted = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;

        newInteractions.push({
          id: `int_settle_${Date.now()}_${p.id}`,
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          parentId: student.parents?.[0]?.id,
          parentName: student.parents?.[0] ? `${student.parents[0].firstName} ${student.parents[0].lastName}` : undefined,
          occurredAt: nowFormatted,
          createdAt: now.toISOString(),
          channel: 'other',
          type: 'status_change',
          author: 'Система (списание долга с депозита)',
          content: `Списано ${debtAmount.toLocaleString('ru-RU')} ${currencySymbol} с депозита в счет полного погашения задолженности за «${p.courseName || p.groupName || 'Курс'}». Остаток на депозите: ${availableDeposit.toLocaleString('ru-RU')} ${currencySymbol}.`,
          result: 'Задолженность погашена с депозита',
          targetType: student.studentType === 'adult_student' ? 'student' : 'parent',
          targetName: `${student.firstName} ${student.lastName}`,
          targetRole: student.studentType === 'adult_student' ? 'Студент' : 'Родитель',
        });

        // Update matching student payment
        studentPayments = studentPayments.map((sp) => {
          if (sp.id === p.id || sp.period === p.periodLabel) {
            return {
              ...sp,
              status: 'paid' as const,
              method: 'Списание с депозита',
            };
          }
          return sp;
        });

        return {
          ...p,
          status: 'paid' as const,
          paymentDate: todayStr,
          paymentMethod: 'deposit_deduction' as any,
          comment: p.comment ? `${p.comment} (Погашено с депозита ${todayStr})` : `Задолженность полностью погашена с депозита ${todayStr}`,
        };
      } else {
        // Partial payoff
        const covered = availableDeposit;
        const remaining = debtAmount - covered;
        settledAmount += covered;
        availableDeposit = 0;

        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const nowFormatted = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;

        newInteractions.push({
          id: `int_settle_part_${Date.now()}_${p.id}`,
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          parentId: student.parents?.[0]?.id,
          parentName: student.parents?.[0] ? `${student.parents[0].firstName} ${student.parents[0].lastName}` : undefined,
          occurredAt: nowFormatted,
          createdAt: now.toISOString(),
          channel: 'other',
          type: 'status_change',
          author: 'Система (частичное списание долга с депозита)',
          content: `Списано ${covered.toLocaleString('ru-RU')} ${currencySymbol} с депозита в счет частичного погашения задолженности за «${p.courseName || p.groupName || 'Курс'}». Остаток задолженности: ${remaining.toLocaleString('ru-RU')} ${currencySymbol}. Депозит исчерпан.`,
          result: 'Частичное погашение долга с депозита',
          targetType: student.studentType === 'adult_student' ? 'student' : 'parent',
          targetName: `${student.firstName} ${student.lastName}`,
          targetRole: student.studentType === 'adult_student' ? 'Студент' : 'Родитель',
        });

        studentPayments = studentPayments.map((sp) => {
          if (sp.id === p.id || sp.period === p.periodLabel) {
            return {
              ...sp,
              amount: `${remaining.toLocaleString('ru-RU')} ${currencySymbol}`,
            };
          }
          return sp;
        });

        return {
          ...p,
          amount: remaining,
          amountFormatted: `${remaining.toLocaleString('ru-RU')} ${currencySymbol}`,
          comment: p.comment
            ? `${p.comment} (Частично погашено с депозита на ${covered.toLocaleString('ru-RU')} ${currencySymbol} ${todayStr})`
            : `Частично погашено с депозита на ${covered.toLocaleString('ru-RU')} ${currencySymbol} ${todayStr}`,
        };
      }
    }
    return p;
  });

  // Check any student-level payments that were not matched globally
  studentPayments = studentPayments.map((sp) => {
    if (sp.status === 'overdue' && availableDeposit > 0) {
      const debtAmount = parseFloat(String(sp.amount).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      if (debtAmount > 0 && availableDeposit >= debtAmount) {
        availableDeposit -= debtAmount;
        settledAmount += debtAmount;
        return {
          ...sp,
          status: 'paid' as const,
          method: 'Списание с депозита',
        };
      }
    }
    return sp;
  });

  // Update student
  const updatedStudent: FullStudentData = {
    ...student,
    finance: {
      ...student.finance,
      deposit: {
        ...currentDeposit,
        currency: (currentDeposit?.currency || 'EUR') as 'RUB' | 'EUR',
        balance: availableDeposit,
        balanceFormatted: `${availableDeposit.toLocaleString('ru-RU')} ${currencySymbol}`,
      },
      payments: studentPayments,
    },
    interactions: [...newInteractions, ...(student.interactions || [])],
  };

  saveStudentToStorage(updatedStudent);
  for (const inter of newInteractions) {
    saveInteractionToStorage(inter);
  }

  // Save global payments
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('crm_payments_v2', JSON.stringify(updatedGlobalPayments));
      const { INITIAL_PAYMENTS } = require('./mockData');
      for (const up of updatedGlobalPayments) {
        const idx = INITIAL_PAYMENTS.findIndex((x: any) => x.id === up.id);
        if (idx !== -1) {
          INITIAL_PAYMENTS[idx] = up;
        }
      }
      window.dispatchEvent(new CustomEvent('crm-payments-changed'));
      window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: updatedStudent }));
    } catch (e) {
      console.error('Failed to sync updated global payments after deposit settlement:', e);
    }
  }

  const remainingDebt = updatedGlobalPayments
    .filter((p: any) => p.studentId === studentId && p.status === 'overdue')
    .reduce((sum: number, p: any) => sum + (typeof p.amount === 'number' ? p.amount : 0), 0);

    return {
      settled: settledAmount > 0,
      settledAmount,
      remainingDeposit: availableDeposit,
      remainingDebt,
    };
  } finally {
    studentSettlementLock.delete(studentId);
  }
}

/**
 * Reconciles family finances across multiple children of a parent:
 * If one child in the family has an active course debt and another child has unused deposit funds,
 * the family deposit is automatically used to settle the sibling's debt so the family never has
 * an active debt while holding idle deposit funds.
 */
export function settleFamilyDebtsFromFamilyDeposit(parentId: string): {
  settled: boolean;
  settledAmount: number;
} {
  if (typeof window === 'undefined') return { settled: false, settledAmount: 0 };
  if (familySettlementLock.has(parentId)) return { settled: false, settledAmount: 0 };
  familySettlementLock.add(parentId);

  try {
    const allStudents = getStoredStudents();
    const familyStudents = allStudents.filter(
      (s) => s.parents?.some((p) => p.id === parentId)
    );

    if (familyStudents.length < 2) {
      return { settled: false, settledAmount: 0 };
    }

  let totalSettled = 0;

  // Find children with deposit and children with overdue debt
  for (const debtor of familyStudents) {
    const debtorDebts = (debtor.finance?.payments || []).filter((p) => p.status === 'overdue');
    if (debtorDebts.length === 0) continue;

    for (const donor of familyStudents) {
      if (donor.id === debtor.id) continue;
      let donorDeposit = donor.finance?.deposit?.balance || 0;
      if (donorDeposit <= 0) continue;

      const currencySymbol = '€';
      const todayStr = new Date().toLocaleDateString('ru-RU');

      for (const debt of debtorDebts) {
        if (donorDeposit <= 0) break;
        if (debt.status !== 'overdue') continue;

        const debtAmount = parseFloat(String(debt.amount).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        if (debtAmount <= 0) continue;

        if (donorDeposit >= debtAmount) {
          // Fully pay off debt using sibling deposit
          donorDeposit -= debtAmount;
          totalSettled += debtAmount;
          debt.status = 'paid';
          debt.method = 'Списание с семейного депозита';

          const now = new Date();
          const pad = (n: number) => String(n).padStart(2, '0');
          const nowFormatted = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;

          // Log interaction on debtor
          saveInteractionToStorage({
            id: `int_fam_settle_${Date.now()}_${debt.id}`,
            studentId: debtor.id,
            studentName: `${debtor.firstName} ${debtor.lastName}`,
            parentId,
            occurredAt: nowFormatted,
            createdAt: now.toISOString(),
            channel: 'other',
            type: 'status_change',
            author: 'Система (семейный депозит)',
            content: `Погашена задолженность ${debtAmount.toLocaleString('ru-RU')} ${currencySymbol} за «${debt.period || 'Курс'}» за счет семейного депозита (списано с баланса ${donor.firstName} ${donor.lastName}).`,
            result: 'Задолженность погашена из семейного депозита',
          });

          // Log interaction on donor
          saveInteractionToStorage({
            id: `int_fam_donor_${Date.now()}_${debt.id}`,
            studentId: donor.id,
            studentName: `${donor.firstName} ${donor.lastName}`,
            parentId,
            occurredAt: nowFormatted,
            createdAt: now.toISOString(),
            channel: 'other',
            type: 'status_change',
            author: 'Система (семейный депозит)',
            content: `Списано ${debtAmount.toLocaleString('ru-RU')} ${currencySymbol} с депозита в счет оплаты курса «${debt.period || 'Курс'}» для ${debtor.firstName} ${debtor.lastName}. Остаток депозита: ${donorDeposit.toLocaleString('ru-RU')} ${currencySymbol}.`,
            result: 'Средства переведены на оплату курса брата/сестры',
          });
        } else {
          // Partial payoff
          const covered = donorDeposit;
          const remaining = debtAmount - covered;
          totalSettled += covered;
          donorDeposit = 0;
          debt.amount = `${remaining.toLocaleString('ru-RU')} ${currencySymbol}`;

          const now = new Date();
          const pad = (n: number) => String(n).padStart(2, '0');
          const nowFormatted = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}`;

          saveInteractionToStorage({
            id: `int_fam_part_${Date.now()}_${debt.id}`,
            studentId: debtor.id,
            studentName: `${debtor.firstName} ${debtor.lastName}`,
            parentId,
            occurredAt: nowFormatted,
            createdAt: now.toISOString(),
            channel: 'other',
            type: 'status_change',
            author: 'Система (семейный депозит)',
            content: `Частично погашена задолженность на ${covered.toLocaleString('ru-RU')} ${currencySymbol} за счет семейного депозита (${donor.firstName}). Остаток долга: ${remaining.toLocaleString('ru-RU')} ${currencySymbol}.`,
            result: 'Частичное погашение долга из семейного депозита',
          });
        }
      }

      // Update donor student
      const updatedDonor: FullStudentData = {
        ...donor,
        finance: {
          ...donor.finance,
          deposit: {
            ...donor.finance?.deposit,
            currency: (donor.finance?.deposit?.currency || 'EUR') as 'RUB' | 'EUR',
            balance: donorDeposit,
            balanceFormatted: `${donorDeposit.toLocaleString('ru-RU')} ${currencySymbol}`,
          },
        },
      };
      saveStudentToStorage(updatedDonor);
    }

    // Update debtor student
    const updatedDebtor: FullStudentData = {
      ...debtor,
      finance: {
        ...debtor.finance,
        payments: debtorDebts,
      },
    };
    saveStudentToStorage(updatedDebtor);
  }

  if (totalSettled > 0) {
    try {
      const { getStoredPayments } = require('./paymentStorage');
      const allPayments = getStoredPayments();
      const updatedPayments = allPayments.map((p: any) => {
        const matchingDebtor = familyStudents.find((s) => s.id === p.studentId);
        if (matchingDebtor) {
          const matchP = matchingDebtor.finance?.payments?.find((sp: any) => sp.id === p.id || sp.period === p.periodLabel);
          if (matchP && matchP.status === 'paid' && p.status === 'overdue') {
            return {
              ...p,
              status: 'paid' as const,
              paymentMethod: 'deposit_deduction' as any,
              comment: `${p.comment || ''} (Погашено из семейного депозита)`.trim(),
            };
          }
        }
        return p;
      });
      localStorage.setItem('crm_payments_v2', JSON.stringify(updatedPayments));
      window.dispatchEvent(new CustomEvent('crm-payments-changed'));
    } catch (e) {
      console.error('Failed to sync global payments after family settlement:', e);
    }
  }

    return { settled: totalSettled > 0, settledAmount: totalSettled };
  } finally {
    familySettlementLock.delete(parentId);
  }
}

let isReconcilingGlobally = false;

/**
 * Reconciles all students and families so that neither an individual student nor a family
 * ever has an active debt while having unused deposit funds.
 */
export function reconcileAllStudentDepositsAndDebts(): void {
  if (typeof window === 'undefined' || isReconcilingGlobally) return;
  isReconcilingGlobally = true;
  let changesOccurred = false;
  try {
    const students = getStoredStudents();
    for (const s of students) {
      if ((s.finance?.deposit?.balance || 0) > 0) {
        const res = settleDebtsFromDeposit(s.id);
        if (res.settled) changesOccurred = true;
      }
    }

    // Reconcile multi-child families
    const parentIds = new Set<string>();
    for (const s of students) {
      if (s.parents && s.parents.length > 0) {
        for (const p of s.parents) {
          if (p.id) parentIds.add(p.id);
        }
      }
    }
    for (const pid of parentIds) {
      const res = settleFamilyDebtsFromFamilyDeposit(pid);
      if (res.settled) changesOccurred = true;
    }

    if (changesOccurred && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm-students-changed'));
    }
  } catch (err) {
    console.error('Failed to reconcile all student deposits and debts:', err);
  } finally {
    isReconcilingGlobally = false;
  }
}

/**
 * Soft deletes a student: marks status as archived and is_deleted as true.
 * Persists immediately to localStorage and Supabase.
 */
export function softDeleteStudent(studentId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const students = getStoredStudents();
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const updated: FullStudentData = {
      ...student,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      status: 'archived' as any,
    };

    saveStudentToStorage(updated);
    persistEntityToCloud('student', { id: studentId }, 'delete');
    window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: updated }));
  } catch (err) {
    console.error('Failed to soft delete student:', err);
  }
}

/**
 * Restores an archived / deleted student.
 */
export function restoreStudent(studentId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const students = getStoredStudents();
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const updated: FullStudentData = {
      ...student,
      isDeleted: false,
      deletedAt: undefined,
      status: 'active' as any,
    };

    saveStudentToStorage(updated);
    persistEntityToCloud('student', updated);
    window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: updated }));
  } catch (err) {
    console.error('Failed to restore student:', err);
  }
}

const DELETED_PARENTS_KEY = 'crm_deleted_parents_v1';

export function getDeletedParentIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_PARENTS_KEY);
    if (!raw) return new Set();
    const list = JSON.parse(raw);
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

export function softDeleteParent(parentId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getDeletedParentIds();
    current.add(parentId);
    localStorage.setItem(DELETED_PARENTS_KEY, JSON.stringify(Array.from(current)));

    persistEntityToCloud('parent', { id: parentId }, 'delete');
    window.dispatchEvent(new CustomEvent('crm-parents-changed'));
  } catch (err) {
    console.error('Failed to soft delete parent:', err);
  }
}

export function restoreParent(parentId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getDeletedParentIds();
    current.delete(parentId);
    localStorage.setItem(DELETED_PARENTS_KEY, JSON.stringify(Array.from(current)));

    persistEntityToCloud('parent', { id: parentId, notes: null });
    window.dispatchEvent(new CustomEvent('crm-parents-changed'));
  } catch (err) {
    console.error('Failed to restore parent:', err);
  }
}



