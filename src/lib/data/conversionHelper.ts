import { FullLeadData } from './mockData';
import { saveStudentToStorage } from './studentStorage';
import { savePaymentToStorage } from './paymentStorage';
import { qualifyAndConvertLead } from './leadStorage';
import { saveTaskToStorage } from './taskStorage';
import { createClient } from '@/lib/supabase/client';

export interface LeadConversionPayload {
  lead: FullLeadData;
  studentType: 'school_student' | 'adult_student';
  parentName?: string;
  parentPhone?: string;
  courseName: string;
  groupName: string;
  teacherName?: string;
  startDate: string;
  tariffAmount: number;
  currency: 'EUR' | 'RUB';
  paymentMethod: 'card' | 'cash' | 'bank_transfer';
  autoCreateInvoice: boolean;
}

export async function convertLeadToStudentTransaction(payload: LeadConversionPayload) {
  const { lead, studentType, parentName, parentPhone, courseName, groupName, teacherName, startDate, tariffAmount, currency, paymentMethod, autoCreateInvoice } = payload;
  const studentId = `st_${Date.now()}`;
  const parentId = parentName ? `par_${Date.now()}` : undefined;
  const paymentId = `pay_${Date.now()}`;

  const firstName = lead.studentFirstName || (lead.name ? lead.name.split(' ')[0] : '') || lead.name || 'Ученик';
  const lastName = lead.studentLastName || (lead.name ? lead.name.split(' ').slice(1).join(' ') : '') || '';

  // 1. Create Student Data with complete normalized structure
  const newStudent: any = {
    id: studentId,
    name: `${firstName} ${lastName}`.trim(),
    firstName: firstName,
    lastName: lastName,
    studentType: studentType || 'school_student',
    grade: studentType === 'adult_student' ? 'Студент' : '1 класс',
    phone: studentType === 'adult_student' ? lead.contact : undefined,
    parentPhone: studentType === 'school_student' ? (parentPhone || lead.contact) : undefined,
    parentName: studentType === 'school_student' ? (parentName || lead.name) : undefined,
    status: 'active',
    joinedAt: startDate || new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isNewUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    parents: parentName ? [{
      id: parentId,
      name: parentName,
      firstName: parentName.split(' ')[0] || parentName,
      lastName: parentName.split(' ').slice(1).join(' ') || '',
      phone: parentPhone || lead.contact,
      relationshipType: 'Мама/Папа',
      isPrimary: true,
      createdAt: new Date().toISOString(),
      isNewUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }] : [],
    groups: [{
      id: `g_${Date.now()}`,
      name: groupName || 'Основная группа',
      courseName: courseName || 'Курс',
      teacherName: teacherName || 'Преподаватель',
      schedule: 'Вт/Чт 18:00',
      status: 'active',
      joinedAt: startDate || new Date().toISOString().slice(0, 10),
    }],
    attendanceStats: {
      totalLessons: 0,
      presentCount: 0,
      absentCount: 0,
      rescheduledCount: 0,
      attendanceRate: '100%',
      history: [],
    },
    finance: {
      activeSubscription: null,
      deposit: {
        balance: 0,
        balanceFormatted: currency === 'EUR' ? '0 €' : '0 ₽',
        currency: currency || 'EUR',
        pricePerLesson: tariffAmount ? Math.max(1, Math.round(tariffAmount / 8)) : 12,
        pricePerLessonFormatted: currency === 'EUR' ? '12 €' : '1 050 ₽',
      },
      payments: [],
    },
    interactions: [],
    comments: [],
    teacherComments: [],
    tasks: [],
    documents: [],
    source: lead.source || 'Прямое обращение',
    notes: lead.comment ? `Источник: ${lead.source || 'Прямое обращение'}. ${lead.comment}` : `Источник: ${lead.source || 'Прямое обращение'}`,
  };

  saveStudentToStorage(newStudent);

  // 2. Create Pending Invoice / Payment if checked
  if (autoCreateInvoice) {
    savePaymentToStorage({
      id: paymentId,
      studentId: studentId,
      studentName: lead.name,
      parentId: parentId,
      parentName: parentName,
      courseName: courseName || 'Обучение',
      groupName: groupName || 'Группа',
      amount: tariffAmount,
      amountFormatted: currency === 'EUR' ? `${tariffAmount} €` : `${tariffAmount.toLocaleString('ru-RU')} ₽`,
      paymentDate: new Date().toLocaleDateString('ru-RU'),
      periodLabel: 'Первый абонемент',
      status: 'expected',
      paymentMethod: paymentMethod === 'bank_transfer' ? 'invoice' : paymentMethod,
      currency: currency,
      paymentType: 'subscription',
      recordedBy: 'Администратор',
      comment: `Счет для зачисления лида ${lead.name}`,
    });
  }

  // 3. Qualify & Convert Lead
  qualifyAndConvertLead(lead.id, studentId, parentId);

  // 4. Supabase DB RPC / direct table upsert fallback
  try {
    const supabase = createClient();
    await supabase.from('leads').update({
      status: 'enrolled',
      converted_student_id: studentId,
    }).eq('id', lead.id);
  } catch (err) {
    console.warn('Supabase lead convert update error:', err);
  }

  return { studentId, paymentId, payUrl: `https://pay.smartacademy.com/${paymentId}` };
}
