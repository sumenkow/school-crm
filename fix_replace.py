import sys

with open('src/app/dashboard/page.tsx', 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if line.startswith('function OwnerDashboard({'):
        start_idx = i
    if line.startswith('// 2. ADMIN DASHBOARD'):
        # Admin dashboard header is at 795
        # The function ends around 792. Let's find the '}' just before the Admin header
        for j in range(i-1, start_idx, -1):
            if lines[j].strip() == '}':
                end_idx = j
                break
        break

if start_idx != -1 and end_idx != -1:
    with open('scratch/new_owner_dashboard.tsx', 'r') as f:
        new_component = f.read()

    with open('src/app/dashboard/page.tsx', 'w') as f:
        f.writelines(lines[:start_idx])
        f.write(new_component + '\n')
        f.writelines(lines[end_idx+1:])
    print("Replaced successfully")
else:
    print("Failed to find boundaries", start_idx, end_idx)
