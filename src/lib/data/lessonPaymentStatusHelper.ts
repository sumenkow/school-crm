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

export interface TeacherAdmissionBadge {
  label: string;
  badgeClass: string;
  className: string;
  isTrial: boolean;
  isPaid: boolean;
}

/**
 * Returns exact admission status badge for teachers according to UI security defense:
 * - "● Оплачено" (bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full)
 * - "● Не оплачено" (bg-rose-50 text-rose-700 text-xs font-semibold px-2.5 py-0.5 rounded-full)
 * - "🎯 Пробное занятие" (bg-purple-50 text-purple-700 text-xs font-semibold px-2.5 py-0.5 rounded-full)
 */
export function getTeacherAdmissionBadge(
  studentId: string,
  isTrialStudent?: boolean,
  studentsList?: FullStudentData[]
): TeacherAdmissionBadge {
  const payStatus = getStudentLessonPaymentStatus(studentId, isTrialStudent, studentsList);
  if (payStatus.status === 'trial_paid' || payStatus.status === 'trial_unpaid') {
    const cls = 'bg-purple-50 text-purple-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-purple-200';
    return {
      label: '🎯 Пробное занятие',
      badgeClass: cls,
      className: cls,
      isTrial: true,
      isPaid: payStatus.status === 'trial_paid',
    };
  }
  if (payStatus.status === 'paid') {
    const cls = 'bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200';
    return {
      label: '● Оплачено',
      badgeClass: cls,
      className: cls,
      isTrial: false,
      isPaid: true,
    };
  }
  const cls = 'bg-rose-50 text-rose-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-rose-200';
  return {
    label: '● Не оплачено',
    badgeClass: cls,
    className: cls,
    isTrial: false,
    isPaid: false,
  };
}
