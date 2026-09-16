import { getStoredStudents } from './studentStorage';
import { FullStudentData, FullLeadData } from './mockData';
import { calculateMultiCurrencyTotals, getEurRubRate, convertEurToRub, convertRubToEur } from './currencyHelper';

export function normalizeContact(contact?: string): string {
  if (!contact) return '';
  return contact.replace(/[^\d\w]/g, '').toLowerCase();
}

export interface UnifiedFinancialSummary {
  deposit: number; // total in EUR
  depositRub: number; // total in RUB
  debt: number; // total in EUR
  debtRub: number; // total in RUB
  netBalance: number; // total in EUR (deposit - debt)
  netBalanceRub: number; // total in RUB (depositRub - debtRub)
  isNegative: boolean; // netBalance < 0 or debt > 0
  formattedNet: string; // e.g. "+85 € (≈ +8 500 ₽)" or "-84 € (≈ -8 400 ₽)" or "0 €"
  formattedDebt: string; // e.g. "-84 € (≈ -8 400 ₽)" or "0 €"
  formattedDeposit: string; // e.g. "+85 € (≈ +8 500 ₽)" or "0 €"
  breakdownSummary: string; // e.g. "85 € в евро (курс 100 ₽/€)"
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
 * Calculates unified financial summary for a student in primary EUR with converted RUB.
 */
export function getStudentFinancialSummary(
  studentId: string,
  studentsList?: FullStudentData[]
): UnifiedFinancialSummary {
  const rate = getEurRubRate();
  const allStudents = studentsList || (typeof window !== 'undefined' ? getStoredStudents() : []);
  const student = allStudents.find((s) => s.id === studentId);

  if (!student) {
    return {
      deposit: 0,
      depositRub: 0,
      debt: 0,
      debtRub: 0,
      netBalance: 0,
      netBalanceRub: 0,
      isNegative: false,
      formattedNet: '0 € (0 ₽)',
      formattedDebt: '0 € (0 ₽)',
      formattedDeposit: '0 € (0 ₽)',
      breakdownSummary: `0 € (курс ${rate} ₽/€)`,
      currency: '€',
    };
  }

  // 1. Calculate Deposit in EUR & RUB
  const rawDep = student.finance?.deposit?.balance || 0;
  const isDepEur = student.finance?.deposit?.currency === 'EUR' || rawDep <= 500;
  const depositEur = isDepEur ? rawDep : Math.round((rawDep / rate) * 100) / 100;
  const depositRub = isDepEur ? Math.round(rawDep * rate) : rawDep;

  // 2. Calculate Overdue Debt in EUR & RUB
  const overduePayments = (student.finance?.payments || []).filter((p) => p.status === 'overdue');
  const debtTotals = calculateMultiCurrencyTotals(
    overduePayments.map((p: any) => ({
      amount: p.amount,
      currency: p.currency || (typeof p.amount === 'string' && p.amount.includes('€') ? 'EUR' : undefined),
    })),
    rate
  );

  const debtEur = debtTotals.totalEur;
  const debtRub = debtTotals.totalRub;

  // 3. Net balance
  const netBalanceEur = Math.round((depositEur - debtEur) * 100) / 100;
  const netBalanceRub = depositRub - debtRub;
  const isNegative = debtEur > 0 || netBalanceEur < 0;

  const formattedNet =
    netBalanceEur < 0
      ? `-${Math.abs(netBalanceEur).toLocaleString('ru-RU')} € (≈ -${Math.abs(netBalanceRub).toLocaleString('ru-RU')} ₽)`
      : netBalanceEur > 0
      ? `+${netBalanceEur.toLocaleString('ru-RU')} € (≈ +${netBalanceRub.toLocaleString('ru-RU')} ₽)`
      : '0 € (0 ₽)';

  const formattedDebt =
    debtEur > 0
      ? `-${debtEur.toLocaleString('ru-RU')} € (≈ -${debtRub.toLocaleString('ru-RU')} ₽)`
      : '0 € (0 ₽)';

  const formattedDeposit =
    depositEur > 0
      ? `+${depositEur.toLocaleString('ru-RU')} € (≈ +${depositRub.toLocaleString('ru-RU')} ₽)`
      : '0 € (0 ₽)';

  let breakdownSummary = '';
  if (depositEur > 0 && isDepEur) {
    breakdownSummary = `${depositEur.toLocaleString('ru-RU')} € в евро (≈ ${depositRub.toLocaleString('ru-RU')} ₽)`;
  } else if (depositEur > 0) {
    breakdownSummary = `${depositEur.toLocaleString('ru-RU')} € (сконвертировано из ${depositRub.toLocaleString('ru-RU')} ₽ по курсу ${rate} ₽/€)`;
  } else if (debtEur > 0) {
    breakdownSummary = `Долг: ${debtTotals.breakdownSummary}`;
  } else {
    breakdownSummary = `0 € (курс ${rate} ₽/€)`;
  }

  return {
    deposit: depositEur,
    depositRub,
    debt: debtEur,
    debtRub,
    netBalance: netBalanceEur,
    netBalanceRub,
    isNegative,
    formattedNet,
    formattedDebt,
    formattedDeposit,
    breakdownSummary,
    currency: '€',
  };
}

/**
 * Calculates unified family financial summary across all children of a parent.
 */
export function getParentFinancialSummary(
  parentId: string,
  studentsList?: FullStudentData[]
): UnifiedFinancialSummary & { childrenSummaries: Array<{ id: string; name: string; debt: number; deposit: number }> } {
  const rate = getEurRubRate();
  const allStudents = studentsList || (typeof window !== 'undefined' ? getStoredStudents() : []);

  // Find all children that have this parent
  const familyChildren = allStudents.filter((s) =>
    s.parents?.some((p) => p.id === parentId)
  );

  let totalDepositEur = 0;
  let totalDepositRub = 0;
  let totalDebtEur = 0;
  let totalDebtRub = 0;
  const childrenSummaries: Array<{ id: string; name: string; debt: number; deposit: number }> = [];

  for (const child of familyChildren) {
    const sSummary = getStudentFinancialSummary(child.id, allStudents);
    totalDepositEur += sSummary.deposit;
    totalDepositRub += sSummary.depositRub;
    totalDebtEur += sSummary.debt;
    totalDebtRub += sSummary.debtRub;
    childrenSummaries.push({
      id: child.id,
      name: `${child.firstName} ${child.lastName}`,
      debt: sSummary.debt,
      deposit: sSummary.deposit,
    });
  }

  const netBalanceEur = Math.round((totalDepositEur - totalDebtEur) * 100) / 100;
  const netBalanceRub = totalDepositRub - totalDebtRub;
  const isNegative = totalDebtEur > 0 || netBalanceEur < 0;

  const formattedNet =
    netBalanceEur < 0
      ? `-${Math.abs(netBalanceEur).toLocaleString('ru-RU')} € (≈ -${Math.abs(netBalanceRub).toLocaleString('ru-RU')} ₽)`
      : netBalanceEur > 0
      ? `+${netBalanceEur.toLocaleString('ru-RU')} € (≈ +${netBalanceRub.toLocaleString('ru-RU')} ₽)`
      : '0 € (0 ₽)';

  const formattedDebt =
    totalDebtEur > 0
      ? `-${totalDebtEur.toLocaleString('ru-RU')} € (≈ -${totalDebtRub.toLocaleString('ru-RU')} ₽)`
      : '0 € (0 ₽)';

  const formattedDeposit =
    totalDepositEur > 0
      ? `+${totalDepositEur.toLocaleString('ru-RU')} € (≈ +${totalDepositRub.toLocaleString('ru-RU')} ₽)`
      : '0 € (0 ₽)';

  return {
    deposit: totalDepositEur,
    depositRub: totalDepositRub,
    debt: totalDebtEur,
    debtRub: totalDebtRub,
    netBalance: netBalanceEur,
    netBalanceRub,
    isNegative,
    formattedNet,
    formattedDebt,
    formattedDeposit,
    breakdownSummary: `Баланс семьи: ${formattedNet} (курс ${rate} ₽/€)`,
    currency: '€',
    childrenSummaries,
  };
}

/**
 * Calculates end-to-end unified financial summary for a lead.
 */
export function getLeadFinancialSummary(
  lead: FullLeadData | { id: string; contact?: string; telegram?: string; studentName?: string; name?: string; convertedStudentId?: string; convertedParentId?: string; finance?: any; offerAmount?: string },
  studentsList?: FullStudentData[]
): UnifiedFinancialSummary {
  const rate = getEurRubRate();
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
  const directLeadDepositRaw = lead.finance?.deposit?.balance || 0;
  const isDepEur = lead.finance?.deposit?.currency === 'EUR' || directLeadDepositRaw <= 500;
  const directLeadDepositEur = isDepEur ? directLeadDepositRaw : Math.round((directLeadDepositRaw / rate) * 100) / 100;
  const directLeadDepositRub = isDepEur ? Math.round(directLeadDepositRaw * rate) : directLeadDepositRaw;

  const directLeadPayments = lead.finance?.payments || [];
  const directDebtTotals = calculateMultiCurrencyTotals(
    directLeadPayments
      .filter((p: any) => p.status === 'overdue')
      .map((p: any) => ({
        amount: p.amount,
        currency: p.currency || (typeof p.amount === 'string' && p.amount.includes('€') ? 'EUR' : undefined),
      })),
    rate
  );

  let combinedDepositEur = directLeadDepositEur;
  let combinedDepositRub = directLeadDepositRub;
  let combinedDebtEur = directDebtTotals.totalEur;
  let combinedDebtRub = directDebtTotals.totalRub;

  let linkedStudentInfo: { id: string; name: string; debt: number; deposit: number } | undefined;
  let linkedParentInfo: { id: string; name: string; totalFamilyDebt: number; totalFamilyDeposit: number } | undefined;

  if (linkedStudent) {
    const sSummary = getStudentFinancialSummary(linkedStudent.id, allStudents);
    combinedDepositEur = Math.max(combinedDepositEur, sSummary.deposit);
    combinedDepositRub = Math.max(combinedDepositRub, sSummary.depositRub);
    combinedDebtEur = Math.max(combinedDebtEur, sSummary.debt);
    combinedDebtRub = Math.max(combinedDebtRub, sSummary.debtRub);
    linkedStudentInfo = {
      id: linkedStudent.id,
      name: `${linkedStudent.firstName} ${linkedStudent.lastName}`,
      debt: sSummary.debt,
      deposit: sSummary.deposit,
    };
  }

  if (linkedParent) {
    const pSummary = getParentFinancialSummary(linkedParent.id, allStudents);
    combinedDepositEur = Math.max(combinedDepositEur, pSummary.deposit);
    combinedDepositRub = Math.max(combinedDepositRub, pSummary.depositRub);
    combinedDebtEur = Math.max(combinedDebtEur, pSummary.debt);
    combinedDebtRub = Math.max(combinedDebtRub, pSummary.debtRub);
    linkedParentInfo = {
      id: linkedParent.id,
      name: linkedParent.name,
      totalFamilyDebt: pSummary.debt,
      totalFamilyDeposit: pSummary.deposit,
    };
  }

  const netBalanceEur = Math.round((combinedDepositEur - combinedDebtEur) * 100) / 100;
  const netBalanceRub = combinedDepositRub - combinedDebtRub;
  const isNegative = combinedDebtEur > 0 || netBalanceEur < 0;

  const formattedNet =
    netBalanceEur < 0
      ? `-${Math.abs(netBalanceEur).toLocaleString('ru-RU')} € (≈ -${Math.abs(netBalanceRub).toLocaleString('ru-RU')} ₽)`
      : netBalanceEur > 0
      ? `+${netBalanceEur.toLocaleString('ru-RU')} € (≈ +${netBalanceRub.toLocaleString('ru-RU')} ₽)`
      : '0 € (0 ₽)';

  const formattedDebt =
    combinedDebtEur > 0
      ? `-${combinedDebtEur.toLocaleString('ru-RU')} € (≈ -${combinedDebtRub.toLocaleString('ru-RU')} ₽)`
      : '0 € (0 ₽)';

  const formattedDeposit =
    combinedDepositEur > 0
      ? `+${combinedDepositEur.toLocaleString('ru-RU')} € (≈ +${combinedDepositRub.toLocaleString('ru-RU')} ₽)`
      : '0 € (0 ₽)';

  return {
    deposit: combinedDepositEur,
    depositRub: combinedDepositRub,
    debt: combinedDebtEur,
    debtRub: combinedDebtRub,
    netBalance: netBalanceEur,
    netBalanceRub,
    isNegative,
    formattedNet,
    formattedDebt,
    formattedDeposit,
    breakdownSummary: `Баланс лида: ${formattedNet} (курс ${rate} ₽/€)`,
    currency: '€',
    linkedStudent: linkedStudentInfo,
    linkedParent: linkedParentInfo,
  };
}

