import React, { useState, useEffect } from 'react';
import { X, Save, Info, Printer, Wallet, Users, Search, History, Calendar, Check, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../auth/AuthContext';
import headerImg from '../../../assets/nuuruBayaanHeader.png';
import { useQuery } from '@tanstack/react-query';
import { listAccounts } from '../api/accountsApi';
import { accountKeys } from '../queryKeys';
import {
    useInvoicesQuery,
    useStudentMonthHistoryQuery,
    usePayChargedMonthMutation,
    usePaySelectedMonthsMutation,
    useRevertPaymentGroupMutation,
} from '../hooks/studentFinanceHooks';
import { getInvoices } from '../api/studentFinanceApi';

export default function StudentFinancePaymentModal({ row, onClose, onPaid }) {
    const { auth } = useAuth();
    // Note: role checks handled server-side; keep auth available for future UI rules
    void auth;

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

    const student = row?.student;

    const accountsQuery = useQuery({
        queryKey: accountKeys.list({ includeInactive: false }),
        queryFn: ({ signal }) => listAccounts({ includeInactive: false }, { signal }),
        staleTime: 30 * 1000,
    });

    const invoicesQuery = useInvoicesQuery(
        { studentId: student?._id, limit: 200 },
        { enabled: !!student?._id }
    );

    const historyQuery = useStudentMonthHistoryQuery(
        { studentId: student?._id },
        { enabled: !!student?._id }
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
            const groups = Array.isArray(h?.paymentGroups) ? h.paymentGroups : [];
            if (!groups.length) return toast.error('No payment groups found to revert');

            if (!window.confirm('This will REVERT payments for this month. Continue?')) return;

            toast.loading('Reverting payments...');
            for (const g of groups) {
                const id = g?.paymentGroupId;
                if (!id) continue;
                await revertPaymentGroupMutation.mutateAsync({ paymentGroupId: id, reason: 'Admin revert for charge deletion' });
            }

            // Refresh invoices + history
            await Promise.all([invoicesQuery.refetch(), historyQuery.refetch()]);

            toast.dismiss();
            toast.success('Payments reverted');
            onPaid?.();
        } catch (err) {
            toast.dismiss();
            toast.error(err.response?.data?.message || 'Failed to revert payments');
        }
    };

    useEffect(() => {
        setLoading(Boolean(accountsQuery.isFetching || invoicesQuery.isFetching || historyQuery.isFetching));
    }, [accountsQuery.isFetching, invoicesQuery.isFetching, historyQuery.isFetching]);

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
        setEditingReference(prev => ({ ...prev, [id]: val }));
    };

    const handleSavePayment = async (inv) => {
        const paidAmount = Number(editingPaid[inv._id]);
        if (!accountId) return toast.error("Please select an account");
        if (!paidAmount || paidAmount <= 0) return toast.error("Enter a valid amount");

        const referenceRaw = String(editingReference?.[inv._id] ?? '').trim();
        if (!referenceRaw) return toast.error('Phone/Ref is required');

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

            toast.success("Payment recorded");
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
            toast.error(err.response?.data?.message || "Payment failed");
        } finally {
            setProcessingId(null);
        }
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
                const billingMonthLabel = `${inv.billingMonth || '—'}${isHormaris ? ' (Hormaris)' : ''}`;

                const paidInThisGroup = Number(txByInvoice.get(String(inv._id)) || 0);

                return `
                    <tr>
                        <td>${inv.title || 'Monthly fee'}</td>
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
            <html>
                <head>
                    <title>SYD ERP Receipt - ${meta.student.fullName}</title>
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
                <body onload="window.print()">
                    <div class="voucher-card">
                        <div class="header-main">
                            <img src="${meta.headerImg || ''}" class="header-logo" />
                        </div>

                        <div class="top-meta">
                            <div>Date: ${dateNow}</div>
                            <div>${meta.academicYear || ''}</div>
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
                                    <td>${meta.student.fullName}</td>
                                </tr>
                                <tr>
                                    <td>Shift</td>
                                    <td>${shiftLabel}</td>
                                </tr>
                                <tr>
                                    <td>Description</td>
                                    <td>Hormaris payment (${invList.length} month${invList.length === 1 ? '' : 's'}) &nbsp;&nbsp; <span class="cell-muted">Paid:</span> ${fmtMoney(totalPaid)}</td>
                                </tr>
                            </tbody>
                        </table>

                        <table class="items">
                            <thead>
                                <tr>
                                    <th style="text-align:left">Description</th>
                                    <th style="text-align:left">Month</th>
                                    ${showDiscount ? '<th style="text-align:right">Discount</th>' : ''}
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
                </body>
            </html>
        `;
    };

    const handlePaySelectedHormaris = async () => {
        if (!selectedHormarisMonths.length) return toast.error('Select Hormaris months');
        if (!accountId) return toast.error('Select account');
        const reference = String(hormarisReference || '').trim();
        if (!reference) return toast.error('Phone/Ref is required');
        try {
            toast.loading('Processing Hormaris payment...');
            const months = [...selectedHormarisMonths].sort();

            const totalsByMonth = new Map((hormarisMonthOptions || []).map(o => [o.month, Number(o.total || 0)]));
            const allocations = months.map((m) => {
                const raw = (selectedHormarisAmounts?.[m] ?? '').trim();
                if (!raw) return { month: m, amount: null }; // FULL
                const amt = Number(raw);
                if (!Number.isFinite(amt) || amt <= 0) throw new Error(`Invalid amount for ${m}`);
                const cap = totalsByMonth.get(m);
                if (typeof cap === 'number' && cap > 0 && amt > cap) throw new Error(`Amount exceeds balance for ${m}`);
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
                description: `Hormaris payment for ${months.join(', ')}`,
            });

            const [invRefetch, histRefetch] = await Promise.all([invoicesQuery.refetch(), historyQuery.refetch()]);
            const updatedInvoices = Array.isArray(invRefetch.data)
                ? invRefetch.data
                : (Array.isArray(invRefetch.data?.data) ? invRefetch.data.data : (invRefetch.data?.data || []));

            // Print only invoices that match selected months
            const invoicesToPrint = updatedInvoices.filter(i => months.includes(normalizeMonth(i.billingMonth) || ''));
            const headerBase64 = headerImg ? await getBase64Image(headerImg) : '';

            const txByInvoice = new Map();
            const txs = Array.isArray(payRes?.transactions) ? payRes.transactions : [];
            for (const t of txs) {
                const invId = t?.invoice;
                if (!invId) continue;
                txByInvoice.set(String(invId), (txByInvoice.get(String(invId)) || 0) + Number(t.amount || 0));
            }

            const win = window.open('', '_blank');
            if (win) {
                const html = renderMultiRV(invoicesToPrint, {
                    headerImg: headerBase64,
                    account: accounts.find(a => a._id === accountId)?.name || 'CASH',
                    student,
                    academicYear: row?.academicYear?.yearName || '2024-2025',
                    paymentType,
                    paymentGroupId: payRes?.paymentGroupId || payRes?.print?.paymentGroupId || null,
                    txByInvoice,
                });
                win.document.write(html);
                win.document.close();
            }

            setSelectedHormarisMonths([]);
            setSelectedHormarisAmounts({});
            setHormarisReference('');
            toast.dismiss();
            toast.success('Hormaris payment recorded');
            onPaid?.();
        } catch (err) {
            toast.dismiss();
            const msg = err?.response?.data?.message || err?.message || 'Hormaris payment failed';
            toast.error(msg);
        }
    };

    const handlePrintRV = async (row) => {
        try {
            toast.loading("Preparing statement...");
            const headerBase64 = headerImg ? await getBase64Image(headerImg) : '';
            const invRes = await getInvoices({ _id: row._id });
            const invList = Array.isArray(invRes)
                ? invRes
                : (Array.isArray(invRes?.data) ? invRes.data : (invRes?.data?.data || []));
            const inv = invList[0];

            const isFree = !!inv?.isWaived || !!inv?.student?.isFree || !!student?.isFree;
            const hasPayment = Number(inv?.paidAmount || 0) > 0;
            if (!isFree && !hasPayment) {
                toast.dismiss();
                return toast.error('Cannot print: no payment recorded');
            }

            // Get all other unpaid invoices for the statement of arrears
            // Use stored invoice.balance (already accounts for discounts + payments).
            const unpaid = (invoices || []).filter(i => (
                i?._id !== row._id &&
                i?.status !== 'Cancelled' &&
                Number(i?.balance || 0) > 0
            ));

            const win = window.open('', '_blank');
            const html = renderRV(inv, {
                headerImg: headerBase64,
                account: (() => {
                    const acc = accounts.find(a => a._id === accountId);
                    if (!acc) return 'CASH';
                    return acc.accountNumber ? `${acc.accountNumber} - ${acc.name}` : (acc.name || 'CASH');
                })(),
                student: student,
                academicYear: row?.academicYear?.yearName || '2024-2025',
                paymentType,
                unpaid
            });

            win.document.write(html);
            win.document.close();
            toast.dismiss();
        } catch {
            toast.error("Print failed");
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
        const billingMonthLabel = `${inv.billingMonth || '—'}${isHormaris ? ' (Hormaris)' : ''}`;

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
        const description = inv.title || 'Monthly fee';
        const isMongoObjectIdString = (value) => typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
        const rawShift = inv.class?.shift ?? inv.shift ?? meta.student.shift ?? meta.student.currentShift;
        const shiftLabel =
            (typeof rawShift === 'string'
                ? (isMongoObjectIdString(rawShift) ? '' : rawShift)
                : (rawShift?.name || rawShift?.shiftName || rawShift?.label)) ||
            '—';

        const paidSpan = isFree ? '' : `<span class="money">Paid $${Number(displayPaid || 0).toFixed(2)}</span>`;

        return `
            <html>
                <head>
                    <title>SYD ERP Receipt - ${meta.student.fullName}</title>
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
                <body onload="window.print()">
                    <div class="voucher-card">
                        <div class="header-main">
                            <img src="${meta.headerImg || ''}" class="header-logo" />
                        </div>

                        <div class="top-meta">
                            <div>Date: ${dateNow}</div>
                            <div>${meta.academicYear || ''}</div>
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
                                    <td>${meta.student.fullName}</td>
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
                                            ${paidSpan}
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td><span class="cell-muted">Month:</span> ${billingMonthLabel}</td>
                                    <td>
                                        <div class="cell-flex">
                                            <span><span class="cell-muted">Balance:</span> $${Number(currentBalance || 0).toFixed(2)}</span>
                                            ${isLevelMode
                ? `<span class="cell-muted">(Fee $${Number(grossFee || 0).toFixed(2)})</span>`
                : `<span class="cell-muted">(Fee $${Number(grossFee || 0).toFixed(2)}, Discount $${Number(totalDiscount || 0).toFixed(2)})</span>`
            }
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        ${unpaidMonthsList ? `<p class="voucher-note" style="color:#ef4444; font-size:12px; margin-bottom: 10px;">Arrears: ${unpaidMonthsList}</p>` : ''}
                        <p class="voucher-note">* Note: This receipt represents the level-agreed amount.</p>
                    </div>
                </body>
            </html>
        `;
    };

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-6xl h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">

                {/* Header Section */}
                <div className="flex justify-between items-center p-6 bg-slate-900 text-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600/20 p-3 rounded-xl border border-white/10">
                            <Wallet className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-black uppercase tracking-tight">Student Finance</h2>
                                <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                                    <button
                                        onClick={() => setView('ledger')}
                                        className={`px-4 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${view === 'ledger' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        Ledger
                                    </button>
                                    <button
                                        onClick={() => setView('history')}
                                        className={`px-4 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${view === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        History
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-slate-400 font-bold text-sm">
                                <span>{student?.fullName}</span>
                                <span className="text-slate-700">|</span>
                                <span className="font-mono text-blue-600 text-xs uppercase tracking-wider">{student?.studentId}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col p-10 space-y-8">

                    {view === 'ledger' ? (
                        <>
                            {/* Controls Bar */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <Info size={10} /> Select Ledger Account
                                    </label>
                                    <select
                                        className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600/20 transition-all appearance-none"
                                        value={accountId}
                                        onChange={e => setAccountId(e.target.value)}
                                    >
                                        <option value="">-- Choose Account --</option>
                                        {accounts.map(acc => (
                                            <option key={acc._id} value={acc._id}>
                                                {acc.accountNumber ? `${acc.accountNumber} - ${acc.name}` : acc.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Mode</label>
                                    <div className="h-10 bg-slate-50 p-1 rounded-lg flex gap-1 border border-slate-200">
                                        <button
                                            onClick={() => setPaymentType('level')}
                                            className={`flex-1 rounded-md text-[9px] font-black uppercase tracking-tighter transition-all ${paymentType === 'level' ? 'bg-white text-slate-900 shadow-sm border border-slate-100 font-black' : 'text-slate-400'}`}
                                        >
                                            By Level
                                        </button>
                                        <button
                                            onClick={() => setPaymentType('receipt')}
                                            className={`flex-1 rounded-md text-[9px] font-black uppercase tracking-tighter transition-all ${paymentType === 'receipt' ? 'bg-white text-slate-900 shadow-sm border border-slate-100 font-black' : 'text-slate-400'}`}
                                        >
                                            By Receipt
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Date</label>
                                    <input
                                        type="date"
                                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs text-slate-900 outline-none"
                                        value={paymentDate}
                                        onChange={e => setPaymentDate(e.target.value)}
                                    />
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Total</span>
                                        <span className="text-2xl font-black text-blue-600 leading-none tabular-nums">${Number(totalArrears || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="bg-blue-100 p-2.5 rounded-lg border border-blue-100">
                                        <CreditCard className="w-5 h-5 text-blue-600" />
                                    </div>
                                </div>
                            </div>

                            {/* Hormaris Multi-Month Selection */}
                            {hormarisMonthOptions.length > 0 ? (
                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0 flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select Hormaris Months</div>
                                        <button
                                            onClick={handlePaySelectedHormaris}
                                            disabled={selectedHormarisMonths.length === 0 || !accountId}
                                            className="h-8 px-4 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-30"
                                        >
                                            Pay Selected
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Phone/Ref"
                                        value={hormarisReference}
                                        onChange={(e) => setHormarisReference(e.target.value)}
                                        className="h-8 w-full px-3 bg-slate-50 border border-slate-200 rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-900 outline-none"
                                    />

                                    <div className="flex flex-wrap gap-2">
                                        {hormarisMonthOptions.map((o) => {
                                            const checked = selectedHormarisMonths.includes(o.month);
                                            return (
                                                <div key={o.month} className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleHormarisMonth(o.month)}
                                                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest ${checked ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                                                        title={`Balance: $${Number(o.total || 0).toFixed(2)}`}
                                                    >
                                                        {o.month}
                                                    </button>
                                                    {checked ? (
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            placeholder="FULL"
                                                            value={selectedHormarisAmounts?.[o.month] ?? ''}
                                                            onChange={(e) => handleHormarisAmountChange(o.month, e.target.value)}
                                                            className="h-8 w-24 px-3 bg-slate-50 border border-slate-200 rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-900 outline-none"
                                                        />
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null}

                            {/* Table Section */}
                            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
                                <div className="overflow-auto flex-1 custom-scrollbar">
                                    <table className="w-full min-w-300 text-left border-collapse">
                                        <thead className="sticky top-0 z-10 bg-slate-50">
                                            <tr className="border-b border-slate-200">
                                                <th className="py-3 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">No</th>
                                                <th className="py-3 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Month</th>
                                                <th className="py-3 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Phone/Ref</th>
                                                <th className="py-3 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                                <th className="py-3 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Dr (Fees)</th>
                                                <th className="py-3 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Cr (Paid)</th>
                                                {paymentType === 'receipt' ? (
                                                    <th className="py-3 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Discount</th>
                                                ) : null}
                                                <th className="py-3 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest w-32 text-center">Pay Amount</th>
                                                <th className="py-3 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                                                <th className="py-3 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {loading ? (
                                                <tr><td colSpan={10} className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest">Analysing...</td></tr>
                                            ) : invoices.length === 0 ? (
                                                <tr><td colSpan={10} className="py-12 text-center text-slate-300 font-medium">No records found.</td></tr>
                                            ) : (
                                                invoices.map((inv, idx) => {
                                                    const totalDiscount = inv.discounts?.reduce((s, d) => s + (d.amountOff || 0), 0) || 0;
                                                    const grossFee = Number(inv.amount || 0) + totalDiscount;
                                                    const displayPaid = Number(inv.paidAmount || 0) + totalDiscount;
                                                    const balance = grossFee - displayPaid;
                                                    const isFreeForPrint = !!inv.isWaived || !!student?.isFree;
                                                    const canPrint = isFreeForPrint || Number(inv.paidAmount || 0) > 0;
                                                    const createdMonth = inv.createdAt ? new Date(inv.createdAt).toISOString().slice(0, 7) : '';
                                                    const billingMonthNorm = normalizeMonth(inv.billingMonth);
                                                    const isHormaris = typeof inv?.isHormaris === 'boolean'
                                                        ? inv.isHormaris
                                                        : (!!billingMonthNorm && !!createdMonth && billingMonthNorm > createdMonth);
                                                    const currentInput = Number(editingPaid[inv._id] || 0);
                                                    const paymentLocked = processingId === inv._id || inv.paidAmount >= inv.amount;

                                                    // Status Color Logic
                                                    let statusColor = "bg-blue-600";
                                                    if (currentInput > 0) {
                                                        if (currentInput >= balance) statusColor = "bg-green-600";
                                                        else statusColor = "bg-orange-500";
                                                    }

                                                    return (
                                                        <tr key={inv._id} className={`group hover:bg-slate-50/50 transition-all ${isHormaris ? 'text-red-600 bg-red-50/30' : ''}`}>
                                                            <td className="py-3 px-6 text-[10px] text-slate-400 font-mono">{(idx + 1).toString().padStart(2, '0')}</td>
                                                            <td className="py-3 px-6">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="bg-slate-100 text-slate-900 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">{inv.billingMonth || '—'}</span>
                                                                    {isHormaris ? (
                                                                        <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">Hormaris</span>
                                                                    ) : null}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-6 text-[10px] font-mono text-slate-500">
                                                                <input
                                                                    type="text"
                                                                    className="w-full h-8 px-3 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                                                                    placeholder={student?.phoneNumber ? `Default: ${student.phoneNumber}` : 'Phone/Ref'}
                                                                    value={editingReference?.[inv._id] ?? ''}
                                                                    onChange={e => handleReferenceChange(inv._id, e.target.value)}
                                                                    disabled={paymentLocked}
                                                                />
                                                            </td>
                                                            <td className="py-3 px-6">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-bold text-slate-900">{inv.title || 'Tuition Fee'}</span>
                                                                    <span className="text-[9px] text-slate-400 font-mono tracking-tighter uppercase">ID: {inv._id.slice(-6).toUpperCase()}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-6 text-right tabular-nums text-xs font-bold text-slate-900">${Number(grossFee).toFixed(2)}</td>
                                                            <td className="py-3 px-6 text-right tabular-nums text-xs font-bold text-green-600">${Number(inv.paidAmount || 0).toFixed(2)}</td>
                                                            {paymentType === 'receipt' ? (
                                                                <td className="py-3 px-6 text-right tabular-nums text-xs font-bold text-blue-600">${totalDiscount.toFixed(2)}</td>
                                                            ) : null}
                                                            <td className="py-3 px-6">
                                                                <div className="relative">
                                                                    <DollarSign className="absolute left-2.5 top-2.5 text-slate-400" size={12} />
                                                                    <input
                                                                        type="number"
                                                                        className="w-full h-8 pl-6 pr-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all text-center"
                                                                        placeholder="0.00"
                                                                        value={editingPaid[inv._id] || ''}
                                                                        onChange={e => handlePaidChange(inv._id, e.target.value)}
                                                                        disabled={paymentLocked}
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-6">
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    <button
                                                                        onClick={() => handleSavePayment(inv)}
                                                                        disabled={paymentLocked}
                                                                        className={`w-8 h-8 ${statusColor} text-white rounded-lg flex items-center justify-center hover:opacity-90 transition-all shadow-sm disabled:opacity-20`}
                                                                    >
                                                                        <Save size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handlePrintRV(inv)}
                                                                        disabled={!canPrint}
                                                                        title={!canPrint ? 'Cannot print: no payment recorded' : 'Print'}
                                                                        className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:bg-black transition-all shadow-sm disabled:opacity-20 disabled:hover:bg-slate-900"
                                                                    >
                                                                        <Printer size={14} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-6 text-right tabular-nums">
                                                                <div className="flex flex-col items-end leading-tight">
                                                                    <span className={`text-xs font-black ${balance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                        ${balance.toFixed(2)}
                                                                    </span>
                                                                    {isHormaris && balance > 0 ? (
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-red-600">Hormaris</span>
                                                                    ) : null}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-sm font-black text-slate-900 tracking-widest uppercase">Payment History & Receipts</h3>
                                <button className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">Print All History</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                <div className="grid grid-cols-1 gap-4">
                                    {history.length === 0 ? (
                                        <div className="p-12 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">No records found.</div>
                                    ) : (
                                        history.map((h) => (
                                            <div key={h.id} className="bg-white border border-slate-100 p-4 rounded-xl flex items-center justify-between group hover:border-blue-500/30 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-slate-50 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 border border-slate-100">
                                                        <History size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{h.month}</h4>
                                                            <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-[8px] font-black uppercase tracking-widest border border-green-100">Cleared</span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">{h.description || 'Standard Tuition'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Paid</p>
                                                        <p className="text-lg font-black text-blue-600 tracking-tighter tabular-nums">${(Number(h.paid || 0) + Number(h.discount || 0)).toFixed(2)}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRevertHistoryPayments(h)}
                                                        className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                                                    >
                                                        Revert
                                                    </button>
                                                    <button
                                                        onClick={() => handlePrintRV({ ...h, title: h.description, paidAmount: h.paid, amount: h.amount, discounts: [{ amountOff: h.discount }] })}
                                                        disabled={Number(h.paid || 0) <= 0}
                                                        title={Number(h.paid || 0) <= 0 ? 'Cannot print: no payment recorded' : 'Print'}
                                                        className="w-14 h-14 bg-white border-2 border-slate-100 rounded-3xl flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all shadow-lg active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-900 disabled:hover:border-slate-100"
                                                    >
                                                        <Printer size={24} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
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


