import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  INITIAL_STUDENTS,
  INITIAL_GROUPS,
  INITIAL_LEADS,
  INITIAL_TASKS,
  INITIAL_LESSONS,
  INITIAL_TEACHERS,
} from '@/lib/data/mockData';
import { parsePaymentAmountEUR } from '@/lib/data/currencyHelper';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Send POST to this endpoint to seed or sync database entities',
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        { success: false, error: 'Supabase credentials not configured in environment' },
        { status: 500 }
      );
    }

    const supabase = createAdminClient();
    const results: Record<string, { inserted: number; errors?: any }> = {};

    // 1. Seed Teachers
    const teacherRows = INITIAL_TEACHERS.map((t) => ({
      id: String(t.id),
      first_name: t.name ? t.name.split(' ')[0] : 'Преподаватель',
      last_name: t.name ? t.name.split(' ').slice(1).join(' ') : '',
      phone: t.phone || null,
      email: t.email || null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    const { error: teachErr } = await supabase.from('teachers').upsert(teacherRows, { onConflict: 'id' });
    results.teachers = { inserted: teacherRows.length, errors: teachErr?.message };

    // 2. Seed Courses
    const courseRows = [
      { id: '1', name: 'Английский язык', subject: 'Иностранные языки', is_active: true, created_at: new Date().toISOString() },
      { id: '2', name: 'Математика и логика', subject: 'Точные науки', is_active: true, created_at: new Date().toISOString() },
      { id: '3', name: 'Программирование на Python', subject: 'Информатика и IT', is_active: true, created_at: new Date().toISOString() },
      { id: '4', name: 'Робототехника', subject: 'Информатика и IT', is_active: true, created_at: new Date().toISOString() },
      { id: '5', name: 'Подготовка к школе', subject: 'Развитие интеллекта', is_active: true, created_at: new Date().toISOString() },
      { id: '6', name: 'Шахматы', subject: 'Развитие интеллекта', is_active: true, created_at: new Date().toISOString() },
    ];
    const { error: courseErr } = await supabase.from('courses').upsert(courseRows, { onConflict: 'id' });
    results.courses = { inserted: courseRows.length, errors: courseErr?.message };

    // 3. Seed Groups
    const groupRows = INITIAL_GROUPS.map((g) => ({
      id: String(g.id),
      course_id: String(g.courseId || '1'),
      teacher_id: String(g.teacherId || '1'),
      name: g.name,
      capacity: g.capacity || 8,
      status: g.status === 'archived' ? 'archived' : g.status === 'recruiting' ? 'recruiting' : 'active',
      schedule_rule: g.schedule || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    const { error: groupErr } = await supabase.from('groups').upsert(groupRows, { onConflict: 'id' });
    results.groups = { inserted: groupRows.length, errors: groupErr?.message };

    // 4. Seed Parents
    const parentMap = new Map<string, any>();
    const studentParentRows: any[] = [];

    for (const s of INITIAL_STUDENTS) {
      for (const p of s.parents || []) {
        if (!parentMap.has(p.id)) {
          parentMap.set(p.id, {
            id: String(p.id),
            first_name: p.firstName || ((p as any).name ? (p as any).name.split(' ')[0] : 'Родитель'),
            last_name: p.lastName || ((p as any).name ? (p as any).name.split(' ').slice(1).join(' ') : ''),
            phone: p.phone || null,
            telegram: p.telegram || null,
            whatsapp: p.whatsapp || null,
            email: p.email || null,
            preferred_channel: p.preferredChannel || 'telegram',
            notes: p.notes || null,
            created_at: (p as any).createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_mock_data: false,
          });
        }

        studentParentRows.push({
          student_id: String(s.id),
          parent_id: String(p.id),
          relationship_type: p.relationshipType || 'Родитель',
          is_primary_contact: Boolean(p.isPrimary),
          created_at: new Date().toISOString(),
        });
      }
    }

    const parentRows = Array.from(parentMap.values());
    const { error: parentErr } = await supabase.from('parents').upsert(parentRows, { onConflict: 'id' });
    results.parents = { inserted: parentRows.length, errors: parentErr?.message };

    // 5. Seed Students
    const studentRows = INITIAL_STUDENTS.map((s) => ({
      id: String(s.id),
      first_name: s.firstName || 'Ученик',
      last_name: s.lastName || '',
      birth_date: s.birthDate || null,
      phone: s.phone || null,
      telegram: s.telegram || null,
      email: s.email || null,
      status: s.status || 'active',
      notes: s.notes || null,
      created_at: s.createdAt || new Date().toISOString(),
      updated_at: s.updatedAt || new Date().toISOString(),
      is_mock_data: false,
    }));
    const { error: stErr } = await supabase.from('students').upsert(studentRows, { onConflict: 'id' });
    results.students = { inserted: studentRows.length, errors: stErr?.message };

    // 6. Seed Student-Parent Relations
    const { error: spErr } = await supabase.from('student_parents').upsert(studentParentRows, { onConflict: 'student_id,parent_id' });
    results.student_parents = { inserted: studentParentRows.length, errors: spErr?.message };

    // 7. Seed Enrollments
    const enrollmentRows: any[] = [];
    for (const g of INITIAL_GROUPS) {
      for (const st of g.students || []) {
        enrollmentRows.push({
          id: `enr_${g.id}_${st.id}`,
          student_id: String(st.id),
          group_id: String(g.id),
          status: 'active',
          joined_at: st.joinedAt ? new Date().toISOString() : null,
          created_at: new Date().toISOString(),
        });
      }
    }
    const { error: enrErr } = await supabase.from('enrollments').upsert(enrollmentRows, { onConflict: 'id' });
    results.enrollments = { inserted: enrollmentRows.length, errors: enrErr?.message };

    // 8. Seed Leads
    const leadRows = INITIAL_LEADS.map((l) => ({
      id: String(l.id),
      name: l.name,
      contact: l.contact,
      parent_name: (l as any).parentName || l.name || null,
      student_name: l.studentName || null,
      converted_student_id: l.convertedStudentId || null,
      converted_parent_id: l.convertedParentId || null,
      direction_or_course: l.directionOrCourse || null,
      level: l.level || null,
      source: l.source || 'Прямая заявка',
      assigned_to: l.assignedTo || 'Елена Менеджер',
      status: l.status || 'new',
      trial_date: l.trialDate || null,
      offer_amount: l.offerAmount ? parseFloat(String(l.offerAmount).replace(/[^\d.]/g, '')) || null : null,
      next_action: l.nextAction || null,
      next_action_date: l.nextActionDate || null,
      comment: l.comment || null,
      created_at: l.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_mock_data: false,
    }));
    const { error: leadErr } = await supabase.from('leads').upsert(leadRows, { onConflict: 'id' });
    results.leads = { inserted: leadRows.length, errors: leadErr?.message };

    // 9. Seed Tasks
    const taskRows = INITIAL_TASKS.map((t) => ({
      id: String(t.id),
      title: t.title,
      task_type: t.taskType || 'Retention',
      student_id: t.studentId ? String(t.studentId) : null,
      parent_id: t.parentId ? String(t.parentId) : null,
      lead_id: t.leadId ? String(t.leadId) : null,
      assigned_to: t.assignedTo || 'Елена Менеджер',
      due_date: t.dueDate || new Date().toISOString().slice(0, 10),
      status: t.status || 'open',
      priority: t.priority || 'medium',
      description: t.description || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_mock_data: false,
    }));
    const { error: taskErr } = await supabase.from('tasks').upsert(taskRows, { onConflict: 'id' });
    results.tasks = { inserted: taskRows.length, errors: taskErr?.message };

    // 10. Seed Payments
    const paymentRows: any[] = [];
    for (const s of INITIAL_STUDENTS) {
      for (const p of s.finance?.payments || []) {
        paymentRows.push({
          id: String(p.id),
          student_id: String(s.id),
          parent_id: s.parents?.[0]?.id ? String(s.parents[0].id) : null,
          amount: parsePaymentAmountEUR(p.amount, 120),
          payment_date: p.date ? (p.date.includes('.') ? p.date.split('.').reverse().join('-') : p.date) : '2026-09-01',
          period_label: p.period || 'Сентябрь 2026',
          status: p.status || 'paid',
          payment_method: p.method || 'Банковская карта',
          recorded_by: 'Елена Менеджер',
          created_at: new Date().toISOString(),
          is_mock_data: false,
        });
      }
    }
    const { error: payErr } = await supabase.from('payments').upsert(paymentRows, { onConflict: 'id' });
    results.payments = { inserted: paymentRows.length, errors: payErr?.message };

    // 11. Seed Timeline Interactions
    const interactionRows: any[] = [];
    for (const s of INITIAL_STUDENTS) {
      for (const int of s.interactions || []) {
        interactionRows.push({
          id: String(int.id),
          student_id: String(s.id),
          parent_id: int.parentId ? String(int.parentId) : null,
          lead_id: int.leadId ? String(int.leadId) : null,
          occurred_at: int.occurredAt || new Date().toISOString(),
          channel: int.channel || 'other',
          type: int.type || 'follow_up',
          created_by: int.author || 'Елена Менеджер',
          content: int.content,
          result: int.result || null,
          next_action: int.nextAction || null,
          follow_up_date: int.followUpDate || null,
          created_at: int.createdAt || new Date().toISOString(),
          is_mock_data: false,
        });
      }
    }
    const { error: intErr } = await supabase.from('interactions').upsert(interactionRows, { onConflict: 'id' });
    results.interactions = { inserted: interactionRows.length, errors: intErr?.message };

    // 12. Seed Lessons & Attendance
    const lessonRows: any[] = [];
    const attendanceRows: any[] = [];

    for (const les of INITIAL_LESSONS) {
      lessonRows.push({
        id: String(les.id),
        group_id: String(les.groupId || '1'),
        teacher_id: String(les.teacherId || '1'),
        lesson_date: les.date ? (les.date.includes('.') ? les.date.split('.').reverse().join('-') : les.date) : '2026-09-01',
        start_time: les.startTime || '18:45',
        end_time: les.endTime || '20:15',
        topic: les.topic || 'Занятие по расписанию',
        status: les.status || 'scheduled',
        created_at: new Date().toISOString(),
      });

      for (const att of (les as any).attendance || (les as any).students || []) {
        attendanceRows.push({
          id: `att_${les.id}_${att.id || att.studentId}`,
          lesson_id: String(les.id),
          student_id: String(att.id || att.studentId),
          status: att.status || att.attendanceStatus || 'present',
          notes: att.notes || null,
          marked_by: 'Мария Иванова',
          marked_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      }
    }

    if (lessonRows.length > 0) {
      const { error: lesErr } = await supabase.from('lessons').upsert(lessonRows, { onConflict: 'id' });
      results.lessons = { inserted: lessonRows.length, errors: lesErr?.message };
    }
    if (attendanceRows.length > 0) {
      const { error: attErr } = await supabase.from('attendance').upsert(attendanceRows, { onConflict: 'id' });
      results.attendance = { inserted: attendanceRows.length, errors: attErr?.message };
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase database successfully initialized with CRM entities',
      results,
    });
  } catch (err: any) {
    console.error('Error seeding Supabase database:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Database seeding error' },
      { status: 500 }
    );
  }
}
