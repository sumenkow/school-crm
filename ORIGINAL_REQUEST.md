# Original User Request

## 2026-10-04T12:52:44Z

# Teamwork Project Prompt

Работу выполнять последовательно специализированными агентами:
AGENT 1 — UX AUDITOR
AGENT 2 — INFORMATION ARCHITECT
AGENT 3 — UI / DESIGN SYSTEM AGENT
AGENT 4 — FRONTEND IMPLEMENTATION AGENT
AGENT 5 — RESPONSIVE / LAYOUT QA
AGENT 6 — VISUAL QA
AGENT 7 — FINAL FIXER

Комплексный последовательный аудит, верстка и полировка диагностического экрана «Финансы и аналитика → Аналитика → Диагностика» в CRM Smart Academy под целевой desktop viewport 1440×900 без горизонтального скролла на базе существующей дизайн-системы и 3-го референса.

Working directory: /Users/andreysumenkov/Documents/crm test antigravity
Integrity mode: development

## Requirements

### R1. UX & Information Architecture Audit
Провести аудит текущей реализации экрана аналитики относительно 3-го референса:
- Выявить дублирование сущностей и вторичные данные.
- Определить блоки, требующие компактного сжатия без потери читаемости.
- Зафиксировать структуру блоков (Header → Tabs → Attention → Analytics Grid 60/40 & 50/50), приоритеты и размеры колонок.
- Определить все точки входа и CTA-действия для сквозного переключения вкладок.
- Не изменять бизнес-логику и существующие сущности.

### R2. UI & Design System Alignment
Сопоставить оформление с текущей дизайн-системой Smart Academy:
- Проверить шрифтовую иерархию (typography), плотность отступов (spacing), скругления (border radius), тени, цветовую кодировку (красный = критично, желтый = риск, зеленый = норма, синий = действие).
- Использовать исключительно существующие компоненты и стили Tailwind CSS без создания сторонних дизайн-систем или библиотек.

### R3. Frontend Implementation & Compact Layout
Реализовать компактную раскладку компонентов:
- Блок «Что требует внимания»: 5 карточек в один ряд (высота ~105–125px) с микро-бейджами и кнопками действий.
- Средний ярус (60/40): Воронка продаж с прогресс-барами и мини-алертом слева, Потери выручки со стек-баром и статьями потерь справа.
- Ярус удержания (60/40): Компактная когортная матрица M0–M5 с тепловой индикацией слева, Ученики в зоне риска (макс. 5 строк) справа.
- Нижний ярус (50/50): Компактные таблицы эффективности преподавателей и загрузки групп с расчетом потенциала.
- Сохранить все существующие фильтры, реальные данные и drilldown переключение вкладок.

### R4. Responsive & Layout QA (1440px, 1536px, 1728px)
Проверить интерфейс на экранах 1440px, 1536px, 1728px и уменьшенной desktop-ширине:
- Полное отсутствие горизонтального скроллбара (zero horizontal scroll).
- Корректная однострочная фиксация вкладок и фильтров.
- Корректные пропорции колонок и высота строк таблиц.

### R5. Visual QA & Final Fix
Сверить итоговый экран с 3-м референсом:
- Четкая визуальная иерархия (проблемы заметнее стандартных данных, явные CTA).
- Исправить выявленные расхождения, выравнивания и микро-отступы.
- Обеспечить успешную сборку проекта (`npm run build` с кодом 0).

## Acceptance Criteria

### Layout & Responsiveness
- [ ] Экран полностью помещается в стандартный desktop-viewport 1440×900 без появления горизонтального скроллбара.
- [ ] Сетка средних ярусов строго следует пропорциям 60/40 (lg:col-span-7 / lg:col-span-5), нижний ярус — 50/50 (lg:col-span-6 / lg:col-span-6).
- [ ] Карточки проблем в верхнем ряду занимают одну строку из 5 колонок высотой не более 125px.
- [ ] Вкладки аналитики занимают ровно одну строку высотой 34–38px без переносов.

### Information Architecture & Interactions
- [ ] Все CTA-кнопки («Посмотреть лиды →», «Посмотреть ушедших →», «Посмотреть группы →», «Посмотреть преподавателей →») переключают активную вкладку аналитики на соответствующий раздел (`sales`, `retention`, `groups`, `teachers`).
- [ ] Карточка потерь выручки отображает общую сумму потерь, 4-цветный стек-бар и разбивку по категориям.
- [ ] Все данные остаются динамическими без хардкода вымышленных KPI.

### Code Quality & Build
- [ ] `npm run build` завершается с кодом 0 без ошибок TypeScript или JSX.
- [ ] Никаких параллельных несогласованных правок одних и тех же компонентов (строгое соблюдение последовательности агентов: UX Audit → IA → UI Audit → Implementation → Responsive QA → Visual QA → Final Fix).

## 2026-10-04T13:42:20Z

Трансформация экрана «Аналитика → Диагностика» в сверхплотный executive dashboard, который целиком помещается в один экран 1440×900 без вертикального и горизонтального скролла, сохраняя весь аналитический состав: блок внимания и 3 ряда аналитических карточек (6 ключевых аналитических виджетов).

Работу выполнять последовательно специализированными агентами (UX Auditor → Information Architect → UI Layout Engineer → Micro-Typography & Density Specialist → Viewport QA Tester → Final Fixer).

Working directory: /Users/andreysumenkov/Documents/crm test antigravity
Integrity mode: development

## Requirements

### R1. Strict Single-Viewport Constraint (1440×900 No-Scroll)
- Экран «Аналитика → Диагностика» обязан полностью помещаться в стандартный рабочий desktop-экран 1440×900.
- Полное отсутствие как вертикального (`overflow-y`), так и горизонтального (`overflow-x`) скролла внутри контейнера `<main>` (`scrollHeight <= clientHeight` при высоте окна 900px).
- Сохранить общую компоновку:
  - Верхняя строка: Заголовок «Аналитика школы» + все 5 селекторов фильтров + кнопка «Экспорт отчёта» в 1 компактную строку (`h-8` / `h-9`).
  - Вторая строка: Табы аналитики (7 вкладок) в 1 ультракомпактную строку (`h-7` / `h-8`).
  - Третья строка: Блок «Что требует внимания» с 5 карточками проблем в 1 ряд.
  - 3 ряда аналитических карточек:
    - **Ряд 1 (60/40)**: Воронка продаж (слева) и Потери выручки (справа).
    - **Ряд 2 (60/40)**: Удержание учеников Retention (слева) и Ученики в зоне риска (справа).
    - **Ряд 3 (50/50)**: Эффективность преподавателей (слева) и Загрузка групп (справа).

### R2. Micro-Geometry & Vertical Budgeting (Высотный бюджет компонентов)
- Распределить вертикальный бюджет экрана (~740–760px полезной высоты после вычета хедера и табов):
  - **Блок внимания**: суммарная высота блока ~95–105px (шапка блока ~22px, карточки проблем ~72–78px).
  - **Ряд 1 (Воронка + Потери)**: фиксированная высота карточек ~180–195px.
  - **Ряд 2 (Когорты + Риск)**: фиксированная высота карточек ~180–195px.
  - **Ряд 3 (Преподаватели + Группы)**: фиксированная высота карточек ~180–195px.
  - **Вертикальные отступы между рядами**: ультракомпактные `gap-2` или `space-y-2` (8px).

### R3. Компактная типографика и табличная плотность
- Использовать executive-плотность элементов:
  - Внутренние паддинги карточек: `p-2.5` или `p-3` (вместо `p-4` / `p-5`).
  - Высота строк в таблицах: `py-0.5` – `py-1` (компактный line-height `leading-tight`).
  - Размеры шрифтов: базовый табличный `text-[11px]`, метки и бейджи `text-[10px]`, подписи `text-[9.5px]`.
  - Микро-бары и прогресс-бары: `h-1` или `h-1.5`.
  - Устранить лишние пустые `mt-3`, `pb-2.5` и отступы, раздувающие контейнеры.

### R4. Сохранение 100% аналитического состава и интерактива
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО удалять аналитические карточки, колонки или метрики.
- Все существующие селекторы (`По этапам / По каналам`, `По категориям / По каналам`, `По месяцам`, направления) обязаны оставаться активными и переключать данные.
- Все ссылки и CTA-кнопки («Посмотреть лиды →», «Посмотреть ушедших →» и т.д.) сохраняют сквозную навигацию на соответствующие вкладки.
- Никаких моковых заглушек или вымышленных сущностей: данные рассчитываются динамически из существующих хуков.

### R5. Layout & Viewport Verification via Puppeteer
- Проверить верстку в реальном окне 1440×900:
  - Автоматически измерить: `main.scrollHeight <= main.clientHeight`.
  - Убедиться, что нижний край 3-го ряда карточек виден целиком без прокрутки колесиком мыши.
  - Проверить, что ни один текст или число не перекрывается и не выпадает за пределы карточек.

## Acceptance Criteria

### Viewport & No-Scroll
- [ ] На экране 1440×900 страница `/analytics` отображается строго в один viewport: на `<main>` отсутствует полоса вертикальной и горизонтальной прокрутки (`scrollHeight <= clientHeight`).
- [ ] Все 3 ряда аналитических карточек (все 6 виджетов) и верхний блок «Что требует внимания» полностью помещаются в видимую область экрана без скролла.

### Density & Visual Balance
- [ ] Карточки «Что требует внимания» упакованы в 1 ряд высотой не более 80px с компактным текстом и цветными бейджами.
- [ ] Карточки Воронки, Потерь, Когорт, Учеников в риске, Преподавателей и Групп имеют одинаковую компактную высоту внутри каждого ряда (~180–195px).
- [ ] Внутренние таблицы (Воронка, Когорты, Преподаватели, Группы) имеют компактные строки (`py-0.5`–`py-1`) и читаются без наложения.

### Data & Interactivity Integrity
- [ ] Ни одна из 6 аналитических карточек не удалена и не скрыта.
- [ ] Селекторы режимов («По этапам/каналам», «По категориям/каналам») продолжают корректно переключать данные.
- [ ] Кнопки переходов («Посмотреть лиды →» и др.) работают штатно.

### Build & Code Health
- [ ] `npm run build` завершается с кодом 0 без ошибок TypeScript и сборщика.
- [ ] Отсутствуют новые несанкционированные колонки/таблицы в базе данных.

## 2026-10-04T15:46:35Z

Комплексная реализация обновленного ТЗ для вкладки «Ученики и удержание» в аналитике: когортный анализ M0–M5, реестр учеников в зоне риска, учет причин ухода как структурированного атрибута события прекращения обучения (с обособленным хранилищем фактов ухода, независимым от текста Timeline), аналитика причин оттока и виджет ближайших продлений.

Работу выполнять последовательно специализированными агентами (UX Auditor → Data & Domain Architect → Frontend & Modal Engineer → Analytics Tab Engineer → QA & Acceptance Tester → Final Fixer).

Working directory: /Users/andreysumenkov/Documents/crm test antigravity
Integrity mode: development

## Requirements

### R1. Структурированный учет событий прекращения обучения (Structured Churn Events)
- **Принцип данных**:
  - Причина ухода является **структурированным атрибутом события прекращения обучения**, а не свободным текстом Timeline и не постоянной колонкой в карточке ученика.
  - Каждое событие смены статуса на прекращение обучения фиксируется как отдельная структурированная запись:
    `{ id, studentId, studentName, occurredAt, previousStatus, newStatus, churnReasonId, churnComment, author }`.
  - При повторном уходе ранее вернувшегося ученика создается **новый факт прекращения обучения** со своей причиной (история не перетирается).
- **Справочник причин ухода (10 вариантов)**:
  1. `price` — «Дорого / не устроила стоимость»
  2. `schedule` — «Не устраивает расписание»
  3. `interest` — «Низкая посещаемость / потерял интерес»
  4. `quality` — «Не устроило качество обучения»
  5. `relocation` — «Переезд»
  6. `completed` — «Закончил обучение / достиг цели»
  7. `another_school` — «Перешёл в другую школу»
  8. `financial` — «Финансовые причины»
  9. `family` — «По семейным обстоятельствам»
  10. `other` — «Другое»
- **UI изменения статуса в CRM**:
  - При переводе ученика в статус прекращения обучения (`archived` / выбыл) в карточке ученика (`/students/[id]`) и в модалке групповой смены статуса (`BulkChangeStatusModal`) пользователь **обязан выбрать причину ухода** из радио-списка и может указать опциональный комментарий.
  - Без выбора причины сохранение статуса прекращения обучения блокируется.
  - «Пауза (Заморозка)», «перевод между группами» и обычные операционные правки **не являются уходом** — при них выбор причины не отображается.
- **Отображение в Timeline**:
  - Timeline автоматически визуализирует это событие как человекочитаемую карточку (например: *«Статус изменен: Активен → В архиве. Причина: Не устраивает расписание. Комментарий: ...»*).
  - **Timeline НЕ является источником данных для аналитики**: аналитика читает напрямую структурированный реестр событий прекращения обучения.

### R2. Вкладка аналитики «Ученики и удержание» — 4 целевых блока
Полная переработка вкладки `retention` в `/analytics` в компактную executive-сетку 2×2 под стиль Smart Academy:

1. **Блок 1: Когортный анализ Retention (M0–M5)**:
   - Когорта по месяцу старта обучения (с количеством учеников в скобках).
   - Колонки M0 (100% синий) до M5 с процентами удержания и тепловой раскраской ячеек.
   - Сравнение когорт и динамическое предупреждение об отклонении от нормы (например: *«⚠ Июльская когорта теряет учеников быстрее нормы: 86.6% после 2-го месяца против среднего 90.4%»*).
   - Кнопка *«Посмотреть ушедших →»*.

2. **Блок 2: Ученики в зоне риска (At-Risk)**:
   - Отображение только учеников с реальными объективными признаками риска (не называть их «ушедшими» — статус ученика остается активным!):
     - Низкая посещаемость (< 75%)
     - Просроченный платеж / долг
     - Пакет занятий заканчивается (осталось $\le 2$ занятий)
     - Длительное отсутствие / нет активности
   - Карточка ученика: Имя, курс/группа, конкретный триггер риска в бейдже (`[НИЗКАЯ ПОСЕЩАЕМОСТЬ]`, `[ПРОСРОЧЕН ПЛАТЁЖ]`, `[ПАКЕТ ЗАКАНЧИВАЕТСЯ]`, `[НЕТ АКТИВНОСТИ]`), индикатор уровня риска (`↓ Высокий` / `↓ Средний`).
   - Кнопка перехода *«Показать всех →»*.

3. **Блок 3: Почему уходят ученики (Аналитика причин оттока)**:
   - Расчет агрегированной статистики причин ухода непосредственно по структурированным событиям прекращения обучения за выбранный период фильтра.
   - Горизонтальные прогресс-бары с долями (%) и количеством ушедших по каждой причине.
   - **Правило пустых данных (Mock Ban)**: Если за период зафиксировано менее 3 уходов — отображать честный empty state: *«Недостаточно данных для анализа. За выбранный период зафиксировано X уходов. Соберите больше данных для выявления закономерностей»*. Запрещен показ вымышленных процентов!
   - Если данных достаточно: вывод ключевой точки принятия решения (например: *«🔴 Основная причина ухода — расписание (32% ушедших учеников)... Больше всего уходов: Robotics Junior (5), English B1 (4)... Посмотреть учеников →»*).
   - Кнопка *«Подробнее →»*.

4. **Блок 4: Ближайшие продления**:
   - Список учеников, у которых абонемент подходит к концу:
     - 0 занятий (🔴 критично / просрочено)
     - 1 занятие (🟡 внимание)
     - 2–3 занятия (🟢 штатное продление)
   - Курс / группа, остаток занятий, цветной индикатор.
   - Кнопка перехода *«Все продления →»*.

### R3. Интеграция с существующей системой и дизайн-системой
- Сохранение единого фильтра периода и направлений в шапке аналитики.
- Сквозные переходы: клики по карточкам риска или продлений открывают профиль ученика либо фильтруют реестр учеников.
- Соответствие десктопной дизайн-системе (Tailwind, Lucide SVG-иконки, скругления `rounded-2xl`, чистые тени `shadow-2xs`/`shadow-xs`).
- Успешная сборка проекта `npm run build` с кодом 0.

## Acceptance Criteria

### Churn Reason Event Architecture
- [ ] Причина ухода сохраняется как структурированный объект события прекращения обучения (`churnReasonId`, `churnComment`, `occurredAt`, `previousStatus`, `newStatus`), а не свободный текст.
- [ ] Timeline отображает событие в человекочитаемом виде, но аналитика обращается к структурированному источнику событий.
- [ ] При переводе ученика в статус прекращения обучения (`archived`) выбор причины ухода из 10 вариантов обязателен для завершения действия.
- [ ] Статусы «Пауза / Заморозка» и смена групп не считаются уходом и не требуют указания причины.
- [ ] При повторном уходе ранее вернувшегося ученика создается новая независимая запись события ухода без перезаписи старой.

### Retention Tab Layout & Analytics
- [ ] Вкладка «Ученики и удержание» в `/analytics` отображает 4 взаимодополняющих блока в едином стиле: Когорты Retention, Ученики в риске, Причины ухода, Ближайшие продления.
- [ ] Когортный анализ содержит колонки M0–M5 с реальными процентами и алертом аномалий.
- [ ] Блок «Ученики в зоне риска» показывает только реальных учеников с рисковыми триггерами и не помечает их «ушедшими».
- [ ] Блок «Почему уходят» корректно рассчитывает доли причин из структурированных событий оттока, а при недостаточном количестве данных (< 3 уходов) отображает честный empty state без моковых процентов.
- [ ] Блок «Ближайшие продления» отображает статус остатка занятий с цветовой дифференциацией (0, 1, 2-3 занятия).

### Quality & Performance
- [ ] `npm run build` проходит успешно без ошибок TypeScript и сборщика.
- [ ] Отсутствуют бесконечные циклы `useEffect` и утечки ререндеров.

## 2026-10-04T16:27:09Z

# Teamwork Project Prompt
## Рефакторинг вкладки «Ученики и удержание» по целевому UI-референсу

Working directory: /Users/andreysumenkov/Documents/crm test antigravity
Integrity mode: development
Requested team: Работу выполнять последовательно специализированными агентами (AGENT 1 — CODEBASE / ARCHITECTURE AUDITOR, AGENT 2 — DATA / BUSINESS LOGIC ANALYST, AGENT 3 — UX/UI ANALYST, AGENT 4 — FRONTEND IMPLEMENTATION AGENT, AGENT 5 — VISUAL QA, AGENT 6 — FINAL CODE REVIEW)

### РОЛЬ
Ты — команда продуктовых AI-агентов, выполняющая рефакторинг существующей вкладки CRM:
Аналитика → Ученики и удержание
по целевому референсу: Аналитика школы Smart Academy(1).png.

Главная задача:
Сохранить существующую архитектуру CRM, сущности, данные, API, бизнес-логику и визуальный язык приложения, но перестроить композицию вкладки «Ученики и удержание» так, чтобы она максимально соответствовала целевому референсу.

## КРИТИЧЕСКИЕ ПРАВИЛА
1. НЕ СОЗДАВАТЬ НОВЫЕ BUSINESS ENTITIES (Risk, Churn, Retention, Renewal, StudentRisk, ChurnReason, AnalyticsStudent, RetentionCohort и любые аналогичные). Использовать только существующие сущности CRM. Не придумывать mock-данные.
2. НЕ ЛОМАТЬ СУЩЕСТВУЮЩУЮ CRM: изучить Analytics, Retention tab, hooks, API, Student, Parent, Group, Teacher, Lesson, Payment, Subscription/Package/Balance.

## СТРУКТУРА ЭКРАНА (1440×900)
1. HEADER: «Аналитика школы», подзаголовок: «Ученики и удержание — анализ активностей, продлений и причин ухода», существующие фильтры.
2. TAB BAR: «Ученики и удержание» активна с синим акцентом.
3. KPI ROW: 6 компактных карточек в одну строку:
   - 1. Активные ученики (184, ↑ +8%, Было: 170)
   - 2. Новые ученики (27, ↑ +12%, Было: 24)
   - 3. Ушли из обучения (14, ↓ -22%, Было: 18)
   - 4. Retention (M+3) (92,4%, ↑ +1,8 п.п., Было: 90,6%)
   - 5. Продлили обучение (81%, ↑ +5 п.п., Было: 76%)
   - 6. Ученики в зоне риска (17, ↑ +42%, Было: 12)
4. RETENTION (Левая верхняя карточка):
   - Заголовок: «Удержание учеников (Retention)», подзаголовок: «Когортный анализ по месяцам старта обучения».
   - Колонки: Когорта, Размер, M0 (100% синий), M1, M2, M3, M4, M5 с цветовой градацией.
   - Внизу: аналитический insight («Июльская когорта теряет учеников быстрее нормы») и кнопка «Посмотреть ушедших учеников →».
5. УЧЕНИКИ В ЗОНЕ РИСКА (Правая верхняя карточка):
   - Заголовок: «Ученики в зоне риска», подзаголовок: «Активные ученики с объективными признаками угрозы оттока».
   - 5 строк: аватар, Имя Фамилия · Группа · конкретный сигнал риска (нет активности, низкая посещаемость, просрочен платеж, заканчивается пакет) · уровень (Высокий / Средний / Низкий).
   - Внизу: «Показать всех 17 учеников в зоне риска →».
6. ПОЧЕМУ УХОДЯТ (Левая нижняя карточка):
   - Заголовок: «Почему уходят ученики», подзаголовок: «Анализ причин прекращения обучения по структурированным фактам».
   - При наличии данных: таблица причин с горизонтальными барами (Не устроило расписание 32%, Высокая стоимость 23%, Потерял интерес 18%, Переезд 14%, Не устроило качество 9%, Другое 4%) + правый summary-блок («Всего ушло учеников 22», «Основная причина: Не устроило расписание 32%»).
   - Empty state: «Недостаточно данных для анализа. За выбранный период недостаточно зафиксированных причин ухода...» при нехватке данных.
7. БЛИЖАЙШИЕ ПРОДЛЕНИЯ (Правая нижняя карточка):
   - Заголовок: «Ближайшие продления», подзаголовок: «Ученики, у которых скоро заканчивается абонемент».
   - Таблица: Ученик, Группа, Осталось (цветные пиллы), Дата окончания, Риск.
   - Внизу: «Показать все ближайшие продления →».
8. УБРАТЬ ИЗ ВКЛАДКИ боковые графики («Динамика активных и ушедших» и «Конверсия продлений») для сохранения чистой 2×2 сетки на 1440×900.

## Acceptance Criteria
- [ ] Все 6 KPI отображаются компактно в одну строку сверху.
- [ ] Четыре основных блока скомпанованы в сетку 2×2 строго по референсу.
- [ ] Отсутствуют лишние боковые графики (динамика и конверсия убраны).
- [ ] `npm run build` проходит с кодом 0.
- [ ] Вся разметка помещается в целевой экран 1440×900 без лишнего скролла.

## 2026-10-04T17:31:00Z

# Teamwork Project Prompt
## Рефакторинг вкладки «Продажи и конверсия» по UI/UX референсу

Working directory: /Users/andreysumenkov/Documents/crm test antigravity
Integrity mode: development
Requested team: Работу выполнять последовательно специализированными агентами (AGENT 1 — CODEBASE ARCHITECT, AGENT 2 — DATA & BUSINESS LOGIC ANALYST, AGENT 3 — UX REVIEW, AGENT 4 — FRONTEND IMPLEMENTATION AGENT, AGENT 5 — VISUAL QA, AGENT 6 — FINAL CODE REVIEW)

### CONTEXT
Ты работаешь над существующей CRM Smart Academy / YouEurope CRM.
Необходимо выполнить глубокий UX/UI и frontend-рефакторинг существующей вкладки аналитики:
Аналитика → Продажи и конверсия
по целевому графическому референсу: docs/reference_sales.png («Аналитика школы — Продажи и конверсия»).

Главная задача:
Вкладка должна отвечать на ключевые вопросы владельца школы:
1. Сколько новых лидов пришло?
2. На каком этапе теряем потенциальных учеников?
3. Какие каналы приводят качественных лидов?
4. Почему лиды не доходят до оплаты?
5. Какие менеджеры работают эффективно, а где проблема?
6. Какие конкретные лиды требуют внимания?

## КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ (AGENTS.md)
1. НЕ СОЗДАВАТЬ НОВЫЕ BUSINESS ENTITIES (AnalyticsLead, LeadChannel, LeadConversion, LeadLoss, ManagerPerformance, SalesFunnel, SalesAnalytics, LeadRisk). Использовать существующие сущности: FullLeadData из leadStorage.ts, payment, group, user/manager, timeline.
2. НЕ ИСПОЛЬЗОВАТЬ MOCK DATA: Все цифры должны приходить из существующего data layer / hooks. Если данных за период недостаточно — показывать честный empty state («Недостаточно данных для анализа»), а не придуманную статистику.
3. НЕ ЛОМАТЬ СУЩЕСТВУЮЩУЮ CRM: Сохранить sidebar, header, глобальные фильтры, маршруты, CRM-воронку (/crm) и карточки лидов (/crm/leads/[id]).

## ЦЕЛЕВАЯ ИНФОРМАЦИОННАЯ АРХИТЕКТУРА И ЭКРАН (1440×900)
1. HEADER: «Аналитика школы» с контекстным подзаголовком «Продажи и конверсия — анализ воронки, каналов и причин потери лидов» + существующие глобальные фильтры (Период, Сравнение, Направления, Группы, Менеджеры, Экспорт).
2. TAB BAR: Сохранить все 7 табов, активная вкладка «Продажи и конверсия» с синим акцентом.
3. KPI ROW: Компактный горизонтальный ряд из 6 KPI карточек равной высоты (h-[82px], grid-cols-6):
   - 1. Новые лиды (кол-во за период + дельта к прошлому периоду);
   - 2. Пробные занятия (назначенные/созданные пробные);
   - 3. Состоялись пробные (фактически проведенные пробные);
   - 4. Оплаты (число лидов, дошедших до оплаты);
   - 5. Конверсия (оплатившие / новые лиды × 100%);
   - 6. Выручка от новых (фактические платежи от привлеченных в период клиентов, либо честный empty state).
4. ВОРОНКА ПРОДАЖ (Главный блок, слева сверху):
   - Таблица этапов конверсии по реальным статусам модели (new -> contacted -> trial_scheduled -> trial_held -> thinking -> paid) с цветными горизонтальными барами, значениями «Сейчас», «Было», «Конверсия», «Изменение».
   - Внизу insight: автоматическое определение главного провала (например: «Главный провал: Пробный состоялся → Оплата») + кнопка «Посмотреть лиды →» с переходом в реестр лидов.
5. ЛИДЫ ПО КАНАЛАМ (Верхняя центральная карточка):
   - Таблица: Канал (Сайт школы, Instagram, Рекомендации, Telegram, Офлайн), Лиды, Пробные, Оплаты, Конверсия, Доля.
   - Внизу ссылка: «Посмотреть лиды по каналам →».
6. ДИНАМИКА ЛИДОВ И ОПЛАТ (Верхний правый блок):
   - Компактный график/гистограмма (Лиды, Пробные, Оплаты) по периодам с переключателем [По месяцам / По неделям].
7. СКОРОСТЬ ОБРАБОТКИ ЛИДОВ (Под динамикой):
   - Среднее время до 1-го контакта, Лиды > 24 часов, Лиды без контакта.
   - Алерт и переход в реестр лидов.
8. ПРИЧИНЫ ПОТЕРИ ЛИДОВ (Нижний левый блок):
   - Таблица причин оттока лидов (lossReason) с прогресс-барами, процентами долей и потенциальной выручкой.
   - Honest empty state: если зафиксировано мало записей — показывать аккуратный empty state.
   - Ссылка: «Посмотреть все неуспешные лиды →».
9. ЭФФЕКТИВНОСТЬ МЕНЕДЖЕРОВ (Нижний центральный/правый блок):
   - Таблица реальных менеджеров: Менеджер, Лиды, Пробные, Оплаты, Конверсия, Ср. время, Выручка.
   - Insight с алертом отстающих и ссылкой «Посмотреть менеджеров →».
10. ДЕТАЛИЗАЦИЯ ЛИДОВ (Нижняя сквозная таблица):
   - Колонки: Дата, Лид, Канал, Этап, Менеджер, Причина (если неуспешный), Сумма, Статус.
   - Локальный поиск, фильтры (Этап, Канал, Менеджер, Статус), экспорт.
   - Клик по лиду открывает профиль/карточку лида.

## DRILL-DOWN И ИНТЕРАКТИВНОСТЬ
Все ссылки («Посмотреть лиды →», «Посмотреть лиды по каналам →», «Посмотреть все неуспешные лиды →», клики по этапам/каналам/причинам) должны вести на реальный реестр CRM с соответствующими фильтрами.

## Acceptance Criteria
- [ ] Все 6 KPI отображаются компактно в одну строку сверху.
- [ ] Воронка продаж, каналы, динамика и скорость скомпонованы в верхний ярус строго по референсу.
- [ ] Причины потерь и эффективность менеджеров скомпонованы в средний ярус.
- [ ] Таблица детализации лидов расположена снизу со всеми фильтрами и поиском.
- [ ] Все данные рассчитываются динамически из существующей БД/хранилища (Zero New Entities, Mock Data Ban).
- [ ] `npm run check` (tsc --noEmit) проходит с кодом 0.
- [ ] `npm run build` проходит с кодом 0.
- [ ] Экран органично помещается в 1440×900 без горизонтального скролла.

## 2026-10-04T17:34:22Z

This is a single self-contained fix; keep it small and focused.

Реализовать недостающие виджеты «Динамика активных и ушедших» и «Конверсия продлений» на вкладке «Ученики и удержание» раздела аналитики (`/analytics`), восстановив правильную сетку экрана согласно оригинальному макету `docs/reference_retention.png`.

Working directory: `/Users/andreysumenkov/Documents/crm test antigravity`
Integrity mode: development

## Context
- В файле `docs/reference_retention.png` правая верхняя часть экрана содержит отдельную колонку из двух карточек:
  1. **«Динамика активных и ушедших»**: гистограмма (Активные, Новые, Ушли) за 6 месяцев с линией тренда и селектором периода («По месяцам»).
  2. **«Конверсия продлений»**: метрика 81% (↑ +5 п.п., Было: 76%) со спарклайном помесячной динамики.
- В текущем коде `src/features/analytics/components/RetentionAnalyticsSection.tsx` экран ошибочно свёрстан в плоскую сетку 2x2 (`grid-cols-2`), из-за чего правая колонка полностью отсутствует.

## Requirements

### R1. Восстановление 3-колоночной компоновки верхнего яруса
Перестроить сетку верхнего яруса `RetentionAnalyticsSection.tsx`:
- Слева: «Удержание учеников (Retention)» (когортная матрица)
- В центре: «Ученики в зоне риска» (список с бейджами уровней)
- Справа: колонка из двух карточек («Динамика активных и ушедших» + «Конверсия продлений»)

### R2. Компонент «Динамика активных и ушедших»
- Карточка с заголовком, тултипом ⓘ и селектором периода (По месяцам / По кварталам).
- Легенда: Активные (синий), Новые (зеленый), Ушли (красный).
- Столбчатая диаграмма помесячной динамики (Апр, Май, Июн, Июл, Авг, Сен) с оранжевой линией тренда.
- Динамический расчет на основе данных студентов, абонементов и `churnStorage.ts`.

### R3. Компонент «Конверсия продлений»
- Крупный KPI (процент продлений, например 81%), бейдж прироста (↑ +5 п.п.), историческое значение («Было: 76%»).
- Векторный спарклайн / SVG-график помесячной динамики конверсии за 6 месяцев.

### R4. Сохранение адаптивности и no-scroll на 1440x900
- Сетка должна гармонично отображаться на десктопе 1440x900 без лишней вертикальной прокрутки, строго по правилам `AGENTS.md`.

## Acceptance Criteria

### Визуальное соответствие макету docs/reference_retention.png
- [ ] На вкладке «Ученики и удержание» присутствуют обе карточки правой колонки.
- [ ] Виджет «Динамика активных и ушедших» отображает 3 ряда баров (активные, новые, ушедшие) и линию тренда.
- [ ] Виджет «Конверсия продлений» отображает процент, дельту и график динамики по месяцам.
- [ ] Нижний ярус («Причины ухода» и «Ближайшие продления») сохранен без искажений.

### Качество кода
- [ ] `npm run check` проходит с 0 ошибок TypeScript.
- [ ] Данные рассчитываются динамически через хук `useRetentionTabData.ts`.

## 2026-10-04T18:09:46Z

This is a single self-contained fix; keep it small and focused.

Устранить переполнение по ширине и обеспечить полную адаптивность плашек «Динамика активных и ушедших» и «Конверсия продлений» на вкладке «Аналитика → Ученики и удержание» в CRM YouEurope / Smart Academy. Сохранить 3-колоночную компоновку верхнего яруса (Когорты удержания + Ученики в зоне риска + Правая колонка с графиками динамики и конверсии), адаптировав сетку, SVG-графики и подписи так, чтобы они идеально вписывались в рабочую область экрана 1440×900 (и от 1280px) без появления горизонтального скролла.

Working directory: /Users/andreysumenkov/Documents/crm test antigravity
Integrity mode: development

---

## Requirements

### R1. Адаптивная сетка верхнего яруса (`RetentionAnalyticsSection.tsx`)
- Переработать сетку верхнего яруса на 12-колоночную или пропорциональную flex/grid систему (например, 5 колонок для когорт, 4 колонки для зоны риска, 3 колонки для динамики/конверсии), гарантирующую, что правая колонка не выпадает за пределы viewport при наличии сайдбара на экранах от 1280px до 1440px+.
- На всех родительских и дочерних контейнерах явно проставить `min-w-0`, чтобы предотвратить распирание flex/grid контейнеров содержимым.

### R2. Эластичность и адаптивность карточки «Динамика активных и ушедших» (`ActiveAndChurnedDynamicsCard.tsx`)
- Сделать SVG-график по-настоящему адаптивным: использовать `viewBox`, `w-full`, `preserveAspectRatio="xMidYMid meet"`.
- Оптимизировать плотность отображения:
  - Убрать жесткую фиксацию ширины и сжатие подписей месяцев; при показе по месяцам отображать последние 6 месяцев (или сокращенные подписи), чтобы 3 столбика на каждый месяц не наползали друг на друга при ширине карточки ~280-320px.
  - Селектор периода и заголовок карточки оформить компактно (с `truncate` и `shrink-0`), предотвращая перенос и распирание шапки.

### R3. Эластичность и адаптивность карточки «Конверсия продлений» (`RenewalConversionCard.tsx`)
- Сделать SVG-линейный график эластичным (`w-full`, `viewBox="0 0 320 66"` или динамические координаты без жесткого пиксельного выхода за границы).
- Шапку карточки и блок крупной метрики («81%», «+5 п.п.») адаптировать к компактной ширине без разрыва границ.

### R4. Сохранение функциональности и данных
- Сохранить все существующие данные, интерактивность (тултипы, переключение режимов «По месяцам» / «По кварталам»), подписки на хук `useRetentionTabData`.
- Не создавать новых таблиц или сущностей (Zero New Entities).

---

## Acceptance Criteria

### Верстка и геометрия (Viewport 1440×900 & 1280px)
- [ ] Горизонтальный скролл (`overflow-x`) на странице `/analytics` при активной вкладке `retention` полностью отсутствует (0 px).
- [ ] Обе плашки («Динамика активных и ушедших» и «Конверсия продлений») полностью помещаются в границах рабочей области справа, без обрезания контента.
- [ ] Столбики гистограммы, линии графиков и подписи месяцев не наслаиваются и остаются четко читаемыми.

### Сборка и стабильность
- [ ] `npm run check` (`tsc --noEmit`) проходит без ошибок TypeScript (код 0).
- [ ] `npm run build` успешно компилирует все 28 маршрутов Turbopack (код 0).
- [ ] Реальный рендеринг проверен в Chromium (Puppeteer) со снятием проверочного скриншота.

## 2026-10-04T19:53:46Z

Full multi-agent audit team (Orchestrator, Architecture, Database/Data Model, Business Logic, Functional QA, UI/UX, Unit & Integration Tests, Accessibility, Security).

Conduct a comprehensive, read-only technical, functional, data, UX/UI, and test audit of the Smart Academy CRM web application, producing a unified inventory, problem map, analytics metric traceability matrix, and a prioritized P0–P4 bug register without modifying production source code.

Working directory: /Users/andreysumenkov/Documents/crm test antigravity
Integrity mode: development

## Requirements

### R1. Complete System Inventory & Architecture Audit
- Perform a complete inventory of all routes, pages, modals, server actions, Supabase queries, and state management hooks.
- Map the actual architecture against existing rules in `AGENTS.md` and `docs/schema.md`.
- Identify dead code, bloated components, duplicated business logic, and architectural debt without altering code.

### R2. Data Model & Entity Lifecycle Audit
- Audit all real database entities (`leads`, `students`, `parents`, `groups`, `lessons`, `attendance`, `teachers`, `payments`, `tasks`, etc.).
- Trace lifecycle, CRUD points, and single source of truth for all business statuses (student status, lead status, payment status, lesson status, group status).
- Audit cross-entity workflows, especially the `Lead → Student / Parent → Group → Payment → Timeline` conversion pipeline for data loss, duplication, and orphan records.

### R3. Business Logic, Functional QA & Analytics Source-of-Truth Audit
- Inspect every core user workflow (Calendar week view & lesson status transitions `Planned → Conducted/Rescheduled/Cancelled`, Attendance sync, Student cards, Parent relations, Groups capacity & direction rules, Sales funnel, Finance in EUR).
- Audit all analytics tabs (Diagnostics, Sales, Retention, Finance, Groups, Teachers, Reports). For every UI metric, determine its formula, database entity, and calculation path. Flag any fake calculations, mock arrays, or unverified percentages as Data Integrity issues.

### R4. UI/UX, Design System, Accessibility & Security Audit
- Evaluate visual consistency (typography, spacing, borders, radius, color semantics per `AGENTS.md`, button/input variants).
- Perform visual inspection and screenshot capture for key desktop screens (1440×900 and 1280×800) to identify clipping, overflow, horizontal scroll, or broken alignment.
- Audit accessibility basics (keyboard focus, contrast, aria attributes) against WCAG 2.1 AA.
- Audit security postures (Supabase client/server authorization, role-based visibility vs server enforcement, IDOR risks, sensitive data exposure).

### R5. Test Coverage Audit & Unified Prioritized Audit Register (P0–P4)
- Audit current test infrastructure and identify missing unit, integration, and E2E test scenarios across all critical business logic and state transitions.
- Consolidate all findings into a unified Audit Register table (`ID`, `Section`, `Type`, `Problem`, `Severity` [P0–P4], `Evidence`, `Solution Proposal`, `Status: Open`).
- Produce an Executive Summary and Product Map with honest health indicators (🟢 Ready, 🟡 In development, 🔴 Broken, ⚪ Not implemented).
- Strictly enforce READ-ONLY on Phase 1: zero changes to `src/` or database schemas during the audit.

## Acceptance Criteria

### Audit Scope & Completeness
- [ ] A complete application inventory table covering all routes and components with actual operational status is delivered.
- [ ] An Entity Lifecycle & Source-of-Truth map covering all entities and statuses is documented.
- [ ] The Lead-to-Student conversion pipeline is audited with specific findings on data integrity, adult vs child students, and parent creation.
- [ ] The Calendar and Lesson status state machine (`Planned`, `Conducted`, `Rescheduled`, `Cancelled`) is audited with verified invalid transition guards.
- [ ] Every analytics metric displayed in the UI has either a documented formula and data source path, or is explicitly flagged as a Data Integrity issue.
- [ ] Finance audit confirms currency consistency (EUR) and flags any stray symbols or incorrect aggregations.

### Quality, Security & Visual Audit
- [ ] Design system audit documents counts of variants (buttons, inputs, card styles, radii, color palette violations).
- [ ] Visual regression findings are cataloged with screen resolutions (1440×900 / 1280×800) and specific UI defects noted.
- [ ] Security audit provides concrete evaluation of server-side vs client-side authorization and data exposure.
- [ ] Accessibility review lists actionable WCAG 2.1 AA findings for forms, tables, and dialogs.

### Deliverables & Guardrails
- [ ] A unified Audit Register with severity P0, P1, P2, P3, P4 is produced in markdown format.
- [ ] An Executive Summary and Product Map reflecting actual functional readiness are generated.
- [ ] Missing test requirements (unit, integration, E2E) are enumerated with concrete test cases.
- [ ] Verification of zero unintended modifications: `git status` shows no modifications to production application code in `src/` or `supabase/`.

## 2026-10-05T04:10:19Z

Comprehensive, read-only Post-Fix Verification of the Smart Academy CRM following Phase 0–4 critical fixes. The team will objectively verify each bug fix AUD-001..AUD-015, test backup restoration, audit live Supabase database integrity, execute and verify end-to-end user journeys (Lead→Student→Group→Lesson→Attendance→Billing and Payment→Balance→Renewal), and perform an exhaustive reality check across all 7 analytics tabs without altering production source code.

Working directory: /Users/andreysumenkov/Documents/crm test antigravity
Integrity mode: development

## Requirements

### R1. Complete AUD-001..AUD-015 Bug Status Verification
- For every item from AUD-001 through AUD-015, examine the implementation in source code and unit tests.
- Assign an unambiguous status: FIXED, PARTIAL, or OPEN.
- Provide concrete evidence for each status (file paths, line numbers, test outputs, or edge cases).

### R2. Backup Recovery Drill
- Inspect backup/2026-10-05/ artifacts (schema_backup.sql, localStorage.json, checksums.sha256, environment_inventory.json).
- Verify checksums against recorded values.
- Validate that schema_backup.sql is syntactically valid and can be loaded into Postgres without dependency errors.
- Validate that localStorage.json is valid JSON and contains all required CRM entity state keys (crm_students_master_v2, crm_leads_master_v2, crm_groups_master_v2, crm_lessons_master_v2, crm_payments_master_v2).

### R3. Live Supabase DB State & SSOT Audit
- Query the live Supabase instance using service role credentials to inspect:
  - Database enums: lead_status (contains 'enrolled'), payment_status (contains 'pending', 'failed', 'cancelled'), group_status.
  - Row Level Security (RLS) policies on core tables (leads, students, parents, groups, lessons, attendance, payments, courses).
  - Table records: orphan checks (e.g. students without parents, lessons without groups, payments without student/parent), duplicate checks, and data consistency between Supabase and LocalStorage.
  - Document the current Split SSOT status: which entities reside exclusively in LocalStorage (e.g., invoices, churn_events) vs Supabase.

### R4. End-to-End (E2E) Core Workflow Verification
- Trace and execute end-to-end user scenario 1:
  Lead (New) → Qualification & Conversion → Student & Parent Created → Group Enrollment → Lesson Attendance Marked (Present) → Billing Deduction (Subscription/Deposit) → Cancellation Rollback.
- Trace and execute end-to-end user scenario 2:
  Payment Created → Status Applied (Paid/Overdue/Expected) → Student Balance & Subscription Updated → Renewal Risk Calculation.
- Check modal accessibility basics and keyboard trap / focus management in conversion and lesson attendance modals.

### R5. 7-Tab Analytics Reality Check
- Audit all 7 analytics tabs and underlying data feeds:
  1. Diagnostics
  2. Sales
  3. Retention
  4. Finance
  5. Groups
  6. Teachers
  7. Reports
- For each tab, check every chart, KPI card, and table for:
  - Hardcoded numbers and fake static fallbacks (e.g., static currency amounts, fake percentages, demo names like 'Артём', hardcoded trends).
  - Traceability: does each metric compute dynamically from real database/storage arrays or is it partially mocked?
  - Catalog all remaining mock dependencies in a clear Analytics Health Matrix.

## Acceptance Criteria

### Verification & Evidence
- [ ] Complete AUD-001..AUD-015 status register delivered with FIXED / PARTIAL / OPEN and specific code line references.
- [ ] Backup recovery drill completed: checksum verification passed, SQL syntax checked, localStorage JSON keys verified.
- [ ] Live Supabase DB audit delivered: enum presence confirmed, RLS status documented, orphan and duplicate counts reported.
- [ ] SSOT architecture status documented: clear classification of Supabase-backed vs LocalStorage-backed domain entities.
- [ ] E2E workflow 1 (Lead → Student → Group → Lesson → Billing) traced and validated with step-by-step state verification.
- [ ] E2E workflow 2 (Payment → Balance → Renewal) traced and validated with step-by-step state verification.
- [ ] Full Analytics Reality Check completed across all 7 tabs (Diagnostics, Sales, Retention, Finance, Groups, Teachers, Reports) with every metric classified as Real, Computed, or Mocked.
- [ ] Zero unauthorized production source modifications: git status confirms READ-ONLY adherence during the verification audit.

## 2026-10-05T04:43:00Z

Execute Phase 6 Production Hardening & Real Data Analytics on the Smart Academy CRM / YouEurope CRM. Remediate all confirmed P0 defects (LessonModal state clobbering, drawer cancellation rollback omission, group status sync regression), resolve P1 security/SSOT issues (RLS policies, ghost attendance cleanup, currency standardization to EUR, calendar schedule collision detection), purge all mock/synthetic data from all 7 analytics tabs and replace with real entity calculations or honest empty states, and establish comprehensive regression and E2E test suites ensuring zero regression.

Working directory: /Users/andreysumenkov/Documents/crm test antigravity
Integrity mode: development

## Requirements

### R1. Safety Gate & Git Branching (Phase 6.0)
- Verify `backup/2026-10-05/` exists and is intact (no destructive actions).
- Create and switch to git branch `fix/phase-6-production-hardening`.

### R2. Core P0 Defects Remediation (Phase 6.1 – 6.3)
- **P0 #1: LessonModal Billing State Preservation (`src/components/calendar/LessonModal.tsx:521-553`)**:
  - Fix modal save architecture so updating lesson fields (topic, notes, classroom) never overwrites or wipes out `billedStudentIds` or `billingDetails`.
  - Ensure unified storage update mechanism preserves fresh billing state from storage.
- **P0 #2: Unified Lesson Cancellation Rollback (`LessonDetailsDrawer.tsx`, `LessonModal.tsx`)**:
  - Establish a single source of truth for transitioning lessons to `cancelled`.
  - Ensure every UI entry point (lesson details page, drawer, modal, quick actions) invokes `restoreLessonBilling(lesson.id)` when cancelling a conducted/billed lesson, refunding subscriptions (+1 remaining, -1 attended) and deposit balances.
  - Block cancellation or deletion transitions that would bypass financial rollback.
- **P0 #3: Group Status Sync Canonicalization (`src/app/api/sync/route.ts:440`)**:
  - Add `'finished'` and `'paused'` to `validStatuses` in `/api/sync/route.ts`.
  - Harmonize group statuses across TypeScript types, Postgres enums, sync routes, UI selects, badges, and filters (`recruiting`, `active`, `paused`, `finished`, `archived`).

### R3. P1 Security, Data Integrity & SSOT (Phase 6.4 – 6.7, 6.11)
- **RLS & Security (6.4)**:
  - Enable Row Level Security on `public.lesson_attendance`.
  - Ensure RLS policies on `lessons`, `attendance`, and `lesson_attendance` include `'developer'` along with `'owner'`, `'admin'`, `'teacher'`.
- **Ghost Attendance References Cleanup (6.5)**:
  - Audit and clean up 29 mock attendance records referencing non-existent student IDs `s5`..`s21`.
- **SSOT Resolution (6.6)**:
  - Document and unify storage models for Invoices (`crm_invoices_v1`), Churn Events (`crm_churn_events_v1`), and Settings (`crm_school_settings_v1`), ensuring persistent consistency.
- **Currency Standardization to EUR (6.7)**:
  - Replace stray Russian Ruble (`₽`, `руб`) symbols and hardcoded `1050 ₽` fallbacks across runtime UI, lesson billing, notifications, and analytics with canonical EUR (`€`).
- **Schedule Collision Validation (6.11)**:
  - Implement cross-group collision detection in calendar and group schedule builders:
    - A teacher cannot have two overlapping conducted lessons.
    - A classroom cannot host two overlapping lessons.
    - A group cannot have overlapping lessons.

### R4. Complete Mock Purge & Real Data Analytics (Phase 6.8 – 6.9)
- Enforce the **Canonical Analytics Rule**: every metric must derive from existing database/storage records or render an honest empty state. Zero hardcoded business metrics, fake demo names, or synthetic fallbacks.
- **6.8.1 Diagnostics**: Remove fake historical funnel scaling and demo student names (`Иван Петров`, etc.). Render real data or clean empty state.
- **6.8.2 Sales**: Remove static 2026-09 arrays and hardcoded response times. Build metrics from real Leads, Payments, and Timeline interactions.
- **6.8.3 Retention**: Remove hardcoded M0–M5 cohort matrix, fake sparklines, static atRiskList, and hardcoded `81%, +5 pp`. Compute retention cohorts and risk lists dynamically from real student enrollments and attendance records.
- **6.8.4 Finance**: Remove hardcoded `debtsSummary` (8 640 € debt, 3 120 € overdue, 27 debtors) and static monthly accruals. Aggregate debts dynamically from actual overdue/expected payments and active subscriptions.
- **6.8.5 Groups**: Replace ~90% mock data with real group rosters, capacities, and course-specific distributions.
- **6.8.6 Teachers**: Replace 100% mock hook with real facts: active teachers, conducted lessons, schedule completion, reschedules, and cancellations.
- **6.8.7 Reports**: Replace 100% mock reports with real queries over Tasks, Leads, Payments, and Activity.

### R5. Accessibility & Modal Quality (Phase 6.10)
- Update `ConvertLeadModal`, `EnrollStudentFromLeadModal`, and `LessonModal` to conform to WCAG 2.1 AA: `role="dialog"`, `aria-modal="true"`, focus trap, and Escape key dismissal.

### R6. Automated Regression & E2E Test Suite (Phase 6.12 – 6.15)
- Author regression tests TS-16 through TS-26:
  - TS-16: LessonModal preserves billing state on edit.
  - TS-17: Cancellation always triggers billing rollback across all UI surfaces (page, drawer, modal).
  - TS-18: Group status sync preserves `'finished'` and `'paused'`.
  - TS-19: RLS policies and role verification for `lesson_attendance`.
  - TS-20: Ghost attendance references cleaned without breaking referential integrity.
  - TS-21: Currency standardization (all billing and analytics in EUR).
  - TS-22: Analytics reality: zero mock fallbacks across all 7 tabs.
  - TS-23: Cross-group teacher collision detection.
  - TS-24: Cross-group room collision detection.
  - TS-25: Modal accessibility & focus management.
  - TS-26: End-to-end integration flows (Lead→Student→Group→Lesson→Attendance→Billing→Cancel Rollback).
- Run and pass pre-flight checks: `npm run check` (0 errors), `npm test` (all tests pass), `npm run build` (all routes compile).
- Generate final delivery report `docs/audit/PHASE_6_FINAL.md`.

## Acceptance Criteria

### Critical Bugs & Security
- [ ] Saving `LessonModal` retains `billedStudentIds` and `billingDetails` without data loss.
- [ ] Cancelling a conducted lesson from `LessonDetailsDrawer` or `LessonModal` restores subscription lessons and deposit balance.
- [ ] Group sync `/api/sync/route.ts` preserves `'finished'` and `'paused'` statuses without resetting to `'active'`.
- [ ] `public.lesson_attendance` has RLS enabled with access granted to `'developer'`, `'owner'`, `'admin'`, `'teacher'`.
- [ ] Ghost attendance records referencing non-existent student IDs `s5`..`s21` are cleaned up.
- [ ] Calendar schedule builder detects and blocks teacher, room, and group overlaps.
- [ ] Runtime UI and lesson billing are completely free of stray `₽` symbols.

### Analytics Realism
- [ ] Zero mock data or static fallback arrays in Diagnostics, Sales, Retention, Finance, Groups, Teachers, and Reports tabs.
- [ ] Diagnostics renders real students or honest empty state when risk count is low.
- [ ] Retention cohort matrix is computed dynamically from real student start dates and attendance.
- [ ] Finance debt summary reflects actual unpaid and overdue payments.
- [ ] Teachers tab reflects actual conducted lessons and hours from storage.
- [ ] Modals support `role="dialog"`, `aria-modal="true"`, focus trap, and Escape dismissal.

### Test Coverage & Build Integrity
- [ ] Automated regression test suite (TS-01 through TS-26) passes 100%.
- [ ] `npm run check` passes with 0 TypeScript errors.
- [ ] `npm run build` compiles all routes cleanly.
- [ ] `docs/audit/PHASE_6_FINAL.md` delivered summarizing all resolved items.

## 2026-10-05T09:46:46Z

# PHASE 8 — SETTINGS & ADMINISTRATION REFACTOR

Refactor the **Settings & Administration** section (`/settings`, `/admin/courses`, `/settings/team`, `/settings/import`, `/settings/backup`) for **You Europe / Smart Academy CRM** into a clean, online-only school configuration cockpit without introducing new entities or breaking existing business logic.

Working directory: /Users/andreysumenkov/Documents/crm test antigravity
Branch: refactor/phase-8-settings-administration
Integrity mode: development

---

## Core Business Principles & Constraints

1. **Online-Only School**: The school operates 100% online. Do NOT create offline classrooms, rooms, branches, physical addresses, or hybrid formats.
2. **Two Learning Formats**: Strictly `Group` (Групповое) and `Individual` (Индивидуальное).
3. **Calculated Pricing Principle**: Price per lesson is strictly derived dynamically (`packagePrice / lessonsCount`). Never store or require manual entry of an independent `lessonPrice` field if a package is defined.
4. **Trial Lesson Model**: Reuse existing trial mechanics without introducing a duplicate `Trial` entity.
5. **Zero New Entities (SSOT)**: Strictly work with existing schemas and storage (`schoolSettingsStorage`, `courseStorage`, `groupStorage`, `subscriptionStorage`, `paymentStorage`, `roleContext`).
6. **Currency**: Primary currency strictly EUR (`€`).
7. **Canonical Navigation**: Eliminate duplicate active states between `/settings`, `/admin/courses`, `/settings/team`, `/settings/import`, `/settings/backup`.

---

## Requirements

### R1. Settings Hub & Overview Screen (`/settings`)
- Replace the legacy two-giant-hero layout with a clean Settings Hub.
- **Top 4 Category Cards**:
  1. 🏫 **Профиль школы** (Name, contacts, working hours 09:00–21:00, EUR currency, SEPA / Faktura banking details) → CTA: *Изменить данные →*
  2. 📚 **Курсы и направления** (Educational directions, formats, duration, capacity, tariffs) → CTA: *Настроить программы →*
  3. 👥 **Команда и доступ** (Staff, roles, permissions, security) → CTA: *Управление доступом →*
  4. 🔌 **Интеграции** (Telegram bot, Webhooks, Google Sheets sync) → CTA: *Настроить интеграции →*
- **Separate Administration Section (Администрирование данных)**:
  - 📥 **Импорт Excel** (Import & deduplication)
  - 💾 **Резервное копирование** (Export & backup snapshots)

### R2. School Profile & Banking Details
- Basic Info: School name (*You Europe*), description.
- Contacts: Official phone and email.
- Format: Fixed badge / read-only indicator **«Онлайн-школа»**.
- Operating Hours: 09:00–21:00 (Mon–Sat) used by calendar (distinct from teacher availability).
- Currency: **EUR (€)** read-only system badge.
- Bank Details for Faktura: Account holder, Bank name, IBAN, SWIFT/BIC, Next invoice number, VAT note.

### R3. Courses & Directions Registry (`/admin/courses`)
- Compact Registry Table for 20–30 directions:
  - Columns: Направление, Формат (Группа / Индивидуально), Возраст (7–14, 14+), Длительность (45/60/90/120 мин), Вместимость (число для групп, «—» для инд.), Тарифы (кол-во), Статус (Активно / В архиве).
- Direction Drawer / Modal:
  - Format selection (Group vs Individual). Capacity field disabled/hidden when Individual is selected.
  - Trial toggle: *Пробное занятие доступно*.
  - Tariffs table: Lessons count, Package price (€), Auto-calculated price per lesson (`price / count` €/зан.), Status.

### R4. Team & Access Control (`/settings/team`)
- Single canonical route for Team & Permissions.
- Roles overview: Owner (System-protected superuser badge, non-revokable critical permissions), Admin, Teacher.
- Separation of Access Permissions vs Database Security / RLS policies.

### R5. Telegram & External Integrations
- Integration status card: 🟢 Подключён / 🟠 Не настроен / 🔴 Ошибка.
- Secure token handling: token masked as `••••••••` with an "Изменить токен" modal.
- Webhook status, connection test button, admin & owner Chat IDs, notifications toggles.
- Google Sheets export / sync status.

### R6. Administrative Tools (Import & Backup)
- `/settings/import`: Preserve 4-step wizard (Upload, Mapping, Deduplication/Preview, Finish). Rename sample download button to **«Скачать шаблон Excel»**.
- `/settings/backup`: Display last successful backup timestamp, active status, manual export trigger.

---

## Acceptance Criteria

### Navigation & Layout
- [ ] `/settings` displays the 4 core settings cards + compact Administration section without double-active sidebar states.
- [ ] Responsive layout verified at 1440×900 and 1280×800 without horizontal overflow.

### School Profile & Currency
- [ ] School format is displayed as online-only with no physical classroom/branch fields.
- [ ] All financial values and invoices strictly use EUR (€).

### Courses & Tariffs
- [ ] Courses table supports Group and Individual formats with capacity logic ('—' for Individual).
- [ ] Tariff table calculates lesson price dynamically as `packagePrice / lessonsCount`. No manual lesson price input.
- [ ] Trial lesson status is configured without creating a duplicate Trial entity.

### Security & Integrations
- [ ] Owner role is protected from accidental permission revocation.
- [ ] Telegram bot token is masked with `••••••••` and webhook check action is interactive.

### Verification & Build
- [ ] `npm run check` (TypeScript compilation) passes with 0 errors.
- [ ] `npm test` passes all automated regression test suites.
- [ ] `npm run build` succeeds without build warnings or static page generation errors.

## 2026-10-05T11:25:34Z

# PHASE 8 — SETTINGS & ADMINISTRATION UI REFACTOR (WITH 7+ VISUAL REFERENCES)

Refactor the **Settings & Administration** section (`/settings`, `/settings/profile`, `/admin/courses`, `/settings/team`, `/settings/integrations`, `/settings/import`, `/settings/backup`) for **You Europe / Smart Academy CRM** into a complete, pixel-aligned online-school configuration cockpit strictly matching the **full suite of 7+ visual reference designs** while preserving existing SSOT storage, APIs, and business rules.

Working directory: /Users/andreysumenkov/Documents/crm test antigravity
Branch: refactor/phase-8-settings-administration
Integrity mode: development

---

## Detailed Screen Specifications from References

### 1. Главная страница «Настройки школы» (`/settings`) — Ref media_1791199183481.jpg
- Breadcrumbs: `Настройки школы`
- Title: **Настройки школы** | Subtitle: *Параметры организации, обучения, команды, доступа и интеграций*
- Top 4 Category Cards:
  1. 🏫 **Профиль школы** (Название, контакты, рабочие часы, валюта и банковские реквизиты) → `href="/settings/profile"`
  2. 📚 **Курсы и направления** (Направления, форматы, длительность, возраст и тарифы) → `href="/admin/courses"`
  3. 👥 **Команда и доступ** (Сотрудники, роли, права доступа и безопасность) → `href="/settings/team"`
  4. 🔌 **Интеграции** (Telegram-бот, уведомления и внешние сервисы) → `href="/settings/integrations"`
- Separate Administration Section: **Административные инструменты**
  - 📥 **Импорт Excel** (Загрузка и обновление базы данных, дедупликация) → `href="/settings/import"`
  - 💾 **Резервное копирование** (Экспорт и автоматическое резервное копирование) → `href="/settings/backup"`

---

### 2. Профиль школы (`/settings/profile`) — Ref media_1791199404706.png
- Breadcrumbs: `← Настройки школы > Профиль школы` | Actions: `✓ Сохранить изменения`, `•••`
- Header: **Профиль школы** | Subtitle: *Основная информация об организации, контакты, формат обучения, рабочие часы и банковские реквизиты*
- Tabs: `Основная информация`, `Контакты`, `Онлайн-формат`, `Рабочие часы`, `Банковские реквизиты`
- Main Grid (Left 2/3):
  - **Основная информация**: Название школы (*You Europe*), Слоган/краткое описание (*Центр европейского образования и подготовки*), Полное описание (*Онлайн-школа по подготовке к поступлению в вузы Германии и Австрии...*), Логотип школы с рамкой и кнопкой *Заменить логотип (PNG, JPG или SVG до 2 МБ)*.
  - **Контакты**: Телефон (`+7 981 715-53-37`), Электронная почта (`info@youeurope.eu`).
  - **Формат обучения**: Read-only поле с замком `Онлайн-школа` (*Школа работает только в онлайн-формате*), Онлайн-платформа `Zoom` (*Используется для проведения групповых и индивидуальных занятий*).
  - **Рабочие часы**: Интерактивные пилюли дней недели (`Пн`, `Вт`, `Ср`, `Чт`, `Пт`, `Сб`, `Вс`), Время работы `09:00` – `21:00` (*Эти часы используются в календаре при создании и переносе занятий*).
  - **Банковские реквизиты** (бейдж `EUR / SEPA`): Владелец счёта (*Ekaterina Nezherkina*), Наименование банка (*Tatra banka, a.s.*), IBAN (`SK34 1100 0000 0029 3766 3128`), SWIFT/BIC (`TATRSKBX`), Следующий номер счёта Faktura (`20260342`), Статус НДС (*Nicht umsatzsteuerpflichtig / Neplátiteľ DPH*).
- Right Sidebar Widgets (1/3):
  - **Статус школы**: 🟢 *Активна* (Школа работает и доступна для учеников).
  - **Основная валюта**: `EUR (€)` (Используется для цен, платежей и счетов).
  - **Статистика**: 3 колонки (`4` сотрудника, `6` направлений, `18` активных учеников).
  - **Быстрые действия**: *Открыть страницу школы >*, *Скопировать данные >*, *Скачать реквизиты (PDF) >*.

---

### 3. Курсы и направления (`/admin/courses`) — Ref media_1791199404731.png
- Breadcrumbs: `← Настройки школы > Курсы и направления` | Action: `+ Добавить направление`
- Header: **Курсы и направления** | Subtitle: *Управление учебными программами, параметрами обучения и тарифами*
- Top 4 Summary Cards:
  - `Всего направлений`: **6** (*+1 с прошлого месяца*)
  - `Групповые`: **4** (*67% от всех*)
  - `Индивидуальные`: **2** (*33% от всех*)
  - `Пробные занятия`: **Доступны** (*0 € по умолчанию*)
- Filter Bar: Поиск по названию, Фильтр формата (`Все`, `Группа`, `Индивидуально`), Фильтр статуса (`Все`, `Активен`, `Неактивен`), Кнопка сброса/обновления `↻`, Переключатель `[Таблица]` / `[Карточки]`.
- Table Columns: Чекбокс, Название, Формат (`Группа` / `Индивидуально`), Возраст, Длительность, Вместимость (`8` / `—`), Тарифы (`3`), Пробное занятие (`🔘 Доступно 0 €`), Статус (`🟢 Активен` / `🔴 Неактивен`), `•••`.
- Right-Side Drawer (`CourseDirectionDrawer.tsx`):
  - Header: **Немецкий** [🟢 Активен], кнопка `✕`.
  - Tabs: **Основное**, **Тарифы (3)**, **Пробное занятие**, **Группы (4)**.
  - Section 1 (Основное): Название, Описание, Возраст учеников (`14+ лет`), Формат (`Группа` / `Индивидуально` с авто-отключением поля вместимости), Длительность (`90 минут`), Максимальная вместимость группы (`8`).
  - Section 2 (Пробное занятие): Тумблер *Доступно пробное занятие*, Стоимость (`0 €`).
  - Section 3 (Дополнительные параметры): Чекбоксы *Показывать направление при записи на сайте*, *Использовать в календаре*, *Учитывать в аналитике*, *Архивировать направление*.
  - Footer: Кнопка `Удалить направление` (danger), `Отмена`, `Сохранить изменения` (primary blue).
  - Dynamic Pricing in Tariffs Tab: `packagePrice / lessonsCount` read-only calculation (€/зан.).

---

### 4. Команда и доступ (`/settings/team`) — Ref media_1791199183547.png
- Breadcrumbs: `← Настройки школы > Команда и доступ` | CTA: `+ Добавить сотрудника`
- Top KPI Cards: `Всего сотрудников` (4), `Преподаватели` (2), `Администраторы` (1), `Владелец` (1).
- Tabs: **Сотрудники**, **Роли и права**, **Безопасность**.
- Filters: Поиск, Роль, Статус, Вид (Таблица / Карточки).
- Staff Table: Аватар, Сотрудник, Роль, Учебная нагрузка / Задачи, Контакты, Статус, Кнопка `Карточка`.
- Right-Side Employee Drawer:
  - Header: Аватар, Имя, Бейдж роли, Статус.
  - Tabs: **Основное**, **Роли и права**, **Расписание**, **История**.
  - Sections: Личные данные, Роль и доступ (Бейдж «Системная роль» для Owner), Учебная нагрузка, Дополнительная информация (2FA тумблер, Дата добавления, Последний вход), Кнопки `Деактивировать`, `Сбросить пароль`, `Сохранить изменения`.

---

### 5. Роли и права (`/settings/team?tab=roles` or `/settings/roles`) — Ref media_1791199183510.png
- Header: **Роли и права** | Subtitle: *Управление ролями и доступом сотрудников к разделам системы* | CTA: `+ Добавить роль`
- Top Role Summary Cards: Владелец (Owner) [1], Администратор [2], Преподаватель [2], Просмотр [0].
- Permissions Matrix Table: Ученики и обучение, Продажи, Финансы, Настройки, Администрирование.
- Right-Side Role Drawer: Название, Описание, Цвет и иконка, Права доступа (аккордеоны по разделам "X из Y"), Список сотрудников с этой ролью, защита роли Owner (удаление заблокировано).

---

### 6. Telegram-бот (`/settings/integrations` or `/settings/integrations/telegram`) — Ref media_1791199183568.png
- Breadcrumbs: `← Настройки школы > Интеграции > Telegram-бот`
- Status Card: 🟢 **Подключён** (*Telegram-бот подключён и работает*, Последняя проверка, *Проверить соединение*, *Отключить*).
- Tabs: **Основные настройки**, **Уведомления**, **Каналы и получатели**, **Тестирование**.
- Left Panels: Данные бота (Masked Token `••••••••••••`, *Изменить токен*, Webhook URL, *Переустановить webhook*, Chat ID администратора, Chat ID руководителя), Онлайн-команды (`/start`, `/trial`, `/schedule`, `/profile`, `/cancel`, `/help`).
- Right Panels: Информация о боте (`@youeurope_school_bot`), Статус сервисов (API, Webhook, Отправка сообщений), Тестирование (*Отправить тестовое сообщение*, *Открыть чат с ботом*).

---

### 7. Импорт Excel (`/settings/import`) — Ref media_1791199183621.png
- Breadcrumbs: `← Настройки школы > Импорт Excel`
- 4-Step Wizard Header: `1. Загрузка файла` → `2. Соответствие полей` → `3. Проверка данных` → `4. Импорт`.
- Main Left Panel:
  - Large Dropzone: *Выберите Excel-файл для импорта (.xlsx, .xls до 10 МБ)*.
  - Button: **«Скачать шаблон Excel»** (*Готовый шаблон с примерами и описанием полей*).
  - Требования к файлу и «Что можно импортировать».
  - Live Preview Table: Предпросмотр данных (Строка, Имя, Фамилия, Email, Телефон, Тип, Статус [Новый, Обновление, Дубликат]).
- Right Sidebars: **История импортов**, **Инструкция (1–4)**, **Важно** (линк на `/settings/backup`).

---

## Acceptance Criteria
- [ ] All screens visually and functionally match the 7+ reference designs.
- [ ] School is 100% online (no physical classrooms/branches).
- [ ] Dynamic calculated lesson pricing (`packagePrice / lessonsCount`).
- [ ] Protected Owner superuser role in UI and API (`DELETE /api/auth/users` HTTP 403).
- [ ] Masked Telegram token (`••••••••`).
- [ ] `npm run check` passes with 0 TypeScript errors.
- [ ] `npm test` passes 100% of test suites.
- [ ] `npm run build` succeeds cleanly.




## 2026-10-05T14:25:11Z

# PHASE 9 — TEACHER LESSON CREATION & APPROVAL WORKFLOW (WITH VISUAL REFERENCE)

Implement the **Teacher Lesson Creation & Approval Workflow** in the Calendar module (`/calendar`, `LessonModal.tsx`, `LessonDetailsDrawer.tsx`, `lessonStorage.ts`, `collisionHelper.ts`) for **You Europe / Smart Academy CRM**, strictly matching the visual reference design (`media_1791210072516.jpg`), enabling teachers to create group and individual lessons pending admin/owner approval with comprehensive collision and schedule guards.

Working directory: /Users/andreysumenkov/Documents/crm test antigravity
Branch: feature/phase-9-teacher-lesson-approval
Integrity mode: development

---

## Core Invariants & Reference Breakdown (`media_1791210072516.jpg`)

1. **Calendar Screen**:
   - Operating hours pill indicator: `Сетка: 09:00 – 21:00`.
   - Teacher filters (`Все учителя`, specific teachers).
   - Click/hover on open calendar slot auto-fills date, time, and current teacher into the modal.
   - Pending lessons appear with a distinct yellow/amber badge and border (`🟡 На подтверждении`).
2. **Dynamic Lesson Modal (`LessonModal.tsx`)**:
   - **Type Switcher Tabs**: `👥 Групповое занятие` vs `👤 Индивидуальное занятие`.
   - **Group Flow**: Group selector dropdown (`Учебная группа *`), group info preview card (*German B1 • 8 учеников, 14–16 лет, 75 мин*), link `Посмотреть учеников (8)`.
   - **Individual Flow**: Student searchable input (`Ученик *`) with live search dropdown showing avatars, student name, course, and status (e.g., *Дарья Соловьева German B1 • Активный ученик*).
   - **Teacher Field**: Automatically set to current user (read-only for Teacher role: *Мария Иванова (текущий пользователь)*; selectable for Admin/Owner).
   - **Date & Time Row**: Date picker, Start time, End time auto-calculated by course/group duration with helper text: *Длительность: 75 минут (по выбранному направлению)*.
   - **Online Zoom Link**: Auto-populated teacher Zoom URL with copy button.
   - **Lesson Content**: Topic (`Тема занятия`) and Homework (`Домашнее задание`).
   - **Notifications & Options**: `☑ Отправить уведомление ученикам и родителям в Telegram`, `☑ Отметить как пробное занятие`.
   - **Dynamic CTA Button**: For Teacher: `Отправить на подтверждение` (blue button); for Admin/Owner: `Создать занятие` / `Сохранить`.
3. **Collision Warning Modal / Inline Dialog («Время занято»)**:
   - Header: ⚠️ **Время занято** (*Невозможно создать занятие в выбранное время*).
   - Conflict categorization tabs/badges: `Конфликт преподавателя` | `Конфликт группы` | `Конфликт ученика`.
   - Details: Conflicting teacher/group/student name, existing booked time (e.g. *16:00 – 17:15*), and status.
   - Alternative time suggestions: e.g., *Ближайшее свободное время: 17:15 – 18:30, 18:30 – 19:45, 20:00 – 21:00* (within school 09:00–21:00 window).
   - Action: Button `Выбрать время 17:15` auto-updates start/end times in modal.
4. **Success State Modal («Занятие создано»)**:
   - Header: 🟢 **Занятие создано** (*Занятие отправлено на подтверждение*).
   - Summary card: Group/student, Date, Time, Teacher, Status: 🟡 **На подтверждении**.
   - Helper notice: *Администратор или руководитель проверит занятие и подтвердит его. Вы получите уведомление в Telegram.*
   - Buttons: `+ Создать ещё одно занятие`, `Закрыть`.
5. **Admin Approval / Rejection Drawer (`LessonDetailsDrawer.tsx`)**:
   - Status badge: 🟡 **На подтверждении**.
   - Details card: Course/Group/Student, Date & Time, Teacher, Zoom link, Topic, Homework.
   - Admin action buttons:
     - 🟢 **Подтвердить** → transitions lesson to `planned`/`confirmed`, notifying the teacher.
     - 🔴 **Отклонить** → prompts for rejection reason/comment, marks lesson `rejected`/`cancelled`, notifying the teacher.
     - ✏️ **Изменить** → allows admin to adjust time/teacher before approving.
6. **Notifications Dropdown / Activity Stream**:
   - Shows real notifications for approval events (*Нужно подтвердить занятие*, *Занятие подтверждено*, *Занятие отклонено*).

---

## Strict Business Rules

1. **Zero New Entities**: Use existing `Lesson` model and extend existing state machine/fields (`status: "pending" | "planned" | "conducted" | "cancelled"`, `rejectionReason?: string`, `isIndividual?: boolean`, `studentId?: string`). Do NOT create new tables `TeacherLessonRequest` or `LessonApproval`.
2. **Pending Slot Reservation**: Lessons in `pending` status occupy calendar time and block double-booking for the teacher, group, and student.
3. **Three-Way Collision Detection (`src/lib/data/collisionHelper.ts`)**:
   - **School Hours Guard**: Must fit inside school operating hours (09:00–21:00).
   - **Teacher Collision Guard**: Teacher cannot have overlapping lessons.
   - **Group Collision Guard** (for Group lessons): Group cannot have overlapping lessons.
   - **Student Collision Guard** (for Individual lessons): Student cannot have overlapping lessons.
   - **Mutation-Level Protection**: Validation must run both in frontend modal and in storage/API layer (`saveLessonToStorage` / `/api/lessons`).
4. **No Premature Billing**: Creating a lesson (whether pending, planned, or confirmed) NEVER debits lessons from subscription packages or student deposits. Billing strictly occurs upon lesson completion/attendance marking (`conducted`).
5. **Trial Lesson Handling**: Flagging a lesson as trial respects existing trial mechanics without debiting paid subscriptions.
6. **Role Impersonation Protection**: Teacher accounts can only create lessons for themselves (`teacherId` locked to current user). Only Admin/Owner can select other teachers.

---

## Acceptance Criteria

### Teacher Workflow
- [ ] Teacher opens Calendar and clicks `+ Добавить занятие` or an open time slot; date, time, and teacher are pre-filled.
- [ ] Teacher selects between `Групповое занятие` and `Индивидуальное занятие`.
- [ ] Individual mode provides live search over students with course/status details.
- [ ] Collision detection triggers if teacher, group, or student has an overlapping lesson, displaying a clear conflict dialog with nearest free slot suggestion.
- [ ] Teacher cannot create lessons outside school hours (09:00–21:00).
- [ ] Teacher cannot create a lesson for another teacher.
- [ ] Submit button reads `Отправить на подтверждение` and creates a lesson in `pending` status.
- [ ] Created pending lesson is visible on the calendar with amber/yellow status badge (`🟡 На подтверждении`).

### Admin / Owner Workflow
- [ ] Admin/Owner sees pending lessons on the calendar and in notifications.
- [ ] Opening a pending lesson displays `Подтвердить`, `Отклонить`, `Изменить`.
- [ ] `Подтвердить` transitions status to `planned`/`confirmed`.
- [ ] `Отклонить` prompts for a reason and updates status with notification.

### Billing & Safety Invariants
- [ ] No lesson balance or deposit is deducted upon lesson creation or approval.
- [ ] `npm run check` passes with 0 errors.
- [ ] `npm test` passes all automated tests.
- [ ] `npm run build` compiles cleanly.
