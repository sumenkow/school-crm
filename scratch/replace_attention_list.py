import sys

with open('src/app/dashboard/page.tsx', 'r') as f:
    lines = f.readlines()

new_list = """            {[
              { entityType: 'payment', entityId: '1', type: 'debt', label: 'Долг', name: 'Иванов Иван', description: 'Просрочка 150 €', color: 'bg-rose-50 text-rose-700 border border-rose-200', phone: '+123456789' },
              { entityType: 'lead', entityId: '2', type: 'trial', label: 'Пробный', name: 'Мария Смирнова', description: 'Ждет назначения', color: 'bg-purple-50 text-purple-700 border border-purple-200', phone: '+123456789' },
              { entityType: 'student', entityId: '3', type: 'churn', label: 'Отток', name: 'Алексей Попов', description: 'Не выходит на связь', color: 'bg-amber-50 text-amber-700 border border-amber-200', phone: '+123456789' },
              { entityType: 'payment', entityId: '4', type: 'debt', label: 'Долг', name: 'Елена Васильева', description: 'Частичная оплата', color: 'bg-rose-50 text-rose-700 border border-rose-200', phone: '+123456789' },
              { entityType: 'lead', entityId: '5', type: 'trial', label: 'Пробный', name: 'Дмитрий Соколов', description: 'Завтра 14:00', color: 'bg-purple-50 text-purple-700 border border-purple-200', phone: '+123456789' },
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
                className="grid grid-cols-[76px_150px_1fr_auto] items-center gap-4 px-3 py-2.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all cursor-pointer group"
              >
                {/* Колонка 1: Бейдж фиксированной ширины */}
                <div className="flex justify-center">
                  <span className={`w-full py-0.5 text-center text-[10px] font-bold rounded-md ${item.color}`}>
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
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (item.type === 'debt' || item.type === 'churn') {
                        console.log('Open StudentDrawer for:', item.entityId);
                      } else if (item.type === 'trial') {
                        console.log('Open LeadDrawer to schedule:', item.entityId);
                      }
                    }}
                    className="text-xs text-blue-600 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
                  >
                    Решить <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </button>
                </div>
              </div>
            ))}
"""

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "{[" in line and "entityType: 'payment'" in lines[i+1]:
        start_idx = i
    if start_idx != -1 and "</div>" in line and "}))}" in lines[i-1]:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    lines = lines[:start_idx] + [new_list] + lines[end_idx+1:]
    with open('src/app/dashboard/page.tsx', 'w') as f:
        f.writelines(lines)
    print("Replaced!")
else:
    print(f"Could not find block: start={start_idx} end={end_idx}")

