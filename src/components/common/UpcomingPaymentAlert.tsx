'use client';

import React, { useState } from 'react';
import {
  Clock,
  CreditCard,
  Send,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { UpcomingPaymentItem } from '@/lib/data/upcomingPaymentsHelper';
import { notifyAdminOnUpcomingPayment } from '@/lib/telegram/botNotifier';
import { RecordPaymentModal } from '@/components/finance/RecordPaymentModal';

interface UpcomingPaymentAlertProps {
  item: UpcomingPaymentItem | null;
  onPaymentRecorded?: () => void;
  className?: string;
}

export function UpcomingPaymentAlert({ item, onPaymentRecorded, className = '' }: UpcomingPaymentAlertProps) {
  const toast = useToast();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [sendingTg, setSendingTg] = useState(false);

  if (!item) return null;

  const isUrgent = item.daysRemaining <= 3;
  const alertBg = isUrgent
    ? 'border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 text-amber-950 shadow-2xs'
    : 'border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50/40 to-blue-50 text-blue-950 shadow-2xs';

  const handleSendTelegram = async () => {
    setSendingTg(true);
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
        toast.success(`Напоминание о сроке оплаты ${item.studentName} отправлено в Telegram администратору!`);
      } else {
        toast.error(res.error || 'Не удалось отправить напоминание в Telegram');
      }
    } catch (err: any) {
      toast.error('Ошибка отправки: ' + err.message);
    } finally {
      setSendingTg(false);
    }
  };

  return (
    <>
      <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${alertBg} ${className}`}>
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-2xs ${
              isUrgent ? 'bg-amber-600' : 'bg-blue-600'
            }`}
          >
            <Clock size={20} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs tracking-tight">
                {isUrgent ? '⏳ Приближается срок оплаты абонемента' : '📅 Плановый срок оплаты'}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  isUrgent ? 'bg-amber-200 text-amber-900 border border-amber-300' : 'bg-blue-200 text-blue-900'
                }`}
              >
                {item.statusLabel}
              </span>
            </div>

            <p className="text-xs text-slate-700 mt-1">
              Курс «<strong>{item.courseName}</strong>» • Сумма к оплате: <strong className="text-slate-900">{item.amountFormatted}</strong> до{' '}
              <strong>{item.dueDate}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {item.parentWhatsapp && (
            <a
              href={`https://wa.me/${item.parentWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                `Здравствуйте! Напоминаем об оплате курса «${item.courseName}» (${item.amountFormatted}) до ${item.dueDate}.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
            >
              <MessageSquare size={13} />
              WhatsApp
            </a>
          )}

          <button
            onClick={handleSendTelegram}
            disabled={sendingTg}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Отправить напоминание администратору в Telegram"
          >
            <Send size={13} className="text-blue-600" />
            {sendingTg ? '...' : 'В TG'}
          </button>

          <button
            onClick={() => setPaymentModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
          >
            <CreditCard size={13} />
            Внести оплату
          </button>
        </div>
      </div>

      <RecordPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        initialStudentId={item.studentId}
        initialParentId={item.parentId}
        onRecorded={() => {
          setPaymentModalOpen(false);
          toast.success('Оплата успешно зафиксирована!');
          onPaymentRecorded?.();
        }}
      />
    </>
  );
}
