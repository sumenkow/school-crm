import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendTelegramDirectMessage, resolveBotToken } from '@/lib/telegram/telegramClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'CRM Telegram Webhook',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();

    if (!update || !update.message) {
      return NextResponse.json({ ok: true, skipped: 'No message in update' });
    }

    const message = update.message;
    const chatId = message.chat?.id;
    const text = (message.text || '').trim();
    const fromUser = message.from;

    if (!chatId || !text) {
      return NextResponse.json({ ok: true, skipped: 'Empty text or chatId' });
    }

    const botToken = resolveBotToken();
    const senderUsername = fromUser?.username ? `@${fromUser.username}` : '';
    const senderName = [fromUser?.first_name, fromUser?.last_name].filter(Boolean).join(' ') || senderUsername || 'Клиент Telegram';

    // 1. Handle /start with deeplink (e.g., /start st_123, /start lead_456, /start par_789)
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const startPayload = parts.length > 1 ? parts[1].trim() : '';

      let targetType: 'student' | 'lead' | 'parent' | null = null;
      let targetId: string | null = null;

      if (startPayload.startsWith('st_')) {
        targetType = 'student';
        targetId = startPayload.replace('st_', '');
      } else if (startPayload.startsWith('lead_')) {
        targetType = 'lead';
        targetId = startPayload.replace('lead_', '');
      } else if (startPayload.startsWith('par_')) {
        targetType = 'parent';
        targetId = startPayload.replace('par_', '');
      }

      // Record connection in Supabase if Supabase is configured
      try {
        if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          const supabase = createAdminClient();

          if (targetType === 'student' && targetId) {
            await supabase.from('students').update({
              telegram: senderUsername || String(chatId),
            }).eq('id', targetId);
          } else if (targetType === 'lead' && targetId) {
            await supabase.from('leads').update({
              telegram: senderUsername || String(chatId),
            }).eq('id', targetId);
          } else if (targetType === 'parent' && targetId) {
            await supabase.from('parents').update({
              telegram: senderUsername || String(chatId),
            }).eq('id', targetId);
          }

          // Insert timeline connection interaction
          await supabase.from('interactions').insert({
            id: `int_tg_bind_${Date.now()}`,
            student_id: targetType === 'student' ? targetId : null,
            lead_id: targetType === 'lead' ? targetId : null,
            parent_id: targetType === 'parent' ? targetId : null,
            type: 'status_change',
            title: 'Telegram подключен',
            description: `Подключен Telegram: ${senderName} (${senderUsername || `ID: ${chatId}`})`,
            created_at: new Date().toISOString(),
            is_mock_data: false,
          });
        }
      } catch (dbErr) {
        console.warn('DB logging error during /start in Telegram webhook:', dbErr);
      }

      // Send greeting response to the user in Telegram
      if (botToken) {
        await sendTelegramDirectMessage({
          token: botToken,
          chatId,
          text: `👋 *Здравствуйте, ${fromUser?.first_name || 'дорогой друг'}!*\n\nВы успешно подключились к чату нашей школы.\n\nЗдесь вы будете получать важные уведомления о расписании, занятиях и оплатах. Также вы можете задавать любые вопросы прямо в этом чате — администратор ответит вам в рабочее время.`,
          parseMode: 'Markdown',
        });
      }

      return NextResponse.json({
        ok: true,
        action: 'bound_telegram_account',
        targetType,
        targetId,
        chatId,
      });
    }

    // 2. Handle normal incoming client message
    let matchedStudentId: string | null = null;
    let matchedLeadId: string | null = null;
    let matchedParentId: string | null = null;
    let matchedEntityName: string = '';

    const searchQueries: string[] = [];
    if (senderUsername) {
      searchQueries.push(`telegram.eq.${senderUsername}`);
      searchQueries.push(`telegram.eq.${senderUsername.replace('@', '')}`);
    }
    if (chatId) {
      searchQueries.push(`telegram.eq.${chatId}`);
    }

    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const supabase = createAdminClient();

        if (searchQueries.length > 0) {
          const filterStr = searchQueries.join(',');

          // Search students
          const { data: st } = await supabase
            .from('students')
            .select('id, first_name, last_name')
            .or(filterStr)
            .limit(1)
            .maybeSingle();

          if (st) {
            matchedStudentId = st.id;
            matchedEntityName = `Ученик: ${st.first_name || ''} ${st.last_name || ''}`.trim();
          }

          // Search leads
          if (!matchedStudentId) {
            const { data: ld } = await supabase
              .from('leads')
              .select('id, name')
              .or(filterStr)
              .limit(1)
              .maybeSingle();

            if (ld) {
              matchedLeadId = ld.id;
              matchedEntityName = `Лид: ${ld.name || ''}`.trim();
            }
          }

          // Search parents
          if (!matchedStudentId && !matchedLeadId) {
            const { data: pr } = await supabase
              .from('parents')
              .select('id, first_name, last_name')
              .or(filterStr)
              .limit(1)
              .maybeSingle();

            if (pr) {
              matchedParentId = pr.id;
              matchedEntityName = `Родитель: ${pr.first_name || ''} ${pr.last_name || ''}`.trim();
            }
          }
        }

        // Save incoming interaction to Supabase interactions table
        await supabase.from('interactions').insert({
          id: `int_tg_in_${Date.now()}`,
          student_id: matchedStudentId,
          lead_id: matchedLeadId,
          parent_id: matchedParentId,
          type: 'follow_up',
          title: `Сообщение от ${senderName}${matchedEntityName ? ` (${matchedEntityName})` : ''}`,
          description: text,
          created_at: new Date().toISOString(),
          is_mock_data: false,
        });
      }
    } catch (dbErr) {
      console.warn('DB logging error for incoming message in Telegram webhook:', dbErr);
    }

    // Forward incoming message notification to Administrator
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
    if (botToken && adminChatId && String(adminChatId) !== String(chatId)) {
      try {
        const clientDesc = matchedEntityName || 'Новый контакт (не привязан к CRM)';
        await sendTelegramDirectMessage({
          token: botToken,
          chatId: adminChatId,
          text: `💬 *Новое входящее сообщение в Telegram*\n\n👤 *${senderName}* (${senderUsername || `ID: ${chatId}`})\n🏷 *Статус:* ${clientDesc}\n\n📝 *Текст сообщения:*\n«${text}»\n\n_Ответить можно прямо из CRM_`,
          parseMode: 'Markdown',
        });
      } catch (forwardErr) {
        console.warn('Could not forward client message to Admin TG:', forwardErr);
      }
    }

    return NextResponse.json({
      ok: true,
      action: 'received_message',
      chatId,
      sender: senderName,
      matchedStudentId,
      matchedLeadId,
      matchedParentId,
      matchedEntityName,
    });
  } catch (error: any) {
    console.error('Error handling Telegram Webhook:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
