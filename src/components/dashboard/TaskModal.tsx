import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, Calendar, User, CheckCircle2, Clock, Send, AlertCircle } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { saveTaskToStorage } from '@/lib/data/taskStorage';

interface TaskModalProps {
  isOpen: boolean;
  taskData: any;
  onClose: () => void;
  onComplete: (taskId: string) => void;
}

export function TaskModal({ isOpen, taskData, onClose, onComplete }: TaskModalProps) {
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Array<{ id: string; author: string; text: string; time: string }>>([
    { id: '1', author: 'Администратор', text: 'Отправлен шаблон напоминания в WhatsApp', time: 'Сегодня, 10:15' },
    { id: '2', author: 'Родитель', text: 'Попросили отсрочку до пятницы', time: 'Сегодня, 11:30' },
  ]);
  const [status, setStatus] = useState<'in_progress' | 'waiting' | 'resolved'>('in_progress');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !taskData || !mounted) return null;

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setComments(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        author: 'Руководитель',
        text: commentText.trim(),
        time: 'Только что',
      }
    ]);
    setCommentText('');
    toast.success('Заметка добавлена');
  };

  const handleCompleteTask = () => {
    setStatus('resolved');
    
    // Save to Supabase DB & dispatch global event
    saveTaskToStorage({
      id: taskData.entityId || taskData.id,
      title: `${taskData.label || 'Задача'}: ${taskData.name || ''}`,
      taskType: 'Retention',
      assignedTo: 'Анастасия (Админ)',
      dueDate: new Date().toISOString().slice(0, 10),
      dueDateFormatted: new Date().toLocaleDateString('ru-RU'),
      status: 'done',
      priority: 'medium',
      description: taskData.description,
      isOverdue: false,
    });

    toast.success('Задача помечена как выполненная');
    onComplete(taskData.entityId || taskData.id);
    onClose();
  };

  const phoneFormatted = (taskData.phone || '+79991234567').replace(/\D/g, '');

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />
      <div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-white sm:rounded-2xl shadow-xl overflow-hidden z-10 flex flex-col">
        
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${taskData.color || 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              {taskData.label || 'Задача'}
            </span>
            <h3 className="text-base font-bold text-slate-800 truncate max-w-md">
              {taskData.label || 'Задача'}: {taskData.name}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto overscroll-contain space-y-6 flex-1 min-h-0 pb-10">
          
          {/* Context Block */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Клиент / Ученик</p>
                <p className="text-base font-bold text-slate-800">{taskData.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium">Суть / Детали</p>
                <p className="text-sm font-semibold text-rose-600">{taskData.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
              <span className="text-slate-500">Курс: <strong className="text-slate-700 font-semibold">Английский B1</strong></span>
              <a 
                href={`https://wa.me/${phoneFormatted}`} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-emerald-600 font-bold hover:underline"
              >
                <MessageCircle size={14} /> WhatsApp ({taskData.phone || '+7 (999) 123-45-67'})
              </a>
            </div>
          </div>

          {/* Task Params */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase">Ответственный</p>
              <div className="flex items-center gap-1.5 mt-1">
                <User size={14} className="text-slate-500" />
                <span className="text-xs font-semibold text-slate-700">Анастасия (Админ)</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase">Крайний срок</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock size={14} className="text-amber-500" />
                <span className="text-xs font-semibold text-slate-700">Сегодня, 18:00</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase">Статус</p>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value as any)}
                className="mt-1 w-full text-xs font-bold border border-slate-200 rounded px-2 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="in_progress">В работе</option>
                <option value="waiting">Ожидает ответа</option>
                <option value="resolved">Решено</option>
              </select>
            </div>
          </div>

          {/* Comment Thread */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">История и комментарии</h4>
            
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {comments.map((c) => (
                <div key={c.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-bold text-slate-700">{c.author}</span>
                    <span className="text-[10px]">{c.time}</span>
                  </div>
                  <p className="text-slate-600">{c.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
              <input 
                type="text" 
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Написать заметку или указание..."
                className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-hidden focus:bg-white focus:border-blue-500"
              />
              <button 
                type="submit"
                className="px-3 py-2 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-700 transition-colors flex items-center gap-1"
              >
                <Send size={12} /> Отправить
              </button>
            </form>
          </div>

        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 sm:px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+28px)] sm:pb-4 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] flex items-center justify-between">
          <button 
            type="button"
            onClick={() => toast.success('Срок перенесен на завтра')}
            className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-slate-200/60 transition-colors flex items-center gap-1.5"
          >
            <Clock size={14} /> Перенести срок
          </button>

          <button 
            type="button"
            onClick={handleCompleteTask}
            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <CheckCircle2 size={16} /> Закрыть задачу как выполненную
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

