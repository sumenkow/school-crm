import { Student, Parent, StudentParentRelation, Group, Lesson, Attendance, Payment, Subscription, Task } from '@/types';

export interface TimelineInteraction {
  id: string;
  studentId?: string;
  parentId?: string;
  occurredAt: string;
  channel: 'telegram' | 'whatsapp' | 'phone' | 'email' | 'call' | 'meeting' | 'other';
  type: 'initial_contact' | 'follow_up' | 'trial' | 'payment' | 'renewal' | 'complaint' | 'organizational' | 'other';
  author: string;
  content: string;
  result?: string;
  nextAction?: string;
  followUpDate?: string;
}

export interface FullStudentData extends Student {
  parents: Array<Parent & { relationshipType: string; isPrimary: boolean }>;
  groups: Array<{
    id: string;
    name: string;
    courseName: string;
    teacherName: string;
    schedule: string;
    status: string;
    joinedAt: string;
  }>;
  attendanceStats: {
    totalLessons: number;
    presentCount: number;
    absentCount: number;
    rescheduledCount: number;
    attendanceRate: string;
    history: Array<{
      date: string;
      groupName: string;
      topic: string;
      status: 'present' | 'absent' | 'rescheduled' | 'cancelled';
      notes?: string;
    }>;
  };
  finance: {
    activeSubscription?: {
      period: string;
      price: string;
      status: string;
      lessonsAttended: string;
      renewalDate: string;
    };
    payments: Array<{
      id: string;
      date: string;
      amount: string;
      period: string;
      method: string;
      status: 'paid' | 'expected' | 'overdue';
    }>;
  };
  interactions: TimelineInteraction[];
  tasks: Task[];
}

export const INITIAL_STUDENTS: FullStudentData[] = [
  {
    id: '1',
    firstName: 'Иван',
    lastName: 'Смирнов',
    birthDate: '2012-05-14',
    phone: '+7 (999) 111-22-33',
    telegram: '@ivan_smirnov',
    email: 'ivan.smirnov@example.com',
    status: 'active',
    notes: 'Ученик мотивирован, готовится к сдаче международного кембриджского теста.',
    createdAt: '2026-08-15T10:00:00Z',
    updatedAt: '2026-09-01T12:00:00Z',
    parents: [
      {
        id: 'p1',
        firstName: 'Ольга',
        lastName: 'Смирнова',
        phone: '+7 (999) 123-45-67',
        telegram: '@olga_smirnova',
        whatsapp: '+79991234567',
        preferredChannel: 'telegram',
        notes: 'Отвечает быстрее всего в Telegram после 18:00',
        relationshipType: 'Мама',
        isPrimary: true,
      },
      {
        id: 'p2',
        firstName: 'Алексей',
        lastName: 'Смирнов',
        phone: '+7 (999) 987-65-43',
        telegram: '@alex_smirnov',
        preferredChannel: 'phone',
        notes: 'Отец, звонить только по экстренным вопросам',
        relationshipType: 'Отец',
        isPrimary: false,
      },
    ],
    groups: [
      {
        id: 'g1',
        name: 'English B1 Teens',
        courseName: 'Английский язык',
        teacherName: 'Мария Иванова',
        schedule: 'Пн, Чт • 18:45–20:15',
        status: 'active',
        joinedAt: '01.09.2026',
      },
    ],
    attendanceStats: {
      totalLessons: 16,
      presentCount: 15,
      absentCount: 1,
      rescheduledCount: 0,
      attendanceRate: '94%',
      history: [
        { date: '01.09.2026', groupName: 'English B1 Teens', topic: 'Present Perfect vs Past Simple', status: 'present' },
        { date: '28.08.2026', groupName: 'English B1 Teens', topic: 'Phrasal verbs in context', status: 'present' },
        { date: '25.08.2026', groupName: 'English B1 Teens', topic: 'Reading & Vocabulary booster', status: 'present' },
        { date: '21.08.2026', groupName: 'English B1 Teens', topic: 'Speaking club: Travelling', status: 'absent', notes: 'Семейная поездка' },
        { date: '18.08.2026', groupName: 'English B1 Teens', topic: 'Grammar recap', status: 'present' },
      ],
    },
    finance: {
      activeSubscription: {
        period: '01.09.2026 – 30.09.2026',
        price: '7 600 ₽',
        status: 'active',
        lessonsAttended: '2 из 8 занятий',
        renewalDate: '28.09.2026',
      },
      payments: [
        { id: 'pay1', date: '01.09.2026', amount: '7 600 ₽', period: 'Сентябрь 2026', method: 'Банковская карта', status: 'paid' },
        { id: 'pay2', date: '01.08.2026', amount: '7 600 ₽', period: 'Август 2026', method: 'Банковская карта', status: 'paid' },
      ],
    },
    interactions: [
      {
        id: 'int1',
        occurredAt: 'Сегодня, 11:30',
        channel: 'telegram',
        type: 'follow_up',
        author: 'Елена Менеджер',
        content: 'Уточнила у мамы Ольги получение домашнего задания. Все материалы скачали, вопросов нет.',
        result: 'Ученик готов к следующему уроку',
        nextAction: 'Контроль посещаемости в четверг',
        followUpDate: '04.09.2026',
      },
      {
        id: 'int2',
        occurredAt: '01.09.2026, 14:10',
        channel: 'telegram',
        type: 'payment',
        author: 'Елена Менеджер',
        content: 'Отправлен чек об оплате абонемента на сентябрь (7 600 ₽).',
        result: 'Оплата успешно зафиксирована',
      },
      {
        id: 'int3',
        occurredAt: '25.08.2026, 17:00',
        channel: 'phone',
        type: 'trial',
        author: 'Мария Иванова',
        content: 'Провели тестирование уровня знаний перед стартом учебного года. Уверенный B1.',
        result: 'Зачислен в основную группу B1 Teens',
      },
    ],
    tasks: [
      {
        id: 't1',
        title: 'Предложить продление абонемента на октябрь со скидкой 5%',
        taskType: 'Продление',
        studentId: '1',
        assignedTo: 'Елена Менеджер',
        dueDate: '25.09.2026',
        status: 'open',
        priority: 'medium',
      },
    ],
  },
  {
    id: '2',
    firstName: 'Мария',
    lastName: 'Кузнецова',
    birthDate: '2014-03-22',
    phone: '+7 (999) 222-33-44',
    status: 'active',
    notes: 'Занимается в паре с братом Артёмом.',
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-09-02T15:00:00Z',
    parents: [
      {
        id: 'p3',
        firstName: 'Дмитрий',
        lastName: 'Кузнецов',
        phone: '+7 (999) 234-56-78',
        telegram: '@dkuznetsov',
        whatsapp: '+79992345678',
        preferredChannel: 'whatsapp',
        notes: 'Отец двоих учеников (Мария и Артём). Предпочитает WhatsApp.',
        relationshipType: 'Отец',
        isPrimary: true,
      },
    ],
    groups: [
      {
        id: 'g2',
        name: 'Robotics Junior',
        courseName: 'Робототехника',
        teacherName: 'Денис Смирнов',
        schedule: 'Ср 15:00, Сб 11:00',
        status: 'active',
        joinedAt: '01.09.2026',
      },
    ],
    attendanceStats: {
      totalLessons: 8,
      presentCount: 8,
      absentCount: 0,
      rescheduledCount: 0,
      attendanceRate: '100%',
      history: [
        { date: '02.09.2026', groupName: 'Robotics Junior', topic: 'Сборка манипулятора на Arduino', status: 'present' },
        { date: '29.08.2026', groupName: 'Robotics Junior', topic: 'Датчики расстояния и ультразвук', status: 'present' },
      ],
    },
    finance: {
      activeSubscription: {
        period: '01.09.2026 – 30.09.2026',
        price: '8 400 ₽',
        status: 'expired',
        lessonsAttended: '1 из 8 занятий',
        renewalDate: '25.08.2026',
      },
      payments: [
        { id: 'pay3', date: '25.08.2026', amount: '8 400 ₽', period: 'Сентябрь 2026', method: 'Перевод по СБП', status: 'overdue' },
      ],
    },
    interactions: [
      {
        id: 'int4',
        occurredAt: 'Вчера, 16:20',
        channel: 'whatsapp',
        type: 'follow_up',
        author: 'Елена Менеджер',
        content: 'Напомнили Дмитрию о задолженности по оплате сентября за Марию и Артёма.',
        result: 'Обещал перевести до конца недели',
        nextAction: 'Проверить поступление в пятницу',
        followUpDate: '05.09.2026',
      },
    ],
    tasks: [
      {
        id: 't2',
        title: 'Проконтролировать погашение задолженности 8 400 ₽',
        taskType: 'Финансы',
        studentId: '2',
        assignedTo: 'Елена Менеджер',
        dueDate: '05.09.2026',
        status: 'open',
        priority: 'high',
      },
    ],
  },
  {
    id: '3',
    firstName: 'Анна',
    lastName: 'Васильева',
    birthDate: '2018-09-10',
    status: 'trial',
    notes: 'Только начинает знакомство с языком в игровой форме.',
    createdAt: '2026-08-30T10:00:00Z',
    updatedAt: '2026-09-02T10:00:00Z',
    parents: [
      {
        id: 'p4',
        firstName: 'Елена',
        lastName: 'Васильева',
        phone: '+7 (999) 345-67-89',
        telegram: '@elena_v',
        whatsapp: '+79993456789',
        preferredChannel: 'phone',
        notes: 'Мама Анны',
        relationshipType: 'Мама',
        isPrimary: true,
      },
    ],
    groups: [
      {
        id: 'g3',
        name: 'Kids English A1',
        courseName: 'Английский язык',
        teacherName: 'Мария Иванова',
        schedule: 'Вт, Пт • 15:00–16:30',
        status: 'trial',
        joinedAt: '01.09.2026',
      },
    ],
    attendanceStats: {
      totalLessons: 1,
      presentCount: 0,
      absentCount: 1,
      rescheduledCount: 0,
      attendanceRate: '0%',
      history: [
        { date: '02.09.2026', groupName: 'Kids English A1', topic: 'Colors & Animals', status: 'absent', notes: 'Заболела перед уроком' },
      ],
    },
    finance: {
      payments: [
        { id: 'pay4', date: '05.09.2026', amount: '7 200 ₽', period: 'Сентябрь 2026', method: 'Ожидается', status: 'expected' },
      ],
    },
    interactions: [
      {
        id: 'int5',
        occurredAt: '02.09.2026, 14:00',
        channel: 'phone',
        type: 'trial',
        author: 'Елена Менеджер',
        content: 'Мама позвонила и предупредила, что у Анны температура. Договорились перенести пробное занятие на пятницу.',
        result: 'Перенос на 05.09 15:00',
        nextAction: 'Напомнить за 3 часа до урока',
        followUpDate: '05.09.2026',
      },
    ],
    tasks: [
      {
        id: 't3',
        title: 'Узнать самочувствие Анны и подтвердить пробный урок в пятницу',
        taskType: 'Пробное',
        studentId: '3',
        assignedTo: 'Елена Менеджер',
        dueDate: '04.09.2026',
        status: 'open',
        priority: 'high',
      },
    ],
  },
];

export interface FullGroupData {
  id: string;
  name: string;
  courseId: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  schedule: string;
  room: string;
  capacity: number;
  status: 'recruiting' | 'active' | 'paused' | 'finished' | 'archived';
  startDate: string;
  endDate?: string;
  notes?: string;
  students: Array<{
    id: string;
    name: string;
    status: string;
    attendanceRate: string;
    parentPhone: string;
    joinedAt: string;
  }>;
  recentLessons: Array<{
    id: string;
    date: string;
    time: string;
    topic: string;
    status: string;
    presentCount: number;
  }>;
}

export interface FullTeacherData {
  id: string;
  name: string;
  role: string;
  phone: string;
  telegram?: string;
  email?: string;
  bio?: string;
  status: 'active' | 'archived';
  weeklyHours: number;
  lessonsPerWeek: number;
  activeGroups: Array<{
    id: string;
    name: string;
    courseName: string;
    schedule: string;
    studentsCount: number;
  }>;
  studentsCount: number;
}

export const INITIAL_COURSES = [
  { id: 'c1', name: 'Английский язык', description: 'Кембриджская программа (A1 - C1)', subject: 'Иностранные языки', isActive: true },
  { id: 'c2', name: 'Робототехника и IT', description: 'Arduino, Python, конструирование', subject: 'Информатика и инженерия', isActive: true },
  { id: 'c3', name: 'Олимпиадная математика', description: 'Логика, нестандартные задачи', subject: 'Точные науки', isActive: true },
];

export const INITIAL_TEACHERS: FullTeacherData[] = [
  {
    id: 't1',
    name: 'Мария Иванова',
    role: 'Ведущий преподаватель английского языка (CELTA)',
    phone: '+7 (999) 777-11-22',
    telegram: '@maria_english',
    email: 'maria.ivanova@school.ru',
    bio: 'Опыт преподавания более 8 лет. Специализируется на подготовке подростков к международным экзаменам.',
    status: 'active',
    weeklyHours: 16,
    lessonsPerWeek: 8,
    studentsCount: 28,
    activeGroups: [
      { id: '1', name: 'English B1 Teens (Пн/Чт 18:45)', courseName: 'Английский язык', schedule: 'Пн, Чт • 18:45–20:15', studentsCount: 7 },
      { id: '2', name: 'Kids English A1 (Вт/Пт 15:00)', courseName: 'Английский язык', schedule: 'Вт, Пт • 15:00–16:30', studentsCount: 6 },
    ],
  },
  {
    id: 't2',
    name: 'Денис Смирнов',
    role: 'Преподаватель робототехники и IT',
    phone: '+7 (999) 777-33-44',
    telegram: '@denis_robotics',
    email: 'denis.smirnov@school.ru',
    bio: 'Инженер-робототехник, призер соревнований Eurobot.',
    status: 'active',
    weeklyHours: 8,
    lessonsPerWeek: 4,
    studentsCount: 14,
    activeGroups: [
      { id: '3', name: 'Robotics Junior (Ср/Сб 15:00)', courseName: 'Робототехника', schedule: 'Ср 15:00, Сб 11:00', studentsCount: 4 },
    ],
  },
  {
    id: 't3',
    name: 'Ольга Соколова',
    role: 'Преподаватель олимпиадной математики',
    phone: '+7 (999) 777-55-66',
    telegram: '@olga_math',
    email: 'olga.sokolova@school.ru',
    bio: 'Эксперт по подготовке к математическим олимпиадам начальной и средней школы.',
    status: 'active',
    weeklyHours: 12,
    lessonsPerWeek: 6,
    studentsCount: 18,
    activeGroups: [
      { id: '4', name: 'Kids Math Safari (Чт 16:00)', courseName: 'Математика', schedule: 'Четверг • 16:00–17:00', studentsCount: 5 },
    ],
  },
];

export const INITIAL_GROUPS: FullGroupData[] = [
  {
    id: '1',
    name: 'English B1 Teens (Пн/Чт 18:45)',
    courseId: 'c1',
    courseName: 'Английский язык',
    teacherId: 't1',
    teacherName: 'Мария Иванова',
    schedule: 'Пн, Чт • 18:45–20:15',
    room: 'Аудитория 204',
    capacity: 8,
    status: 'active',
    startDate: '01.09.2026',
    notes: 'Основная группа подростков 13-15 лет.',
    students: [
      { id: '1', name: 'Иван Смирнов', status: 'active', attendanceRate: '94%', parentPhone: '+7 (999) 123-45-67', joinedAt: '01.09.2026' },
      { id: '4', name: 'Сергей Попов', status: 'paused', attendanceRate: '82%', parentPhone: '+7 (999) 456-78-90', joinedAt: '01.09.2026' },
      { id: 's5', name: 'Алина Белова', status: 'active', attendanceRate: '100%', parentPhone: '+7 (999) 333-11-22', joinedAt: '01.09.2026' },
      { id: 's6', name: 'Максим Захаров', status: 'active', attendanceRate: '88%', parentPhone: '+7 (999) 444-22-33', joinedAt: '01.09.2026' },
      { id: 's7', name: 'Полина Григорьева', status: 'active', attendanceRate: '91%', parentPhone: '+7 (999) 555-33-44', joinedAt: '01.09.2026' },
      { id: 's8', name: 'Егор Романов', status: 'active', attendanceRate: '85%', parentPhone: '+7 (999) 666-44-55', joinedAt: '01.09.2026' },
      { id: 's9', name: 'София Федорова', status: 'active', attendanceRate: '95%', parentPhone: '+7 (999) 777-55-66', joinedAt: '01.09.2026' },
    ],
    recentLessons: [
      { id: 'l1', date: '01.09.2026', time: '18:45 – 20:15', topic: 'Present Perfect vs Past Simple', status: 'completed', presentCount: 6 },
      { id: 'l2', date: '28.08.2026', time: '18:45 – 20:15', topic: 'Phrasal verbs in context', status: 'completed', presentCount: 7 },
      { id: 'l3', date: '04.09.2026', time: '18:45 – 20:15', topic: 'Future forms & conditionals', status: 'scheduled', presentCount: 0 },
    ],
  },
  {
    id: '2',
    name: 'Kids English A1 (Вт/Пт 15:00)',
    courseId: 'c1',
    courseName: 'Английский язык',
    teacherId: 't1',
    teacherName: 'Мария Иванова',
    schedule: 'Вт, Пт • 15:00–16:30',
    room: 'Аудитория 102',
    capacity: 6,
    status: 'active',
    startDate: '01.09.2026',
    notes: 'Начальная группа для детей 6-8 лет. Группа полностью укомплектована.',
    students: [
      { id: '3', name: 'Анна Васильева', status: 'trial', attendanceRate: '0%', parentPhone: '+7 (999) 345-67-89', joinedAt: '01.09.2026' },
      { id: 's10', name: 'Тимофей Орлов', status: 'active', attendanceRate: '100%', parentPhone: '+7 (999) 111-88-99', joinedAt: '01.09.2026' },
      { id: 's11', name: 'Василиса Козлова', status: 'active', attendanceRate: '100%', parentPhone: '+7 (999) 222-99-00', joinedAt: '01.09.2026' },
      { id: 's12', name: 'Матвей Новиков', status: 'active', attendanceRate: '100%', parentPhone: '+7 (999) 333-00-11', joinedAt: '01.09.2026' },
      { id: 's13', name: 'Ксения Лебедева', status: 'active', attendanceRate: '100%', parentPhone: '+7 (999) 444-11-22', joinedAt: '01.09.2026' },
      { id: 's14', name: 'Лев Семенов', status: 'active', attendanceRate: '100%', parentPhone: '+7 (999) 555-22-33', joinedAt: '01.09.2026' },
    ],
    recentLessons: [
      { id: 'l4', date: '01.09.2026', time: '15:00 – 16:30', topic: 'Colors & Magic Animals', status: 'completed', presentCount: 5 },
      { id: 'l5', date: '05.09.2026', time: '15:00 – 16:30', topic: 'Numbers 1-20 & Games', status: 'scheduled', presentCount: 0 },
    ],
  },
  {
    id: '3',
    name: 'Robotics Junior (Ср/Сб 15:00)',
    courseId: 'c2',
    courseName: 'Робототехника',
    teacherId: 't2',
    teacherName: 'Денис Смирнов',
    schedule: 'Ср 15:00, Сб 11:00',
    room: 'IT Лаборатория',
    capacity: 8,
    status: 'recruiting',
    startDate: '10.09.2026',
    notes: 'Идет активный набор. Свободно 4 места.',
    students: [
      { id: '2', name: 'Мария Кузнецова', status: 'active', attendanceRate: '100%', parentPhone: '+7 (999) 234-56-78', joinedAt: '01.09.2026' },
      { id: 's15', name: 'Арсений Павлов', status: 'active', attendanceRate: '100%', parentPhone: '+7 (999) 888-22-11', joinedAt: '01.09.2026' },
      { id: 's16', name: 'Глеб Воронов', status: 'active', attendanceRate: '100%', parentPhone: '+7 (999) 999-33-22', joinedAt: '01.09.2026' },
      { id: 's17', name: 'Кирилл Медведев', status: 'trial', attendanceRate: '100%', parentPhone: '+7 (999) 000-44-33', joinedAt: '02.09.2026' },
    ],
    recentLessons: [
      { id: 'l6', date: '02.09.2026', time: '15:00 – 16:30', topic: 'Сборка манипулятора на Arduino', status: 'completed', presentCount: 4 },
      { id: 'l7', date: '05.09.2026', time: '11:00 – 12:30', topic: 'Светодиодные датчики и сервоприводы', status: 'scheduled', presentCount: 0 },
    ],
  },
  {
    id: '4',
    name: 'Kids Math Safari (Чт 16:00)',
    courseId: 'c3',
    courseName: 'Математика',
    teacherId: 't3',
    teacherName: 'Ольга Соколова',
    schedule: 'Четверг • 16:00–17:00',
    room: 'Аудитория 101',
    capacity: 6,
    status: 'active',
    startDate: '01.09.2026',
    notes: 'Олимпиадная математика для 3-4 классов.',
    students: [
      { id: '5', name: 'Екатерина Морозова', status: 'active', attendanceRate: '88%', parentPhone: '+7 (999) 567-89-01', joinedAt: '01.09.2026' },
      { id: 's18', name: 'Артём Кузнецов', status: 'active', attendanceRate: '100%', parentPhone: '+7 (999) 234-56-78', joinedAt: '01.09.2026' },
      { id: 's19', name: 'Дарья Виноградова', status: 'active', attendanceRate: '90%', parentPhone: '+7 (999) 123-77-88', joinedAt: '01.09.2026' },
      { id: 's20', name: 'Ярослав Куликов', status: 'active', attendanceRate: '95%', parentPhone: '+7 (999) 234-88-99', joinedAt: '01.09.2026' },
      { id: 's21', name: 'Вероника Потапова', status: 'active', attendanceRate: '80%', parentPhone: '+7 (999) 345-99-00', joinedAt: '01.09.2026' },
    ],
    recentLessons: [
      { id: 'l8', date: '28.08.2026', time: '16:00 – 17:00', topic: 'Логические квадраты и шифры', status: 'completed', presentCount: 5 },
      { id: 'l9', date: '04.09.2026', time: '16:00 – 17:00', topic: 'Графы и комбинаторика в играх', status: 'scheduled', presentCount: 0 },
    ],
  },
];

export interface FullLessonData {
  id: string;
  groupId: string;
  groupName: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  date: string; // YYYY-MM-DD
  dateFormatted: string; // e.g. 03 сен 2026
  dayOfWeek: number; // 0 = Mon, 6 = Sun
  startTime: string;
  endTime: string;
  room: string;
  topic: string;
  homework?: string;
  onlineMeetingUrl?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  students: Array<{
    id: string;
    name: string;
    attendanceStatus: 'present' | 'absent' | 'rescheduled' | 'cancelled' | 'not_marked';
    notes?: string;
  }>;
}

export const INITIAL_LESSONS: FullLessonData[] = [
  {
    id: 'l1',
    groupId: '1',
    groupName: 'English B1 Teens (Пн/Чт 18:45)',
    courseName: 'Английский язык',
    teacherId: 't1',
    teacherName: 'Мария Иванова',
    date: '2026-09-01',
    dateFormatted: '01 сен 2026',
    dayOfWeek: 0,
    startTime: '18:45',
    endTime: '20:15',
    room: 'Аудитория 204',
    topic: 'Unit 1: Present Perfect vs Past Simple in conversation',
    homework: 'Workbook p. 12-14, эссе о любимом путешествии (100 слов)',
    onlineMeetingUrl: 'https://meet.google.com/abc-defg-hij',
    status: 'completed',
    students: [
      { id: '1', name: 'Иван Смирнов', attendanceStatus: 'present' },
      { id: '4', name: 'Сергей Попов', attendanceStatus: 'present' },
      { id: 's5', name: 'Алина Белова', attendanceStatus: 'present' },
      { id: 's6', name: 'Максим Захаров', attendanceStatus: 'absent', notes: 'Предупредили о визите к врачу' },
      { id: 's7', name: 'Полина Григорьева', attendanceStatus: 'present' },
      { id: 's8', name: 'Егор Романов', attendanceStatus: 'present' },
      { id: 's9', name: 'София Федорова', attendanceStatus: 'present' },
    ],
  },
  {
    id: 'l2',
    groupId: '2',
    groupName: 'Kids English A1 (Вт/Пт 15:00)',
    courseName: 'Английский язык',
    teacherId: 't1',
    teacherName: 'Мария Иванова',
    date: '2026-09-01',
    dateFormatted: '01 сен 2026',
    dayOfWeek: 1,
    startTime: '15:00',
    endTime: '16:30',
    room: 'Аудитория 102',
    topic: 'Colors, Fruits & Magic Animals songs',
    homework: 'Раскрасить карточки со с. 8',
    status: 'completed',
    students: [
      { id: '3', name: 'Анна Васильева', attendanceStatus: 'present' },
      { id: 's10', name: 'Тимофей Орлов', attendanceStatus: 'present' },
      { id: 's11', name: 'Василиса Козлова', attendanceStatus: 'present' },
      { id: 's12', name: 'Матвей Новиков', attendanceStatus: 'present' },
      { id: 's13', name: 'Ксения Лебедева', attendanceStatus: 'present' },
      { id: 's14', name: 'Лев Семенов', attendanceStatus: 'present' },
    ],
  },
  {
    id: 'l3',
    groupId: '3',
    groupName: 'Robotics Junior (Ср/Сб 15:00)',
    courseName: 'Робототехника',
    teacherId: 't2',
    teacherName: 'Денис Смирнов',
    date: '2026-09-02',
    dateFormatted: '02 сен 2026',
    dayOfWeek: 2,
    startTime: '15:00',
    endTime: '16:30',
    room: 'IT Лаборатория',
    topic: 'Основы Arduino: сборка первого механического манипулятора',
    homework: 'Повторить схему подключения сервопривода',
    status: 'completed',
    students: [
      { id: '2', name: 'Мария Кузнецова', attendanceStatus: 'present' },
      { id: 's15', name: 'Арсений Павлов', attendanceStatus: 'present' },
      { id: 's16', name: 'Глеб Воронов', attendanceStatus: 'present' },
      { id: 's17', name: 'Кирилл Медведев', attendanceStatus: 'present' },
    ],
  },
  {
    id: 'l4',
    groupId: '4',
    groupName: 'Kids Math Safari (Чт 16:00)',
    courseName: 'Математика',
    teacherId: 't3',
    teacherName: 'Ольга Соколова',
    date: '2026-09-03',
    dateFormatted: '03 сен 2026',
    dayOfWeek: 3,
    startTime: '16:00',
    endTime: '17:00',
    room: 'Аудитория 101',
    topic: 'Логические переправы, весы и фальшивые монеты',
    status: 'scheduled',
    students: [
      { id: '5', name: 'Екатерина Морозова', attendanceStatus: 'not_marked' },
      { id: 's18', name: 'Артём Кузнецов', attendanceStatus: 'not_marked' },
      { id: 's19', name: 'Дарья Виноградова', attendanceStatus: 'not_marked' },
      { id: 's20', name: 'Ярослав Куликов', attendanceStatus: 'not_marked' },
      { id: 's21', name: 'Вероника Потапова', attendanceStatus: 'not_marked' },
    ],
  },
  {
    id: 'l5',
    groupId: '1',
    groupName: 'English B1 Teens (Пн/Чт 18:45)',
    courseName: 'Английский язык',
    teacherId: 't1',
    teacherName: 'Мария Иванова',
    date: '2026-09-03',
    dateFormatted: '03 сен 2026',
    dayOfWeek: 3,
    startTime: '18:45',
    endTime: '20:15',
    room: 'Аудитория 204',
    topic: 'Modal verbs of deduction (must / might / can’t)',
    onlineMeetingUrl: 'https://meet.google.com/xyz-uvwx-rst',
    status: 'scheduled',
    students: [
      { id: '1', name: 'Иван Смирнов', attendanceStatus: 'not_marked' },
      { id: '4', name: 'Сергей Попов', attendanceStatus: 'not_marked' },
      { id: 's5', name: 'Алина Белова', attendanceStatus: 'not_marked' },
      { id: 's6', name: 'Максим Захаров', attendanceStatus: 'not_marked' },
      { id: 's7', name: 'Полина Григорьева', attendanceStatus: 'not_marked' },
      { id: 's8', name: 'Егор Романов', attendanceStatus: 'not_marked' },
      { id: 's9', name: 'София Федорова', attendanceStatus: 'not_marked' },
    ],
  },
  {
    id: 'l6',
    groupId: '2',
    groupName: 'Kids English A1 (Вт/Пт 15:00)',
    courseName: 'Английский язык',
    teacherId: 't1',
    teacherName: 'Мария Иванова',
    date: '2026-09-04',
    dateFormatted: '04 сен 2026',
    dayOfWeek: 4,
    startTime: '15:00',
    endTime: '16:30',
    room: 'Аудитория 102',
    topic: 'Numbers 1-20 & Interactive classroom games',
    status: 'scheduled',
    students: [
      { id: '3', name: 'Анна Васильева', attendanceStatus: 'not_marked' },
      { id: 's10', name: 'Тимофей Орлов', attendanceStatus: 'not_marked' },
      { id: 's11', name: 'Василиса Козлова', attendanceStatus: 'not_marked' },
      { id: 's12', name: 'Матвей Новиков', attendanceStatus: 'not_marked' },
      { id: 's13', name: 'Ксения Лебедева', attendanceStatus: 'not_marked' },
      { id: 's14', name: 'Лев Семенов', attendanceStatus: 'not_marked' },
    ],
  },
  {
    id: 'l7',
    groupId: '3',
    groupName: 'Robotics Junior (Ср/Сб 15:00)',
    courseName: 'Робототехника',
    teacherId: 't2',
    teacherName: 'Денис Смирнов',
    date: '2026-09-05',
    dateFormatted: '05 сен 2026',
    dayOfWeek: 5,
    startTime: '11:00',
    endTime: '12:30',
    room: 'IT Лаборатория',
    topic: 'Датчик линии и программирование движения робота',
    status: 'scheduled',
    students: [
      { id: '2', name: 'Мария Кузнецова', attendanceStatus: 'not_marked' },
      { id: 's15', name: 'Арсений Павлов', attendanceStatus: 'not_marked' },
      { id: 's16', name: 'Глеб Воронов', attendanceStatus: 'not_marked' },
      { id: 's17', name: 'Кирилл Медведев', attendanceStatus: 'not_marked' },
    ],
  },
];


