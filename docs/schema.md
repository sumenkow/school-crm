# Текущая схема данных Supabase & CRM Models

Ниже зафиксирована реальная схема сущностей, используемая в проекте CRM школы. Любые изменения или добавления полей допускаются строго по явному указанию пользователя.

---

## 1. `courses` (Курсы / Учебные направления)
*Примечание: Базовая таблица в Supabase хранит ключевые поля; тарифные и возрастные сетки обогащаются через API `/api/courses`.*
- **id**: string (UUID / string identifier)
- **name**: string — Название курса (например: «Английский язык», «Робототехника»)
- **subject**: string — Предметное направление («Иностранные языки», «Информатика и IT», «Точные науки», «Развитие интеллекта»)
- **description**: string (optional) — Краткое описание программы
- **is_active**: boolean — Активен ли курс
- **rub_lesson** / **price_lesson**: number — Стоимость разового занятия (RUB/EUR)
- **rub_month** / **price_monthly**: number — Стоимость абонемента в месяц (RUB/EUR)
- **eur_lesson**: number
- **eur_month**: number
- **target_age** / **age_group**: string — Возрастная категория (например, «7-15 лет»)
- **lesson_duration_minutes**: number — Длительность одного урока (мин)
- **max_students**: number — Вместимость группы (по умолчанию 6–8)

---

## 2. `groups` (Группы / Потоки)
*Группа — единственный контейнер курса. Уроки и ученики привязаны к группе.*
- **id**: string (UUID / string identifier)
- **course_id** / **courseId**: string — ID родительского курса
- **course_name** / **courseName**: string — Название курса
- **name**: string — Название группы (например: «English B1 Teens»)
- **teacher_id** / **teacherId**: string — ID преподавателя
- **teacher_name** / **teacherName**: string — ФИО преподавателя
- **schedule** / **schedule_text**: string — Текст расписания (например: «Пн, Ср 16:30 - 17:30»)
- **room**: string — Кабинет или ссылка («Онлайн (Zoom: ...)», «Кабинет 302»)
- **capacity**: number — Максимальная вместимость
- **status**: 'active' | 'recruiting' | 'archived'
- **is_deleted** / **isDeleted**: boolean (soft delete)
- **students**: Array<GroupStudentRef>

---

## 3. `group_students` (Привязка учеников к группам)
- **id**: string
- **group_id**: string — ID группы
- **student_id**: string — ID ученика
- **joined_at**: string (ISO timestamp)
- **status**: 'active' | 'trial' | 'paused' | 'transferred' | 'completed'

---

## 4. `lessons` (Уроки / Занятия)
*Уроки живут строго внутри группы.*
- **id**: string
- **group_id** / **groupId**: string — ID группы
- **group_name** / **groupName**: string
- **topic**: string — Тема урока
- **homework**: string (optional) — Домашнее задание
- **date**: string — Дата проведения (YYYY-MM-DD или DD.MM.YYYY)
- **start_time** / **startTime**: string — Время начала (HH:mm)
- **end_time** / **endTime**: string — Время окончания (HH:mm)
- **status**: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
- **room**: string — Локация / Ссылка на Zoom

---

## 5. `attendance` (Посещаемость и журнал)
- **id**: string
- **lesson_id**: string — ID урока
- **student_id**: string — ID ученика
- **status**: 'present' | 'absent' | 'sick' | 'rescheduled' | 'cancelled' | 'excused'
- **reason**: string (optional) — Причина отсутствия
- **feedback** / **notes**: string (optional) — Комментарий преподавателя к успеваемости

---

## 6. `parents` (Родители / Законные представители)
- **id**: string
- **first_name** / **lastName**: string
- **full_name**: string — ФИО родителя
- **phone**: string — Контактный телефон
- **whatsapp**: string — Номер WhatsApp
- **telegram**: string — Логин Telegram (@username)
- **email**: string — Электронная почта
- **preferred_channel**: 'telegram' | 'whatsapp' | 'phone' | 'email'
- **balance**: number — Текущий баланс семьи (в EUR)
- **deposit_balance**: number
- **debt_balance**: number
- **children**: Array<ChildRef> — Привязанные дети
- **is_deleted**: boolean

---

## 7. `students` (Ученики)
- **id**: string
- **first_name** / **lastName**: string
- **full_name**: string — ФИО ученика
- **birth_date**: string (optional) — Дата рождения
- **grade**: string (optional) — Класс / уровень
- **student_type**: 'school_student' | 'adult_student'
- **status**: 'lead' | 'trial' | 'active' | 'paused' | 'churned' | 'archived' | 'needs_review'
- **parent_id**: string (optional) — Ссылка на основного родителя
- **parents**: Array<ParentRelation> — Связанные родители (мама, папа, опекун)
- **groups**: Array<StudentGroupRef> — Посещаемые группы
- **finance**: StudentFinanceSummary — Депозит, подписки, платежи
- **is_deleted**: boolean

---

## 8. `leads` (Лиды / Заявки воронки)
- **id**: string
- **parent_name**: string — Имя родителя
- **student_name**: string — Имя ребенка
- **phone**: string — Телефон
- **telegram** / **whatsapp**: string
- **course_id**: string — Интересующий курс
- **course_name**: string
- **status**: 'new' | 'contacted' | 'trial_scheduled' | 'trial_passed' | 'negotiation' | 'won' | 'lost'
- **target_amount**: number — Ожидаемая сумма оплаты
- **next_task_date**: string — Дата следующего контакта / задачи
- **next_task_text**: string — Текст задачи
- **source**: string — Источник заявки (сайт, реклама, рекомендация)
