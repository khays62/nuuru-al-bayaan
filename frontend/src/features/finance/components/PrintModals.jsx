/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect } from 'react';
import { Printer, X, Download, FileText, CheckCircle, Search, Calendar, ChevronRight, Users, TrendingUp, RotateCcw } from 'lucide-react';
import financeService from '../api/finance';
import toast from 'react-hot-toast';
import headerImg from '../../../assets/nuuruBayaanHeader.png';
import Modal from '../../../shared/components/ui/Modal.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';
import GradeSelect from '../../lookups/components/GradeSelect.jsx';
import ShiftSelect from '../../lookups/components/ShiftSelect.jsx';
import GradeSectionSelect from '../../lookups/components/GradeSectionSelect.jsx';
import { useI18n } from '../../../i18n/useI18n';
import {
    printHtmlDocument,
} from '../../../utils/exportTable';

// Reusable Print Modal Wrapper (DS-aligned)
const PrintModalWrapper = ({
    title,
    subtitle,
    onClose,
    onPrint,
    children,
    loading,
    primaryActionLabel = 'Print',
    primaryActionIcon = <Printer size={16} />,
    closeLabel = 'Close',
    generatingLabel = 'Generatingâ€¦',
}) => (
    <Modal isOpen onClose={onClose} title={title}>
        {subtitle ? (
            <p className="text-sm text-(--nb-color-muted) -mt-1 mb-4">{subtitle}</p>
        ) : null}

        {children}

        <div className="mt-6 pt-4 border-t border-(--nb-color-border) flex items-center justify-end gap-3">
            <Button onClick={onClose} variant="neutral" size="md">
                {closeLabel}
            </Button>
            <Button
                onClick={onPrint}
                disabled={loading}
                variant="primary"
                size="md"
                icon={primaryActionIcon}
            >
                {loading ? generatingLabel : primaryActionLabel}
            </Button>
        </div>
    </Modal>
);

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const parseAcademicYearYears = (yearRange) => {
    const s = String(yearRange || '').trim();
    if (!s) return [new Date().getFullYear().toString()];

    // Common patterns: "2025-2026", "2025/2026", "2025-26"
    const full = s.match(/(\d{4})\s*[-\/]\s*(\d{4})/);
    if (full) return [full[1], full[2]];

    const short = s.match(/(\d{4})\s*[-\/]\s*(\d{2})/);
    if (short) {
        const y1 = Number(short[1]);
        const y2 = Math.floor(y1 / 100) * 100 + Number(short[2]);
        // handle century rollover (rare but safe)
        const y2Fixed = y2 < y1 ? y2 + 100 : y2;
        return [String(y1), String(y2Fixed)];
    }

    const single = s.match(/\d{4}/);
    if (single) return [single[0]];
    return [new Date().getFullYear().toString()];
};

const toYYYYMM = (monthName, yearRange) => {
    const idx = months.indexOf(monthName);
    if (idx === -1) return null;

    const years = parseAcademicYearYears(yearRange);

    let yearToUse = years[0];
    // In a split academic year (e.g. 2025-2026),
    // Jan-Aug (0-7) usually belong to the second year (2026).
    // Sep-Dec (8-11) usually belong to the first year (2025).
    if (years.length > 1 && idx < 8) yearToUse = years[1];

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
        'â€”'
    );
};

const renderViewInfoStyleVoucherCard = ({
    headerSrc,
    labels,
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
    const l = labels || {};
    return `
        <div class="voucher-card">
            <div class="header-main">
                <img src="${headerSrc || ''}" class="header-logo" />
            </div>

            <div class="top-meta">
                <div>${l.date || 'Date'}: ${dateNow}</div>
                <div>${academicYear || ''}</div>
            </div>

            <h2 class="voucher-title">${l.voucherTitle || 'RECEIPT VOUCHER'}</h2>

            <table class="voucher-table">
                <tbody>
                    <tr>
                        <td><span class="cell-muted">${l.rv || 'RV'}:</span> ${recNo}</td>
                        <td><span class="cell-muted">${l.classLabel || 'Class'}:</span> ${classLabel} &nbsp;&nbsp; <span class="cell-muted">${l.id || 'ID'}:</span> ${studentId}</td>
                    </tr>
                    <tr>
                        <td>${l.studentName || 'Student name'}</td>
                        <td>${studentName}</td>
                    </tr>
                    <tr>
                        <td>${l.shift || 'Shift'}</td>
                        <td>${shiftLabel}</td>
                    </tr>
                    <tr>
                        <td>${l.description || 'Description'}</td>
                        <td>
                            <div class="cell-flex">
                                <span>${description}</span>
                                ${paidHtml || ''}
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td><span class="cell-muted">${l.month || 'Month'}:</span> ${billingMonthLabel}</td>
                        <td>
                            <div class="cell-flex">
                                <span><span class="cell-muted">${l.balance || 'Balance'}:</span> $${Number(balance || 0).toFixed(2)}</span>
                                ${feeMetaHtml || ''}
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            ${arrearsHtml || ''}
            <p class="voucher-note">${l.note || '* Note: This receipt represents the level-agreed amount.'}</p>
        </div>
    `;
};

const renderViewInfoStyleMultiVoucher = ({ headerSrc, labels, dateNow, academicYear, recNo, classLabel, studentId, studentName, shiftLabel, monthsCount, rowsHtml, hormarisDescription }) => {
    const l = labels || {};
    return `
        <div class="voucher-card">
            <div class="header-main">
                <img src="${headerSrc || ''}" class="header-logo" />
            </div>

            <div class="top-meta">
                <div>${l.date || 'Date'}: ${dateNow}</div>
                <div>${academicYear || ''}</div>
            </div>
            <h2 class="voucher-title">${l.voucherTitle || 'RECEIPT VOUCHER'}</h2>

            <table class="voucher-table">
                <tbody>
                    <tr>
                        <td><span class="cell-muted">${l.rv || 'RV'}:</span> ${recNo}</td>
                        <td><span class="cell-muted">${l.classLabel || 'Class'}:</span> ${classLabel} &nbsp;&nbsp; <span class="cell-muted">${l.id || 'ID'}:</span> ${studentId}</td>
                    </tr>
                    <tr>
                        <td>${l.studentName || 'Student name'}</td>
                        <td>${studentName}</td>
                    </tr>
                    <tr>
                        <td>${l.shift || 'Shift'}</td>
                        <td>${shiftLabel}</td>
                    </tr>
                    <tr>
                        <td>${l.description || 'Description'}</td>
                        <td>${hormarisDescription || `Advance payment (${monthsCount} month${monthsCount === 1 ? '' : 's'})`}</td>
                    </tr>
                </tbody>
            </table>

            <table class="items">
                <thead>
                    <tr>
                        <th style="text-align:left">${l.description || 'Description'}</th>
                        <th style="text-align:left">${l.month || 'Month'}</th>
                        <th style="text-align:right">${l.paid || 'Paid'}</th>
                        <th style="text-align:right">${l.balance || 'Balance'}</th>
                        <th style="text-align:right">${l.fee || 'Fee'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <p class="voucher-note">${l.note || '* Note: This receipt represents the level-agreed amount.'}</p>
        </div>
    `;
};

export function openMonthlyInvoicesPreview({ month, invoices, students, i18n }) {
    const t = i18n?.t;
    const lang = i18n?.lang;
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const tr = (key, options) => (typeof t === 'function' ? t(key, options) : options?.defaultValue);

    const labels = {
        date: tr('finance.printModals.voucher.labels.date', { defaultValue: 'Date' }),
        voucherTitle: tr('finance.printModals.voucher.title', { defaultValue: 'RECEIPT VOUCHER' }),
        rv: tr('finance.printModals.voucher.labels.rv', { defaultValue: 'RV' }),
        classLabel: tr('finance.printModals.voucher.labels.class', { defaultValue: 'Class' }),
        id: tr('finance.printModals.voucher.labels.id', { defaultValue: 'ID' }),
        studentName: tr('finance.printModals.voucher.labels.studentName', { defaultValue: 'Student name' }),
        shift: tr('finance.printModals.voucher.labels.shift', { defaultValue: 'Shift' }),
        description: tr('finance.printModals.voucher.labels.description', { defaultValue: 'Description' }),
        month: tr('finance.printModals.voucher.labels.month', { defaultValue: 'Month' }),
        balance: tr('finance.printModals.voucher.labels.balance', { defaultValue: 'Balance' }),
        paid: tr('finance.printModals.voucher.labels.paid', { defaultValue: 'Paid' }),
        fee: tr('finance.printModals.voucher.labels.fee', { defaultValue: 'Fee' }),
        discount: tr('finance.printModals.voucher.labels.discount', { defaultValue: 'Discount' }),
        note: tr('finance.printModals.voucher.note', { defaultValue: '* Note: This receipt represents the level-agreed amount.' }),
        hormarisSuffix: tr('finance.printModals.voucher.hormarisSuffix', { defaultValue: ' (Advance)' }),
        monthlyFeeFallback: tr('finance.printModals.voucher.defaults.monthlyFee', { defaultValue: 'Monthly fee' }),
    };

    const derivedInvoices = Array.isArray(invoices)
        ? invoices
        : (students || []).flatMap((s) => s?.invoices || []);

    const eligible = (derivedInvoices || []).filter((inv) => {
        if (!inv || inv.status === 'Cancelled') return false;
        return true;
    });

    if (!eligible || eligible.length === 0) {
        toast.error(tr('finance.printModals.toasts.noInvoices', { defaultValue: 'No invoices found to print' }));
        return;
    }

    const cardsHtml = (eligible || []).map((inv) => {
        const dateNow = new Date().toLocaleString(lang || undefined);
        const recNo = `RV-${String(inv?._id || '').slice(-6).toUpperCase()}`;
        const studentName = inv.student?.fullName || 'â€”';
        const studentId = inv.student?.studentId || 'â€”';
        const gradeName = inv.class?.grade?.gradeName || inv.class?.grade?.name || inv.class?.gradeName || '';
        const section = inv.class?.section || inv.class?.sectionName || '';
        const classLabel = (
            inv.classLabel ||
            inv.class?.name ||
            `${gradeName}${section ? ` - ${section}` : ''}`.trim() ||
            inv.student?.currentClass ||
            inv.student?.classLabel ||
            'â€”'
        );
        const shiftLabel = getShiftLabelForInvoice(inv, inv?.shiftLabel);
        const billingMonth = inv.billingMonth || month || 'â€”';
        const billingMonthLabel = `${billingMonth}${isInvoiceHormaris(inv) ? labels.hormarisSuffix : ''}`;
        const description = inv.title || inv.items?.[0]?.category?.name || labels.monthlyFeeFallback;

        const { totalDiscount, isFree, grossFee, isLevelMode, displayPaid, balance } = calcInvoiceTotalsForPrint(inv, 'level');

        const paidHtml = (!isFree && Number(displayPaid || 0) > 0)
            ? `<span class="money">${labels.paid} $${Number(displayPaid || 0).toFixed(2)}</span>`
            : '';
        const feeMetaHtml = isLevelMode
            ? `<span class="cell-muted">(${labels.fee} $${Number(grossFee || 0).toFixed(2)})</span>`
            : `<span class="cell-muted">(${labels.fee} $${Number(grossFee || 0).toFixed(2)}, ${labels.discount} $${Number(totalDiscount || 0).toFixed(2)})</span>`;

        return renderViewInfoStyleVoucherCard({
            headerSrc: logoUrl,
            labels,
            dateNow,
            academicYear: inv.academicYear?.yearName || 'â€”',
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
    }).join('');

    const html = `
        <html dir="${dir}" lang="${lang || 'en'}">
            <head>
                <title>${tr('finance.printModals.titles.monthlyVouchers', { defaultValue: 'SYD ERP - Monthly Vouchers' })}</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                <style>
                    @page { size: A4 portrait; margin: 10mm; }
                    body { font-family: 'Inter', sans-serif; background: #fff; margin: 0; padding: 0; }

                    /* RTL support */
                    html[dir="rtl"] body { direction: rtl; }
                    html[dir="rtl"] .top-meta { flex-direction: row-reverse; }
                    html[dir="rtl"] .cell-flex { flex-direction: row-reverse; }
                    html[dir="rtl"] .voucher-table td { text-align: right; }
                    .voucher-card {
                        padding: 22px;
                        display: flex;
                        flex-direction: column;
                        position: relative;
                        break-inside: avoid;
                        page-break-inside: avoid;
                        margin: 0 0 10mm 0;
                    }

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
            <body>${cardsHtml}</body>
        </html>
    `;

    printHtmlDocument(html, { title: tr('finance.printModals.titles.monthlyVouchers', { defaultValue: 'SYD ERP - Monthly Vouchers' }) });
}

export function openDailyAuditPreview({ transactions, i18n }) {
    const t = i18n?.t;
    const lang = i18n?.lang;
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const tr = (key, options) => (typeof t === 'function' ? t(key, options) : options?.defaultValue);

    const labels = {
        date: tr('finance.printModals.voucher.labels.date', { defaultValue: 'Date' }),
        voucherTitle: tr('finance.printModals.voucher.title', { defaultValue: 'RECEIPT VOUCHER' }),
        rv: tr('finance.printModals.voucher.labels.rv', { defaultValue: 'RV' }),
        classLabel: tr('finance.printModals.voucher.labels.class', { defaultValue: 'Class' }),
        id: tr('finance.printModals.voucher.labels.id', { defaultValue: 'ID' }),
        studentName: tr('finance.printModals.voucher.labels.studentName', { defaultValue: 'Student name' }),
        shift: tr('finance.printModals.voucher.labels.shift', { defaultValue: 'Shift' }),
        description: tr('finance.printModals.voucher.labels.description', { defaultValue: 'Description' }),
        month: tr('finance.printModals.voucher.labels.month', { defaultValue: 'Month' }),
        balance: tr('finance.printModals.voucher.labels.balance', { defaultValue: 'Balance' }),
        paid: tr('finance.printModals.voucher.labels.paid', { defaultValue: 'Paid' }),
        fee: tr('finance.printModals.voucher.labels.fee', { defaultValue: 'Fee' }),
        discount: tr('finance.printModals.voucher.labels.discount', { defaultValue: 'Discount' }),
        note: tr('finance.printModals.voucher.note', { defaultValue: '* Note: This receipt represents the level-agreed amount.' }),
        hormarisSuffix: tr('finance.printModals.voucher.hormarisSuffix', { defaultValue: ' (Advance)' }),
        monthlyFeeFallback: tr('finance.printModals.voucher.defaults.monthlyFee', { defaultValue: 'Monthly fee' }),
    };

    if (!transactions || transactions.length === 0) {
        toast.error(tr('finance.printModals.toasts.noTransactions', { defaultValue: 'No transactions found to print' }));
        return;
    }

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
        const dateNow = new Date(first?.createdAt || Date.now()).toLocaleString(lang || undefined);
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
            const monthLabel = `${inv?.billingMonth || '—'}${isHormaris ? labels.hormarisSuffix : ''}`;
            const desc = inv?.title || inv?.items?.[0]?.category?.name || labels.monthlyFeeFallback;

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
            const billingMonthLabel = `${billingMonth}${isInvoiceHormaris(inv) ? labels.hormarisSuffix : ''}`;
            const description = inv?.title || inv?.items?.[0]?.category?.name || labels.monthlyFeeFallback;
            const paidHtml = `<span class="money">${labels.paid} $${Number(paidInGroup || 0).toFixed(2)}</span>`;

            const { totalDiscount, grossFee, isLevelMode, balance } = calcInvoiceTotalsForPrint(inv, 'level');
            const feeMetaHtml = isLevelMode
                ? `<span class="cell-muted">(${labels.fee} $${Number(grossFee || 0).toFixed(2)})</span>`
                : `<span class="cell-muted">(${labels.fee} $${Number(grossFee || 0).toFixed(2)}, ${labels.discount} $${Number(totalDiscount || 0).toFixed(2)})</span>`;

            return [renderViewInfoStyleVoucherCard({
                headerSrc: logoUrl,
                labels,
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

        const hormarisDescription = tr('finance.printModals.voucher.hormarisPayment', {
            defaultValue: `Advance payment (${invoices.length} month${invoices.length === 1 ? '' : 's'})`,
            count: invoices.length,
        });

        return [renderViewInfoStyleMultiVoucher({
            headerSrc: logoUrl,
            labels,
            dateNow,
            academicYear: firstInv?.academicYear?.yearName || '—',
            recNo,
            classLabel,
            studentId,
            studentName,
            shiftLabel,
            monthsCount: invoices.length,
            rowsHtml,
            hormarisDescription,
        })];
    });

    const singleCards = (singles || []).map((t) => {
        const dateNow = new Date(t?.createdAt || Date.now()).toLocaleString(lang || undefined);
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
        const monthLabel = `${t.invoice?.billingMonth || '—'}${isHormaris ? labels.hormarisSuffix : ''}`;
        const desc = t.invoice?.title || t.invoice?.items?.[0]?.category?.name || labels.monthlyFeeFallback;

        if (!isHormaris) {
            const paidHtml = `<span class="money">${labels.paid} $${Number(t.amount || 0).toFixed(2)}</span>`;
            const { totalDiscount, isLevelMode } = calcInvoiceTotalsForPrint(t?.invoice, 'level');
            const feeMetaHtml = isLevelMode
                ? `<span class="cell-muted">(${labels.fee} $${Number(grossFee || 0).toFixed(2)})</span>`
                : `<span class="cell-muted">(${labels.fee} $${Number(grossFee || 0).toFixed(2)}, ${labels.discount} $${Number(totalDiscount || 0).toFixed(2)})</span>`;

            return renderViewInfoStyleVoucherCard({
                headerSrc: logoUrl,
                labels,
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

        const hormarisDescription = tr('finance.printModals.voucher.hormarisPayment', {
            defaultValue: `Advance payment (${1} month)`,
            count: 1,
        });

        return renderViewInfoStyleMultiVoucher({
            headerSrc: logoUrl,
            labels,
            dateNow,
            academicYear: t.invoice?.academicYear?.yearName || 'â€”',
            recNo,
            classLabel,
            studentId,
            studentName,
            shiftLabel,
            monthsCount: 1,
            rowsHtml,
            hormarisDescription,
        });
    });

    const cardsHtml = [...groupCards, ...singleCards].join('');

    const html = `
        <html dir="${dir}" lang="${lang || 'en'}">
            <head>
                <title>${tr('finance.printModals.titles.dailyAudit', { defaultValue: 'SYD ERP - Daily Audit' })}</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                <style>
                    @page { size: A4 portrait; margin: 10mm; }
                    body { font-family: 'Inter', sans-serif; background: #fff; margin: 0; padding: 0; }

                    /* RTL support */
                    html[dir="rtl"] body { direction: rtl; }
                    html[dir="rtl"] .top-meta { flex-direction: row-reverse; }
                    html[dir="rtl"] .cell-flex { flex-direction: row-reverse; }
                    html[dir="rtl"] .voucher-table td { text-align: right; }
                    html[dir="rtl"] .items th,
                    html[dir="rtl"] .items td { text-align: right !important; }
                    .voucher-card {
                        padding: 22px;
                        display: flex;
                        flex-direction: column;
                        position: relative;
                        break-inside: avoid;
                        page-break-inside: avoid;
                        margin: 0 0 10mm 0;
                    }

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
            <body>
                ${cardsHtml}
            </body>
        </html>
    `;

    printHtmlDocument(html, { title: tr('finance.printModals.titles.dailyAudit', { defaultValue: 'SYD ERP - Daily Audit' }) });
}

export function openPasscardsPreview({ cards, examType, academicYear, validFrom, layout = 'portrait', i18n }) {
    const t = i18n?.t;
    const lang = i18n?.lang;
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const tr = (key, options) => (typeof t === 'function' ? t(key, options) : options?.defaultValue);

    const labels = {
        academicYear: tr('finance.printModals.passcards.labels.academicYear', { defaultValue: 'ACADEMIC YEAR' }),
        date: tr('finance.printModals.passcards.labels.date', { defaultValue: 'DATE' }),
        clearanceCard: tr('finance.printModals.passcards.labels.clearanceCard', { defaultValue: 'CLEARANCE CARD' }),
        studentName: tr('finance.printModals.passcards.labels.studentName', { defaultValue: 'Student Name' }),
        classLabel: tr('finance.printModals.passcards.labels.class', { defaultValue: 'Class' }),
        shift: tr('finance.printModals.passcards.labels.shift', { defaultValue: 'Shift' }),
        id: tr('finance.printModals.passcards.labels.id', { defaultValue: 'ID' }),
        room: tr('finance.printModals.passcards.labels.room', { defaultValue: 'Room' }),
        hall: tr('finance.printModals.passcards.labels.hall', { defaultValue: 'Hall' }),
        photo: tr('finance.printModals.passcards.labels.photo', { defaultValue: 'PHOTO' }),
        notice: tr('finance.printModals.passcards.notice', { defaultValue: 'Any student who attempts fabrication has no right to continue his / her education at School' }),
        stamp: tr('finance.printModals.passcards.stamp', { defaultValue: 'REGISTRAR OFFICIAL STAMP' }),
    };

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
        toast.error(tr('finance.printModals.toasts.noPasscards', { defaultValue: 'No cards found to print' }));
        return;
    }

    const isPortrait = layout === 'portrait';
    const cardsPerPage = isPortrait ? 4 : 2;
    const pageSizeCss = isPortrait ? 'A4 portrait' : 'A4 landscape';
    const sheetColumnsCss = isPortrait ? 'repeat(2, minmax(0, 1fr))' : 'repeat(1, minmax(0, 1fr))';
    const sheetGapPx = isPortrait ? 12 : 14;
    const cardHeightCss = isPortrait ? '132mm' : '92mm';
    const cardPaddingPx = isPortrait ? 10 : 10;

    const formatDate = (d) => {
        try {
            return new Date(d).toLocaleDateString(lang || undefined, {
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

    const nowLabel = new Date().toLocaleString(lang || undefined);
    const yearLabel = academicYear || '';
    const validityLabel = tr('finance.printModals.passcards.validity', {
        defaultValue: `Valid from ${formatDate(fromDate)} to ${formatDate(toDate)}`,
        from: formatDate(fromDate),
        to: formatDate(toDate),
    });

    const chunk = (arr, size) => {
        const out = [];
        for (let i = 0; i < (arr || []).length; i += size) out.push(arr.slice(i, i + size));
        return out;
    };

    const renderCard = (c) => `
        <div class="card ${isPortrait ? 'portrait' : 'landscape'}">
            <div class="card-inner">
                <div class="header-main">
                    ${logoUrl ? `<img src="${logoUrl}" class="card-logo" />` : ''}
                </div>

                <div class="meta-bar">
                    <div><span class="meta-lbl">${labels.academicYear}:</span> ${yearLabel || 'â€”'}</div>
                    <div><span class="meta-lbl">${labels.date}:</span> ${nowLabel}</div>
                </div>

                <div class="blue-line"></div>

                <div class="title-row">
                    <div class="title">${labels.clearanceCard}</div>
                    <div class="exam">${String(examType || '').toUpperCase()}</div>
                </div>

                <div class="main-grid">
                    <div class="info-box">
                        <div class="row"><div class="lbl">${labels.studentName}</div><div class="val">${c.fullName || 'â€”'}</div></div>
                        <div class="row"><div class="lbl">${labels.classLabel}</div><div class="val">${c.classLabel || 'â€”'}</div></div>
                        <div class="row"><div class="lbl">${labels.shift}</div><div class="val">${(typeof c.shift === 'string' ? c.shift : shiftToLabel(c.shift)) || 'MAIN'}</div></div>
                        <div class="row"><div class="lbl">${labels.id}</div><div class="val" style="font-family:monospace">${c.studentId || 'â€”'}</div></div>
                        <div class="row"><div class="lbl">${labels.room}</div><div class="val">${c.room || 'â€”'}</div></div>
                        <div class="row"><div class="lbl">${labels.hall}</div><div class="val">${c.hall || 'â€”'}</div></div>
                    </div>

                    <div class="photo-box">
                        <div class="photo-frame">
                            <div class="photo-placeholder">${labels.photo}</div>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    <div class="validity">${validityLabel}</div>
                    <div class="notice">${labels.notice}</div>
                    <div class="stamp">${labels.stamp}</div>
                </div>
            </div>
        </div>
    `;

    // Portrait: 4 cards per page (2x2)
    // Landscape: 2 cards per page (stacked)
    const pagesHtml = chunk(normalized || [], cardsPerPage).map((pageCards) => {
        const inner = (pageCards || []).map(renderCard).join('');
        return `
            <div class="page">
                <div class="sheet">
                    ${inner}
                </div>
            </div>
        `;
    }).join('');

    const html = `
        <html dir="${dir}" lang="${lang || 'en'}">
            <head>
                <title>${tr('finance.printModals.titles.passcards', { defaultValue: `Academic Passcards - ${examType}`, examType })}</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                <style>
                    @page { size: ${pageSizeCss}; margin: 10mm; }
                    body { font-family: 'Inter', sans-serif; background: #f8fafc; padding: 12px; margin: 0; }

                    /* RTL support */
                    html[dir="rtl"] body { direction: rtl; }
                    html[dir="rtl"] .meta-bar { flex-direction: row-reverse; }
                    html[dir="rtl"] .title-row { flex-direction: row-reverse; }
                    html[dir="rtl"] .lbl,
                    html[dir="rtl"] .val { text-align: right; }

                    .page { margin-bottom: 14px; }
                    .page:last-child { margin-bottom: 0; }
                    .sheet {
                        display: grid;
                        grid-template-columns: ${sheetColumnsCss};
                        gap: ${sheetGapPx}px;
                        align-items: stretch;
                    }

                    .card { 
                        background: white; 
                        border: 1px solid #000; 
                        box-sizing: border-box;
                        border-radius: 10px;
                        overflow: hidden;
                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.08);
                        width: 100%;
                        height: ${cardHeightCss};
                    }
                    .portrait, .landscape { aspect-ratio: auto; }
                    
                    .card-inner { padding: ${cardPaddingPx}px; height: 100%; display: flex; flex-direction: column; }
                    
                    .header-main { width: 100%; margin-bottom: 6px; }
                    .card-logo { display: block; width: 100%; height: auto; max-height: 22mm; object-fit: contain; }

                    .meta-bar { display: flex; justify-content: space-between; font-size: 8px; font-weight: 800; color: #111; }
                    .meta-lbl { color: #475569; font-weight: 900; }
                    
                    .blue-line { background: #000; height: 2px; margin: 8px -${cardPaddingPx}px 10px; }
                    
                    .title-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
                    .title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
                    .exam { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px; color: #111; }

                    .main-grid { flex: 1; display: flex; gap: 12px; }
                    .portrait .main-grid { flex-direction: column; }
                    .landscape .main-grid { flex-direction: row; }

                    .info-box { flex: 1; border: 1px solid #000; border-radius: 6px; overflow: hidden; }
                    .row { display: grid; grid-template-columns: ${isPortrait ? '96px' : '110px'} 1fr; border-bottom: 1px solid #000; }
                    .row:last-child { border-bottom: none; }
                    .lbl { padding: ${isPortrait ? '6px 8px' : '6px 8px'}; font-size: ${isPortrait ? '9px' : '9px'}; font-weight: 900; color: #111; background: #fff; }
                    .val { padding: ${isPortrait ? '6px 8px' : '6px 8px'}; font-size: ${isPortrait ? '9px' : '9px'}; font-weight: 900; text-transform: uppercase; }

                    .landscape .lbl { padding: 6px 8px; font-size: 9px; }
                    .landscape .val { padding: 6px 8px; font-size: 9px; }

                    .photo-box { width: 140px; display: flex; justify-content: center; }
                    .portrait .photo-box { width: 100%; justify-content: flex-end; }
                    .photo-frame { width: ${isPortrait ? '104px' : '116px'}; height: ${isPortrait ? '110px' : '100px'}; border: 1px solid #000; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
                    .photo-placeholder { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }

                    .footer { margin-top: ${isPortrait ? '8px' : '6px'}; }
                    .validity { font-size: ${isPortrait ? '8px' : '7px'}; font-weight: 900; color: #111; text-align: center; margin-bottom: ${isPortrait ? '4px' : '3px'}; }
                    .notice { font-size: ${isPortrait ? '6px' : '6px'}; font-weight: 800; color: #475569; text-align: center; margin-bottom: ${isPortrait ? '6px' : '5px'}; font-style: italic; }
                    .stamp { border: 1px dashed #cbd5e1; height: ${isPortrait ? '36px' : '30px'}; display: flex; align-items: center; justify-content: center; font-size: ${isPortrait ? '7px' : '6px'}; font-weight: 900; color: #94a3b8; text-transform: uppercase; }
                    
                    @media print { 
                        body { background: white; padding: 0; } 
                        .page { break-after: page; }
                        .sheet { gap: ${isPortrait ? '10px' : '12px'}; }
                        .card { page-break-inside: avoid; box-shadow: none; border-width: 1px; }
                    }
                </style>
            </head>
            <body>${pagesHtml}</body>
        </html>
    `;

    printHtmlDocument(html, { title: tr('finance.printModals.titles.passcards', { defaultValue: `Academic Passcards - ${examType}`, examType }) });
}

// 1. Monthly Invoice Modal
export const PrintMonthlyInvoiceModal = ({ onClose }) => {
    const { t, lang } = useI18n();
    const tr = (key, options) => (typeof t === 'function' ? t(key, options) : options?.defaultValue);

    const getApiErrorToast = (err) => {
        const code = err?.response?.data?.code;
        const rawMsg = err?.response?.data?.message || err?.message;
        if (code) {
            const translated = tr(`finance.apiErrors.${code}`, { defaultValue: '' });
            if (translated) return translated;
        }
        return rawMsg;
    };

    const [month, setMonth] = useState(months[new Date().getMonth()]);
    const [years, setYears] = useState([]);
    const [amountTypes, setAmountTypes] = useState([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [gradeId, setGradeId] = useState('');
    const [shiftId, setShiftId] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [yrRes, catRes] = await Promise.all([
                    financeService.getAcademicYears(),
                    financeService.getFinanceCategories('fee')
                ]);
                const yearsData = Array.isArray(yrRes) ? yrRes : (yrRes?.data || []);
                const categoriesData = Array.isArray(catRes) ? catRes : (catRes?.data || []);
                setYears(yearsData);
                const filteredCategories = (categoriesData || []).filter(c => {
                    const name = String(c?.name || '').trim().toLowerCase();
                    return name !== 'previous balance';
                });
                setAmountTypes(filteredCategories);

                // Prefer an academic year that contains the current calendar year (reduces month/year mismatch).
                if (yearsData.length > 0) {
                    const nowYear = new Date().getFullYear();
                    const preferred = yearsData.find((y) => {
                        const yn = String(y?.yearName || '');
                        return yn.includes(String(nowYear));
                    });
                    const fallback = yearsData[0];
                    setSelectedYear((preferred || fallback)?._id || '');
                }
            } catch (e) {
                console.error("Monthly Invoice Sync Error:", e);
                toast.error(tr('finance.printModals.monthly.toasts.syncFailed', { defaultValue: 'Report sync failed' }));
            }
        };
        load();
    }, []);

    const selectedYearObj = years.find(y => y._id === selectedYear);
    const yearName = selectedYearObj?.yearName || '';

    const getMonthLabelWithYear = (monthName) => {
        const idx = months.indexOf(monthName);
        const localizedMonth = idx >= 0
            ? new Date(2000, idx, 1).toLocaleString(lang || undefined, { month: 'long' })
            : monthName;
        const ym = toYYYYMM(monthName, yearName);
        if (!ym) return monthName;
        const y = ym.slice(0, 4);
        return `${localizedMonth} ${y}`;
    };

    const handlePrint = async () => {
        const ym = toYYYYMM(month, yearName);
        if (!ym) return toast.error(tr('finance.printModals.monthly.toasts.checkMonth', { defaultValue: 'Check month field' }));
        if (!selectedYear) return toast.error(tr('finance.printModals.monthly.toasts.selectAcademicYear', { defaultValue: 'Select Academic Year' }));

        setLoading(true);
        try {
            const data = await financeService.printMonthlyInvoices({
                month: ym,
                academicYearId: selectedYear,
                classId: selectedClass || undefined,
                categoryId: selectedCategory || undefined
            });

            const shouldClientFilterByGradeShift = !selectedClass && (!!gradeId || !!shiftId);
            const matchesGradeShift = (invLike) => {
                if (!shouldClientFilterByGradeShift) return true;
                const inv = invLike?.invoice || invLike;
                const rawGrade = inv?.class?.grade?._id || inv?.class?.gradeId || inv?.grade?._id || inv?.gradeId || '';
                const rawShift = inv?.class?.shift?._id || inv?.class?.shiftId || inv?.shift?._id || inv?.shiftId || '';

                const wantGrade = String(gradeId || '');
                const wantShift = String(shiftId || '');
                const wantGradeIsId = isMongoObjectIdString(wantGrade);
                const wantShiftIsId = isMongoObjectIdString(wantShift);

                const haveGrade = typeof rawGrade === 'string' ? rawGrade : '';
                const haveShift = typeof rawShift === 'string' ? rawShift : '';

                // Only enforce match when both sides are comparable IDs.
                if (wantGrade && wantGradeIsId && isMongoObjectIdString(haveGrade) && haveGrade !== wantGrade) return false;
                if (wantShift && wantShiftIsId && isMongoObjectIdString(haveShift) && haveShift !== wantShift) return false;

                return true;
            };

            const txsRaw = Array.isArray(data?.transactions) ? data.transactions : [];
            const invRaw = Array.isArray(data?.invoices) ? data.invoices : [];

            const txs = shouldClientFilterByGradeShift ? txsRaw.filter(matchesGradeShift) : txsRaw;
            const invoices = shouldClientFilterByGradeShift ? invRaw.filter(matchesGradeShift) : invRaw;

            if (txs.length > 0) {
                openDailyAuditPreview({ transactions: txs, i18n: { t, lang } });
            } else {
                openMonthlyInvoicesPreview({
                    month: `${month} ${yearName}`,
                    invoices,
                    i18n: { t, lang },
                });
            }

            onClose();
        } catch (e) {
            const msg = getApiErrorToast(e);
            toast.error(msg || tr('finance.printModals.monthly.toasts.generationFailed', { defaultValue: 'Report generation failed' }));
            console.error('Monthly invoice generation failed:', e);
        }
        finally { setLoading(false); }
    };

    return (
        <PrintModalWrapper
            title={tr('finance.printModals.monthly.title', { defaultValue: 'Batch Billing' })}
            subtitle={tr('finance.printModals.monthly.subtitle', { defaultValue: 'Generate Monthly Statement' })}
            onClose={onClose}
            onPrint={handlePrint}
            loading={loading}
            primaryActionLabel={tr('finance.printModals.actions.print', { defaultValue: 'Print' })}
            closeLabel={tr('finance.printModals.actions.close', { defaultValue: 'Close' })}
            generatingLabel={tr('finance.printModals.actions.generating', { defaultValue: 'Generatingâ€¦' })}
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">{tr('finance.printModals.monthly.fields.academicYear', { defaultValue: 'Academic Year' })}</label>
                        <DropdownSelect
                            value={selectedYear}
                            onChange={setSelectedYear}
                            options={(years || []).map((y) => ({ value: y?._id, label: y?.yearName }))}
                            placeholder={tr('finance.printModals.common.placeholders.chooseYear', { defaultValue: 'Choose Year' })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">{tr('finance.printModals.monthly.fields.billingMonth', { defaultValue: 'Billing Month' })}</label>
                        <DropdownSelect
                            value={month}
                            onChange={setMonth}
                                options={months.map((m) => ({ value: m, label: getMonthLabelWithYear(m) }))}
                            placeholder={tr('finance.printModals.common.placeholders.chooseMonth', { defaultValue: 'Choose Month' })}
                            clearable={false}
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">{tr('finance.printModals.monthly.fields.feeCategory', { defaultValue: 'Fee Category / Amount Type' })}</label>
                    <SearchableSelect
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        options={(amountTypes || []).map((t) => ({ value: t?._id, label: t?.name }))}
                        placeholder={tr('finance.printModals.common.placeholders.allFeeTypes', { defaultValue: 'All Fee Types' })}
                        searchPlaceholder={tr('finance.printModals.common.placeholders.search', { defaultValue: 'Searchâ€¦' })}
                        maxVisible={7}
                    />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-(--nb-color-border)">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={12} className="text-(--nb-color-muted)" />
                        <span className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest">{tr('finance.printModals.monthly.fields.classFiltering', { defaultValue: 'Class Filtering (Optional)' })}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <GradeSelect
                            value={gradeId}
                            onChange={(v) => {
                                setGradeId(v || '');
                                setSelectedClass('');
                            }}
                            placeholder={tr('finance.printModals.common.placeholders.grade', { defaultValue: 'Grade' })}
                            className="h-11 font-bold"
                        />
                        <ShiftSelect
                            value={shiftId}
                            onChange={(v) => {
                                setShiftId(v || '');
                                setSelectedClass('');
                            }}
                            placeholder={tr('finance.printModals.common.placeholders.shift', { defaultValue: 'Shift' })}
                            className="h-11 font-bold"
                        />
                        <GradeSectionSelect
                            gradeId={gradeId}
                            shiftId={shiftId}
                            value={selectedClass}
                            onChange={(v) => setSelectedClass(v || '')}
                            searchable
                            maxVisible={7}
                            placeholder={tr('finance.printModals.common.placeholders.campusWide', { defaultValue: 'Campus Wide (Default)' })}
                            searchPlaceholder={tr('finance.printModals.common.placeholders.search', { defaultValue: 'Searchâ€¦' })}
                            className="h-11 font-bold"
                        />
                    </div>
                    <div className="mt-2 flex justify-end">
                        <Button
                            type="button"
                            onClick={() => {
                                setGradeId('');
                                setShiftId('');
                                setSelectedClass('');
                            }}
                            variant="neutral"
                            size="sm"
                            icon={<RotateCcw size={16} />}
                        >
                            {tr('finance.printModals.actions.reset', { defaultValue: 'Reset' })}
                        </Button>
                    </div>
                </div>
            </div>
        </PrintModalWrapper>
    );
};

// 2. Daily Invoice Modal
export const PrintDailyInvoiceModal = ({ onClose }) => {
    const { t, lang } = useI18n();
    const tr = (key, options) => (typeof t === 'function' ? t(key, options) : options?.defaultValue);

    const getApiErrorToast = (err) => {
        const code = err?.response?.data?.code;
        const rawMsg = err?.response?.data?.message || err?.message;
        if (code) {
            const translated = tr(`finance.apiErrors.${code}`, { defaultValue: '' });
            if (translated) return translated;
        }
        return rawMsg;
    };

    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
    const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

    const handlePrint = async () => {
        setLoading(true);
        try {
            const data = await financeService.printDailyInvoices({ from: fromDate, to: toDate });
            const txs = Array.isArray(data?.transactions) ? data.transactions : [];

            openDailyAuditPreview({
                transactions: txs,
                totals: data?.totals || {},
                title: tr('finance.printModals.dailyAudit.auditTitle', { defaultValue: 'Professional Daily Financial Audit' }),
                i18n: { t, lang },
            });
            onClose();
        } catch (e) {
            const msg = getApiErrorToast(e);
            toast.error(msg || tr('finance.printModals.dailyAudit.toasts.generationFailed', { defaultValue: 'Audit generation failed' }));
        }
        finally { setLoading(false); }
    };

    return (
        <PrintModalWrapper
            title={tr('finance.printModals.dailyAudit.title', { defaultValue: 'Audit Journal' })}
            subtitle={tr('finance.printModals.dailyAudit.subtitle', { defaultValue: 'Chronological Daily Closeout' })}
            onClose={onClose}
            onPrint={handlePrint}
            loading={loading}
            primaryActionLabel={tr('finance.printModals.actions.print', { defaultValue: 'Print' })}
            closeLabel={tr('finance.printModals.actions.close', { defaultValue: 'Close' })}
            generatingLabel={tr('finance.printModals.actions.generating', { defaultValue: 'Generatingâ€¦' })}
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">{tr('finance.printModals.dailyAudit.fields.fromDate', { defaultValue: 'From Date' })}</label>
                        <Input type="date" className="h-11 font-bold" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">{tr('finance.printModals.dailyAudit.fields.toDate', { defaultValue: 'To Date' })}</label>
                        <Input type="date" className="h-11 font-bold" value={toDate} onChange={e => setToDate(e.target.value)} />
                    </div>
                </div>

            </div>
        </PrintModalWrapper>
    );
};

// 3. Pass Card Modal
export const PrintPassCardModal = ({ onClose }) => {
    const { t, lang } = useI18n();
    const tr = (key, options) => (typeof t === 'function' ? t(key, options) : options?.defaultValue);

    const getApiErrorToast = (err) => {
        const code = err?.response?.data?.code;
        const rawMsg = err?.response?.data?.message || err?.message;
        if (code) {
            const translated = tr(`finance.apiErrors.${code}`, { defaultValue: '' });
            if (translated) return translated;
        }
        return rawMsg;
    };

    const [loading, setLoading] = useState(false);
    const [years, setYears] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [gradeId, setGradeId] = useState('');
    const [shiftId, setShiftId] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [examType, setExamType] = useState('Midterm Examination');
    const [layout, setLayout] = useState('portrait');

    const examTypeOptions = [
        {
            value: 'Midterm Examination',
            label: tr('finance.printModals.passcards.examTypes.midterm', { defaultValue: 'Midterm Examination' }),
        },
        {
            value: 'Final Examination',
            label: tr('finance.printModals.passcards.examTypes.final', { defaultValue: 'Final Examination' }),
        },
    ];

    useEffect(() => {
        const load = async () => {
            try {
                const [yrRes] = await Promise.all([
                    financeService.getAcademicYears()
                ]);
                const yearsData = Array.isArray(yrRes) ? yrRes : (yrRes?.data || []);
                setYears(yearsData);
                // Keep empty by default to allow "All Classes" printing.

                if (yearsData.length > 0) {
                    const latestYear = yearsData[0]?._id || '';
                    setSelectedYear(latestYear);
                }
            } catch (err) {
                console.error("Passcard Sync Error:", err);
                toast.error(tr('finance.printModals.passcards.toasts.syncFailed', { defaultValue: 'Passcard sync failed' }));
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


            openPasscardsPreview({ cards: normalizedCards, examType, academicYear: yearName, layout, i18n: { t, lang } });
            onClose();
        } catch (e) {
            const msg = getApiErrorToast(e);
            toast.error(msg || tr('finance.printModals.passcards.toasts.generationFailed', { defaultValue: 'Passcard generation failed' }));
            console.error('Passcard generation failed:', e);
        }
        finally { setLoading(false); }
    };

    return (
        <PrintModalWrapper
            title={tr('finance.printModals.passcards.title', { defaultValue: 'Academic Hub' })}
            subtitle={tr('finance.printModals.passcards.subtitle', { defaultValue: 'Student Clearance Passcards' })}
            onClose={onClose}
            onPrint={handlePrint}
            loading={loading}
            primaryActionLabel={tr('finance.printModals.actions.print', { defaultValue: 'Print' })}
            closeLabel={tr('finance.printModals.actions.close', { defaultValue: 'Close' })}
            generatingLabel={tr('finance.printModals.actions.generating', { defaultValue: 'Generatingâ€¦' })}
        >
            <div className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">{tr('finance.printModals.passcards.fields.academicYear', { defaultValue: 'Target Academic Year' })}</label>
                    <DropdownSelect
                        value={selectedYear}
                        onChange={setSelectedYear}
                        options={(years || []).map((y) => ({ value: y?._id, label: y?.yearName }))}
                        placeholder={tr('finance.printModals.common.placeholders.chooseYear', { defaultValue: 'Choose Year' })}
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">{tr('finance.printModals.passcards.fields.chooseClass', { defaultValue: 'Choose Class' })}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <GradeSelect
                            value={gradeId}
                            onChange={(v) => {
                                setGradeId(v || '');
                                setSelectedClass('');
                            }}
                            placeholder={tr('finance.printModals.common.placeholders.grade', { defaultValue: 'Grade' })}
                            className="h-11 font-bold"
                        />
                        <ShiftSelect
                            value={shiftId}
                            onChange={(v) => {
                                setShiftId(v || '');
                                setSelectedClass('');
                            }}
                            placeholder={tr('finance.printModals.common.placeholders.shift', { defaultValue: 'Shift' })}
                            className="h-11 font-bold"
                        />
                        <GradeSectionSelect
                            gradeId={gradeId}
                            shiftId={shiftId}
                            value={selectedClass}
                            onChange={(v) => setSelectedClass(v || '')}
                            searchable
                            maxVisible={7}
                            placeholder={tr('finance.printModals.common.placeholders.allClasses', { defaultValue: 'All Classes' })}
                            searchPlaceholder={tr('finance.printModals.common.placeholders.search', { defaultValue: 'Searchâ€¦' })}
                            className="h-11 font-bold"
                        />
                    </div>
                    <div className="mt-2 flex justify-end">
                        <Button
                            type="button"
                            onClick={() => {
                                setGradeId('');
                                setShiftId('');
                                setSelectedClass('');
                            }}
                            variant="neutral"
                            size="sm"
                            icon={<RotateCcw size={16} />}
                        >
                            {tr('finance.printModals.actions.reset', { defaultValue: 'Reset' })}
                        </Button>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">{tr('finance.printModals.passcards.fields.examType', { defaultValue: 'Examination Type' })}</label>
                    <DropdownSelect
                        value={examType}
                        onChange={setExamType}
                        options={examTypeOptions}
                        placeholder={tr('finance.printModals.passcards.placeholders.chooseExam', { defaultValue: 'Choose Exam' })}
                        clearable={false}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-(--nb-color-border)">
                    <Button
                        onClick={() => setLayout('portrait')}
                        variant="neutral"
                        size="md"
                        className={`w-full justify-center gap-2 p-3! rounded-xl border-2 shadow-none font-black text-[10px] uppercase tracking-widest transition-all ${layout === 'portrait' ? 'border-blue-600! bg-blue-50! text-blue-600!' : 'border-(--nb-color-border)! text-(--nb-color-muted)! bg-(--nb-color-bg-card)!'}`}
                    >
                        {tr('finance.printModals.passcards.layout.portrait', { defaultValue: 'Portrait' })}
                    </Button>
                    <Button
                        onClick={() => setLayout('landscape')}
                        variant="neutral"
                        size="md"
                        className={`w-full justify-center gap-2 p-3! rounded-xl border-2 shadow-none font-black text-[10px] uppercase tracking-widest transition-all ${layout === 'landscape' ? 'border-blue-600! bg-blue-50! text-blue-600!' : 'border-(--nb-color-border)! text-(--nb-color-muted)! bg-(--nb-color-bg-card)!'}`}
                    >
                        {tr('finance.printModals.passcards.layout.landscape', { defaultValue: 'Landscape' })}
                    </Button>
                </div>
            </div>
        </PrintModalWrapper>
    );
};


