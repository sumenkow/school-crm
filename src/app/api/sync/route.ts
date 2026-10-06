import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit/auditLogger';

export const dynamic = 'force-dynamic';

function toUUID(str?: string): string {
  if (!str) return '00000000-0000-0000-0000-000000000000';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str;
  }
  // Deterministic mapping for standard mock IDs
  const fixedMap: Record<string, string> = {
    '1': 'b1111111-1111-4111-8111-111111111111',
    '2': 'b2222222-2222-4222-8222-222222222222',
    '3': 'b3333333-3333-4333-8333-333333333333',
    '4': 'b4444444-4444-4444-8444-444444444444',
    '5': 'b5555555-5555-4555-8555-555555555555',
    'st_1': 'b1111111-1111-4111-8111-111111111111',
    'st_2': 'b2222222-2222-4222-8222-222222222222',
    'st_3': 'b3333333-3333-4333-8333-333333333333',
    'st_4': 'b4444444-4444-4444-8444-444444444444',
    'st_5': 'b5555555-5555-4555-8555-555555555555',
    'p1': 'a1111111-1111-4111-8111-111111111111',
    'p2': 'a2222222-2222-4222-8222-222222222222',
    'p3': 'a3333333-3333-4333-8333-333333333333',
    'p4': 'a4444444-4444-4444-8444-444444444444',
    'p5': 'a5555555-5555-4555-8555-555555555555',
    'p6': 'a6666666-6666-4666-8666-666666666666',
    'grp_1': 'c1111111-1111-4111-8111-111111111111',
    'grp_2': 'c2222222-2222-4222-8222-222222222222',
    'grp_3': 'c3333333-3333-4333-8333-333333333333',
    'grp_4': 'c4444444-4444-4444-8444-444444444444',
    'grp_5': 'c5555555-5555-4555-8555-555555555555',
    'grp_6': 'c6666666-6666-4666-8666-666666666666',
    'lead_1': 'd1111111-1111-4111-8111-111111111111',
    'lead_2': 'd2222222-2222-4222-8222-222222222222',
    'lead_3': 'd3333333-3333-4333-8333-333333333333',
  };
  if (fixedMap[str]) return fixedMap[str];

  // Convert custom string to valid pseudo-UUID v4 format
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const tail = Math.abs(hash * 31).toString(16).padStart(12, '0').slice(0, 12);
  return `${hex.slice(0, 8)}-aaaa-4aaa-8aaa-${tail}`;
}

function parseDateToISO(val?: string | number | null): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'number') {
    const d = new Date(val < 10000000000 ? val * 1000 : val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const str = String(val).trim();
  if (!str) return new Date().toISOString();

  if (str.includes('T') || (str.includes('-') && str.endsWith('Z'))) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  const ruMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (ruMatch) {
    const day = parseInt(ruMatch[1], 10);
    const month = parseInt(ruMatch[2], 10) - 1;
    const year = parseInt(ruMatch[3], 10);
    const hours = ruMatch[4] ? parseInt(ruMatch[4], 10) : 12;
    const minutes = ruMatch[5] ? parseInt(ruMatch[5], 10) : 0;
    const seconds = ruMatch[6] ? parseInt(ruMatch[6], 10) : 0;
    // Russian dates from browser are Moscow time (UTC+3).
    // Use Date.UTC and subtract 3h offset so the stored UTC is correct.
    const utcMs = Date.UTC(year, month, day, hours, minutes, seconds) - 3 * 60 * 60 * 1000;
    const d = new Date(utcMs);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoMatch) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  return new Date().toISOString();
}

export async function GET(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ success: false, error: 'Supabase unconfigured' }, { status: 500 });
    }

    const supabase = createAdminClient();

    // Fetch all core datasets concurrently
    const [
      { data: students },
      { data: parents },
      { data: studentParents },
      { data: groups },
      { data: enrollments },
      { data: leads },
      { data: tasks },
      { data: payments },
      { data: interactions },
      { data: courses },
      { data: teachers },
      { data: lessons },
      { data: attendances },
    ] = await Promise.all([
      supabase.from('students').select('*').order('created_at', { ascending: false }),
      supabase.from('parents').select('*').order('created_at', { ascending: false }),
      supabase.from('student_parents').select('*'),
      supabase.from('groups').select('*').order('created_at', { ascending: false }),
      supabase.from('enrollments').select('*'),
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('payments').select('*').order('created_at', { ascending: false }),
      supabase.from('interactions').select('*').order('created_at', { ascending: false }),
      supabase.from('courses').select('*').order('created_at', { ascending: true }),
      supabase.from('teachers').select('*').order('created_at', { ascending: true }),
      supabase.from('lessons').select('*').order('lesson_date', { ascending: false }),
      supabase.from('attendance').select('*'),
    ]);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        students: students || [],
        parents: parents || [],
        studentParents: studentParents || [],
        groups: groups || [],
        enrollments: enrollments || [],
        leads: leads || [],
        tasks: tasks || [],
        payments: payments || [],
        interactions: interactions || [],
        courses: courses || [],
        teachers: teachers || [],
        lessons: lessons || [],
        attendance: attendances || [],
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/sync:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Sync error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ success: false, error: 'Supabase unconfigured' }, { status: 500 });
    }

    const body = await request.json();
    const { entity, action, data } = body;

    if (!entity || !data) {
      return NextResponse.json({ success: false, error: 'Missing entity or data' }, { status: 400 });
    }

    const supabase = createAdminClient();

    switch (entity) {
      case 'student': {
        const studentId = toUUID(data.id);
        if (action === 'delete') {
          await supabase.from('students').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', studentId);
          await logAuditEvent({
            action: 'STUDENT_DELETE',
            entityType: 'student',
            entityId: studentId,
            description: `Архивирован ученик (ID: ${studentId})`,
            source: 'API',
            req: request,
          });
          return NextResponse.json({ success: true, action: 'deleted', id: studentId });
        }

        const studentRow = {
          id: studentId,
          first_name: data.firstName || (data.name ? data.name.split(' ')[0] : 'Ученик'),
          last_name: data.lastName || (data.name ? data.name.split(' ').slice(1).join(' ') : ''),
          birth_date: data.birthDate && data.birthDate.includes('.') ? data.birthDate.split('.').reverse().join('-') : (data.birthDate || null),
          phone: data.phone || null,
          telegram: data.telegram || null,
          email: data.email || null,
          status: data.status || 'active',
          notes: data.notes || null,
          updated_at: new Date().toISOString(),
          is_mock_data: false,
        };

        const { error: stErr } = await supabase.from('students').upsert(studentRow, { onConflict: 'id' });
        if (stErr) throw stErr;

        // Upsert parents and relations
        if (Array.isArray(data.parents) && data.parents.length > 0) {
          for (const p of data.parents) {
            const parentId = toUUID(p.id);
            await supabase.from('parents').upsert({
              id: parentId,
              first_name: p.firstName || (p.name ? p.name.split(' ')[0] : 'Родитель'),
              last_name: p.lastName || (p.name ? p.name.split(' ').slice(1).join(' ') : ''),
              phone: p.phone || null,
              telegram: p.telegram || null,
              whatsapp: p.whatsapp || null,
              email: p.email || null,
              preferred_channel: (p.preferredChannel === 'telegram' || p.preferredChannel === 'whatsapp' || p.preferredChannel === 'phone' || p.preferredChannel === 'email') ? p.preferredChannel : 'telegram',
              notes: p.notes || null,
              updated_at: new Date().toISOString(),
              is_mock_data: false,
            }, { onConflict: 'id' });

            const relType = (p.relationshipType || '').toLowerCase().includes('пап') || (p.relationshipType || '').toLowerCase().includes('отец')
              ? 'father'
              : (p.relationshipType || '').toLowerCase().includes('мам') || (p.relationshipType || '').toLowerCase().includes('мать')
              ? 'mother'
              : (p.relationshipType || '').toLowerCase().includes('опекун')
              ? 'guardian'
              : 'other';

            await supabase.from('student_parents').upsert({
              student_id: studentId,
              parent_id: parentId,
              relationship_type: relType,
              is_primary_contact: Boolean(p.isPrimary),
              created_at: new Date().toISOString(),
            }, { onConflict: 'student_id,parent_id' });
          }
        }

        await logAuditEvent({
          action: 'STUDENT_UPDATE',
          entityType: 'student',
          entityId: studentId,
          entityNameSnapshot: `${studentRow.first_name} ${studentRow.last_name}`.trim(),
          description: `Синхронизированы данные ученика ${studentRow.first_name} ${studentRow.last_name}`.trim(),
          afterData: studentRow,
          source: 'API',
          req: request,
        });

        return NextResponse.json({ success: true, id: studentId });
      }

      case 'parent': {
        const parentId = toUUID(data.id);
        if (action === 'delete') {
          await supabase.from('parents').update({ notes: '[ARCHIVED_DELETED]', updated_at: new Date().toISOString() }).eq('id', parentId);
          return NextResponse.json({ success: true, action: 'deleted', id: parentId });
        }

        const parentRow = {
          id: parentId,
          first_name: data.firstName || (data.name ? data.name.split(' ')[0] : 'Родитель'),
          last_name: data.lastName || (data.name ? data.name.split(' ').slice(1).join(' ') : ''),
          phone: data.phone || null,
          telegram: data.telegram || null,
          whatsapp: data.whatsapp || null,
          email: data.email || null,
          preferred_channel: (data.preferredChannel === 'telegram' || data.preferredChannel === 'whatsapp' || data.preferredChannel === 'phone' || data.preferredChannel === 'email') ? data.preferredChannel : 'telegram',
          notes: data.notes || null,
          updated_at: new Date().toISOString(),
          is_mock_data: false,
        };

        const { error: parErr } = await supabase.from('parents').upsert(parentRow, { onConflict: 'id' });
        if (parErr) throw parErr;

        return NextResponse.json({ success: true, id: parentId });
      }

      case 'lead': {
        const leadId = toUUID(data.id);
        if (action === 'delete') {
          await supabase.from('leads').update({ status: 'lost', is_mock_data: false }).eq('id', leadId);
          return NextResponse.json({ success: true, action: 'deleted', id: leadId });
        }

        const validStatuses = ['new', 'contacted', 'trial_scheduled', 'trial_held', 'thinking', 'paid', 'lost', 'no_response', 'enrolled'];
        let status = validStatuses.includes(data.status)
          ? data.status
          : (data.convertedStudentId || data.converted_student_id ? 'enrolled' : 'new');
        if (data.status === 'enrolled' || data.convertedStudentId || data.converted_student_id) {
          status = 'enrolled';
        }

        const leadRow = {
          id: leadId,
          name: data.name || 'Новый лид',
          contact: data.contact || '',
          parent_name: data.parentName || data.name || null,
          student_name: data.studentName || null,
          converted_student_id: data.convertedStudentId ? toUUID(data.convertedStudentId) : null,
          converted_parent_id: data.convertedParentId ? toUUID(data.convertedParentId) : null,
          direction_or_course: data.directionOrCourse || null,
          level: data.level || null,
          source: data.source || 'Прямая заявка',
          status: status,
          trial_date: data.trialDate && data.trialDate.includes('T') ? data.trialDate : null,
          offer_amount: data.offerAmount ? parseFloat(String(data.offerAmount).replace(/[^\d.]/g, '')) || null : null,
          loss_reason: data.lossReason || null,
          next_action: data.nextAction || null,
          next_action_date: data.nextActionDate || null,
          comment: data.comment || null,
          updated_at: new Date().toISOString(),
          is_mock_data: false,
        };

        const { error: ldErr } = await supabase.from('leads').upsert(leadRow, { onConflict: 'id' });
        if (ldErr) throw ldErr;

        return NextResponse.json({ success: true, id: leadId });
      }

      case 'task': {
        const taskId = toUUID(data.id);
        if (action === 'delete') {
          await supabase.from('tasks').update({ status: 'cancelled' }).eq('id', taskId);
          return NextResponse.json({ success: true, action: 'deleted', id: taskId });
        }

        const validStatuses = ['open', 'in_progress', 'done', 'cancelled'];
        const validPriorities = ['low', 'medium', 'high'];

        let taskDescription = data.description || '';
        if (data.createdByRole && !taskDescription.includes('<!--meta:')) {
          taskDescription = (taskDescription ? taskDescription + '\n' : '') + `<!--meta:createdByRole=${data.createdByRole};createdByName=${data.createdByName || ''}-->`;
        }

        // assigned_to in Supabase is a Foreign Key to profiles.id (UUID).
        // If data.assignedTo is already a UUID, keep it; otherwise leave null so DB doesn't reject non-UUID string
        let dbAssignedTo: string | null = null;
        if (data.assignedTo && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.assignedTo)) {
          dbAssignedTo = data.assignedTo;
        }

        const taskRow: Record<string, unknown> = {
          id: taskId,
          title: data.title || 'Задача',
          task_type: data.taskType || 'Retention',
          student_id: data.studentId ? toUUID(data.studentId) : null,
          parent_id: data.parentId ? toUUID(data.parentId) : null,
          lead_id: data.leadId ? toUUID(data.leadId) : null,
          due_date: data.dueDate ? (data.dueDate.includes('T') ? data.dueDate.slice(0, 10) : data.dueDate) : new Date().toISOString().slice(0, 10),
          status: validStatuses.includes(data.status) ? data.status : 'open',
          priority: validPriorities.includes(data.priority) ? data.priority : 'medium',
          description: taskDescription || null,
          assigned_to: dbAssignedTo,
          updated_at: new Date().toISOString(),
          is_mock_data: false,
        };

        // Try direct column write first (for when columns exist in Supabase)
        const rowWithColumns = {
          ...taskRow,
          ...(data.createdByRole ? { created_by_role: data.createdByRole } : {}),
          ...(data.createdByName ? { created_by_name: data.createdByName } : {}),
        };

        const { error: primaryErr } = await supabase.from('tasks').upsert(rowWithColumns, { onConflict: 'id' });

        if (primaryErr) {
          if (primaryErr.message?.includes('created_by_role') || (primaryErr as any).code === 'PGRST204') {
            // Column does not exist in Supabase yet — fallback to standard taskRow
            const { error: fallbackErr } = await supabase.from('tasks').upsert(taskRow, { onConflict: 'id' });
            if (fallbackErr) throw fallbackErr;
          } else {
            throw primaryErr;
          }
        }

        return NextResponse.json({ success: true, id: taskId });
      }

      case 'payment': {
        const paymentId = toUUID(data.id);
        const validStatuses = ['paid', 'expected', 'overdue', 'refund', 'pending', 'failed', 'cancelled'];
        const validMethods = ['card', 'cash', 'bank_transfer', 'sbp', 'invoice'];

        let paymentMethod = 'card';
        if (data.method || data.paymentMethod || data.payment_method) {
          const m = (data.method || data.paymentMethod || data.payment_method).toLowerCase();
          if (m.includes('налич')) paymentMethod = 'cash';
          else if (m.includes('сбп')) paymentMethod = 'sbp';
          else if (m.includes('счет') || m.includes('перевод') || m.includes('bank')) paymentMethod = 'bank_transfer';
        }

        const rawStatus = data.status === 'refunded' ? 'refund' : data.status;
        const status = validStatuses.includes(rawStatus) ? rawStatus : 'expected';

        const paymentRow = {
          id: paymentId,
          student_id: data.studentId || data.student_id ? toUUID(data.studentId || data.student_id) : null,
          parent_id: data.parentId || data.parent_id ? toUUID(data.parentId || data.parent_id) : null,
          amount: typeof data.amount === 'number' ? data.amount : (parseFloat(String(data.amount).replace(/[^\d.]/g, '')) || 0),
          payment_date: data.paymentDate ? (data.paymentDate.includes('.') ? data.paymentDate.split('.').reverse().join('-') : data.paymentDate.slice(0, 10)) : (data.date ? (data.date.includes('.') ? data.date.split('.').reverse().join('-') : data.date.slice(0, 10)) : new Date().toISOString().slice(0, 10)),
          period_label: data.periodLabel || data.period || data.period_label || 'Оплата',
          status: status,
          payment_method: validMethods.includes(paymentMethod) ? paymentMethod : 'card',
          comment: data.comment || null,
          is_mock_data: false,
        };

        const { error: payErr } = await supabase.from('payments').upsert(paymentRow, { onConflict: 'id' });
        if (payErr) throw payErr;

        await logAuditEvent({
          action: 'PAYMENT_UPDATE',
          entityType: 'payment',
          entityId: paymentId,
          description: `Зафиксирован платеж: ${paymentRow.amount} € (${paymentRow.status})`,
          afterData: paymentRow,
          source: 'API',
          req: request,
        });

        return NextResponse.json({ success: true, id: paymentId });
      }

      case 'interaction': {
        const interactionId = toUUID(data.id);
        const validChannels = ['telegram', 'whatsapp', 'phone', 'email', 'call', 'meeting', 'other'];
        const validTypes = ['initial_contact', 'follow_up', 'trial', 'payment', 'renewal', 'complaint', 'organizational', 'other'];

        const channel = validChannels.includes(data.channel) ? data.channel : 'other';
        const type = validTypes.includes(data.type) ? data.type : 'follow_up';
        const occurredAtIso = parseDateToISO(data.occurred_at || data.occurredAt || data.createdAt || data.created_at || data.date);

        const interactionRow = {
          id: interactionId,
          student_id: data.studentId || data.student_id ? toUUID(data.studentId || data.student_id) : null,
          parent_id: data.parentId || data.parent_id ? toUUID(data.parentId || data.parent_id) : null,
          lead_id: data.leadId || data.lead_id ? toUUID(data.leadId || data.lead_id) : null,
          occurred_at: occurredAtIso,
          channel,
          type,
          content: data.content || '',
          result: data.result || null,
          next_action: data.nextAction || null,
          follow_up_date: data.followUpDate ? (data.followUpDate.includes('.') ? data.followUpDate.split('.').reverse().join('-') : data.followUpDate) : null,
          is_mock_data: false,
        };

        const { error: intErr } = await supabase.from('interactions').upsert(interactionRow, { onConflict: 'id' });
        if (intErr) throw intErr;

        return NextResponse.json({ success: true, id: interactionId });
      }

      case 'group': {
        const groupId = toUUID(data.id);
        if (action === 'delete') {
          await supabase.from('groups').update({ status: 'archived', is_mock_data: false }).eq('id', groupId);
          await logAuditEvent({
            action: 'GROUP_DELETE',
            entityType: 'group',
            entityId: groupId,
            description: `Архивирована группа ${groupId}`,
            source: 'API',
            req: request,
          });
          return NextResponse.json({ success: true, action: 'deleted', id: groupId });
        }

        const validStatuses = ['active', 'recruiting', 'archived', 'finished', 'paused'];
        const groupRow = {
          id: groupId,
          name: data.name || 'Группа',
          course_id: data.courseId ? toUUID(data.courseId) : null,
          teacher_id: data.teacherId ? toUUID(data.teacherId) : null,
          capacity: data.capacity || 8,
          status: validStatuses.includes(data.status) ? data.status : 'active',
          schedule_rule: data.schedule ? { text: data.schedule } : null,
          start_date: data.startDate ? (data.startDate.includes('.') ? data.startDate.split('.').reverse().join('-') : data.startDate.slice(0, 10)) : new Date().toISOString().slice(0, 10),
          is_mock_data: false,
        };

        const { error: grpErr } = await supabase.from('groups').upsert(groupRow, { onConflict: 'id' });
        if (grpErr) throw grpErr;

        await logAuditEvent({
          action: 'GROUP_UPDATE',
          entityType: 'group',
          entityId: groupId,
          entityNameSnapshot: groupRow.name,
          description: `Обновлена группа «${groupRow.name}»`,
          afterData: groupRow,
          source: 'API',
          req: request,
        });

        return NextResponse.json({ success: true, id: groupId });
      }

      case 'lesson': {
        const lessonId = toUUID(data.id);
        if (action === 'delete') {
          await supabase.from('lessons').delete().eq('id', lessonId);
          await logAuditEvent({
            action: 'LESSON_DELETE',
            entityType: 'lesson',
            entityId: lessonId,
            description: `Удален урок ${lessonId}`,
            source: 'API',
            req: request,
          });
          return NextResponse.json({ success: true, action: 'deleted', id: lessonId });
        }

        const validStatuses = ['scheduled', 'completed', 'cancelled', 'rescheduled'];
        const lessonDate = data.date
          ? data.date.includes('.')
            ? data.date.split('.').reverse().join('-')
            : data.date.slice(0, 10)
          : data.lesson_date || new Date().toISOString().slice(0, 10);

        const teacherMap: Record<string, string> = {
          t1: 'b076ca06-bfcd-49df-af03-d1fc8c165608',
          t2: '391367d1-f8a8-490e-ba45-993d5b8b84fe',
          t3: 'b076ca06-bfcd-49df-af03-d1fc8c165608',
          t4: '391367d1-f8a8-490e-ba45-993d5b8b84fe',
        };

        const rawGroupId = data.groupId ? String(data.groupId) : null;
        const mappedGroupId = rawGroupId
          ? toUUID(rawGroupId.startsWith('grp_') ? rawGroupId : `grp_${rawGroupId}`)
          : null;

        const mappedTeacherId = teacherMap[data.teacherId] || (data.teacherId ? toUUID(data.teacherId) : null);

        const lessonRow = {
          id: lessonId,
          group_id: mappedGroupId,
          teacher_id: mappedTeacherId,
          lesson_date: lessonDate,
          start_time: data.startTime ? data.startTime.slice(0, 5) : '18:45',
          end_time: data.endTime ? data.endTime.slice(0, 5) : '20:15',
          topic: data.topic || data.title || 'Тема урока',
          online_meeting_url: data.onlineMeetingUrl || null,
          status: validStatuses.includes(data.status) ? data.status : 'scheduled',
          notes: data.notes || data.generalLessonNote || null,
        };

        const { error: lesErr } = await supabase.from('lessons').upsert(lessonRow, { onConflict: 'id' });
        if (lesErr) {
          console.warn('[Sync API] Lessons upsert notice:', lesErr);
        }

        // Also upsert attendance records if provided with students
        if (Array.isArray(data.students) && data.students.length > 0) {
          for (const s of data.students) {
            if (s.attendanceStatus && s.attendanceStatus !== 'not_marked') {
              const studentId = toUUID(s.id);
              await supabase.from('attendance').upsert({
                lesson_id: lessonId,
                student_id: studentId,
                status: s.attendanceStatus,
                notes: s.notes || null,
                marked_at: new Date().toISOString(),
              }, { onConflict: 'lesson_id,student_id' });
            }
          }
        }

        await logAuditEvent({
          action: 'LESSON_UPDATE',
          entityType: 'lesson',
          entityId: lessonId,
          entityNameSnapshot: lessonRow.topic,
          description: `Обновлен урок «${lessonRow.topic}» (${lessonRow.lesson_date})`,
          afterData: lessonRow,
          source: 'API',
          req: request,
        });

        return NextResponse.json({ success: true, id: lessonId });
      }

      case 'attendance': {
        const lessonId = toUUID(data.lessonId);
        if (Array.isArray(data.studentRecords)) {
          for (const rec of data.studentRecords) {
            if (rec.status && rec.status !== 'not_marked') {
              const studentId = toUUID(rec.studentId);
              await supabase.from('attendance').upsert({
                lesson_id: lessonId,
                student_id: studentId,
                status: rec.status,
                notes: rec.note || null,
                marked_at: new Date().toISOString(),
              }, { onConflict: 'lesson_id,student_id' });
            }
          }
        } else if (data.studentId) {
          const studentId = toUUID(data.studentId);
          await supabase.from('attendance').upsert({
            lesson_id: lessonId,
            student_id: studentId,
            status: data.status || 'present',
            notes: data.note || data.notes || null,
            marked_at: new Date().toISOString(),
          }, { onConflict: 'lesson_id,student_id' });
        }

        await logAuditEvent({
          action: 'ATTENDANCE_MARK',
          entityType: 'attendance',
          entityId: lessonId,
          description: `Зафиксирована посещаемость урока ${lessonId}`,
          afterData: data,
          source: 'API',
          req: request,
        });

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown entity: ${entity}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in POST /api/sync:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Sync error' }, { status: 500 });
  }
}
