'use client';

import { FullStudentData, INITIAL_STUDENTS, TimelineInteraction } from './mockData';
import { saveInteractionToStorage, sortTimelineChronologicalDesc } from './timelineStorage';
import { savePaymentToStorage } from './paymentStorage';
import { syncStudentNameCascade, syncParentNameCascade } from './nameCascadeSync';

const STUDENTS_STORAGE_KEY = 'crm_students_v2';

/**
 * Loads all students from localStorage merged with INITIAL_STUDENTS.
 * Any edits or status/type changes saved in localStorage take priority.
 */
export function getStoredStudents(): FullStudentData[] {
  if (typeof window === 'undefined') return INITIAL_STUDENTS;
  try {
    const raw = localStorage.getItem(STUDENTS_STORAGE_KEY);
    if (!raw) return INITIAL_STUDENTS;
    const stored: FullStudentData[] = JSON.parse(raw);
    if (!Array.isArray(stored) || stored.length === 0) return INITIAL_STUDENTS;

    const storedMap = new Map<string, FullStudentData>(stored.map((s) => [s.id, s]));
    const result: FullStudentData[] = [];

    // Apply stored changes or fallback to INITIAL_STUDENTS
    for (const init of INITIAL_STUDENTS) {
      if (storedMap.has(init.id)) {
        result.push(storedMap.get(init.id)!);
        storedMap.delete(init.id);
      } else {
        result.push(init);
      }
    }

    // Any newly created students created during sessions
    for (const extra of storedMap.values()) {
      result.unshift(extra);
    }

    return result;
  } catch (err) {
    console.error('Failed to parse stored students:', err);
    return INITIAL_STUDENTS;
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
              deposit: { balance: 0, balanceFormatted: '0 ₽', currency: 'RUB', pricePerLesson: 1050, pricePerLessonFormatted: '1 050 ₽' },
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
  let studentToSave = student;

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
      const sIdx = currentStudents.findIndex((s) => s.id === studentToSave.id);
      if (sIdx !== -1) {
        currentStudents[sIdx] = studentToSave;
      } else {
        currentStudents.unshift(studentToSave);
      }
      localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(currentStudents));

      import('@/lib/supabase/client').then(({ createClient }) => {
        try {
          const supabase = createClient();
          const firstName = studentToSave.firstName || (studentToSave as any).name?.split(' ')[0] || '';
          const lastName = studentToSave.lastName || (studentToSave as any).name?.split(' ').slice(1).join(' ') || '';
          
          let birthDateIso: string | null = null;
          if (studentToSave.birthDate) {
            try {
              if (studentToSave.birthDate.includes('.')) {
                birthDateIso = new Date(studentToSave.birthDate.split('.').reverse().join('-')).toISOString().slice(0, 10);
              } else {
                birthDateIso = new Date(studentToSave.birthDate).toISOString().slice(0, 10);
              }
            } catch {}
          }

          // 1. Upsert Student
          supabase.from('students').upsert({
            id: studentToSave.id,
            first_name: firstName,
            last_name: lastName,
            birth_date: birthDateIso,
            phone: studentToSave.phone || null,
            telegram: studentToSave.telegram || null,
            status: (studentToSave.status as any) || 'active',
            notes: studentToSave.notes || (studentToSave as any).comment || null,
            updated_at: new Date().toISOString(),
            is_mock_data: false,
          }).then(() => {}, (err) => console.warn('Supabase student upsert error:', err));

          // 2. Upsert Parents if present
          if (studentToSave.parents && studentToSave.parents.length > 0) {
            for (const pr of studentToSave.parents) {
              if (pr.id) {
                supabase.from('parents').upsert({
                  id: pr.id,
                  first_name: pr.firstName || 'Родитель',
                  last_name: pr.lastName || lastName,
                  phone: pr.phone || null,
                  email: pr.email || null,
                  telegram: pr.telegram || null,
                  whatsapp: pr.whatsapp || null,
                  preferred_channel: pr.preferredChannel || 'telegram',
                  updated_at: new Date().toISOString(),
                  is_mock_data: false,
                }).then(() => {}, () => {});
              }
            }
          }
        } catch (e) {
          console.warn('Supabase client error:', e);
        }
      }).catch(() => {});

      // Notify other views
      window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: studentToSave }));
    } catch (err) {
      console.error('Failed to save student to storage:', err);
    }
  }
}

/**
 * Finds student by id from unified storage.
 */
export function getStudentById(id: string): FullStudentData | undefined {
  const list = getStoredStudents();
  return list.find((s) => s.id === id);
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
    balanceFormatted: '0 ₽',
    currency: 'RUB',
    pricePerLesson: 1050,
    pricePerLessonFormatted: '1 050 ₽',
  };

  const deduct = amountToDeduct || currentDeposit.pricePerLesson || 1050;
  const currencySymbol = currentDeposit.currency === 'EUR' ? '€' : '₽';
  const newBalance = (currentDeposit.balance || 0) - deduct;
  const formattedBalance = `${newBalance.toLocaleString('ru-RU')} ${currencySymbol}`;
  const formattedDeduct = `${deduct.toLocaleString('ru-RU')} ${currencySymbol}`;

  const todayStr = new Date().toLocaleDateString('ru-RU');
  const expenseInteraction: TimelineInteraction = {
    id: `int_deduct_${Date.now()}`,
    studentId: student.id,
    studentName: `${student.firstName} ${student.lastName}`,
    parentId: student.parents?.[0]?.id,
    parentName: student.parents?.[0] ? `${student.parents[0].firstName} ${student.parents[0].lastName}` : undefined,
    occurredAt: 'Только что',
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
    currency: (currentDeposit.currency as any) || 'RUB',
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
export function settleDebtsFromDeposit(studentId: string): {
  settled: boolean;
  settledAmount: number;
  remainingDeposit: number;
  remainingDebt: number;
} {
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
  const currencySymbol = currentDeposit?.currency === 'EUR' ? '€' : '₽';
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

        newInteractions.push({
          id: `int_settle_${Date.now()}_${p.id}`,
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          parentId: student.parents?.[0]?.id,
          parentName: student.parents?.[0] ? `${student.parents[0].firstName} ${student.parents[0].lastName}` : undefined,
          occurredAt: 'Только что',
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

        newInteractions.push({
          id: `int_settle_part_${Date.now()}_${p.id}`,
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          parentId: student.parents?.[0]?.id,
          parentName: student.parents?.[0] ? `${student.parents[0].firstName} ${student.parents[0].lastName}` : undefined,
          occurredAt: 'Только что',
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
        currency: (currentDeposit?.currency || 'RUB') as 'RUB' | 'EUR',
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

      const currencySymbol = donor.finance?.deposit?.currency === 'EUR' ? '€' : '₽';
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

          // Log interaction on debtor
          saveInteractionToStorage({
            id: `int_fam_settle_${Date.now()}_${debt.id}`,
            studentId: debtor.id,
            studentName: `${debtor.firstName} ${debtor.lastName}`,
            parentId,
            occurredAt: 'Только что',
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
            occurredAt: 'Только что',
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

          saveInteractionToStorage({
            id: `int_fam_part_${Date.now()}_${debt.id}`,
            studentId: debtor.id,
            studentName: `${debtor.firstName} ${debtor.lastName}`,
            parentId,
            occurredAt: 'Только что',
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
            currency: (donor.finance?.deposit?.currency || 'RUB') as 'RUB' | 'EUR',
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
}

/**
 * Reconciles all students and families so that neither an individual student nor a family
 * ever has an active debt while having unused deposit funds.
 */
export function reconcileAllStudentDepositsAndDebts(): void {
  if (typeof window === 'undefined') return;
  try {
    const students = getStoredStudents();
    for (const s of students) {
      if ((s.finance?.deposit?.balance || 0) > 0) {
        settleDebtsFromDeposit(s.id);
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
      settleFamilyDebtsFromFamilyDeposit(pid);
    }
  } catch (err) {
    console.error('Failed to reconcile all student deposits and debts:', err);
  }
}


