import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// In-memory / server fallback store in case Supabase table doesn't have custom columns
let serverCachedSettings: any = null;

export async function GET() {
  try {
    let dbOwnerProfile: any = null;

    try {
      const admin = createAdminClient();
      // Look for owner or developer profile in Supabase
      const { data: owners } = await admin
        .from('profiles')
        .select('id, email, full_name, phone, role, updated_at')
        .in('role', ['owner', 'developer'])
        .order('updated_at', { ascending: false })
        .limit(1);

      if (owners && owners.length > 0) {
        dbOwnerProfile = owners[0];
      }
    } catch (dbErr) {
      console.warn('Could not read profiles from Supabase admin:', dbErr);
    }

    return NextResponse.json({
      success: true,
      ownerProfile: dbOwnerProfile,
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
    const { schoolSettings, ownerProfile } = body;

    if (schoolSettings) {
      serverCachedSettings = { ...serverCachedSettings, ...schoolSettings, updatedAt: new Date().toISOString() };
    }

    let updatedDb = false;

    try {
      const admin = createAdminClient();

      // If owner profile provided or school email needs to update owner profile
      if (ownerProfile?.email || ownerProfile?.fullName || schoolSettings?.email) {
        // Fetch existing owner profile or default ID
        const { data: owners } = await admin
          .from('profiles')
          .select('id, email, role')
          .in('role', ['owner', 'developer'])
          .limit(1);

        const targetId = owners && owners.length > 0 ? owners[0].id : '00000000-0000-0000-0000-000000000001';
        const targetEmail = ownerProfile?.email || (owners && owners.length > 0 ? owners[0].email : null) || schoolSettings?.email || 'owner@school.ru';
        const targetName = ownerProfile?.userName || ownerProfile?.fullName || schoolSettings?.legalEntity || schoolSettings?.name || 'Руководитель школы';

        const { error: upsertErr } = await admin.from('profiles').upsert({
          id: targetId,
          email: targetEmail,
          full_name: targetName,
          phone: ownerProfile?.phone || schoolSettings?.phone || null,
          role: 'owner',
          updated_at: new Date().toISOString(),
        });

        if (!upsertErr) {
          updatedDb = true;
        } else {
          console.warn('Upsert profile error:', upsertErr);
        }
      }
    } catch (dbErr) {
      console.warn('Supabase DB write warning:', dbErr);
    }

    return NextResponse.json({
      success: true,
      persistedToDb: updatedDb,
      schoolSettings: serverCachedSettings,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
