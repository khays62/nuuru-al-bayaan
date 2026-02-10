/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect } from 'react';
import { Printer, X, Download, FileText, CheckCircle, Search, Calendar, ChevronRight, Users, TrendingUp } from 'lucide-react';
import { listGradeSections } from '../../grades/api/gradeSections';
import financeService from '../api/finance';
import toast from 'react-hot-toast';
import headerImg from '../../../assets/nuuruBayaanHeader.png';

// Reusable Print Modal Wrapper with Enterprise Aesthetics
const PrintModalWrapper = ({ title, subtitle, onClose, onPrint, children, loading }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 animate-in zoom-in-95 duration-300">

            {/* Enterprise Header */}
            <div className="flex justify-between items-center p-8 bg-slate-900 text-white shadow-xl shrink-0">
                <div className="flex items-center gap-5">
                    <div className="bg-blue-600/20 p-4 rounded-3xl backdrop-blur-xl border border-white/10">
                        <Printer className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">{title}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">{subtitle}</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-white/30 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-2xl">
                    <X size={32} />
                </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-white text-slate-900">
                {children}
            </div>

            {/* Premium Footer */}
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                <button
                    onClick={onClose}
                    className="text-slate-500 font-black uppercase text-xs tracking-widest hover:text-slate-900 transition-colors"
                >
                    Dismiss
                </button>
                <button
                    onClick={onPrint}
                    disabled={loading}
                    className="bg-slate-900 text-white px-10 py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-slate-400 hover:bg-black transition-all flex items-center gap-4 disabled:opacity-50"
                >
                    {loading ? 'Generating...' : <><Printer size={18} strokeWidth={3} /> Initializing Print</>}
                </button>
            </div>
        </div>
    </div>
);

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const toYYYYMM = (monthName, yearRange) => {
    const idx = months.indexOf(monthName);
    if (idx === -1) return null;

    // Extract all 4-digit years (e.g., "2025-2026" -> ["2025", "2026"])
    const years = (yearRange || '').match(/\d{4}/g) || [new Date().getFullYear().toString()];

    let yearToUse = years[0];
    // In a split academic year (e.g. 2025-2026), 
    // Jan-Aug (0-7) usually belong to the second year (2026).
    // Sep-Dec (8-11) usually belong to the first year (2025).
    if (years.length > 1 && idx < 8) {
        yearToUse = years[1];
    }

    return `${yearToUse}-${(idx + 1).toString().padStart(2, '0')}`;
};



const storedLogo = localStorage.getItem('headerImg');
const logoUrl = storedLogo || headerImg;

const isMongoObjectIdString = (value) => typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);

const normalizeMonth = (value) => {
    if (!value || typeof value !== 'string') return null;
    const raw = value.trim();
    const m2 = raw.match(/^(\d{4})-(\d{2})$/);
    if (m2) return `${m2[1]}-${m2[2]}`;
    const m1 = raw.match(/^(\d{4})-(\d{1})$/);
    if (m1) return `${m1[1]}-0${m1[2]}`;
    return null;
};

const isInvoiceHormaris = (inv) => {
    if (!inv) return false;
    if (typeof inv.isHormaris === 'boolean') return inv.isHormaris;
    const createdMonth = inv.createdAt ? new Date(inv.createdAt).toISOString().slice(0, 7) : '';
    const billingMonthNorm = normalizeMonth(inv.billingMonth);
    return !!billingMonthNorm && !!createdMonth && billingMonthNorm > createdMonth;
};

const calcInvoiceTotalsForPrint = (inv, paymentType = 'level') => {
    const totalDiscount = inv?.discounts?.reduce((s, d) => s + (d?.amountOff || 0), 0) || 0;
    const isFree = !!inv?.isWaived || !!inv?.student?.isFree;
    const baseFee = isFree
        ? Number(inv?.class?.fee ?? inv?.fee ?? inv?.amount ?? 0)
        : Number(inv?.amount || 0);
    const grossFee = baseFee + totalDiscount;
    const isLevelMode = paymentType === 'level';
    const displayPaid = isFree
        ? 0
        : (isLevelMode
            ? Number(inv?.paidAmount || 0) + totalDiscount
            : Number(inv?.paidAmount || 0));
    const balance = Number(inv?.balance || 0);
    return { totalDiscount, isFree, baseFee, grossFee, isLevelMode, displayPaid, balance };
};

const getShiftLabelForInvoice = (inv, fallbackShift) => {
    const rawShift = inv?.class?.shift ?? inv?.shift ?? fallbackShift;
    return (
        (typeof rawShift === 'string'
            ? (isMongoObjectIdString(rawShift) ? '' : rawShift)
            : (rawShift?.name || rawShift?.shiftName || rawShift?.label || rawShift?.shiftName)) ||
        '—'
    );
};

const renderViewInfoStyleVoucherCard = ({
    headerSrc,
    dateNow,
    academicYear,
    recNo,
    classLabel,
    studentId,
    studentName,
    shiftLabel,
    description,
    paidHtml,
    billingMonthLabel,
    balance,
    feeMetaHtml,
    arrearsHtml,
}) => {
    return `
        <div class="voucher-card">
            <div class="header-main">
                <img src="${headerSrc || ''}" class="header-logo" />
            </div>

            <div class="top-meta">
                <div>Date: ${dateNow}</div>
                <div>${academicYear || ''}</div>
            </div>

            <h2 class="voucher-title">RECEIPT VOUCHER</h2>

            <table class="voucher-table">
                <tbody>
                    <tr>
                        <td><span class="cell-muted">RV:</span> ${recNo}</td>
                        <td><span class="cell-muted">Class:</span> ${classLabel} &nbsp;&nbsp; <span class="cell-muted">ID:</span> ${studentId}</td>
                    </tr>
                    <tr>
                        <td>Student name</td>
                        <td>${studentName}</td>
                    </tr>
                    <tr>
                        <td>Shift</td>
                        <td>${shiftLabel}</td>
                    </tr>
                    <tr>
                        <td>Description</td>
                        <td>
                            <div class="cell-flex">
                                <span>${description}</span>
                                ${paidHtml || ''}
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td><span class="cell-muted">Month:</span> ${billingMonthLabel}</td>
                        <td>
                            <div class="cell-flex">
                                <span><span class="cell-muted">Balance:</span> $${Number(balance || 0).toFixed(2)}</span>
                                ${feeMetaHtml || ''}
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            ${arrearsHtml || ''}
            <p class="voucher-note">* Note: This receipt represents the level-agreed amount.</p>
        </div>
    `;
};

const renderViewInfoStyleMultiVoucher = ({ headerSrc, dateNow, academicYear, recNo, classLabel, studentId, studentName, shiftLabel, monthsCount, rowsHtml }) => {
    return `
        <div class="voucher-card">
            <div class="header-main">
                <img src="${headerSrc || ''}" class="header-logo" />
            </div>

            <div class="top-meta">
                <div>Date: ${dateNow}</div>
                <div>${academicYear || ''}</div>
            </div>
            <h2 class="voucher-title">RECEIPT VOUCHER</h2>

            <table class="voucher-table">
                <tbody>
                    <tr>
                        <td><span class="cell-muted">RV:</span> ${recNo}</td>
                        <td><span class="cell-muted">Class:</span> ${classLabel} &nbsp;&nbsp; <span class="cell-muted">ID:</span> ${studentId}</td>
                    </tr>
                    <tr>
                        <td>Student name</td>
                        <td>${studentName}</td>
                    </tr>
                    <tr>
                        <td>Shift</td>
                        <td>${shiftLabel}</td>
                    </tr>
                    <tr>
                        <td>Description</td>
                        <td>Hormaris payment (${monthsCount} month${monthsCount === 1 ? '' : 's'})</td>
                    </tr>
                </tbody>
            </table>

            <table class="items">
                <thead>
                    <tr>
                        <th style="text-align:left">Description</th>
                        <th style="text-align:left">Month</th>
                        <th style="text-align:right">Paid</th>
                        <th style="text-align:right">Balance</th>
                        <th style="text-align:right">Fee</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <p class="voucher-note">* Note: This receipt represents the level-agreed amount.</p>
        </div>
    `;
};

export function openMonthlyInvoicesPreview({ month, invoices, students }) {
    const derivedInvoices = Array.isArray(invoices)
        ? invoices
        : (students || []).flatMap((s) => s?.invoices || []);

    const eligible = (derivedInvoices || []).filter((inv) => {
        if (!inv || inv.status === 'Cancelled') return false;
        return true;
    });

    if (!eligible || eligible.length === 0) {
        toast.error('No invoices found to print');
        return;
    }
    const win = window.open('', '_blank');
    if (!win) return;

    const cardsHtml = (eligible || []).map((inv) => {
        const dateNow = new Date().toLocaleString();
        const recNo = `RV-${String(inv?._id || '').slice(-6).toUpperCase()}`;
        const studentName = inv.student?.fullName || '—';
        const studentId = inv.student?.studentId || '—';
        const gradeName = inv.class?.grade?.gradeName || inv.class?.grade?.name || inv.class?.gradeName || '';
        const section = inv.class?.section || inv.class?.sectionName || '';
        const classLabel = (
            inv.classLabel ||
            inv.class?.name ||
            `${gradeName}${section ? ` - ${section}` : ''}`.trim() ||
            inv.student?.currentClass ||
            inv.student?.classLabel ||
            '—'
        );
        const shiftLabel = getShiftLabelForInvoice(inv, inv?.shiftLabel);
        const billingMonth = inv.billingMonth || month || '—';
        const billingMonthLabel = `${billingMonth}${isInvoiceHormaris(inv) ? ' (Hormaris)' : ''}`;
        const description = inv.title || inv.items?.[0]?.category?.name || 'Monthly fee';

        const { totalDiscount, isFree, grossFee, isLevelMode, displayPaid, balance } = calcInvoiceTotalsForPrint(inv, 'level');

        const paidHtml = (!isFree && Number(displayPaid || 0) > 0)
            ? `<span class="money">Paid $${Number(displayPaid || 0).toFixed(2)}</span>`
            : '';
        const feeMetaHtml = isLevelMode
            ? `<span class="cell-muted">(Fee $${Number(grossFee || 0).toFixed(2)})</span>`
            : `<span class="cell-muted">(Fee $${Number(grossFee || 0).toFixed(2)}, Discount $${Number(totalDiscount || 0).toFixed(2)})</span>`;

        return renderViewInfoStyleVoucherCard({
            headerSrc: logoUrl,
            dateNow,
            academicYear: inv.academicYear?.yearName || '—',
            recNo,
            classLabel,
            studentId,
            studentName,
            shiftLabel,
            description,
            paidHtml,
            billingMonthLabel,
            balance,
            feeMetaHtml,
            arrearsHtml: '',
        });
    }).join('<div class="page-break"></div>');

    win.document.open();
    win.document.write(`
        <html>
            <head>
                <title>SYD ERP - Monthly Vouchers</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                <style>
                    @page { size: portrait; margin: 0; }
                    body { font-family: 'Inter', sans-serif; background: #fff; margin: 0; padding: 0; }
                    .page-break { page-break-after: always; }
                    .voucher-card { padding: 26px; display: flex; flex-direction: column; position: relative; }

                    .header-main { text-align: center; margin-bottom: 6px; width: 100%; }
                    .header-logo { display: block; margin: 0 auto; width: 100%; height: auto; max-height: 28mm; object-fit: contain; }

                    .top-meta { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; font-weight: 700; margin-top: 2px; }
                    .voucher-title { text-align: center; font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 10px 0 12px; letter-spacing: 0.5px; }

                    .voucher-table { width: 100%; border-collapse: collapse; }
                    .voucher-table td { border: 1px solid #000; padding: 10px 12px; font-size: 13px; font-weight: 700; color: #000; }
                    .cell-flex { display: flex; justify-content: space-between; gap: 12px; }
                    .cell-muted { font-weight: 700; color: #111; }
                    .money { font-weight: 900; white-space: nowrap; }
                    .voucher-note { font-size: 9px; font-weight: 700; font-style: italic; color: #64748b; margin-top: 8px; }
                </style>
            </head>
            <body onload="window.print()">${cardsHtml}</body>
        </html>
    `);
    win.document.close();
}

export function openDailyAuditPreview({ transactions }) {
    if (!transactions || transactions.length === 0) {
        toast.error('No transactions found to print');
        return;
    }
    const win = window.open('', '_blank');
    if (!win) return;

    const groups = new Map();
    const singles = [];

    for (const t of transactions || []) {
        const groupId = t?.paymentGroup ? String(t.paymentGroup) : '';
        if (groupId) {
            if (!groups.has(groupId)) groups.set(groupId, []);
            groups.get(groupId).push(t);
        } else {
            singles.push(t);
        }
    }

    const groupCards = Array.from(groups.entries()).flatMap(([groupId, txs]) => {
        const first = txs?.[0];
        const dateNow = new Date(first?.createdAt || Date.now()).toLocaleString();
        const recNo = `RV-${String(groupId).slice(-6).toUpperCase()}`;

        const studentName = first?.student?.fullName || '—';
        const studentId = first?.student?.studentId || '—';
        const firstInv = first?.invoice;

        const gradeName = firstInv?.class?.grade?.gradeName || firstInv?.class?.grade?.name || firstInv?.class?.gradeName || '';
        const section = firstInv?.class?.section || firstInv?.class?.sectionName || '';
        const classLabel = (
            firstInv?.classLabel ||
            firstInv?.class?.name ||
            `${gradeName}${section ? ` - ${section}` : ''}`.trim() ||
            first?.student?.currentClass ||
            first?.student?.classLabel ||
            '—'
        );
        const shiftLabel = getShiftLabelForInvoice(firstInv, first?.shiftLabel ?? first?.shift);

        const txByInvoice = new Map();
        const invoiceById = new Map();

        for (const t of txs || []) {
            const inv = t?.invoice;
            if (!inv?._id) continue;
            const invId = String(inv._id);
            invoiceById.set(invId, inv);
            txByInvoice.set(invId, (txByInvoice.get(invId) || 0) + Number(t?.amount || 0));
        }

        const invoices = Array.from(invoiceById.values())
            .sort((a, b) => String(a?.billingMonth || '').localeCompare(String(b?.billingMonth || '')));

        const rowsHtml = invoices.map((inv) => {
            const paidInGroup = Number(txByInvoice.get(String(inv._id)) || 0);
            const { isFree, grossFee, balance } = calcInvoiceTotalsForPrint(inv, 'level');
            const createdMonth = inv?.createdAt ? new Date(inv.createdAt).toISOString().slice(0, 7) : '';
            const billingMonthNorm = normalizeMonth(inv?.billingMonth);
            const isHormaris = typeof inv?.isHormaris === 'boolean'
                ? inv.isHormaris
                : (!!billingMonthNorm && !!createdMonth && billingMonthNorm > createdMonth);
            const monthLabel = `${inv?.billingMonth || '—'}${isHormaris ? ' (Hormaris)' : ''}`;
            const desc = inv?.title || inv?.items?.[0]?.category?.name || 'Monthly fee';

            return `
                <tr>
                    <td style="text-align:left">${desc}</td>
                    <td style="text-align:left">${monthLabel}</td>
                    <td style="text-align:right">${isFree ? '—' : `$${Number(paidInGroup || 0).toFixed(2)}`}</td>
                    <td style="text-align:right">$${Number(balance || 0).toFixed(2)}</td>
                    <td style="text-align:right">${isFree ? '—' : `$${Number(grossFee || 0).toFixed(2)}`}</td>
                </tr>
            `;
        }).join('');

        const hasHormaris = invoices.some((inv) => {
            if (!inv) return false;
            if (typeof inv.isHormaris === 'boolean') return inv.isHormaris;
            const createdMonth = inv?.createdAt ? new Date(inv.createdAt).toISOString().slice(0, 7) : '';
            const billingMonthNorm = normalizeMonth(inv?.billingMonth);
            return !!billingMonthNorm && !!createdMonth && billingMonthNorm > createdMonth;
        });

        if (!hasHormaris && invoices.length === 1) {
            const inv = invoices[0];
            const paidInGroup = Number(txByInvoice.get(String(inv._id)) || 0);
            const billingMonth = inv?.billingMonth || '—';
            const billingMonthLabel = `${billingMonth}${isInvoiceHormaris(inv) ? ' (Hormaris)' : ''}`;
            const description = inv?.title || inv?.items?.[0]?.category?.name || 'Monthly fee';
            const paidHtml = `<span class="money">Paid $${Number(paidInGroup || 0).toFixed(2)}</span>`;

            const { totalDiscount, grossFee, isLevelMode, balance } = calcInvoiceTotalsForPrint(inv, 'level');
            const feeMetaHtml = isLevelMode
                ? `<span class="cell-muted">(Fee $${Number(grossFee || 0).toFixed(2)})</span>`
                : `<span class="cell-muted">(Fee $${Number(grossFee || 0).toFixed(2)}, Discount $${Number(totalDiscount || 0).toFixed(2)})</span>`;

            return [renderViewInfoStyleVoucherCard({
                headerSrc: logoUrl,
                dateNow,
                academicYear: inv?.academicYear?.yearName || '—',
                recNo,
                classLabel,
                studentId,
                studentName,
                shiftLabel,
                description,
                paidHtml,
                billingMonthLabel,
                balance,
                feeMetaHtml,
                arrearsHtml: '',
            })];
        }

        return [renderViewInfoStyleMultiVoucher({
            headerSrc: logoUrl,
            dateNow,
            academicYear: firstInv?.academicYear?.yearName || '—',
            recNo,
            classLabel,
            studentId,
            studentName,
            shiftLabel,
            monthsCount: invoices.length,
            rowsHtml,
        })];
    });

    const singleCards = (singles || []).map((t) => {
        const dateNow = new Date(t?.createdAt || Date.now()).toLocaleString();
        const recNo = `RV-${String(t?._id || '').slice(-6).toUpperCase()}`;

        const studentName = t.student?.fullName || '—';
        const studentId = t.student?.studentId || '—';

        const gradeName = t.invoice?.class?.grade?.gradeName || t.invoice?.class?.grade?.name || t.invoice?.class?.gradeName || '';
        const section = t.invoice?.class?.section || t.invoice?.class?.sectionName || '';
        const classLabel = (
            t.invoice?.classLabel ||
            t.invoice?.class?.name ||
            `${gradeName}${section ? ` - ${section}` : ''}`.trim() ||
            t.student?.currentClass ||
            t.student?.classLabel ||
            '—'
        );

        const shiftLabel = getShiftLabelForInvoice(t?.invoice, t?.shiftLabel ?? t?.shift);

        const { isFree, grossFee, balance } = calcInvoiceTotalsForPrint(t?.invoice, 'level');
        const createdMonth = t.invoice?.createdAt ? new Date(t.invoice.createdAt).toISOString().slice(0, 7) : '';
        const billingMonthNorm = normalizeMonth(t.invoice?.billingMonth);
        const isHormaris = typeof t.invoice?.isHormaris === 'boolean'
            ? t.invoice.isHormaris
            : (!!billingMonthNorm && !!createdMonth && billingMonthNorm > createdMonth);
        const monthLabel = `${t.invoice?.billingMonth || '—'}${isHormaris ? ' (Hormaris)' : ''}`;
        const desc = t.invoice?.title || t.invoice?.items?.[0]?.category?.name || 'Monthly fee';

        if (!isHormaris) {
            const paidHtml = `<span class="money">Paid $${Number(t.amount || 0).toFixed(2)}</span>`;
            const { totalDiscount, isLevelMode } = calcInvoiceTotalsForPrint(t?.invoice, 'level');
            const feeMetaHtml = isLevelMode
                ? `<span class="cell-muted">(Fee $${Number(grossFee || 0).toFixed(2)})</span>`
                : `<span class="cell-muted">(Fee $${Number(grossFee || 0).toFixed(2)}, Discount $${Number(totalDiscount || 0).toFixed(2)})</span>`;

            return renderViewInfoStyleVoucherCard({
                headerSrc: logoUrl,
                dateNow,
                academicYear: t.invoice?.academicYear?.yearName || '—',
                recNo,
                classLabel,
                studentId,
                studentName,
                shiftLabel,
                description: desc,
                paidHtml,
                billingMonthLabel: monthLabel,
                balance,
                feeMetaHtml,
                arrearsHtml: '',
            });
        }

        const rowsHtml = `
            <tr>
                <td style="text-align:left">${desc}</td>
                <td style="text-align:left">${monthLabel}</td>
                <td style="text-align:right">${isFree ? '—' : `$${Number(t.amount || 0).toFixed(2)}`}</td>
                <td style="text-align:right">$${Number(balance || 0).toFixed(2)}</td>
                <td style="text-align:right">${isFree ? '—' : `$${Number(grossFee || 0).toFixed(2)}`}</td>
            </tr>
        `;

        return renderViewInfoStyleMultiVoucher({
            headerSrc: logoUrl,
            dateNow,
            academicYear: t.invoice?.academicYear?.yearName || '—',
            recNo,
            classLabel,
            studentId,
            studentName,
            shiftLabel,
            monthsCount: 1,
            rowsHtml,
        });
    });

    const cardsHtml = [...groupCards, ...singleCards].join('<div class="page-break"></div>');

    win.document.open();
    win.document.write(`
        <html>
            <head>
                <title>SYD ERP - Daily Audit</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                <style>
                    @page { size: portrait; margin: 0; }
                    body { font-family: 'Inter', sans-serif; background: #fff; margin: 0; padding: 0; }
                    .page-break { page-break-after: always; }
                    .voucher-card { padding: 26px; display: flex; flex-direction: column; position: relative; }

                    .header-main { text-align: center; margin-bottom: 6px; width: 100%; }
                    .header-logo { display: block; margin: 0 auto; width: 100%; height: auto; max-height: 28mm; object-fit: contain; }

                    .top-meta { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; font-weight: 700; margin-top: 2px; }
                    .voucher-title { text-align: center; font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 10px 0 12px; letter-spacing: 0.5px; }

                    .voucher-table { width: 100%; border-collapse: collapse; }
                    .voucher-table td { border: 1px solid #000; padding: 10px 12px; font-size: 13px; font-weight: 700; color: #000; }
                    .cell-flex { display: flex; justify-content: space-between; gap: 12px; }
                    .cell-muted { font-weight: 700; color: #111; }
                    .money { font-weight: 900; white-space: nowrap; }
                    .voucher-note { font-size: 9px; font-weight: 700; font-style: italic; color: #64748b; margin-top: 8px; }

                    .items { width: 100%; border-collapse: collapse; margin-top: 8px; }
                    .items th, .items td { border: 1px solid #000; padding: 8px 10px; font-size: 12px; font-weight: 800; color: #000; }
                    .items th { background: #f8fafc; text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; }
                </style>
            </head>
            <body onload="window.print()">
                ${cardsHtml}
            </body>
        </html>
    `);
    win.document.close();
}

export function openPasscardsPreview({ cards, examType, academicYear, validFrom, layout = 'portrait' }) {
    const shiftToLabel = (rawShift) => {
        if (!rawShift) return '';
        if (typeof rawShift === 'string') return isMongoObjectIdString(rawShift) ? '' : rawShift;
        return rawShift?.name || rawShift?.shiftName || rawShift?.label || '';
    };

    const normalized = (cards || []).map((c) => {
        // Accept already-normalized cards (fullName/studentId/classLabel/isCleared)
        if (c && (c.fullName || c.studentId || c.classLabel)) {
            return {
                ...c,
                // Never coerce objects to String here (prevents "[object Object]")
                shift: shiftToLabel(c.shift) || '',
            };
        }

        // Accept backend-shaped cards: { student, class, clearanceStatus, totals }
        const student = c?.student || {};
        const gradeSection = c?.class || {};
        const gradeName = gradeSection?.grade?.gradeName || gradeSection?.grade?.name || '';
        const section = gradeSection?.section || '';
        const shiftName = shiftToLabel(gradeSection?.shift);
        const balance = Number(c?.totals?.balance ?? 0);
        const isCleared = String(c?.clearanceStatus || '').toUpperCase() === 'CLEARED' || balance <= 0;

        return {
            isCleared,
            fullName: student?.fullName || '',
            studentId: student?.studentId || '',
            classLabel: `${gradeName}${section ? ` - ${section}` : ''}`.trim(),
            shift: shiftName || 'MAIN',
        };
    });

    if (!normalized || normalized.length === 0) {
        toast.error('No cards found to print');
        return;
    }
    const win = window.open('', '_blank');
    if (!win) return;

    const isPortrait = layout === 'portrait';

    const formatDate = (d) => {
        try {
            return new Date(d).toLocaleDateString(undefined, {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            });
        } catch {
            return '';
        }
    };

    const fromDate = validFrom ? new Date(validFrom) : new Date();
    const toDate = new Date(fromDate);
    toDate.setDate(toDate.getDate() + 7);

    const nowLabel = new Date().toLocaleString();
    const yearLabel = academicYear || '';
    const validityLabel = `Valid from ${formatDate(fromDate)} to ${formatDate(toDate)}`;

    const cardsHtml = (normalized || []).map(c => `
        <div class="card ${isPortrait ? 'portrait' : 'landscape'}">
            <div class="card-inner">
                <div class="header-main">
                    ${logoUrl ? `<img src="${logoUrl}" class="card-logo" />` : ''}
                </div>

                <div class="meta-bar">
                    <div><span class="meta-lbl">ACADEMIC YEAR:</span> ${yearLabel || '—'}</div>
                    <div><span class="meta-lbl">DATE:</span> ${nowLabel}</div>
                </div>

                <div class="blue-line"></div>

                <div class="title-row">
                    <div class="title">CLEARANCE CARD</div>
                    <div class="exam">${String(examType || '').toUpperCase()}</div>
                </div>

                <div class="main-grid">
                    <div class="info-box">
                        <div class="row"><div class="lbl">Student Name</div><div class="val">${c.fullName || '—'}</div></div>
                        <div class="row"><div class="lbl">Class</div><div class="val">${c.classLabel || '—'}</div></div>
                        <div class="row"><div class="lbl">Shift</div><div class="val">${(typeof c.shift === 'string' ? c.shift : shiftToLabel(c.shift)) || 'MAIN'}</div></div>
                        <div class="row"><div class="lbl">ID</div><div class="val" style="font-family:monospace">${c.studentId || '—'}</div></div>
                        <div class="row"><div class="lbl">Room</div><div class="val">${c.room || '—'}</div></div>
                        <div class="row"><div class="lbl">Hall</div><div class="val">${c.hall || '—'}</div></div>
                    </div>

                    <div class="photo-box">
                        <div class="photo-frame">
                            <div class="photo-placeholder">PHOTO</div>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    <div class="validity">${validityLabel}</div>
                    <div class="notice">Any student who attempts fabrication has no right to continue his / her education at School</div>
                    <div class="stamp">REGISTRAR OFFICIAL STAMP</div>
                </div>
            </div>
        </div>
    `).join('');

    win.document.write(`
        <html>
            <head>
                <title>Academic Passcards - ${examType}</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Inter', sans-serif; background: #f8fafc; padding: 20px; }
                    .card { 
                        background: white; 
                        border: 1px solid #000; 
                        margin: 10px; 
                        display: inline-block; 
                        vertical-align: top;
                        box-sizing: border-box;
                        border-radius: 10px;
                        overflow: hidden;
                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.08);
                    }
                    .portrait { width: 340px; height: 520px; }
                    .landscape { width: 520px; height: 340px; }
                    
                    .card-inner { padding: 15px; height: 100%; display: flex; flex-direction: column; }
                    
                    .header-main { width: 100%; margin-bottom: 6px; }
                    .card-logo { display: block; width: 100%; height: auto; max-height: 22mm; object-fit: contain; }

                    .meta-bar { display: flex; justify-content: space-between; font-size: 8px; font-weight: 800; color: #111; }
                    .meta-lbl { color: #475569; font-weight: 900; }
                    
                    .blue-line { background: #000; height: 2px; margin: 8px -15px 10px; }
                    
                    .title-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
                    .title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
                    .exam { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px; color: #111; }

                    .main-grid { flex: 1; display: flex; gap: 12px; }
                    .portrait .main-grid { flex-direction: column; }
                    .landscape .main-grid { flex-direction: row; }

                    .info-box { flex: 1; border: 1px solid #000; border-radius: 6px; overflow: hidden; }
                    .row { display: grid; grid-template-columns: 110px 1fr; border-bottom: 1px solid #000; }
                    .row:last-child { border-bottom: none; }
                    .lbl { padding: 8px 10px; font-size: 10px; font-weight: 900; color: #111; background: #fff; }
                    .val { padding: 8px 10px; font-size: 10px; font-weight: 900; text-transform: uppercase; }

                    .landscape .lbl { padding: 6px 8px; font-size: 9px; }
                    .landscape .val { padding: 6px 8px; font-size: 9px; }

                    .photo-box { width: 140px; display: flex; justify-content: center; }
                    .portrait .photo-box { width: 100%; justify-content: flex-end; }
                    .photo-frame { width: 120px; height: 140px; border: 1px solid #000; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
                    .photo-placeholder { font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }

                    .landscape .photo-frame { height: 110px; }

                    .footer { margin-top: 10px; }
                    .validity { font-size: 9px; font-weight: 900; color: #111; text-align: center; margin-bottom: 6px; }
                    .notice { font-size: 7px; font-weight: 800; color: #475569; text-align: center; margin-bottom: 8px; font-style: italic; }
                    .stamp { border: 1px dashed #cbd5e1; height: 46px; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 900; color: #94a3b8; text-transform: uppercase; }

                    .landscape .footer { margin-top: 6px; }
                    .landscape .validity { font-size: 8px; margin-bottom: 4px; }
                    .landscape .notice { font-size: 6px; margin-bottom: 6px; }
                    .landscape .stamp { height: 36px; font-size: 7px; }
                    
                    @media print { 
                        body { background: white; padding: 0; } 
                        .card { margin: 5px; page-break-inside: avoid; box-shadow: none; border-width: 1px; }
                    }
                </style>
            </head>
            <body onload="window.print()">${cardsHtml}</body>
        </html>
    `);
    win.document.close();
}

// 1. Monthly Invoice Modal
export const PrintMonthlyInvoiceModal = ({ onClose }) => {
    const [month, setMonth] = useState(months[new Date().getMonth()]);
    const [classes, setClasses] = useState([]);
    const [years, setYears] = useState([]);
    const [amountTypes, setAmountTypes] = useState([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [clsRes, yrRes, catRes] = await Promise.all([
                    listGradeSections({ limit: 100 }),
                    financeService.getAcademicYears(),
                    financeService.getFinanceCategories('fee')
                ]);

                const classesData = Array.isArray(clsRes)
                    ? clsRes
                    : (clsRes?.data?.data || clsRes?.data || []);
                const yearsData = Array.isArray(yrRes) ? yrRes : (yrRes?.data || []);
                const categoriesData = Array.isArray(catRes) ? catRes : (catRes?.data || []);

                let finalClasses = classesData;
                if (finalClasses.length === 0) {
                    try {
                        const fallback = await financeService.getGradeSections({ limit: 100 });
                        finalClasses = Array.isArray(fallback)
                            ? fallback
                            : (fallback?.data || []);
                    } catch {
                        // ignore, keep empty
                    }
                }

                setClasses(finalClasses);
                setYears(yearsData);
                const filteredCategories = (categoriesData || []).filter(c => {
                    const name = String(c?.name || '').trim().toLowerCase();
                    return name !== 'previous balance';
                });
                setAmountTypes(filteredCategories);

                // Set default to most recent year if no "active" status exists in schema
                if (yearsData.length > 0) {
                    const latestYear = yearsData[0]?._id || '';
                    setSelectedYear(latestYear);
                }
            } catch (e) {
                console.error("Monthly Invoice Sync Error:", e);
                toast.error("Report sync failed");
            }
        };
        load();
    }, []);

    const handlePrint = async () => {
        const selectedYearObj = years.find(y => y._id === selectedYear);
        const yearName = selectedYearObj?.yearName || '';

        const ym = toYYYYMM(month, yearName);
        if (!ym) return toast.error('Check month field');
        if (!selectedYear) return toast.error('Select Academic Year');

        setLoading(true);
        try {
            const data = await financeService.printMonthlyInvoices({
                month: ym,
                academicYearId: selectedYear,
                classId: selectedClass || undefined,
                categoryId: selectedCategory || undefined
            });
            const txs = Array.isArray(data?.transactions) ? data.transactions : [];
            if (txs.length > 0) {
                openDailyAuditPreview({ transactions: txs });
            } else {
                openMonthlyInvoicesPreview({
                    month: `${month} ${yearName}`,
                    title: 'Official Academic Monthly Statement',
                    invoices: data?.invoices || [],
                    totals: data?.totals || null
                });
            }
            onClose();
        } catch (e) {
            const msg = e?.response?.data?.message || e?.message || 'Report generation failed';
            toast.error(msg);
            console.error('Monthly invoice generation failed:', e);
        }
        finally { setLoading(false); }
    };

    return (
        <PrintModalWrapper title="Batch Billing" subtitle="Generate Monthly Statement" onClose={onClose} onPrint={handlePrint} loading={loading}>
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Year</label>
                        <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600/20" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                            <option value="">-- Choose Year --</option>
                            {years.map(y => <option key={y._id} value={y._id}>{y.yearName}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Billing Month</label>
                        <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600/20" value={month} onChange={e => setMonth(e.target.value)}>
                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fee Category / Amount Type</label>
                    <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600/20" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                        <option value="">-- All Fee Types --</option>
                        {amountTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </select>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={12} className="text-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Class Filtering (Optional)</span>
                    </div>
                    <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600/20" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                        <option value="">-- Campus Wide (Default) --</option>
                        {classes.map(c => {
                            const gradeLabel = c.grade?.gradeName || c.grade?.name || c.gradeName || '';
                            const sectionLabel = c.section || c.name || '';
                            const label = `${gradeLabel}${sectionLabel ? ` - ${sectionLabel}` : ''}`.trim();
                            return (
                                <option key={c._id} value={c._id}>{label || '—'}</option>
                            );
                        })}
                    </select>
                </div>
            </div>
        </PrintModalWrapper>
    );
};

// 2. Daily Invoice Modal
export const PrintDailyInvoiceModal = ({ onClose }) => {
    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
    const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

    const handlePrint = async () => {
        setLoading(true);
        try {
            const data = await financeService.printDailyInvoices({ from: fromDate, to: toDate });
            openDailyAuditPreview({
                transactions: data?.transactions || [],
                totals: data?.totals || {},
                title: 'Professional Daily Financial Audit'
            });
            onClose();
        } catch { toast.error("Audit generation failed"); }
        finally { setLoading(false); }
    };

    return (
        <PrintModalWrapper title="Audit Journal" subtitle="Chronological Daily Closeout" onClose={onClose} onPrint={handlePrint} loading={loading}>
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">From Date</label>
                        <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600/20" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">To Date</label>
                        <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600/20" value={toDate} onChange={e => setToDate(e.target.value)} />
                    </div>
                </div>

            </div>
        </PrintModalWrapper>
    );
};

// 3. Pass Card Modal
export const PrintPassCardModal = ({ onClose }) => {
    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState([]);
    const [years, setYears] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [examType, setExamType] = useState('Midterm Examination');
    const [layout, setLayout] = useState('portrait');

    const examTypes = ['Midterm Examination', 'Final Examination'];

    useEffect(() => {
        const load = async () => {
            try {
                const [clsRes, yrRes] = await Promise.all([
                    listGradeSections({ limit: 100 }),
                    financeService.getAcademicYears()
                ]);

                const classesData = Array.isArray(clsRes)
                    ? clsRes
                    : (clsRes?.data?.data || clsRes?.data || []);
                const yearsData = Array.isArray(yrRes) ? yrRes : (yrRes?.data || []);
                let finalClasses = classesData;
                if (finalClasses.length === 0) {
                    try {
                        const fallback = await financeService.getGradeSections({ limit: 100 });
                        finalClasses = Array.isArray(fallback)
                            ? fallback
                            : (fallback?.data || []);
                    } catch {
                        // ignore
                    }
                }

                setClasses(finalClasses);
                setYears(yearsData);
                // Keep empty by default to allow "All Classes" printing.

                if (yearsData.length > 0) {
                    const latestYear = yearsData[0]?._id || '';
                    setSelectedYear(latestYear);
                }
            } catch (err) {
                console.error("Passcard Sync Error:", err);
                toast.error("Passcard sync failed");
            }
        };
        load();
    }, []);

    const handlePrint = async () => {
        const yearName = years.find(y => y._id === selectedYear)?.yearName || '';

        setLoading(true);
        try {
            const data = await financeService.printPasscards({
                classId: selectedClass || undefined,
                academicYearId: selectedClass ? selectedYear : undefined,
                examType
            });

            // Backend returns { cards: [{ student, class, clearanceStatus, totals }, ...] }
            // Preview expects a flattened shape. Normalize here for compatibility.
            const normalizedCards = (data?.cards || []).map((c) => {
                const student = c?.student || {};
                const gradeSection = c?.class || {};
                const gradeName = gradeSection?.grade?.gradeName || gradeSection?.grade?.name || '';
                const section = gradeSection?.section || '';
                const shiftName =
                    (typeof gradeSection?.shift === 'string'
                        ? gradeSection.shift
                        : (gradeSection?.shift?.name || gradeSection?.shift?.shiftName || gradeSection?.shift?.label || gradeSection?.shiftName)) ||
                    '';
                const balance = Number(c?.totals?.balance ?? 0);
                const isCleared = String(c?.clearanceStatus || '').toUpperCase() === 'CLEARED' || balance <= 0;

                const classLabel =
                    (typeof gradeSection?.name === 'string' && gradeSection.name.trim())
                        ? gradeSection.name.trim()
                        : `${gradeName}${section ? ` - ${section}` : ''}`.trim();

                return {
                    isCleared,
                    fullName: student?.fullName || '',
                    studentId: student?.studentId || '',
                    classLabel,
                    shift: shiftName || 'MAIN',
                };
            });

            openPasscardsPreview({ cards: normalizedCards, examType, academicYear: yearName, layout });
            onClose();
        } catch (e) {
            const msg = e?.response?.data?.message || e?.message || "Passcard generation failed";
            toast.error(msg);
            console.error('Passcard generation failed:', e);
        }
        finally { setLoading(false); }
    };

    return (
        <PrintModalWrapper title="Academic Hub" subtitle="Student Clearance Passcards" onClose={onClose} onPrint={handlePrint} loading={loading}>
            <div className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Academic Year</label>
                    <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600/20" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                        <option value="">-- Choose Year --</option>
                        {years.map(y => <option key={y._id} value={y._id}>{y.yearName}</option>)}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Choose Class</label>
                    <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600/20" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                        <option value="">-- All Classes --</option>
                        {classes.map(c => {
                            const gradeLabel = c.grade?.gradeName || c.grade?.name || c.gradeName || '';
                            const sectionLabel = c.section || c.name || '';
                            const label = `${gradeLabel}${sectionLabel ? ` - ${sectionLabel}` : ''}`.trim();
                            return (
                                <option key={c._id} value={c._id}>{label || '—'}</option>
                            );
                        })}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Examination Type</label>
                    <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600/20" value={examType} onChange={e => setExamType(e.target.value)}>
                        {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <button onClick={() => setLayout('portrait')} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${layout === 'portrait' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>
                        Portrait
                    </button>
                    <button onClick={() => setLayout('landscape')} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${layout === 'landscape' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>
                        Landscape
                    </button>
                </div>
            </div>
        </PrintModalWrapper>
    );
};


