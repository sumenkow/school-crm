import sys

with open('src/app/dashboard/page.tsx', 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if line.startswith('function OwnerDashboard({'):
        start_idx = i
        break

if start_idx != -1:
    for i in range(start_idx, len(lines)):
        if lines[i].startswith('}'):
            end_idx = i
            break

with open('scratch/new_owner_dashboard.tsx', 'r') as f:
    new_component = f.read()

if start_idx != -1 and end_idx != -1:
    # combine
    with open('src/app/dashboard/page.tsx', 'w') as f:
        f.writelines(lines[:start_idx])
        f.write(new_component + '\n')
        f.writelines(lines[end_idx+1:])
    print("Replaced successfully")
else:
    print("Failed to find boundaries")
