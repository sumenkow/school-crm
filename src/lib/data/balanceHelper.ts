'use client';

import { getStoredStudents } from './studentStorage';
import { FullStudentData, FullLeadData } from './mockData';

export function normalizeContact(contact?: string): string {
  if (!contact) return '';
  return contact.replace(/[^\d\w]/g, '').toLowerCase();
}

export interface UnifiedFinancialSummary {
  deposit: number;
  debt: number;
  netBalance: number; // deposit - debt
  isNegative: boolean; // netBalance < 0 or debt > 0
  formattedNet: string; // e.g. "-5 000 ₽" or "+3 000 ₽" or "0 ₽"
  formattedDebt: string; // e.g. "-5 000 ₽"
  formattedDeposit: string; // e.g. "+3 000 ₽"
  currency: string;
  linkedStudent?: {
    id: string;
    name: string;
    debt: number;
    deposit: number;
  };
  linkedParent?: {
    id: string;
    name: string;
    totalFamilyDebt: number;
    totalFamilyDeposit: number;
  };
}

/**
 * Calculates unified financial summary for a student.
 */
export function getStudentFinancialSummary(
  studentId: string,
  studentsList?: FullStudentData[]
): UnifiedFinancialSummary {
  const allStudents = studentsList || (typeof window !== 'undefined' ? getStoredStudents() : []);
  const student = allStudents.find((s) => s.id === studentId);

  if (!student) {
    return {
      deposit: 0,
      debt: 0,
      netBalance: 0,
      isNegative: false,
      formattedNet: '0 ₽',
      formattedDebt: '0 ₽',
      formattedDeposit: '0 ₽',
      currency: '₽',
    };
  }

  const deposit = student.finance?.deposit?.balance || 0;
  const overduePayments = (student.finance?.payments || []).filter((p) => p.status === 'overdue');
  const debt = overduePayments.reduce((sum, p) => {
    const num = parseFloat(p.amount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    return sum + num;
  }, 0);

  const netBalance = deposit - debt;
  const isNegative = debt > 0 || netBalance < 0;
  const currency = student.finance?.deposit?.currency === 'EUR' ? '€' : '₽';

  return {
    deposit,
    debt,
    netBalance,
    isNegative,
    formattedNet:
      netBalance < 0
        ? `-${Math.abs(netBalance).toLocaleString('ru-RU')} ${currency}`
        : netBalance > 0
        ? `+${netBalance.toLocaleString('ru-RU')} ${currency}`
        : `0 ${currency}`,
    formattedDebt: debt > 0 ? `-${debt.toLocaleString('ru-RU')} ${currency}` : `0 ${currency}`,
    formattedDeposit: deposit > 0 ? `+${deposit.toLocaleString('ru-RU')} ${currency}` : `0 ${currency}`,
    currency,
  };
}

/**
 * Calculates unified family financial summary across all children of a parent.
 */
export function getParentFinancialSummary(
  parentId: string,
  studentsList?: FullStudentData[]
): UnifiedFinancialSummary & { childrenSummaries: Array<{ id: string; name: string; debt: number; deposit: number }> } {
  const allStudents = studentsList || (typeof window !== 'undefined' ? getStoredStudents() : []);

  // Find all children that have this parent
  const familyChildren = allStudents.filter((s) =>
    s.parents?.some((p) => p.id === parentId)
  );

  let totalDeposit = 0;
  let totalDebt = 0;
  const childrenSummaries: Array<{ id: string; name: string; debt: number; deposit: number }> = [];

  for (const child of familyChildren) {
    const sSummary = getStudentFinancialSummary(child.id, allStudents);
    totalDeposit += sSummary.deposit;
    totalDebt += sSummary.debt;
    childrenSummaries.push({
      id: child.id,
      name: `${child.firstName} ${child.lastName}`,
      debt: sSummary.debt,
      deposit: sSummary.deposit,
    });
  }

  const netBalance = totalDeposit - totalDebt;
  const isNegative = totalDebt > 0 || netBalance < 0;

  return {
    deposit: totalDeposit,
    debt: totalDebt,
    netBalance,
    isNegative,
    formattedNet:
      netBalance < 0
        ? `-${Math.abs(netBalance).toLocaleString('ru-RU')} ₽`
        : netBalance > 0
        ? `+${netBalance.toLocaleString('ru-RU')} ₽`
        : '0 ₽',
    formattedDebt: totalDebt > 0 ? `-${totalDebt.toLocaleString('ru-RU')} ₽` : '0 ₽',
    formattedDeposit: totalDeposit > 0 ? `+${totalDeposit.toLocaleString('ru-RU')} ₽` : '0 ₽',
    currency: '₽',
    childrenSummaries,
  };
}

/**
 * Calculates end-to-end unified financial summary for a lead.
 * Seamlessly resolves linked student or linked parent and cascades balances & debts!
 */
export function getLeadFinancialSummary(
  lead: FullLeadData | { id: string; contact?: string; telegram?: string; studentName?: string; name?: string; convertedStudentId?: string; convertedParentId?: string; finance?: any; offerAmount?: string },
  studentsList?: FullStudentData[]
): UnifiedFinancialSummary {
  const allStudents = studentsList || (typeof window !== 'undefined' ? getStoredStudents() : []);

  const leadContactNorm = normalizeContact(lead.contact);
  const leadTelegramNorm = normalizeContact(lead.telegram);

  // 1. Resolve Linked Student
  let linkedStudent: FullStudentData | undefined;
  if (lead.convertedStudentId) {
    linkedStudent = allStudents.find((s) => s.id === lead.convertedStudentId);
  }

  if (!linkedStudent && (leadContactNorm || leadTelegramNorm)) {
    linkedStudent = allStudents.find((s) => {
      const sPhone = normalizeContact(s.phone);
      const sTg = normalizeContact(s.telegram);
      if (leadContactNorm && sPhone && (sPhone.includes(leadContactNorm) || leadContactNorm.includes(sPhone))) return true;
      if (leadTelegramNorm && sTg && (sTg.includes(leadTelegramNorm) || leadTelegramNorm.includes(sTg))) return true;
      return false;
    });
  }

  // 2. Resolve Linked Parent
  let linkedParent: { id: string; name: string } | undefined;
  if (lead.convertedParentId) {
    for (const s of allStudents) {
      const p = s.parents?.find((parent) => parent.id === lead.convertedParentId);
      if (p) {
        linkedParent = { id: p.id, name: `${p.firstName} ${p.lastName}`.trim() || 'Родитель' };
        break;
      }
    }
  }

  if (!linkedParent && (leadContactNorm || leadTelegramNorm)) {
    for (const s of allStudents) {
      const p = s.parents?.find((parent) => {
        const pPhone = normalizeContact(parent.phone);
        const pTg = normalizeContact(parent.telegram);
        if (leadContactNorm && pPhone && (pPhone.includes(leadContactNorm) || leadContactNorm.includes(pPhone))) return true;
        if (leadTelegramNorm && pTg && (pTg.includes(leadTelegramNorm) || leadTelegramNorm.includes(pTg))) return true;
        return false;
      });
      if (p) {
        linkedParent = { id: p.id, name: `${p.firstName} ${p.lastName}`.trim() || 'Родитель' };
        if (!linkedStudent) linkedStudent = s;
        break;
      }
    }
  }

  // 3. Compute direct lead payments / deposits
  const directLeadDeposit = lead.finance?.deposit?.balance || 0;
  const directLeadPayments = lead.finance?.payments || [];
  const directLeadDebt = directLeadPayments
    .filter((p: any) => p.status === 'overdue')
    .reduce((sum: number, p: any) => {
      const num = parseFloat(String(p.amount).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      return sum + num;
    }, 0);

  // 4. Combine with linked Student / Parent
  let combinedDeposit = directLeadDeposit;
  let combinedDebt = directLeadDebt;

  let linkedStudentInfo: { id: string; name: string; debt: number; deposit: number } | undefined;
  let linkedParentInfo: { id: string; name: string; totalFamilyDebt: number; totalFamilyDeposit: number } | undefined;

  if (linkedStudent) {
    const sSummary = getStudentFinancialSummary(linkedStudent.id, allStudents);
    combinedDeposit = Math.max(combinedDeposit, sSummary.deposit);
    combinedDebt = Math.max(combinedDebt, sSummary.debt);
    linkedStudentInfo = {
      id: linkedStudent.id,
      name: `${linkedStudent.firstName} ${linkedStudent.lastName}`,
      debt: sSummary.debt,
      deposit: sSummary.deposit,
    };
  }

  if (linkedParent) {
    const pSummary = getParentFinancialSummary(linkedParent.id, allStudents);
    combinedDeposit = Math.max(combinedDeposit, pSummary.deposit);
    combinedDebt = Math.max(combinedDebt, pSummary.debt);
    linkedParentInfo = {
      id: linkedParent.id,
      name: linkedParent.name,
      totalFamilyDebt: pSummary.debt,
      totalFamilyDeposit: pSummary.deposit,
    };
  }

  const netBalance = combinedDeposit - combinedDebt;
  const isNegative = combinedDebt > 0 || netBalance < 0;

  return {
    deposit: combinedDeposit,
    debt: combinedDebt,
    netBalance,
    isNegative,
    formattedNet:
      netBalance < 0
        ? `-${Math.abs(netBalance).toLocaleString('ru-RU')} ₽`
        : netBalance > 0
        ? `+${netBalance.toLocaleString('ru-RU')} ₽`
        : '0 ₽',
    formattedDebt: combinedDebt > 0 ? `-${combinedDebt.toLocaleString('ru-RU')} ₽` : '0 ₽',
    formattedDeposit: combinedDeposit > 0 ? `+${combinedDeposit.toLocaleString('ru-RU')} ₽` : '0 ₽',
    currency: '₽',
    linkedStudent: linkedStudentInfo,
    linkedParent: linkedParentInfo,
  };
}
