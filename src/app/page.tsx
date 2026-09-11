import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  let hasUser = false;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    hasUser = !!user;
  } catch {
    hasUser = false;
  }

  if (!hasUser) {
    redirect('/login');
  } else {
    redirect('/dashboard');
  }
}
