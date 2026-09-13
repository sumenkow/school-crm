'use client';

import { FullStudentData, INITIAL_STUDENTS, TimelineInteraction } from './mockData';
import { saveInteractionToStorage } from './timelineStorage';

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
 * Persists student data to localStorage and syncs in-memory INITIAL_STUDENTS.
 * Dispatches a custom window event 'crm-students-changed' so all views sync in real time.
 */
export function saveStudentToStorage(student: FullStudentData): void {
  // 1. Update in-memory INITIAL_STUDENTS
  const idx = INITIAL_STUDENTS.findIndex((s) => s.id === student.id);
  if (idx !== -1) {
    INITIAL_STUDENTS[idx] = student;
  } else {
    INITIAL_STUDENTS.unshift(student);
  }

  // 2. Persist to localStorage
  if (typeof window !== 'undefined') {
    try {
      const all = getStoredStudents();
      const existingIdx = all.findIndex((s) => s.id === student.id);
      let updated: FullStudentData[];
      if (existingIdx !== -1) {
        updated = all.map((s) => (s.id === student.id ? student : s));
      } else {
        updated = [student, ...all];
      }
      localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(updated));

      // Notify other views
      window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: student }));
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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm-students-changed', { detail: updatedStudent }));
    window.dispatchEvent(new CustomEvent('crm-payments-changed'));
  }

  return {
    success: true,
    newBalance,
    message: `Списано ${formattedDeduct}. Остаток на депозите: ${formattedBalance}`,
    updatedStudent,
  };
}

