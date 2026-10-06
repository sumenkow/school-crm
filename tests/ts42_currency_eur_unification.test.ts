/**
 * SMART ACADEMY CRM — SUITE 22: CURRENCY EUR UNIFICATION & PURITY REGRESSION SUITE (TS-42)
 *
 * Scope: Complete elimination of Russian Rubles (₽, руб, RUB) across all CRM modules,
 * client cards, analytics cockpit, financial summaries, mock datasets, and UI templates.
 * Enforces pure European currency standard (€ / EUR) with non-breaking whitespace thousands separation.
 *
 * Requirements covered:
 * - Tier 1: Currency formatting helpers (formatCurrency, formatDualCurrency, formatExecutiveDualCurrency, calculateMultiCurrencyTotals, parsePaymentAmountEUR)
 * - Tier 2: Financial summaries (getStudentFinancialSummary, getLeadFinancialSummary, getParentFinancialSummary)
 * - Tier 3: Mock dataset integrity (INITIAL_STUDENTS, INITIAL_LEADS, INITIAL_PAYMENTS, INITIAL_SUBSCRIPTIONS in mockData.ts)
 * - Tier 4: Critical analytics hooks cleanliness (useDiagnosticsMidTier, useDiagnosticsAnomalies, useDiagnosticsTeachersAndGroups, useSalesTabData)
 * - Tier 5: Static AST & regex scan across UI JSX templates for zero unauthorized '₽' or 'руб'
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Tier 1 imports
import {
  formatCurrency,
  formatDualCurrency,
  formatExecutiveDualCurrency,
  calculateMultiCurrencyTotals,
  parsePaymentAmountEUR,
  convertRubToEur,
  convertEurToRub,
  getEurRubRate,
} from '../src/lib/data/currencyHelper';

// Tier 2 imports
import {
  getStudentFinancialSummary,
  getLeadFinancialSummary,
  getParentFinancialSummary,
} from '../src/lib/data/balanceHelper';

// Tier 3 imports
import {
  INITIAL_STUDENTS,
  INITIAL_LEADS,
  INITIAL_PAYMENTS,
  INITIAL_SUBSCRIPTIONS,
} from '../src/lib/data/mockData';

// Types for check results
export interface CheckResult {
  id: string;
  name: string;
  tier: number;
  passed: boolean;
  error?: string;
  details?: string;
}

export interface Suite22Summary {
  total: number;
  passed: number;
  failed: number;
  results: CheckResult[];
  failures: string[];
  passedChecks: string[];
}

export async function runSuite22(options?: { throwOnFailure?: boolean }): Promise<Suite22Summary> {
  console.log('\n===============================================================');
  console.log('   SUITE 22: CURRENCY EUR UNIFICATION & PURITY (TS-42)        ');
  console.log('   Enforcing 100% Pure EUR (€) Across All CRM Layers           ');
  console.log('===============================================================');

  const results: CheckResult[] = [];
  const failures: string[] = [];
  const passedChecks: string[] = [];

  function check(tier: number, id: string, name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      results.push({ id, name, tier, passed: true });
      passedChecks.push(`[T${tier}] ${id}: ${name}`);
      console.log(`  ✓ ${id}: ${name}`);
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      results.push({ id, name, tier, passed: false, error: errMsg });
      failures.push(`[T${tier}] ${id}: ${name} -> ${errMsg}`);
      console.log(`  ✗ [REGRESSION CAUGHT] ${id}: ${name}`);
      console.log(`     ↳ Reason: ${errMsg}`);
    }
  }

  // ==========================================================================
  // TIER 1: UNIT TESTS FOR CURRENCY HELPER (src/lib/data/currencyHelper.ts)
  // ==========================================================================
  console.log('\n--- TIER 1: Currency Formatting Helper Functions ---');

  check(1, 'T1.01', 'formatCurrency(120, "EUR") ends strictly with " €" and contains 0 "₽"', () => {
    const formatted = formatCurrency(120, 'EUR');
    assert.ok(formatted.endsWith(' €'), `Expected format to end with " €", got: "${formatted}"`);
    assert.strictEqual(formatted.includes('₽'), false, `Output must not contain '₽', got: "${formatted}"`);
    assert.ok(/^[\d\s\u00A0,.]+ €$/.test(formatted), `Expected valid numeric pattern, got: "${formatted}"`);
  });

  check(1, 'T1.02', 'formatCurrency(1440, "EUR") formats thousand groups and ends with " €"', () => {
    const formatted = formatCurrency(1440, 'EUR');
    assert.ok(formatted.endsWith(' €'), `Expected format to end with " €", got: "${formatted}"`);
    assert.strictEqual(formatted.includes('₽'), false, `Output must not contain '₽', got: "${formatted}"`);
    assert.ok(formatted.includes('1') && formatted.includes('440'), `Thousands separation missing in: "${formatted}"`);
  });

  check(1, 'T1.03', 'formatCurrency(0, "EUR") formats zero cleanly as EUR without rubles', () => {
    const formatted = formatCurrency(0, 'EUR');
    assert.ok(formatted.endsWith(' €'), `Expected format to end with " €", got: "${formatted}"`);
    assert.strictEqual(formatted.includes('₽'), false, `Output must not contain '₽', got: "${formatted}"`);
  });

  check(1, 'T1.04', 'formatCurrency(-84, "EUR") preserves negative debt sign in EUR without rubles', () => {
    const formatted = formatCurrency(-84, 'EUR');
    assert.ok(formatted.startsWith('-'), `Expected negative sign, got: "${formatted}"`);
    assert.ok(formatted.endsWith(' €'), `Expected format to end with " €", got: "${formatted}"`);
    assert.strictEqual(formatted.includes('₽'), false, `Output must not contain '₽', got: "${formatted}"`);
  });

  check(1, 'T1.05', 'formatCurrency(74.13, "EUR") supports two decimal places for cents', () => {
    const formatted = formatCurrency(74.13, 'EUR');
    assert.ok(formatted.endsWith(' €'), `Expected format to end with " €", got: "${formatted}"`);
    assert.ok(formatted.includes('74,13') || formatted.includes('74.13'), `Expected 74,13 cents, got: "${formatted}"`);
    assert.strictEqual(formatted.includes('₽'), false, `Output must not contain '₽', got: "${formatted}"`);
  });

  check(1, 'T1.06', 'formatCurrency currency purity: calling without EUR must default or never emit rubles', () => {
    // In pure EUR architecture, all outputs must be EUR and rubles must never be emitted
    const formattedDefault = (formatCurrency as any)(100);
    assert.strictEqual(
      formattedDefault ? formattedDefault.includes('₽') : false,
      false,
      `formatCurrency output must never contain '₽', got: "${formattedDefault}"`
    );
  });

  check(1, 'T1.07', 'formatDualCurrency(120, "EUR") returns strictly EUR without secondary ruble text', () => {
    const res = formatDualCurrency(120, 'EUR');
    assert.strictEqual(res.includes('₽'), false, `formatDualCurrency must not contain '₽', got: "${res}"`);
    assert.strictEqual(res.includes('(≈'), false, `Dual-currency parenthesis must be removed in pure EUR mode, got: "${res}"`);
    assert.ok(res.endsWith(' €'), `Result must end with ' €', got: "${res}"`);
  });

  check(1, 'T1.08', 'formatDualCurrency default invocation outputs zero ruble characters', () => {
    const res = formatDualCurrency(120);
    assert.strictEqual(res.includes('₽'), false, `formatDualCurrency must not contain '₽', got: "${res}"`);
    assert.strictEqual(res.includes('руб'), false, `formatDualCurrency must not contain 'руб', got: "${res}"`);
  });

  check(1, 'T1.09', 'formatDualCurrency(0) produces clean zero EUR without secondary rubles', () => {
    const res = formatDualCurrency(0);
    assert.strictEqual(res.includes('₽'), false, `formatDualCurrency(0) must not contain '₽', got: "${res}"`);
  });

  check(1, 'T1.10', 'formatExecutiveDualCurrency fullLabel contains 0 "₽" characters', () => {
    const res = formatExecutiveDualCurrency(120);
    assert.strictEqual(
      res.fullLabel.includes('₽'),
      false,
      `formatExecutiveDualCurrency.fullLabel must not contain '₽', got: "${res.fullLabel}"`
    );
    assert.ok(res.eurFormatted.endsWith(' €'), `eurFormatted must end with ' €', got: "${res.eurFormatted}"`);
  });

  check(1, 'T1.11', 'calculateMultiCurrencyTotals summary strings contain 0 "₽" and 0 "руб"', () => {
    const items = [
      { amount: 100, currency: 'EUR' },
      { amount: 80, currency: 'EUR' },
    ];
    const res = calculateMultiCurrencyTotals(items);
    assert.strictEqual(res.totalEur, 180, `Expected totalEur = 180, got ${res.totalEur}`);
    assert.strictEqual(res.formattedTotalEur.includes('₽'), false, `formattedTotalEur must not contain '₽'`);
    assert.ok(res.formattedTotalEur.endsWith(' €'), `formattedTotalEur must end with ' €'`);
    assert.strictEqual(
      res.formattedPrimaryWithSecondary.includes('₽'),
      false,
      `formattedPrimaryWithSecondary must not contain '₽', got: "${res.formattedPrimaryWithSecondary}"`
    );
    assert.strictEqual(
      res.breakdownSummary.includes('₽'),
      false,
      `breakdownSummary must not contain '₽', got: "${res.breakdownSummary}"`
    );
  });

  check(1, 'T1.12', 'calculateMultiCurrencyTotals handles numeric items without ruble fallback', () => {
    const items = [{ amount: 1440 }, { amount: 80 }];
    const res = calculateMultiCurrencyTotals(items);
    assert.strictEqual(
      res.formattedPrimaryWithSecondary.includes('₽'),
      false,
      `formattedPrimaryWithSecondary must not contain '₽', got: "${res.formattedPrimaryWithSecondary}"`
    );
    assert.strictEqual(
      res.breakdownSummary.includes('₽'),
      false,
      `breakdownSummary must not contain '₽', got: "${res.breakdownSummary}"`
    );
  });

  check(1, 'T1.13', 'calculateMultiCurrencyTotals empty array summary contains 0 "₽/€" rate labels', () => {
    const res = calculateMultiCurrencyTotals([]);
    assert.strictEqual(res.totalEur, 0, `Expected totalEur = 0 for empty items`);
    assert.strictEqual(res.formattedTotalEur.includes('₽'), false, `formattedTotalEur must not contain '₽'`);
    assert.strictEqual(
      res.breakdownSummary.includes('₽'),
      false,
      `Empty breakdownSummary must not contain '₽', got: "${res.breakdownSummary}"`
    );
  });

  check(1, 'T1.14', 'parsePaymentAmountEUR preserves high-tier EUR tariffs (anti-div100 bug for 520 € packages)', () => {
    // In courseStorage.ts individual package costs 520 €. It must NOT be heuristically divided by 100 to 5.20 €!
    const parsed520 = parsePaymentAmountEUR(520);
    assert.ok(
      parsed520 >= 500,
      `parsePaymentAmountEUR(520) must preserve valid 520 € package without division by 100, got: ${parsed520}`
    );

    const parsedStringEur = parsePaymentAmountEUR('520 €');
    assert.strictEqual(parsedStringEur, 520, `parsePaymentAmountEUR('520 €') must return 520, got: ${parsedStringEur}`);

    const parsed80 = parsePaymentAmountEUR('80 €');
    assert.strictEqual(parsed80, 80, `parsePaymentAmountEUR('80 €') must return 80, got: ${parsed80}`);
  });

  // ==========================================================================
  // TIER 2: UNIT TESTS FOR BALANCE HELPER (src/lib/data/balanceHelper.ts)
  // ==========================================================================
  console.log('\n--- TIER 2: Financial Summary Balance Helpers ---');

  check(2, 'T2.01', 'getStudentFinancialSummary positive deposit strictly ends with " €" and contains 0 "₽"', () => {
    const mockStudent: any = {
      id: 's_test_1',
      deposit: { balance: 100, currency: 'EUR' },
      debt: 0,
      payments: [],
      subscriptions: [],
    };
    const summary = getStudentFinancialSummary(mockStudent);
    assert.strictEqual(summary.deposit, 100);
    assert.ok(summary.formattedDeposit.endsWith(' €'), `Expected deposit to end with ' €', got: "${summary.formattedDeposit}"`);
    assert.strictEqual(summary.formattedDeposit.includes('₽'), false, `formattedDeposit must not contain '₽'`);
    assert.ok(summary.formattedNet.endsWith(' €'), `Expected formattedNet to end with ' €', got: "${summary.formattedNet}"`);
    assert.strictEqual(summary.formattedNet.includes('₽'), false, `formattedNet must not contain '₽'`);
    assert.strictEqual(summary.formattedDebt, '0 €', `formattedDebt must be '0 €', got: "${summary.formattedDebt}"`);
    assert.strictEqual(summary.breakdownSummary.includes('₽'), false, `breakdownSummary must not contain '₽'`);
  });

  check(2, 'T2.02', 'getStudentFinancialSummary debt strictly ends with " €" and contains 0 "₽"', () => {
    const mockStudent: any = {
      id: 's_test_2',
      deposit: { balance: 0, currency: 'EUR' },
      debt: 84,
      payments: [{ id: 'p1', amount: 84, status: 'overdue' }],
      subscriptions: [],
    };
    const summary = getStudentFinancialSummary(mockStudent);
    assert.strictEqual(summary.debt, 84);
    assert.ok(summary.formattedDebt.endsWith(' €'), `Expected formattedDebt to end with ' €', got: "${summary.formattedDebt}"`);
    assert.ok(summary.formattedDebt.startsWith('-'), `Expected formattedDebt to start with '-', got: "${summary.formattedDebt}"`);
    assert.strictEqual(summary.formattedDebt.includes('₽'), false, `formattedDebt must not contain '₽'`);
    assert.strictEqual(summary.formattedNet.includes('₽'), false, `formattedNet must not contain '₽'`);
    assert.strictEqual(summary.formattedDeposit, '0 €');
  });

  check(2, 'T2.03', 'getStudentFinancialSummary zero balance cleanly returns "0 €"', () => {
    const mockStudent: any = {
      id: 's_test_3',
      deposit: { balance: 0, currency: 'EUR' },
      debt: 0,
      payments: [],
      subscriptions: [],
    };
    const summary = getStudentFinancialSummary(mockStudent);
    assert.strictEqual(summary.formattedNet, '0 €');
    assert.strictEqual(summary.formattedDebt, '0 €');
    assert.strictEqual(summary.formattedDeposit, '0 €');
    assert.strictEqual(summary.breakdownSummary, '0 €');
  });

  check(2, 'T2.04', 'getLeadFinancialSummary zero balance contains 0 "₽" and equals "0 €" (no "0 € (0 ₽)")', () => {
    const mockLead: any = {
      id: 'lead_test_1',
      deposit: 0,
      debt: 0,
      offerAmount: '80 €',
    };
    const summary = getLeadFinancialSummary(mockLead);
    assert.strictEqual(
      summary.formattedNet.includes('₽'),
      false,
      `formattedNet must not contain '₽', got: "${summary.formattedNet}"`
    );
    assert.strictEqual(
      summary.formattedNet,
      '0 €',
      `formattedNet must be strictly '0 €' without '(0 ₽)', got: "${summary.formattedNet}"`
    );
    assert.strictEqual(
      summary.formattedDebt.includes('₽'),
      false,
      `formattedDebt must not contain '₽', got: "${summary.formattedDebt}"`
    );
    assert.strictEqual(
      summary.formattedDeposit.includes('₽'),
      false,
      `formattedDeposit must not contain '₽', got: "${summary.formattedDeposit}"`
    );
    assert.strictEqual(
      summary.breakdownSummary.includes('₽'),
      false,
      `breakdownSummary must not contain '₽', got: "${summary.breakdownSummary}"`
    );
  });

  check(2, 'T2.05', 'getLeadFinancialSummary positive deposit contains 0 "₽" and no dual "(≈ +... ₽)" text', () => {
    const mockLead: any = {
      id: 'lead_test_2',
      deposit: 80,
      debt: 0,
      offerAmount: '80 €',
    };
    const summary = getLeadFinancialSummary(mockLead);
    assert.strictEqual(
      summary.formattedNet.includes('₽'),
      false,
      `formattedNet must not contain '₽', got: "${summary.formattedNet}"`
    );
    assert.strictEqual(
      summary.formattedNet.includes('(≈'),
      false,
      `formattedNet must not contain dual currency '(≈', got: "${summary.formattedNet}"`
    );
    assert.ok(summary.formattedNet.endsWith(' €'), `formattedNet must end with ' €', got: "${summary.formattedNet}"`);
    assert.strictEqual(
      summary.formattedDeposit.includes('₽'),
      false,
      `formattedDeposit must not contain '₽', got: "${summary.formattedDeposit}"`
    );
  });

  check(2, 'T2.06', 'getLeadFinancialSummary debt linked to student contains 0 "₽" and no "(≈ -... ₽)"', () => {
    const mockLead: any = {
      id: 'lead_test_3',
      deposit: 0,
      debt: 0,
      linkedStudentId: 's_debt',
      leadFinance: {
        linkedStudentDebt: 84,
      },
    };
    const summary = getLeadFinancialSummary(mockLead);
    assert.strictEqual(
      summary.formattedNet.includes('₽'),
      false,
      `formattedNet must not contain '₽', got: "${summary.formattedNet}"`
    );
    assert.strictEqual(
      summary.formattedDebt.includes('₽'),
      false,
      `formattedDebt must not contain '₽', got: "${summary.formattedDebt}"`
    );
    assert.strictEqual(
      summary.breakdownSummary.includes('₽'),
      false,
      `breakdownSummary must not contain '₽', got: "${summary.breakdownSummary}"`
    );
  });

  check(2, 'T2.07', 'getParentFinancialSummary family balances contain 0 "₽" characters', () => {
    const mockParent: any = { id: 'p_test', name: 'Тестовый Родитель' };
    const mockStudents: any[] = [
      { id: 's1', deposit: { balance: 100, currency: 'EUR' }, debt: 0 },
      { id: 's2', deposit: { balance: 0, currency: 'EUR' }, debt: 40 },
    ];
    const summary = getParentFinancialSummary(mockParent, mockStudents);
    assert.strictEqual(summary.formattedNet.includes('₽'), false, `Parent formattedNet must not contain '₽'`);
    assert.strictEqual(summary.formattedDeposit.includes('₽'), false, `Parent formattedDeposit must not contain '₽'`);
    assert.strictEqual(summary.formattedDebt.includes('₽'), false, `Parent formattedDebt must not contain '₽'`);
    assert.strictEqual(summary.breakdownSummary.includes('₽'), false, `Parent breakdownSummary must not contain '₽'`);
  });

  // ==========================================================================
  // TIER 3: MOCK DATASET SCAN (src/lib/data/mockData.ts)
  // ==========================================================================
  console.log('\n--- TIER 3: Mock Datasets Cleanliness Scan ---');

  check(3, 'T3.01', 'INITIAL_STUDENTS contains zero "₽" or "руб" in prices, deposits, and payments', () => {
    const violations: string[] = [];

    INITIAL_STUDENTS.forEach((st) => {
      const studentAny = st as any;
      // Check price field (top-level or in finance.activeSubscription)
      const price = studentAny.price || studentAny.finance?.activeSubscription?.price;
      if (typeof price === 'string' && (price.includes('₽') || price.toLowerCase().includes('руб'))) {
        violations.push(`Student [${st.id}] price contains ruble: "${price}"`);
      }
      // Check deposit
      const deposit = studentAny.deposit || studentAny.finance?.deposit;
      if (deposit) {
        if (
          typeof deposit.balanceFormatted === 'string' &&
          (deposit.balanceFormatted.includes('₽') || deposit.balanceFormatted.toLowerCase().includes('руб'))
        ) {
          violations.push(`Student [${st.id}] deposit.balanceFormatted contains ruble: "${deposit.balanceFormatted}"`);
        }
        if (deposit.currency === 'RUB') {
          violations.push(`Student [${st.id}] deposit.currency is 'RUB'`);
        }
      }
      // Check payments
      const payments = studentAny.payments || studentAny.finance?.payments;
      if (Array.isArray(payments)) {
        payments.forEach((p: any) => {
          if (typeof p.amount === 'string' && (p.amount.includes('₽') || p.amount.toLowerCase().includes('руб'))) {
            violations.push(`Student [${st.id}] payment [${p.id}] amount contains ruble: "${p.amount}"`);
          }
          if (
            typeof p.amountFormatted === 'string' &&
            (p.amountFormatted.includes('₽') || p.amountFormatted.toLowerCase().includes('руб'))
          ) {
            violations.push(`Student [${st.id}] payment [${p.id}] amountFormatted contains ruble: "${p.amountFormatted}"`);
          }
        });
      }
    });

    assert.strictEqual(
      violations.length,
      0,
      `Found ${violations.length} ruble violations in INITIAL_STUDENTS:\n  ` + violations.slice(0, 5).join('\n  ')
    );
  });

  check(3, 'T3.02', 'INITIAL_LEADS contains zero "₽" or "руб" in offerAmount fields', () => {
    const violations: string[] = [];

    INITIAL_LEADS.forEach((lead) => {
      if (lead.offerAmount) {
        const val = String(lead.offerAmount);
        if (val.includes('₽') || val.toLowerCase().includes('руб')) {
          violations.push(`Lead [${lead.id}] offerAmount contains ruble: "${val}"`);
        }
        if (val.includes('(≈') || val.includes('(')) {
          violations.push(`Lead [${lead.id}] offerAmount contains dual-currency bracket: "${val}"`);
        }
      }
    });

    assert.strictEqual(
      violations.length,
      0,
      `Found ${violations.length} ruble violations in INITIAL_LEADS:\n  ` + violations.slice(0, 5).join('\n  ')
    );
  });

  check(3, 'T3.03', 'INITIAL_PAYMENTS contains zero "₽" or "руб" and strictly uses EUR currency', () => {
    const violations: string[] = [];

    INITIAL_PAYMENTS.forEach((p) => {
      if (p.currency !== 'EUR') {
        violations.push(`Payment [${p.id}] currency is "${p.currency}" (must be "EUR")`);
      }
      if (
        typeof p.amountFormatted === 'string' &&
        (p.amountFormatted.includes('₽') || p.amountFormatted.toLowerCase().includes('руб'))
      ) {
        violations.push(`Payment [${p.id}] amountFormatted contains ruble: "${p.amountFormatted}"`);
      }
      if (typeof p.comment === 'string' && (p.comment.includes('₽') || p.comment.toLowerCase().includes('руб'))) {
        violations.push(`Payment [${p.id}] comment contains ruble: "${p.comment}"`);
      }
      // Check numeric amount scale: payments in rubles are > 500 (e.g. 7600, 8400, 14400)
      if (typeof p.amount === 'number' && p.amount > 500) {
        violations.push(`Payment [${p.id}] amount appears unmigrated (value: ${p.amount} > 500 €)`);
      }
    });

    assert.strictEqual(
      violations.length,
      0,
      `Found ${violations.length} ruble violations in INITIAL_PAYMENTS:\n  ` + violations.slice(0, 5).join('\n  ')
    );
  });

  check(3, 'T3.04', 'INITIAL_SUBSCRIPTIONS contains zero "₽" or "руб" and strictly uses EUR currency', () => {
    const violations: string[] = [];

    INITIAL_SUBSCRIPTIONS.forEach((sub) => {
      const subAny = sub as any;
      if (subAny.currency && subAny.currency !== 'EUR') {
        violations.push(`Subscription [${sub.id}] currency is "${subAny.currency}" (must be "EUR")`);
      }
      if (
        typeof sub.priceFormatted === 'string' &&
        (sub.priceFormatted.includes('₽') || sub.priceFormatted.toLowerCase().includes('руб'))
      ) {
        violations.push(`Subscription [${sub.id}] priceFormatted contains ruble: "${sub.priceFormatted}"`);
      }
      if (typeof sub.price === 'number' && sub.price > 500) {
        violations.push(`Subscription [${sub.id}] price appears unmigrated (value: ${sub.price} > 500 €)`);
      }
    });

    assert.strictEqual(
      violations.length,
      0,
      `Found ${violations.length} ruble violations in INITIAL_SUBSCRIPTIONS:\n  ` + violations.slice(0, 5).join('\n  ')
    );
  });

  check(3, 'T3.05', 'mockData.ts raw source file contains zero literal "₽" characters', () => {
    const filePath = path.join(process.cwd(), 'src/lib/data/mockData.ts');
    assert.ok(fs.existsSync(filePath), 'mockData.ts must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    const matches = content.split('\n').filter((line) => line.includes('₽'));
    assert.strictEqual(
      matches.length,
      0,
      `Found ${matches.length} lines with '₽' in mockData.ts:\n  ` + matches.slice(0, 5).join('\n  ')
    );
  });

  // ==========================================================================
  // TIER 4: CODEBASE CLEANLINESS IN CRITICAL ANALYTICS HOOKS
  // ==========================================================================
  console.log('\n--- TIER 4: Critical Analytics Hooks Cleanliness ---');

  check(4, 'T4.01', 'useDiagnosticsAnomalies: underfilled_groups deltaBadge is strictly in EUR without "₽"', () => {
    const filePath = path.join(process.cwd(), 'src/features/analytics/hooks/useDiagnosticsAnomalies.ts');
    assert.ok(fs.existsSync(filePath), 'useDiagnosticsAnomalies.ts must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // Must NOT calculate totalLostRub = totalLostEur * 100
    assert.strictEqual(
      content.includes('totalLostRub'),
      false,
      'useDiagnosticsAnomalies must not calculate totalLostRub (no * 100 ruble multiplier)'
    );

    // underfilled_groups must emit EUR deltaBadge (≈ ... €)
    assert.ok(
      content.includes("deltaBadge: `≈ ${totalLostEur.toLocaleString('ru-RU')} €`") ||
        (content.includes('underfilled_groups') && content.includes('€') && !content.includes('totalLostRub.toLocaleString')),
      'underfilled_groups must format deltaBadge strictly in EUR ("≈ ... €")'
    );
  });

  check(4, 'T4.02', 'useDiagnosticsMidTier: RevenueLossesData computes totalLossEur and zero ruble losses', () => {
    const filePath = path.join(process.cwd(), 'src/features/analytics/hooks/useDiagnosticsMidTier.ts');
    assert.ok(fs.existsSync(filePath), 'useDiagnosticsMidTier.ts must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // Interface must have totalLossEur as primary metric
    assert.ok(content.includes('totalLossEur: number'), 'RevenueLossesData must export totalLossEur: number');

    // Must not contain hardcoded 84 000 ₽ banner text
    assert.strictEqual(
      content.includes('84 000 ₽') || content.includes('84000 ₽'),
      false,
      'useDiagnosticsMidTier must not contain hardcoded ruble loss banners'
    );
  });

  check(4, 'T4.03', 'useDiagnosticsTeachersAndGroups: Group capacity upside potential computed in EUR', () => {
    const filePath = path.join(process.cwd(), 'src/features/analytics/hooks/useDiagnosticsTeachersAndGroups.ts');
    assert.ok(fs.existsSync(filePath), 'useDiagnosticsTeachersAndGroups.ts must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.ok(content.includes('potentialEur'), 'Group capacity must calculate potentialEur');
    // Ensure potential values match specification (+80 €, +240 €, +480 €, 0 €)
    assert.ok(content.includes('vacant * price') || content.includes('vacantSlots * price'), 'Must calculate potentialEur based on vacant slots');
  });

  check(4, 'T4.04', 'useSalesTabData: Replaces parseRubles/formatRubles with pure EUR formatters', () => {
    const filePath = path.join(process.cwd(), 'src/features/analytics/hooks/useSalesTabData.ts');
    assert.ok(fs.existsSync(filePath), 'useSalesTabData.ts must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.strictEqual(
      content.includes("formatRubles"),
      false,
      'useSalesTabData must not use or export formatRubles'
    );
    assert.strictEqual(
      content.includes("parseRubles"),
      false,
      'useSalesTabData must not use or export parseRubles'
    );
    assert.strictEqual(
      content.includes("+ ' ₽'") || content.includes(" ' ₽'"),
      false,
      'useSalesTabData must not append ruble symbol to formatted sales numbers'
    );
  });

  check(4, 'T4.05', 'Revenue loss model arithmetic: 18 vacant slots * 80 € strictly equals 1 440 €', () => {
    const vacantSlots = 18;
    const pricePerMonth = 80;
    const totalLostEur = vacantSlots * pricePerMonth;
    assert.strictEqual(totalLostEur, 1440, 'Mathematical verification: 18 * 80 = 1440 €');

    const formatted = `≈ ${totalLostEur.toLocaleString('ru-RU')} €`;
    assert.ok(formatted.includes('1') && formatted.includes('440') && formatted.endsWith(' €'));
    assert.strictEqual(formatted.includes('₽'), false);
  });

  // ==========================================================================
  // TIER 5: STATIC AST / REGEX SCAN ACROSS UI JSX TEMPLATES
  // ==========================================================================
  console.log('\n--- TIER 5: UI JSX Templates Purity Scan (Zero Unauthorized Rubles) ---');

  function scanDirectoryForRubles(dirRelativePath: string): Array<{ file: string; line: number; snippet: string }> {
    const dirAbsPath = path.join(process.cwd(), dirRelativePath);
    if (!fs.existsSync(dirAbsPath)) return [];

    const violations: Array<{ file: string; line: number; snippet: string }> = [];

    function walk(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
          if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts')) continue;

          const fileContent = fs.readFileSync(fullPath, 'utf8');
          const lines = fileContent.split('\n');

          lines.forEach((lineText, idx) => {
            const trimmed = lineText.trim();
            // Ignore pure comments
            if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
            // Ignore sanitization regexes like replace(/₽/g, '') or match(/₽/)
            if (trimmed.includes('replace(/') || trimmed.includes('.replace(') && trimmed.includes('/₽/')) return;

            if (trimmed.includes('₽')) {
              violations.push({
                file: path.relative(process.cwd(), fullPath),
                line: idx + 1,
                snippet: trimmed.slice(0, 100),
              });
            }
          });
        }
      }
    }

    walk(dirAbsPath);
    return violations;
  }

  check(5, 'T5.01', 'src/features/analytics/ components contain zero unauthorized "₽" characters', () => {
    const violations = scanDirectoryForRubles('src/features/analytics');
    assert.strictEqual(
      violations.length,
      0,
      `Found ${violations.length} ruble violations in src/features/analytics:\n` +
        violations.slice(0, 5).map((v) => `  ${v.file}:${v.line} -> ${v.snippet}`).join('\n')
    );
  });

  check(5, 'T5.02', 'src/app/students/ and student components contain zero unauthorized "₽" characters', () => {
    const violations = [
      ...scanDirectoryForRubles('src/app/students'),
      ...scanDirectoryForRubles('src/features/students'),
      ...scanDirectoryForRubles('src/components/students'),
    ];
    assert.strictEqual(
      violations.length,
      0,
      `Found ${violations.length} ruble violations in students pages & components:\n` +
        violations.slice(0, 5).map((v) => `  ${v.file}:${v.line} -> ${v.snippet}`).join('\n')
    );
  });

  check(5, 'T5.03', 'src/app/finance/ and finance modals contain zero unauthorized "₽" characters', () => {
    const violations = [
      ...scanDirectoryForRubles('src/app/finance'),
      ...scanDirectoryForRubles('src/components/finance'),
    ];
    assert.strictEqual(
      violations.length,
      0,
      `Found ${violations.length} ruble violations in finance pages & components:\n` +
        violations.slice(0, 5).map((v) => `  ${v.file}:${v.line} -> ${v.snippet}`).join('\n')
    );
  });

  check(5, 'T5.04', 'src/app/crm/ and CRM modals contain zero unauthorized "₽" characters', () => {
    const violations = [
      ...scanDirectoryForRubles('src/app/crm'),
      ...scanDirectoryForRubles('src/components/crm'),
    ];
    assert.strictEqual(
      violations.length,
      0,
      `Found ${violations.length} ruble violations in CRM pages & components:\n` +
        violations.slice(0, 5).map((v) => `  ${v.file}:${v.line} -> ${v.snippet}`).join('\n')
    );
  });

  check(5, 'T5.05', 'src/app/groups/ and group modals contain zero unauthorized "₽" characters', () => {
    const violations = [
      ...scanDirectoryForRubles('src/app/groups'),
      ...scanDirectoryForRubles('src/components/groups'),
    ];
    assert.strictEqual(
      violations.length,
      0,
      `Found ${violations.length} ruble violations in groups pages & components:\n` +
        violations.slice(0, 5).map((v) => `  ${v.file}:${v.line} -> ${v.snippet}`).join('\n')
    );
  });

  check(5, 'T5.06', 'src/app/dashboard/ and dashboard widgets contain zero unauthorized "₽" characters', () => {
    const violations = [
      ...scanDirectoryForRubles('src/app/dashboard'),
      ...scanDirectoryForRubles('src/components/dashboard'),
      ...scanDirectoryForRubles('src/features/dashboard'),
    ];
    assert.strictEqual(
      violations.length,
      0,
      `Found ${violations.length} ruble violations in dashboard pages & components:\n` +
        violations.slice(0, 5).map((v) => `  ${v.file}:${v.line} -> ${v.snippet}`).join('\n')
    );
  });

  check(5, 'T5.07', 'src/app/parents/ and parent components contain zero unauthorized "₽" characters', () => {
    const violations = [
      ...scanDirectoryForRubles('src/app/parents'),
      ...scanDirectoryForRubles('src/components/parents'),
      ...scanDirectoryForRubles('src/features/parents'),
    ];
    assert.strictEqual(
      violations.length,
      0,
      `Found ${violations.length} ruble violations in parents pages & components:\n` +
        violations.slice(0, 5).map((v) => `  ${v.file}:${v.line} -> ${v.snippet}`).join('\n')
    );
  });

  check(5, 'T5.08', 'src/app/api/reports/ and report notifications contain zero unauthorized "₽" characters', () => {
    const violations = [
      ...scanDirectoryForRubles('src/app/api/reports'),
      ...scanDirectoryForRubles('src/lib/telegram'),
    ];
    assert.strictEqual(
      violations.length,
      0,
      `Found ${violations.length} ruble violations in report routes & notifications:\n` +
        violations.slice(0, 5).map((v) => `  ${v.file}:${v.line} -> ${v.snippet}`).join('\n')
    );
  });

  // ==========================================================================
  // SUITE 22 EXECUTION SUMMARY
  // ==========================================================================
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n===============================================================');
  console.log('   SUITE 22 TEST EXECUTION SUMMARY                             ');
  console.log('===============================================================');
  console.log(`  Total Checks:    ${total}`);
  console.log(`  Passed Checks:   ${passed}`);
  console.log(`  Regressions/Failed: ${failed}`);
  console.log('---------------------------------------------------------------');
  console.log('  Breakdown by Tier:');
  for (let t = 1; t <= 5; t++) {
    const tierTotal = results.filter((r) => r.tier === t).length;
    const tierPassed = results.filter((r) => r.tier === t && r.passed).length;
    const tierFailed = tierTotal - tierPassed;
    console.log(`    Tier ${t}: ${tierPassed}/${tierTotal} passed (${tierFailed} caught regressions)`);
  }
  console.log('---------------------------------------------------------------');

  if (failed === 0) {
    console.log(`✅ 100% PURITY ACHIEVED: ZERO RUBLES DETECTED ACROSS THE CRM`);
  } else {
    console.log(`⚠️ REGRESSIONS IDENTIFIED: ${failed} checks caught active ruble remnants`);
    console.log('   These will be eliminated by the implementing agents.');
  }
  console.log('===============================================================\n');

  if (options?.throwOnFailure && failed > 0) {
    throw new Error(`Suite 22 failed with ${failed} regression checks`);
  }

  return {
    total,
    passed,
    failed,
    results,
    failures,
    passedChecks,
  };
}

// Standalone execution support
if (typeof require !== 'undefined' && require.main === module) {
  runSuite22()
    .then((summary) => {
      if (process.env.STRICT === '1' && summary.failed > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal Suite 22 error:', err);
      process.exit(1);
    });
}
