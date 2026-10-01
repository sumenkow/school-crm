import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function toUUID(str?: string): string {
  if (!str) return '00000000-0000-0000-0000-000000000000';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str;
  }
  const fixedMap: Record<string, string> = {
    '1': 'b1111111-1111-4111-8111-111111111111',
    '2': 'b2222222-2222-4222-8222-222222222222',
    '3': 'b3333333-3333-4333-8333-333333333333',
    '4': 'b4444444-4444-4444-8444-444444444444',
    '5': 'b5555555-5555-4555-8555-555555555555',
    '6': 'b6666666-6666-4666-8666-666666666666',
    'st_1': 'b1111111-1111-4111-8111-111111111111',
    'st_2': 'b2222222-2222-4222-8222-222222222222',
    'st_3': 'b3333333-3333-4333-8333-333333333333',
    'st_4': 'b4444444-4444-4444-8444-444444444444',
    'st_5': 'b5555555-5555-4555-8555-555555555555',
    'st_6': 'b6666666-6666-4666-8666-666666666666',
    'p1': 'a1111111-1111-4111-8111-111111111111',
    'p2': 'a2222222-2222-4222-8222-222222222222',
    'p3': 'a3333333-3333-4333-8333-333333333333',
    'p4': 'a4444444-4444-4444-8444-444444444444',
    'p5': 'a5555555-5555-4555-8555-555555555555',
    'p6': 'a6666666-6666-4666-8666-666666666666',
    'p7': 'a7777777-7777-4777-8777-777777777777',
    'lead_1': 'd1111111-1111-4111-8111-111111111111',
    'lead_2': 'd2222222-2222-4222-8222-222222222222',
    'lead_3': 'd3333333-3333-4333-8333-333333333333',
  };
  if (fixedMap[str]) return fixedMap[str];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const tail = Math.abs(hash * 31).toString(16).padStart(12, '0').slice(0, 12);
  return `${hex.slice(0, 8)}-aaaa-4aaa-8aaa-${tail}`;
}

/**
 * GET /api/telegram/messages?type=student&id=xxx
 * Returns recent telegram-channel interactions for a specific entity.
 * Lightweight endpoint designed for frequent polling (every 3-5s).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('type'); // student | parent | lead
    const rawEntityId = searchParams.get('id');

    if (!entityType || !rawEntityId) {
      return NextResponse.json({ success: false, error: 'Missing type or id' }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
    }

    const entityUuid = toUUID(rawEntityId);
    const supabase = createAdminClient();

    // Build query for the specific entity type using valid UUID
    let query = supabase
      .from('interactions')
      .select('id, student_id, parent_id, lead_id, channel, type, content, result, occurred_at, created_at')
      .eq('channel', 'telegram')
      .order('created_at', { ascending: true })
      .limit(100);

    if (entityType === 'student') {
      query = query.eq('student_id', entityUuid);
    } else if (entityType === 'parent') {
      query = query.eq('parent_id', entityUuid);
    } else if (entityType === 'lead') {
      query = query.eq('lead_id', entityUuid);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Telegram messages query error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Only keep actual chat messages (sent via bot or received from client).
    // Service records (profile changes, bot connections) stay in the timeline only.
    const chatMessages = (data || []).filter((i: any) => {
      const c = (i.content || '');
      // Actual sent message from CRM
      if (c.startsWith('✈️ Сообщение в Telegram:')) return true;
      // Actual incoming message from client
      if (c.startsWith('💬 Входящее в Telegram:')) return true;
      return false;
    });

    const messages = chatMessages.map((i: any) => {
      const isIncoming = (i.content || '').startsWith('💬 Входящее в Telegram:');

      // Extract clean message text (strip wrapper)
      let text = i.content || '';
      text = text
        .replace(/^✈️ Сообщение в Telegram: «/, '')
        .replace(/^💬 Входящее в Telegram: «/, '')
        .replace(/»$/, '');

      return {
        id: i.id,
        text,
        direction: isIncoming ? 'incoming' : 'outgoing',
        occurredAt: i.occurred_at || i.created_at,
        result: isIncoming ? (i.result || undefined) : undefined,
      };
    });

    return NextResponse.json({
      success: true,
      messages,
      count: messages.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Telegram messages API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
