import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendTelegramDirectMessage, resolveBotToken } from '@/lib/telegram/telegramClient';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      invoice,
      channel = 'telegram', // 'telegram' | 'email'
      customBotToken,
    } = body;

    if (!invoice || !invoice.invoiceNumber) {
      return NextResponse.json({ success: false, error: 'Данные счёта не переданы' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invoiceUrl = `${origin}/invoices/${invoice.id}`;

    // 1. Send via Telegram Bot
    if (channel === 'telegram') {
      const chatId = invoice.parentTelegram || invoice.studentTelegram;
      if (!chatId) {
        return NextResponse.json(
          { success: false, error: 'У получателя не привязан Telegram (Chat ID не найден)' },
          { status: 400 }
        );
      }

      const botToken = resolveBotToken(customBotToken);
      if (!botToken) {
        return NextResponse.json(
          { success: false, error: 'Telegram Bot Token не настроен. Укажите токен в Настройках CRM.' },
          { status: 400 }
        );
      }

      const bank = invoice.bankDetails || {
        accountHolder: 'Ekaterina Nezhenkina',
        iban: 'SK34 1100 0000 0029 3766 3128',
        swiftBic: 'TATRSKBX',
      };

      // Format clean message in exact German format as requested
      const textMessage = [
        `🧾 *Die Rechnung für den Kurs „${invoice.courseName}“*`,
        ``,
        `*Kontoinhaber:* ${bank.accountHolder}`,
        `*Faktur Nummer:* ${invoice.invoiceNumber}`,
        `*Bis dahin zu zahlen:* ${invoice.dueDate}`,
        `*IBAN:* \`${bank.iban}\``,
        bank.swiftBic ? `*SWIFT/BIC:* \`${bank.swiftBic}\`` : '',
        `*Genaue Summe:* ${invoice.totalAmountEUR.toFixed(2)} €`,
        `Bitte geben Sie Ihre «Fakturnummer» (${invoice.invoiceNumber}) als Verwendungszweck an.`,
        ``,
        `👉 [Rechnung & QR-Code für Banküberweisung öffnen](${invoiceUrl})`,
      ].filter(Boolean).join('\n');

      const sendResult = await sendTelegramDirectMessage({
        token: botToken,
        chatId,
        text: textMessage,
        parseMode: 'Markdown',
      });

      if (!sendResult.success) {
        return NextResponse.json(
          { success: false, error: sendResult.error || 'Ошибка отправки в Telegram' },
          { status: 502 }
        );
      }

      // Log interaction to Supabase & CRM Timeline
      try {
        if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          const supabase = createAdminClient();
          await supabase.from('interactions').insert({
            student_id: invoice.studentId || null,
            parent_id: invoice.parentId || null,
            channel: 'telegram',
            type: 'follow_up',
            content: `✈️ Сообщение в Telegram: «Die Rechnung für den Kurs „${invoice.courseName}“, Faktur Nummer: ${invoice.invoiceNumber}, Summe: ${invoice.totalAmountEUR.toFixed(2)} €»`,
            result: `Выставлен счёт № ${invoice.invoiceNumber} (VS: ${invoice.variableSymbol}) на сумму ${invoice.totalAmountEUR.toFixed(2)} €`,
            occurred_at: new Date().toISOString(),
          });
        }
      } catch (dbErr) {
        console.warn('Could not log invoice send to Supabase:', dbErr);
      }

      return NextResponse.json({
        success: true,
        channel: 'telegram',
        messageId: sendResult.messageId,
        invoiceUrl,
      });
    }

    // 2. Email fallback / preview
    return NextResponse.json({
      success: true,
      channel: 'email',
      invoiceUrl,
    });
  } catch (err: any) {
    console.error('Invoice send API error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 });
  }
}
