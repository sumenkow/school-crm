import sys

with open('src/app/dashboard/page.tsx', 'r') as f:
    content = f.read()

# 1. Add import
import_line = "import { CreateLeadModal } from '@/components/crm/CreateLeadModal';\nimport { QuickActionDrawer, DrawerState, DrawerType } from '@/components/dashboard/QuickActionDrawer';"
content = content.replace("import { CreateLeadModal } from '@/components/crm/CreateLeadModal';", import_line)

# 2. Update state in OwnerDashboard
old_state = """  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const currentMonth = new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });"""

new_state = """  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const currentMonth = new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  const [drawerState, setDrawerState] = useState<DrawerState>({ isOpen: false, type: null, entityId: null });
  const openDrawer = (type: DrawerType, entityId: string, initialData?: any) => setDrawerState({ isOpen: true, type, entityId, initialData });
  const closeDrawer = () => setDrawerState(prev => ({ ...prev, isOpen: false }));

  const [attentionItems, setAttentionItems] = useState([
    { entityType: 'payment', entityId: '1', type: 'debt', label: 'Долг', name: 'Иванов Иван', description: 'Просрочка 150 €', color: 'bg-rose-50 text-rose-700 border border-rose-200', phone: '+123456789' },
    { entityType: 'lead', entityId: '2', type: 'trial', label: 'Пробный', name: 'Мария Смирнова', description: 'Ждет назначения', color: 'bg-purple-50 text-purple-700 border border-purple-200', phone: '+123456789' },
    { entityType: 'student', entityId: '3', type: 'churn', label: 'Отток', name: 'Алексей Попов', description: 'Не выходит на связь', color: 'bg-amber-50 text-amber-700 border border-amber-200', phone: '+123456789' },
    { entityType: 'payment', entityId: '4', type: 'debt', label: 'Долг', name: 'Елена Васильева', description: 'Частичная оплата', color: 'bg-rose-50 text-rose-700 border border-rose-200', phone: '+123456789' },
    { entityType: 'lead', entityId: '5', type: 'trial', label: 'Пробный', name: 'Дмитрий Соколов', description: 'Завтра 14:00', color: 'bg-purple-50 text-purple-700 border border-purple-200', phone: '+123456789' },
  ]);

  const [teachersList, setTeachersList] = useState([
    { id: 't1', name: 'Мария Иванова', role: 'Английский', load: '92%', count: 18 },
    { id: 't2', name: 'Дмитрий Соколов', role: 'Робототехника', load: '85%', count: 14 },
    { id: 't3', name: 'Елена Васильева', role: 'Математика', load: '78%', count: 11 },
    { id: 't4', name: 'Сергей Петров', role: 'Программирование', load: '65%', count: 8 },
  ]);"""

content = content.replace(old_state, new_state, 1)

# 3. Update AttentionList mapping
old_attention_map_head = """            {[
              { entityType: 'payment', entityId: '1', type: 'debt', label: 'Долг', name: 'Иванов Иван', description: 'Просрочка 150 €', color: 'bg-rose-50 text-rose-700 border border-rose-200', phone: '+123456789' },
              { entityType: 'lead', entityId: '2', type: 'trial', label: 'Пробный', name: 'Мария Смирнова', description: 'Ждет назначения', color: 'bg-purple-50 text-purple-700 border border-purple-200', phone: '+123456789' },
              { entityType: 'student', entityId: '3', type: 'churn', label: 'Отток', name: 'Алексей Попов', description: 'Не выходит на связь', color: 'bg-amber-50 text-amber-700 border border-amber-200', phone: '+123456789' },
              { entityType: 'payment', entityId: '4', type: 'debt', label: 'Долг', name: 'Елена Васильева', description: 'Частичная оплата', color: 'bg-rose-50 text-rose-700 border border-rose-200', phone: '+123456789' },
              { entityType: 'lead', entityId: '5', type: 'trial', label: 'Пробный', name: 'Дмитрий Соколов', description: 'Завтра 14:00', color: 'bg-purple-50 text-purple-700 border border-purple-200', phone: '+123456789' },
            ].map((item, i) => ("""

new_attention_map_head = """            {attentionItems.length === 0 && (
              <div className="flex items-center justify-center h-32 text-sm text-slate-500 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Задач нет, все отлично! 🎉
              </div>
            )}
            {attentionItems.map((item, i) => ("""

content = content.replace(old_attention_map_head, new_attention_map_head, 1)

# Fix openDrawer inside AttentionList row onClick
old_click_1 = """                onClick={() => {
                  if (item.type === 'debt' || item.type === 'churn') {
                    console.log('Open StudentDrawer for:', item.entityId);
                  } else if (item.type === 'trial') {
                    console.log('Open LeadDrawer for:', item.entityId);
                  }
                }}"""
new_click_1 = """                onClick={() => openDrawer(item.type as DrawerType, item.entityId, item)}"""
content = content.replace(old_click_1, new_click_1, 1)

old_click_2 = """                  {/* Кнопка перехода */}
                  <button 
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (item.type === 'debt' || item.type === 'churn') {
                        console.log('Open StudentDrawer for:', item.entityId);
                      } else if (item.type === 'trial') {
                        console.log('Open LeadDrawer to schedule:', item.entityId);
                      }
                    }}"""

new_click_2 = """                  {/* Кнопка перехода */}
                  <button 
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      openDrawer(item.type as DrawerType, item.entityId, item);
                    }}"""
content = content.replace(old_click_2, new_click_2, 1)

# 4. Update TeachersList mapping
old_teachers_map = """               {[
                 { name: 'Мария Иванова', role: 'Английский', load: '92%', count: 18 },
                 { name: 'Дмитрий Соколов', role: 'Робототехника', load: '85%', count: 14 },
                 { name: 'Елена Васильева', role: 'Математика', load: '78%', count: 11 },
                 { name: 'Сергей Петров', role: 'Программирование', load: '65%', count: 8 },
               ].map((t, i) => (
                 <div key={i} className="flex items-center justify-between px-3 py-2 h-[46px] hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">{t.name.charAt(0)}</div>
                       <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">{t.name}</span>
                          <span className="text-[10px] text-slate-500">{t.role} • {t.count} учеников</span>
                       </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{t.load}</span>
                 </div>
               ))}"""

new_teachers_map = """               {teachersList.map((t, i) => (
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
               ))}"""

content = content.replace(old_teachers_map, new_teachers_map, 1)

# 5. Inject QuickActionDrawer modal at end of OwnerDashboard
old_end = """      <CreateLeadModal
        isOpen={isCreateLeadOpen}
        onClose={() => setIsCreateLeadOpen(false)}
        onCreated={() => {}}
      />
    </div>
  );
}"""

new_end = """      <CreateLeadModal
        isOpen={isCreateLeadOpen}
        onClose={() => setIsCreateLeadOpen(false)}
        onCreated={() => {}}
      />
      <QuickActionDrawer 
        state={drawerState} 
        onClose={closeDrawer} 
        onSuccess={(type, entityId) => {
          if (type !== 'teacher') {
            setAttentionItems(prev => prev.filter(i => i.entityId !== entityId));
          }
        }} 
      />
    </div>
  );
}"""

content = content.replace(old_end, new_end, 1)

with open('src/app/dashboard/page.tsx', 'w') as f:
    f.write(content)

print("Patching complete!")
