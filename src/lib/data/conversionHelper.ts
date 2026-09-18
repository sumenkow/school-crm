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

  // 1. Create Student Data
  const newStudent: any = {
    id: studentId,
    name: lead.name,
    firstName: lead.studentFirstName || lead.name.split(' ')[0] || lead.name,
    lastName: lead.studentLastName || lead.name.split(' ')[1] || '',
    phone: studentType === 'adult_student' ? lead.contact : undefined,
    parentPhone: studentType === 'school_student' ? (parentPhone || lead.contact) : undefined,
    parentName: studentType === 'school_student' ? (parentName || lead.name) : undefined,
    status: 'active',
    joinedAt: startDate || new Date().toISOString().slice(0, 10),
    parents: parentName ? [{ id: parentId, name: parentName, phone: parentPhone || lead.contact, relationshipType: 'Мама/Папа', isPrimary: true }] : [],
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
