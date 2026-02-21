import React, { useState, useEffect } from 'react';
import financeService from '../api/finance';
import { CheckCircle, Wallet, Calendar, Users, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useChargeStudentFeesMutation } from '../hooks/studentFinanceHooks';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';
import GradeSelect from '../../lookups/components/GradeSelect.jsx';
import ShiftSelect from '../../lookups/components/ShiftSelect.jsx';
import GradeSectionSelect from '../../lookups/components/GradeSectionSelect.jsx';

export default function StudentChargeModal({ onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [amountTypes, setAmountTypes] = useState([]);
    const [feeTypes, setFeeTypes] = useState([]);

    const [scope, setScope] = useState('all'); // all, single, class
    const [targetId, setTargetId] = useState(''); // studentId or classId
    const [gradeId, setGradeId] = useState('');
    const [shiftId, setShiftId] = useState('');
    const [amountTypeId, setAmountTypeId] = useState('');
    const [feeType, setFeeType] = useState('personal'); // fee type code
    const [customAmount, setCustomAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [month, setMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [useMultipleMonths, setUseMultipleMonths] = useState(false);
    const [selectedMonths, setSelectedMonths] = useState(() => new Set());

    const [formStep, setFormStep] = useState(1); // 1: Select Option, 2: Select Charge Form

    const chargeMutation = useChargeStudentFeesMutation();

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const toggleSelectedMonth = (m) => {
        setSelectedMonths(prev => {
            const next = new Set(prev);
            if (next.has(m)) next.delete(m);
            else next.add(m);
            return next;
        });
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const [catsRes] = await Promise.all([
                    financeService.getFinanceCategories('fee'),
                ]);
                const rawCats = Array.isArray(catsRes?.data) ? catsRes.data : (Array.isArray(catsRes) ? catsRes : []);
                const cats = rawCats.filter(c => c.type === 'fee' && c.status !== 'inactive');
                setAmountTypes(cats);

                // Fee Types are separate from Amount Types
                const ftRes = await financeService.getFeeTypes();
                const ft = ftRes?.data ? ftRes.data : (Array.isArray(ftRes) ? ftRes : []);
                setFeeTypes(Array.isArray(ft) ? ft : []);
            } catch {
                toast.error("Failed to load configuration data");
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        // Keep selection valid if server-side list changes
        if (feeTypes.length > 0) {
            const hasSelected = feeTypes.some(f => String(f.code).toLowerCase() === String(feeType).toLowerCase());
            if (!hasSelected) setFeeType(String(feeTypes[0].code || 'personal').toLowerCase());
        }
    }, [feeTypes]);

    const selectedAmountType = amountTypes.find(t => t._id === amountTypeId);
    const isSpecialType = selectedAmountType?.name?.toLowerCase().includes('registration') ||
        selectedAmountType?.name?.toLowerCase().includes('graduation');

    const scopeOptions = [
        { value: 'all', label: 'All Charge' },
        { value: 'single', label: 'Single Charge' },
        { value: 'class', label: 'Charge by Class/Grade' },
    ];

    const amountTypeOptions = amountTypes.map((t) => ({ value: t._id, label: t.name }));
    const feeTypeOptions = (feeTypes.length > 0
        ? feeTypes.map((ft) => ({ value: String(ft.code).toLowerCase(), label: ft.name }))
        : [
            { value: 'personal', label: 'Regular' },
            { value: 'free', label: 'Free' },
        ]);

    const monthOptions = months.map((m) => ({ value: m, label: m }));

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!amountTypeId) return toast.error("Select Amount Type");
        if (scope === 'single' && !targetId) return toast.error("Enter Student ID");
        if (scope === 'class' && !targetId) return toast.error("Select Class");
        if (useMultipleMonths && selectedMonths.size === 0) return toast.error("Select at least one billing month");

        setLoading(true);
        try {
            const year = new Date(date).getFullYear();
            const dateMonthIndex = new Date(date).getMonth();

            const toYm = (monthName) => {
                const idx = months.indexOf(monthName);
                const mm = String((idx >= 0 ? idx : dateMonthIndex) + 1).padStart(2, '0');
                return `${year}-${mm}`;
            };

            const ym = toYm(month);
            const monthsPayload = useMultipleMonths ? Array.from(selectedMonths).map(toYm) : null;

            const finalAmount = isSpecialType ? Number(customAmount) : Number(selectedAmountType?.defaultAmount || 0);

            const payload = {
                chargeType: scope,
                ...(useMultipleMonths ? { months: monthsPayload } : { month: ym }),
                categoryId: amountTypeId,
                feeType: feeType, // personal or free
                amount: finalAmount,
                studentId: scope === 'single' ? targetId : undefined,
                classId: scope === 'class' ? targetId : undefined,
                // academicYearId is not yet in form, but backend allows it
            };

            await chargeMutation.mutateAsync(payload);

            toast.success("Charge recorded successfully");
            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || "Charge failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen onClose={onClose} closeOnBackdrop={false} title="Student Charge">
            <div className="space-y-6">
                <div className="text-sm text-(--nb-color-muted)">
                    {formStep === 1 ? 'Step 1: Select Option' : 'Step 2: Select Charge Form'}
                </div>
                    {formStep === 1 ? (
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Charge Method</label>
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
                                className="h-11 font-bold"
                            />

                            {scope === 'single' && (
                                <div className="space-y-2 animate-in slide-in-from-top-2">
                                    <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Student Registration ID</label>
                                    <Input
                                        type="text"
                                        className="h-11 font-bold"
                                        placeholder="Ex: STU-1001"
                                        value={targetId}
                                        onChange={e => setTargetId(e.target.value)}
                                    />
                                </div>
                            )}

                            {scope === 'class' && (
                                <div className="space-y-2 animate-in slide-in-from-top-2">
                                    <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Select Target Class</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <GradeSelect
                                            value={gradeId}
                                            onChange={(v) => {
                                                setGradeId(v || '');
                                                setTargetId('');
                                            }}
                                            placeholder="Grade"
                                            className="h-11 font-bold"
                                        />
                                        <ShiftSelect
                                            value={shiftId}
                                            onChange={(v) => {
                                                setShiftId(v || '');
                                                setTargetId('');
                                            }}
                                            placeholder="Shift"
                                            className="h-11 font-bold"
                                        />
                                        <GradeSectionSelect
                                            gradeId={gradeId}
                                            shiftId={shiftId}
                                            value={targetId}
                                            onChange={(v) => setTargetId(v || '')}
                                            searchable
                                            maxVisible={6}
                                            placeholder="Section"
                                            searchPlaceholder="Search…"
                                            className="h-11 font-bold"
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
                                            Reset
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Amount Type</label>
                                    <SearchableSelect
                                        value={amountTypeId}
                                        onChange={(v) => setAmountTypeId(v)}
                                        options={amountTypeOptions}
                                        placeholder="-- Select Type --"
                                        searchPlaceholder="Search amount types…"
                                        maxVisible={6}
                                        className="h-11 font-bold text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Fee Type</label>
                                    <DropdownSelect
                                        value={feeType}
                                        onChange={(v) => setFeeType(v)}
                                        options={feeTypeOptions}
                                        clearable={false}
                                        className="h-11 font-bold text-sm"
                                    />
                                </div>
                            </div>

                            {isSpecialType && (
                                <div className="space-y-2 animate-in zoom-in-95">
                                    <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Enter Amount ($)</label>
                                    <Input
                                        type="number"
                                        className="w-full h-11 font-black text-blue-600"
                                        placeholder="0.00"
                                        value={customAmount}
                                        onChange={e => setCustomAmount(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Billing Month</label>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <DropdownSelect
                                                value={month}
                                                onChange={(v) => setMonth(v)}
                                                options={monthOptions}
                                                clearable={false}
                                                disabled={useMultipleMonths}
                                                className="h-11 font-bold text-sm"
                                            />
                                        </div>

                                        <label className="flex items-center gap-2 text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1 select-none">
                                            <Checkbox
                                                checked={useMultipleMonths}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setUseMultipleMonths(checked);
                                                    if (!checked) {
                                                        setSelectedMonths(new Set());
                                                    } else {
                                                        setSelectedMonths(new Set([month]));
                                                    }
                                                }}
                                            />
                                            Multiple months
                                        </label>

                                        {useMultipleMonths && (
                                            <div className="grid grid-cols-3 gap-2 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-2xl p-3">
                                                {months.map(m => {
                                                    const active = selectedMonths.has(m);
                                                    return (
                                                        <Button
                                                            type="button"
                                                            key={m}
                                                            onClick={() => toggleSelectedMonth(m)}
                                                            variant="neutral"
                                                            size="sm"
                                                            className={`px-2 py-2 shadow-none rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${active ? 'bg-(--nb-color-brand)! text-white! border-(--nb-color-brand)!' : 'bg-(--nb-color-bg-card)! text-(--nb-color-fg)! border-(--nb-color-border)! hover:bg-(--nb-color-bg)!'}`}
                                                        >
                                                            {m.slice(0, 3)}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Charge Date</label>
                                    <Input
                                        type="date"
                                        className="w-full h-11 font-bold text-sm"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                <div className="flex items-center justify-between gap-2 pt-4 border-t border-(--nb-color-border)">
                    <Button type="button" onClick={onClose} variant="neutral" size="md">
                        Close
                    </Button>

                    <div className="flex items-center gap-2">
                        {formStep === 2 ? (
                            <Button type="button" onClick={() => setFormStep(1)} variant="neutral" size="md">
                                Back
                            </Button>
                        ) : null}

                        <Button
                            type="button"
                            onClick={formStep === 1 ? () => setFormStep(2) : handleSubmit}
                            disabled={
                                loading ||
                                (formStep === 1 && scope === 'single' && !targetId) ||
                                (formStep === 1 && scope === 'class' && !targetId)
                            }
                            variant="primary"
                            size="md"
                        >
                            {loading ? 'Processing...' : (formStep === 1 ? 'Next Step' : 'Charge students')}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
