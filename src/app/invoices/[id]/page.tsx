'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Printer,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Share2,
  CreditCard,
  QrCode,
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
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            Вернуться в CRM
          </button>
        </div>
      </div>
    );
  }

  const bank = invoice.bankDetails || {
    accountHolder: 'Ekaterina Nezhenkina',
    bankName: 'Tatra banka, a.s.',
    iban: 'SK34 1100 0000 0029 3766 3128',
    swiftBic: 'TATRSKBX',
    vatNote: 'Nicht umsatzsteuerpflichtig gem. Kleinunternehmerregelung / Steuerbefreit',
  };

  const qrSvg = generateSepaQrSvg({
    name: bank.accountHolder,
    iban: bank.iban,
    bic: bank.swiftBic,
    amount: invoice.totalAmountEUR,
    variableSymbol: invoice.variableSymbol,
    purpose: `${invoice.courseName} - ${invoice.studentName}`,
  }, 170);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    success(`Скопировано: ${fieldName}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    success('Ссылка на счёт скопирована в буфер обмена');
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
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 print:p-0 print:bg-white font-sans text-slate-900 selection:bg-blue-100">
      
      {/* Top Floating Control Bar (Strictly hidden on print) */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between flex-wrap gap-3 print:hidden">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          Назад в CRM
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShareLink}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            title="Скопировать публичную ссылку для клиента"
          >
            <Share2 size={14} />
            Поделиться ссылкой
          </button>

          {!isPaid && (
            <button
              onClick={handleMarkPaid}
              disabled={isMarkingPaid}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <CheckCircle2 size={14} />
              Отметить как оплаченный
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Printer size={14} />
            Печать / Сохранить в PDF
          </button>
        </div>
      </div>

      {/* Main Editorial Invoice Sheet */}
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 sm:p-14 space-y-9 print:shadow-none print:border-none print:rounded-none print:p-8 print:max-w-none print:w-full print:m-0">
        
        {/* 1. Header: Left Title + Right Logo */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-7 gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 uppercase">
              INVOICE
            </h1>
            <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
              RECHNUNG / FAKTÚRA
            </p>
          </div>

          <div className="flex items-center gap-3.5 text-right">
            <div className="hidden sm:block space-y-0.5">
              <span className="block text-sm font-black text-slate-900 tracking-tight">YOU EUROPE</span>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Sprachzentrum</span>
            </div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-slate-200 shadow-2xs relative shrink-0 bg-white flex items-center justify-center">
              <Image
                src="/images/logo-you-europe.jpg"
                alt="You Europe Logo"
                width={64}
                height={64}
                className="object-contain w-full h-full p-1"
                priority
              />
            </div>
          </div>
        </div>

        {/* 2. Meta Info Grid (Issued to & Invoice Details) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
          {/* Left Column: Billed to */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              EMPFÄNGER / ISSUED TO:
            </span>
            <div className="space-y-1">
              <p className="text-base font-bold text-slate-900">
                {invoice.parentName || invoice.studentName}
              </p>
              {invoice.parentName && invoice.parentName !== invoice.studentName && (
                <p className="text-slate-600 font-medium">
                  Schüler / Student: <strong>{invoice.studentName}</strong>
                </p>
              )}
              <p className="text-slate-500">
                Online-Sprachkurs / Online Course
              </p>
              {invoice.parentEmail && (
                <p className="text-slate-500">
                  Email: {invoice.parentEmail}
                </p>
              )}
              {invoice.parentPhone && (
                <p className="text-slate-500">
                  Tel: {invoice.parentPhone}
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Invoice Details (Right-aligned on desktop) */}
          <div className="space-y-2 sm:text-right">
            <div className="space-y-1.5">
              <div className="flex sm:justify-end gap-3 items-baseline">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  INVOICE NO / RECHNUNG NR:
                </span>
                <span className="text-sm font-mono font-bold text-slate-900">
                  {invoice.invoiceNumber}
                </span>
              </div>

              <div className="flex sm:justify-end gap-3 items-baseline">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  DATUM / DATE:
                </span>
                <span className="text-xs font-semibold text-slate-800">
                  {invoice.issueDate}
                </span>
              </div>

              <div className="flex sm:justify-end gap-3 items-baseline">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  FÄLLIGKEIT / DUE DATE:
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {invoice.dueDate}
                </span>
              </div>

              <div className="pt-2 sm:flex sm:justify-end">
                {isPaid ? (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
                    <CheckCircle2 size={13} />
                    BEZAHLT / PAID
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold">
                    <Clock size={13} />
                    OFFEN / DUE FOR PAYMENT
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Items Table */}
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 text-slate-900 text-[11px] uppercase tracking-wider font-bold">
                  <th className="py-3 pr-4 font-black">BESCHREIBUNG / DESCRIPTION</th>
                  <th className="py-3 px-3 text-center font-black">PREIS / RATE</th>
                  <th className="py-3 px-3 text-center font-black">MENGE / QTY</th>
                  <th className="py-3 pl-3 text-right font-black">GESAMT / TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {invoice.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/40">
                    <td className="py-4 pr-4">
                      <span className="font-bold text-slate-900 text-sm block">
                        {item.description}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Zeitraum / Period: {invoice.periodLabel}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-center font-mono font-medium text-slate-700">
                      {item.unitPriceEUR.toFixed(2)} €
                    </td>
                    <td className="py-4 px-3 text-center font-mono font-medium text-slate-700">
                      {item.quantity}
                    </td>
                    <td className="py-4 pl-3 text-right font-bold font-mono text-slate-900 text-sm">
                      {item.amountEUR.toFixed(2)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotal & Total Summary */}
          <div className="flex justify-end border-t-2 border-slate-900 pt-4">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span className="uppercase tracking-wider text-[11px] font-semibold">ZWISCHENSUMME / SUBTOTAL:</span>
                <span className="font-mono">{invoice.subtotalEUR.toFixed(2)} €</span>
              </div>
              
              {invoice.discountEUR > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span className="uppercase tracking-wider text-[11px] font-semibold">RABATT / DISCOUNT:</span>
                  <span className="font-mono">-{invoice.discountEUR.toFixed(2)} €</span>
                </div>
              )}

              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>MWST. / VAT (0% / Befreit):</span>
                <span className="font-mono">0.00 €</span>
              </div>

              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-slate-900">
                <span className="text-sm font-black uppercase tracking-tight">GESAMTBETRAG / TOTAL:</span>
                <span className="text-xl font-black font-mono tracking-tight text-blue-700 print:text-black">
                  {invoice.totalAmountEUR.toFixed(2)} €
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Payment Info Block & SEPA QR Code & Signature */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 border-t border-slate-200 items-start">
          
          {/* Bank Details (8 cols) */}
          <div className="md:col-span-8 space-y-3 text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              ZAHLUNGSINFORMATIONEN / PAYMENT INFO:
            </span>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-slate-500 font-medium">Bank:</span>
                <strong className="text-slate-900 font-semibold">{bank.bankName || 'Tatra banka, a.s.'}</strong>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-slate-500 font-medium">Kontoinhaber / Account Name:</span>
                <strong className="text-slate-900 font-semibold">{bank.accountHolder}</strong>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-medium">IBAN:</span>
                <div className="flex items-center gap-2">
                  <strong className="text-slate-900 font-mono font-bold text-sm tracking-wide">
                    {bank.iban}
                  </strong>
                  <button
                    type="button"
                    onClick={() => handleCopy(bank.iban.replace(/\s/g, ''), 'IBAN')}
                    className="p-1 text-slate-400 hover:text-blue-600 print:hidden cursor-pointer"
                    title="Копировать IBAN"
                  >
                    {copiedField === 'IBAN' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {bank.swiftBic && (
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-slate-500 font-medium">SWIFT / BIC:</span>
                  <strong className="text-slate-900 font-mono">{bank.swiftBic}</strong>
                </div>
              )}

              {/* Variable Symbol / Reference */}
              <div className="flex items-center justify-between flex-wrap gap-2 bg-blue-50/80 -mx-4 -mb-4 p-3.5 rounded-b-xl border-t border-blue-100">
                <div>
                  <span className="text-[11px] font-bold text-blue-900 uppercase block">
                    VERWENDUNGSZWECK / PAYMENT REFERENCE:
                  </span>
                  <span className="text-[10px] text-blue-700">
                    Bitte Rechnungsnummer angeben / Please use invoice number as reference
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <strong className="text-base font-mono font-black text-blue-800 bg-white px-2.5 py-0.5 rounded-md border border-blue-200">
                    {invoice.variableSymbol || invoice.invoiceNumber}
                  </strong>
                  <button
                    type="button"
                    onClick={() => handleCopy(String(invoice.variableSymbol || invoice.invoiceNumber), 'Verwendungszweck')}
                    className="p-1 text-blue-600 hover:text-blue-800 print:hidden cursor-pointer"
                    title="Копировать номер счёта"
                  >
                    {copiedField === 'Verwendungszweck' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
              <strong>Hinweis / Note:</strong> {bank.vatNote || 'Nicht umsatzsteuerpflichtig gem. Kleinunternehmerregelung / Steuerbefreit (Exempt from VAT).'}<br />
              Vielen Dank für Ihre Zusammenarbeit! / Thank you for choosing You Europe!
            </p>
          </div>

          {/* QR Code & Signature (4 cols) */}
          <div className="md:col-span-4 flex flex-col items-center justify-center text-center space-y-4 pt-1">
            {/* SEPA QR Code Container */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5 inline-block">
              <div
                dangerouslySetInnerHTML={{ __html: qrSvg }}
                className="w-36 h-36 flex items-center justify-center mx-auto"
              />
              <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                <QrCode size={12} className="text-blue-600" />
                <span>SEPA Pay by QR</span>
              </div>
            </div>

            {/* Signature representation */}
            <div className="pt-2 text-center">
              <div className="font-serif italic text-lg text-slate-700 tracking-wide">
                Ekaterina Nezhenkina
              </div>
              <div className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold border-t border-slate-200 pt-1 mt-0.5">
                YOU EUROPE MANAGEMENT
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
