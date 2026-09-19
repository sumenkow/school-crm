import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      toEmail,
      representativeName,
      studentName,
      periodLabel,
      depositBalance,
      debtBalance,
      currencySymbol = '€',
      ledgerItems = [],
      senderName = 'Администрация школы',
    } = body;

    if (!toEmail || typeof toEmail !== 'string' || !toEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Указан некорректный адрес электронной почты' },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'School CRM <onboarding@resend.dev>';

    // Build responsive HTML statement email
    const emailSubject = `💳 Финансовая выписка по обучению (${studentName || 'Ученик'})`;

    const formattedDeposit = typeof depositBalance === 'number' ? `${depositBalance.toLocaleString('ru-RU')} ${currencySymbol}` : `${depositBalance || 0} ${currencySymbol}`;
    const formattedDebt = typeof debtBalance === 'number' ? `${debtBalance.toLocaleString('ru-RU')} ${currencySymbol}` : `${debtBalance || 0} ${currencySymbol}`;

    const rowsHtml = (ledgerItems || [])
      .slice(0, 50)
      .map((item: any, idx: number) => {
        const isDeposit = item.type === 'deposit' || item.amountEUR > 0;
        const amountColor = isDeposit ? '#059669' : '#1e293b';
        const sign = isDeposit ? '+' : '';
        const amtStr = `${sign}${item.amountEUR || 0} ${currencySymbol}`;
        const balStr = `${item.balanceEUR || 0} ${currencySymbol}`;

        return `
          <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
            <td style="padding: 10px 12px; font-size: 13px; color: #475569;">${item.date || '—'}</td>
            <td style="padding: 10px 12px; font-size: 13px; color: #0f172a; font-weight: 500;">${item.description || '—'}</td>
            <td style="padding: 10px 12px; font-size: 12px; color: #64748b;">${item.method || '—'}</td>
            <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: ${amountColor}; text-align: right;">${amtStr}</td>
            <td style="padding: 10px 12px; font-size: 13px; font-weight: 600; color: #334155; text-align: right;">${balStr}</td>
          </tr>
        `;
      })
      .join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${emailSubject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #334155;">
          <div style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            
            <!-- Header -->
            <div style="background-color: #0f172a; padding: 24px 32px; color: #ffffff;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: #ffffff;">Финансовая выписка по обучению</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Ученик: <strong style="color: #ffffff;">${studentName || 'Ученик'}</strong> • Период: <strong style="color: #e2e8f0;">${periodLabel || 'За всё время'}</strong></p>
            </div>

            <!-- Body -->
            <div style="padding: 24px 32px;">
              <p style="font-size: 14px; margin-top: 0; color: #334155;">Уважаемый(ая) <strong>${representativeName || 'Родитель'}</strong>,</p>
              <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 20px;">
                Направляем вам подробный отчет о движении денежных средств и состоянии личного депозита по обучению.
              </p>

              <!-- Summary Cards -->
              <table style="width: 100%; border-collapse: separate; border-spacing: 12px 0; margin-bottom: 24px; margin-left: -12px;">
                <tr>
                  <td style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; width: 50%;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #166534; display: block;">Баланс депозита</span>
                    <strong style="font-size: 18px; color: #15803d; display: block; margin-top: 4px;">${formattedDeposit}</strong>
                  </td>
                  <td style="background-color: ${debtBalance > 0 ? '#fef2f2' : '#f8fafc'}; border: 1px solid ${debtBalance > 0 ? '#fecaca' : '#e2e8f0'}; border-radius: 12px; padding: 16px; width: 50%;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: ${debtBalance > 0 ? '#991b1b' : '#64748b'}; display: block;">Задолженность</span>
                    <strong style="font-size: 18px; color: ${debtBalance > 0 ? '#dc2626' : '#334155'}; display: block; margin-top: 4px;">${formattedDebt}</strong>
                  </td>
                </tr>
              </table>

              <!-- Ledger Table -->
              <h2 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">Детализация операций (${ledgerItems.length})</h2>
              <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 12px; color: #64748b;">
                    <th style="padding: 10px 12px;">Дата</th>
                    <th style="padding: 10px 12px;">Операция</th>
                    <th style="padding: 10px 12px;">Способ</th>
                    <th style="padding: 10px 12px; text-align: right;">Сумма</th>
                    <th style="padding: 10px 12px; text-align: right;">Остаток</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml || '<tr><td colspan="5" style="padding: 16px; text-align: center; color: #94a3b8;">Операций за выбранный период не найдено</td></tr>'}
                </tbody>
              </table>
            </div>

            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0;">С уважением, <strong>${senderName}</strong></p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #cbd5e1;">Данное письмо сгенерировано автоматически из CRM системы школы.</p>
            </div>

          </div>
        </body>
      </html>
    `;

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY environment variable is not configured.');
      return NextResponse.json(
        {
          error: 'RESEND_API_KEY не настроен в окружении сервера. Укажите RESEND_API_KEY в .env.local или в настройках Vercel.',
        },
        { status: 500 }
      );
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail.trim()],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', resData);
      return NextResponse.json(
        { error: resData.message || resData.error || 'Ошибка при отправке письма через Resend API' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: resData.id,
    });
  } catch (err: any) {
    console.error('Error in send statement route:', err);
    return NextResponse.json(
      { error: err.message || 'Внутренняя ошибка сервера при отправке отчета' },
      { status: 500 }
    );
  }
}
