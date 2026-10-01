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
              telegram: String(chatId),
            }).eq('id', targetId);
          } else if (targetType === 'lead' && targetId) {
            await supabase.from('leads').update({
              telegram: String(chatId),
            }).eq('id', targetId);
          } else if (targetType === 'parent' && targetId) {
            await supabase.from('parents').update({
              telegram: String(chatId),
            }).eq('id', targetId);
          }

          // Insert timeline connection interaction
          await supabase.from('interactions').insert({
            student_id: targetType === 'student' ? targetId : null,
            lead_id: targetType === 'lead' ? targetId : null,
            parent_id: targetType === 'parent' ? targetId : null,
            channel: 'telegram',
            type: 'status_change',
            content: `Подключен Telegram: ${senderName} (${senderUsername ? `${senderUsername} • ` : ''}Chat ID: ${chatId})`,
            result: 'Telegram привязан к CRM',
            occurred_at: new Date().toISOString(),
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

    const cleanUsername = (senderUsername || '').replace(/^@/, '').trim();
    const searchTerms: string[] = [];
    if (chatId) {
      searchTerms.push(String(chatId));
    }
    if (cleanUsername) {
      searchTerms.push(cleanUsername);
      searchTerms.push(`@${cleanUsername}`);
    }

    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const supabase = createAdminClient();

        // 1. Check all students in DB
        const { data: allDbStudents } = await supabase.from('students').select('id, first_name, last_name, telegram');
        if (allDbStudents && allDbStudents.length > 0) {
          const stMatch = allDbStudents.find((s) => {
            if (!s.telegram) return false;
            const norm = String(s.telegram).trim().toLowerCase();
            return searchTerms.some((term) => norm === term.toLowerCase() || norm.replace(/^@/, '') === term.toLowerCase().replace(/^@/, ''));
          });
          if (stMatch) {
            matchedStudentId = stMatch.id;
            matchedEntityName = `Ученик: ${stMatch.first_name || ''} ${stMatch.last_name || ''}`.trim();
          }
        }

        // 2. Check parents in DB
        if (!matchedStudentId) {
          const { data: allDbParents } = await supabase.from('parents').select('id, first_name, last_name, telegram');
          if (allDbParents && allDbParents.length > 0) {
            const prMatch = allDbParents.find((p) => {
              if (!p.telegram) return false;
              const norm = String(p.telegram).trim().toLowerCase();
              return searchTerms.some((term) => norm === term.toLowerCase() || norm.replace(/^@/, '') === term.toLowerCase().replace(/^@/, ''));
            });
            if (prMatch) {
              matchedParentId = prMatch.id;
              matchedEntityName = `Родитель: ${prMatch.first_name || ''} ${prMatch.last_name || ''}`.trim();
            }
          }
        }

        // 3. Check leads in DB
        if (!matchedStudentId && !matchedParentId) {
          const { data: allDbLeads } = await supabase.from('leads').select('id, name, contact');
          if (allDbLeads && allDbLeads.length > 0) {
            const ldMatch = allDbLeads.find((l) => {
              if (!l.contact) return false;
              const norm = String(l.contact).trim().toLowerCase();
              return searchTerms.some((term) => norm === term.toLowerCase() || norm.replace(/^@/, '') === term.toLowerCase().replace(/^@/, ''));
            });
            if (ldMatch) {
              matchedLeadId = ldMatch.id;
              matchedEntityName = `Лид: ${ldMatch.name || ''}`.trim();
            }
          }
        }

        // Save incoming interaction to Supabase interactions table
        await supabase.from('interactions').insert({
          student_id: matchedStudentId,
          lead_id: matchedLeadId,
          parent_id: matchedParentId,
          channel: 'telegram',
          type: 'follow_up',
          content: `💬 Входящее в Telegram: «${text}»`,
          result: `Сообщение от ${senderName}${matchedEntityName ? ` (${matchedEntityName})` : ''}`,
          occurred_at: new Date().toISOString(),
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
