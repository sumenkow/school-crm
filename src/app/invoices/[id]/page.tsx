'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Printer,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Building2,
  QrCode,
  Download,
  Share2,
  CreditCard,
  Send,
} from 'lucide-react';
import {
  getStoredInvoices,
  EuropeanInvoiceData,
  markInvoiceAsPaid,
  INITIAL_INVOICES,
} from '@/lib/data/invoiceStorage';
import { generateSepaQrSvg } from '@/lib/data/sepaQrGenerator';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { success } = useToast();
  const invoiceId = params?.id as string;

  const [invoice, setInvoice] = useState<EuropeanInvoiceData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  useEffect(() => {
    const list = getStoredInvoices();
    const found = list.find((i) => i.id === invoiceId || String(i.invoiceNumber) === invoiceId);
    if (found) {
      setInvoice(found);
    } else {
      // Fallback from initial sample
      const fallback = INITIAL_INVOICES.find((i) => i.id === invoiceId || String(i.invoiceNumber) === invoiceId);
      if (fallback) setInvoice(fallback);
    }
  }, [invoiceId]);

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="rounded-2xl bg-white p-8 max-w-md w-full text-center shadow-xs border border-slate-200 space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Clock size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Счёт не найден</h2>
          <p className="text-xs text-slate-500">
            Возможно, ссылка устарела или счёт с номером {invoiceId} был удален.
          </p>
          <button
            onClick={() => router.push('/finance')}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft size={14} />
            Вернуться в CRM
          </button>
        </div>
      </div>
    );
  }

  const bank = invoice.bankDetails;
  const qrSvg = generateSepaQrSvg({
    name: bank.accountHolder,
    iban: bank.iban,
    bic: bank.swiftBic,
    amount: invoice.totalAmountEUR,
    variableSymbol: invoice.variableSymbol,
    purpose: `${invoice.courseName} - ${invoice.studentName}`,
  }, 220);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    success(`Скопировано: ${fieldName}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleMarkPaid = () => {
    setIsMarkingPaid(true);
    const updated = markInvoiceAsPaid(invoice.id);
    if (updated) {
      setInvoice(updated);
      success(`Счёт № ${invoice.invoiceNumber} отмечен как оплаченный!`);
    }
    setIsMarkingPaid(false);
  };

  const isPaid = invoice.status === 'paid';

  return (
    <div className="min-h-screen bg-slate-100/70 py-6 px-4 sm:px-6">
      {/* Top Toolbar (Hidden on Print) */}
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between flex-wrap gap-3 print:hidden">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          Назад в CRM
        </button>

        <div className="flex items-center gap-2">
          {!isPaid && (
            <button
              onClick={handleMarkPaid}
              disabled={isMarkingPaid}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <CheckCircle2 size={14} />
              Отметить как оплаченный
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Printer size={14} />
            Печать / Скачать PDF
          </button>
        </div>
      </div>

      {/* Main Invoice Document (A4 Container) */}
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden print:shadow-none print:border-none print:rounded-none p-6 sm:p-10 space-y-8">
        
        {/* 1. Header: School & Invoice meta */}
        <div className="flex items-start justify-between flex-wrap gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                YE
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight">You Europe</h1>
                <p className="text-[11px] text-slate-500 font-medium">Sprach- & Bildungszentrum</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 pt-2">
              <strong>{bank.accountHolder}</strong><br />
              Bratislava, Slovensko / Wien, Österreich<br />
              {bank.vatNote}
            </p>
          </div>

          <div className="text-right space-y-1">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full mb-1">
              Faktúra / Rechnung
            </span>
            <h2 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              № {invoice.invoiceNumber}
            </h2>
            <p className="text-xs text-slate-500">
              Variabilný symbol (VS): <strong className="text-slate-900 font-mono">{invoice.variableSymbol}</strong>
            </p>
            <div className="pt-2">
              {isPaid ? (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
                  <CheckCircle2 size={13} />
                  Оплачено (Bezahlt)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold">
                  <Clock size={13} />
                  К оплате (Zu zahlen)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Customer & Dates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Получатель счёта / Odberateľ / Kunde:
            </span>
            <p className="text-sm font-bold text-slate-900">
              {invoice.parentName || invoice.studentName}
            </p>
            <p className="text-slate-600">
              Ученик / Schüler: <strong>{invoice.studentName}</strong>
            </p>
            {invoice.parentPhone && <p className="text-slate-500">Тел: {invoice.parentPhone}</p>}
            {invoice.parentEmail && <p className="text-slate-500">Email: {invoice.parentEmail}</p>}
          </div>

          <div className="space-y-1.5 sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Даты и условия / Zahlungsbedingungen:
            </span>
            <p className="text-slate-600">
              Дата выставления / Dátum vystavenia: <strong className="text-slate-900">{invoice.issueDate}</strong>
            </p>
            <p className="text-slate-600">
              Срок оплаты / Bis dahin zu zahlen: <strong className="text-rose-700 font-bold">{invoice.dueDate}</strong>
            </p>
            <p className="text-slate-600">
              Период / Zeitraum: <strong className="text-slate-900">{invoice.periodLabel}</strong>
            </p>
            <p className="text-slate-600">
              Способ оплаты: <strong className="text-slate-900">SEPA Banküberweisung</strong>
            </p>
          </div>
        </div>

        {/* 3. Items Table */}
        <div className="space-y-3">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                <th className="py-2.5 pr-4 font-bold">Услуга / Beschreibung</th>
                <th className="py-2.5 px-3 text-center font-bold">Кол-во</th>
                <th className="py-2.5 px-3 text-right font-bold">Тариф</th>
                <th className="py-2.5 pl-3 text-right font-bold">Сумма</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {invoice.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/40">
                  <td className="py-3.5 pr-4 font-semibold text-slate-900">
                    {item.description}
                  </td>
                  <td className="py-3.5 px-3 text-center text-slate-600 font-mono">
                    {item.quantity}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-700">
                    {item.unitPriceEUR.toFixed(2)} €
                  </td>
                  <td className="py-3.5 pl-3 text-right font-bold font-mono text-slate-900">
                    {item.amountEUR.toFixed(2)} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total Box */}
          <div className="flex justify-end pt-2">
            <div className="w-64 bg-slate-900 text-white rounded-2xl p-4 space-y-1.5 shadow-xs">
              <div className="flex justify-between text-xs text-white/70">
                <span>Итого без скидки:</span>
                <span className="font-mono">{invoice.subtotalEUR.toFixed(2)} €</span>
              </div>
              {invoice.discountEUR > 0 && (
                <div className="flex justify-between text-xs text-emerald-400">
                  <span>Скидка:</span>
                  <span className="font-mono">-{invoice.discountEUR.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black border-t border-white/20 pt-2 text-white">
                <span>ИТОГО К ОПЛАТЕ:</span>
                <span className="text-emerald-400 font-mono">{invoice.totalAmountEUR.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. SEPA Payment Instructions & QR Code Box */}
        <div className="rounded-2xl border-2 border-blue-200/80 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-blue-200/60 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="text-blue-600 h-5 w-5" />
              <h3 className="text-sm font-bold text-slate-900">
                Реквизиты для оплаты через банк (SEPA / Tatra banka)
              </h3>
            </div>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full">
              Tatra banka, a.s.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Bank details & Copyable fields */}
            <div className="md:col-span-2 space-y-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Получатель (Kontoinhaber)</span>
                  <span className="font-bold text-slate-900 text-sm">{bank.accountHolder}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(bank.accountHolder, 'Получатель')}
                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Скопировать"
                >
                  {copiedField === 'Получатель' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                </button>
              </div>

              <div className="bg-white p-3 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">IBAN счёта</span>
                  <span className="font-bold font-mono text-slate-900 text-sm tracking-wide">{bank.iban}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(bank.iban.replace(/\s+/g, ''), 'IBAN')}
                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Скопировать IBAN"
                >
                  {copiedField === 'IBAN' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">SWIFT / BIC</span>
                    <span className="font-bold font-mono text-slate-900">{bank.swiftBic}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(bank.swiftBic, 'SWIFT')}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    {copiedField === 'SWIFT' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>

                <div className="bg-white p-3 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Variabilný symbol (VS)</span>
                    <span className="font-bold font-mono text-blue-700 text-sm">{invoice.variableSymbol}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(String(invoice.variableSymbol), 'VS')}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    {copiedField === 'VS' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
                <strong>Важно:</strong> Пожалуйста, обязательно укажите номер счёта <strong>«{invoice.invoiceNumber}»</strong> в поле <em>Variabilný symbol</em> или в назначении перевода для автоматического зачисления оплаты.
              </div>
            </div>

            {/* SEPA EPC QR-Code */}
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-blue-200/80 shadow-2xs text-center space-y-2">
              <div
                className="w-[180px] h-[180px] flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                SEPA Pay by QR
              </span>
              <p className="text-[10px] text-slate-400 leading-tight">
                Отсканируйте в приложении Tatra banka, Revolut, Erste или другого банка ЕС
              </p>
            </div>
          </div>
        </div>

        {/* 5. Footer notes */}
        <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-[11px] text-slate-400">
          <span>Сгенерировано в You Europe CRM • {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('ru-RU') : invoice.issueDate}</span>
          <span>Vystavil: Ekaterina Nezhenkina</span>
        </div>
      </div>
    </div>
  );
}
