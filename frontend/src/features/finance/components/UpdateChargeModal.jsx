import React, { useState, useEffect } from 'react';
import financeService from '../api/finance';
import { RefreshCcw, Percent, DollarSign, Calendar, Hash, ShieldCheck, AlertCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    useUpdateChargeAmountMutation,
    useApplyMonthlyDiscountMutation,
    useApplyOverallDiscountMutation,
    useDeleteMonthlyChargesMutation,
} from '../hooks/studentFinanceHooks';

import Input from '../../../shared/components/ui/Input.jsx';
import Textarea from '../../../shared/components/ui/Textarea.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';

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

    const amountTypeOptions = amountTypes.map((t) => ({ value: t._id, label: t.name }));
    const discountTypeOptions = [
        { value: 'fixed', label: 'Fixed Amount ($)' },
        { value: 'percentage', label: 'Percentage (%)' },
    ];

    return (
        <Modal isOpen onClose={onClose} closeOnBackdrop={false} title="Finance Update Workflow">
            <div className="space-y-6">
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
                                <Button
                                    key={t.id}
                                    onClick={() => { setUpdateType(t.id); setStep(2); }}
                                    variant="neutral"
                                    size="md"
                                    className={`w-full whitespace-normal justify-start flex items-center gap-4 p-4 rounded-xl border-2 shadow-none transition-all text-left ${updateType === t.id ? 'border-amber-500! bg-amber-50/50!' : 'border-(--nb-color-border)! hover:border-(--nb-color-focus)! bg-(--nb-color-bg-card)!'} `}
                                >
                                    <div className={`p-3 rounded-xl bg-${t.color}-100 text-${t.color}-700`}>
                                        <t.icon size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-(--nb-color-fg) text-sm uppercase tracking-tight">{t.title}</h4>
                                        <p className="text-[11px] font-medium text-(--nb-color-muted)">{t.desc}</p>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                        {/* Form Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Student ID</label>
                                <Input
                                    type="text"
                                    className="h-11 font-bold text-sm"
                                    placeholder="Ex: DU1S1A62"
                                    value={formData.studentId}
                                    onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                                />
                            </div>
                            {updateType !== 'overall_discount' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Fee Category</label>
                                    <SearchableSelect
                                        value={formData.amountTypeId}
                                        onChange={(v) => setFormData({ ...formData, amountTypeId: v })}
                                        options={amountTypeOptions}
                                        placeholder="Choose Fee..."
                                        searchPlaceholder="Search fee categories…"
                                        maxVisible={6}
                                        className="h-11 font-bold text-sm"
                                    />
                                </div>
                            )}
                            {updateType === 'overall_discount' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Discount Type</label>
                                    <DropdownSelect
                                        value={formData.discountType}
                                        onChange={(v) => setFormData({ ...formData, discountType: v })}
                                        options={discountTypeOptions}
                                        clearable={false}
                                        className="h-11 font-bold text-sm"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {updateType !== 'overall_discount' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Billing Month</label>
                                    <div className="space-y-2">
                                        <Input
                                            type="month"
                                            className="w-full h-11 font-bold text-sm"
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

                                        <label className="flex items-center gap-2 text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1 select-none">
                                            <Checkbox
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
                                            <div className="grid grid-cols-3 gap-2 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-xl p-3">
                                                {months.map(m => {
                                                    const ym = toYm(m.val);
                                                    const active = selectedMonths.has(ym);
                                                    return (
                                                        <Button
                                                            type="button"
                                                            key={m.val}
                                                            onClick={() => toggleSelectedMonth(ym)}
                                                            variant="neutral"
                                                            size="sm"
                                                            className={`px-2 py-2 shadow-none rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${active ? 'bg-(--nb-color-brand)! text-white! border-(--nb-color-brand)!' : 'bg-(--nb-color-bg-card)! text-(--nb-color-fg)! border-(--nb-color-border)! hover:bg-(--nb-color-bg)!'}`}
                                                        >
                                                            {m.label.slice(0, 3)}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">
                                    {updateType === 'correction' ? 'New Correct Amount ($)' : (updateType === 'undo_charge' ? ' ' : 'Discount Value')}
                                </label>
                                {updateType === 'undo_charge' ? (
                                    <div className="w-full h-11" />
                                ) : (
                                    <Input
                                        type="number"
                                        className="w-full h-11 font-bold text-sm"
                                        placeholder="0.00"
                                        value={updateType === 'correction' ? formData.amount : formData.discountValue}
                                        onChange={e => setFormData({ ...formData, [updateType === 'correction' ? 'amount' : 'discountValue']: e.target.value })}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Reason for Adjustment</label>
                            <Textarea
                                className="min-h-20"
                                placeholder="Explain why this adjustment is being made (Audit Required)"
                                value={formData.reason}
                                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-4 border-t border-(--nb-color-border)">
                    <Button
                        type="button"
                        onClick={step === 1 ? onClose : () => setStep(1)}
                        variant="neutral"
                        size="md"
                    >
                        {step === 1 ? 'Cancel' : 'Back'}
                    </Button>

                    {step === 2 ? (
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading || !formData.reason}
                            variant="brand"
                            size="md"
                        >
                            {loading ? 'Processing…' : 'Execute'}
                        </Button>
                    ) : null}
                </div>
            </div>
        </Modal>
    );
}
