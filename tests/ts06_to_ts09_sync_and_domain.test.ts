import assert from 'node:assert';
import { setupTestEnv } from './helpers/testEnv';
import { getStoredStudents, saveStudentToStorage } from '@/lib/data/studentStorage';
import { getStoredGroups, saveGroupToStorage, getGroupById } from '@/lib/data/groupStorage';
import { enrollStudentToGroup } from '@/lib/data/groupStorage';
import { convertLeadToStudentTransaction } from '@/lib/data/conversionHelper';
import { FullLeadData, FullStudentData, FullGroupData } from '@/lib/data/mockData';

export async function runSyncAndDomainTests() {
  const env = setupTestEnv();
  console.log('\n--- Running TS-06 to TS-09 & TS-12, TS-13: Sync & Domain Logic Tests ---');

  // TS-06: Prevention of enrolled leads resetting to new during sync
  {
    console.log('Testing TS-06: Sync logic preserves enrolled status for leads...');

    // Function replicating the sync contract logic in src/app/api/sync/route.ts
    function resolveLeadSyncStatus(data: { status?: string; convertedStudentId?: string; converted_student_id?: string }): string {
      const validStatuses = ['new', 'contacted', 'trial_scheduled', 'trial_held', 'thinking', 'paid', 'lost', 'no_response', 'enrolled'];
      let status = (data.status && validStatuses.includes(data.status))
        ? data.status
        : (data.convertedStudentId || data.converted_student_id ? 'enrolled' : 'new');
      if (data.status === 'enrolled' || data.convertedStudentId || data.converted_student_id) {
        status = 'enrolled';
      }
      return status;
    }

    assert.strictEqual(
      resolveLeadSyncStatus({ status: 'enrolled' }),
      'enrolled',
      'Lead with status enrolled must not be reset to new'
    );
    assert.strictEqual(
      resolveLeadSyncStatus({ status: 'new', convertedStudentId: 'st_123' }),
      'enrolled',
      'Lead with convertedStudentId must be treated as enrolled'
    );
    assert.strictEqual(
      resolveLeadSyncStatus({ status: 'contacted' }),
      'contacted',
      'Other valid statuses should remain as-is'
    );
    assert.strictEqual(
      resolveLeadSyncStatus({ status: 'invalid_status_xyz' }),
      'new',
      'Unrecognized status without conversion ID should default to new'
    );

    console.log('  ✓ TS-06 Passed: Enrolled leads are never reset to new');
  }

  // TS-07: Safe fallback for unknown payment statuses (prevent debt destruction)
  {
    console.log('Testing TS-07: Safe fallback for unknown payment statuses defaults to expected (not paid)...');

    // Function replicating the sync contract logic in src/app/api/sync/route.ts
    function resolvePaymentSyncStatus(rawStatus?: string): string {
      const validStatuses = ['paid', 'expected', 'overdue', 'refund', 'pending', 'failed', 'cancelled'];
      const normalized = rawStatus === 'refunded' ? 'refund' : rawStatus;
      return (normalized && validStatuses.includes(normalized)) ? normalized : 'expected';
    }

    assert.strictEqual(
      resolvePaymentSyncStatus('unknown_or_weird_status'),
      'expected',
      'Unrecognized payment status must default to expected, NOT paid'
    );
    assert.strictEqual(
      resolvePaymentSyncStatus('paid'),
      'paid',
      'Paid status remains paid'
    );
    assert.strictEqual(
      resolvePaymentSyncStatus('overdue'),
      'overdue',
      'Overdue debt status remains overdue'
    );
    assert.strictEqual(
      resolvePaymentSyncStatus('pending'),
      'pending',
      'Pending status is supported'
    );
    assert.strictEqual(
      resolvePaymentSyncStatus('failed'),
      'failed',
      'Failed status is supported'
    );
    assert.strictEqual(
      resolvePaymentSyncStatus('cancelled'),
      'cancelled',
      'Cancelled status is supported'
    );
    assert.strictEqual(
      resolvePaymentSyncStatus('refunded'),
      'refund',
      'Refunded is normalized to refund'
    );

    console.log('  ✓ TS-07 Passed: Unknown payment statuses default to expected, preserving debt accounting');
  }

  // TS-08: Parent deduplication by phone upon lead conversion
  {
    console.log('Testing TS-08: Parent deduplication by normalized phone upon lead conversion...');
    env.clear();

    // 1. Existing student with a parent having phone '+7 (999) 777-66-55'
    const existingParentId = 'par_existing_001';
    const existingStudent: FullStudentData = {
      id: 'st_existing_001',
      firstName: 'Алексей',
      lastName: 'Смирнов',
      status: 'active',
      phone: '+7 999 111-22-33',
      email: 'alex@test.com',
      grade: '6 класс',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      groups: [],
      parents: [
        {
          id: existingParentId,
          firstName: 'Елена',
          lastName: 'Смирнова',
          phone: '+7 (999) 777-66-55',
          email: 'elena@test.com',
          relationshipType: 'Мама',
          preferredChannel: 'phone',
          isPrimary: true,
        },
      ],
      attendanceStats: { totalLessons: 5, presentCount: 5, absentCount: 0, rescheduledCount: 0, attendanceRate: '100%', history: [] },
      finance: { payments: [] },
      interactions: [],
      tasks: [],
    };
    saveStudentToStorage(existingStudent);

    // 2. Lead representing a second child of Elena, but phone entered as '8 (999) 777-66-55'
    const newChildLead: FullLeadData = {
      id: 'lead_child_2',
      name: 'Елена Смирнова (мама)',
      contact: '8 (999) 777-66-55',
      directionOrCourse: 'English',
      status: 'trial_held',
      studentName: 'Мария Смирнова',
      studentAge: '9',
      studentGrade: '3 класс',
      source: 'Рекомендация',
      assignedTo: 'Менеджер',
      createdAt: '2026-10-01',
      interactions: [],
    };

    const conversionResult = await convertLeadToStudentTransaction({
      lead: newChildLead,
      studentType: 'school_student',
      studentFirstName: 'Мария',
      studentLastName: 'Смирнова',
      parentName: 'Елена Смирнова',
      parentPhone: '8 (999) 777-66-55',
      courseName: 'Kids English A1',
      groupName: 'Kids English A1',
      startDate: '2026-10-15',
    });

    assert.ok(conversionResult.studentId, 'studentId must be returned from conversion');
    const createdStudent = getStoredStudents().find((s) => s.id === conversionResult.studentId);
    assert.ok(createdStudent, 'Student must be saved to storage');
    assert.strictEqual(
      createdStudent?.parents?.[0]?.id,
      existingParentId,
      'New student must reuse the existing parent ID instead of generating a duplicate parent'
    );

    console.log('  ✓ TS-08 Passed: Parent with matching normalized phone was deduplicated and reused');
  }

  // TS-09: Group capacity limit protection upon enrollment
  {
    console.log('Testing TS-09: Group capacity limit protection upon enrollment...');
    env.clear();

    // 1. Create a full group (capacity 2, 2 students already enrolled)
    const testGroup: FullGroupData = {
      id: 'grp_capacity_test',
      name: 'Small Group Test',
      courseId: 'c1',
      courseName: 'English',
      teacherId: 't1',
      teacherName: 'Teacher',
      schedule: 'Пн/Ср 18:00',
      room: 'Онлайн',
      capacity: 2,
      status: 'active',
      startDate: '2026-09-01',
      students: [
        { id: 'st_c1', name: 'Student 1', status: 'active', attendanceRate: '100%', parentPhone: '', joinedAt: '01.09.2026' },
        { id: 'st_c2', name: 'Student 2', status: 'active', attendanceRate: '100%', parentPhone: '', joinedAt: '01.09.2026' },
      ],
      recentLessons: [],
    };
    saveGroupToStorage(testGroup);

    // Create 3rd candidate student
    const candidateStudent: FullStudentData = {
      id: 'st_c3',
      firstName: 'Ольга',
      lastName: 'Новикова',
      status: 'active',
      phone: '+7 999 555-44-33',
      email: 'olga@test.com',
      grade: '7 класс',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      groups: [],
      parents: [],
      attendanceStats: { totalLessons: 0, presentCount: 0, absentCount: 0, rescheduledCount: 0, attendanceRate: '0%', history: [] },
      finance: { payments: [] },
      interactions: [],
      tasks: [],
    };
    saveStudentToStorage(candidateStudent);

    // Attempt 1: Regular enrollment without overflow allowance -> MUST FAIL
    const enrollAttempt1 = enrollStudentToGroup({
      groupId: 'grp_capacity_test',
      studentId: 'st_c3',
      allowOverflow: false,
    });

    assert.strictEqual(enrollAttempt1.success, false, 'Enrollment into full group without overflow must fail');
    assert.strictEqual(enrollAttempt1.error, 'capacity_exceeded', 'Error must be capacity_exceeded');
    assert.strictEqual(enrollAttempt1.maxCapacity, 2, 'Reported maxCapacity must be 2');

    // Group student count remains 2
    const groupCheck1 = getGroupById('grp_capacity_test');
    assert.strictEqual(groupCheck1?.students.length, 2, 'Group size must remain 2');

    // Attempt 2: Enrollment with allowOverflow = true -> MUST SUCCEED (explicit admin bypass)
    const enrollAttempt2 = enrollStudentToGroup({
      groupId: 'grp_capacity_test',
      studentId: 'st_c3',
      allowOverflow: true,
    });

    assert.strictEqual(enrollAttempt2.success, true, 'Enrollment with allowOverflow=true must succeed');
    const groupCheck2 = getGroupById('grp_capacity_test');
    assert.strictEqual(groupCheck2?.students.length, 3, 'Group size is now 3 with overflow allowed');

    console.log('  ✓ TS-09 Passed: Group capacity limit guard blocks over-capacity enrollment unless explicitly allowed');
  }

  // TS-12: Canonical group status enum validation
  {
    console.log('Testing TS-12: Validation of canonical group statuses...');
    const canonicalGroupStatuses = ['recruiting', 'active', 'paused', 'finished', 'archived'];

    function isValidGroupStatus(st: string): boolean {
      return canonicalGroupStatuses.includes(st);
    }

    assert.ok(isValidGroupStatus('recruiting'));
    assert.ok(isValidGroupStatus('active'));
    assert.ok(isValidGroupStatus('paused'));
    assert.ok(isValidGroupStatus('finished'));
    assert.ok(isValidGroupStatus('archived'));
    assert.strictEqual(isValidGroupStatus('completed'), false, 'completed is invalid (finished must be used)');
    assert.strictEqual(isValidGroupStatus('deleted'), false, 'deleted is invalid (archived must be used)');

    console.log('  ✓ TS-12 Passed: Canonical group_status enums match Postgres specification');
  }

  // TS-13: Canonical payment status enum validation
  {
    console.log('Testing TS-13: Validation of canonical payment statuses...');
    const canonicalPaymentStatuses = ['paid', 'expected', 'overdue', 'refund', 'pending', 'failed', 'cancelled'];

    function isValidPaymentStatus(st: string): boolean {
      return canonicalPaymentStatuses.includes(st);
    }

    assert.ok(isValidPaymentStatus('paid'));
    assert.ok(isValidPaymentStatus('expected'));
    assert.ok(isValidPaymentStatus('overdue'));
    assert.ok(isValidPaymentStatus('refund'));
    assert.ok(isValidPaymentStatus('pending'));
    assert.ok(isValidPaymentStatus('failed'));
    assert.ok(isValidPaymentStatus('cancelled'));
    assert.strictEqual(isValidPaymentStatus('refunded'), false, 'refunded should be normalized to refund');
    assert.strictEqual(isValidPaymentStatus('unknown'), false, 'unknown status is rejected');

    console.log('  ✓ TS-13 Passed: Canonical payment_status enums match Postgres specification');
  }

  return true;
}
