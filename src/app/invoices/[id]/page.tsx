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
  QrCode,
} from 'lucide-react';
import {
  getStoredInvoices,
  EuropeanInvoiceData,
  markInvoiceAsPaid,
  INITIAL_INVOICES,
} from '@/lib/data/invoiceStorage';
import { generateSepaQrSvg } from '@/lib/data/sepaQrGenerator';
import { transliterateIso } from '@/lib/data/transliteration';
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

  // Set browser title to "YouEurope invoice #[invoiceNumber]" so saving as PDF automatically suggests this name
  useEffect(() => {
    if (!invoice) return;
    const titleStr = `YouEurope invoice #${invoice.invoiceNumber}`;
    document.title = titleStr;

    let titleEl = document.querySelector('title');
    if (!titleEl) {
      titleEl = document.createElement('title');
      document.head.appendChild(titleEl);
    }
    titleEl.textContent = titleStr;

    const enforceTitle = () => {
      document.title = titleStr;
      if (titleEl) titleEl.textContent = titleStr;
    };

    window.addEventListener('beforeprint', enforceTitle);
    window.addEventListener('focus', enforceTitle);

    return () => {
      window.removeEventListener('beforeprint', enforceTitle);
      window.removeEventListener('focus', enforceTitle);
    };
  }, [invoice]);

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

  // Strictly Tatra banka details
  const bank = {
    accountHolder: 'Ekaterina Nezhenkina',
    bankName: 'Tatra banka, a.s.',
    iban: 'SK34 1100 0000 0029 3766 3128',
    swiftBic: 'TATRSKBX',
    vatNote: 'Nicht umsatzsteuerpflichtig gem. Kleinunternehmerregelung / Steuerbefreit',
  };

  // ISO Latin Transliteration for payer names
  const rawStudentName = invoice.studentName || '';
  const rawParentName = invoice.parentName || '';
  const latinStudentName = transliterateIso(rawStudentName);
  const latinParentName = rawParentName ? transliterateIso(rawParentName) : latinStudentName;

  const qrSvg = generateSepaQrSvg({
    name: bank.accountHolder,
    iban: bank.iban,
    bic: bank.swiftBic,
    amount: invoice.totalAmountEUR,
    variableSymbol: invoice.variableSymbol,
    purpose: `${invoice.courseName} - ${latinStudentName}`,
  }, 140);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    success(`Скопировано: ${fieldName}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePrint = () => {
    if (invoice) {
      const titleStr = `YouEurope invoice #${invoice.invoiceNumber}`;
      document.title = titleStr;
      const titleEl = document.querySelector('title');
      if (titleEl) titleEl.textContent = titleStr;
    }
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
    <div className="min-h-screen bg-[#F8FAFC] py-6 px-4 sm:px-6 print:p-0 print:py-0 print:bg-white font-sans text-slate-900 selection:bg-blue-100">
      <title>{`YouEurope invoice #${invoice.invoiceNumber}`}</title>
      
      {/* Top Floating Control Bar (Hidden on print) */}
      <div className="max-w-3xl mx-auto mb-5 flex items-center justify-between flex-wrap gap-3 print:hidden">
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

      {/* Main Clean Printable Invoice Sheet */}
      <div 
        id="invoice-sheet"
        className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200/80 p-7 sm:p-10 space-y-6 print:space-y-4 print:shadow-none print:border-none print:rounded-none print:p-0 print:max-w-none print:w-full print:m-0"
      >
        
        {/* 1. Header: Left Logo + Right Title (Swapped as requested) */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-5 print:pb-3 gap-4">
          
          {/* Top-Left: Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border border-slate-200 shadow-2xs relative shrink-0 bg-white flex items-center justify-center print:w-12 print:h-12">
              <Image
                src="/images/logo-you-europe.jpg"
                alt="You Europe Logo"
                width={56}
                height={56}
                className="object-contain w-full h-full p-0.5"
                priority
              />
            </div>
            <div className="space-y-0.5">
              <span className="block text-base sm:text-lg font-black text-slate-900 tracking-tight">YOU EUROPE</span>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Sprachzentrum</span>
            </div>
          </div>

          {/* Top-Right: INVOICE / RECHNUNG Heading & Number */}
          <div className="text-right space-y-0.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
              INVOICE
            </h1>
            <p className="text-[10.5px] font-bold tracking-widest text-slate-400 uppercase">
              RECHNUNG / FAKTÚRA
            </p>
          </div>
        </div>

        {/* 2. Meta Info Grid (Issued to & Invoice Details) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 print:gap-4 text-xs">
          {/* Left Column: Billed to */}
          <div className="space-y-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
              EMPFÄNGER / ISSUED TO:
            </span>
            <div className="space-y-0.5">
              <p className="text-sm sm:text-base font-bold text-slate-900">
                {latinParentName}
              </p>
              {latinParentName !== latinStudentName && (
                <p className="text-slate-600 font-medium">
                  Schüler / Student: <strong>{latinStudentName}</strong>
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
          <div className="space-y-1.5 sm:text-right">
            <div className="space-y-1">
              <div className="flex sm:justify-end gap-2.5 items-baseline">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  INVOICE NO / RECHNUNG NR:
                </span>
                <span className="text-sm font-mono font-bold text-slate-900">
                  {invoice.invoiceNumber}
                </span>
              </div>

              <div className="flex sm:justify-end gap-2.5 items-baseline">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  DATUM / DATE:
                </span>
                <span className="text-xs font-semibold text-slate-800">
                  {invoice.issueDate}
                </span>
              </div>

              <div className="flex sm:justify-end gap-2.5 items-baseline">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  FÄLLIGKEIT / DUE DATE:
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {invoice.dueDate}
                </span>
              </div>

              <div className="pt-1 sm:flex sm:justify-end">
                {isPaid ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    <CheckCircle2 size={12} />
                    BEZAHLT / PAID
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    <Clock size={12} />
                    OFFEN / DUE FOR PAYMENT
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Items Table */}
        <div className="space-y-3 print:space-y-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 text-slate-900 text-[10.5px] uppercase tracking-wider font-bold">
                  <th className="py-2.5 pr-3 font-black">BESCHREIBUNG / DESCRIPTION</th>
                  <th className="py-2.5 px-3 text-center font-black">PREIS / RATE</th>
                  <th className="py-2.5 px-3 text-center font-black">MENGE / QTY</th>
                  <th className="py-2.5 pl-3 text-right font-black">GESAMT / TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {invoice.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/40">
                    <td className="py-3 print:py-2 pr-3">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                        {item.description}
                      </span>
                      <span className="text-[10.5px] text-slate-500 block mt-0.5">
                        Zeitraum / Period: {invoice.periodLabel}
                      </span>
                    </td>
                    <td className="py-3 print:py-2 px-3 text-center font-mono font-medium text-slate-700">
                      {item.unitPriceEUR.toFixed(2)} €
                    </td>
                    <td className="py-3 print:py-2 px-3 text-center font-mono font-medium text-slate-700">
                      {item.quantity}
                    </td>
                    <td className="py-3 print:py-2 pl-3 text-right font-bold font-mono text-slate-900 text-xs sm:text-sm">
                      {item.amountEUR.toFixed(2)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotal & Total Summary */}
          <div className="flex justify-end border-t-2 border-slate-900 pt-3 print:pt-2">
            <div className="w-64 sm:w-72 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span className="uppercase tracking-wider text-[10.5px] font-semibold">ZWISCHENSUMME / SUBTOTAL:</span>
                <span className="font-mono">{invoice.subtotalEUR.toFixed(2)} €</span>
              </div>
              
              {invoice.discountEUR > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span className="uppercase tracking-wider text-[10.5px] font-semibold">RABATT / DISCOUNT:</span>
                  <span className="font-mono">-{invoice.discountEUR.toFixed(2)} €</span>
                </div>
              )}

              <div className="flex justify-between text-slate-500 text-[10.5px]">
                <span>MWST. / VAT (0% / Befreit):</span>
                <span className="font-mono">0.00 €</span>
              </div>

              <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-200 text-slate-900">
                <span className="text-xs sm:text-sm font-black uppercase tracking-tight">GESAMTBETRAG / TOTAL:</span>
                <span className="text-lg sm:text-xl font-black font-mono tracking-tight text-blue-700 print:text-black">
                  {invoice.totalAmountEUR.toFixed(2)} €
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Payment Info Block & SEPA QR Code & Signature */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 print:gap-4 pt-3 print:pt-2 border-t border-slate-200 items-start">
          
          {/* Bank Details (Strictly Tatra banka credentials) */}
          <div className="md:col-span-8 space-y-2 text-xs">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
              ZAHLUNGSINFORMATIONEN / PAYMENT INFO:
            </span>

            <div className="bg-slate-50 rounded-xl p-3 sm:p-3.5 border border-slate-200 space-y-2 print:p-2.5 print:space-y-1.5 print:bg-slate-50/50">
              <div className="flex items-center justify-between flex-wrap gap-1 text-[11px]">
                <span className="text-slate-500 font-medium">Kontoinhaber / Account Name:</span>
                <strong className="text-slate-900 font-semibold">{bank.accountHolder}</strong>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-1 text-[11px]">
                <span className="text-slate-500 font-medium">Bank:</span>
                <strong className="text-slate-900 font-semibold">{bank.bankName}</strong>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-1 pt-1 border-t border-slate-200 text-[11px]">
                <span className="text-slate-500 font-medium">IBAN:</span>
                <div className="flex items-center gap-1.5">
                  <strong className="text-slate-900 font-mono font-bold text-xs sm:text-sm tracking-wide">
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

              <div className="flex items-center justify-between flex-wrap gap-1 text-[11px]">
                <span className="text-slate-500 font-medium">SWIFT / BIC:</span>
                <strong className="text-slate-900 font-mono">{bank.swiftBic}</strong>
              </div>

              {/* Variable Symbol / Reference (Invoice Number) */}
              <div className="flex items-center justify-between flex-wrap gap-1.5 bg-blue-50/80 -mx-3 -mb-3 sm:-mx-3.5 sm:-mb-3.5 p-2.5 sm:p-3 rounded-b-xl border-t border-blue-100 print:-mx-2.5 print:-mb-2.5 print:p-2">
                <div>
                  <span className="text-[10.5px] font-bold text-blue-900 uppercase block">
                    VERWENDUNGSZWECK / PAYMENT REFERENCE:
                  </span>
                  <span className="text-[9.5px] text-blue-700">
                    Bitte geben Sie Ihre «Fakturnummer» ({invoice.invoiceNumber}) als Verwendungszweck an
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <strong className="text-sm sm:text-base font-mono font-black text-blue-800 bg-white px-2 py-0.5 rounded-md border border-blue-200">
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

            <p className="text-[9.5px] text-slate-400 leading-relaxed pt-0.5">
              <strong>Hinweis / Note:</strong> {bank.vatNote}<br />
              Vielen Dank für Ihre Zusammenarbeit! / Thank you for choosing You Europe!
            </p>
          </div>

          {/* QR Code & Signature (4 cols) */}
          <div className="md:col-span-4 flex flex-col items-center justify-center text-center space-y-3 pt-0.5">
            {/* SEPA QR Code Container */}
            <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs space-y-1 inline-block print:p-1.5 print:rounded-lg">
              <div
                dangerouslySetInnerHTML={{ __html: qrSvg }}
                className="w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center mx-auto"
              />
              <div className="flex items-center justify-center gap-1 text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">
                <QrCode size={11} className="text-blue-600" />
                <span>SEPA Pay by QR</span>
              </div>
            </div>

            {/* Signature representation */}
            <div className="pt-1 text-center">
              <div className="font-serif italic text-base sm:text-lg text-slate-700 tracking-wide">
                Ekaterina Nezhenkina
              </div>
              <div className="text-[8.5px] uppercase tracking-widest text-slate-400 font-semibold border-t border-slate-200 pt-0.5 mt-0.5">
                YOU EUROPE MANAGEMENT
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Strict Print CSS: Single-page A4 isolation */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          html, body {
            background-color: #FFFFFF !important;
            background: #FFFFFF !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide all navigation, CRM layout, sidebars, headers and toolbars */
          nav, aside, header, [role="navigation"], .sidebar, .print\\:hidden {
            display: none !important;
            visibility: hidden !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          #invoice-sheet {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            display: block !important;
            visibility: visible !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

    </div>
  );
}
