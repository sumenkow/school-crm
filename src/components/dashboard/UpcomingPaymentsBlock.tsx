'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  CreditCard,
  Send,
  MessageSquare,
  CheckSquare,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
  DollarSign,
  Phone,
  CheckCircle2,
  RefreshCw,
  Bell
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useRole } from '@/context/RoleContext';
import { getUpcomingPayments, UpcomingPaymentItem } from '@/lib/data/upcomingPaymentsHelper';
import { notifyAdminOnUpcomingPayment, sendUpcomingPaymentsDigestToTelegram } from '@/lib/telegram/botNotifier';
import { RecordPaymentModal } from '@/components/finance/RecordPaymentModal';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';

interface UpcomingPaymentsBlockProps {
  viewMode?: 'admin' | 'owner';
  limit?: number;
}

export function UpcomingPaymentsBlock({ viewMode = 'admin', limit = 6 }: UpcomingPaymentsBlockProps) {
  const toast = useToast();
  const { role } = useRole();

  const [items, setItems] = useState<UpcomingPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [sendingItemId, setSendingItemId] = useState<string | null>(null);

  // Modal states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>();
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>();
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskDefaultStudentId, setTaskDefaultStudentId] = useState<string | undefined>();

  const loadData = () => {
    setLoading(true);
    try {
      const list = getUpcomingPayments();
      setItems(list);
    } catch (e) {
      console.error('Failed to load upcoming payments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('crm-students-changed', loadData);
    window.addEventListener('crm-payments-changed', loadData);
    window.addEventListener('focus', loadData);
    return () => {
      window.removeEventListener('crm-students-changed', loadData);
      window.removeEventListener('crm-payments-changed', loadData);
      window.removeEventListener('focus', loadData);
    };
  }, []);

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const urgentCount = items.filter((i) => i.isUrgent).length;
  const displayedItems = items.slice(0, limit);

  const handleSendSingleTelegram = async (item: UpcomingPaymentItem) => {
    setSendingItemId(item.id);
    try {
      const res = await notifyAdminOnUpcomingPayment({
        studentName: item.studentName,
        parentName: item.parentName,
        parentPhone: item.parentPhone,
        courseName: item.courseName,
        amountFormatted: item.amountFormatted,
        dueDate: item.dueDate,
        daysRemaining: item.daysRemaining,
      });

      if (res.success) {
        toast.success(`Напоминание по ${item.studentName} отправлено в Telegram администратора!`);
      } else {
        toast.error(res.error || 'Не удалось отправить напоминание в Telegram');
      }
    } catch (err: any) {
      toast.error('Ошибка отправки: ' + err.message);
    } finally {
      setSendingItemId(null);
    }
  };

  const handleSendFullDigest = async () => {
    if (items.length === 0) return;
    setSendingDigest(true);
    try {
      const res = await sendUpcomingPaymentsDigestToTelegram(items);
      if (res.success) {
        toast.success(`Сводка по ${items.length} приближающимся оплатам отправлена в Telegram!`);
      } else {
        toast.error(res.error || 'Ошибка отправки в Telegram');
      }
    } catch (err: any) {
      toast.error('Ошибка: ' + err.message);
    } finally {
      setSendingDigest(false);
    }
  };

  return (
    <div className="md-card-elevated p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="md-title-medium font-bold text-slate-900">
                Ближайшие оплаты
              </h3>
              {urgentCount > 0 && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-900 border border-amber-300">
                  {urgentCount} срочных
                </span>
              )}
            </div>
            <p className="md-body-small text-slate-500">
              {viewMode === 'owner'
                ? `Прогноз ближайших поступлений: ${totalAmount.toLocaleString('ru-RU')} ₽ (${items.length} счетов)`
                : `Клиенты, у которых подходит дата продления абонемента или оплата после пробного урока`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={handleSendFullDigest}
              disabled={sendingDigest}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Отправить всю сводку администраторам в Telegram бот"
            >
              <Send size={13} className="text-blue-600" />
              {sendingDigest ? 'Отправка...' : 'Сводка в TG'}
            </button>
          )}

          <Link
            href="/finance?filter=expected"
            className="md-label-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 font-semibold"
          >
            Все платежи →
          </Link>
        </div>
      </div>

      {/* Items list */}
      {displayedItems.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2 opacity-80" />
          В ближайшие дни нет платежей с подходящим сроком. Все абонементы продлены!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {displayedItems.map((item) => {
            const urgencyBg =
              item.daysRemaining <= 1
                ? 'border-rose-200 bg-rose-50/40'
                : item.daysRemaining <= 3
                ? 'border-amber-200 bg-amber-50/40'
                : 'border-slate-200 bg-slate-50/50';

            const chipColor =
              item.daysRemaining <= 1
                ? 'bg-rose-100 text-rose-800 font-bold'
                : item.daysRemaining <= 3
                ? 'bg-amber-100 text-amber-800 font-bold'
                : 'bg-blue-100 text-blue-800';

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border ${urgencyBg} flex flex-col justify-between gap-3 hover:shadow-xs transition-shadow`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {item.studentId ? (
                          <Link
                            href={`/students/${item.studentId}`}
                            className="font-bold text-slate-900 text-xs hover:text-blue-600 transition-colors truncate"
                          >
                            {item.studentName}
                          </Link>
                        ) : (
                          <span className="font-bold text-slate-900 text-xs truncate">{item.studentName}</span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${chipColor}`}>
                          {item.statusLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {item.courseName} {item.groupName ? `• ${item.groupName}` : ''}
                      </p>
                      {item.parentName && (
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Родитель: <strong>{item.parentName}</strong>
                          {item.parentPhone && ` (${item.parentPhone})`}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-900 block">{item.amountFormatted}</span>
                      <span className="text-[10px] text-slate-500">срок: {item.dueDate}</span>
                    </div>
                  </div>
                </div>

                {/* Card footer action buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                  <div className="flex items-center gap-1.5">
                    {item.parentWhatsapp && (
                      <a
                        href={`https://wa.me/${item.parentWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Здравствуйте, ${item.parentName || ''}! Напоминаем о продлении абонемента на курс «${item.courseName}» (${item.amountFormatted}) до ${item.dueDate}.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100 transition-colors"
                        title="Написать в WhatsApp"
                      >
                        <MessageSquare size={13} />
                      </a>
                    )}

                    <button
                      onClick={() => handleSendSingleTelegram(item)}
                      disabled={sendingItemId === item.id}
                      className="rounded-lg bg-blue-50 p-1.5 text-blue-700 hover:bg-blue-100 transition-colors"
                      title="Отправить напоминание администратору в Telegram"
                    >
                      <Send size={13} />
                    </button>

                    <button
                      onClick={() => {
                        setTaskDefaultStudentId(item.studentId);
                        setTaskModalOpen(true);
                      }}
                      className="rounded-lg bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200 transition-colors"
                      title="Поставить задачу по продлению"
                    >
                      <CheckSquare size={13} />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedStudentId(item.studentId);
                      setSelectedParentId(item.parentId);
                      setPaymentModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-700 transition-colors shadow-2xs"
                  >
                    <CreditCard size={12} />
                    Оплатить
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedStudentId(undefined);
          setSelectedParentId(undefined);
        }}
        initialStudentId={selectedStudentId}
        initialParentId={selectedParentId}
        onRecorded={() => {
          loadData();
          toast.success('Оплата успешно зафиксирована!');
        }}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setTaskDefaultStudentId(undefined);
        }}
        defaultStudentId={taskDefaultStudentId}
        onCreated={() => {
          loadData();
          toast.success('Задача по продлению создана!');
        }}
      />
    </div>
  );
}
