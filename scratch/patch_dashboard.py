import sys
import re

with open('src/app/dashboard/page.tsx', 'r') as f:
    content = f.read()

# 1. Add import
import_stmt = "import { QuickActionDrawer, DrawerState, DrawerType } from '@/components/dashboard/QuickActionDrawer';\n"
content = content.replace("import { updateUnifiedTaskStatus } from '@/lib/data/taskManager';", "import { updateUnifiedTaskStatus } from '@/lib/data/taskManager';\n" + import_stmt)


# 2. Extract state for Attention and Teachers inside OwnerDashboard
state_injection = """  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
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
    { id: 't3', name: 'Елена Смирнова', role: 'Математика', load: '78%', count: 12 },
    { id: 't4', name: 'Анна Петрова', role: 'Программирование', load: '65%', count: 8 },
  ]);
"""

old_state_block = """  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const currentMonth = new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });"""
content = content.replace(old_state_block, state_injection)


# 3. Replace AttentionList map
old_attention_list = """            {[
              { entityType: 'payment', entityId: '1', type: 'debt', label: 'Долг', name: 'Иванов Иван', description: 'Просрочка 150 €', color: 'bg-rose-50 text-rose-700 border border-rose-200', phone: '+123456789' },
              { entityType: 'lead', entityId: '2', type: 'trial', label: 'Пробный', name: 'Мария Смирнова', description: 'Ждет назначения', color: 'bg-purple-50 text-purple-700 border border-purple-200', phone: '+123456789' },
              { entityType: 'student', entityId: '3', type: 'churn', label: 'Отток', name: 'Алексей Попов', description: 'Не выходит на связь', color: 'bg-amber-50 text-amber-700 border border-amber-200', phone: '+123456789' },
              { entityType: 'payment', entityId: '4', type: 'debt', label: 'Долг', name: 'Елена Васильева', description: 'Частичная оплата', color: 'bg-rose-50 text-rose-700 border border-rose-200', phone: '+123456789' },
              { entityType: 'lead', entityId: '5', type: 'trial', label: 'Пробный', name: 'Дмитрий Соколов', description: 'Завтра 14:00', color: 'bg-purple-50 text-purple-700 border border-purple-200', phone: '+123456789' },
            ].map((item, i) => ("""

new_attention_list = """            {attentionItems.length === 0 && (
              <div className="flex items-center justify-center h-32 text-sm text-slate-500 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Задач нет, все отлично! 🎉
              </div>
            )}
            {attentionItems.map((item, i) => ("""

content = content.replace(old_attention_list, new_attention_list)

# Fix openDrawer inside AttentionList
old_attention_click = """                onClick={() => {
                  if (item.type === 'debt' || item.type === 'churn') {
                    console.log('Open StudentDrawer for:', item.entityId);
                  } else if (item.type === 'trial') {
                    console.log('Open LeadDrawer for:', item.entityId);
                  }
                }}"""
new_attention_click = """                onClick={() => openDrawer(item.type as DrawerType, item.entityId, item)}"""
content = content.replace(old_attention_click, new_attention_click)


old_attention_btn_click = """                  {/* Кнопка перехода */}
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
new_attention_btn_click = """                  {/* Кнопка перехода */}
                  <button 
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      openDrawer(item.type as DrawerType, item.entityId, item);
                    }}"""
content = content.replace(old_attention_btn_click, new_attention_btn_click)

# 4. Replace Teachers List map
old_teachers_list = """               {[
                 { name: 'Мария Иванова', role: 'Английский', load: '92%', count: 18 },
                 { name: 'Дмитрий Соколов', role: 'Робототехника', load: '85%', count: 14 },
                 { name: 'Елена Смирнова', role: 'Математика', load: '78%', count: 12 },
                 { name: 'Анна Петрова', role: 'Программирование', load: '65%', count: 8 },
               ].map((teacher, i) => (
                 <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer">
                   <div>
                     <span className="text-sm font-semibold text-slate-800 block">{teacher.name}</span>
                     <span className="text-xs text-slate-500">{teacher.role}</span>
                   </div>
                   <div className="text-right">
                     <span className="text-sm font-bold text-slate-800">{teacher.load}</span>
                     <span className="text-[10px] text-slate-500 block">загрузка</span>
                   </div>
                 </div>
               ))}"""
new_teachers_list = """               {teachersList.map((teacher, i) => (
                 <div 
                   key={i} 
                   onClick={() => openDrawer('teacher', teacher.id, teacher)}
                   className="flex items-center justify-between px-3 py-2 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all cursor-pointer group"
                 >
                   <div>
                     <span className="text-sm font-semibold text-slate-800 block">{teacher.name}</span>
                     <span className="text-xs text-slate-500">{teacher.role}</span>
                   </div>
                   <div className="flex items-center gap-3">
                     <div className="text-right">
                       <span className="text-sm font-bold text-slate-800">{teacher.load}</span>
                       <span className="text-[10px] text-slate-500 block">загрузка</span>
                     </div>
                     <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-1" />
                   </div>
                 </div>
               ))}"""
content = content.replace(old_teachers_list, new_teachers_list)

# 5. Add QuickActionDrawer at the bottom of OwnerDashboard
content = content.replace("    </div>\n  );\n}", """      <QuickActionDrawer 
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
}""")

with open('src/app/dashboard/page.tsx', 'w') as f:
    f.write(content)
