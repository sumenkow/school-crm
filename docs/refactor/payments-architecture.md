# PAYMENTS & FINANCE ARCHITECTURE & MODEL INVENTORY

**Module**: `/finance` (`src/app/finance/page.tsx`)  
**Design Target**: Desktop 1440×900 / 1280×800 Desktop-first SaaS UI with light color palette and right-side detail drawer.

---

## 1. Existing Storage & Data Models

### 1.1 `Payment` (`FullPaymentData`)
- **Source**: `src/lib/data/paymentStorage.ts` (`getStoredPayments`, `savePaymentToStorage`, `addPaymentToStorage`)
- **Storage Key**: `crm_payments_v2`
- **Fields**:
  - `id`: string (`pay_...` or `p1`..`p4`)
  - `studentId`: string
  - `studentName`: string
  - `parentId`?: string
  - `parentName`?: string
  - `amount`: number | string
  - `amountFormatted`: string (e.g. `85 €`)
  - `currency`: `'EUR' | 'RUB'`
  - `paymentDate`: string (`DD.MM.YYYY`)
  - `period`: string
  - `periodLabel`: string (e.g. `Октябрь 2026`)
  - `courseName`: string
  - `groupName`: string
  - `paymentMethod`: `'card' | 'cash' | 'bank_transfer' | 'invoice' | 'deposit_deduction'`
  - `status`: `'paid' | 'expected' | 'overdue'`
  - `invoiceNumber`?: string
  - `receiptUrl`?: string
  - `responsibleName`?: string

### 1.2 `Invoice` (`EuropeanInvoiceData`)
- **Source**: `src/lib/data/invoiceStorage.ts` (`getStoredInvoices`, `saveInvoiceToStorage`, `markInvoiceAsPaid`)
- **Storage Key**: `crm_invoices_v1`
- **Fields**:
  - `id`: string (`inv_...`)
  - `invoiceNumber`: string (e.g. `202600125`)
  - `variableSymbol`: string
  - `issueDate`: string (`DD.MM.YYYY`)
  - `dueDate`: string (`DD.MM.YYYY`)
  - `studentId`: string
  - `studentName`: string
  - `parentId`?: string
  - `parentName`?: string
  - `courseName`: string
  - `periodLabel`: string
  - `totalAmountEUR`: number
  - `currency`: `'EUR'`
  - `status`: `'paid' | 'pending' | 'overdue' | 'cancelled'`
  - `items`: array of invoice items with quantity, unit price, vat
  - `qrCodeData`?: string (SEPA Pay by Square)

### 1.3 `Subscription` (`FullSubscriptionData` & `Student.finance.activeSubscription`)
- **Source**: `src/lib/data/mockData.ts`, `src/lib/data/studentStorage.ts`
- **Fields**:
  - `id`: string
  - `studentId`: string
  - `studentName`: string
  - `courseName`: string
  - `groupName`: string
  - `startDate`: string
  - `endDate`: string
  - `renewalDate`?: string
  - `lessonsTotal`: number (e.g. 8 or 12)
  - `lessonsAttended`: number (or formatted `4 / 12`)
  - `lessonsRemaining`: number
  - `price`: string | number
  - `priceFormatted`: string (e.g. `140 €`)
  - `status`: `'active' | 'frozen' | 'expired'`
  - `balanceEur`?: number

### 1.4 `Student` & `Parent`
- **Source**: `src/lib/data/studentStorage.ts` (`getStoredStudents`)
- **Deposit**: `student.finance.deposit` (`balance`, `currency`, `pricePerLesson`)
- **Payments history**: `student.finance.payments`
- **Parent contact**: `parent.phone`, `parent.telegram`, `parent.preferredChannel`

---

## 2. Real Business Mapping of the 4 Tabs

| Вкладка | Бизнес-вопрос | Главная сущность | Ключевые действия |
|---|---|---|---|
| **1. Счета на оплату** | *Что школа выставила клиентам и что из этого ожидает оплаты?* | `EuropeanInvoiceData` | Открыть счет, Отметить оплаченным, Выставить новый счет, Перейти к ученику |
| **2. Платежи** | *Какие деньги школа фактически получила?* | `FullPaymentData` (`status === 'paid'`) | Просмотр чека, Открыть профиль ученика, Связанный счет, Внести оплату |
| **3. Абонементы** | *Что клиент купил, сколько занятий посетил и сколько осталось?* | `Subscription` / `activeSubscription` | Прогресс посещений, Заморозка, Продление, История уроков |
| **4. Долги и задолженности** | *С кого сейчас нужно получить деньги?* | Aggregated Overdue (`status === 'overdue'`) | Связь в WhatsApp / Telegram, Звонок, Погашение долга, Задача |

---

## 3. Top-Level KPI Mapping

1. **Общая выручка** (`€`): Сумма всех платежей со статусом `'paid'`.
2. **Ожидаемые поступления** (`€`): Сумма неоплаченных счетов (`pending`/`issued`) и ожидаемых платежей (`expected`).
3. **Общий долг** (`€`): Сумма просроченных платежей (`overdue`) + количество должников.
4. **Баланс учеников** (`€`): Сумма положительных остатков на депозитах учеников (`deposit.balance > 0`) + количество учеников с балансом.
