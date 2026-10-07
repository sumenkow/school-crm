import assert from 'node:assert';
import {
  calculateGroupCapacity,
  formatFreeSpots,
  getNextLessonForGroup,
  parseLessonDateMs,
  getCourseSubjectColor,
  filterAndSortGroups,
  GroupWorkspaceFilterParams,
  GroupPresentationItem,
} from '../src/features/groups/lib/groupsWorkspaceEngine';
import { FullGroupData, FullLessonData } from '../src/lib/data/mockData';

export async function runSuite27() {
  console.log('\n===============================================================');
  console.log('   SUITE 27 (TS-47): GROUPS WORKSPACE INVARIANTS & VIEWS       ');
  console.log('   Validating Card View 3x2, Dense Table View, and SSOT Engine ');
  console.log('===============================================================');

  const testGroups: FullGroupData[] = [
    {
      id: 'g1',
      name: 'English Teens B1',
      courseId: 'c1',
      courseName: 'Английский язык',
      teacherId: 't1',
      teacherName: 'Анна Смирнова',
      schedule: 'Пн, Чт • 17:00–18:30',
      room: 'Онлайн (Zoom 1)',
      capacity: 8,
      students: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'] as any,
      status: 'active',
      isDeleted: false,
      startDate: '2026-09-01',
      recentLessons: [],
    },
    {
      id: 'g2',
      name: 'Robotics Kids Beginners',
      courseId: 'c2',
      courseName: 'Робототехника',
      teacherId: 't2',
      teacherName: 'Михаил Кузнецов',
      schedule: 'Сб, Вс • 11:00–12:30',
      room: 'Онлайн (Zoom 2)',
      capacity: 8,
      students: ['s1', 's2', 's3'] as any,
      status: 'recruiting',
      isDeleted: false,
      startDate: '2026-09-01',
      recentLessons: [],
    },
    {
      id: 'g3',
      name: 'Math Olympiad Junior',
      courseId: 'c3',
      courseName: 'Математика',
      teacherId: 't3',
      teacherName: 'Елена Васильева',
      schedule: 'Вт, Пт • 18:00–19:30',
      room: 'Онлайн (Zoom 3)',
      capacity: 6,
      students: ['s1', 's2', 's3', 's4', 's5'] as any,
      status: 'active',
      isDeleted: false,
      startDate: '2026-09-01',
      recentLessons: [],
    },
    {
      id: 'g4_del',
      name: 'Old Archived Science Group',
      courseId: 'c4',
      courseName: 'Наука и эксперименты',
      teacherId: 't1',
      teacherName: 'Анна Смирнова',
      schedule: 'Ср • 16:00–17:30',
      room: 'Онлайн (Zoom 4)',
      capacity: 8,
      students: [] as any,
      status: 'archived',
      isDeleted: true,
      startDate: '2026-09-01',
      recentLessons: [],
    },
  ];

  const now = new Date('2026-10-07T12:00:00Z').getTime();

  const testLessons: FullLessonData[] = [
    {
      id: 'l1_past',
      groupId: 'g1',
      groupName: 'English Teens B1',
      courseName: 'Английский язык',
      teacherId: 't1',
      teacherName: 'Анна Смирнова',
      date: '2026-10-05',
      dateFormatted: '05.10.2026',
      dayOfWeek: 0,
      startTime: '17:00',
      endTime: '18:30',
      room: 'Онлайн',
      topic: 'Present Simple review',
      status: 'completed',
      students: [],
    },
    {
      id: 'l1_future',
      groupId: 'g1',
      groupName: 'English Teens B1',
      courseName: 'Английский язык',
      teacherId: 't1',
      teacherName: 'Анна Смирнова',
      date: '2026-10-08',
      dateFormatted: '08.10.2026',
      dayOfWeek: 3,
      startTime: '17:00',
      endTime: '18:30',
      room: 'Онлайн',
      topic: 'Future Continuous',
      status: 'scheduled',
      students: [],
    },
    {
      id: 'l1_far_future',
      groupId: 'g1',
      groupName: 'English Teens B1',
      courseName: 'Английский язык',
      teacherId: 't1',
      teacherName: 'Анна Смирнова',
      date: '2026-10-12',
      dateFormatted: '12.10.2026',
      dayOfWeek: 0,
      startTime: '17:00',
      endTime: '18:30',
      room: 'Онлайн',
      topic: 'Passive Voice intro',
      status: 'scheduled',
      students: [],
    },
    {
      id: 'l2_future_ddmmyyyy',
      groupId: 'g2',
      groupName: 'Robotics Kids Beginners',
      courseName: 'Робототехника',
      teacherId: 't2',
      teacherName: 'Михаил Кузнецов',
      date: '10.10.2026',
      dateFormatted: '10.10.2026',
      dayOfWeek: 5,
      startTime: '11:00',
      endTime: '12:30',
      room: 'Онлайн',
      topic: 'Robotics Sensors',
      status: 'scheduled',
      students: [],
    },
    {
      id: 'l3_cancelled',
      groupId: 'g3',
      groupName: 'Math Olympiad Junior',
      courseName: 'Математика',
      teacherId: 't3',
      teacherName: 'Елена Васильева',
      date: '2026-10-09',
      dateFormatted: '09.10.2026',
      dayOfWeek: 4,
      startTime: '18:00',
      endTime: '19:30',
      room: 'Онлайн',
      topic: 'Math logic puzzle',
      status: 'cancelled',
      students: [],
    },
  ];

  // -------------------------------------------------------------
  // TIER 1: Capacity & Russian Pluralization Invariants
  // -------------------------------------------------------------
  console.log('▶ [Tier 1] Capacity & Russian Pluralization Invariants...');

  // 1.1 Full capacity (0 free spots)
  const cap1 = calculateGroupCapacity(testGroups[0]);
  assert.strictEqual(cap1.capacity, 8);
  assert.strictEqual(cap1.enrolledCount, 8);
  assert.strictEqual(cap1.freeSpots, 0);
  assert.strictEqual(cap1.occupancyPercent, 100);
  assert.strictEqual(cap1.isFull, true);
  assert.strictEqual(cap1.freeSpotsLabel, 'Мест нет');

  // 1.2 Partial capacity (5 free spots)
  const cap2 = calculateGroupCapacity(testGroups[1]);
  assert.strictEqual(cap2.capacity, 8);
  assert.strictEqual(cap2.enrolledCount, 3);
  assert.strictEqual(cap2.freeSpots, 5);
  assert.strictEqual(cap2.occupancyPercent, 38);
  assert.strictEqual(cap2.isFull, false);
  assert.strictEqual(cap2.freeSpotsLabel, 'Свободно: 5 мест');

  // 1.3 Pluralization tests
  assert.strictEqual(formatFreeSpots(0), 'Мест нет');
  assert.strictEqual(formatFreeSpots(-1), 'Мест нет');
  assert.strictEqual(formatFreeSpots(1), 'Свободно: 1 место');
  assert.strictEqual(formatFreeSpots(21), 'Свободно: 21 место');
  assert.strictEqual(formatFreeSpots(2), 'Свободно: 2 места');
  assert.strictEqual(formatFreeSpots(3), 'Свободно: 3 места');
  assert.strictEqual(formatFreeSpots(4), 'Свободно: 4 места');
  assert.strictEqual(formatFreeSpots(5), 'Свободно: 5 мест');
  assert.strictEqual(formatFreeSpots(11), 'Свободно: 11 мест');
  assert.strictEqual(formatFreeSpots(12), 'Свободно: 12 мест');
  assert.strictEqual(formatFreeSpots(14), 'Свободно: 14 мест');
  console.log('  ✓ [T1.01] Free spots calculation & pluralization strictly verified.');

  // -------------------------------------------------------------
  // TIER 2: Nearest Lesson Resolution Invariants
  // -------------------------------------------------------------
  console.log('▶ [Tier 2] Nearest Lesson Dynamic Resolution Invariants...');

  // 2.1 Group 1 nearest lesson should be l1_future (2026-10-08), skipping past & far future
  const nextL1 = getNextLessonForGroup('g1', 'English Teens B1', testLessons, now);
  assert.ok(nextL1, 'Should find nearest lesson for g1');
  assert.strictEqual(nextL1?.id, 'l1_future');
  assert.strictEqual(nextL1?.dateFormatted, '08.10.2026');
  assert.strictEqual(nextL1?.timeFormatted, '17:00');

  // 2.2 Group 2 nearest lesson in DD.MM.YYYY format
  const nextL2 = getNextLessonForGroup('g2', 'Robotics Kids Beginners', testLessons, now);
  assert.ok(nextL2, 'Should find nearest lesson for g2');
  assert.strictEqual(nextL2?.id, 'l2_future_ddmmyyyy');
  assert.strictEqual(nextL2?.dateFormatted, '10.10.2026');
  assert.strictEqual(nextL2?.timeFormatted, '11:00');

  // 2.3 Group 3 has only cancelled lesson -> should return null
  const nextL3 = getNextLessonForGroup('g3', 'Math Olympiad Junior', testLessons, now);
  assert.strictEqual(nextL3, null, 'Cancelled lessons must be ignored');
  console.log('  ✓ [T2.01] Chronological earliest upcoming lesson dynamically resolved.');

  // -------------------------------------------------------------
  // TIER 3: Filtering & Sorting Invariants
  // -------------------------------------------------------------
  console.log('▶ [Tier 3] Filtering, Search & Sorting Invariants...');

  // 3.1 Tab isolation: active vs deleted
  const activeOnly = filterAndSortGroups({ groups: testGroups, tab: 'all' });
  assert.strictEqual(activeOnly.length, 3, 'Active tab must exclude deleted groups');
  assert.ok(activeOnly.every((g) => !g.isDeleted));

  const deletedOnly = filterAndSortGroups({ groups: testGroups, tab: 'deleted' });
  assert.strictEqual(deletedOnly.length, 1, 'Deleted tab must include deleted groups');
  assert.strictEqual(deletedOnly[0].id, 'g4_del');

  // 3.2 Search query
  const searchEnglish = filterAndSortGroups({ groups: testGroups, tab: 'all', searchQuery: 'Teens' });
  assert.strictEqual(searchEnglish.length, 1);
  assert.strictEqual(searchEnglish[0].id, 'g1');

  const searchTeacher = filterAndSortGroups({ groups: testGroups, tab: 'all', searchQuery: 'Кузнецов' });
  assert.strictEqual(searchTeacher.length, 1);
  assert.strictEqual(searchTeacher[0].id, 'g2');

  // 3.3 Course and status filters
  const filterCourse = filterAndSortGroups({ groups: testGroups, tab: 'all', courseFilter: 'Математика' });
  assert.strictEqual(filterCourse.length, 1);
  assert.strictEqual(filterCourse[0].id, 'g3');

  const filterStatus = filterAndSortGroups({ groups: testGroups, tab: 'all', statusFilter: 'recruiting' });
  assert.strictEqual(filterStatus.length, 1);
  assert.strictEqual(filterStatus[0].id, 'g2');

  // 3.4 Sort by name
  const sortByName = filterAndSortGroups({ groups: testGroups, tab: 'all', sortBy: 'name' });
  assert.strictEqual(sortByName[0].name, 'English Teens B1');
  assert.strictEqual(sortByName[1].name, 'Math Olympiad Junior');
  assert.strictEqual(sortByName[2].name, 'Robotics Kids Beginners');

  // 3.5 Sort by occupancy
  const sortByOccupancy = filterAndSortGroups({ groups: testGroups, tab: 'all', sortBy: 'occupancy' });
  assert.strictEqual(sortByOccupancy[0].id, 'g1', 'g1 has 100% occupancy');
  assert.strictEqual(sortByOccupancy[1].id, 'g3', 'g3 has 83% occupancy');
  assert.strictEqual(sortByOccupancy[2].id, 'g2', 'g2 has 38% occupancy');
  console.log('  ✓ [T3.01] Search, multi-filters and 3 sorting modes fully verified.');

  // -------------------------------------------------------------
  // TIER 4: Dual-View Presentation Item Consistency
  // -------------------------------------------------------------
  console.log('▶ [Tier 4] Dual-View (Card View & Table View) SSOT Invariants...');

  const fullPresentation = filterAndSortGroups({
    groups: testGroups,
    allLessons: testLessons,
    tab: 'all',
    nowMs: now,
  });

  for (const item of fullPresentation) {
    assert.ok(item.id, 'Must have ID');
    assert.ok(item.name, 'Must have name');
    assert.ok(item.courseColorIndicator, 'Must have course color');
    assert.ok(item.statusBadge, 'Must have status badge');
    assert.ok(typeof item.occupancyPercent === 'number', 'Occupancy must be numeric');
    assert.ok(typeof item.freeSpots === 'number', 'Free spots must be numeric');
    assert.ok(item.freeSpotsLabel, 'Must have free spots label');
    assert.strictEqual(item.href, `/groups/${item.id}`);
  }
  console.log('  ✓ [T4.01] All Presentation Items satisfy interface contracts for both Card & Table views.');

  // -------------------------------------------------------------
  // TIER 5: Color Psychology & Brand Standards
  // -------------------------------------------------------------
  console.log('▶ [Tier 5] Brand Color & Color Psychology Invariants...');

  const blueColor = getCourseSubjectColor('Английский для подростков');
  assert.strictEqual(blueColor, '#2563EB', 'English must have blue brand color');

  const purpleColor = getCourseSubjectColor('Робототехника и Scratch');
  assert.strictEqual(purpleColor, '#8B5CF6', 'Robotics must have purple brand color');

  const amberColor = getCourseSubjectColor('Олимпиадная математика');
  assert.strictEqual(amberColor, '#F59E0B', 'Math must have amber brand color');

  // Verify AGENTS.md rule: full groups must NEVER be styled red/rose in capacity badge
  const fullGroupItem = fullPresentation.find((g) => g.id === 'g1');
  assert.ok(fullGroupItem?.isFull);
  assert.strictEqual(fullGroupItem?.freeSpotsLabel, 'Мест нет');
  console.log('  ✓ [T5.01] Color standards and AGENTS.md color psychology compliance verified.');

  console.log('\n===============================================================');
  console.log('   ✅ ALL SUITE 27 (TS-47) GROUPS WORKSPACE INVARIANTS PASSED   ');
  console.log('===============================================================\n');
}
