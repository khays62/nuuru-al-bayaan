import React, { useMemo, useState, useEffect } from 'react';
import { Trash2, AlertCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDeleteMonthlyChargesMutation } from '../hooks/studentFinanceHooks';
import { useFinanceCategoriesQuery } from '../hooks/financeConfigHooks';
import { useI18n } from '../../../i18n/useI18n';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';
import GradeSelect from '../../lookups/components/GradeSelect.jsx';
import ShiftSelect from '../../lookups/components/ShiftSelect.jsx';
import GradeSectionSelect from '../../lookups/components/GradeSectionSelect.jsx';

export default function DeleteChargeModal({ onClose, onSuccess }) {
    const { lang, t } = useI18n();
    const [loading, setLoading] = useState(false);

    const categoriesQuery = useFinanceCategoriesQuery(
        { type: 'fee', includePreviousBalance: false, includeInactive: false },
        { staleTime: 30_000, refetchOnWindowFocus: false }
    );

    const amountTypes = useMemo(() => {
        const rawCats = Array.isArray(categoriesQuery.data) ? categoriesQuery.data : [];
        return rawCats.filter(c => c?.type === 'fee' && c?.status !== 'inactive');
    }, [categoriesQuery.data]);

    const [scope, setScope] = useState('all'); // all, single, class
    const [targetId, setTargetId] = useState(''); // studentId or classId
    const [gradeId, setGradeId] = useState('');
    const [shiftId, setShiftId] = useState('');
    const [amountTypeId, setAmountTypeId] = useState('');
    const [date, setDate] = useState('');
    const [useCreatedDate, setUseCreatedDate] = useState(false);
    const [monthIndex, setMonthIndex] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [useMultipleMonths, setUseMultipleMonths] = useState(false);
    const [selectedMonths, setSelectedMonths] = useState(() => new Set());

    const deleteChargesMutation = useDeleteMonthlyChargesMutation();

    const months = useMemo(() => {
        const locale = lang || undefined;
        return Array.from({ length: 12 }, (_, idx) => new Date(2020, idx, 1).toLocaleString(locale, { month: 'long' }));
    }, [lang]);

    const scopeOptions = useMemo(() => ([
        { value: 'all', label: t('finance.studentFinance.deleteChargesModal.scopes.all', { defaultValue: 'Delete All Charges' }) },
        { value: 'single', label: t('finance.studentFinance.deleteChargesModal.scopes.single', { defaultValue: 'Single Student' }) },
        { value: 'class', label: t('finance.studentFinance.deleteChargesModal.scopes.class', { defaultValue: 'By Class/Grade' }) },
    ]), [t]);

    const amountTypeOptions = amountTypes.map((t) => ({ value: t._id, label: t.name }));
    const monthOptions = months.map((m, idx) => ({ value: idx, label: m }));

    const toYYYYMM = (monthIdx, yearStr) => {
        const idx = Number(monthIdx);
        const yearNum = Number(yearStr);
        if (!Number.isFinite(idx) || idx < 0 || idx > 11 || !Number.isFinite(yearNum) || yearNum < 1970) return null;
        return `${yearNum}-${String(idx + 1).padStart(2, '0')}`;
    };

    const toggleSelectedMonth = (m) => {
        setSelectedMonths(prev => {
            const next = new Set(prev);
            if (next.has(m)) next.delete(m);
            else next.add(m);
            return next;
        });
    };

    useEffect(() => {
        if (!categoriesQuery.isError) return;
        toast.error(t('finance.studentFinance.deleteChargesModal.toasts.loadConfigFailed', { defaultValue: 'Failed to load configuration data' }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoriesQuery.isError]);

    const handleDelete = async () => {
        if (!window.confirm(t('finance.studentFinance.deleteChargesModal.confirms.critical', { defaultValue: 'CRITICAL: This action will permanently remove charge records. Are you absolutely sure?' }))) return;

        const billingMonth = toYYYYMM(monthIndex, year);
        const monthsPayload = useMultipleMonths
            ? Array.from(selectedMonths).map(m => toYYYYMM(m, year)).filter(Boolean)
            : null;
        if (useMultipleMonths) {
            if (monthsPayload.length === 0) {
                toast.error(t('finance.studentFinance.deleteChargesModal.toasts.selectAtLeastOneMonth', { defaultValue: 'Select at least one billing month' }));
                return;
            }
        } else {
            if (!billingMonth) {
                toast.error(t('finance.studentFinance.deleteChargesModal.toasts.invalidBillingMonthYear', { defaultValue: 'Invalid billing month/year' }));
                return;
            }
        }

        setLoading(true);
        try {
            if (!amountTypeId) {
                toast.error(t('finance.studentFinance.deleteChargesModal.toasts.selectAmountType', { defaultValue: 'Select an Amount Type to delete' }));
                return;
            }

            const params = {
                scope,
                studentId: scope === 'single' ? targetId : null,
                classId: scope === 'class' ? targetId : null,
                amountTypeId,
                ...(useMultipleMonths ? { months: monthsPayload } : { month: billingMonth }),
                ...(useCreatedDate && date ? { date } : {})
            };

            const res = await deleteChargesMutation.mutateAsync(params);
            const cancelledCount = Number(res?.cancelledCount || 0);
            if (cancelledCount > 0) {
                toast.success(
                    t('finance.studentFinance.deleteChargesModal.toasts.deletedSuccess', {
                        defaultValue: 'Charges deleted successfully ({{count}})',
                        count: cancelledCount,
                    })
                );
            } else {
                toast.error(t('finance.studentFinance.deleteChargesModal.toasts.noneFound', { defaultValue: 'No matching unpaid charges found to delete' }));
            }
            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || t('finance.studentFinance.deleteChargesModal.toasts.deletionFailed', { defaultValue: 'Deletion failed' }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            closeOnBackdrop={false}
            title={t('finance.studentFinance.deleteChargesModal.title', { defaultValue: 'Delete Charges' })}
        >
            <div className="space-y-5">
                    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl text-red-800">
                        <AlertCircle className="shrink-0 mt-0.5" size={18} />
                        <p className="text-xs font-bold leading-snug">
                            {t('finance.studentFinance.deleteChargesModal.warning', {
                                defaultValue: 'This will cancel unpaid invoices from student ledgers for the selected criteria.',
                            })}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">
                                {t('finance.studentFinance.deleteChargesModal.labels.deletionScope', { defaultValue: 'Deletion Scope' })}
                            </label>
                            <DropdownSelect
                                value={scope}
                                onChange={(v) => {
                                    setScope(v);
                                    setTargetId('');
                                    setGradeId('');
                                    setShiftId('');
                                }}
                                options={scopeOptions}
                                clearable={false}
                                className="h-11 font-bold text-sm"
                            />
                        </div>

                        {scope === 'single' && (
                            <div className="sm:col-span-2 space-y-2 animate-in slide-in-from-top-2">
                                <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">
                                    {t('finance.studentFinance.deleteChargesModal.labels.studentRegistrationId', { defaultValue: 'Student Registration ID' })}
                                </label>
                                <Input
                                    type="text"
                                    className="w-full h-11 font-bold text-sm"
                                    placeholder={t('finance.studentFinance.deleteChargesModal.placeholders.studentRegistrationId', { defaultValue: 'Ex: STU-1001' })}
                                    value={targetId}
                                    onChange={e => setTargetId(e.target.value)}
                                />
                            </div>
                        )}

                        {scope === 'class' && (
                            <div className="sm:col-span-2 space-y-2 animate-in slide-in-from-top-2">
                                <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">
                                    {t('finance.studentFinance.deleteChargesModal.labels.selectTargetClass', { defaultValue: 'Select Target Class' })}
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <GradeSelect
                                        value={gradeId}
                                        onChange={(v) => {
                                            setGradeId(v || '');
                                            setTargetId('');
                                        }}
                                        placeholder={t('finance.studentFinance.deleteChargesModal.placeholders.grade', { defaultValue: 'Grade' })}
                                        className="h-11 font-bold text-sm"
                                    />
                                    <ShiftSelect
                                        value={shiftId}
                                        onChange={(v) => {
                                            setShiftId(v || '');
                                            setTargetId('');
                                        }}
                                        placeholder={t('finance.studentFinance.deleteChargesModal.placeholders.shift', { defaultValue: 'Shift' })}
                                        className="h-11 font-bold text-sm"
                                    />
                                    <GradeSectionSelect
                                        gradeId={gradeId}
                                        shiftId={shiftId}
                                        value={targetId}
                                        onChange={(v) => setTargetId(v || '')}
                                        searchable
                                        maxVisible={6}
                                        placeholder={t('finance.studentFinance.deleteChargesModal.placeholders.section', { defaultValue: 'Section' })}
                                        searchPlaceholder={t('finance.studentFinance.deleteChargesModal.placeholders.search', { defaultValue: 'Searchâ€¦' })}
                                        className="h-11 font-bold text-sm"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        variant="neutral"
                                        size="sm"
                                        icon={<RotateCcw size={16} />}
                                        onClick={() => {
                                            setGradeId('');
                                            setShiftId('');
                                            setTargetId('');
                                        }}
                                    >
                                        {t('finance.studentFinance.deleteChargesModal.actions.reset', { defaultValue: 'Reset' })}
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">
                                {t('finance.studentFinance.deleteChargesModal.labels.amountType', { defaultValue: 'Amount Type' })}
                            </label>
                            <SearchableSelect
                                value={amountTypeId}
                                onChange={(v) => setAmountTypeId(v)}
                                options={amountTypeOptions}
                                placeholder={t('finance.studentFinance.deleteChargesModal.placeholders.allTypes', { defaultValue: '-- All Types --' })}
                                searchPlaceholder={t('finance.studentFinance.deleteChargesModal.placeholders.searchAmountTypes', { defaultValue: 'Search amount typesâ€¦' })}
                                maxVisible={6}
                                className="h-11 font-bold text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">
                                {t('finance.studentFinance.deleteChargesModal.labels.year', { defaultValue: 'Year' })}
                            </label>
                            <Input
                                type="number"
                                className="w-full h-11 font-bold text-sm"
                                value={year}
                                onChange={e => setYear(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center justify-between gap-3 text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1 select-none">
                                <span>{t('finance.studentFinance.deleteChargesModal.labels.billingMonth', { defaultValue: 'Billing Month' })}</span>
                                <span className="flex items-center gap-2">
                                    <Checkbox
                                        checked={useMultipleMonths}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setUseMultipleMonths(checked);
                                            if (!checked) {
                                                setSelectedMonths(new Set());
                                            } else {
                                                setSelectedMonths(new Set([Number(monthIndex)]));
                                            }
                                        }}
                                    />
                                    {t('finance.studentFinance.deleteChargesModal.labels.multipleMonths', { defaultValue: 'Multiple months' })}
                                </span>
                            </label>
                            <DropdownSelect
                                value={monthIndex}
                                onChange={(v) => setMonthIndex(Number(v))}
                                options={monthOptions}
                                clearable={false}
                                disabled={useMultipleMonths}
                                className="h-11 font-bold text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">
                                    {t('finance.studentFinance.deleteChargesModal.labels.createdDate', { defaultValue: 'Created Date' })}
                                </label>
                                <label className="flex items-center gap-2 text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest">
                                    <Checkbox
                                        checked={useCreatedDate}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setUseCreatedDate(checked);
                                            if (checked && !date) {
                                                setDate(new Date().toISOString().split('T')[0]);
                                            }
                                        }}
                                    />
                                    {t('finance.studentFinance.deleteChargesModal.labels.useDateFilter', { defaultValue: 'Use Date Filter' })}
                                </label>
                            </div>
                            <Input
                                type="date"
                                className="w-full h-11 font-bold text-sm"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                disabled={!useCreatedDate}
                            />
                        </div>

                        {useMultipleMonths && (
                            <div className="sm:col-span-2">
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-xl p-3">
                                    {months.map((m, idx) => {
                                        const active = selectedMonths.has(idx);
                                        return (
                                            <Button
                                                type="button"
                                                key={m}
                                                onClick={() => toggleSelectedMonth(idx)}
                                                variant="neutral"
                                                size="sm"
                                                className={`px-2 py-2 shadow-none rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${active ? 'bg-(--nb-color-accent)! text-white! border-(--nb-color-accent)!' : 'bg-(--nb-color-bg-card)! text-(--nb-color-fg)! border-(--nb-color-border)! hover:bg-(--nb-color-accent-50)! hover:text-(--nb-color-brand)!'}`}
                                            >
                                                {m.slice(0, 3)}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-(--nb-color-border)">
                    <Button type="button" onClick={onClose} variant="neutral" size="md">
                        {t('finance.studentFinance.deleteChargesModal.actions.close', { defaultValue: 'Close' })}
                    </Button>

                    <Button
                        type="button"
                        onClick={handleDelete}
                        disabled={loading || (scope === 'single' && !targetId) || (scope === 'class' && !targetId)}
                        variant="danger"
                        size="md"
                    >
                        {loading
                            ? t('finance.studentFinance.deleteChargesModal.actions.deleting', { defaultValue: 'Deleting...' })
                            : t('finance.studentFinance.deleteChargesModal.actions.deleteCharges', { defaultValue: 'Delete Charges' })}
                        {!loading && <Trash2 size={16} />}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
