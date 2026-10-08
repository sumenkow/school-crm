'use client';

import React, { useState, Suspense, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFocusSync } from '@/hooks/useFocusSync';
import { useRole, usePermissions } from '@/context/RoleContext';
import {
  Receipt,
  CreditCard,
  Sparkles,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { INITIAL_PAYMENTS, INITIAL_SUBSCRIPTIONS, FullPaymentData, FullSubscriptionData, FullGroupData } from '@/lib/data/mockData';
import { getStoredPayments, savePaymentToStorage } from '@/lib/data/paymentStorage';
import { getStoredStudents } from '@/lib/data/studentStorage';
import { getStoredGroups } from '@/lib/data/groupStorage';
import { getStoredInvoices, EuropeanInvoiceData, markInvoiceAsPaid } from '@/lib/data/invoiceStorage';
import { getStoredSubscriptions, saveSubscriptionToStorage, freezeSubscriptionInStorage } from '@/lib/data/subscriptionStorage';
import { convertRubToEur, getEurRubRate } from '@/lib/data/currencyHelper';
import { useToast } from '@/context/ToastContext';

import { FinanceHeader } from '@/components/finance/FinanceHeader';
import { FinanceGlobalFilters, FinanceFiltersState } from '@/components/finance/FinanceGlobalFilters';
import { FinanceTopKpis } from '@/components/finance/FinanceTopKpis';
import { InvoicesTab } from '@/components/finance/InvoicesTab';
import { PaymentsTab } from '@/components/finance/PaymentsTab';
import { SubscriptionsTab } from '@/components/finance/SubscriptionsTab';
import { DebtsTab } from '@/components/finance/DebtsTab';
import { FinanceDetailDrawer, DrawerDetailType, DebtorDetailData } from '@/components/finance/FinanceDetailDrawer';

import { RecordPaymentModal } from '@/components/finance/RecordPaymentModal';
import { CreateInvoiceModal } from '@/components/finance/CreateInvoiceModal';
import { CreateSubscriptionModal } from '@/components/finance/CreateSubscriptionModal';

function FinanceContent() {
  const { canViewStudentFinancialAmounts, canViewSchoolFinances, canManageStudentPayments } = usePermissions();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');
  const tabParam = searchParams.get('tab');
  const rate = getEurRubRate();
  const toast = useToast();

  // Primary State
  const [students, setStudents] = useState(() => (typeof window !== 'undefined' ? getStoredStudents() : []));
  const [groups, setGroups] = useState<FullGroupData[]>(() => (typeof window !== 'undefined' ? getStoredGroups() : []));
  const [payments, setPayments] = useState<FullPaymentData[]>(() => (typeof window !== 'undefined' ? getStoredPayments() : INITIAL_PAYMENTS));
  const [invoices, setInvoices] = useState<EuropeanInvoiceData[]>(() => (typeof window !== 'undefined' ? getStoredInvoices() : []));
  const [subscriptions, setSubscriptions] = useState<FullSubscriptionData[]>(() =>
    typeof window !== 'undefined' ? getStoredSubscriptions() : INITIAL_SUBSCRIPTIONS
  );

  // Active Tab
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'subscriptions' | 'debts'>(() => {
    const target = tabParam || filterParam;
    if (target === 'overdue' || target === 'debts' || target === 'debt') return 'debts';
    if (target === 'invoices' || target === 'invoice') return 'invoices';
    if (target === 'subscriptions' || target === 'subscription') return 'subscriptions';
    if (target === 'payments' || target === 'payment') return 'payments';
    return 'payments';
  });

  // Global Filters
  const [globalFilters, setGlobalFilters] = useState<FinanceFiltersState>({
    period: 'all',
    course: 'all',
    groupId: 'all',
  });

  // Modals & Selection Drawer
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<string | undefined>();
  const [selectedParentForPayment, setSelectedParentForPayment] = useState<string | undefined>();

  const [selectedDrawerDetail, setSelectedDrawerDetail] = useState<DrawerDetailType>(null);

  // Sync with Storage events
  const syncFinanceData = useCallback(() => {
    setPayments(getStoredPayments());
    setInvoices(getStoredInvoices());
    setStudents(getStoredStudents());
    setGroups(getStoredGroups());
    setSubscriptions(getStoredSubscriptions());
  }, []);

  useFocusSync(syncFinanceData);

  useEffect(() => {
    syncFinanceData();
    window.addEventListener('crm-payments-changed', syncFinanceData);
    window.addEventListener('crm-students-changed', syncFinanceData);
    window.addEventListener('crm-invoices-changed', syncFinanceData);
    window.addEventListener('crm-groups-changed', syncFinanceData);
    window.addEventListener('crm-subscriptions-changed', syncFinanceData);
    return () => {
      window.removeEventListener('crm-payments-changed', syncFinanceData);
      window.removeEventListener('crm-students-changed', syncFinanceData);
      window.removeEventListener('crm-invoices-changed', syncFinanceData);
      window.removeEventListener('crm-groups-changed', syncFinanceData);
      window.removeEventListener('crm-subscriptions-changed', syncFinanceData);
    };
  }, [syncFinanceData]);

  useEffect(() => {
    const target = tabParam || filterParam;
    if (target === 'overdue' || target === 'debts' || target === 'debt') {
      setActiveTab('debts');
    } else if (target === 'invoices' || target === 'invoice') {
      setActiveTab('invoices');
    } else if (target === 'subscriptions' || target === 'subscription') {
      setActiveTab('subscriptions');
    } else if (target === 'payments' || target === 'payment') {
      setActiveTab('payments');
    }
  }, [tabParam, filterParam]);

  // Handlers
  const handlePaymentRecorded = (newPayment: FullPaymentData) => {
    savePaymentToStorage(newPayment);
    syncFinanceData();
  };

  const handleSubCreated = (newSub: FullSubscriptionData) => {
    saveSubscriptionToStorage(newSub);
    setSubscriptions(getStoredSubscriptions());
  };

  const handleFreezeSub = (id: string) => {
    freezeSubscriptionInStorage(id);
    setSubscriptions(getStoredSubscriptions());
  };

  const handleMarkInvoicePaid = (invoiceId: string) => {
    markInvoiceAsPaid(invoiceId);
    syncFinanceData();
  };

  const handleSettleDebtPayment = (studentId?: string, parentId?: string) => {
    setSelectedStudentForPayment(studentId);
    setSelectedParentForPayment(parentId);
    setIsPaymentModalOpen(true);
  };

  // Top-Level KPI Calculations (Strictly EUR)
  const topKpiData = useMemo(() => {
    // 1. Revenue from paid payments
    const paidList = payments.filter((p) => p.status === 'paid');
    const revenueEur = paidList.reduce((sum, p) => {
      const num = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount).replace(/[^\d.]/g, '')) || 0;
      const isEur = p.currency === 'EUR' || String(p.amount).includes('€');
      return sum + (isEur ? num : convertRubToEur(num, rate));
    }, 0);

    // 2. Expected from pending invoices & expected payments
    const pendingInvoices = invoices.filter((inv) => inv.status === 'pending');
    const expectedPayments = payments.filter((p) => p.status === 'expected');
    const expectedInvoicesEur = pendingInvoices.reduce((sum, inv) => sum + (inv.totalAmountEUR || 0), 0);
    const expectedPaymentsEur = expectedPayments.reduce((sum, p) => {
      const num = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount).replace(/[^\d.]/g, '')) || 0;
      return sum + (p.currency === 'EUR' ? num : convertRubToEur(num, rate));
    }, 0);
    const expectedEur = expectedInvoicesEur + expectedPaymentsEur;
    const expectedCount = pendingInvoices.length + expectedPayments.length;

    // 3. Debt from overdue payments & overdue invoices
    const overduePayments = payments.filter((p) => p.status === 'overdue');
    const overdueInvoices = invoices.filter((inv) => inv.status === 'overdue');
    const overduePaymentsEur = overduePayments.reduce((sum, p) => {
      const num = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount).replace(/[^\d.]/g, '')) || 0;
      return sum + (p.currency === 'EUR' ? num : convertRubToEur(num, rate));
    }, 0);
    const overdueInvoicesEur = overdueInvoices.reduce((sum, inv) => sum + (inv.totalAmountEUR || 0), 0);
    const debtEur = overduePaymentsEur + overdueInvoicesEur;

    // 4. Positive deposit balances of students
    const depositStudents = students.filter((s) => (s.finance?.deposit?.balance ?? 0) > 0);
    const depositBalanceEur = depositStudents.reduce((sum, s) => sum + (s.finance?.deposit?.balance || 0), 0);

    return {
      revenueEur,
      paidPaymentsCount: paidList.length,
      expectedEur,
      expectedCount,
      debtEur,
      debtorsCount: overduePayments.length + overdueInvoices.length,
      depositBalanceEur,
      depositStudentsCount: depositStudents.length,
    };
  }, [payments, invoices, students, rate]);

  // Debts mapping by Family (FIN-01: dynamic metrics, no mock phone)
  const debtorGroups: DebtorDetailData[] = useMemo(() => {
    const overduePayments = payments.filter((p) => p.status === 'overdue');
    const map = new Map<string, DebtorDetailData>();

    overduePayments.forEach((p) => {
      const matchedStudent = students.find((st) => st.id === p.studentId);
      const parent = matchedStudent?.parents?.[0];
      const contactPhone = parent?.phone || matchedStudent?.parentPhone || matchedStudent?.phone || '';
      const parentName = p.parentName || (parent ? `${parent.firstName} ${parent.lastName}` : 'Родитель');
      const familyKey = p.parentId || parent?.id || contactPhone || p.studentId;

      const numAmount = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount).replace(/[^\d.]/g, '')) || 0;
      const eurVal = p.currency === 'EUR' || String(p.amount).includes('€') ? numAmount : convertRubToEur(numAmount, rate);

      // Compute actual daysOverdue from payment date
      let daysOverdue = 1;
      const rawDate = p.paymentDate;
      if (rawDate) {
        let pDateMs = 0;
        if (rawDate.includes('.')) {
          const parts = rawDate.split('.');
          if (parts.length === 3) {
            pDateMs = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
          }
        } else {
          pDateMs = new Date(rawDate).getTime();
        }
        if (!isNaN(pDateMs) && pDateMs > 0) {
          const diffMs = Date.now() - pDateMs;
          daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }
      }

      // Compute lastPaymentDate from student's paid payments if any, else payment date
      const studentPaidPayments = payments.filter((item) => item.studentId === p.studentId && item.status === 'paid');
      const lastPaymentDate = studentPaidPayments.length > 0
        ? studentPaidPayments[studentPaidPayments.length - 1].paymentDate
        : p.paymentDate || '—';

      // Matched group teacher or group assigned teacher
      const matchedGroup = groups.find((g) => g.name === p.groupName);
      const responsibleName = matchedGroup?.teacherName || (matchedStudent?.groups?.[0]?.teacherName) || 'Администратор';

      const existing = map.get(familyKey);
      if (existing) {
        existing.payments.push(p);
        if (!existing.studentNames.includes(p.studentName)) {
          existing.studentNames.push(p.studentName);
        }
        existing.totalEur += eurVal;
        if (daysOverdue > existing.daysOverdue) {
          existing.daysOverdue = daysOverdue;
        }
      } else {
        map.set(familyKey, {
          familyKey,
          parentId: p.parentId || parent?.id,
          parentName,
          contactPhone,
          studentNames: [p.studentName],
          studentId: p.studentId,
          groupName: p.groupName,
          totalEur: eurVal,
          daysOverdue,
          lastPaymentDate,
          responsibleName,
          payments: [p],
        });
      }
    });

    return Array.from(map.values());
  }, [payments, students, groups, rate]);

  // Dynamic revenue growth rate calculation (FIN-02)
  const revenueGrowthPct = useMemo(() => {
    let octRev = 0;
    let sepRev = 0;
    payments.filter((p) => p.status === 'paid').forEach((p) => {
      const num = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount).replace(/[^\d.]/g, '')) || 0;
      const dStr = p.paymentDate || (p as any).date || '';
      let m = -1;
      if (dStr.includes('.')) m = parseInt(dStr.split('.')[1], 10) - 1;
      else if (dStr.includes('-')) m = parseInt(dStr.split('-')[1], 10) - 1;
      if (m === 9) octRev += num;
      else if (m === 8) sepRev += num;
      else octRev += num;
    });
    if (sepRev > 0) return Math.round(((octRev - sepRev) / sepRev) * 100);
    if (octRev > 0) return 100;
    return 0;
  }, [payments]);

  const handleExportCsv = () => {
    let csvContent = '';
    let fileName = '';

    if (activeTab === 'debts') {
      fileName = `finance_debts_${new Date().toISOString().slice(0, 10)}.csv`;
      const headers = ['Родитель', 'Телефон', 'Ученики', 'Группа', 'Сумма (€)', 'Дней просрочки', 'Последняя оплата', 'Ответственный'];
      const rows = debtorGroups.map((d) => [
        `"${d.parentName}"`,
        `"${d.contactPhone}"`,
        `"${d.studentNames.join('; ')}"`,
        `"${d.groupName || ''}"`,
        d.totalEur,
        d.daysOverdue,
        `"${d.lastPaymentDate || ''}"`,
        `"${d.responsibleName || ''}"`,
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else {
      fileName = `finance_payments_${new Date().toISOString().slice(0, 10)}.csv`;
      const headers = ['ID', 'Ученик', 'Группа', 'Сумма', 'Способ оплаты', 'Статус', 'Дата оплаты', 'Чек'];
      const rows = payments.map((p) => [
        `"${p.id}"`,
        `"${p.studentName}"`,
        `"${p.groupName || ''}"`,
        p.amount,
        `"${p.paymentMethod}"`,
        `"${p.status}"`,
        `"${p.paymentDate || ''}"`,
        `"${(p as any).receiptNumber || p.id}"`,
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Файл ${fileName} успешно экспортирован`);
  };

  if (!canViewStudentFinancialAmounts) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-lg mx-auto my-8">
        <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Доступ ограничен</h2>
        <p className="text-xs text-slate-500 max-w-sm mb-5">
          Раздел финансов, оплат и задолженностей доступен только администраторам и владельцу школы.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      {/* 1. Header with Title and Action Buttons */}
      <FinanceHeader
        canManage={Boolean(canManageStudentPayments)}
        onOpenInvoiceModal={() => setIsInvoiceModalOpen(true)}
        onOpenPaymentModal={() => {
          setSelectedStudentForPayment(undefined);
          setSelectedParentForPayment(undefined);
          setIsPaymentModalOpen(true);
        }}
        onOpenSubscriptionModal={() => setIsSubModalOpen(true)}
        onExportCsv={handleExportCsv}
      />

      {/* 2. Global Filters Bar */}
      <FinanceGlobalFilters
        filters={globalFilters}
        groups={groups}
        onChange={setGlobalFilters}
        onReset={() => setGlobalFilters({ period: 'all', course: 'all', groupId: 'all' })}
      />

      {/* 3. Top-Level 4 KPI Cards */}
      {canViewSchoolFinances && (
        <FinanceTopKpis
          revenueEur={topKpiData.revenueEur}
          paidPaymentsCount={topKpiData.paidPaymentsCount}
          expectedEur={topKpiData.expectedEur}
          expectedCount={topKpiData.expectedCount}
          debtEur={topKpiData.debtEur}
          debtorsCount={topKpiData.debtorsCount}
          depositBalanceEur={topKpiData.depositBalanceEur}
          depositStudentsCount={topKpiData.depositStudentsCount}
          revenueGrowthPct={revenueGrowthPct}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setSelectedDrawerDetail(null);
          }}
        />
      )}

      {/* 4. Navigation Tabs */}
      <div className="flex border-b border-slate-200/90 gap-1 overflow-x-auto">
        {/* Tab 1: Счета на оплату */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('invoices');
            setSelectedDrawerDetail(null);
          }}
          className={cn(
            'px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap',
            activeTab === 'invoices'
              ? 'border-blue-600 text-blue-600 bg-blue-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <Receipt className="h-3.5 w-3.5" />
          <span>Счета на оплату</span>
          <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.2 text-[10px] font-bold">
            {invoices.length}
          </span>
        </button>

        {/* Tab 2: Платежи */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('payments');
            setSelectedDrawerDetail(null);
          }}
          className={cn(
            'px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap',
            activeTab === 'payments'
              ? 'border-blue-600 text-blue-600 bg-blue-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <CreditCard className="h-3.5 w-3.5" />
          <span>Платежи</span>
          <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.2 text-[10px] font-bold">
            {payments.filter((p) => p.status === 'paid').length}
          </span>
        </button>

        {/* Tab 3: Абонементы */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('subscriptions');
            setSelectedDrawerDetail(null);
          }}
          className={cn(
            'px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap',
            activeTab === 'subscriptions'
              ? 'border-blue-600 text-blue-600 bg-blue-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Абонементы</span>
          <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.2 text-[10px] font-bold">
            {subscriptions.length}
          </span>
        </button>

        {/* Tab 4: Долги и задолженности */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('debts');
            setSelectedDrawerDetail(null);
          }}
          className={cn(
            'px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap',
            activeTab === 'debts'
              ? 'border-rose-600 text-rose-700 bg-rose-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
          <span>Долги и задолженности</span>
          <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.2 text-[10px] font-bold">
            {debtorGroups.length}
          </span>
        </button>
      </div>

      {/* 5. Main Content Area: Active Tab + Right-Side Detail Drawer */}
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* TAB 1: Счета на оплату */}
          {activeTab === 'invoices' && (
            <InvoicesTab
              invoices={invoices}
              selectedInvoiceId={
                selectedDrawerDetail?.type === 'invoice' ? selectedDrawerDetail.data.id : undefined
              }
              onSelectInvoice={(inv) => setSelectedDrawerDetail({ type: 'invoice', data: inv })}
              onMarkPaid={handleMarkInvoicePaid}
            />
          )}

          {/* TAB 2: Платежи */}
          {activeTab === 'payments' && (
            <PaymentsTab
              payments={payments}
              selectedPaymentId={
                selectedDrawerDetail?.type === 'payment' ? selectedDrawerDetail.data.id : undefined
              }
              onSelectPayment={(p) => setSelectedDrawerDetail({ type: 'payment', data: p })}
            />
          )}

          {/* TAB 3: Абонементы */}
          {activeTab === 'subscriptions' && (
            <SubscriptionsTab
              subscriptions={subscriptions}
              selectedSubscriptionId={
                selectedDrawerDetail?.type === 'subscription' ? selectedDrawerDetail.data.id : undefined
              }
              onSelectSubscription={(s) => setSelectedDrawerDetail({ type: 'subscription', data: s })}
              onFreezeSubscription={handleFreezeSub}
            />
          )}

          {/* TAB 4: Долги и задолженности */}
          {activeTab === 'debts' && (
            <DebtsTab
              debtors={debtorGroups}
              selectedDebtorKey={
                selectedDrawerDetail?.type === 'debtor' ? selectedDrawerDetail.data.familyKey : undefined
              }
              onSelectDebtor={(d) => setSelectedDrawerDetail({ type: 'debtor', data: d })}
              onSettlePayment={handleSettleDebtPayment}
            />
          )}
        </div>

        {/* Unified Right-Side Detail Drawer */}
        {selectedDrawerDetail && (
          <FinanceDetailDrawer
            detail={selectedDrawerDetail}
            onClose={() => setSelectedDrawerDetail(null)}
            onMarkInvoicePaid={handleMarkInvoicePaid}
            onSettleDebtPayment={handleSettleDebtPayment}
            onFreezeSubscription={handleFreezeSub}
          />
        )}
      </div>

      {/* Modals */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedStudentForPayment(undefined);
          setSelectedParentForPayment(undefined);
        }}
        initialStudentId={selectedStudentForPayment}
        initialParentId={selectedParentForPayment}
        onRecorded={handlePaymentRecorded}
      />

      <CreateInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          syncFinanceData();
        }}
        onInvoiceCreated={() => {
          syncFinanceData();
        }}
      />

      <CreateSubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        onCreated={handleSubCreated}
      />
    </div>
  );
}

export default function FinancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Загрузка финансов...</div>}>
      <FinanceContent />
    </Suspense>
  );
}
