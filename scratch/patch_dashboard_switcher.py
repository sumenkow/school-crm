import sys

with open('src/app/dashboard/page.tsx', 'r') as f:
    content = f.read()

# 1. Add imports at the top
imports = """import { useIsMobile } from '@/hooks/useIsMobile';
import { useDashboardState } from '@/features/dashboard/hooks/useDashboardState';
import { DashboardDesktop } from '@/features/dashboard/components/DashboardDesktop';
import { DashboardMobile } from '@/features/dashboard/components/DashboardMobile';"""

content = content.replace("import { CreateLeadModal } from '@/components/crm/CreateLeadModal';", "import { CreateLeadModal } from '@/components/crm/CreateLeadModal';\n" + imports)

# 2. Replace OwnerDashboard body
old_owner_start_idx = content.find("function OwnerDashboard({")
old_owner_end_idx = content.find("// ─────────────────────────────────────────────────────────────────────────────\n// 2. ADMIN DASHBOARD")

if old_owner_start_idx != -1 and old_owner_end_idx != -1:
    new_owner_dashboard = """function OwnerDashboard({
  onOpenReport,
  onOpenExecutiveReport,
}: {
  onOpenReport: () => void;
  onOpenExecutiveReport?: () => void;
}) {
  const isMobile = useIsMobile(1024);
  const dashboardState = useDashboardState();

  return isMobile ? (
    <DashboardMobile {...dashboardState} onOpenReport={onOpenReport} onOpenExecutiveReport={onOpenExecutiveReport} />
  ) : (
    <DashboardDesktop {...dashboardState} onOpenReport={onOpenReport} onOpenExecutiveReport={onOpenExecutiveReport} />
  );
}

"""
    content = content[:old_owner_start_idx] + new_owner_dashboard + content[old_owner_end_idx:]
    with open('src/app/dashboard/page.tsx', 'w') as f:
        f.write(content)
    print("OwnerDashboard successfully replaced with View Switcher!")
else:
    print("Could not locate OwnerDashboard bounds", old_owner_start_idx, old_owner_end_idx)
