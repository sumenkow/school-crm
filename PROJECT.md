# Project: Telegram Bot Supabase Persistence & Multi-Device Reliability

## Architecture
- Centralized Database Store: Supabase `system_settings` table (`key TEXT PRIMARY KEY, value JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`)
- Key: `'telegram_bot_settings'` containing:
  - `botToken` (string, masked in client GET response as `••••••••` if present)
  - `adminChatId` (string)
  - `ownerChatId` (string)
  - `botUsername` (string, default: `youeuropeservicebot`)
  - `webhookUrl` (string, default: `https://crm.youeurope.ru/api/telegram/webhook`)
  - `notificationsEnabled` (boolean, default: `true`)
  - `isConfigured` (boolean, derived)
- Server Backend API:
  - `GET /api/telegram/settings`: reads settings from Supabase via `createAdminClient()`. Returns JSON with status, username `@youeuropeservicebot`, chat IDs, webhookUrl, and masked token `••••••••` (or raw token to authorized admin/server callers if requested).
  - `POST /api/telegram/settings`: atomic upsert into `system_settings` via `createAdminClient()`. Validates input, preserves existing token if masked `••••••••` is passed back.
  - Server helper `getTelegramSettingsServer()` in `src/lib/telegram/settings.ts`: reusable direct database fetcher for server routes.
- Server Routes Fallback:
  - `/api/telegram/send`, `/api/telegram/setup`, `/api/telegram/webhook`, `/api/telegram/notify`: use `getTelegramSettingsServer()` when request body / params lack custom credentials, eliminating dependency on client `localStorage`.
- Client Frontend Components:
  - `TelegramSettingsModal.tsx`, `/settings/integrations/page.tsx`, `TelegramChatBox.tsx`, `TelegramConnectModal.tsx`: fetch settings from `/api/telegram/settings` on mount; persist atomically on save via `POST /api/telegram/settings`; fallback gracefully to `localStorage` cache; display `@youeuropeservicebot`, status `🟢 Подключён`, and masked token.
- Automated QA Persistence Suite:
  - `tests/telegram_bot_supabase_persistence.test.ts` integrated into `tests/run_all_tests.ts` (Suite 16).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Root Cause Documentation | Formal RCA document detailing localStorage isolation and server route dependency | M1 | Survey / RCA |
| 2 | Supabase Migration `system_settings` | `supabase/migrations/20261005002000_system_settings.sql` with table, RLS, trigger, and default seed | M2 | R2 |
| 3 | Server Helper & API `/api/telegram/settings` | Server helper `src/lib/telegram/settings.ts` and `GET/POST /api/telegram/settings/route.ts` with masking and atomic upsert | M2 | R2 |
| 4 | Server Routes Supabase Integration | `/api/telegram/send`, `/api/telegram/setup`, `/api/telegram/webhook`, `/api/telegram/notify` querying Supabase via `getTelegramSettingsServer()` | M3 | R2, R3 |
| 5 | Client Modals & Integrations UI Update | `TelegramSettingsModal`, `/settings/integrations`, `TelegramChatBox`, `TelegramConnectModal` fetching from API, saving to API, displaying `@youeuropeservicebot` & `🟢 Подключён` | M4 | R2, R3 |
| 6 | Automated QA Persistence Suite | `tests/telegram_bot_supabase_persistence.test.ts` covering 4 mandatory tests, wired into `tests/run_all_tests.ts` | M5 | R4 |
| 7 | Full Regression & Build Verification | All 16 test suites pass (`npm test`), `npm run check` (0 errors), `npm run build` (33+ routes clean), git commit & push | M6 | Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Root Cause Analysis Documentation | Finalize formal RCA in documentation | none | DONE |
| 2 | Supabase Schema & Settings API | Migration SQL + `src/lib/telegram/settings.ts` + `/api/telegram/settings/route.ts` | M1 | IN_PROGRESS |
| 3 | Server Routes DB Fallback | Update `/api/telegram/send`, `/setup`, `/webhook`, `/notify` | M2 | PLANNED |
| 4 | Client UI Components Migration | Update `TelegramSettingsModal`, `integrations/page.tsx`, `TelegramChatBox`, `TelegramConnectModal` | M2, M3 | PLANNED |
| 5 | Automated QA Suite 16 | Implement `tests/telegram_bot_supabase_persistence.test.ts` & wire to `run_all_tests.ts` | M2, M3, M4 | PLANNED |
| 6 | Verification, Build & Delivery | Run tests, typecheck, Next.js build, commit to git & push | M5 | PLANNED |

## Interface Contracts
### `GET /api/telegram/settings`
- Response:
```json
{
  "success": true,
  "settings": {
    "botToken": "••••••••",
    "hasBotToken": true,
    "adminChatId": "184920491",
    "ownerChatId": "928374921",
    "botUsername": "youeuropeservicebot",
    "webhookUrl": "https://crm.youeurope.ru/api/telegram/webhook",
    "notificationsEnabled": true,
    "status": "connected",
    "updatedAt": "2026-10-05T19:00:00.000Z"
  }
}
```

### `POST /api/telegram/settings`
- Request body:
```json
{
  "botToken": "string (optional, if '••••••••' or empty, preserves existing token in DB)",
  "adminChatId": "string",
  "ownerChatId": "string",
  "botUsername": "string",
  "webhookUrl": "string",
  "notificationsEnabled": "boolean"
}
```
- Response:
```json
{
  "success": true,
  "message": "Настройки Telegram бота успешно сохранены в Supabase",
  "settings": { ... }
}
```

### `getTelegramSettingsServer(): Promise<TelegramBotSettings>`
- Returns complete decrypted/unmasked settings for server route execution (`send`, `webhook`, etc.).

## Code Layout
- `supabase/migrations/20261005002000_system_settings.sql` (Database migration)
- `src/lib/telegram/settings.ts` (Server & client settings helpers, types, Supabase access)
- `src/app/api/telegram/settings/route.ts` (Next.js GET / POST API endpoint)
- `src/app/api/telegram/send/route.ts` (Server route updated with DB fallback)
- `src/app/api/telegram/setup/route.ts` (Server route updated with DB fallback & persistence)
- `src/app/api/telegram/webhook/route.ts` (Server route updated with DB fallback)
- `src/app/api/telegram/notify/route.ts` (Server route updated with DB fallback)
- `src/components/settings/TelegramSettingsModal.tsx` (Client modal updated with API sync)
- `src/app/settings/integrations/page.tsx` (Integrations page updated with API sync)
- `src/components/telegram/TelegramChatBox.tsx` (Chat box updated with async settings check)
- `src/components/telegram/TelegramConnectModal.tsx` (Connect modal updated with API sync)
- `tests/telegram_bot_supabase_persistence.test.ts` (Automated QA persistence suite)
- `tests/run_all_tests.ts` (Suite 16 registration)
