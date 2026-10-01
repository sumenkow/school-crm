import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/telegram/messages?type=student&id=xxx
 * Returns recent telegram-channel interactions for a specific entity.
 * Lightweight endpoint designed for frequent polling (every 3-5s).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('type'); // student | parent | lead
    const entityId = searchParams.get('id');

    if (!entityType || !entityId) {
      return NextResponse.json({ success: false, error: 'Missing type or id' }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createAdminClient();

    // Build query for the specific entity type
    let query = supabase
      .from('interactions')
      .select('id, student_id, parent_id, lead_id, channel, type, content, result, occurred_at, created_at')
      .eq('channel', 'telegram')
      .order('created_at', { ascending: true })
      .limit(50);

    if (entityType === 'student') {
      query = query.eq('student_id', entityId);
    } else if (entityType === 'parent') {
      query = query.eq('parent_id', entityId);
    } else if (entityType === 'lead') {
      query = query.eq('lead_id', entityId);
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
