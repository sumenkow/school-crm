# 📌 CRM Project Status & Progress Tracker

> **Инструкция для AI-агентов (Antigravity / Claude Code / Cursor):**
> Перед началом любой задачи прочитайте этот файл, чтобы мгновенно войти в контекст и не тратить токены на полное сканирование проекта. После выполнения важной задачи обновите соответствующий раздел.

---

## 🏗️ Стек технологий
- **Framework:** Next.js 16.3.4 (App Router)
- **UI & Components:** React 19, Tailwind CSS v4, Lucide React
- **Backend / Database:** Supabase (PostgreSQL) + LocalStorage fallback
- **Схема БД:** `docs/schema.md` (7 таблиц: `students`, `parents`, `groups`, `lessons`, `attendance`, `leads`, `courses`)
- **Архитектурный контракт:** `AGENTS.md` (Zero New Entities, Mock Data Ban, раздельная Desktop/Mobile верстка)

---

## 🚀 Текущее состояние модулей

| Модуль | Маршрут | Ключевые компоненты | Статус |
|---|---|---|---|
| **CRM / Воронка** | `/crm` | `src/app/crm/page.tsx`, `LeadCard.tsx`, `LeadDetailsModal.tsx`, `ConvertLeadModal.tsx` | ✅ 7 этапов, Drag & Drop, Drawer, Таблица |
| **Ученики** | `/students` | `src/app/students/page.tsx`, `StudentDrawer.tsx`, `BulkActions.tsx` | ✅ Таблица, баланс, фильтры, история |
| **Группы** | `/groups` | `src/app/groups/page.tsx`, `GroupCard.tsx`, `CreateGroupModal.tsx` | ✅ Каталог, расчет ближайшего урока, загрузка |
| **Календарь** | `/calendar` | `src/app/calendar/page.tsx`, `DesktopLessonModal.tsx`, `LessonBottomSheet.tsx` | ✅ Сетка, Desktop/Mobile модалки, посещаемость |
| **Дашборд** | `/dashboard` | `DashboardDesktop.tsx`, `DashboardMobile.tsx` | ✅ KPI, срочные задачи, платежи, быстрые действия |
| **Финансы** | `/finance` | `src/app/finance/page.tsx`, `currencyHelper.ts` | ✅ Балансы, EUR/RUB, мультивалютность |
| **Родители** | `/parents` | `src/app/parents/page.tsx`, `ParentCard.tsx` | ✅ Семейные связи, контакты |
| **Настройки** | `/settings` | `src/app/settings/page.tsx` | ✅ Курсы, роли, интеграции |

---

## 🎯 Ближайшие задачи в бэклоге (Next Up)
1. **[P0] Финансы:** Устранить race condition в `studentStorage.ts` (добавить `reconciliationQueue` при списании депозитов).
2. **[P1] Оптимизация CRM:** Мемоизировать расчет сумм воронки в `src/app/crm/page.tsx` по `lead.id`.
3. **[P1] Курсы валют:** Сохранять фиксированный `exchangeRate` в объекте платежа на момент совершения транзакции.
4. **[P2] Воронка:** Добавить Bulk actions (массовые действия с чекбоксами) в воронку лидов.
5. **[P2] Аналитика:** Визуальный график конверсии между 7 этапами в `/analytics`.

---

## 🛠️ Полезные команды
- `npm run check` — быстрая проверка TypeScript типов без запуска билда (0 ошибок).
- `npm run build` — полная проверка сборки Next.js.
- `npm run dev` — запуск локального сервера разработки.
