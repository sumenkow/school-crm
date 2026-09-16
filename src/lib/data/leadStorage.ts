import { FullLeadData } from './mockData';
import { createClient } from '@/lib/supabase/client';

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
