import { FullLeadData, INITIAL_LEADS } from './mockData';
import { persistEntityToCloud } from './cloudSync';

const LEADS_STORAGE_KEY = 'crm_leads_v2';

export function getStoredLeads(includeConverted: boolean = false, includeDeleted: boolean = false): FullLeadData[] {
  const filterLeads = (leads: FullLeadData[]) => {
    let res = leads;
    if (!includeDeleted) {
      res = res.filter((l) => !l.is_deleted && !(l as any).isDeleted);
    }
    if (!includeConverted) {
      res = res.filter((l) => (l.status as string) !== 'enrolled');
    }
    return res;
  };

  if (typeof window === 'undefined') {
    return filterLeads(INITIAL_LEADS);
  }

  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    let leads: FullLeadData[] = INITIAL_LEADS;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const storedMap = new Map<string, FullLeadData>(parsed.map((l) => [l.id, l]));
        const merged: FullLeadData[] = [];
        for (const init of INITIAL_LEADS) {
          if (storedMap.has(init.id)) {
            merged.push(storedMap.get(init.id)!);
            storedMap.delete(init.id);
          } else {
            merged.push(init);
          }
        }
        for (const extra of storedMap.values()) {
          merged.unshift(extra);
        }
        leads = merged;
      }
    }

    return filterLeads(leads);
  } catch (err) {
    console.error('Failed to get stored leads:', err);
    return filterLeads(INITIAL_LEADS);
  }
}

export function saveLeadToStorage(lead: FullLeadData): void {
  const currentLeads = getStoredLeads(true);
  const idx = currentLeads.findIndex((l) => l.id === lead.id);
  if (idx !== -1) {
    currentLeads[idx] = lead;
  } else {
    currentLeads.unshift(lead);
  }

  // Also update in-memory INITIAL_LEADS
  const initIdx = INITIAL_LEADS.findIndex((l) => l.id === lead.id);
  if (initIdx !== -1) {
    INITIAL_LEADS[initIdx] = lead;
  } else {
    INITIAL_LEADS.unshift(lead);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(currentLeads));
      window.dispatchEvent(new CustomEvent('crm-leads-changed', { detail: lead }));
    } catch (e) {
      console.error('Failed to write lead to localStorage:', e);
    }
  }

  persistEntityToCloud('lead', lead);
}

export function syncLeadToSupabase(lead: FullLeadData): void {
  persistEntityToCloud('lead', lead);
}

export function qualifyAndConvertLead(leadId: string, convertedStudentId: string, convertedParentId?: string): void {
  const currentLeads = getStoredLeads(true);
  const targetLead = currentLeads.find((l) => l.id === leadId);
  if (targetLead) {
    targetLead.status = 'enrolled' as any;
    targetLead.convertedStudentId = convertedStudentId;
    if (convertedParentId) targetLead.convertedParentId = convertedParentId;
    saveLeadToStorage(targetLead);
  }
}

export function softDeleteLead(leadId: string): void {
  const currentLeads = getStoredLeads(true, true);
  const targetLead = currentLeads.find((l) => l.id === leadId);
  if (targetLead) {
    const now = new Date().toISOString();
    targetLead.isDeleted = true;
    targetLead.is_deleted = true;
    targetLead.deletedAt = now;
    targetLead.deleted_at = now;
    saveLeadToStorage(targetLead);
    persistEntityToCloud('lead', { id: leadId }, 'delete');
  }
}

export function restoreLead(leadId: string): void {
  const currentLeads = getStoredLeads(true, true);
  const targetLead = currentLeads.find((l) => l.id === leadId);
  if (targetLead) {
    targetLead.isDeleted = false;
    targetLead.is_deleted = false;
    targetLead.deletedAt = undefined;
    targetLead.deleted_at = undefined;
    saveLeadToStorage(targetLead);
    persistEntityToCloud('lead', targetLead);
  }
}

