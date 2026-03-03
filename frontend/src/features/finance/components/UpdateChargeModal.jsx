import React, { useMemo, useState, useEffect } from 'react';
import { RefreshCcw, Percent, DollarSign, Calendar, Hash, ShieldCheck, AlertCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    useUpdateChargeAmountMutation,
    useApplyMonthlyDiscountMutation,
    useApplyOverallDiscountMutation,
    useDeleteMonthlyChargesMutation,
} from '../hooks/studentFinanceHooks';
import { useFinanceCategoriesQuery } from '../hooks/financeConfigHooks';

import { useI18n } from '../../../i18n/useI18n';

import Input from '../../../shared/components/ui/Input.jsx';
import Textarea from '../../../shared/components/ui/Textarea.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';

export default function UpdateChargeModal({ onClose, onSuccess }) {
    const { lang, t } = useI18n();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Type Selection, 2: Form, 3: Success/Summary
    const [updateType, setUpdateType] = useState('correction'); // correction, monthly_discount, overall_discount, undo_charge

    const [useMultipleMonths, setUseMultipleMonths] = useState(false);
    const [selectedMonths, setSelectedMonths] = useState(() => new Set());

    const categoriesQuery = useFinanceCategoriesQuery(
        { type: 'fee', includePreviousBalance: false, includeInactive: false },
        { staleTime: 30_000, refetchOnWindowFocus: false }
    );

    const amountTypes = useMemo(() => {
        const rawCats = Array.isArray(categoriesQuery.data) ? categoriesQuery.data : [];
        return rawCats.filter(c => c?.type === 'fee' && c?.status !== 'inactive');
    }, [categoriesQuery.data]);

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

    const months = useMemo(() => {
        const locale = lang || undefined;
        return Array.from({ length: 12 }, (_, idx) => {
            const label = new Date(2020, idx, 1).toLocaleString(locale, { month: 'long' });
            const val = String(idx + 1).padStart(2, '0');
            return { label, val };
        });
    }, [lang]);

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
        if (!categoriesQuery.isError) return;
        toast.error(t('finance.studentFinance.updateChargeModal.toasts.loadConfigFailed', { defaultValue: 'Failed to load configuration data' }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoriesQuery.isError]);

    const correctionMutation = useUpdateChargeAmountMutation();
    const monthlyDiscountMutation = useApplyMonthlyDiscountMutation();
    const overallDiscountMutation = useApplyOverallDiscountMutation();
    const undoChargesMutation = useDeleteMonthlyChargesMutation();

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        const sId = formData.studentId.trim();
        if (!sId) {
            return toast.error(t('finance.studentFinance.updateChargeModal.toasts.enterValidStudentId', { defaultValue: 'Please enter a valid Student ID' }));
        }

        if (updateType !== 'overall_discount' && (!formData.amountTypeId || !formData.month)) {
            return toast.error(t('finance.studentFinance.updateChargeModal.toasts.feeCategoryAndMonthRequired', { defaultValue: 'Fee Category and Month are required' }));
        }

        if (updateType !== 'overall_discount' && useMultipleMonths && selectedMonths.size === 0) {
            return toast.error(t('finance.studentFinance.updateChargeModal.toasts.selectAtLeastOneMonth', { defaultValue: 'Select at least one billing month' }));
        }

        if (updateType === 'correction' && !formData.amount) {
            return toast.error(t('finance.studentFinance.updateChargeModal.toasts.enterAmount', { defaultValue: 'Please enter an amount' }));
        }

        if ((updateType === 'monthly_discount' || updateType === 'overall_discount') && !formData.discountValue) {
            return toast.error(t('finance.studentFinance.updateChargeModal.toasts.enterDiscountValue', { defaultValue: 'Please enter a discount value' }));
        }

        if (!formData.reason || formData.reason.trim().length < 5) {
            return toast.error(
                t('finance.studentFinance.updateChargeModal.toasts.reasonMinLength', {
                    defaultValue: 'Please provide a meaningful reason for the audit log (min 5 chars)',
                })
            );
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
                if (!window.confirm(t('finance.studentFinance.updateChargeModal.confirms.undoCharges', { defaultValue: 'This will cancel unpaid charges for the selected month(s). Continue?' }))) return;
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
                if (cancelledCount > 0) {
                    toast.success(
                        t('finance.studentFinance.updateChargeModal.toasts.cancelledSuccess', {
                            defaultValue: 'Charges cancelled successfully ({{count}})',
                            count: cancelledCount,
                        })
                    );
                } else {
                    toast.error(t('finance.studentFinance.updateChargeModal.toasts.noneFoundToCancel', { defaultValue: 'No matching unpaid charges found to cancel' }));
                }
            } else {
                toast.success(t('finance.studentFinance.updateChargeModal.toasts.updateSuccess', { defaultValue: 'Update successful and audit log created' }));
            }
            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || t('finance.studentFinance.updateChargeModal.toasts.operationFailed', { defaultValue: 'Operation failed' }));
        } finally {
            setLoading(false);
        }
    };

    const workflowTypes = useMemo(() => ([
        {
            id: 'correction',
            title: t('finance.studentFinance.updateChargeModal.workflows.correction.title', { defaultValue: 'Update Charge Amount' }),
            desc: t('finance.studentFinance.updateChargeModal.workflows.correction.desc', { defaultValue: 'Correct human error in fee amount' }),
            icon: DollarSign,
            color: 'blue',
        },
        {
            id: 'monthly_discount',
            title: t('finance.studentFinance.updateChargeModal.workflows.monthlyDiscount.title', { defaultValue: 'Apply Monthly Discount' }),
            desc: t('finance.studentFinance.updateChargeModal.workflows.monthlyDiscount.desc', { defaultValue: 'One-time scholarship for a specific month' }),
            icon: Percent,
            color: 'amber',
        },
        {
            id: 'undo_charge',
            title: t('finance.studentFinance.updateChargeModal.workflows.undoCharges.title', { defaultValue: 'Undo Charges' }),
            desc: t('finance.studentFinance.updateChargeModal.workflows.undoCharges.desc', { defaultValue: 'Cancel unpaid charges for selected month(s)' }),
            icon: Trash2,
            color: 'red',
        },
        {
            id: 'overall_discount',
            title: t('finance.studentFinance.updateChargeModal.workflows.overallDiscount.title', { defaultValue: 'Apply Overall Discount' }),
            desc: t('finance.studentFinance.updateChargeModal.workflows.overallDiscount.desc', { defaultValue: 'Permanent scholarship for all future charges' }),
            icon: ShieldCheck,
            color: 'green',
        },
    ]), [t]);

    const amountTypeOptions = amountTypes.map((amountType) => ({ value: amountType._id, label: amountType.name }));
    const discountTypeOptions = [
        { value: 'fixed', label: t('finance.studentFinance.updateChargeModal.discountTypes.fixed', { defaultValue: 'Fixed Amount ($)' }) },
        { value: 'percentage', label: t('finance.studentFinance.updateChargeModal.discountTypes.percentage', { defaultValue: 'Percentage (%)' }) },
    ];

    return (
        <Modal
            isOpen
            onClose={onClose}
            closeOnBackdrop={false}
            title={t('finance.studentFinance.updateChargeModal.title', { defaultValue: 'Finance Update Workflow' })}
        >
            <div className="space-y-6">
                {step === 1 ? (
                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 mb-6">
                            <AlertCircle className="text-blue-600 shrink-0" size={20} />
                            <p className="text-xs font-medium text-blue-800 leading-relaxed">
                                {t('finance.studentFinance.updateChargeModal.auditNotice', {
                                    defaultValue:
                                        'Every update made here is recorded in the permanent audit logs with before/after values. Balance recalculations happen automatically.',
                                })}
                            </p>
                        </div>

                        <div className="grid gap-3">
                            {workflowTypes.map((workflow) => (
                                <Button
                                    key={workflow.id}
                                    onClick={() => { setUpdateType(workflow.id); setStep(2); }}
                                    variant="neutral"
                                    size="md"
                                    className={`w-full whitespace-normal justify-start flex items-center gap-4 p-4 rounded-xl border-2 shadow-none transition-all text-left ${updateType === workflow.id ? 'border-amber-500! bg-amber-50/50!' : 'border-(--nb-color-border)! hover:border-(--nb-color-focus)! bg-(--nb-color-bg-card)!'} `}
                                >
                                    <div className={`p-3 rounded-xl bg-${workflow.color}-100 text-${workflow.color}-700`}>
                                        <workflow.icon size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-(--nb-color-fg) text-sm uppercase tracking-tight">{workflow.title}</h4>
                                        <p className="text-[11px] font-medium text-(--nb-color-muted)">{workflow.desc}</p>
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
                                <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">
                                    {t('finance.studentFinance.updateChargeModal.labels.studentId', { defaultValue: 'Student ID' })}
                                </label>
                                <Input
                                    type="text"
                                    className="h-11 font-bold text-sm"
                                    placeholder={t('finance.studentFinance.updateChargeModal.placeholders.studentId', { defaultValue: 'Ex: DU1S1A62' })}
                                    value={formData.studentId}
                                    onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                                />
                            </div>
                            {updateType !== 'overall_discount' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">
                                        {t('finance.studentFinance.updateChargeModal.labels.feeCategory', { defaultValue: 'Fee Category' })}
                                    </label>
                                    <SearchableSelect
                                        value={formData.amountTypeId}
                                        onChange={(v) => setFormData({ ...formData, amountTypeId: v })}
                                        options={amountTypeOptions}
                                        placeholder={t('finance.studentFinance.updateChargeModal.placeholders.chooseFee', { defaultValue: 'Choose Fee...' })}
                                        searchPlaceholder={t('finance.studentFinance.updateChargeModal.placeholders.searchFeeCategories', { defaultValue: 'Search fee categoriesâ€¦' })}
                                        maxVisible={6}
                                        className="h-11 font-bold text-sm"
                                    />
                                </div>
                            )}
                            {updateType === 'overall_discount' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">
                                        {t('finance.studentFinance.updateChargeModal.labels.discountType', { defaultValue: 'Discount Type' })}
                                    </label>
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
                                    <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">
                                        {t('finance.studentFinance.updateChargeModal.labels.billingMonth', { defaultValue: 'Billing Month' })}
                                    </label>
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
                                            {t('finance.studentFinance.updateChargeModal.labels.multipleMonths', { defaultValue: 'Multiple months' })}
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
                                    {updateType === 'correction'
                                        ? t('finance.studentFinance.updateChargeModal.labels.newCorrectAmount', { defaultValue: 'New Correct Amount ($)' })
                                        : (updateType === 'undo_charge' ? ' ' : t('finance.studentFinance.updateChargeModal.labels.discountValue', { defaultValue: 'Discount Value' }))}
                                </label>
                                {updateType === 'undo_charge' ? (
                                    <div className="w-full h-11" />
                                ) : (
                                    <Input
                                        type="number"
                                        className="w-full h-11 font-bold text-sm"
                                        placeholder={t('finance.studentFinance.updateChargeModal.placeholders.amount', { defaultValue: '0.00' })}
                                        value={updateType === 'correction' ? formData.amount : formData.discountValue}
                                        onChange={e => setFormData({ ...formData, [updateType === 'correction' ? 'amount' : 'discountValue']: e.target.value })}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">
                                {t('finance.studentFinance.updateChargeModal.labels.reason', { defaultValue: 'Reason for Adjustment' })}
                            </label>
                            <Textarea
                                className="min-h-20"
                                placeholder={t('finance.studentFinance.updateChargeModal.placeholders.reason', { defaultValue: 'Explain why this adjustment is being made (Audit Required)' })}
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
                        {step === 1
                            ? t('finance.studentFinance.updateChargeModal.actions.cancel', { defaultValue: 'Cancel' })
                            : t('finance.studentFinance.updateChargeModal.actions.back', { defaultValue: 'Back' })}
                    </Button>

                    {step === 2 ? (
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading || !formData.reason}
                            variant="brand"
                            size="md"
                        >
                            {loading
                                ? t('finance.studentFinance.updateChargeModal.actions.processing', { defaultValue: 'Processingâ€¦' })
                                : t('finance.studentFinance.updateChargeModal.actions.execute', { defaultValue: 'Execute' })}
                        </Button>
                    ) : null}
                </div>
            </div>
        </Modal>
    );
}
