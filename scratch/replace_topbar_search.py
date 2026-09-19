import sys

with open('src/components/layout/TopBar.tsx', 'r') as f:
    lines = f.readlines()

out = []
skip = False
for i, line in enumerate(lines):
    # Change md:hidden to lg:hidden for Menu button
    if 'className="md:hidden flex items-center justify-center touch-target-44' in line:
        line = line.replace('md:hidden', 'lg:hidden')
    
    if '{/* Desktop & Tablet Search Bar */}' in line:
        skip = True
        out.append(line)
        out.append("""      <div
        className="flex-1 max-w-sm hidden sm:flex items-center cursor-text transition-all"
        onClick={() => setPaletteOpen(true)}
      >
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <div className="w-full h-9 rounded-full bg-slate-100 flex items-center pl-9 pr-3 hover:bg-slate-200/70 transition-colors border border-transparent">
            <span className="text-[13px] text-slate-500 font-medium">{t('topbar.searchPlaceholder', 'Быстрый поиск... (Cmd+K)')}</span>
          </div>
        </div>
      </div>\n""")
        continue
    
    if skip and '{/* Spacer */}' in line:
        skip = False
        
    if not skip:
        out.append(line)

with open('src/components/layout/TopBar.tsx', 'w') as f:
    f.writelines(out)
