import sys

with open('src/app/dashboard/page.tsx', 'r') as f:
    content = f.read()

# Add import for createClient if not present
if "import { createClient } from '@/lib/supabase/client';" not in content:
    content = content.replace("import { useRouter } from 'next/navigation';", "import { useRouter } from 'next/navigation';\nimport { createClient } from '@/lib/supabase/client';")

# Inject useEffect inside OwnerDashboard
target_marker = "const [teachersList, setTeachersList] = useState(["
realtime_code = """  useEffect(() => {
    // 1. Same-window custom event listeners for reactive UI
    const handleStorageChange = (e: any) => {
      if (e?.detail?.id) {
        setAttentionItems(prev => prev.filter(i => i.entityId !== e.detail.id));
      }
    };
    window.addEventListener('crm-tasks-changed', handleStorageChange);
    window.addEventListener('crm-payments-changed', handleStorageChange);
    window.addEventListener('crm-leads-changed', handleStorageChange);

    // 2. Cross-device / Multi-tab Supabase Realtime Subscription
    let channel: any;
    try {
      const supabase = createClient();
      channel = supabase
        .channel('dashboard-realtime-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          (payload) => {
            console.log('⚡ Realtime Supabase DB Update:', payload);
            if (payload.new && (payload.new as any).id) {
              const updatedId = (payload.new as any).id;
              setAttentionItems(prev => prev.filter(i => i.entityId !== updatedId));
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription warning:', e);
    }

    return () => {
      window.removeEventListener('crm-tasks-changed', handleStorageChange);
      window.removeEventListener('crm-payments-changed', handleStorageChange);
      window.removeEventListener('crm-leads-changed', handleStorageChange);
      if (channel) {
        try {
          const supabase = createClient();
          supabase.removeChannel(channel);
        } catch (e) {}
      }
    };
  }, []);

  """ + target_marker

content = content.replace(target_marker, realtime_code, 1)

with open('src/app/dashboard/page.tsx', 'w') as f:
    f.write(content)

print("Realtime sync patched successfully!")
