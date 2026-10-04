import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// In-memory / server fallback store in case Supabase table doesn't have custom columns
let serverCachedSettings: any = null;

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      schoolSettings: serverCachedSettings,
      serverTimestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schoolSettings } = body;

    if (schoolSettings) {
      serverCachedSettings = { ...serverCachedSettings, ...schoolSettings, updatedAt: new Date().toISOString() };
    }

    return NextResponse.json({
      success: true,
      schoolSettings: serverCachedSettings,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
