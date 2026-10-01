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

        // 1. Fetch candidates from DB
        const [{ data: allDbStudents }, { data: allDbParents }, { data: allDbLeads }] = await Promise.all([
          supabase.from('students').select('id, first_name, last_name, telegram'),
          supabase.from('parents').select('id, first_name, last_name, telegram'),
          supabase.from('leads').select('id, name, contact, telegram'),
        ]);

        const strChatId = chatId ? String(chatId).trim() : '';

        // TIER 1: Exact numeric chatId match (highest confidence)
        if (strChatId) {
          const stExact = (allDbStudents || []).find((s) => s.telegram && String(s.telegram).trim() === strChatId);
          if (stExact) {
            matchedStudentId = stExact.id;
            matchedEntityName = `Ученик: ${stExact.first_name || ''} ${stExact.last_name || ''}`.trim();
          }

          if (!matchedStudentId) {
            const prExact = (allDbParents || []).find((p) => p.telegram && String(p.telegram).trim() === strChatId);
            if (prExact) {
              matchedParentId = prExact.id;
              matchedEntityName = `Родитель: ${prExact.first_name || ''} ${prExact.last_name || ''}`.trim();
            }
          }

          if (!matchedStudentId && !matchedParentId) {
            const ldExact = (allDbLeads || []).find((l) => (l.telegram && String(l.telegram).trim() === strChatId) || (l.contact && String(l.contact).trim() === strChatId));
            if (ldExact) {
              matchedLeadId = ldExact.id;
              matchedEntityName = `Лид: ${ldExact.name || ''}`.trim();
            }
          }
        }

        // TIER 2: If not found by exact numeric chatId, look for recent outbound dialog context
        // Check who received the last outbound Telegram message from this sender or recently in CRM
        if (!matchedStudentId && !matchedParentId && !matchedLeadId) {
          // Look up all entities that match by username or searchTerms
          const matchingStudents = (allDbStudents || []).filter((s) => {
            if (!s.telegram) return false;
            const norm = String(s.telegram).trim().toLowerCase();
            return searchTerms.some((term) => norm === term.toLowerCase() || norm.replace(/^@/, '') === term.toLowerCase().replace(/^@/, ''));
          });

          const matchingParents = (allDbParents || []).filter((p) => {
            if (!p.telegram) return false;
            const norm = String(p.telegram).trim().toLowerCase();
            return searchTerms.some((term) => norm === term.toLowerCase() || norm.replace(/^@/, '') === term.toLowerCase().replace(/^@/, ''));
          });

          const matchingLeads = (allDbLeads || []).filter((l) => {
            const contactNorm = l.contact ? String(l.contact).trim().toLowerCase() : '';
            const tgNorm = l.telegram ? String(l.telegram).trim().toLowerCase() : '';
            return searchTerms.some((term) => {
              const t = term.toLowerCase().replace(/^@/, '');
              return (contactNorm && contactNorm.replace(/^@/, '') === t) || (tgNorm && tgNorm.replace(/^@/, '') === t);
            });
          });

          const candidateStudentIds = matchingStudents.map((s) => s.id);
          const candidateParentIds = matchingParents.map((p) => p.id);
          const candidateLeadIds = matchingLeads.map((l) => l.id);

          // If multiple candidates exist, check who was contacted most recently in interactions
          if (candidateStudentIds.length + candidateParentIds.length + candidateLeadIds.length > 1) {
            const { data: recentOutbound } = await supabase
              .from('interactions')
              .select('student_id, parent_id, lead_id, created_at')
              .eq('channel', 'telegram')
              .order('created_at', { ascending: false })
              .limit(10);

            if (recentOutbound && recentOutbound.length > 0) {
              for (const row of recentOutbound) {
                if (row.student_id && candidateStudentIds.includes(row.student_id)) {
                  matchedStudentId = row.student_id;
                  const st = matchingStudents.find((s) => s.id === row.student_id);
                  matchedEntityName = `Ученик: ${st?.first_name || ''} ${st?.last_name || ''}`.trim();
                  break;
                }
                if (row.parent_id && candidateParentIds.includes(row.parent_id)) {
                  matchedParentId = row.parent_id;
                  const pr = matchingParents.find((p) => p.id === row.parent_id);
                  matchedEntityName = `Родитель: ${pr?.first_name || ''} ${pr?.last_name || ''}`.trim();
                  break;
                }
                if (row.lead_id && candidateLeadIds.includes(row.lead_id)) {
                  matchedLeadId = row.lead_id;
                  const ld = matchingLeads.find((l) => l.id === row.lead_id);
                  matchedEntityName = `Лид: ${ld?.name || ''}`.trim();
                  break;
                }
              }
            }
          }

          // Fallback to first matching candidate if no outbound context found
          if (!matchedStudentId && !matchedParentId && !matchedLeadId) {
            if (matchingStudents.length > 0) {
              matchedStudentId = matchingStudents[0].id;
              matchedEntityName = `Ученик: ${matchingStudents[0].first_name || ''} ${matchingStudents[0].last_name || ''}`.trim();
            } else if (matchingParents.length > 0) {
              matchedParentId = matchingParents[0].id;
              matchedEntityName = `Родитель: ${matchingParents[0].first_name || ''} ${matchingParents[0].last_name || ''}`.trim();
            } else if (matchingLeads.length > 0) {
              matchedLeadId = matchingLeads[0].id;
              matchedEntityName = `Лид: ${matchingLeads[0].name || ''}`.trim();
            }
          }
        }

        // TIER 3: Auto-bind numeric chatId if not yet recorded
        if (strChatId) {
          try {
            if (matchedStudentId) {
              await supabase.from('students').update({ telegram: strChatId }).eq('id', matchedStudentId);
            } else if (matchedParentId) {
              await supabase.from('parents').update({ telegram: strChatId }).eq('id', matchedParentId);
            } else if (matchedLeadId) {
              await supabase.from('leads').update({ telegram: strChatId }).eq('id', matchedLeadId);
            }
          } catch (bindErr) {
            console.warn('Auto-binding chatId error in webhook:', bindErr);
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
