import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Try Central Bank of Russia (CBR) JSON API
    try {
      const cbrRes = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', {
        headers: {
          'User-Agent': 'SchoolCRM/1.0',
        },
        next: { revalidate: 3600 },
      });

      if (cbrRes.ok) {
        const data = await cbrRes.json();
        const eurVal = data?.Valute?.EUR?.Value;
        const prevVal = data?.Valute?.EUR?.Previous;
        const dateStr = data?.Date;

        if (typeof eurVal === 'number' && eurVal > 0) {
          const rate = Math.round(eurVal * 100) / 100;
          return NextResponse.json({
            success: true,
            rate,
            source: 'ЦБ РФ (Официальный курс)',
            previousRate: prevVal ? Math.round(prevVal * 100) / 100 : undefined,
            updatedAt: dateStr || new Date().toISOString(),
          });
        }
      }
    } catch (cbrErr) {
      console.warn('CBR exchange rate API error, falling back to FX API:', cbrErr);
    }

    // 2. Fallback: International open FX API
    try {
      const fxRes = await fetch('https://open.er-api.com/v6/latest/EUR', {
        next: { revalidate: 3600 },
      });

      if (fxRes.ok) {
        const data = await fxRes.json();
        const rubVal = data?.rates?.RUB;
        if (typeof rubVal === 'number' && rubVal > 0) {
          const rate = Math.round(rubVal * 100) / 100;
          return NextResponse.json({
            success: true,
            rate,
            source: 'Международный курс (Open FX)',
            updatedAt: data?.time_last_update_utc || new Date().toISOString(),
          });
        }
      }
    } catch (fxErr) {
      console.warn('Open FX exchange rate API error:', fxErr);
    }

    // 3. Fallback: Default rate
    return NextResponse.json({
      success: true,
      rate: 100,
      source: 'Базовый курс (резервный)',
      updatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message, rate: 100 }, { status: 500 });
  }
}
