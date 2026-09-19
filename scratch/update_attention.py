import sys
import re

with open('src/app/dashboard/page.tsx', 'r') as f:
    content = f.read()

new_list = """{[
              { entityType: 'payment', entityId: '1', type: 'debt', label: 'Долг', name: 'Иванов Иван', description: 'Просрочка 150 €', color: 'bg-rose-100 text-rose-700', phone: '+123456789' },
              { entityType: 'lead', entityId: '2', type: 'trial', label: 'Пробный', name: 'Мария Смирнова', description: 'Ждет назначения', color: 'bg-purple-100 text-purple-700', phone: '+123456789' },
              { entityType: 'student', entityId: '3', type: 'churn', label: 'Отток', name: 'Алексей Попов', description: 'Не выходит на связь', color: 'bg-slate-200 text-slate-700', phone: '+123456789' },
              { entityType: 'payment', entityId: '4', type: 'debt', label: 'Долг', name: 'Елена Васильева', description: 'Частичная оплата', color: 'bg-rose-100 text-rose-700', phone: '+123456789' },
              { entityType: 'lead', entityId: '5', type: 'trial', label: 'Пробный', name: 'Дмитрий Соколов', description: 'Завтра 14:00', color: 'bg-purple-100 text-purple-700', phone: '+123456789' },
            ].map((item, i) => (
              <div 
                key={i}
                onClick={() => {
                  if (item.type === 'debt' || item.type === 'churn') {
                    console.log('Open StudentDrawer for:', item.entityId);
                  } else if (item.type === 'trial') {
                    console.log('Open LeadDrawer for:', item.entityId);
                  }
                }}
                className="group flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md text-center ${item.color}`}>
                    {item.label}
                  </span>
                  <span className="font-medium text-slate-800 text-sm">{item.name}</span>
                  <span className="text-xs text-slate-500">{item.description}</span>
                </div>
                
                {/* Быстрые действия */}
                <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                  {(item.type === 'debt' || item.type === 'churn') && (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        window.open(`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}`, '_blank');
                      }}
                      className="text-xs text-emerald-600 font-medium px-2 py-1 hover:bg-emerald-100 rounded transition-colors"
                    >
                      Напомнить
                    </button>
                  )}
                  {item.type === 'trial' && (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        console.log('Open LeadDrawer to schedule:', item.entityId); 
                      }}
                      className="text-xs text-blue-600 font-medium px-2 py-1 hover:bg-blue-100 rounded transition-colors"
                    >
                      Назначить
                    </button>
                  )}
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600" />
                </div>
              </div>
            ))}"""

# Locate the old array mapping block in page.tsx to replace it
# We'll use a regex that captures from `{\[` to `\)\)\}` for the map block
old_list_pattern = r'\{\[\s*\{\s*entityType:\s*\'payment\'[\s\S]*?\}\)\)\}'

new_content = re.sub(old_list_pattern, new_list, content)

with open('src/app/dashboard/page.tsx', 'w') as f:
    f.write(new_content)
