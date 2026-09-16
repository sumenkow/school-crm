import { FullLeadData, INITIAL_LEADS } from './mockData';
import { createClient } from '@/lib/supabase/client';

const LEADS_STORAGE_KEY = 'crm_leads_v2';

export function getStoredLeads(includeConverted: boolean = false): FullLeadData[] {
  if (typeof window === 'undefined') {
    return includeConverted ? INITIAL_LEADS : INITIAL_LEADS.filter((l) => (l.status as string) !== 'enrolled');
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

    if (!includeConverted) {
      return leads.filter((l) => (l.status as string) !== 'enrolled');
    }
    return leads;
  } catch (err) {
    console.error('Failed to get stored leads:', err);
    return includeConverted ? INITIAL_LEADS : INITIAL_LEADS.filter((l) => (l.status as string) !== 'enrolled');
  }
}

export function syncLeadToSupabase(lead: FullLeadData): void {
  if (typeof window === 'undefined') return;

  try {
    const supabase = createClient();
    supabase.from('leads').upsert({
      id: lead.id,
      name: lead.name,
      contact: lead.contact,
      parent_name: (lead as any).parentName || lead.name || null,
      student_name: lead.studentName || null,
      direction_course: lead.directionOrCourse,
      level: lead.level || null,
      source: lead.source,
      status: (lead.status as any) || 'new',
      offer_amount: lead.offerAmount ? (typeof lead.offerAmount === 'number' ? lead.offerAmount : parseFloat(String(lead.offerAmount).replace(/[^\d.,]/g, '').replace(',', '.')) || null) : null,
      comment: lead.comment || null,
      is_mock_data: false,
    }).then(({ error }) => {
      if (error) console.error('Error upserting lead to Supabase:', error);
    });
  } catch (e) {
    console.error('Error initializing Supabase client for lead dual-write:', e);
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

  syncLeadToSupabase(lead);
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

