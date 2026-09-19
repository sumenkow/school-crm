import sys

with open('src/app/dashboard/page.tsx', 'r') as f:
    content = f.read()

# 1. Imports
imports = """import { CreateLeadModal } from '@/components/crm/CreateLeadModal';
import { QuickActionDrawer, DrawerState, DrawerType } from '@/components/dashboard/QuickActionDrawer';
import { TaskModal } from '@/components/dashboard/TaskModal';
import { TeacherModal } from '@/components/dashboard/TeacherModal';"""

content = content.replace("import { CreateLeadModal } from '@/components/crm/CreateLeadModal';\nimport { QuickActionDrawer, DrawerState, DrawerType } from '@/components/dashboard/QuickActionDrawer';", imports)

# 2. Add state for TaskModal & TeacherModal
state_old = """  const [drawerState, setDrawerState] = useState<DrawerState>({ isOpen: false, type: null, entityId: null });"""
state_new = """  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [drawerState, setDrawerState] = useState<DrawerState>({ isOpen: false, type: null, entityId: null });"""

content = content.replace(state_old, state_new, 1)

# 3. Outer container class change
outer_old = '<div className="h-[calc(100vh-4rem)] flex flex-col justify-between gap-4 p-4 overflow-hidden">'
outer_new = '<div className="space-y-6 w-full p-2">'
content = content.replace(outer_old, outer_new, 1)

# 4. KPI Top Row grid (5 cards)
kpi_old = """      {/* 2. Top Row (KPIs) - 4 cards */}
      <div className="flex gap-4 shrink-0 h-[110px]">
        <CompactKpiCard
          title="Выручка"
          value="1 497,44 €"
          icon={<CreditCard size={16} />}
          onClick={() => router.push('/finance')}
          badges={[{ label: 'План: 24%', color: 'bg-blue-100 text-blue-700' }, { label: 'Долг: 320 €', color: 'bg-rose-100 text-rose-700' }]}
        />
        <CompactKpiCard
          title="Ученики"
          value="48"
          icon={<Users size={16} />}
          onClick={() => router.push('/students')}
          badges={[{ label: '+7 новых', color: 'bg-emerald-100 text-emerald-700' }, { label: '4 на паузе' }]}
        />
        <CompactKpiCard
          title="Воронка"
          value="18"
          icon={<UserCheck size={16} />}
          onClick={() => router.push('/crm')}
          badges={[{ label: 'Конверсия 38%', color: 'bg-emerald-100 text-emerald-700' }, { label: '5 пробных' }]}
        />
        <CompactKpiCard
          title="Группы"
          value="8"
          icon={<BookOpen size={16} />}
          onClick={() => router.push('/groups')}
          badges={[{ label: '84% наполняемость', color: 'bg-blue-100 text-blue-700' }, { label: '2 набор' }]}
        />
      </div>"""

kpi_new = """      {/* 2. Top Row (KPIs) - 5 cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <CompactKpiCard
          title="Выручка"
          value="1 497,44 €"
          icon={<CreditCard size={16} />}
          onClick={() => router.push('/finance')}
          badges={[{ label: 'План: 24%', color: 'bg-blue-100 text-blue-700' }, { label: 'Долг: 320 €', color: 'bg-rose-100 text-rose-700' }]}
        />
        <CompactKpiCard
          title="Ученики"
          value="48"
          icon={<Users size={16} />}
          onClick={() => router.push('/students')}
          badges={[{ label: '+7 новых', color: 'bg-emerald-100 text-emerald-700' }, { label: '4 на паузе' }]}
        />
        <CompactKpiCard
          title="Воронка"
          value="18"
          icon={<UserCheck size={16} />}
          onClick={() => router.push('/crm')}
          badges={[{ label: 'Конверсия 38%', color: 'bg-emerald-100 text-emerald-700' }, { label: '5 пробных' }]}
        />
        <CompactKpiCard
          title="Группы"
          value="8"
          icon={<BookOpen size={16} />}
          onClick={() => router.push('/groups')}
          badges={[{ label: '84% наполняемость', color: 'bg-blue-100 text-blue-700' }, { label: '2 набор' }]}
        />
        <CompactKpiCard
          title="Администратор"
          value="94%"
          icon={<User size={16} />}
          onClick={onOpenReport || (() => router.push('/tasks'))}
          badges={[{ label: '44/48 задач', color: 'bg-indigo-100 text-indigo-700' }, { label: 'CSAT 4.95', color: 'bg-amber-100 text-amber-700' }]}
        />
      </div>"""

content = content.replace(kpi_old, kpi_new, 1)

# 5. Lower Columns Block & Removal of dark block
lower_old = """      {/* Columns Row */}
      <div className="flex flex-1 gap-4 min-h-0 overflow-hidden pb-2">
        
        {/* 3. Attention Focus (Left Column 60%) */}
        <div className="w-[60%] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800">Фокус внимания</h3>
            <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">Требует реакции</span>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
            {attentionItems.length === 0 && (
              <div className="flex items-center justify-center h-32 text-sm text-slate-500 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Задач нет, все отлично! 🎉
              </div>
            )}
            {attentionItems.map((item, i) => (
              <div 
                key={i}
                onClick={() => openDrawer(item.type as DrawerType, item.entityId, item)}
                className="grid grid-cols-[76px_150px_1fr_auto] items-center gap-4 px-3 py-2.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all cursor-pointer group"
              >
                {/* Колонка 1: Бейдж фиксированной ширины */}
                <div className="flex justify-center">
                  <span className={`w-full py-0.5 text-center text-[11px] font-semibold rounded-md ${item.color}`}>
                    {item.label}
                  </span>
                </div>

                {/* Колонка 2: Имя ученика (строго по левому краю, фиксированная ширина) */}
                <div className="font-medium text-slate-800 text-sm truncate">
                  {item.name}
                </div>

                {/* Колонка 3: Суть проблемы / сумма (занимает свободное пространство) */}
                <div className="text-xs text-slate-500 truncate">
                  {item.description}
                </div>
                
                {/* Колонка 4: Блок быстрых действий (прижат вправо) */}
                <div className="flex items-center gap-2 justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                  {/* Кнопка WhatsApp / Чат (только для долга/оттока) */}
                  {(item.type === 'debt' || item.type === 'churn') && (
                    <button 
                      type="button"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        window.open(`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}`, '_blank');
                      }}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                      title="Написать в WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4"/>
                    </button>
                  )}

                  {/* Кнопка перехода */}
                  <button 
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      openDrawer(item.type as DrawerType, item.entityId, item);
                    }}
                    className="text-xs text-blue-600 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
                  >
                    Решить <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Team & Quality (Right Column 40%) */}
        <div className="w-[40%] flex flex-col gap-4 min-h-0 overflow-hidden">
          
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
             <div className="px-4 py-3 border-b border-slate-100 shrink-0 bg-slate-50/50">
               <h3 className="text-sm font-bold text-slate-800">Команда преподавателей</h3>
             </div>
             <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
               {teachersList.map((t, i) => (
                 <div 
                   key={i} 
                   onClick={() => openDrawer('teacher', t.id, t)}
                   className="flex items-center justify-between px-3 py-2 h-[46px] hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group"
                 >
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">{t.name.charAt(0)}</div>
                       <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">{t.name}</span>
                          <span className="text-[10px] text-slate-500">{t.role} • {t.count} учеников</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{t.load}</span>
                      <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                 </div>
               ))}
             </div>
          </div>

          <div className="shrink-0 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 p-4 shadow-sm relative overflow-hidden group cursor-pointer hover:border-slate-500 transition-colors" onClick={onOpenReport}>
             <div className="relative z-10 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-xs">
                  94%
                </div>
                <div>
                   <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-1">Эффективность администратора</h4>
                   <p className="text-[11px] text-slate-400">44/48 задач • 0 пропущенных • CSAT 4.95</p>
                </div>
             </div>
          </div>

        </div>

      </div>"""

lower_new = """      {/* Columns Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* 3. Attention Focus */}
        <div className="h-fit bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800">Фокус внимания</h3>
            <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">Требует реакции</span>
          </div>
          <div className="p-2 space-y-1">
            {attentionItems.length === 0 && (
              <div className="flex items-center justify-center h-32 text-sm text-slate-500 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Задач нет, все отлично! 🎉
              </div>
            )}
            {attentionItems.map((item, i) => (
              <div 
                key={i}
                onClick={() => setSelectedTask(item)}
                className="grid grid-cols-[76px_150px_1fr_auto] items-center gap-4 px-3 py-2.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all cursor-pointer group"
              >
                {/* Колонка 1: Бейдж фиксированной ширины */}
                <div className="flex justify-center">
                  <span className={`w-full py-0.5 text-center text-[11px] font-semibold rounded-md ${item.color}`}>
                    {item.label}
                  </span>
                </div>

                {/* Колонка 2: Имя ученика */}
                <div className="font-medium text-slate-800 text-sm truncate">
                  {item.name}
                </div>

                {/* Колонка 3: Суть проблемы / сумма */}
                <div className="text-xs text-slate-500 truncate">
                  {item.description}
                </div>
                
                {/* Колонка 4: Блок быстрых действий */}
                <div className="flex items-center gap-2 justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                  {(item.type === 'debt' || item.type === 'churn') && (
                    <button 
                      type="button"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        window.open(`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}`, '_blank');
                      }}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                      title="Написать в WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4"/>
                    </button>
                  )}

                  <button 
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setSelectedTask(item);
                    }}
                    className="text-xs text-blue-600 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
                  >
                    Решить <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Team & Quality */}
        <div className="h-fit bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 shrink-0 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800">Команда преподавателей</h3>
          </div>
          <div className="p-2 space-y-1">
            {teachersList.map((t, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedTeacher(t)}
                className="flex items-center justify-between px-3 py-2 h-[46px] hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">{t.name.charAt(0)}</div>
                   <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">{t.name}</span>
                      <span className="text-[10px] text-slate-500">{t.role} • {t.count} учеников</span>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{t.load}</span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>"""

content = content.replace(lower_old, lower_new, 1)

# 6. Add TaskModal & TeacherModal at the end
modals_old = """      <QuickActionDrawer 
        state={drawerState} 
        onClose={closeDrawer} 
        onSuccess={(type, entityId) => {
          if (type !== 'teacher') {
            setAttentionItems(prev => prev.filter(i => i.entityId !== entityId));
          }
        }} 
      />"""

modals_new = """      <TaskModal 
        isOpen={!!selectedTask}
        taskData={selectedTask}
        onClose={() => setSelectedTask(null)}
        onComplete={(id) => {
          setAttentionItems(prev => prev.filter(item => item.entityId !== id));
          setSelectedTask(null);
        }}
      />

      <TeacherModal 
        isOpen={!!selectedTeacher}
        teacherData={selectedTeacher}
        onClose={() => setSelectedTeacher(null)}
      />

      <QuickActionDrawer 
        state={drawerState} 
        onClose={closeDrawer} 
        onSuccess={(type, entityId) => {
          if (type !== 'teacher') {
            setAttentionItems(prev => prev.filter(i => i.entityId !== entityId));
          }
        }} 
      />"""

content = content.replace(modals_old, modals_new, 1)

with open('src/app/dashboard/page.tsx', 'w') as f:
    f.write(content)

print("Executive overhaul patch applied!")
