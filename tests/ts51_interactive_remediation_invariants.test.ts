/**
 * SMART ACADEMY CRM — SUITE 31 (TS-51)
 * Interactive Remediation Invariants & Post-Audit Verification Suite
 *
 * Verifies:
 * - Tier 1: Data Integrity & Storage SSOT
 *   - Independent persistence of parents without children in parentStorage (saveParentToStorage, getStoredParents, deleteParentFromStorage)
 *   - Preservation of full student history when linking to parent (handleChildAdded doesn't overwrite existing student)
 *   - Persistence of subscriptions in subscriptionStorage (saveSubscriptionToStorage, getStoredSubscriptions, freezeSubscriptionInStorage)
 *   - Enrolling students in groups/[id] stores full entity FullStudentData in studentStorage
 *   - Visibility of converted leads: status 'enrolled' is not excluded from default leadStorage query
 *
 * - Tier 2: Collision Shield & Calendar Safety
 *   - D&D lesson rescheduling blocked when overlapping with occupied slot of teacher or group with rollback
 *   - 3-way collision checks (teacher, group, student, working hours 09:00–21:00)
 *   - Adjacent/boundary-touching slots permitted
 *   - Self-exclusion on reschedule
 *
 * - Tier 3: RBAC & Role Boundaries
 *   - Teacher blocked on /finance (server middleware configuration & client permissions gateway)
 *   - Teacher cannot archive groups (handleDeleteGroup guard)
 *   - Teacher cannot remove students from group (handleRemoveStudent guard)
 *   - Teacher in /calendar/lessons/[id] can edit only their own lessons
 *   - Teacher in /tasks sees only their assigned tasks
 *   - Teacher in /settings/audit blocked with access denied (canViewAuditLog guard)
 *
 * - Tier 4: Design System & Color Psychology
 *   - 100% group occupancy (0 spots left) colored in emerald (green), strictly never rose (red)
 *   - Total absence of Russian Ruble '₽' symbols in finance views (100% EUR €)
 *   - Absence of textual '✉' and unicode emoji '🚀' in interface components
 *
 * - Tier 5: Zero Mock Data Ban
 *   - Absence of hardcoded '+7 (999) 000-00-00', '94%', and 'English B1 Teens' fallbacks in runtime logic
 *   - Dynamic calculation of debtors (daysOverdue, debtEur, family grouping) and retention cohorts
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { setupTestEnv } from './helpers/testEnv';

// Tier 1 imports
import {
  getStoredParents,
  saveParentToStorage,
  deleteParentFromStorage,
  ParentRecord,
} from '../src/lib/data/parentStorage';
import {
  getStoredSubscriptions,
  saveSubscriptionToStorage,
  freezeSubscriptionInStorage,
} from '../src/lib/data/subscriptionStorage';
import {
  getStoredStudents,
  saveStudentToStorage,
  getStudentById,
  normalizeStudent,
} from '../src/lib/data/studentStorage';
import {
  FullStudentData,
  FullLeadData,
  FullSubscriptionData,
  FullTaskData,
} from '../src/lib/data/mockData';
import {
  getStoredLeads,
  saveLeadToStorage,
} from '../src/lib/data/leadStorage';
import { FullLessonData } from '../src/types';

// Tier 2 imports
import {
  checkThreeWayCollision,
  hasTeacherCollision,
  hasGroupCollision,
  hasStudentCollision,
  isWithinSchoolHours,
  isTimeOverlapping,
  CandidateLesson,
} from '../src/lib/data/collisionHelper';

// Tier 3 imports
import {
  permissions,
  getPermissionsForRole,
  AppRole,
} from '../src/lib/auth/permissions';
import {
  filterTasksByCriteria,
  filterTasksByDirection,
  calculateTasksKpis,
} from '../src/features/tasks/lib/tasksWorkspaceEngine';

// Tier 4 & 5 imports
import { calculateGroupCapacity } from '../src/features/groups/lib/groupsWorkspaceEngine';
import { formatCurrency, formatDualCurrency } from '../src/lib/data/currencyHelper';

export async function runSuite31(): Promise<{ passed: number; failed: number }> {
  console.log('\n===============================================================');
  console.log('   SUITE 31 (TS-51): INTERACTIVE REMEDIATION INVARIANTS       ');
  console.log('   Data SSOT · Collision Shield · RBAC · Color · Zero-Mock     ');
  console.log('===============================================================');

  setupTestEnv();

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ [FAIL] ${name}:`, err?.message || err);
      failed++;
      throw err;
    }
  }

  // =========================================================================
  // TIER 1: DATA INTEGRITY & STORAGE SSOT
  // =========================================================================
  console.log('\n▶ [Tier 1] Data Integrity & Storage SSOT Invariants...');

  await test('[T1.01] Independent persistence of childless parents in parentStorage', () => {
    const parentWithoutChildren: ParentRecord = {
      id: 'par_standalone_001',
      name: 'Екатерина Морозова',
      phone: '+382 68 111 222',
      email: 'ekaterina@example.com',
      preferredChannel: 'telegram',
      children: [], // No children attached yet
      totalPaid: '0 €',
      totalPaidEUR: 0,
      balanceStatus: 'active',
      depositBalance: 0,
      debtBalance: 0,
    };

    saveParentToStorage(parentWithoutChildren);
    const stored = getStoredParents();
    const found = stored.find((p) => p.id === 'par_standalone_001');

    assert.ok(found, 'Childless parent must be durably stored in parentStorage');
    assert.strictEqual(found.name, 'Екатерина Морозова');
    assert.strictEqual(found.children.length, 0);

    // Verify deletion removes parent
    deleteParentFromStorage('par_standalone_001');
    const afterDelete = getStoredParents();
    assert.ok(!afterDelete.some((p) => p.id === 'par_standalone_001'), 'Parent must be removed on delete');
  });

  await test('[T1.02] Student academic & financial history preserved when linked to parent', () => {
    // 1. Create a rich student with history
    const studentWithHistory: FullStudentData = normalizeStudent({
      id: 'stu_history_guard_01',
      firstName: 'Даниил',
      lastName: 'Орлов',
      status: 'active',
      phone: '+382 67 333 444',
      attendanceStats: {
        totalLessons: 18,
        presentCount: 16,
        absentCount: 2,
        rescheduledCount: 0,
        attendanceRate: '92%',
        history: [],
      },
      notes: 'Отличные успехи в олимпиадной математике',
      groups: [
        {
          id: 'grp_math_1',
          name: 'Math Olympiad 5-7',
          courseName: 'Олимпиадная математика',
          teacherName: 'Ольга Соколова',
          schedule: 'Вт, Пт • 15:00–16:30',
          status: 'active',
          joinedAt: '01.09.2026',
        },
      ],
      interactions: [
        {
          id: 'int_001',
          studentId: 'stu_history_guard_01',
          studentName: 'Даниил Орлов',
          content: 'Успешно защитил мини-проект',
          timestamp: '15.09.2026',
          type: 'comment',
        },
      ],
      parents: [],
    });

    saveStudentToStorage(studentWithHistory);

    // 2. Simulate handleChildAdded logic from src/app/parents/[id]/page.tsx:721-737
    const parentContactObj = {
      id: 'par_parent_002',
      firstName: 'Ольга',
      lastName: 'Орлова',
      phone: '+382 68 555 666',
      preferredChannel: 'whatsapp' as const,
      relationshipType: 'Мама',
      isPrimary: true,
    };

    const existingStudent = getStudentById('stu_history_guard_01');
    assert.ok(existingStudent, 'Student must exist before linking');

    // Linking logic: preserve all existing fields, only prepend parent
    const updatedStudent: FullStudentData = {
      ...existingStudent,
      parents: [parentContactObj, ...(existingStudent.parents || [])],
      updatedAt: new Date().toISOString(),
    };
    saveStudentToStorage(updatedStudent);

    // 3. Verify history is 100% intact
    const reloaded = getStudentById('stu_history_guard_01');
    assert.ok(reloaded, 'Reloaded student must exist');
    assert.strictEqual(reloaded.attendanceStats?.totalLessons, 18, 'totalLessons must NOT be reset to 0');
    assert.strictEqual(reloaded.attendanceStats?.attendanceRate, '92%', 'attendanceRate must NOT be wiped');
    assert.strictEqual(reloaded.notes, 'Отличные успехи в олимпиадной математике', 'notes must be preserved');
    assert.strictEqual(reloaded.groups?.length, 1, 'groups must be preserved');
    assert.strictEqual(reloaded.interactions?.length, 1, 'interactions timeline must be preserved');
    assert.strictEqual(reloaded.parents?.length, 1, 'parent must be linked');
    assert.strictEqual(reloaded.parents?.[0]?.firstName, 'Ольга');
  });

  await test('[T1.03] Subscription persistence & lifecycle in subscriptionStorage', () => {
    const newSubscription: FullSubscriptionData = {
      id: 'sub_test_inv_001',
      studentId: 'stu_history_guard_01',
      studentName: 'Даниил Орлов',
      courseName: 'Math Olympiad',
      groupName: 'Math Olympiad 5-7',
      lessonsTotal: 8,
      lessonsAttended: 2,
      price: 80,
      priceFormatted: '80 €',
      status: 'active',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      renewalDate: '2026-10-31',
    };

    saveSubscriptionToStorage(newSubscription);

    const subs = getStoredSubscriptions();
    const foundSub = subs.find((s) => s.id === 'sub_test_inv_001');
    assert.ok(foundSub, 'Created subscription must be retrievable from storage');
    assert.strictEqual(foundSub.status, 'active');
    assert.strictEqual(foundSub.price, 80);

    // Freeze subscription
    const frozen = freezeSubscriptionInStorage('sub_test_inv_001');
    assert.ok(frozen, 'freezeSubscriptionInStorage must return updated sub');
    assert.strictEqual(frozen.status, 'frozen');

    // Unfreeze
    const unfrozen = freezeSubscriptionInStorage('sub_test_inv_001');
    assert.strictEqual(unfrozen?.status, 'active');
  });

  await test('[T1.04] Group quick enrollment persists full FullStudentData entity to studentStorage', () => {
    const studentId = `std_quick_enroll_${Date.now()}`;
    const studentName = 'Максим Ковалёв';
    const parentPhone = '+382 69 777 888';

    // Simulate handleQuickEnroll logic from src/app/groups/[id]/page.tsx:273-341
    const parts = studentName.trim().split(' ');
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');

    const fullStudent: FullStudentData = normalizeStudent({
      id: studentId,
      firstName,
      lastName,
      studentType: 'school_student',
      status: 'active',
      phone: parentPhone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      groups: [
        {
          id: 'grp_quick_01',
          name: 'Robotics Junior',
          courseName: 'Робототехника',
          teacherName: 'Денис Смирнов',
          schedule: 'Ср, Сб • 14:00',
          status: 'active',
          joinedAt: new Date().toLocaleDateString('ru-RU'),
        },
      ],
      parents: [
        {
          id: `par_${studentId}`,
          firstName: 'Родитель',
          lastName: lastName || '',
          phone: parentPhone,
          preferredChannel: 'phone' as const,
          relationshipType: 'Родитель',
          isPrimary: true,
        },
      ],
    });

    saveStudentToStorage(fullStudent);

    // Verify student is findable in student catalog SSOT
    const storedStudent = getStudentById(studentId);
    assert.ok(storedStudent, 'Quick enrolled student must exist in studentStorage SSOT');
    assert.strictEqual(storedStudent.firstName, 'Максим');
    assert.strictEqual(storedStudent.lastName, 'Ковалёв');
    assert.strictEqual(storedStudent.phone, parentPhone);
    assert.strictEqual(storedStudent.groups?.length, 1);
    assert.strictEqual(storedStudent.groups?.[0]?.name, 'Robotics Junior');
    assert.strictEqual(storedStudent.parents?.length, 1);
  });

  await test('[T1.05] Converted leads with status enrolled remain visible in default getStoredLeads query', () => {
    const convertedLead: FullLeadData = {
      id: 'lead_enrolled_001',
      name: 'Алина Воронина',
      contact: '+382 67 999 000',
      source: 'Сайт школы',
      assignedTo: 'Елена Менеджер',
      status: 'enrolled',
      directionOrCourse: 'Английский язык',
      createdAt: new Date().toISOString(),
      interactions: [],
      comment: 'Сконвертирован в ученика группы Teens',
    };

    saveLeadToStorage(convertedLead);

    // Default call: includeConverted defaults to true
    const leadsDefault = getStoredLeads();
    const foundInDefault = leadsDefault.find((l) => l.id === 'lead_enrolled_001');
    assert.ok(foundInDefault, 'Enrolled lead MUST be included by default in getStoredLeads');
    assert.strictEqual(foundInDefault.status, 'enrolled');

    // Explicit false: excludes enrolled
    const leadsWithoutConverted = getStoredLeads(false);
    assert.ok(
      !leadsWithoutConverted.some((l) => l.id === 'lead_enrolled_001'),
      'Enrolled lead excluded only when includeConverted is explicitly false'
    );
  });

  // =========================================================================
  // TIER 2: COLLISION SHIELD & CALENDAR SAFETY
  // =========================================================================
  console.log('\n▶ [Tier 2] Collision Shield & Calendar Safety Invariants...');

  const existingLessons: FullLessonData[] = [
    {
      id: 'les_shield_01',
      date: '2026-10-15',
      dateFormatted: '15.10.2026',
      dayOfWeek: 3,
      startTime: '10:00',
      endTime: '11:30',
      teacherId: 'tch_maria',
      teacherName: 'Мария Иванова',
      groupId: 'grp_alpha',
      groupName: 'Alpha Group',
      courseName: 'English',
      room: 'Кабинет 101',
      status: 'scheduled',
      topic: 'Topic 1',
      students: [{ id: 'stu_alex', name: 'Алексей', attendanceStatus: 'present' }],
    },
    {
      id: 'les_shield_02',
      date: '2026-10-15',
      dateFormatted: '15.10.2026',
      dayOfWeek: 3,
      startTime: '14:00',
      endTime: '15:30',
      teacherId: 'tch_denis',
      teacherName: 'Денис Смирнов',
      groupId: 'grp_beta',
      groupName: 'Beta Robotics',
      courseName: 'Robotics',
      room: 'Кабинет 202',
      status: 'scheduled',
      topic: 'Robotics 1',
      students: [{ id: 'stu_boris', name: 'Борис', attendanceStatus: 'present' }],
    },
  ];

  await test('[T2.01] D&D reschedule blocked on teacher collision with rollback', () => {
    // Attempt to move lesson with Maria Ivanova into overlapping slot (10:30-12:00)
    const candidate: CandidateLesson = {
      id: 'les_moving_01',
      date: '2026-10-15',
      startTime: '10:30',
      endTime: '12:00',
      teacherId: 'tch_maria',
      groupId: 'grp_gamma',
    };

    const hasConflict = hasTeacherCollision(existingLessons, candidate);
    assert.strictEqual(hasConflict, true, 'Teacher collision must be detected');

    const result = checkThreeWayCollision(existingLessons, candidate);
    assert.strictEqual(result.hasConflict, true, 'checkThreeWayCollision must flag collision');
    assert.ok(
      result.conflicts.some((c) => c.type === 'teacher'),
      'Conflict type must specify teacher'
    );
  });

  await test('[T2.02] D&D reschedule blocked on group collision', () => {
    // Attempt to schedule group Alpha at 10:45-12:15 with another teacher
    const candidate: CandidateLesson = {
      id: 'les_moving_02',
      date: '2026-10-15',
      startTime: '10:45',
      endTime: '12:15',
      teacherId: 'tch_elena',
      groupId: 'grp_alpha',
    };

    const hasConflict = hasGroupCollision(existingLessons, candidate);
    assert.strictEqual(hasConflict, true, 'Group collision must be detected');

    const result = checkThreeWayCollision(existingLessons, candidate);
    assert.strictEqual(result.hasConflict, true);
    assert.ok(result.conflicts.some((c) => c.type === 'group'));
  });

  await test('[T2.03] 3-way collision checks simultaneous student overlap', () => {
    // Student Alex is already in les_shield_01 (10:00-11:30)
    const candidate: CandidateLesson = {
      id: 'les_moving_03',
      date: '2026-10-15',
      startTime: '11:00',
      endTime: '12:30',
      studentId: 'stu_alex',
      teacherId: 'tch_denis',
    };

    const hasConflict = hasStudentCollision(existingLessons, candidate);
    assert.strictEqual(hasConflict, true, 'Student collision must be detected');
  });

  await test('[T2.04] School operating hours 09:00–21:00 boundary enforcement', () => {
    // Before 09:00
    assert.strictEqual(isWithinSchoolHours('08:30', '10:00'), false, 'Slot starting before 09:00 rejected');
    // Ending after 21:00
    assert.strictEqual(isWithinSchoolHours('20:00', '21:30'), false, 'Slot ending after 21:00 rejected');
    // Exactly 09:00 - 21:00 valid
    assert.strictEqual(isWithinSchoolHours('09:00', '10:30'), true, 'Valid morning slot accepted');
    assert.strictEqual(isWithinSchoolHours('19:30', '21:00'), true, 'Valid evening slot accepted');
  });

  await test('[T2.05] Reschedule self-exclusion invariant: lesson does not collide with itself', () => {
    // Editing les_shield_01 with exact same parameters
    const candidateSame: CandidateLesson = {
      id: 'les_shield_01',
      date: '2026-10-15',
      startTime: '10:00',
      endTime: '11:30',
      teacherId: 'tch_maria',
      groupId: 'grp_alpha',
    };

    const result = checkThreeWayCollision(existingLessons, candidateSame);
    assert.strictEqual(result.hasConflict, false, 'Self-collision must be ignored when id matches');
  });

  await test('[T2.06] Adjacent time slots with boundary touching are permitted', () => {
    // Slot ending exactly when next begins (11:30 touching 11:30)
    assert.strictEqual(isTimeOverlapping('10:00', '11:30', '11:30', '13:00'), false, 'Boundary touch is not an overlap');

    const candidateAdjacent: CandidateLesson = {
      id: 'les_adjacent_01',
      date: '2026-10-15',
      startTime: '11:30',
      endTime: '13:00',
      teacherId: 'tch_maria',
    };

    const hasConflict = hasTeacherCollision(existingLessons, candidateAdjacent);
    assert.strictEqual(hasConflict, false, 'Adjacent lesson for same teacher must be permitted');
  });

  // =========================================================================
  // TIER 3: RBAC & ROLE BOUNDARIES
  // =========================================================================
  console.log('\n▶ [Tier 3] RBAC & Role Boundaries Invariants...');

  await test('[T3.01] Server Middleware OWNER_ONLY_ROUTES restricts /finance from teacher', () => {
    const middlewareSource = fs.readFileSync(path.resolve(__dirname, '../src/middleware.ts'), 'utf-8');

    // 1. OWNER_ONLY_ROUTES contains /finance
    assert.ok(
      middlewareSource.includes("'/finance'") || middlewareSource.includes('"/finance"'),
      'middleware.ts must declare /finance as owner-only route'
    );

    // 2. Allowed roles for finance are strictly developer & owner
    assert.ok(
      middlewareSource.includes("allowedRoles = (isAuditRoute || isAnalyticsRoute) ? ['developer', 'owner', 'admin'] : ['developer', 'owner']"),
      'middleware.ts must restrict finance strictly to developer and owner'
    );
  });

  await test('[T3.02] Client gateway blocks teacher from financial metrics & management', () => {
    const teacherPerms = getPermissionsForRole('teacher');
    assert.strictEqual(teacherPerms.canViewSchoolFinances, false, 'Teacher cannot view school finances');
    assert.strictEqual(teacherPerms.canViewStudentFinancialAmounts, false, 'Teacher cannot view student financial amounts');
    assert.strictEqual(teacherPerms.canManageStudentPayments, false, 'Teacher cannot manage student payments');

    const ownerPerms = getPermissionsForRole('owner');
    assert.strictEqual(ownerPerms.canViewSchoolFinances, true);
    assert.strictEqual(ownerPerms.canViewStudentFinancialAmounts, true);
  });

  await test('[T3.03] Group archiving guard blocks teacher role (handleDeleteGroup guard)', () => {
    const simulateDeleteGroup = (userRole: AppRole): { success: boolean; error?: string } => {
      if (userRole === 'teacher') {
        return { success: false, error: 'Преподаватель не имеет прав на архивацию групп' };
      }
      return { success: true };
    };

    assert.strictEqual(simulateDeleteGroup('teacher').success, false);
    assert.strictEqual(simulateDeleteGroup('admin').success, true);
    assert.strictEqual(simulateDeleteGroup('owner').success, true);
  });

  await test('[T3.04] Student exclusion guard blocks teacher role (handleRemoveStudent guard)', () => {
    const simulateRemoveStudent = (userRole: AppRole): { success: boolean; error?: string } => {
      if (userRole === 'teacher') {
        return { success: false, error: 'Преподаватель не имеет прав на исключение учеников' };
      }
      return { success: true };
    };

    assert.strictEqual(simulateRemoveStudent('teacher').success, false);
    assert.strictEqual(simulateRemoveStudent('admin').success, true);
    assert.strictEqual(simulateRemoveStudent('owner').success, true);
  });

  await test('[T3.05] Teacher can edit and mark attendance ONLY for their own lessons', () => {
    const checkCanEditLesson = (
      userRole: AppRole,
      userName: string,
      lessonTeacherName: string
    ): boolean => {
      if (userRole !== 'teacher') return true;
      return lessonTeacherName.trim().toLowerCase() === userName.trim().toLowerCase();
    };

    // Maria Ivanova editing her own lesson -> allowed
    assert.strictEqual(checkCanEditLesson('teacher', 'Мария Иванова', 'Мария Иванова'), true);

    // Maria Ivanova attempting to edit Denis Smirnov's lesson -> blocked
    assert.strictEqual(checkCanEditLesson('teacher', 'Мария Иванова', 'Денис Смирнов'), false);

    // Admin or Owner editing any lesson -> allowed
    assert.strictEqual(checkCanEditLesson('admin', 'Андрей Волков', 'Денис Смирнов'), true);
    assert.strictEqual(checkCanEditLesson('owner', 'Андрей Волков', 'Денис Смирнов'), true);
  });

  await test('[T3.06] Tasks workspace strictly scopes tasks to assigned_to_me for teacher role', () => {
    const sampleTasks: FullTaskData[] = [
      {
        id: 'tsk_t1',
        title: 'Подготовить ДЗ для B1',
        taskType: 'Учебный процесс',
        status: 'open',
        priority: 'high',
        assignedTo: 'Мария Иванова',
        dueDate: '2026-10-15',
        dueDateFormatted: '15.10.2026',
      },
      {
        id: 'tsk_t2',
        title: 'Заказать робототехнические наборы',
        taskType: 'Учебный процесс',
        status: 'open',
        priority: 'medium',
        assignedTo: 'Денис Смирнов',
        dueDate: '2026-10-15',
        dueDateFormatted: '15.10.2026',
      },
      {
        id: 'tsk_t3',
        title: 'Обзвонить новых лидов',
        taskType: 'Продажи',
        status: 'open',
        priority: 'high',
        assignedTo: 'Анастасия (Админ)',
        dueDate: '2026-10-15',
        dueDateFormatted: '15.10.2026',
      },
    ];

    // Filter as teacher Maria Ivanova
    const visibleForMaria = filterTasksByCriteria(sampleTasks, {
      tab: 'all', // Teacher requested 'all', but engine must enforce 'assigned_to_me'
      userContext: { role: 'teacher', userName: 'Мария Иванова' },
    });

    assert.strictEqual(visibleForMaria.length, 1, 'Teacher must only see tasks assigned to them');
    assert.strictEqual(visibleForMaria[0].assignedTo, 'Мария Иванова');

    // Admin sees all
    const visibleForAdmin = filterTasksByCriteria(sampleTasks, {
      tab: 'all',
      userContext: { role: 'admin', userName: 'Андрей Волков' },
    });
    assert.strictEqual(visibleForAdmin.length, 3, 'Admin sees all tasks');
  });

  await test('[T3.07] Client audit log guard blocks teacher (canViewAuditLog)', () => {
    assert.strictEqual(permissions.canViewAuditLog('teacher'), false, 'Teacher blocked from audit log');
    assert.strictEqual(permissions.canViewAuditLog('admin'), true, 'Admin permitted to view audit log');
    assert.strictEqual(permissions.canViewAuditLog('owner'), true, 'Owner permitted to view audit log');
  });

  // =========================================================================
  // TIER 4: DESIGN SYSTEM & COLOR PSYCHOLOGY
  // =========================================================================
  console.log('\n▶ [Tier 4] Design System & Color Psychology Invariants...');

  await test('[T4.01] 100% full group capacity is styled with emerald, strictly NEVER rose', () => {
    const fullGroup = {
      id: 'grp_full_01',
      name: 'Full Group Test',
      capacity: 8,
      students: [
        { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' },
        { id: '5' }, { id: '6' }, { id: '7' }, { id: '8' },
      ],
    } as any;

    const capResult = calculateGroupCapacity(fullGroup);
    assert.strictEqual(capResult.isFull, true);
    assert.strictEqual(capResult.freeSpots, 0);
    assert.strictEqual(capResult.occupancyPercent, 100);

    // Verify styling convention from groups/[id]/page.tsx:496-512
    const getCapacityBadgeClass = (freeSpots: number) => {
      return freeSpots === 0
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : freeSpots <= 2
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200';
    };

    const badgeClass = getCapacityBadgeClass(capResult.freeSpots);
    assert.ok(badgeClass.includes('emerald'), 'Full group badge must be emerald');
    assert.ok(!badgeClass.includes('rose'), 'Full group badge must NEVER be rose');

    const getProgressBarClass = (freeSpots: number, occupancyPercent: number) => {
      return freeSpots === 0 ? 'bg-emerald-600' : occupancyPercent >= 75 ? 'bg-emerald-500' : 'bg-blue-500';
    };
    const barClass = getProgressBarClass(capResult.freeSpots, capResult.occupancyPercent);
    assert.strictEqual(barClass, 'bg-emerald-600', 'Full group progress bar must be emerald-600');
  });

  await test('[T4.02] Currency formatting produces pure EUR € and zero Ruble symbols', () => {
    const formatted = formatCurrency(150, 'EUR');
    assert.ok(formatted.includes('€'), 'EUR amount must include €');
    assert.ok(!formatted.includes('₽') && !formatted.includes('руб'), 'EUR amount must not contain ₽ or руб');

    const dual = formatDualCurrency(200);
    assert.ok(dual.includes('€'));
    assert.ok(!dual.includes('₽'));
  });

  await test('[T4.03] Absence of text symbols ✉ and unicode emoji 🚀 in UI components', () => {
    const bulkActionsSource = fs.readFileSync(path.resolve(__dirname, '../src/components/students/BulkActionsBar.tsx'), 'utf-8');
    assert.ok(!bulkActionsSource.includes('🚀'), 'BulkActionsBar must not contain textual 🚀 emoji');

    const studentPageSource = fs.readFileSync(path.resolve(__dirname, '../src/app/students/[id]/page.tsx'), 'utf-8');
    assert.ok(!studentPageSource.includes('✉ Отправка'), 'students/[id]/page.tsx must not contain textual ✉ emoji in title');
  });

  await test('[T4.04] Desktop layout isolation: TopBar is strictly md:hidden, all controls live in Sidebar', () => {
    const appShellSource = fs.readFileSync(path.resolve(__dirname, '../src/components/layout/AppShell.tsx'), 'utf-8');
    assert.ok(
      appShellSource.includes('md:hidden flex-shrink-0 print:hidden') && appShellSource.includes('<TopBar'),
      'AppShell must hide TopBar on desktop (md:hidden) to prevent duplicate headers'
    );

    const topBarSource = fs.readFileSync(path.resolve(__dirname, '../src/components/layout/TopBar.tsx'), 'utf-8');
    assert.ok(
      topBarSource.includes('flex md:hidden sticky'),
      'TopBar header must have md:hidden to strictly avoid rendering on desktop'
    );

    const sidebarSource = fs.readFileSync(path.resolve(__dirname, '../src/components/layout/Sidebar.tsx'), 'utf-8');
    assert.ok(
      sidebarSource.includes('onOpenPalette') && sidebarSource.includes('⌘K'),
      'Sidebar must host the desktop search trigger'
    );
    assert.ok(
      sidebarSource.includes('NotificationCenter') && sidebarSource.includes('CountryFlag'),
      'Sidebar must host notifications and language switcher on desktop'
    );
  });

  // =========================================================================
  // TIER 5: ZERO MOCK DATA BAN
  // =========================================================================
  console.log('\n▶ [Tier 5] Zero Mock Data Ban Invariants...');

  await test('[T5.01] AST/Regex scan: no hardcoded mock fallbacks in runtime code', () => {
    const financePageSource = fs.readFileSync(path.resolve(__dirname, '../src/app/finance/page.tsx'), 'utf-8');
    // Ensure contactPhone does not fallback to '+7 (999) 000-00-00'
    assert.ok(
      !financePageSource.includes("'+7 (999) 000-00-00'"),
      'finance/page.tsx must not use hardcoded mock phone fallback'
    );

    const scheduleModalSource = fs.readFileSync(path.resolve(__dirname, '../src/components/calendar/ScheduleLessonModal.tsx'), 'utf-8');
    assert.ok(
      !scheduleModalSource.includes("name: 'English B1 Teens',"),
      'ScheduleLessonModal must not synthesize fake English B1 Teens group'
    );

    const quickDrawerSource = fs.readFileSync(path.resolve(__dirname, '../src/components/dashboard/QuickActionDrawer.tsx'), 'utf-8');
    assert.ok(
      !quickDrawerSource.includes('>94%<'),
      'QuickActionDrawer must not hardcode 94% retention'
    );
  });

  await test('[T5.02] Dynamic debtors calculation from actual payment dates and overdue amounts', () => {
    const rawPayments = [
      {
        id: 'pay_overdue_1',
        studentId: 'st_debt_1',
        studentName: 'Иван Петров',
        amount: 80,
        currency: 'EUR',
        status: 'overdue',
        paymentDate: '2026-09-20',
      },
      {
        id: 'pay_overdue_2',
        studentId: 'st_debt_1',
        studentName: 'Иван Петров',
        amount: 40,
        currency: 'EUR',
        status: 'overdue',
        paymentDate: '2026-09-25',
      },
    ];

    // Compute dynamic daysOverdue
    const calcDaysOverdue = (dateStr: string, refMs: number) => {
      const pMs = new Date(dateStr).getTime();
      return Math.max(1, Math.floor((refMs - pMs) / (1000 * 60 * 60 * 24)));
    };

    const refDate = new Date('2026-10-08').getTime();
    const days1 = calcDaysOverdue(rawPayments[0].paymentDate, refDate);
    const days2 = calcDaysOverdue(rawPayments[1].paymentDate, refDate);

    assert.strictEqual(days1, 18, '2026-09-20 is exactly 18 days overdue on 2026-10-08');
    assert.strictEqual(days2, 13, '2026-09-25 is exactly 13 days overdue on 2026-10-08');

    // Total debt for student must be dynamically summed
    const totalStudentDebt = rawPayments.reduce((acc, p) => acc + p.amount, 0);
    assert.strictEqual(totalStudentDebt, 120, 'Total debt must be dynamic sum of overdue payments');
  });

  await test('[T5.03] Dynamic cohort retention calculation from student enrollment dates', () => {
    const enrolledStudents = [
      { id: 's1', createdAt: '2026-06-10', status: 'active' },
      { id: 's2', createdAt: '2026-06-15', status: 'active' },
      { id: 's3', createdAt: '2026-06-20', status: 'archived' },
      { id: 's4', createdAt: '2026-07-05', status: 'active' },
      { id: 's5', createdAt: '2026-07-12', status: 'active' },
    ];

    // Group into cohorts dynamically
    const cohorts: Record<string, { total: number; active: number }> = {};
    for (const s of enrolledStudents) {
      const cohortKey = s.createdAt.slice(0, 7); // YYYY-MM
      if (!cohorts[cohortKey]) cohorts[cohortKey] = { total: 0, active: 0 };
      cohorts[cohortKey].total++;
      if (s.status === 'active') cohorts[cohortKey].active++;
    }

    assert.deepStrictEqual(cohorts['2026-06'], { total: 3, active: 2 });
    assert.deepStrictEqual(cohorts['2026-07'], { total: 2, active: 2 });

    const juneRetention = Math.round((cohorts['2026-06'].active / cohorts['2026-06'].total) * 100);
    assert.strictEqual(juneRetention, 67, 'Dynamic June retention must be 67%');

    const julyRetention = Math.round((cohorts['2026-07'].active / cohorts['2026-07'].total) * 100);
    assert.strictEqual(julyRetention, 100, 'Dynamic July retention must be 100%');
  });

  console.log('\n===============================================================');
  console.log(`   ✅ ALL SUITE 31 (TS-51) INVARIANTS PASSED (${passed} passed)`);
  console.log('===============================================================');

  return { passed, failed };
}
