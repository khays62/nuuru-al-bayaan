import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Info, Printer, Wallet, Users, Search, History, Calendar, Check, CreditCard, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../auth/AuthContext';
import headerImg from '../../../assets/nuuruBayaanHeader.png';
import { useQuery } from '@tanstack/react-query';
import { listAccounts } from '../api/accountsApi';
import { accountKeys } from '../queryKeys';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import { useI18n } from '../../../i18n/useI18n';
import { printHtmlDocument } from '../../../utils/exportTable';
import { useRealtimeInvalidation } from '../../../shared/realtime/useRealtimeInvalidation';
import { EVENTS } from '../../../utils/events';
import { isValidSomaliaPhone } from '../../../shared/utils/phoneSomalia.js';
import {
    useInvoicesQuery,
    useStudentMonthHistoryQuery,
    usePayChargedMonthMutation,
    usePaySelectedMonthsMutation,
    useRevertPaymentGroupMutation,
} from '../hooks/studentFinanceHooks';
import { getInvoices } from '../api/studentFinanceApi';

export default function StudentFinancePaymentModal({
    row,
    onClose,
    onPaid,
    permissionModule = 'financeStudentReceiptModal',
    legacyModule = 'financeStudentReceipt',
}) {
    const { auth, hasPermission } = useAuth();
    const { t, lang } = useI18n();
    // Note: role checks handled server-side; keep auth available for future UI rules
    void auth;

    const legacyAny = ['view', 'add', 'edit', 'delete', 'download'].some((a) => hasPermission(legacyModule, a));

    const canViewPerm =
        hasPermission(permissionModule, 'view') ||
        hasPermission(permissionModule, 'full') ||
        legacyAny;

    const canInputPerm =
        hasPermission(permissionModule, 'input') ||
        hasPermission(permissionModule, 'full') ||
        ['add', 'edit'].some((a) => hasPermission(legacyModule, a));

    const canSavePerm =
        hasPermission(permissionModule, 'save') ||
        hasPermission(permissionModule, 'full') ||
        ['add', 'edit'].some((a) => hasPermission(legacyModule, a));

    const canRevertPerm =
        hasPermission(permissionModule, 'revert') ||
        hasPermission(permissionModule, 'full') ||
        ['delete', 'edit'].some((a) => hasPermission(legacyModule, a));

    const canPrintPerm = hasPermission('financePrint', 'print');

    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [history, setHistory] = useState([]);
    const [view, setView] = useState('ledger'); // ledger | history

    // Global Config
    const [accountId, setAccountId] = useState('');
    const [paymentType, setPaymentType] = useState('level'); // level | receipt
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const paymentMethod = 'Cash';

    // Hormaris multi-month selection (advance months)
    const [selectedHormarisMonths, setSelectedHormarisMonths] = useState([]); // string[] YYYY-MM
    const [selectedHormarisAmounts, setSelectedHormarisAmounts] = useState({}); // { [month: string]: string } blank => FULL
    const [hormarisReference, setHormarisReference] = useState('');

    // Row editing state
    const [editingPaid, setEditingPaid] = useState({}); // { invoiceId: amount }
    const [editingReference, setEditingReference] = useState({}); // { invoiceId: reference/phone }
    const [processingId, setProcessingId] = useState(null);
    const [printingId, setPrintingId] = useState(null);
    const [cachedHeaderBase64, setCachedHeaderBase64] = useState('');

    const student = row?.student;

    const printDir = useMemo(() => (lang === 'ar' ? 'rtl' : 'ltr'), [lang]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const next = headerImg ? await getBase64Image(headerImg) : '';
            if (!cancelled) setCachedHeaderBase64(next || '');
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const accountsQuery = useQuery({
        queryKey: accountKeys.list({ includeInactive: false }),
        queryFn: ({ signal }) => listAccounts({ includeInactive: false }, { signal }),
        staleTime: 30 * 1000,
        enabled: Boolean(canViewPerm),
    });

    const invoicesQuery = useInvoicesQuery(
        { studentId: student?._id, limit: 200 },
        {
            enabled: Boolean(canViewPerm) && !!student?._id,
            staleTime: 60 * 1000,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
        }
    );

    const historyQuery = useStudentMonthHistoryQuery(
        { studentId: student?._id },
        {
            enabled: Boolean(canViewPerm) && !!student?._id,
            staleTime: 60 * 1000,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
        }
    );

    useRealtimeInvalidation(
        EVENTS.STUDENT_FINANCE_CHANGED,
        (detail) => {
            const evtStudentId = detail?.studentId;
            if (evtStudentId && student?._id && String(evtStudentId) !== String(student._id)) return;

            invoicesQuery.refetch?.();
            historyQuery.refetch?.();
        },
        { enabled: Boolean(canViewPerm) && !!student?._id }
    );

    const payChargedMonthMutation = usePayChargedMonthMutation();
    const paySelectedMonthsMutation = usePaySelectedMonthsMutation();
    const revertPaymentGroupMutation = useRevertPaymentGroupMutation();

    const normalizeMonth = (value) => {
        if (!value || typeof value !== 'string') return null;
        const raw = value.trim();
        const m2 = raw.match(/^(\d{4})-(\d{2})$/);
        if (m2) return `${m2[1]}-${m2[2]}`;
        const m1 = raw.match(/^(\d{4})-(\d{1})$/);
        if (m1) return `${m1[1]}-0${m1[2]}`;
        return null;
    };

    const sanitizeSomaliaPhoneInput = (value) => {
        const raw = String(value ?? '');
        const hasPlus = raw.startsWith('+');
        const digits = raw.replace(/\D/g, '');
        return hasPlus ? `+${digits}` : digits;
    };

    const isInvoiceHormaris = (inv) => {
        if (!inv) return false;
        if (typeof inv.isHormaris === 'boolean') return inv.isHormaris;
        const createdMonth = inv.createdAt ? new Date(inv.createdAt).toISOString().slice(0, 7) : '';
        const billingMonthNorm = normalizeMonth(inv.billingMonth);
        return !!billingMonthNorm && !!createdMonth && billingMonthNorm > createdMonth;
    };

    const getInvoiceBalance = (inv) => {
        const totalDiscount = inv.discounts?.reduce((s, d) => s + (d.amountOff || 0), 0) || 0;
        const grossFee = Number(inv.amount || 0) + totalDiscount;
        const displayPaid = Number(inv.paidAmount || 0) + totalDiscount;
        return grossFee - displayPaid;
    };

    const totalArrears = (invoices || []).reduce((sum, inv) => {
        if (!inv || inv?.status === 'Cancelled') return sum;
        const bal = getInvoiceBalance(inv);
        return sum + (Number.isFinite(bal) && bal > 0 ? bal : 0);
    }, 0);

    const hormarisMonthOptions = (() => {
        const nowMonth = new Date().toISOString().slice(0, 7);
        const byMonth = new Map();

        for (const inv of invoices || []) {
            const billingMonthNorm = normalizeMonth(inv.billingMonth);
            if (!billingMonthNorm) continue;
            const balance = getInvoiceBalance(inv);
            if (balance <= 0) continue;
            // Only future months are selectable for Hormaris
            if (billingMonthNorm <= nowMonth) continue;
            if (!isInvoiceHormaris(inv)) continue;

            byMonth.set(billingMonthNorm, (byMonth.get(billingMonthNorm) || 0) + balance);
        }

        return Array.from(byMonth.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([month, total]) => ({ month, total }));
    })();

    const handleRevertHistoryPayments = async (h) => {
        try {
            if (!canRevertPerm) return;
            const groups = Array.isArray(h?.paymentGroups) ? h.paymentGroups : [];
            if (!groups.length) {
                return toast.error(t('finance.studentFinance.paymentModal.toasts.noPaymentGroupsToRevert', { defaultValue: 'No payment groups found to revert' }));
            }

            if (!window.confirm(t('finance.studentFinance.paymentModal.confirms.revertMonth', { defaultValue: 'This will REVERT payments for this month. Continue?' }))) return;

            toast.loading(t('finance.studentFinance.paymentModal.toasts.revertingPayments', { defaultValue: 'Reverting payments...' }));
            for (const g of groups) {
                const id = g?.paymentGroupId;
                if (!id) continue;
                await revertPaymentGroupMutation.mutateAsync({ paymentGroupId: id, reason: 'Admin revert for charge deletion' });
            }

            // Refresh invoices + history
            await Promise.all([invoicesQuery.refetch(), historyQuery.refetch()]);

            toast.dismiss();
            toast.success(t('finance.studentFinance.paymentModal.toasts.paymentsReverted', { defaultValue: 'Payments reverted' }));
            onPaid?.();
        } catch (err) {
            toast.dismiss();
            toast.error(err.response?.data?.message || t('finance.studentFinance.paymentModal.toasts.failedRevertPayments', { defaultValue: 'Failed to revert payments' }));
        }
    };

    useEffect(() => {
        // Only show the loading state for the initial load; background refetches
        // (e.g., SSE-triggered) should update silently without a blocking spinner.
        setLoading(Boolean(accountsQuery.isLoading || invoicesQuery.isLoading || historyQuery.isLoading));
    }, [accountsQuery.isLoading, invoicesQuery.isLoading, historyQuery.isLoading]);

    useEffect(() => {
        const accList = Array.isArray(accountsQuery.data) ? accountsQuery.data : (accountsQuery.data?.data || []);
        setAccounts(accList);
        if (!accountId && accList.length > 0) setAccountId(accList[0]._id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountsQuery.data]);

    useEffect(() => {
        const invRes = invoicesQuery.data;
        const invList = Array.isArray(invRes) ? invRes : (invRes?.data || []);
        setInvoices((invList || []).filter(i => i?.status !== 'Cancelled'));
    }, [invoicesQuery.data]);

    useEffect(() => {
        const histRes = historyQuery.data;
        setHistory(histRes?.rows || histRes?.data || histRes || []);
    }, [historyQuery.data]);

    const handlePaidChange = (id, val) => {
        setEditingPaid(prev => ({ ...prev, [id]: val }));
    };

    const handleReferenceChange = (id, val) => {
        setEditingReference(prev => ({ ...prev, [id]: sanitizeSomaliaPhoneInput(val) }));
    };

    const handleSavePayment = async (inv) => {
        if (!canSavePerm) return;
        const paidAmount = Number(editingPaid[inv._id]);
        if (!accountId) return toast.error(t('finance.studentFinance.paymentModal.validation.selectAccount', { defaultValue: 'Please select an account' }));
        if (!paidAmount || paidAmount <= 0) return toast.error(t('finance.studentFinance.paymentModal.validation.enterValidAmount', { defaultValue: 'Enter a valid amount' }));

        const referenceRaw = String(editingReference?.[inv._id] ?? '').trim();
        if (!referenceRaw) return toast.error(t('finance.studentFinance.paymentModal.validation.phoneRefRequired', { defaultValue: 'Phone/Ref is required' }));
        if (!isValidSomaliaPhone(referenceRaw)) {
            return toast.error(t('finance.studentFinance.paymentModal.validation.phoneInvalid', { defaultValue: 'Invalid Somalia phone number' }));
        }

        setProcessingId(inv._id);
        try {
            await payChargedMonthMutation.mutateAsync({
                studentId: student._id,
                month: inv.billingMonth,
                academicYearId: inv.academicYear,
                accountId,
                amount: paidAmount,
                paymentType,
                method: paymentMethod,
                date: paymentDate,
                reference: referenceRaw,
                description: `Payment for ${inv.title || inv.billingMonth}`
            });

            toast.success(t('finance.studentFinance.paymentModal.toasts.paymentRecorded', { defaultValue: 'Payment recorded' }));
            await Promise.all([invoicesQuery.refetch(), historyQuery.refetch()]);
            setEditingPaid(prev => {
                const n = { ...prev };
                delete n[inv._id];
                return n;
            });
            setEditingReference(prev => {
                const n = { ...prev };
                delete n[inv._id];
                return n;
            });
            onPaid?.();
        } catch (err) {
            toast.error(err.response?.data?.message || t('finance.studentFinance.paymentModal.toasts.paymentFailed', { defaultValue: 'Payment failed' }));
        } finally {
            setProcessingId(null);
        }
    };

    const getPayAmountStatus = (inv, computedBalance) => {
        const raw = editingPaid?.[inv?._id];
        const entered = raw === '' || raw == null ? 0 : Number(raw);
        const remaining = Number(computedBalance || 0);

        if (!Number.isFinite(entered) || entered <= 0) return { kind: 'none', remaining };
        if (!Number.isFinite(remaining) || remaining <= 0) return { kind: 'exact', remaining };

        const eps = 0.01;
        if (entered > remaining + eps) return { kind: 'over', remaining };
        if (Math.abs(entered - remaining) <= eps) return { kind: 'exact', remaining };
        return { kind: 'under', remaining };
    };

    const handleToggleHormarisMonth = (month) => {
        setSelectedHormarisMonths((prev) => {
            const set = new Set(prev);
            if (set.has(month)) {
                set.delete(month);
                setSelectedHormarisAmounts((prevAmt) => {
                    const next = { ...prevAmt };
                    delete next[month];
                    return next;
                });
            } else {
                set.add(month);
                setSelectedHormarisAmounts((prevAmt) => ({ ...prevAmt, [month]: prevAmt?.[month] ?? '' }));
            }
            return Array.from(set).sort();
        });
    };

    const handleHormarisAmountChange = (month, val) => {
        const nextVal = String(val ?? '').replace(/[^0-9.]/g, '');
        setSelectedHormarisAmounts((prev) => ({ ...prev, [month]: nextVal }));
    };

    const renderMultiRV = (invs, meta) => {
        const dateNow = new Date().toLocaleString();
        const invList = Array.isArray(invs) ? invs : [];
        const firstInv = invList[0];
        const showDiscount = meta?.paymentType === 'receipt';

        const voucherTitle = t('finance.printModals.voucher.title', { defaultValue: 'Payment Receipt' });
        const lblDate = t('finance.printModals.voucher.labels.date', { defaultValue: 'Date' });
        const lblRv = t('finance.printModals.voucher.labels.rv', { defaultValue: 'RV' });
        const lblClass = t('finance.printModals.voucher.labels.class', { defaultValue: 'Class' });
        const lblId = t('finance.printModals.voucher.labels.id', { defaultValue: 'ID' });
        const lblStudentName = t('finance.printModals.voucher.labels.studentName', { defaultValue: 'Student name' });
        const lblShift = t('finance.printModals.voucher.labels.shift', { defaultValue: 'Shift' });
        const lblDescription = t('finance.printModals.voucher.labels.description', { defaultValue: 'Description' });
        const lblMonth = t('finance.printModals.voucher.labels.month', { defaultValue: 'Month' });
        const lblBalance = t('finance.printModals.voucher.labels.balance', { defaultValue: 'Balance' });
        const lblPaid = t('finance.printModals.voucher.labels.paid', { defaultValue: 'Paid' });
        const lblFee = t('finance.printModals.voucher.labels.fee', { defaultValue: 'Fee' });
        const lblDiscount = t('finance.printModals.voucher.labels.discount', { defaultValue: 'Discount' });
        const note = t('finance.printModals.voucher.note', { defaultValue: '* Note: This receipt represents the level-agreed amount.' });
        const monthlyFeeFallback = t('finance.printModals.voucher.defaults.monthlyFee', { defaultValue: 'Monthly fee' });
        const hormarisSuffix = t('finance.printModals.voucher.hormarisSuffix', { defaultValue: ' (Advance)' });

        const recNo = meta?.paymentGroupId
            ? `RV-${String(meta.paymentGroupId).slice(-6).toUpperCase()}`
            : `RV-${String(firstInv?._id || '').slice(-6).toUpperCase()}`;

        const gradeName = firstInv?.class?.grade?.gradeName || firstInv?.class?.grade?.name || firstInv?.class?.gradeName || '';
        const section = firstInv?.class?.section || firstInv?.class?.sectionName || '';
        const classLabel = (
            firstInv?.classLabel ||
            firstInv?.class?.name ||
            `${gradeName}${section ? ` - ${section}` : ''}`.trim() ||
            meta.student.currentClass ||
            meta.student.classLabel ||
			'—'
        );
        const studentId = meta.student.studentId || '—';

        const isMongoObjectIdString = (value) => typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
        const rawShift = firstInv?.class?.shift ?? firstInv?.shift ?? meta.student.shift ?? meta.student.currentShift;
        const shiftLabel =
            (typeof rawShift === 'string'
                ? (isMongoObjectIdString(rawShift) ? '' : rawShift)
                : (rawShift?.name || rawShift?.shiftName || rawShift?.label)) ||
			'—';

        const txByInvoice = meta?.txByInvoice instanceof Map ? meta.txByInvoice : new Map();
        const fmtMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

        const rowsHtml = invList
            .map((inv) => {
                const totalDiscount = inv.discounts?.reduce((s, d) => s + (d.amountOff || 0), 0) || 0;
                const isFree = !!inv.isWaived || !!inv.student?.isFree || !!meta.student?.isFree;
                const baseFee = isFree ? Number(inv.class?.fee ?? inv.fee ?? inv.amount ?? 0) : Number(inv.amount || 0);
                const grossFee = baseFee + totalDiscount;
                const currentBalance = Number(inv.balance || 0);

                const createdMonth = inv.createdAt ? new Date(inv.createdAt).toISOString().slice(0, 7) : '';
                const billingMonthNorm = normalizeMonth(inv.billingMonth);
                const isHormaris = typeof inv?.isHormaris === 'boolean'
                    ? inv.isHormaris
                    : (!!billingMonthNorm && !!createdMonth && billingMonthNorm > createdMonth);
                const billingMonthLabel = `${inv.billingMonth || '—'}${isHormaris ? hormarisSuffix : ''}`;

                const paidInThisGroup = Number(txByInvoice.get(String(inv._id)) || 0);

                return `
                    <tr>
                        <td>${inv.title || monthlyFeeFallback}</td>
                        <td>${billingMonthLabel}</td>
                        ${showDiscount ? `<td style="text-align:right">${isFree ? '—' : fmtMoney(totalDiscount)}</td>` : ''}
                        <td style="text-align:right">${isFree ? '—' : fmtMoney(paidInThisGroup)}</td>
                        <td style="text-align:right">${fmtMoney(currentBalance)}</td>
                        <td style="text-align:right">${fmtMoney(grossFee)}</td>
                    </tr>
                `;
            })
            .join('');

        const totalPaid = Array.from(txByInvoice.values()).reduce((s, v) => s + Number(v || 0), 0);

        return `
            <html dir="${printDir}">
                <head>
                    <title>${voucherTitle} - ${meta.student.fullName}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                    <style>
                        @page { size: portrait; margin: 0; }
                        body { font-family: 'Inter', sans-serif; background: #fff; margin: 0; padding: 0; }
                        .voucher-card { padding: 26px; display: flex; flex-direction: column; position: relative; }

                        .header-main { text-align: center; margin-bottom: 6px; width: 100%; }
                        .header-logo { display: block; margin: 0 auto; width: 100%; height: auto; max-height: 28mm; object-fit: contain; }

                        .top-meta { display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; font-weight: 700; margin-top: 2px; }
                        .voucher-title { text-align: center; font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 10px 0 12px; letter-spacing: 0.5px; }

                        .voucher-table { width: 100%; border-collapse: collapse; }
                        .voucher-table td { border: 1px solid #000; padding: 10px 12px; font-size: 13px; font-weight: 700; color: #000; }
                        .cell-muted { font-weight: 700; color: #111; }

                        .items { width: 100%; border-collapse: collapse; margin-top: 8px; }
                        .items th, .items td { border: 1px solid #000; padding: 8px 10px; font-size: 12px; font-weight: 800; color: #000; }
                        .items th { background: #f8fafc; text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; }

                        .voucher-note { font-size: 9px; font-weight: 700; font-style: italic; color: #64748b; margin-top: 5px; }
                    </style>
                </head>
                <body>
                    <div class="voucher-card">
                        <div class="header-main">
                            <img src="${meta.headerImg || ''}" class="header-logo" />
                        </div>

                        <div class="top-meta">
                            <div>${lblDate}: ${dateNow}</div>
                            <div>${meta.academicYear || ''}</div>
                        </div>
                        <h2 class="voucher-title">${voucherTitle}</h2>

                        <table class="voucher-table">
                            <tbody>
                                <tr>
                                    <td><span class="cell-muted">${lblRv}:</span> ${recNo}</td>
                                    <td><span class="cell-muted">${lblClass}:</span> ${classLabel} &nbsp;&nbsp; <span class="cell-muted">${lblId}:</span> ${studentId}</td>
                                </tr>
                                <tr>
                                    <td>${lblStudentName}</td>
                                    <td>${meta.student.fullName}</td>
                                </tr>
                                <tr>
                                    <td>${lblShift}</td>
                                    <td>${shiftLabel}</td>
                                </tr>
                                <tr>
                                    <td>${lblDescription}</td>
                                    <td>${t('finance.printModals.voucher.hormarisPayment', { defaultValue: 'Advance payment ({{count}} month)', count: invList.length })} &nbsp;&nbsp; <span class="cell-muted">${lblPaid}:</span> ${fmtMoney(totalPaid)}</td>
                                </tr>
                            </tbody>
                        </table>

                        <table class="items">
                            <thead>
                                <tr>
                                    <th style="text-align:left">${lblDescription}</th>
                                    <th style="text-align:left">${lblMonth}</th>
                                    ${showDiscount ? `<th style="text-align:right">${lblDiscount}</th>` : ''}
                                    <th style="text-align:right">${lblPaid}</th>
                                    <th style="text-align:right">${lblBalance}</th>
                                    <th style="text-align:right">${lblFee}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>

                        <p class="voucher-note">${note}</p>
                    </div>
                </body>
            </html>
        `;
    };

    const handlePaySelectedHormaris = async () => {
        if (!canSavePerm) return;
        if (!selectedHormarisMonths.length) return toast.error(t('finance.studentFinance.paymentModal.validation.selectHormarisMonths', { defaultValue: 'Select advance months' }));
        if (!accountId) return toast.error(t('finance.studentFinance.paymentModal.validation.selectAccountShort', { defaultValue: 'Select account' }));
        const reference = String(hormarisReference || '').trim();
        if (!reference) return toast.error(t('finance.studentFinance.paymentModal.validation.phoneRefRequired', { defaultValue: 'Phone/Ref is required' }));
        if (!isValidSomaliaPhone(reference)) {
            return toast.error(t('finance.studentFinance.paymentModal.validation.phoneInvalid', { defaultValue: 'Invalid Somalia phone number' }));
        }
        try {
            toast.loading(t('finance.studentFinance.paymentModal.toasts.processingHormaris', { defaultValue: 'Processing advance payment...' }));
            const months = [...selectedHormarisMonths].sort();

            const totalsByMonth = new Map((hormarisMonthOptions || []).map(o => [o.month, Number(o.total || 0)]));
            const allocations = months.map((m) => {
                const raw = (selectedHormarisAmounts?.[m] ?? '').trim();
                if (!raw) return { month: m, amount: null }; // FULL
                const amt = Number(raw);
                if (!Number.isFinite(amt) || amt <= 0) {
                    throw new Error(t('finance.studentFinance.paymentModal.validation.invalidAmountForMonth', { defaultValue: 'Invalid amount for {{month}}', month: m }));
                }
                const cap = totalsByMonth.get(m);
                if (typeof cap === 'number' && cap > 0 && amt > cap) {
                    throw new Error(t('finance.studentFinance.paymentModal.validation.amountExceedsBalanceForMonth', { defaultValue: 'Amount exceeds balance for {{month}}', month: m }));
                }
                return { month: m, amount: amt };
            });

            const payRes = await paySelectedMonthsMutation.mutateAsync({
                studentId: student?._id,
                months: allocations,
                accountId,
                paymentType,
                method: paymentMethod,
                date: paymentDate,
                reference,
                description: `Advance payment for ${months.join(', ')}`,
            });

            const [invRefetch] = await Promise.all([invoicesQuery.refetch(), historyQuery.refetch()]);
            const updatedInvoices = Array.isArray(invRefetch.data)
                ? invRefetch.data
                : (Array.isArray(invRefetch.data?.data) ? invRefetch.data.data : (invRefetch.data?.data || []));

            // Print only invoices that match selected months
            const invoicesToPrint = updatedInvoices.filter(i => months.includes(normalizeMonth(i.billingMonth) || ''));
            const headerB64 = cachedHeaderBase64 || (headerImg ? await getBase64Image(headerImg) : '');

            const txByInvoice = new Map();
            const txs = Array.isArray(payRes?.transactions) ? payRes.transactions : [];
            for (const t of txs) {
                const invId = t?.invoice;
                if (!invId) continue;
                txByInvoice.set(String(invId), (txByInvoice.get(String(invId)) || 0) + Number(t.amount || 0));
            }

            const html = renderMultiRV(invoicesToPrint, {
                headerImg: headerB64,
                account: accounts.find(a => a._id === accountId)?.name || 'CASH',
                student,
                academicYear: row?.academicYear?.yearName || '2024-2025',
                paymentType,
                paymentGroupId: payRes?.paymentGroupId || payRes?.print?.paymentGroupId || null,
                txByInvoice,
            });
            await printHtmlDocument(html, { title: `SYD ERP Receipt - ${student?.fullName || ''}` });

            setSelectedHormarisMonths([]);
            setSelectedHormarisAmounts({});
            setHormarisReference('');
            toast.dismiss();
            toast.success(t('finance.studentFinance.paymentModal.toasts.hormarisRecorded', { defaultValue: 'Advance payment recorded' }));
            onPaid?.();
        } catch (err) {
            toast.dismiss();
            const msg = err?.response?.data?.message || err?.message || t('finance.studentFinance.paymentModal.toasts.hormarisFailed', { defaultValue: 'Advance payment failed' });
            toast.error(msg);
        }
    };

    const handlePrintRV = async (row) => {
        const id = row?._id || null;
        if (id && printingId === id) return;

        try {
            if (id) setPrintingId(id);

            const headerB64 = cachedHeaderBase64 || (headerImg ? await getBase64Image(headerImg) : '');

            const looksLikeInvoice = Boolean(row && (
                row?.billingMonth ||
                row?.title ||
                row?.amount != null ||
                row?.paidAmount != null ||
                row?.balance != null
            ));

            let inv = looksLikeInvoice ? row : null;
            if (!inv && row?._id) {
                const invRes = await getInvoices({ _id: row._id });
                const invList = Array.isArray(invRes)
                    ? invRes
                    : (Array.isArray(invRes?.data) ? invRes.data : (invRes?.data?.data || []));
                inv = invList?.[0] || null;
            }

            if (!inv) {
                throw new Error('missing invoice');
            }

            const isFree = !!inv?.isWaived || !!inv?.student?.isFree || !!student?.isFree;
            const hasPayment = Number(inv?.paidAmount || 0) > 0;
            if (!isFree && !hasPayment) {
                return toast.error(t('finance.studentFinance.paymentModal.errors.cannotPrintNoPayment', { defaultValue: 'Cannot print: no payment recorded' }));
            }

            const unpaid = (invoices || []).filter(i => (
                i?._id !== inv?._id &&
                i?.status !== 'Cancelled' &&
                Number(i?.balance || 0) > 0
            ));

            const html = renderRV(inv, {
                headerImg: headerB64,
                account: (() => {
                    const acc = accounts.find(a => a._id === accountId);
                    if (!acc) return 'CASH';
                    return acc.accountNumber ? `${acc.accountNumber} - ${acc.name}` : (acc.name || 'CASH');
                })(),
                student: student,
                academicYear: row?.academicYear?.yearName || '2024-2025',
                paymentType,
                unpaid,
                dir: printDir,
            });

            await printHtmlDocument(html, { title: `SYD ERP Receipt - ${student?.fullName || ''}` });
        } catch (err) {
            toast.error(t('finance.studentFinance.paymentModal.toasts.printFailed', { defaultValue: 'Print failed' }));
            void err;
        } finally {
            if (id) setPrintingId(null);
        }
    };

    const getBase64Image = (imgUrl) => {
        return new Promise((resolve) => {
            fetch(imgUrl).then(r => r.blob()).then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            }).catch(() => resolve(''));
        });
    };

    const renderRV = (inv, meta) => {
        const dateNow = new Date().toLocaleString();
        const voucherTitle = t('finance.printModals.voucher.title', { defaultValue: 'Payment Receipt' });
        const lblDate = t('finance.printModals.voucher.labels.date', { defaultValue: 'Date' });
        const lblRv = t('finance.printModals.voucher.labels.rv', { defaultValue: 'RV' });
        const lblClass = t('finance.printModals.voucher.labels.class', { defaultValue: 'Class' });
        const lblId = t('finance.printModals.voucher.labels.id', { defaultValue: 'ID' });
        const lblStudentName = t('finance.printModals.voucher.labels.studentName', { defaultValue: 'Student name' });
        const lblShift = t('finance.printModals.voucher.labels.shift', { defaultValue: 'Shift' });
        const lblDescription = t('finance.printModals.voucher.labels.description', { defaultValue: 'Description' });
        const lblMonth = t('finance.printModals.voucher.labels.month', { defaultValue: 'Month' });
        const lblBalance = t('finance.printModals.voucher.labels.balance', { defaultValue: 'Balance' });
        const lblPaid = t('finance.printModals.voucher.labels.paid', { defaultValue: 'Paid' });
        const lblFee = t('finance.printModals.voucher.labels.fee', { defaultValue: 'Fee' });
        const lblDiscount = t('finance.printModals.voucher.labels.discount', { defaultValue: 'Discount' });
        const note = t('finance.printModals.voucher.note', { defaultValue: '* Note: This receipt represents the level-agreed amount.' });
        const monthlyFeeFallback = t('finance.printModals.voucher.defaults.monthlyFee', { defaultValue: 'Monthly fee' });
        const hormarisSuffix = t('finance.printModals.voucher.hormarisSuffix', { defaultValue: ' (Advance)' });
        const arrearsLabel = t('finance.studentFinance.paymentModal.print.arrears', { defaultValue: 'Arrears' });
        const totalDiscount = inv.discounts?.reduce((s, d) => s + (d.amountOff || 0), 0) || 0;
        const isFree = !!inv.isWaived || !!inv.student?.isFree || !!meta.student?.isFree;
        const baseFee = isFree ? Number(inv.class?.fee ?? inv.fee ?? inv.amount ?? 0) : Number(inv.amount || 0);
        const grossFee = baseFee + totalDiscount;
        const isLevelMode = meta.paymentType === 'level';
        const displayPaid = isLevelMode ? Number(inv.paidAmount || 0) + totalDiscount : Number(inv.paidAmount || 0);
        const currentBalance = Number(inv.balance || 0).toFixed(2);
        const unpaidMonthsList = (meta.unpaid || []).filter(u => Number(u?.balance || 0) > 0).map(u => u.billingMonth).join(', ');

        const normalizeMonth = (value) => {
            if (!value || typeof value !== 'string') return null;
            const raw = value.trim();
            const m2 = raw.match(/^(\d{4})-(\d{2})$/);
            if (m2) return `${m2[1]}-${m2[2]}`;
            const m1 = raw.match(/^(\d{4})-(\d{1})$/);
            if (m1) return `${m1[1]}-0${m1[2]}`;
            return null;
        };
        const createdMonth = inv.createdAt ? new Date(inv.createdAt).toISOString().slice(0, 7) : '';
        const billingMonthNorm = normalizeMonth(inv.billingMonth);
        const isHormaris = typeof inv?.isHormaris === 'boolean'
            ? inv.isHormaris
            : (!!billingMonthNorm && !!createdMonth && billingMonthNorm > createdMonth);
        const billingMonthLabel = `${inv.billingMonth || '—'}${isHormaris ? hormarisSuffix : ''}`;

        const recNo = `RV-${String(inv?._id || '').slice(-6).toUpperCase()}`;
        const gradeName = inv.class?.grade?.gradeName || inv.class?.grade?.name || inv.class?.gradeName || '';
        const section = inv.class?.section || inv.class?.sectionName || '';
        const classLabel = (
            inv.classLabel ||
            inv.class?.name ||
            `${gradeName}${section ? ` - ${section}` : ''}`.trim() ||
            meta.student.currentClass ||
            meta.student.classLabel ||
            '—'
        );
        const studentId = meta.student.studentId || '—';
        const description = inv.title || monthlyFeeFallback;
        const isMongoObjectIdString = (value) => typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
        const rawShift = inv.class?.shift ?? inv.shift ?? meta.student.shift ?? meta.student.currentShift;
        const shiftLabel =
            (typeof rawShift === 'string'
                ? (isMongoObjectIdString(rawShift) ? '' : rawShift)
                : (rawShift?.name || rawShift?.shiftName || rawShift?.label)) ||
            '—';

        const paidSpan = isFree ? '' : `<span class="money">${lblPaid} $${Number(displayPaid || 0).toFixed(2)}</span>`;

        return `
            <html dir="${meta?.dir || printDir}">
                <head>
                    <title>${voucherTitle} - ${meta.student.fullName}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                    <style>
                        @page { size: portrait; margin: 0; }
                        body { font-family: 'Inter', sans-serif; background: #fff; margin: 0; padding: 0; }
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
                        
                        .voucher-note { font-size: 9px; font-weight: 700; font-style: italic; color: #64748b; margin-top: 5px; }
                    </style>
                </head>
                <body>
                    <div class="voucher-card">
                        <div class="header-main">
                            <img src="${meta.headerImg || ''}" class="header-logo" />
                        </div>

                        <div class="top-meta">
                            <div>${lblDate}: ${dateNow}</div>
                            <div>${meta.academicYear || ''}</div>
                        </div>
                        <h2 class="voucher-title">${voucherTitle}</h2>

                        <table class="voucher-table">
                            <tbody>
                                <tr>
                                    <td><span class="cell-muted">${lblRv}:</span> ${recNo}</td>
                                    <td><span class="cell-muted">${lblClass}:</span> ${classLabel} &nbsp;&nbsp; <span class="cell-muted">${lblId}:</span> ${studentId}</td>
                                </tr>
                                <tr>
                                    <td>${lblStudentName}</td>
                                    <td>${meta.student.fullName}</td>
                                </tr>
                                <tr>
                                    <td>${lblShift}</td>
                                    <td>${shiftLabel}</td>
                                </tr>
                                <tr>
                                    <td>${lblDescription}</td>
                                    <td>
                                        <div class="cell-flex">
                                            <span>${description}</span>
                                            ${paidSpan}
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td><span class="cell-muted">${lblMonth}:</span> ${billingMonthLabel}</td>
                                    <td>
                                        <div class="cell-flex">
                                            <span><span class="cell-muted">${lblBalance}:</span> $${Number(currentBalance || 0).toFixed(2)}</span>
                                            ${isLevelMode
                ? `<span class="cell-muted">(${lblFee} $${Number(grossFee || 0).toFixed(2)})</span>`
                : `<span class="cell-muted">(${lblFee} $${Number(grossFee || 0).toFixed(2)}, ${lblDiscount} $${Number(totalDiscount || 0).toFixed(2)})</span>`
            }
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        ${unpaidMonthsList ? `<p class="voucher-note" style="color:#ef4444; font-size:12px; margin-bottom: 10px;">${arrearsLabel}: ${unpaidMonthsList}</p>` : ''}
                        <p class="voucher-note">${note}</p>
                    </div>
                </body>
            </html>
        `;
    };

    if (!canViewPerm) return null;

    return (
        <Modal
            isOpen
            onClose={onClose}
            closeOnBackdrop={false}
            overlayClassName="z-100"
            panelClassName="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
            bodyClassName="p-4 overflow-hidden flex-1"
            title={t('finance.studentFinance.paymentModal.title', { defaultValue: 'Student Finance' })}
        >
            <div className="flex flex-col gap-4 h-full overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-(--nb-color-bg) p-2 rounded-lg border border-(--nb-color-border)">
                            <Wallet className="w-4 h-4 text-(--nb-color-fg)" />
                        </div>
                        <div className="min-w-0">
                            <div className="font-bold text-(--nb-color-fg) truncate">{student?.fullName || '-'}</div>
                            <div className="text-xs text-(--nb-color-muted) font-mono uppercase tracking-widest truncate">{student?.studentId || ''}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            onClick={() => setView('ledger')}
                            variant="neutral"
                            size="sm"
                            className={view === 'ledger' ? 'bg-(--nb-color-brand)! text-white! border-(--nb-color-brand)!' : ''}
                        >
                            {t('finance.studentFinance.paymentModal.tabs.ledger', { defaultValue: 'Ledger' })}
                        </Button>
                        <Button
                            onClick={() => setView('history')}
                            variant="neutral"
                            size="sm"
                            className={view === 'history' ? 'bg-(--nb-color-brand)! text-white! border-(--nb-color-brand)!' : ''}
                        >
                            {t('finance.studentFinance.paymentModal.tabs.history', { defaultValue: 'History' })}
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                    {view === 'ledger' ? (
                        <div className="space-y-4">
                            {/* Controls Bar */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-(--nb-color-bg-card) p-3 rounded-xl border border-(--nb-color-border) shrink-0">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <Info size={10} /> {t('finance.studentFinance.paymentModal.controls.selectLedgerAccount', { defaultValue: 'Select Ledger Account' })}
                                    </label>
                                    <DropdownSelect
                                        value={accountId}
                                        onChange={(v) => setAccountId(v)}
                                        options={accounts.map((acc) => ({
                                            value: acc._id,
                                            label: acc.accountNumber ? `${acc.accountNumber} - ${acc.name}` : acc.name,
                                        }))}
                                        placeholder={t('finance.studentFinance.paymentModal.placeholders.chooseAccount', { defaultValue: '-- Choose Account --' })}
                                        className="h-10 font-bold text-xs"
                                        disabled={!canInputPerm}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">
                                        {t('finance.studentFinance.paymentModal.controls.paymentMode', { defaultValue: 'Payment Mode' })}
                                    </label>
                                    <div className="h-10 bg-(--nb-color-bg) p-1 rounded-lg flex gap-1 border border-(--nb-color-border)">
                                        <Button
                                            onClick={() => setPaymentType('level')}
                                            variant="neutral"
                                            size="sm"
                                            disabled={!canInputPerm}
                                            className={`flex-1 h-full px-0 border-0 shadow-none rounded-md text-[9px] font-black uppercase tracking-tighter transition-all ${paymentType === 'level' ? 'bg-(--nb-color-bg-card)! text-(--nb-color-fg)! shadow-(--nb-shadow-sm) border border-(--nb-color-border)' : 'bg-transparent! text-(--nb-color-muted)!'}`}
                                        >
                                            {t('finance.studentFinance.paymentModal.controls.byLevel', { defaultValue: 'By Level' })}
                                        </Button>
                                        <Button
                                            onClick={() => setPaymentType('receipt')}
                                            variant="neutral"
                                            size="sm"
                                            disabled={!canInputPerm}
                                            className={`flex-1 h-full px-0 border-0 shadow-none rounded-md text-[9px] font-black uppercase tracking-tighter transition-all ${paymentType === 'receipt' ? 'bg-(--nb-color-bg-card)! text-(--nb-color-fg)! shadow-(--nb-shadow-sm) border border-(--nb-color-border)' : 'bg-transparent! text-(--nb-color-muted)!'}`}
                                        >
                                            {t('finance.studentFinance.paymentModal.controls.byReceipt', { defaultValue: 'By Receipt' })}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">
                                        {t('finance.studentFinance.paymentModal.controls.paymentDate', { defaultValue: 'Payment Date' })}
                                    </label>
                                    <Input
                                        type="date"
                                        className="h-10 px-3 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-lg font-bold text-xs text-(--nb-color-fg)"
                                        value={paymentDate}
                                        onChange={e => setPaymentDate(e.target.value)}
                                        disabled={!canInputPerm}
                                    />
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">
                                            {t('finance.studentFinance.paymentModal.labels.total', { defaultValue: 'Total' })}
                                        </span>
                                        <span className="text-2xl font-black text-blue-600 leading-none tabular-nums">${Number(totalArrears || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="bg-blue-100 p-2.5 rounded-lg border border-blue-100">
                                        <CreditCard className="w-5 h-5 text-blue-600" />
                                    </div>
                                </div>
                            </div>

                            {/* Hormaris Multi-Month Selection */}
                            {hormarisMonthOptions.length > 0 ? (
                                <div className="bg-(--nb-color-bg-card) p-3 rounded-xl border border-(--nb-color-border) shadow-(--nb-shadow-sm) shrink-0 flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="text-[9px] font-black text-(--nb-color-muted) uppercase tracking-widest">
											{t('finance.studentFinance.paymentModal.hormaris.selectMonths', { defaultValue: 'Select Advance Months' })}
                                        </div>
                                        <Button
                                            onClick={handlePaySelectedHormaris}
                                            disabled={!canSavePerm || selectedHormarisMonths.length === 0 || !accountId}
                                            variant="neutral"
                                            size="md"
                                            className="h-8 px-4 bg-(--nb-color-brand)! text-white! border-(--nb-color-brand)! rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30"
                                        >
                                            {t('finance.studentFinance.paymentModal.actions.paySelected', { defaultValue: 'Pay Selected' })}
                                        </Button>
                                    </div>

                                    <Input
                                        type="text"
                                        placeholder={t('finance.studentFinance.paymentModal.placeholders.phoneRef', { defaultValue: 'Phone/Ref' })}
                                        value={hormarisReference}
                                        inputMode="tel"
                                        onChange={(e) => setHormarisReference(sanitizeSomaliaPhoneInput(e.target.value))}
                                        className={
                                            "h-8 w-full px-3 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-lg font-black text-[10px] uppercase tracking-widest text-(--nb-color-fg) " +
                                            (hormarisReference && !isValidSomaliaPhone(hormarisReference) ? 'border-red-300! text-red-700!' : '')
                                        }
                                        disabled={!canInputPerm}
                                    />

                                    <div className="flex flex-wrap gap-2">
                                        {hormarisMonthOptions.map((o) => {
                                            const checked = selectedHormarisMonths.includes(o.month);
                                            return (
                                                <div key={o.month} className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleToggleHormarisMonth(o.month)}
                                                        variant="neutral"
                                                        size="sm"
                                                        className={`px-3 py-1.5 shadow-none rounded-lg text-[10px] font-black uppercase tracking-widest ${checked ? 'bg-red-50! border-red-200! text-red-700!' : 'bg-(--nb-color-bg)! border-(--nb-color-border)! text-(--nb-color-fg)!'}`}
                                                        title={`Balance: $${Number(o.total || 0).toFixed(2)}`}
                                                    >
                                                        {o.month}
                                                    </Button>
                                                    {checked ? (
                                                        <Input
                                                            type="text"
                                                            inputMode="decimal"
                                                            placeholder={t('finance.studentFinance.paymentModal.placeholders.full', { defaultValue: 'FULL' })}
                                                            value={selectedHormarisAmounts?.[o.month] ?? ''}
                                                            onChange={(e) => handleHormarisAmountChange(o.month, e.target.value)}
                                                            className="h-8 w-24 px-3 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-lg font-black text-[10px] uppercase tracking-widest text-(--nb-color-fg)"
                                                            disabled={!canInputPerm}
                                                        />
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null}

                            <div className="overflow-x-auto border border-(--nb-color-border) rounded-xl">
                                <StandardTable
                                    isLoading={loading}
                                    loadingMessage={t('finance.studentFinance.paymentModal.loading.analysing', { defaultValue: 'Analysing...' })}
                                    items={invoices}
                                    rows={invoices}
                                    columns={[
                                        { key: 'no', label: t('finance.studentFinance.paymentModal.columns.no', { defaultValue: 'No' }) },
                                        { key: 'month', label: t('finance.studentFinance.paymentModal.columns.month', { defaultValue: 'Month' }) },
                                        { key: 'phoneRef', label: t('finance.studentFinance.paymentModal.columns.phoneRef', { defaultValue: 'Phone/Ref' }), noPrint: true, tdClassName: 'px-3 py-2' },
                                        { key: 'description', label: t('finance.studentFinance.paymentModal.columns.description', { defaultValue: 'Description' }) },
                                        { key: 'dr', label: t('finance.studentFinance.paymentModal.columns.drFees', { defaultValue: 'Dr (Fees)' }), align: 'right' },
                                        { key: 'cr', label: t('finance.studentFinance.paymentModal.columns.crPaid', { defaultValue: 'Cr (Paid)' }), align: 'right' },
                                        ...(paymentType === 'receipt'
                                            ? [{ key: 'discount', label: t('finance.studentFinance.paymentModal.columns.discount', { defaultValue: 'Discount' }), align: 'right' }]
                                            : []),
                                        { key: 'payAmount', label: t('finance.studentFinance.paymentModal.columns.payAmount', { defaultValue: 'Pay Amount' }), noPrint: true, tdClassName: 'px-3 py-2' },
                                        { key: 'actions', label: t('finance.studentFinance.paymentModal.columns.actions', { defaultValue: 'Actions' }), noPrint: true, tdClassName: 'px-3 py-2' },
                                        { key: 'balance', label: t('finance.studentFinance.paymentModal.columns.balance', { defaultValue: 'Balance' }), align: 'right' },
                                    ]}
                                    storageKey="finance:studentFinance:viewInfo:ledger"
                                    getRowKey={(row) => row?._id}
                                    emptyTitle={t('finance.studentFinance.paymentModal.empty.noRecords', { defaultValue: 'No records found.' })}
                                    tableProps={{ shellClassName: 'ring-0 shadow-none rounded-none' }}
                                    renderCell={(inv, col, idx) => {
                                        const totalDiscount = inv?.discounts?.reduce((s, d) => s + (d.amountOff || 0), 0) || 0;
                                        const grossFee = Number(inv?.amount || 0) + totalDiscount;
                                        const displayPaid = Number(inv?.paidAmount || 0) + totalDiscount;
                                        const balance = grossFee - displayPaid;
                                        const isFreeForPrint = !!inv?.isWaived || !!student?.isFree;
                                        const canPrint = isFreeForPrint || Number(inv?.paidAmount || 0) > 0;
                                        const createdMonth = inv?.createdAt ? new Date(inv.createdAt).toISOString().slice(0, 7) : '';
                                        const billingMonthNorm = normalizeMonth(inv?.billingMonth);
                                        const isHormaris = typeof inv?.isHormaris === 'boolean'
                                            ? inv.isHormaris
                                            : (!!billingMonthNorm && !!createdMonth && billingMonthNorm > createdMonth);
                                        const paymentLocked = processingId === inv?._id || Number(inv?.paidAmount || 0) >= Number(inv?.amount || 0);

                                        switch (col.key) {
                                            case 'no':
                                                return <span className="text-xs font-mono text-(--nb-color-muted)">{String(idx + 1).padStart(2, '0')}</span>;
                                            case 'month':
                                                return (
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-(--nb-color-bg) text-(--nb-color-fg) px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide">
                                                            {inv?.billingMonth || '-'}
                                                        </span>
                                                        {isHormaris ? (
                                                            <span className="bg-(--nb-color-brand) text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
                                                                {t('finance.studentFinance.receiptTab.labels.hormaris', { defaultValue: 'Advance' })}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                );
                                            case 'phoneRef':
                                                {
                                                    const value = String(editingReference?.[inv._id] ?? '').trim();
                                                    const showInvalid = Boolean(value) && !isValidSomaliaPhone(value);
                                                    return (
                                                    <Input
                                                        type="tel"
                                                        inputMode="tel"
                                                        className={
                                                            "w-full h-9 px-3 bg-(--nb-color-bg) border border-(--nb-color-border) rounded text-xs font-bold text-(--nb-color-fg) outline-none focus:ring-2 focus:ring-blue-500/10 transition-all " +
                                                            (showInvalid ? 'border-red-300! text-red-700!' : '')
                                                        }
                                                        placeholder={student?.phoneNumber
                                                            ? t('finance.studentFinance.paymentModal.placeholders.defaultPhone', { defaultValue: 'Default: {{phone}}', phone: student.phoneNumber })
                                                            : t('finance.studentFinance.paymentModal.placeholders.phoneRef', { defaultValue: 'Phone/Ref' })}
                                                        value={editingReference?.[inv._id] ?? ''}
                                                        onChange={(e) => handleReferenceChange(inv._id, e.target.value)}
                                                        disabled={paymentLocked || !canInputPerm}
                                                    />
                                                    );
                                                }
                                            case 'description':
                                                return (
                                                    <div className={isHormaris ? 'text-red-700' : ''}>
                                                        <div className="text-sm font-bold">{inv?.title || t('finance.studentFinance.paymentModal.invoice.titleFallback', { defaultValue: 'Tuition Fee' })}</div>
                                                        <div className="text-[10px] text-(--nb-color-muted) font-mono uppercase tracking-widest">ID: {String(inv?._id || '').slice(-6).toUpperCase()}</div>
                                                    </div>
                                                );
                                            case 'dr':
                                                return <span className="font-mono">${Number(grossFee || 0).toFixed(2)}</span>;
                                            case 'cr':
                                                return <span className="font-mono text-emerald-700">${Number(inv?.paidAmount || 0).toFixed(2)}</span>;
                                            case 'discount':
                                                return <span className="font-mono text-blue-700">${Number(totalDiscount || 0).toFixed(2)}</span>;
                                            case 'payAmount':
                                                return (
                                                    <Input
                                                        type="number"
                                                        className="w-full h-9 px-3 bg-(--nb-color-bg) border border-(--nb-color-border) rounded text-xs font-bold text-(--nb-color-fg) outline-none focus:ring-2 focus:ring-blue-500/10 transition-all text-center"
                                                        placeholder={t('finance.studentFinance.paymentModal.placeholders.amountZero', { defaultValue: '0.00' })}
                                                        value={editingPaid?.[inv._id] || ''}
                                                        onChange={(e) => handlePaidChange(inv._id, e.target.value)}
                                                        disabled={paymentLocked || !canInputPerm}
                                                    />
                                                );
                                            case 'actions':
                                                {
                                                    const status = getPayAmountStatus(inv, balance);
                                                    const saveColorClass = status.kind === 'over'
                                                        ? '!bg-red-600 hover:!bg-red-700'
                                                        : status.kind === 'exact'
                                                            ? '!bg-green-600 hover:!bg-green-700'
                                                            : status.kind === 'under'
                                                                ? '!bg-yellow-500 hover:!bg-yellow-600 !text-(--nb-color-fg)'
                                                                : '';

                                                    const raw = editingPaid?.[inv?._id];
                                                    const entered = raw === '' || raw == null ? 0 : Number(raw);
                                                    const hasValidAmount = Number.isFinite(entered) && entered > 0;
                                                    const isOverpay = status.kind === 'over';
                                                    const isPrinting = printingId === inv?._id;

                                                    return (
                                                        <div className="flex justify-end gap-2">
                                                            {canSavePerm ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="brand"
                                                                    className={saveColorClass}
                                                                    disabled={!canInputPerm || paymentLocked || !hasValidAmount || isOverpay}
                                                                    onClick={() => handleSavePayment(inv)}
                                                                    title={isOverpay
                                                                        ? t('finance.studentFinance.paymentModal.validation.amountExceedsBalance', { defaultValue: 'Amount exceeds balance' })
                                                                        : t('finance.studentFinance.paymentModal.actions.save', { defaultValue: 'Save' })}
                                                                    icon={<Save size={16} />}
                                                                />
                                                            ) : null}

                                                            {canPrintPerm ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="neutral"
                                                                    disabled={!canPrint || isPrinting}
                                                                    title={isPrinting
                                                                        ? t('finance.printModals.actions.generating', { defaultValue: 'Generating…' })
                                                                        : (!canPrint
                                                                        ? t('finance.studentFinance.paymentModal.errors.cannotPrintNoPayment', { defaultValue: 'Cannot print: no payment recorded' })
                                                                        : t('finance.studentFinance.paymentModal.actions.print', { defaultValue: 'Print' }))}
                                                                    onClick={() => handlePrintRV(inv)}
                                                                    icon={isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                                                                />
                                                            ) : null}
                                                        </div>
                                                    );
                                                }
                                            case 'balance':
                                                return (
                                                    <div className="flex flex-col items-end leading-tight">
                                                        <span className={`font-mono font-bold ${balance <= 0 ? 'text-emerald-700' : 'text-red-700'}`}>${Number(balance || 0).toFixed(2)}</span>
                                                        {isHormaris && balance > 0 ? (
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-red-700">{t('finance.studentFinance.receiptTab.labels.hormaris', { defaultValue: 'Advance' })}</span>
                                                        ) : null}
                                                    </div>
                                                );
                                            default:
                                                return '-';
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-black text-(--nb-color-fg) tracking-widest uppercase">
                                    {t('finance.studentFinance.paymentModal.history.title', { defaultValue: 'Payment History & Receipts' })}
                                </div>
                                <Button
                                    variant="brand"
                                    size="sm"
                                    className="px-4! py-1.5! rounded-lg! text-[10px] font-black uppercase tracking-widest shadow-sm"
                                >
                                    {t('finance.studentFinance.paymentModal.history.actions.printAll', { defaultValue: 'Print All History' })}
                                </Button>
                            </div>

                            <div className="overflow-x-auto border border-(--nb-color-border) rounded-xl">
                                <StandardTable
                                                        disabled={!canInputPerm}
                                    isLoading={loading}
                                    items={history}
                                    rows={history}
                                    columns={[
                                        { key: 'month', label: t('finance.studentFinance.paymentModal.columns.month', { defaultValue: 'Month' }) },
                                        { key: 'description', label: t('finance.studentFinance.paymentModal.columns.description', { defaultValue: 'Description' }) },
                                        { key: 'totalPaid', label: t('finance.studentFinance.paymentModal.history.labels.totalPaid', { defaultValue: 'Total Paid' }), align: 'right' },
                                        { key: 'actions', label: t('finance.studentFinance.paymentModal.columns.actions', { defaultValue: 'Actions' }), noPrint: true, tdClassName: 'px-3 py-2' },
                                    ]}
                                    storageKey="finance:studentFinance:viewInfo:history"
                                    getRowKey={(row, idx) => row?.id || row?._id || row?.month || idx}
                                    emptyTitle={t('finance.studentFinance.paymentModal.empty.noRecords', { defaultValue: 'No records found.' })}
                                    tableProps={{ shellClassName: 'ring-0 shadow-none rounded-none' }}
                                    renderCell={(h, col) => {
                                        const totalPaid = Number(h?.paid || 0) + Number(h?.discount || 0);
                                        switch (col.key) {
                                            case 'month':
                                                return (
                                                    <div className="flex items-center gap-2">
                                                                <span className="font-bold uppercase">{h?.month || '-'}</span>
                                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                                            {t('finance.studentFinance.paymentModal.history.status.cleared', { defaultValue: 'Cleared' })}
                                                        </span>
                                                    </div>
                                                );
                                            case 'description':
                                                return (
                                                    <span className="text-sm font-medium text-(--nb-color-fg)">
                                                        {h?.description || t('finance.studentFinance.paymentModal.history.descFallback', { defaultValue: 'Standard Tuition' })}
                                                    </span>
                                                );
                                            case 'totalPaid':
                                                return <span className="font-mono font-bold text-blue-700">${Number(totalPaid || 0).toFixed(2)}</span>;
                                            case 'actions':
                                                return (
                                                    <RowActionButtons
                                                        actions={[
                                                            canRevertPerm ? {
                                                                key: 'revert',
                                                                label: t('finance.studentFinance.paymentModal.history.actions.revert', { defaultValue: 'Revert' }),
                                                                tone: 'delete',
                                                                showLabel: true,
                                                                icon: null,
                                                                onClick: () => handleRevertHistoryPayments(h),
                                                            } : null,
                                                            canPrintPerm ? {
                                                                key: 'print',
                                                                label: t('finance.studentFinance.paymentModal.actions.print', { defaultValue: 'Print' }),
                                                                tone: 'view',
                                                                showLabel: true,
                                                                icon: null,
                                                                disabled: Number(h?.paid || 0) <= 0 || Boolean(printingId),
                                                                title: printingId
                                                                    ? t('finance.printModals.actions.generating', { defaultValue: 'Generating…' })
                                                                    : (Number(h?.paid || 0) <= 0
                                                                        ? t('finance.studentFinance.paymentModal.errors.cannotPrintNoPayment', { defaultValue: 'Cannot print: no payment recorded' })
                                                                        : t('finance.studentFinance.paymentModal.actions.print', { defaultValue: 'Print' })),
                                                                onClick: () => handlePrintRV({
                                                                    _id: h?._id || h?.id || h?.month,
                                                                    ...h,
                                                                    title: h?.description,
                                                                    paidAmount: h?.paid,
                                                                    amount: h?.amount,
                                                                    discounts: [{ amountOff: h?.discount }],
                                                                }),
                                                            } : null,
                                                        ].filter(Boolean)}
                                                    />
                                                );
                                            default:
                                                                return '-';
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}

// Minimal DollarSign icon as it was missing from imports
const DollarSign = ({ size, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <line x1="12" x2="12" y1="2" y2="22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
);


