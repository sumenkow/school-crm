import { FullLeadData, FullStudentData, TimelineInteraction } from './mockData';
import { saveStudentToStorage } from './studentStorage';
import { qualifyAndConvertLead } from './leadStorage';
import { enrollStudentToGroup, getGroupById, getStoredGroups } from './groupStorage';
import { saveInteractionToStorage } from './timelineStorage';
import { createClient } from '@/lib/supabase/client';

export interface LeadConversionPayload {
  lead: FullLeadData;
  studentType: 'school_student' | 'adult_student';
  studentFirstName?: string;
  studentLastName?: string;
  studentBirthDate?: string;
  studentGrade?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  parentTelegram?: string;
  preferredChannel?: 'phone' | 'whatsapp' | 'telegram' | 'email';
  courseName: string;
  groupId?: string;
  groupName: string;
  teacherName?: string;
  schedule?: string;
  startDate: string;
  notes?: string;
  depositAmount?: number;
}

export async function convertLeadToStudentTransaction(payload: LeadConversionPayload) {
  const {
    lead,
    studentType,
    studentFirstName,
    studentLastName,
    studentBirthDate,
    studentGrade,
    parentName,
    parentPhone,
    parentEmail,
    parentTelegram,
    preferredChannel,
    courseName,
    groupId,
    groupName,
    teacherName,
    schedule,
    startDate,
    notes,
    depositAmount,
  } = payload;

  const studentId = `st_${Date.now()}`;
  const parentId = parentName ? `par_${Date.now()}` : undefined;

  const firstName =
    studentFirstName?.trim() ||
    lead.studentFirstName ||
    (lead.studentName ? lead.studentName.split(' ')[0] : '') ||
    (lead.name ? lead.name.split(' ')[0] : '') ||
    'Ученик';

  const lastName =
    studentLastName?.trim() ||
    lead.studentLastName ||
    (lead.studentName ? lead.studentName.split(' ').slice(1).join(' ') : '') ||
    (lead.name ? lead.name.split(' ').slice(1).join(' ') : '') ||
    '';

  const fullStudentName = `${firstName} ${lastName}`.trim();
  const effectiveBirthDate = studentBirthDate || undefined;
  const effectiveGrade = studentGrade || lead.studentGrade || lead.grade || (studentType === 'adult_student' ? 'Студент' : '1 класс');
  const effectivePhone = studentType === 'adult_student' ? (lead.contact || parentPhone) : undefined;
  const effectiveParentPhone = studentType === 'school_student' ? (parentPhone || lead.contact) : undefined;
  const effectiveParentName = studentType === 'school_student' ? (parentName || lead.name) : undefined;

  // Resolve target group
  let targetGroupId = groupId;
  let targetGroupName = groupName;
  let targetTeacherName = teacherName;
  let targetSchedule = schedule || 'Вт/Чт 18:00';

  if (targetGroupId) {
    const matchedGroup = getGroupById(targetGroupId);
    if (matchedGroup) {
      targetGroupName = matchedGroup.name;
      targetTeacherName = matchedGroup.teacherName || targetTeacherName;
      targetSchedule = matchedGroup.schedule || targetSchedule;
    }
  } else if (targetGroupName) {
    const allGroups = getStoredGroups();
    const matched = allGroups.find(g => g.name === targetGroupName || g.id === targetGroupName);
    if (matched) {
      targetGroupId = matched.id;
      targetGroupName = matched.name;
      targetTeacherName = matched.teacherName || targetTeacherName;
      targetSchedule = matched.schedule || targetSchedule;
    }
  }

  // 1. Create Student Data with complete normalized structure
  const newStudent: FullStudentData = {
    id: studentId,
    firstName: firstName,
    lastName: lastName,
    studentType: studentType || 'school_student',
    birthDate: effectiveBirthDate,
    grade: effectiveGrade,
    phone: effectivePhone,
    parentPhone: effectiveParentPhone,
    parentName: effectiveParentName,
    telegram: parentTelegram || lead.telegram,
    email: parentEmail,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isNewUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    parents: effectiveParentName
      ? [
          {
            id: parentId || `par_${Date.now()}`,
            firstName: effectiveParentName.split(' ')[0] || effectiveParentName,
            lastName: effectiveParentName.split(' ').slice(1).join(' ') || '',
            phone: effectiveParentPhone || lead.contact,
            telegram: parentTelegram || lead.telegram,
            email: parentEmail,
            preferredChannel: preferredChannel || 'phone',
            relationshipType: 'Родитель',
            isPrimary: true,
          },
        ]
      : [],
    groups: [
      {
        id: targetGroupId || `g_${Date.now()}`,
        name: targetGroupName || 'Основная группа',
        courseName: courseName || 'Курс',
        teacherName: targetTeacherName || 'Преподаватель',
        schedule: targetSchedule,
        status: 'active',
        joinedAt: startDate || new Date().toISOString().slice(0, 10),
      },
    ],
    attendanceStats: {
      totalLessons: 0,
      presentCount: 0,
      absentCount: 0,
      rescheduledCount: 0,
      attendanceRate: '100%',
      history: [],
    },
    finance: {
      activeSubscription: undefined,
      deposit: {
        balance: depositAmount || 0,
        balanceFormatted: `${depositAmount || 0} €`,
        currency: 'EUR',
        pricePerLesson: 15,
        pricePerLessonFormatted: '15 €',
      },
      payments: depositAmount && depositAmount > 0 ? [
        {
          id: `pay_${Date.now()}`,
          date: new Date().toLocaleDateString('ru-RU'),
          amount: `${depositAmount} €`,
          period: new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
          method: 'Банковский перевод (SEPA)',
          status: 'paid',
        }
      ] : [],
    },
    interactions: [],
    comments: [],
    teacherComments: [],
    tasks: [],
    documents: [],
    source: lead.source || 'Прямое обращение',
    notes: notes || lead.studentNotes || lead.comment || `Конвертирован из CRM лида. Источник: ${lead.source || 'Прямое обращение'}`,
  };

  // Save student to storage
  saveStudentToStorage(newStudent);

  // If we have an existing group id, enroll student into group list as well
  if (targetGroupId) {
    try {
      enrollStudentToGroup({
        groupId: targetGroupId,
        studentId: studentId,
        authorName: 'Администратор (Конвертация лида)',
      });
    } catch (err) {
      console.warn('Group enrollment error during lead conversion:', err);
    }
  }

  // 2. Qualify & Convert Lead
  qualifyAndConvertLead(lead.id, studentId, parentId);

  // 3. Add timeline interaction for conversion
  const conversionInteraction: TimelineInteraction = {
    id: `int_conv_${Date.now()}`,
    studentId: studentId,
    studentName: fullStudentName,
    occurredAt: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    createdAt: new Date().toISOString(),
    channel: 'other',
    type: 'status_change',
    author: 'Система CRM',
    content: `Лид успешно зачислен в ученики и добавлен в группу «${targetGroupName}» (${courseName}).`,
    result: 'Зачислен в ученики',
  };
  saveInteractionToStorage(conversionInteraction);

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

  return { studentId };
}
