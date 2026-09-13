import { Student, Parent, StudentParentRelation, Group, Lesson, Attendance, Payment, Subscription, Task } from '@/types';

export interface TimelineInteraction {
  id: string;
  studentId?: string;
  studentName?: string;
  parentId?: string;
  parentName?: string;
  targetType?: 'student' | 'parent';
  targetName?: string;
  targetRole?: string;
  occurredAt: string;
  channel: 'telegram' | 'whatsapp' | 'phone' | 'email' | 'call' | 'meeting' | 'other';
  type: 'initial_contact' | 'follow_up' | 'trial' | 'payment' | 'renewal' | 'complaint' | 'organizational' | 'status_change' | 'other';
  author: string;
  content: string;
  result?: string;
  nextAction?: string;
  followUpDate?: string;
}

export interface TeacherComment {
  id: string;
  studentId: string;
  author: string;
  date: string;
  groupName?: string;
  lessonTopic?: string;
  category: 'progress' | 'homework' | 'behavior' | 'general';
  content: string;
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
  teacherComments?: TeacherComment[];
}

export const INITIAL_STUDENTS: FullStudentData[] = [
  {
    id: '1',
    firstName: 'Иван',
    lastName: 'Смирнов',
    studentType: 'school_student',
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
        studentId: '1',
        studentName: 'Иван Смирнов',
        parentId: 'p1',
        parentName: 'Ольга Смирнова',
        targetType: 'parent',
        targetName: 'Ольга Смирнова',
        targetRole: 'Родитель (Мама)',
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
        studentId: '1',
        studentName: 'Иван Смирнов',
        parentId: 'p1',
        parentName: 'Ольга Смирнова',
        targetType: 'parent',
        targetName: 'Ольга Смирнова',
        targetRole: 'Родитель (Мама)',
        content: 'Отправлен чек об оплате абонемента на сентябрь (7 600 ₽).',
        result: 'Оплата успешно зафиксирована',
      },
      {
        id: 'int3',
        occurredAt: '25.08.2026, 17:00',
        channel: 'phone',
        type: 'trial',
        author: 'Мария Иванова',
        studentId: '1',
        studentName: 'Иван Смирнов',
        targetType: 'student',
        targetName: 'Иван Смирнов',
        targetRole: 'Ученик',
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
    teacherComments: [
      {
        id: 'tc_1',
        studentId: '1',
        author: 'Мария Иванова (Преподаватель)',
        date: '08.09.2026, 20:15',
        groupName: 'English B1 Teens',
        lessonTopic: 'Past Simple & Irregular Verbs',
        category: 'progress',
        content: 'Отлично справился с устным тестом на неправильные глаголы. Заметно выросла беглость речи, рекомендую больше читать художественную литературу на английском.',
      },
      {
        id: 'tc_2',
        studentId: '1',
        author: 'Мария Иванова (Преподаватель)',
        date: '04.09.2026, 19:40',
        groupName: 'English B1 Teens',
        lessonTopic: 'Reading & Discussion: Technology',
        category: 'homework',
        content: 'Домашнее эссе сдано вовремя, хорошая аргументация. Рекомендовано обратить внимание на предлоги времени (at/in/on).',
      },
    ],
  },
  {
    id: '2',
    firstName: 'Мария',
    lastName: 'Кузнецова',
    studentType: 'school_student',
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
    id: 's18',
    firstName: 'Артём',
    lastName: 'Кузнецов',
    studentType: 'school_student',
    birthDate: '2016-08-10',
    phone: '+7 (999) 234-56-78',
    telegram: '@dkuznetsov',
    status: 'active',
    notes: 'Младший брат Марии Кузнецовой. Обучается в двух группах: Робототехника и Олимпиадная математика.',
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
      {
        id: 'g_math',
        name: 'Kids Math Safari',
        courseName: 'Математика',
        teacherName: 'Ольга Соколова',
        schedule: 'Ср 16:30, Сб 12:00',
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
        { date: '02.09.2026', groupName: 'Robotics Junior', topic: 'Датчики расстояния', status: 'present' },
        { date: '29.08.2026', groupName: 'Robotics Junior', topic: 'Вводное занятие', status: 'present' },
      ],
    },
    finance: {
      activeSubscription: {
        period: '01.09.2026 – 30.09.2026',
        price: '8 400 ₽',
        status: 'paid',
        lessonsAttended: '2 из 8 занятий',
        renewalDate: '25.09.2026',
      },
      payments: [
        { id: 'pay_artem1', date: '01.09.2026', amount: '8 400 ₽', period: 'Сентябрь 2026', method: 'Банковская карта', status: 'paid' },
      ],
    },
    interactions: [],
    tasks: [],
  },
  {
    id: '3',
    firstName: 'Анна',
    lastName: 'Васильева',
    studentType: 'school_student',
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
  {
    id: '4',
    firstName: 'Сергей',
    lastName: 'Попов',
    studentType: 'school_student',
    birthDate: '2012-07-19',
    phone: '+7 (999) 456-78-90',
    status: 'paused',
    notes: '4 пропуска подряд, статус «На паузе», риск оттока. Требуется звонок родителю.',
    createdAt: '2026-08-10T10:00:00Z',
    updatedAt: '2026-09-03T12:00:00Z',
    parents: [
      {
        id: 'p5',
        firstName: 'Татьяна',
        lastName: 'Попова',
        phone: '+7 (999) 456-78-90',
        telegram: '@tatiana_popova',
        preferredChannel: 'phone',
        notes: 'Мама Сергея. Обсуждали перерыв в занятиях из-за спортивных сборов.',
        relationshipType: 'Мама',
        isPrimary: true,
      },
    ],
    groups: [
      {
        id: 'g1',
        name: 'English B1 Teens',
        courseName: 'Английский язык',
        teacherName: 'Мария Иванова',
        schedule: 'Пн, Чт • 18:45–20:15',
        status: 'paused',
        joinedAt: '15.08.2026',
      },
    ],
    attendanceStats: {
      totalLessons: 12,
      presentCount: 8,
      absentCount: 4,
      rescheduledCount: 0,
      attendanceRate: '62%',
      history: [],
    },
    finance: {
      payments: [
        { id: 'pay_p1', date: '15.08.2026', amount: '7 600 ₽', period: 'Август 2026', method: 'Банковская карта', status: 'paid' },
      ],
    },
    interactions: [
      {
        id: 'int_p1',
        occurredAt: '03.09.2026',
        channel: 'phone',
        type: 'follow_up',
        author: 'Елена Менеджер',
        content: 'Звонок маме по поводу 4 пропущенных уроков. Согласовали паузу до 15.10.',
        result: 'Поставлен статус «На паузе»',
      },
    ],
    tasks: [],
  },
  {
    id: 's6',
    firstName: 'Максим',
    lastName: 'Захаров',
    studentType: 'school_student',
    birthDate: '2013-11-04',
    phone: '+7 (916) 777-33-22',
    status: 'active',
    notes: '3 пропуска подряд, нет реакции на домашние задания, задолженность.',
    createdAt: '2026-08-18T10:00:00Z',
    updatedAt: '2026-09-04T12:00:00Z',
    parents: [
      {
        id: 'p6',
        firstName: 'Наталья',
        lastName: 'Захарова',
        phone: '+7 (916) 777-33-22',
        telegram: '@natalia_zakh',
        preferredChannel: 'telegram',
        notes: 'Мама Максима',
        relationshipType: 'Мама',
        isPrimary: true,
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
      totalLessons: 10,
      presentCount: 7,
      absentCount: 3,
      rescheduledCount: 0,
      attendanceRate: '65%',
      history: [],
    },
    finance: {
      payments: [
        { id: 'pay_z1', date: '20.08.2026', amount: '7 600 ₽', period: 'Сентябрь 2026', method: 'Перевод по СБП', status: 'overdue' },
      ],
    },
    interactions: [],
    tasks: [],
  },
  {
    id: '5',
    firstName: 'Екатерина',
    lastName: 'Морозова',
    studentType: 'school_student',
    birthDate: '2016-04-12',
    phone: '+7 (999) 567-89-01',
    status: 'active',
    notes: 'Отличные успехи в олимпиадной математике, победа в городском туре.',
    createdAt: '2026-08-25T10:00:00Z',
    updatedAt: '2026-09-05T12:00:00Z',
    parents: [
      {
        id: 'p7',
        firstName: 'Игорь',
        lastName: 'Морозов',
        phone: '+7 (999) 567-89-01',
        telegram: '@igor_morozov',
        preferredChannel: 'whatsapp',
        notes: 'Отец Екатерины',
        relationshipType: 'Отец',
        isPrimary: true,
      },
    ],
    groups: [
      {
        id: 'g_math',
        name: 'Kids Math Safari',
        courseName: 'Математика',
        teacherName: 'Ольга Соколова',
        schedule: 'Ср 16:30, Сб 12:00',
        status: 'active',
        joinedAt: '01.09.2026',
      },
    ],
    attendanceStats: {
      totalLessons: 8,
      presentCount: 7,
      absentCount: 1,
      rescheduledCount: 0,
      attendanceRate: '88%',
      history: [],
    },
    finance: {
      payments: [
        { id: 'pay_m1', date: '01.09.2026', amount: '7 600 ₽', period: 'Сентябрь 2026', method: 'Банковская карта', status: 'paid' },
      ],
    },
    interactions: [],
    tasks: [],
  },
  {
    id: 's7',
    firstName: 'Дарья',
    lastName: 'Соловьева',
    studentType: 'adult_student',
    birthDate: '2006-02-14',
    phone: '+7 (926) 555-12-34',
    telegram: '@daria_solovyeva',
    status: 'active',
    notes: 'Совершеннолетняя студентка (20 лет). Обучается самостоятельно на продвинутом курсе C1.',
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-09-05T12:00:00Z',
    parents: [
      {
        id: 'p_sol',
        firstName: 'Елена',
        lastName: 'Соловьева',
        phone: '+7 (926) 555-99-88',
        preferredChannel: 'phone',
        notes: 'Экстренный контакт',
        relationshipType: 'Экстренный контакт',
        isPrimary: false,
      },
    ],
    groups: [
      {
        id: 'g_c1',
        name: 'English C1 Advanced',
        courseName: 'Английский язык',
        teacherName: 'Мария Иванова',
        schedule: 'Вт, Пт • 20:00–21:30',
        status: 'active',
        joinedAt: '01.09.2026',
      },
    ],
    attendanceStats: {
      totalLessons: 12,
      presentCount: 12,
      absentCount: 0,
      rescheduledCount: 0,
      attendanceRate: '98%',
      history: [],
    },
    finance: {
      payments: [
        { id: 'pay_sol1', date: '01.09.2026', amount: '8 800 ₽', period: 'Сентябрь 2026', method: 'Банковская карта', status: 'paid' },
      ],
    },
    interactions: [],
    tasks: [],
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
    room: 'Онлайн (Zoom 1)',
    capacity: 8,
    status: 'active',
    startDate: '01.09.2026',
    notes: 'Основная онлайн-группа подростков 13-15 лет.',
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
    room: 'Онлайн (Zoom 2)',
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
    room: 'Онлайн (Виртуальная лаборатория)',
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
    room: 'Онлайн (Zoom 3)',
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
  {
    id: '5',
    name: 'Английский: Практическая грамматика (Ср 18:00)',
    courseId: 'c1',
    courseName: 'Английский язык',
    teacherId: 't1',
    teacherName: 'Мария Иванова',
    schedule: 'Среда • 18:00–19:30',
    room: 'Онлайн (Zoom 1)',
    capacity: 8,
    status: 'active',
    startDate: '01.09.2026',
    notes: 'Углубленная проработка грамматических структур и времен.',
    students: [
      { id: '1', name: 'Иван Смирнов', status: 'active', attendanceRate: '95%', parentPhone: '+7 (999) 123-45-67', joinedAt: '01.09.2026' },
      { id: '2', name: 'Мария Кузнецова', status: 'active', attendanceRate: '100%', parentPhone: '+7 (999) 234-56-78', joinedAt: '01.09.2026' },
    ],
    recentLessons: [
      { id: 'l10', date: '02.09.2026', time: '18:00 – 19:30', topic: 'Articles & Conditionals', status: 'completed', presentCount: 2 },
    ],
  },
  {
    id: '6',
    name: 'Английский: Разговорный клуб (Сб 12:00)',
    courseId: 'c1',
    courseName: 'Английский язык',
    teacherId: 't1',
    teacherName: 'Мария Иванова',
    schedule: 'Суббота • 12:00–13:30',
    room: 'Онлайн (Zoom 2)',
    capacity: 8,
    status: 'active',
    startDate: '01.09.2026',
    notes: 'Интерактивные дебаты, обсуждение актуальных тем и преодоление языкового барьера.',
    students: [
      { id: '1', name: 'Иван Смирнов', status: 'active', attendanceRate: '95%', parentPhone: '+7 (999) 123-45-67', joinedAt: '01.09.2026' },
    ],
    recentLessons: [
      { id: 'l11', date: '30.08.2026', time: '12:00 – 13:30', topic: 'Travel hacks and cultural differences', status: 'completed', presentCount: 1 },
    ],
  },
];

export interface LessonTimelineEvent {
  id: string;
  timestamp: string;
  author: string;
  role: string;
  type: 'created' | 'status_change' | 'rescheduled' | 'completed' | 'attendance_marked' | 'cancelled';
  comment: string;
}

export interface LessonRescheduleInfo {
  previousDate: string;
  previousTime: string;
  newDate: string;
  newTime: string;
  room: string;
  reason: string;
  changedBy: string;
  changedRole: string;
  changedAt: string;
  notifyParents?: boolean;
}

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
  rescheduleInfo?: LessonRescheduleInfo;
  timelineEvents?: LessonTimelineEvent[];
  students: Array<{
    id: string;
    name: string;
    attendanceStatus: 'present' | 'absent' | 'excused' | 'rescheduled' | 'cancelled' | 'not_marked';
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
    room: 'Онлайн (Zoom 1)',
    topic: 'Unit 1: Present Perfect vs Past Simple in conversation',
    homework: 'Workbook p. 12-14, эссе о любимом путешествии (100 слов)',
    onlineMeetingUrl: 'https://meet.google.com/abc-defg-hij',
    status: 'completed',
    timelineEvents: [
      {
        id: 'ev1',
        timestamp: '01.09.2026, 17:30',
        author: 'Анна Админ',
        role: 'Администратор',
        type: 'created',
        comment: 'Урок внесен в общее расписание школы',
      },
      {
        id: 'ev2',
        timestamp: '01.09.2026, 20:20',
        author: 'Мария Иванова',
        role: 'Преподаватель',
        type: 'attendance_marked',
        comment: 'Отмечена посещаемость: 6 присутствуют, 1 отсутствует по болезни',
      },
      {
        id: 'ev3',
        timestamp: '01.09.2026, 20:25',
        author: 'Мария Иванова',
        role: 'Преподаватель',
        type: 'completed',
        comment: 'Урок завершен, выдано ДЗ: Workbook p. 12-14',
      },
    ],
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
    room: 'Онлайн (Zoom 2)',
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
    room: 'Онлайн (Виртуальная лаборатория)',
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
    room: 'Онлайн (Zoom 3)',
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
    room: 'Онлайн (Zoom 1)',
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
    room: 'Онлайн (Zoom 2)',
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

export function splitFullName(fullName: string) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { lastName: '', firstName: '', middleName: '' };
  if (parts.length === 1) return { lastName: '', firstName: parts[0], middleName: '' };
  if (parts.length === 2) return { lastName: parts[0], firstName: parts[1], middleName: '' };
  return {
    lastName: parts[0],
    firstName: parts[1],
    middleName: parts.slice(2).join(' '),
  };
}

export function buildFullName(lastName?: string, firstName?: string, middleName?: string) {
  return [lastName?.trim(), firstName?.trim(), middleName?.trim()].filter(Boolean).join(' ');
}

export interface FullLeadData {
  id: string;
  name: string;
  contact: string;
  telegram?: string;
  studentName?: string;
  studentAge?: string;
  // Structured FIO fields for parent/primary contact
  parentLastName?: string;
  parentFirstName?: string;
  parentMiddleName?: string;
  // Structured FIO fields for student
  studentLastName?: string;
  studentFirstName?: string;
  studentMiddleName?: string;
  directionOrCourse: string;
  level?: string;
  clientType?: 'school_student' | 'adult_student';
  source: string;
  assignedTo: string;
  status: 'new' | 'contacted' | 'trial_scheduled' | 'trial_held' | 'thinking' | 'paid' | 'lost' | 'no_response';
  trialDate?: string;
  offerAmount?: string;
  lossReason?: string;
  nextAction?: string;
  nextActionDate?: string;
  comment?: string;
  studentNotes?: string;
  parentNotes?: string;
  createdAt: string;
  convertedStudentId?: string;
  convertedParentId?: string;
  interactions: TimelineInteraction[];
}

export const INITIAL_LEADS: FullLeadData[] = [
  {
    id: 'lead1',
    name: 'Морозова Светлана',
    parentLastName: 'Морозова',
    parentFirstName: 'Светлана',
    contact: '+7 (999) 444-11-22',
    telegram: '@sveta_morozova',
    studentLastName: 'Морозов',
    studentFirstName: 'Михаил',
    studentName: 'Морозов Михаил',
    studentAge: '9 лет (3 класс)',
    directionOrCourse: 'Робототехника',
    level: 'Начинающий (с нуля)',
    source: 'Instagram',
    assignedTo: 'Елена Менеджер',
    status: 'new',
    nextAction: 'Позвонить для подбора времени пробного урока',
    nextActionDate: 'Сегодня, 12:00',
    comment: 'Интересуется занятиями по субботам в первой половине дня.',
    studentNotes: 'Увлекается Lego Technic, активный, любит практические задачи. Математику понимает хорошо.',
    parentNotes: 'Мама Светлана. Предпочитает общение в Telegram, на звонки в рабочее время отвечает редко.',
    createdAt: '2026-09-03T08:30:00Z',
    interactions: [
      {
        id: 'int_l1',
        occurredAt: 'Сегодня, 08:30',
        channel: 'telegram',
        type: 'initial_contact',
        author: 'Сайт школы (бот)',
        content: 'Оставлена заявка на курс робототехники через форму на сайте.',
      },
    ],
  },
  {
    id: 'lead2',
    name: 'Павлов Артем',
    clientType: 'adult_student',
    studentLastName: 'Павлов',
    studentFirstName: 'Артем',
    contact: '+7 (999) 555-22-33',
    telegram: '@artem_pavlov',
    studentName: 'Павлов Артем',
    studentAge: '16 лет (10 класс)',
    directionOrCourse: 'Английский язык',
    level: 'B1 Intermediate',
    source: 'Сайт школы',
    assignedTo: 'Елена Менеджер',
    status: 'trial_scheduled',
    trialDate: '04.09.2026 18:45',
    offerAmount: '7 600 ₽ / мес',
    nextAction: 'Отправить ссылку на онлайн-урок за 2 часа',
    nextActionDate: '04.09.2026',
    comment: 'Хочет сдать ЕГЭ на 85+ баллов.',
    createdAt: '2026-09-01T14:00:00Z',
    interactions: [
      {
        id: 'int_l2',
        occurredAt: '01.09.2026, 14:30',
        channel: 'phone',
        type: 'initial_contact',
        author: 'Елена Менеджер',
        content: 'Созвонились с Артемом, определили цели обучения. Назначили пробный урок в группу B1 Teens.',
        result: 'Пробное назначено на 04.09',
        nextAction: 'Напомнить в день урока',
      },
    ],
  },
  {
    id: 'lead3',
    name: 'Ковалева Наталья',
    parentLastName: 'Ковалева',
    parentFirstName: 'Наталья',
    contact: '+7 (999) 666-33-44',
    telegram: '@natalia_k',
    studentLastName: 'Ковалева',
    studentFirstName: 'Алиса',
    studentName: 'Ковалева Алиса',
    studentAge: '7 лет (1 класс)',
    directionOrCourse: 'Английский язык',
    level: 'A1 Starter',
    source: 'Рекомендация друзей',
    assignedTo: 'Елена Менеджер',
    status: 'trial_held',
    trialDate: '02.09.2026 15:00',
    offerAmount: '7 200 ₽ / мес',
    nextAction: 'Узнать решение мамы и выставить счет',
    nextActionDate: 'Сегодня, 17:00',
    comment: 'Урок прошел отлично, Алисе очень понравилась преподаватель Мария.',
    createdAt: '2026-08-31T11:00:00Z',
    interactions: [
      {
        id: 'int_l3_1',
        occurredAt: '02.09.2026, 16:30',
        channel: 'phone',
        type: 'trial',
        author: 'Мария Иванова (Преподаватель)',
        content: 'Алиса активно участвовала в играх, схватывает быстро. Рекомендую в группу Kids A1.',
        result: 'Успешный пробный урок',
      },
    ],
  },
  {
    id: 'lead4',
    name: 'Васильев Игорь',
    parentLastName: 'Васильев',
    parentFirstName: 'Игорь',
    contact: '+7 (999) 888-77-66',
    studentLastName: 'Васильев',
    studentFirstName: 'Максим',
    studentName: 'Васильев Максим',
    studentAge: '10 лет',
    directionOrCourse: 'Олимпиадная математика',
    level: 'Базовый',
    source: 'Листовка у школы',
    assignedTo: 'Елена Менеджер',
    status: 'thinking',
    offerAmount: '6 800 ₽ / мес',
    nextAction: 'Позвонить, предложить скидку 10% на первый месяц',
    nextActionDate: '04.09.2026',
    comment: 'Сравнивают с онлайн-репетитором.',
    createdAt: '2026-08-28T16:00:00Z',
    interactions: [
      {
        id: 'int_l4',
        occurredAt: '30.08.2026, 12:00',
        channel: 'whatsapp',
        type: 'follow_up',
        author: 'Елена Менеджер',
        content: 'Отправили презентацию курса и результаты наших учеников на олимпиадах.',
        result: 'Отец ответил: "Думаем до пятницы"',
      },
    ],
  },
  {
    id: 'lead5',
    name: 'Соколова Виктория',
    parentLastName: 'Соколова',
    parentFirstName: 'Виктория',
    contact: '+7 (999) 777-88-99',
    studentLastName: 'Соколов',
    studentFirstName: 'Даниил',
    studentName: 'Соколов Даниил',
    studentAge: '11 лет',
    directionOrCourse: 'Математика',
    source: 'Листовка',
    assignedTo: 'Елена Менеджер',
    status: 'paid',
    offerAmount: '8 400 ₽',
    nextAction: 'Зачислен в группу Math-2',
    comment: 'Оплатили абонемент на сентябрь.',
    createdAt: '2026-08-25T10:00:00Z',
    convertedStudentId: '5',
    convertedParentId: 'p4',
    interactions: [
      {
        id: 'int_l5',
        occurredAt: '27.08.2026, 15:00',
        channel: 'telegram',
        type: 'payment',
        author: 'Елена Менеджер',
        content: 'Оплата абонемента подтверждена. Создана карточка ученика и родителя.',
        result: 'Успешная конверсия',
      },
    ],
  },
  {
    id: 'lead6',
    name: 'Белов Константин',
    parentLastName: 'Белов',
    parentFirstName: 'Константин',
    contact: '+7 (999) 111-00-22',
    studentLastName: 'Белова',
    studentFirstName: 'Яна',
    studentName: 'Белова Яна',
    studentAge: '8 лет',
    directionOrCourse: 'Английский язык',
    source: 'Яндекс.Карты',
    assignedTo: 'Елена Менеджер',
    status: 'lost',
    lossReason: 'Не подошло вечернее время занятий (ищут утренние группы)',
    comment: 'Отправили в архив, позвонить при открытии утренней группы.',
    createdAt: '2026-08-20T12:00:00Z',
    interactions: [
      {
        id: 'int_l6',
        occurredAt: '21.08.2026, 14:00',
        channel: 'phone',
        type: 'follow_up',
        author: 'Елена Менеджер',
        content: 'Родители могут только до 12:00. У нас все группы после 15:00.',
        result: 'Отказ по времени',
      },
    ],
  },
  {
    id: 'lead7',
    name: 'Смирнова Екатерина',
    parentLastName: 'Смирнова',
    parentFirstName: 'Екатерина',
    contact: '+7 (999) 222-33-44',
    telegram: '@ekaterina_sm',
    studentLastName: 'Смирнова',
    studentFirstName: 'Виктория',
    studentName: 'Смирнова Виктория',
    studentAge: '8 лет (2 класс)',
    directionOrCourse: 'Английский язык',
    level: 'A1 Starter',
    source: 'ВКонтакте',
    assignedTo: 'Елена Менеджер',
    status: 'new',
    nextAction: 'Уточнить расписание и предложить пробный урок в среду',
    nextActionDate: 'Сегодня, 15:00',
    comment: 'Оставили заявку через ВК рекламу. Хотят заниматься 2 раза в неделю.',
    createdAt: '2026-09-03T09:15:00Z',
    interactions: [],
  },
  {
    id: 'lead8',
    name: 'Кузнецов Алексей',
    parentLastName: 'Кузнецов',
    parentFirstName: 'Алексей',
    contact: '+7 (999) 333-44-55',
    telegram: '@alex_kuznetsov',
    studentLastName: 'Кузнецов',
    studentFirstName: 'Максим',
    studentName: 'Кузнецов Максим',
    studentAge: '11 лет (5 класс)',
    directionOrCourse: 'Робототехника',
    level: 'Начинающий',
    source: 'Сайт школы',
    assignedTo: 'Елена Менеджер',
    status: 'new',
    nextAction: 'Связаться в Telegram для квалификации',
    nextActionDate: 'Сегодня, 16:30',
    comment: 'Интересуются конструированием и программированием на Scratch.',
    createdAt: '2026-09-03T10:00:00Z',
    interactions: [],
  },
  {
    id: 'lead9',
    name: 'Ольга Николаева',
    contact: '+7 (999) 444-55-66',
    telegram: '@olga_nik',
    studentName: 'Александр',
    studentAge: '14 лет (8 класс)',
    directionOrCourse: 'Олимпиадная математика',
    level: 'Продвинутый',
    source: 'Рекомендация',
    assignedTo: 'Елена Менеджер',
    status: 'contacted',
    offerAmount: '6 800 ₽ / мес',
    nextAction: 'Подобрать удобный день для входного тестирования',
    nextActionDate: 'Завтра, 11:00',
    comment: 'Готовятся к районной олимпиаде, хотят сильную группу.',
    createdAt: '2026-09-02T11:20:00Z',
    interactions: [
      {
        id: 'int_l9',
        occurredAt: '02.09.2026, 12:00',
        channel: 'phone',
        type: 'initial_contact',
        author: 'Елена Менеджер',
        content: 'Провели квалификационный звонок. Уровень высокий, требуется сильная группа.',
      },
    ],
  },
  {
    id: 'lead10',
    name: 'Марина Орлова',
    contact: '+7 (999) 555-66-77',
    telegram: '@marina_orlova',
    studentName: 'Тимофей',
    studentAge: '9 лет (3 класс)',
    directionOrCourse: 'Робототехника',
    level: 'Базовый',
    source: 'ДубльГИС',
    assignedTo: 'Елена Менеджер',
    status: 'trial_scheduled',
    trialDate: '05.09.2026 12:00',
    offerAmount: '8 400 ₽ / мес',
    nextAction: 'Отправить напоминание о пробном уроке за день',
    nextActionDate: '04.09.2026',
    comment: 'Записаны на субботний открытый урок в IT-лаборатории.',
    createdAt: '2026-09-01T16:40:00Z',
    interactions: [],
  },
  {
    id: 'lead11',
    name: 'Ксения Мельникова',
    contact: '+7 (999) 666-77-88',
    telegram: '@ksenia_m',
    studentName: 'Кирилл',
    studentAge: '10 лет',
    directionOrCourse: 'Робототехника',
    level: 'Начинающий',
    source: 'Instagram',
    assignedTo: 'Елена Менеджер',
    status: 'trial_held',
    trialDate: '02.09.2026 17:00',
    offerAmount: '8 400 ₽ / мес',
    nextAction: 'Получить подтверждение оплаты первого месяца',
    nextActionDate: 'Сегодня, 18:00',
    comment: 'Пробный прошел на ура, ребенок собрал первую модель машинки.',
    createdAt: '2026-08-30T14:10:00Z',
    interactions: [],
  },
  {
    id: 'lead12',
    name: 'Елена Попова',
    contact: '+7 (999) 777-00-11',
    telegram: '@elena_popova',
    studentName: 'Арина',
    studentAge: '7 лет (1 класс)',
    directionOrCourse: 'Английский язык',
    level: 'A1 Starter',
    source: 'Сайт школы',
    assignedTo: 'Елена Менеджер',
    status: 'paid',
    offerAmount: '7 600 ₽ / мес',
    nextAction: 'Зачислена в группу Kids English A1',
    comment: 'Оплата прошла успешно через Т-Банк. Добавлена в чат группы.',
    createdAt: '2026-08-28T09:00:00Z',
    interactions: [],
  },
];

export interface FullTaskData {
  id: string;
  title: string;
  taskType: 'Retention' | 'CRM Сделка' | 'Финансы' | 'Продление' | 'Оргвопрос';
  studentId?: string;
  studentName?: string;
  parentId?: string;
  parentName?: string;
  leadId?: string;
  leadName?: string;
  assignedTo: string;
  dueDate: string;
  dueDateFormatted: string;
  isOverdue?: boolean;
  status: 'open' | 'in_progress' | 'done' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  description?: string;
  sourceInteractionId?: string;
}

export const INITIAL_TASKS: FullTaskData[] = [
  {
    id: 't1',
    title: 'Позвонить маме Михаила (пропуск 2 занятий подряд)',
    taskType: 'Retention',
    studentId: '1',
    studentName: 'Иван Смирнов',
    parentId: 'p1',
    parentName: 'Ольга Смирнова',
    assignedTo: 'Елена Менеджер',
    dueDate: '2026-09-03',
    dueDateFormatted: 'Сегодня, 14:00',
    status: 'open',
    priority: 'high',
    description: 'Ученик не был на уроках в понедельник и среду. Уточнить самочувствие и предложить онлайн-отработку.',
  },
  {
    id: 't2',
    title: 'Узнать решение после пробного урока и отправить договор (Алиса)',
    taskType: 'CRM Сделка',
    leadId: 'lead3',
    leadName: 'Наталья Ковалева',
    assignedTo: 'Елена Менеджер',
    dueDate: '2026-09-03',
    dueDateFormatted: 'Сегодня, 17:00',
    status: 'open',
    priority: 'high',
    description: 'Пробный урок по английскому прошел успешно. Мама обещала дать ответ сегодня.',
  },
  {
    id: 't3',
    title: 'Проконтролировать погашение долга 8 400 ₽ за сентябрь',
    taskType: 'Финансы',
    studentId: '2',
    studentName: 'Мария Кузнецова',
    parentId: 'p3',
    parentName: 'Дмитрий Кузнецов',
    assignedTo: 'Елена Менеджер',
    dueDate: '2026-09-02',
    dueDateFormatted: 'Вчера (Просрочено)',
    isOverdue: true,
    status: 'open',
    priority: 'high',
    description: 'Отец обещал перевести оплату по СБП до среды. Напомнить в WhatsApp.',
  },
  {
    id: 't4',
    title: 'Предложить продление абонемента со скидкой 5% на октябрь',
    taskType: 'Продление',
    studentId: '1',
    studentName: 'Иван Смирнов',
    parentId: 'p1',
    parentName: 'Ольга Смирнова',
    assignedTo: 'Елена Менеджер',
    dueDate: '2026-09-25',
    dueDateFormatted: '25 сен 2026',
    status: 'open',
    priority: 'medium',
    description: 'Абонемент заканчивается 30 сентября. Выставить счет заранее.',
  },
  {
    id: 't5',
    title: 'Подготовить раздаточные материалы для Kids English A1',
    taskType: 'Оргвопрос',
    assignedTo: 'Мария Иванова',
    dueDate: '2026-09-01',
    dueDateFormatted: '01 сен 2026',
    status: 'done',
    priority: 'medium',
    description: 'Распечатать рабочие тетради и карточки для первоклассников.',
  },
  {
    id: 't6',
    title: 'Позвонить Артему (напомнить о пробном занятии в пятницу)',
    taskType: 'CRM Сделка',
    leadId: 'lead2',
    leadName: 'Артем Павлов',
    assignedTo: 'Елена Менеджер',
    dueDate: '2026-09-04',
    dueDateFormatted: 'Завтра, 16:00',
    status: 'open',
    priority: 'medium',
    description: 'Отправить ссылку на онлайн-конференцию за 2 часа до начала.',
  },
];

export interface FullPaymentData {
  id: string;
  studentId: string;
  studentName: string;
  parentId?: string;
  parentName?: string;
  courseName: string;
  groupName: string;
  amount: number;
  amountFormatted: string;
  paymentDate: string;
  periodLabel: string;
  status: 'paid' | 'expected' | 'overdue' | 'refund';
  paymentMethod: 'card' | 'bank_transfer' | 'cash' | 'invoice';
  recordedBy: string;
  comment?: string;
}

export interface FullSubscriptionData {
  id: string;
  studentId: string;
  studentName: string;
  courseName: string;
  groupName: string;
  startDate: string;
  endDate: string;
  renewalDate: string;
  price: number;
  priceFormatted: string;
  status: 'active' | 'frozen' | 'expired' | 'cancelled';
  lessonsTotal: number;
  lessonsAttended: number;
  notes?: string;
}

export const INITIAL_PAYMENTS: FullPaymentData[] = [
  {
    id: 'pay1',
    studentId: '1',
    studentName: 'Иван Смирнов',
    parentId: 'p1',
    parentName: 'Ольга Смирнова',
    courseName: 'Английский язык',
    groupName: 'English B1 Teens',
    amount: 7600,
    amountFormatted: '7 600 ₽',
    paymentDate: '01.09.2026',
    periodLabel: 'Сентябрь 2026',
    status: 'paid',
    paymentMethod: 'card',
    recordedBy: 'Елена Менеджер',
    comment: 'Оплата по эквайрингу (чек отправлен в Telegram)',
  },
  {
    id: 'pay2',
    studentId: '2',
    studentName: 'Мария Кузнецова',
    parentId: 'p3',
    parentName: 'Дмитрий Кузнецов',
    courseName: 'Робототехника',
    groupName: 'Robotics Junior',
    amount: 14000,
    amountFormatted: '14 000 ₽',
    paymentDate: '25.08.2026',
    periodLabel: 'Сентябрь–Октябрь 2026',
    status: 'overdue',
    paymentMethod: 'bank_transfer',
    recordedBy: 'Елена Менеджер',
    comment: 'Отец обещал перевести по СБП до конца недели. Долг 14 000 ₽',
  },
  {
    id: 'pay6',
    studentId: '5',
    studentName: 'Артём Кузнецов',
    parentId: 'p3',
    parentName: 'Дмитрий Кузнецов',
    courseName: 'Математика',
    groupName: 'Kids Math Safari',
    amount: 13600,
    amountFormatted: '13 600 ₽',
    paymentDate: '26.08.2026',
    periodLabel: 'Сентябрь–Октябрь 2026',
    status: 'overdue',
    paymentMethod: 'bank_transfer',
    recordedBy: 'Елена Менеджер',
    comment: 'Второй ребенок в семье. Долг 13 600 ₽',
  },
  {
    id: 'pay7',
    studentId: 's6',
    studentName: 'Максим Захаров',
    parentId: 'p5',
    parentName: 'Наталья Захарова',
    courseName: 'Английский язык',
    groupName: 'English B1 Teens',
    amount: 14400,
    amountFormatted: '14 400 ₽',
    paymentDate: '28.08.2026',
    periodLabel: 'Сентябрь–Октябрь 2026',
    status: 'overdue',
    paymentMethod: 'card',
    recordedBy: 'Анна Администратор',
    comment: 'Оплата абонемента просрочена на 16 дней. Долг 14 400 ₽',
  },
  {
    id: 'pay3',
    studentId: '5',
    studentName: 'Екатерина Морозова',
    parentId: 'p4',
    parentName: 'Игорь Морозов',
    courseName: 'Математика',
    groupName: 'Kids Math Safari',
    amount: 6800,
    amountFormatted: '6 800 ₽',
    paymentDate: '02.09.2026',
    periodLabel: 'Сентябрь 2026',
    status: 'paid',
    paymentMethod: 'invoice',
    recordedBy: 'Александр Руководитель',
    comment: 'Безналичный расчет по счету ООО',
  },
  {
    id: 'pay4',
    studentId: '3',
    studentName: 'Анна Васильева',
    parentId: 'p4',
    parentName: 'Елена Васильева',
    courseName: 'Английский язык',
    groupName: 'Kids English A1',
    amount: 7200,
    amountFormatted: '7 200 ₽',
    paymentDate: '05.09.2026',
    periodLabel: 'Сентябрь 2026',
    status: 'expected',
    paymentMethod: 'card',
    recordedBy: 'Елена Менеджер',
    comment: 'Выставлена ссылка на оплату после пробного урока',
  },
  {
    id: 'pay5',
    studentId: '4',
    studentName: 'Сергей Попов',
    parentId: 'p1',
    parentName: 'Татьяна Попова',
    courseName: 'Английский язык',
    groupName: 'English B1 Teens',
    amount: 7600,
    amountFormatted: '7 600 ₽',
    paymentDate: '15.08.2026',
    periodLabel: 'Август 2026',
    status: 'paid',
    paymentMethod: 'card',
    recordedBy: 'Елена Менеджер',
  },
];

export const INITIAL_SUBSCRIPTIONS: FullSubscriptionData[] = [
  {
    id: 'sub1',
    studentId: '1',
    studentName: 'Иван Смирнов',
    courseName: 'Английский язык',
    groupName: 'English B1 Teens',
    startDate: '01.09.2026',
    endDate: '30.09.2026',
    renewalDate: '28.09.2026',
    price: 7600,
    priceFormatted: '7 600 ₽',
    status: 'active',
    lessonsTotal: 8,
    lessonsAttended: 2,
    notes: 'Стандартный месячный абонемент на 8 занятий',
  },
  {
    id: 'sub2',
    studentId: '2',
    studentName: 'Мария Кузнецова',
    courseName: 'Робототехника',
    groupName: 'Robotics Junior',
    startDate: '01.09.2026',
    endDate: '30.09.2026',
    renewalDate: '25.08.2026',
    price: 8400,
    priceFormatted: '8 400 ₽',
    status: 'expired',
    lessonsTotal: 8,
    lessonsAttended: 1,
    notes: 'Оплата просрочена, требуется продление',
  },
  {
    id: 'sub3',
    studentId: '4',
    studentName: 'Сергей Попов',
    courseName: 'Английский язык',
    groupName: 'English B1 Teens',
    startDate: '15.08.2026',
    endDate: '15.09.2026',
    renewalDate: '10.09.2026',
    price: 7600,
    priceFormatted: '7 600 ₽',
    status: 'frozen',
    lessonsTotal: 8,
    lessonsAttended: 5,
    notes: 'Заморожен на 1 неделю по заявлению родителей',
  },
  {
    id: 'sub4',
    studentId: '5',
    studentName: 'Екатерина Морозова',
    courseName: 'Математика',
    groupName: 'Kids Math Safari',
    startDate: '01.09.2026',
    endDate: '30.09.2026',
    renewalDate: '05.10.2026',
    price: 6800,
    priceFormatted: '6 800 ₽',
    status: 'active',
    lessonsTotal: 4,
    lessonsAttended: 1,
    notes: 'Абонемент на 1 занятие в неделю (4 занятия в месяц)',
  },
];





