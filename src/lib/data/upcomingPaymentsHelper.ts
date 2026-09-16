import { getStoredStudents } from './studentStorage';
import { getStoredPayments } from './paymentStorage';
import { INITIAL_LEADS, FullLeadData, FullStudentData } from './mockData';
import { getEurRubRate, formatDualCurrency } from './currencyHelper';

export interface UpcomingPaymentItem {
  id: string;
  type: 'subscription' | 'expected_payment' | 'lead';
  studentId?: string;
  studentName: string;
  parentId?: string;
  parentName?: string;
  parentPhone?: string;
  parentWhatsapp?: string;
  leadId?: string;
  courseName: string;
  groupName?: string;
  amount: number;
  amountFormatted: string;
  currency?: 'EUR' | 'RUB';
  dueDate: string;
  daysRemaining: number;
  isUrgent: boolean;
  statusLabel: string;
}

function parseRussianDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  }
  const isoDate = new Date(dateStr);
  return isNaN(isoDate.getTime()) ? null : isoDate;
}

function calculateDaysDifference(targetDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Returns all upcoming payment deadlines across students, expected payments, and leads.
 */
export function getUpcomingPayments(): UpcomingPaymentItem[] {
  const result: UpcomingPaymentItem[] = [];
  const rate = getEurRubRate();
  const students = typeof window !== 'undefined' ? getStoredStudents() : [];
  const payments = typeof window !== 'undefined' ? getStoredPayments() : [];

  // 1. Process Student Active Subscriptions
  for (const student of students) {
    if (student.status !== 'active') continue;

    const sub = student.finance?.activeSubscription;
    if (sub && sub.renewalDate) {
      const renewalDateObj = parseRussianDate(sub.renewalDate);
      if (renewalDateObj) {
        const daysRemaining = calculateDaysDifference(renewalDateObj);
        // Include if renewal is within 14 days or slightly past due (0..14 days)
        if (daysRemaining >= -2 && daysRemaining <= 14) {
          const rawPrice = sub.price ? parseFloat(String(sub.price).replace(/[^\d.,]/g, '').replace(',', '.')) || 85 : 85;
          const isEur = rawPrice <= 500 || String(sub.price).includes('€');
          const finalEur = isEur ? rawPrice : Math.round((rawPrice / rate) * 100) / 100;
          const finalRub = isEur ? Math.round(rawPrice * rate) : rawPrice;
          const parent = student.parents?.[0];

          result.push({
            id: `upcoming_sub_${student.id}`,
            type: 'subscription',
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`.trim(),
            parentId: parent?.id,
            parentName: parent ? `${parent.firstName} ${parent.lastName}`.trim() : undefined,
            parentPhone: parent?.phone || student.phone,
            parentWhatsapp: parent?.whatsapp || parent?.phone,
            courseName: student.groups?.[0]?.courseName || 'Основной курс',
            groupName: student.groups?.[0]?.name,
            amount: finalEur,
            currency: 'EUR',
            amountFormatted: `${finalEur.toLocaleString('ru-RU')} € (≈ ${finalRub.toLocaleString('ru-RU')} ₽)`,
            dueDate: sub.renewalDate,
            daysRemaining,
            isUrgent: daysRemaining <= 3,
            statusLabel:
              daysRemaining <= 0
                ? 'Срок оплаты сегодня'
                : daysRemaining === 1
                ? 'Срок завтра'
                : `Осталось ${daysRemaining} дн.`,
          });
        }
      }
    }
  }

  // 2. Process Expected Payments from registry
  for (const pay of payments) {
    if (pay.status === 'expected') {
      const payDateObj = parseRussianDate(pay.paymentDate);
      const daysRemaining = payDateObj ? calculateDaysDifference(payDateObj) : 3;
      const isEur = pay.currency === 'EUR' || pay.amount <= 500;
      const finalEur = isEur ? pay.amount : Math.round((pay.amount / rate) * 100) / 100;
      const finalRub = isEur ? Math.round(pay.amount * rate) : pay.amount;

      result.push({
        id: `upcoming_pay_${pay.id}`,
        type: 'expected_payment',
        studentId: pay.studentId,
        studentName: pay.studentName,
        parentId: pay.parentId,
        parentName: pay.parentName,
        courseName: pay.courseName || pay.groupName || 'Курс школы',
        groupName: pay.groupName,
        amount: finalEur,
        currency: 'EUR',
        amountFormatted: `${finalEur.toLocaleString('ru-RU')} € (≈ ${finalRub.toLocaleString('ru-RU')} ₽)`,
        dueDate: pay.paymentDate,
        daysRemaining,
        isUrgent: daysRemaining <= 3,
        statusLabel:
          daysRemaining <= 0
            ? 'Счет ожидает оплаты'
            : daysRemaining === 1
            ? 'Оплата завтра'
            : `Ожидается через ${daysRemaining} дн.`,
      });
    }
  }

      // Avoid duplicates if already added via student
      if (!result.some((r) => r.studentId === pay.studentId && r.type === 'subscription')) {
        result.push({
          id: `upcoming_pay_${pay.id}`,
          type: 'expected_payment',
          studentId: pay.studentId,
          studentName: pay.studentName,
          parentId: pay.parentId,
          parentName: pay.parentName,
          courseName: pay.courseName || 'Обучение',
          groupName: pay.groupName,
          amount: pay.amount,
          amountFormatted: pay.amountFormatted || `${pay.amount.toLocaleString('ru-RU')} ₽`,
          dueDate: pay.paymentDate,
          daysRemaining,
          isUrgent: daysRemaining <= 3,
          statusLabel: daysRemaining <= 0 ? 'Ожидается сегодня' : `Ожидается через ${daysRemaining} дн.`,
        });
      }
    }
  }

  // 3. Process Leads awaiting payment after trial (lead conversions)
  const leads = typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('crm_leads_v2') || 'null') || INITIAL_LEADS) : INITIAL_LEADS;
  for (const lead of leads) {
    if (lead.status === 'trial_held' || lead.status === 'contract_sent') {
      const coursePrice = 7600;
      result.push({
        id: `upcoming_lead_${lead.id}`,
        type: 'lead',
        leadId: lead.id,
        studentName: lead.childName || lead.name,
        parentName: lead.parentName || lead.name,
        parentPhone: lead.phone,
        parentWhatsapp: lead.whatsapp || lead.phone,
        courseName: lead.course || 'Английский язык',
        amount: coursePrice,
        amountFormatted: `${coursePrice.toLocaleString('ru-RU')} ₽`,
        dueDate: 'В течение 3 дней',
        daysRemaining: 3,
        isUrgent: true,
        statusLabel: 'Оплата после пробного',
      });
    }
  }

  // Sort by daysRemaining ascending (most urgent first)
  return result.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Gets upcoming payment info for a specific student.
 */
export function getUpcomingPaymentForStudent(studentId: string): UpcomingPaymentItem | null {
  const all = getUpcomingPayments();
  return all.find((item) => item.studentId === studentId) || null;
}

/**
 * Gets upcoming payment info for a parent (and any of their children).
 */
export function getUpcomingPaymentForParent(parentId: string, childrenIds: string[] = []): UpcomingPaymentItem[] {
  const all = getUpcomingPayments();
  return all.filter((item) => item.parentId === parentId || (item.studentId && childrenIds.includes(item.studentId)));
}

/**
 * Gets upcoming payment info for a lead.
 */
export function getUpcomingPaymentForLead(leadId: string): UpcomingPaymentItem | null {
  const all = getUpcomingPayments();
  return all.find((item) => item.leadId === leadId) || null;
}
