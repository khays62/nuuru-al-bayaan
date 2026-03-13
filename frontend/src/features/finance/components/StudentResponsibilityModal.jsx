import React, { useState, useEffect } from 'react';
import { X, DollarSign, Save, Printer, Calendar, Info, History, Layers, CheckCircle, Smartphone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import { useI18n } from '../../../i18n/useI18n';

import { accountKeys } from '../queryKeys';
import { listAccounts as listAccountsApi } from '../api/accountsApi';
import { useFinanceCategoriesQuery } from '../hooks/financeConfigHooks';
import { useInvoicesQuery, usePayChargedMonthMutation } from '../hooks/studentFinanceHooks';

export default function StudentResponsibilityModal({ student, row, onClose, onSuccess }) {
    const { t } = useI18n();
    const [view, setView] = useState('finance'); // finance (ledger), history (responsible history)
    const [accountId, setAccountId] = useState('');
    const [paymentType, setPaymentType] = useState('level'); // level or receipt
    const [feeTypeFilter, setFeeTypeFilter] = useState('all'); // Filter by fee type
    const [processingId, setProcessingId] = useState(null);
    const [editingPaid, setEditingPaid] = useState({});

    const studentId = student?._id;

    const invoicesQuery = useInvoicesQuery(
        { studentId },
        {
            enabled: Boolean(studentId),
            staleTime: 10_000,
            refetchOnMount: 'always',
            refetchOnWindowFocus: false,
        }
    );

    const accountsQuery = useQuery({
        queryKey: accountKeys.list({ includeInactive: false }),
        queryFn: async ({ signal }) => {
            const res = await listAccountsApi({ includeInactive: false }, { signal });
            return Array.isArray(res) ? res : [];
        },
        staleTime: 30_000,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
    });

    const categoriesQuery = useFinanceCategoriesQuery({ type: 'fee', includeInactive: false }, { staleTime: 30_000 });

    const payMutation = usePayChargedMonthMutation();

    useEffect(() => {
        if (!invoicesQuery.isError && !accountsQuery.isError && !categoriesQuery.isError) return;
        toast.error('Failed to sync responsibility records');
         
    }, [invoicesQuery.isError, accountsQuery.isError, categoriesQuery.isError]);

    const invoices = React.useMemo(() => {
        const response = invoicesQuery.data;
        const data = Array.isArray(response)
            ? response
            : (Array.isArray(response?.data) ? response.data : (response?.data?.data || []));
        return Array.isArray(data) ? data : [];
    }, [invoicesQuery.data]);

    const accounts = accountsQuery.data || [];
    const amountTypes = categoriesQuery.data || [];

    const loading = Boolean(invoicesQuery.isLoading || accountsQuery.isLoading || categoriesQuery.isLoading);

    const filteredInvoices = invoices.filter(inv => {
        if (feeTypeFilter === 'all') return true;
        return inv.category?._id === feeTypeFilter;
    });

    const handlePaidChange = (id, val) => {
        setEditingPaid(prev => ({ ...prev, [id]: val }));
    };

    const handleSavePayment = async (inv) => {
        const amount = editingPaid[inv._id];
        if (!amount || Number(amount) <= 0) return toast.error("Enter valid amount");
        if (!accountId) return toast.error("Select target account");

        setProcessingId(inv._id);
        try {
            await payMutation.mutateAsync({
                studentId: student._id,
                month: inv.billingMonth,
                academicYearId: inv.academicYear,
                accountId,
                amount: Number(amount),
                paymentType,
                description: `Payment for ${inv.title || inv.billingMonth}`
            });
            toast.success("Payment Captured");
            setEditingPaid(prev => ({ ...prev, [inv._id]: '' }));
            onSuccess?.();
        } catch (err) {
            toast.error(err.response?.data?.message || "Payment processing failed");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-(--nb-color-bg) w-full max-w-6xl h-[90vh] rounded-[3.5rem] shadow-(--nb-shadow-md) overflow-hidden flex flex-col border border-(--nb-color-border) animate-in zoom-in-95 duration-300">

                {/* Header Branding */}
                <div className="bg-(--nb-color-brand) px-10 py-8 flex justify-between items-center shrink-0 border-b border-white/5">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-blue-600/20 rounded-4xl flex items-center justify-center border border-white/10 backdrop-blur-xl">
                            <Layers className="text-blue-500" size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Student Responsibility</h2>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] flex items-center gap-1.5 border border-white/10 px-2 py-1 rounded-md">
                                    <Smartphone size={10} className="text-blue-500" /> {student?.studentId}
                                </span>
                                <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] flex items-center gap-1.5 border border-white/10 px-2 py-1 rounded-md">
                                    <Info size={10} className="text-blue-500" /> {student?.fullName}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-4 hover:bg-white/10 text-white/30 hover:text-white rounded-4xl transition-all">
                        <X size={32} />
                    </button>
                </div>

                {/* Sub Navigation */}
                <div className="bg-(--nb-color-bg-card) border-b border-(--nb-color-border) px-10 flex justify-between items-center shrink-0">
                    <div className="flex gap-10">
                        <button
                            onClick={() => setView('finance')}
                            className={`py-6 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${view === 'finance' ? 'text-blue-600' : 'text-(--nb-color-muted) hover:text-(--nb-color-fg)'}`}
                        >
                            Finance History
                            {view === 'finance' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
                        </button>
                        <button
                            onClick={() => setView('history')}
                            className={`py-6 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${view === 'history' ? 'text-blue-600' : 'text-(--nb-color-muted) hover:text-(--nb-color-fg)'}`}
                        >
                            Responsible History
                            {view === 'history' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
                        </button>
                    </div>

                    {view === 'finance' && (
                        <div className="flex items-center gap-4">
                            <select
                                className="h-10 px-4 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-600/20"
                                value={feeTypeFilter}
                                onChange={e => setFeeTypeFilter(e.target.value)}
                            >
                                <option value="all">All Fee Types</option>
                                {amountTypes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-hidden flex flex-col p-10 space-y-8">
                    {view === 'finance' ? (
                        <>
                            {/* Controls */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 bg-(--nb-color-bg-card) p-8 rounded-[3rem] border border-(--nb-color-border) shadow-(--nb-shadow-md)">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Target Account</label>
                                    <select
                                        className="w-full h-14 px-6 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-2xl font-black text-(--nb-color-fg) outline-none"
                                        value={accountId}
                                        onChange={e => setAccountId(e.target.value)}
                                    >
                                        <option value="">Select Account...</option>
                                        {accounts.map(acc => <option key={acc._id} value={acc._id}>{acc.name} (${acc.balance.toLocaleString()})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Payment Mode</label>
                                    <div className="flex h-14 p-1.5 bg-(--nb-color-bg) rounded-2xl">
                                        <button
                                            onClick={() => setPaymentType('level')}
                                            className={`flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${paymentType === 'level' ? 'bg-(--nb-color-bg-card) text-blue-600 shadow-(--nb-shadow-sm)' : 'text-(--nb-color-muted)'}`}
                                        >
                                            By Level
                                        </button>
                                        <button
                                            onClick={() => setPaymentType('receipt')}
                                            className={`flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${paymentType === 'receipt' ? 'bg-(--nb-color-bg-card) text-blue-600 shadow-(--nb-shadow-sm)' : 'text-(--nb-color-muted)'}`}
                                        >
                                            By Receipt
                                        </button>
                                    </div>
                                </div>
                                <div className="md:col-span-2 flex items-center justify-end">
                                    <div className="h-20 bg-blue-600/5 p-6 rounded-4xl border-2 border-blue-600/10 flex justify-between items-center w-full max-w-xs">
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Responsibility Due</span>
                                        <span className="text-3xl font-black text-blue-600 tracking-tighter">${Number(row?.totalBalance || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="flex-1 bg-(--nb-color-bg-card) rounded-[3.5rem] border border-(--nb-color-border) shadow-(--nb-shadow-md) overflow-hidden flex flex-col">
                                <div className="overflow-y-auto flex-1 custom-scrollbar">
                                    <StandardTable
                                        isLoading={loading}
                                        loadingMessage="Compiling Records..."
                                        items={filteredInvoices}
                                        rows={filteredInvoices}
                                        columns={[
                                            { key: 'month', label: 'Month' },
                                            { key: 'description', label: 'Description' },
                                            { key: 'dr', label: 'Dr', align: 'right' },
                                            { key: 'cr', label: 'Cr', align: 'right' },
                                            { key: 'paid', label: 'Paid', align: 'center' },
                                            { key: 'actions', label: 'Actions', align: 'center', noPrint: true, tdClassName: 'no-print' },
                                            { key: 'balance', label: 'Balance', align: 'right' },
                                        ]}
                                        getRowKey={(row) => row?._id}
                                        emptyTitle="No records for this selection."
                                        tableProps={{
                                            shellClassName: 'ring-0 shadow-none rounded-none',
                                            theadClassName: 'sticky top-0 z-10 bg-(--nb-color-bg) backdrop-blur-md',
                                            useDefaultHeaderStyles: false,
                                            headerRowClassName: 'border-b border-(--nb-color-border)',
                                            tbodyClassName: 'divide-y divide-(--nb-color-border) font-bold',
                                            renderHeader: () => (
                                                <tr className="border-b border-(--nb-color-border)">
                                                    <th className="py-6 px-8 text-[10px] font-black text-(--nb-color-muted) uppercase tracking-[0.2em]">Month</th>
                                                    <th className="py-6 px-8 text-[10px] font-black text-(--nb-color-muted) uppercase tracking-[0.2em]">Description</th>
                                                    <th className="py-6 px-8 text-[10px] font-black text-(--nb-color-muted) uppercase tracking-[0.2em] text-right">Dr</th>
                                                    <th className="py-6 px-8 text-[10px] font-black text-(--nb-color-muted) uppercase tracking-[0.2em] text-right">Cr</th>
                                                    <th className="py-6 px-8 text-[10px] font-black text-(--nb-color-muted) uppercase tracking-[0.2em] w-40 text-center">Paid</th>
                                                    <th className="py-6 px-8 text-[10px] font-black text-(--nb-color-muted) uppercase tracking-[0.2em] text-center no-print">Actions</th>
                                                    <th className="py-6 px-8 text-[10px] font-black text-(--nb-color-muted) uppercase tracking-[0.2em] text-right">Balance</th>
                                                </tr>
                                            ),
                                            renderBody: ({ rows }) => (
                                                <>
                                                    {(rows || []).map((inv) => {
                                                        const balance = Number(inv?.amount || 0) - Number(inv?.paidAmount || 0);
                                                        const normalizeMonth = (value) => {
                                                            if (!value || typeof value !== 'string') return null;
                                                            const raw = value.trim();
                                                            const m2 = raw.match(/^(\d{4})-(\d{2})$/);
                                                            if (m2) return `${m2[1]}-${m2[2]}`;
                                                            const m1 = raw.match(/^(\d{4})-(\d{1})$/);
                                                            if (m1) return `${m1[1]}-0${m1[2]}`;
                                                            return null;
                                                        };
                                                        const createdMonth = inv?.createdAt ? new Date(inv.createdAt).toISOString().slice(0, 7) : '';
                                                        const billingMonthNorm = normalizeMonth(inv?.billingMonth);
                                                        const isHormaris = typeof inv?.isHormaris === 'boolean'
                                                            ? inv.isHormaris
                                                            : (!!billingMonthNorm && !!createdMonth && billingMonthNorm > createdMonth);

                                                        return (
                                                            <tr key={inv._id} className="hover:bg-(--nb-color-bg) transition-all">
                                                                <td className="py-5 px-8">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="bg-(--nb-color-bg) text-(--nb-color-fg) px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{inv.billingMonth || '—'}</span>
                                                                        {isHormaris ? (
                                                                            <span className="bg-(--nb-color-brand) text-white px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{t('finance.studentFinance.receiptTab.labels.hormaris', { defaultValue: 'Advance' })}</span>
                                                                        ) : null}
                                                                    </div>
                                                                </td>
                                                                <td className="py-5 px-8">
                                                                    <span className="text-sm text-(--nb-color-fg)">{inv.title || 'Tuition Fee'}</span>
                                                                </td>
                                                                <td className="py-5 px-8 text-right tabular-nums text-(--nb-color-fg) font-black">${Number(inv.amount || 0).toFixed(2)}</td>
                                                                <td className="py-5 px-8 text-right tabular-nums text-green-600">${Number(inv.paidAmount || 0).toFixed(2)}</td>
                                                                <td className="py-5 px-8">
                                                                    <input
                                                                        type="number"
                                                                        className="w-full h-11 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-xl text-sm font-black text-(--nb-color-fg) outline-none text-center focus:bg-(--nb-color-bg-card) focus:ring-4 focus:ring-blue-600/10 transition-all"
                                                                        placeholder="0.00"
                                                                        value={editingPaid[inv._id] || ''}
                                                                        onChange={e => handlePaidChange(inv._id, e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="py-5 px-8 no-print">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button
                                                                            onClick={() => handleSavePayment(inv)}
                                                                            disabled={processingId === inv._id || Number(inv.paidAmount || 0) >= Number(inv.amount || 0)}
                                                                            className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:opacity-90 shadow-lg disabled:opacity-20"
                                                                        >
                                                                            <Save size={16} />
                                                                        </button>
                                                                        <button className="w-10 h-10 bg-(--nb-color-brand) text-white rounded-xl flex items-center justify-center hover:opacity-95 shadow-lg">
                                                                            <Printer size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                                <td className="py-5 px-8 text-right tabular-nums">
                                                                    <div className="flex flex-col items-end leading-tight">
                                                                        <span className="text-red-500">${Number(balance || 0).toFixed(2)}</span>
                                                                        {isHormaris && balance > 0 ? (
                                                                            <span className="text-[9px] font-black uppercase tracking-widest text-red-600">{t('finance.studentFinance.receiptTab.labels.hormaris', { defaultValue: 'Advance' })}</span>
                                                                        ) : null}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </>
                                            ),
                                        }}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 bg-(--nb-color-bg-card) rounded-[3.5rem] border border-(--nb-color-border) shadow-(--nb-shadow-md) flex items-center justify-center">
                            <div className="text-center space-y-4">
                                <History className="w-20 h-20 text-(--nb-color-border) mx-auto" />
                                <h4 className="text-xl font-black text-(--nb-color-fg) uppercase tracking-tighter">History Under Reconstruction</h4>
                                <p className="text-(--nb-color-muted) text-sm max-w-xs mx-auto">This module is currently being optimized for faster record retrieval.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
