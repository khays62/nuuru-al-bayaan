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

// Reusable Print Modal Wrapper (DS-aligned)
const PrintModalWrapper = ({ title, subtitle, onClose, onPrint, children, loading }) => (
    <Modal isOpen onClose={onClose} title={title}>
        {subtitle ? (
            <p className="text-sm text-(--nb-color-muted) -mt-1 mb-4">{subtitle}</p>
        ) : null}

        {children}

        <div className="mt-6 pt-4 border-t border-(--nb-color-border) flex items-center justify-end gap-3">
            <Button onClick={onClose} variant="neutral" size="md">
                Close
            </Button>
            <Button
                onClick={onPrint}
                disabled={loading}
                variant="primary"
                size="md"
                icon={<Printer size={16} />}
            >
                {loading ? 'Generating…' : 'Print'}
            </Button>
        </div>
    </Modal>
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
                        <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Academic Year</label>
                        <DropdownSelect
                            value={selectedYear}
                            onChange={setSelectedYear}
                            options={(years || []).map((y) => ({ value: y?._id, label: y?.yearName }))}
                            placeholder="Choose Year"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Billing Month</label>
                        <DropdownSelect
                            value={month}
                            onChange={setMonth}
                            options={months.map((m) => ({ value: m, label: m }))}
                            placeholder="Choose Month"
                            clearable={false}
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Fee Category / Amount Type</label>
                    <SearchableSelect
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        options={(amountTypes || []).map((t) => ({ value: t?._id, label: t?.name }))}
                        placeholder="All Fee Types"
                        searchPlaceholder="Search…"
                        maxVisible={7}
                    />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-(--nb-color-border)">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={12} className="text-(--nb-color-muted)" />
                        <span className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest">Class Filtering (Optional)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <GradeSelect
                            value={gradeId}
                            onChange={(v) => {
                                setGradeId(v || '');
                                setSelectedClass('');
                            }}
                            placeholder="Grade"
                            className="h-11 font-bold"
                        />
                        <ShiftSelect
                            value={shiftId}
                            onChange={(v) => {
                                setShiftId(v || '');
                                setSelectedClass('');
                            }}
                            placeholder="Shift"
                            className="h-11 font-bold"
                        />
                        <GradeSectionSelect
                            gradeId={gradeId}
                            shiftId={shiftId}
                            value={selectedClass}
                            onChange={(v) => setSelectedClass(v || '')}
                            searchable
                            maxVisible={7}
                            placeholder="Campus Wide (Default)"
                            searchPlaceholder="Search…"
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
                            Reset
                        </Button>
                    </div>
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
                        <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">From Date</label>
                        <Input type="date" className="h-11 font-bold" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">To Date</label>
                        <Input type="date" className="h-11 font-bold" value={toDate} onChange={e => setToDate(e.target.value)} />
                    </div>
                </div>

            </div>
        </PrintModalWrapper>
    );
};

// 3. Pass Card Modal
export const PrintPassCardModal = ({ onClose }) => {
    const [loading, setLoading] = useState(false);
    const [years, setYears] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [gradeId, setGradeId] = useState('');
    const [shiftId, setShiftId] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [examType, setExamType] = useState('Midterm Examination');
    const [layout, setLayout] = useState('portrait');

    const examTypes = ['Midterm Examination', 'Final Examination'];

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
                    <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Target Academic Year</label>
                    <DropdownSelect
                        value={selectedYear}
                        onChange={setSelectedYear}
                        options={(years || []).map((y) => ({ value: y?._id, label: y?.yearName }))}
                        placeholder="Choose Year"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Choose Class</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <GradeSelect
                            value={gradeId}
                            onChange={(v) => {
                                setGradeId(v || '');
                                setSelectedClass('');
                            }}
                            placeholder="Grade"
                            className="h-11 font-bold"
                        />
                        <ShiftSelect
                            value={shiftId}
                            onChange={(v) => {
                                setShiftId(v || '');
                                setSelectedClass('');
                            }}
                            placeholder="Shift"
                            className="h-11 font-bold"
                        />
                        <GradeSectionSelect
                            gradeId={gradeId}
                            shiftId={shiftId}
                            value={selectedClass}
                            onChange={(v) => setSelectedClass(v || '')}
                            searchable
                            maxVisible={7}
                            placeholder="All Classes"
                            searchPlaceholder="Search…"
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
                            Reset
                        </Button>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Examination Type</label>
                    <DropdownSelect
                        value={examType}
                        onChange={setExamType}
                        options={examTypes.map((t) => ({ value: t, label: t }))}
                        placeholder="Choose Exam"
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
                        Portrait
                    </Button>
                    <Button
                        onClick={() => setLayout('landscape')}
                        variant="neutral"
                        size="md"
                        className={`w-full justify-center gap-2 p-3! rounded-xl border-2 shadow-none font-black text-[10px] uppercase tracking-widest transition-all ${layout === 'landscape' ? 'border-blue-600! bg-blue-50! text-blue-600!' : 'border-(--nb-color-border)! text-(--nb-color-muted)! bg-(--nb-color-bg-card)!'}`}
                    >
                        Landscape
                    </Button>
                </div>
            </div>
        </PrintModalWrapper>
    );
};


