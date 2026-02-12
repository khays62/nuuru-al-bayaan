import React, { useState, useEffect } from 'react';
import financeService from '../api/finance';
import { X, RefreshCcw, Percent, DollarSign, Calendar, Hash, ShieldCheck, AlertCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    useUpdateChargeAmountMutation,
    useApplyMonthlyDiscountMutation,
    useApplyOverallDiscountMutation,
    useDeleteMonthlyChargesMutation,
} from '../hooks/studentFinanceHooks';

export default function UpdateChargeModal({ onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Type Selection, 2: Form, 3: Success/Summary
    const [updateType, setUpdateType] = useState('correction'); // correction, monthly_discount, overall_discount, undo_charge

    const [useMultipleMonths, setUseMultipleMonths] = useState(false);
    const [selectedMonths, setSelectedMonths] = useState(() => new Set());

    // Config Data
    const [amountTypes, setAmountTypes] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        studentId: '',
        amountTypeId: '',
        month: new Date().toISOString().slice(0, 7), // YYYY-MM
        amount: '',
        discountValue: '',
        discountType: 'fixed',
        reason: ''
    });

    const months = [
        { label: 'January', val: '01' }, { label: 'February', val: '02' }, { label: 'March', val: '03' },
        { label: 'April', val: '04' }, { label: 'May', val: '05' }, { label: 'June', val: '06' },
        { label: 'July', val: '07' }, { label: 'August', val: '08' }, { label: 'September', val: '09' },
        { label: 'October', val: '10' }, { label: 'November', val: '11' }, { label: 'December', val: '12' }
    ];

    const currentYear = String(formData.month || '').slice(0, 4);
    const toYm = (mm) => `${currentYear}-${mm}`;
    const toggleSelectedMonth = (ym) => {
        setSelectedMonths(prev => {
            const next = new Set(prev);
            if (next.has(ym)) next.delete(ym);
            else next.add(ym);
            return next;
        });
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const catsRes = await financeService.getFinanceCategories('fee');
                const rawCats = Array.isArray(catsRes?.data) ? catsRes.data : (Array.isArray(catsRes) ? catsRes : []);
                const cats = rawCats.filter(c => c.type === 'fee' && c.status !== 'inactive');
                setAmountTypes(cats);
            } catch {
                toast.error("Failed to load configuration data");
            }
        };
        loadData();
    }, []);

    const correctionMutation = useUpdateChargeAmountMutation();
    const monthlyDiscountMutation = useApplyMonthlyDiscountMutation();
    const overallDiscountMutation = useApplyOverallDiscountMutation();
    const undoChargesMutation = useDeleteMonthlyChargesMutation();

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        const sId = formData.studentId.trim();
        if (!sId) return toast.error("Please enter a valid Student ID");

        if (updateType !== 'overall_discount' && (!formData.amountTypeId || !formData.month)) {
            return toast.error("Fee Category and Month are required");
        }

        if (updateType !== 'overall_discount' && useMultipleMonths && selectedMonths.size === 0) {
            return toast.error('Select at least one billing month');
        }

        if (updateType === 'correction' && !formData.amount) {
            return toast.error("Please enter an amount");
        }

        if ((updateType === 'monthly_discount' || updateType === 'overall_discount') && !formData.discountValue) {
            return toast.error("Please enter a discount value");
        }

        if (!formData.reason || formData.reason.trim().length < 5) {
            return toast.error("Please provide a meaningful reason for the audit log (min 5 chars)");
        }

        setLoading(true);
        try {
            let res;
            const payload = {
                studentId: sId,
                reason: formData.reason.trim()
            };

            if (updateType === 'correction') {
                res = await correctionMutation.mutateAsync({
                    ...payload,
                    categoryId: formData.amountTypeId,
                    amount: Number(formData.amount),
                    ...(useMultipleMonths ? { months: Array.from(selectedMonths) } : { month: formData.month })
                });
            } else if (updateType === 'monthly_discount') {
                res = await monthlyDiscountMutation.mutateAsync({
                    ...payload,
                    categoryId: formData.amountTypeId,
                    ...(useMultipleMonths ? { months: Array.from(selectedMonths) } : { month: formData.month }),
                    discountAmount: Number(formData.discountValue)
                });
            } else if (updateType === 'undo_charge') {
                if (!window.confirm('This will cancel unpaid charges for the selected month(s). Continue?')) return;
                res = await undoChargesMutation.mutateAsync({
                    scope: 'single',
                    studentId: sId,
                    amountTypeId: formData.amountTypeId,
                    ...(useMultipleMonths ? { months: Array.from(selectedMonths) } : { month: formData.month }),
                    reason: formData.reason.trim(),
                });
            } else if (updateType === 'overall_discount') {
                res = await overallDiscountMutation.mutateAsync({
                    ...payload,
                    discountType: formData.discountType,
                    discountValue: Number(formData.discountValue)
                });
            }

            if (updateType === 'undo_charge') {
                const cancelledCount = Number(res?.cancelledCount || 0);
                if (cancelledCount > 0) toast.success(`Charges cancelled successfully (${cancelledCount})`);
                else toast.error('No matching unpaid charges found to cancel');
            } else {
                toast.success("Update successful and audit log created");
            }
            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || "Operation failed");
        } finally {
            setLoading(false);
        }
    };

    const workflowTypes = [
        { id: 'correction', title: 'Update Charge Amount', desc: 'Correct human error in fee amount', icon: DollarSign, color: 'blue' },
        { id: 'monthly_discount', title: 'Apply Monthly Discount', desc: 'One-time scholarship for a specific month', icon: Percent, color: 'amber' },
        { id: 'undo_charge', title: 'Undo Charges', desc: 'Cancel unpaid charges for selected month(s)', icon: Trash2, color: 'red' },
        { id: 'overall_discount', title: 'Apply Overall Discount', desc: 'Permanent scholarship for all future charges', icon: ShieldCheck, color: 'green' }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Finance Update Workflow</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                                ERP Audit-Tracked Correction System
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-300 hover:text-slate-900 transition-colors p-2 hover:bg-slate-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {step === 1 ? (
                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 mb-6">
                                <AlertCircle className="text-blue-600 shrink-0" size={20} />
                                <p className="text-xs font-medium text-blue-800 leading-relaxed">
                                    Every update made here is recorded in the permanent audit logs with before/after values.
                                    Balance recalculations happen automatically.
                                </p>
                            </div>

                            <div className="grid gap-3">
                                {workflowTypes.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => { setUpdateType(t.id); setStep(2); }}
                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${updateType === t.id ? 'border-amber-500 bg-amber-50/50' : 'border-slate-100 hover:border-slate-300 bg-white'
                                            }`}
                                    >
                                        <div className={`p-3 rounded-xl bg-${t.color}-100 text-${t.color}-700`}>
                                            <t.icon size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">{t.title}</h4>
                                            <p className="text-[11px] font-medium text-slate-500">{t.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            {/* Form Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student ID</label>
                                    <input
                                        type="text"
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                        placeholder="Ex: DU1S1A62"
                                        value={formData.studentId}
                                        onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                                    />
                                </div>
                                {updateType !== 'overall_discount' && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fee Category</label>
                                        <select
                                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none"
                                            value={formData.amountTypeId}
                                            onChange={e => setFormData({ ...formData, amountTypeId: e.target.value })}
                                        >
                                            <option value="">Choose Fee...</option>
                                            {amountTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                {updateType === 'overall_discount' && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Discount Type</label>
                                        <select
                                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none"
                                            value={formData.discountType}
                                            onChange={e => setFormData({ ...formData, discountType: e.target.value })}
                                        >
                                            <option value="fixed">Fixed Amount ($)</option>
                                            <option value="percentage">Percentage (%)</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {updateType !== 'overall_discount' && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Billing Month</label>
                                        <div className="space-y-2">
                                            <input
                                                type="month"
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none"
                                                value={formData.month}
                                                disabled={useMultipleMonths}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setFormData({ ...formData, month: val });
                                                    if (useMultipleMonths) {
                                                        setSelectedMonths(new Set([val]));
                                                    }
                                                }}
                                            />

                                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 select-none">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4"
                                                    checked={useMultipleMonths}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setUseMultipleMonths(checked);
                                                        if (!checked) {
                                                            setSelectedMonths(new Set());
                                                        } else {
                                                            setSelectedMonths(new Set([formData.month]));
                                                        }
                                                    }}
                                                />
                                                Multiple months
                                            </label>

                                            {useMultipleMonths && /^\d{4}$/.test(currentYear) && (
                                                <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                                                    {months.map(m => {
                                                        const ym = toYm(m.val);
                                                        const active = selectedMonths.has(ym);
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={m.val}
                                                                onClick={() => toggleSelectedMonth(ym)}
                                                                className={`px-2 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                                            >
                                                                {m.label.slice(0, 3)}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        {updateType === 'correction' ? 'New Correct Amount ($)' : (updateType === 'undo_charge' ? ' ' : 'Discount Value')}
                                    </label>
                                    {updateType === 'undo_charge' ? (
                                        <div className="w-full h-11" />
                                    ) : (
                                        <input
                                            type="number"
                                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none"
                                            placeholder="0.00"
                                            value={updateType === 'correction' ? formData.amount : formData.discountValue}
                                            onChange={e => setFormData({ ...formData, [updateType === 'correction' ? 'amount' : 'discountValue']: e.target.value })}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for Adjustment</label>
                                <textarea
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm outline-none focus:ring-4 focus:ring-blue-600/10 transition-all min-h-20"
                                    placeholder="Explain why this adjustment is being made (Audit Required)"
                                    value={formData.reason}
                                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <button
                        onClick={step === 1 ? onClose : () => setStep(1)}
                        className="text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-900 transition-colors"
                    >
                        {step === 1 ? 'Cancel Operation' : 'Back to Selection'}
                    </button>

                    {step === 2 && (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !formData.reason}
                            className="bg-amber-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Processing Audit...' : 'Execute Adjustment'}
                            {!loading && <RefreshCcw size={14} />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
