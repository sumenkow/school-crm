import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Helper: ensure caller is an authenticated owner
async function verifyOwner() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['developer', 'owner'].includes(profile.role)) {
    return { error: 'Доступ разрешен только владельцу или разработчику', status: 403 };
  }

  return { currentUserId: user.id, callerRole: profile.role as 'developer' | 'owner' };
}

// GET /api/auth/users — list all team members
export async function GET() {
  const check = await verifyOwner();
  if ('error' in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    const admin = createAdminClient();
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: profiles });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/auth/users — create user directly with login & password
export async function POST(request: NextRequest) {
  const check = await verifyOwner();
  if ('error' in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    const body = await request.json();
    const { email, password, full_name, role, phone } = body as {
      email: string;
      password?: string;
      full_name: string;
      role: 'owner' | 'admin' | 'teacher';
      phone?: string;
    };

    if (!email || !full_name || !role) {
      return NextResponse.json({ error: 'Заполните email, имя и выберите роль' }, { status: 400 });
    }

    if (role === 'owner') {
      if (check.callerRole !== 'developer') {
        return NextResponse.json({ error: 'Назначать роль Владельца может только Разработчик системы' }, { status: 403 });
      }
    } else if (role !== 'admin' && role !== 'teacher') {
      return NextResponse.json({ error: 'Можно создавать только Администраторов или Преподавателей' }, { status: 400 });
    }

    const initialPassword = password || Math.random().toString(36).slice(-8) + 'Aa1!';
    if (initialPassword.length < 6) {
      return NextResponse.json({ error: 'Пароль должен содержать не менее 6 символов' }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Create auth user in Supabase Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: initialPassword,
      email_confirm: true,
      user_metadata: { role, full_name },
    });

    if (authError) {
      const msg = authError.message.includes('already been registered')
        ? 'Пользователь с таким email уже существует в системе'
        : authError.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const newUserId = authData.user.id;

    // 2. Upsert profile record
    const { error: profileError } = await admin
      .from('profiles')
      .upsert({
        id: newUserId,
        email,
        full_name,
        role,
        phone: phone || null,
        is_active: true,
      });

    if (profileError) {
      console.error('Profile upsert warning:', profileError);
    }

    // 3. If teacher, also create record in teachers table
    if (role === 'teacher') {
      const nameParts = full_name.trim().split(/\s+/);
      const firstName = nameParts[0] || full_name;
      const lastName = nameParts.slice(1).join(' ') || '—';

      await admin
        .from('teachers')
        .insert({
          user_id: newUserId,
          first_name: firstName,
          last_name: lastName,
          email,
          phone: phone || null,
          status: 'active',
        });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUserId,
        email,
        full_name,
        role,
        generatedPassword: initialPassword,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/auth/users — update employee profile & password
export async function PATCH(request: NextRequest) {
  const check = await verifyOwner();
  if ('error' in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    const body = await request.json();
    const { id, full_name, phone, role, is_active, new_password } = body as {
      id: string;
      full_name: string;
      phone?: string;
      role?: 'admin' | 'teacher';
      is_active?: boolean;
      new_password?: string;
    };

    if (!id || !full_name) {
      return NextResponse.json({ error: 'Укажите ID и имя сотрудника' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check existing target profile
    const { data: targetProfile, error: fetchError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !targetProfile) {
      return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 });
    }

    // Only developer can escalate role to owner
    if (role === 'owner' && targetProfile.role !== 'owner' && check.callerRole !== 'developer') {
      return NextResponse.json({ error: 'Назначать роль Владельца может только Разработчик системы' }, { status: 403 });
    }

    // Owner role cannot be changed by non-developer
    const effectiveRole = targetProfile.role === 'owner' && check.callerRole !== 'developer' ? 'owner' : (role || targetProfile.role);

    // 1. If new password provided, update via Supabase Admin API
    if (new_password && new_password.trim().length > 0) {
      if (new_password.trim().length < 6) {
        return NextResponse.json({ error: 'Новый пароль должен содержать не менее 6 символов' }, { status: 400 });
      }

      const { error: pwdError } = await admin.auth.admin.updateUserById(id, {
        password: new_password.trim(),
        user_metadata: { role: effectiveRole, full_name: full_name.trim() },
      });

      if (pwdError) {
        return NextResponse.json({ error: pwdError.message }, { status: 400 });
      }
    } else {
      // Keep user_metadata synchronized
      await admin.auth.admin.updateUserById(id, {
        user_metadata: { role: effectiveRole, full_name: full_name.trim() },
      });
    }

    // 2. Update profiles table
    const { data: updatedProfile, error: updateError } = await admin
      .from('profiles')
      .update({
        full_name: full_name.trim(),
        phone: phone ? phone.trim() : null,
        role: effectiveRole,
        is_active: typeof is_active === 'boolean' ? is_active : targetProfile.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. Keep teachers table synchronized
    if (effectiveRole === 'teacher') {
      const nameParts = full_name.trim().split(/\s+/);
      const firstName = nameParts[0] || full_name;
      const lastName = nameParts.slice(1).join(' ') || '—';

      await admin
        .from('teachers')
        .upsert({
          user_id: id,
          first_name: firstName,
          last_name: lastName,
          email: targetProfile.email,
          phone: phone ? phone.trim() : null,
          status: is_active === false ? 'inactive' : 'active',
        }, { onConflict: 'user_id' });
    }

    return NextResponse.json({ success: true, user: updatedProfile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/auth/users — delete user account
export async function DELETE(request: NextRequest) {
  const check = await verifyOwner();
  if ('error' in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('id');

    if (!targetUserId) {
      return NextResponse.json({ error: 'Укажите ID пользователя' }, { status: 400 });
    }

    if (targetUserId === check.currentUserId) {
      return NextResponse.json({ error: 'Владелец не может удалить свой собственный аккаунт' }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Delete from auth.users (cascades)
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(targetUserId);
    if (deleteAuthError) {
      return NextResponse.json({ error: deleteAuthError.message }, { status: 400 });
    }

    // 2. Also ensure profile and teacher records are removed
    await admin.from('profiles').delete().eq('id', targetUserId);
    await admin.from('teachers').delete().eq('user_id', targetUserId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
