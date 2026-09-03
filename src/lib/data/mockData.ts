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
