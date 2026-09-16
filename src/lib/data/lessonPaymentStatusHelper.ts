import { getStoredStudents } from './studentStorage';
import { INITIAL_STUDENTS, FullStudentData } from './mockData';

export interface StudentLessonPaymentStatus {
  status: 'paid' | 'unpaid' | 'trial_paid' | 'trial_unpaid';
  label: string;
  badgeClass: string;
}

/**
 * Returns clean payment status for a student on a lesson without disclosing exact financial amounts.
 * Required for teachers and general attendance journals:
 * - "Занятие оплачено"
 * - "Пробное занятие (Оплачено)" / "Пробное занятие (Не оплачено)"
 * - "Занятие не оплачено"
 */
export function getStudentLessonPaymentStatus(
  studentId: string,
  isTrialStudent?: boolean,
  studentsList?: FullStudentData[]
): StudentLessonPaymentStatus {
  const allStudents = studentsList || (typeof window !== 'undefined' ? getStoredStudents() : INITIAL_STUDENTS);
  const student = allStudents.find((s) => s.id === studentId);

  const isTrial = Boolean(
    isTrialStudent ||
    student?.status === 'trial' ||
    student?.groups?.some((g: any) => g.status === 'trial')
  );

  const deposit = student?.finance?.deposit?.balance || 0;
  const hasOverdueDebt = (student?.finance?.payments || []).some((p) => p.status === 'overdue');

  if (isTrial) {
    const isTrialPaid = deposit > 0 || (student?.finance?.payments || []).some((p) => p.status === 'paid');
    if (isTrialPaid) {
      return {
        status: 'trial_paid',
        label: 'Пробное занятие (Оплачено)',
        badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200',
      };
    }
    return {
      status: 'trial_unpaid',
      label: 'Пробное занятие (Не оплачено)',
      badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300',
    };
  }

  if (hasOverdueDebt) {
    return {
      status: 'unpaid',
      label: 'Занятие не оплачено',
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200',
    };
  }

  return {
    status: 'paid',
    label: 'Занятие оплачено',
    badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  };
}
