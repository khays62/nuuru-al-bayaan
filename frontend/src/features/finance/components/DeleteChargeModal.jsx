import React, { useState, useEffect } from 'react';
import financeService from '../api/finance';
import { listGradeSections } from '../../grades/api/gradeSections';
import { Trash2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDeleteMonthlyChargesMutation } from '../hooks/studentFinanceHooks';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';

export default function DeleteChargeModal({ onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState([]);
    const [amountTypes, setAmountTypes] = useState([]);

    const [scope, setScope] = useState('all'); // all, single, class
    const [targetId, setTargetId] = useState(''); // studentId or classId
    const [amountTypeId, setAmountTypeId] = useState('');
    const [date, setDate] = useState('');
    const [useCreatedDate, setUseCreatedDate] = useState(false);
    const [month, setMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [useMultipleMonths, setUseMultipleMonths] = useState(false);
    const [selectedMonths, setSelectedMonths] = useState(() => new Set());

    const deleteChargesMutation = useDeleteMonthlyChargesMutation();

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const scopeOptions = [
        { value: 'all', label: 'Delete All Charges' },
        { value: 'single', label: 'Single Student' },
        { value: 'class', label: 'By Class/Grade' },
    ];

    const classOptions = classes.map((c) => {
        const gradeLabel = c.grade?.gradeName || c.grade?.name || c.gradeName || '';
        const sectionLabel = c.section || c.name || '';
        const label = `${gradeLabel}${sectionLabel ? ` - ${sectionLabel}` : ''}`.trim();
        return { value: c._id, label: label || '—' };
    });

    const amountTypeOptions = amountTypes.map((t) => ({ value: t._id, label: t.name }));
    const monthOptions = months.map((m) => ({ value: m, label: m }));

    const toYYYYMM = (monthName, yearStr) => {
        const idx = months.indexOf(monthName);
        const yearNum = Number(yearStr);
        if (idx === -1 || !Number.isFinite(yearNum) || yearNum < 1970) return null;
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
        const loadData = async () => {
            try {
                const [catsRes, sectionsRes] = await Promise.all([
                    financeService.getFinanceCategories('fee'),
                    listGradeSections({ limit: 100 })
                ]);

                const rawCats = Array.isArray(catsRes?.data) ? catsRes.data : (Array.isArray(catsRes) ? catsRes : []);
                const cats = rawCats.filter(c => c.type === 'fee' && c.status !== 'inactive');
                setAmountTypes(cats);

                const normalize = (payload) => Array.isArray(payload)
                    ? payload
                    : (payload?.data?.data || payload?.data || []);

                let list = normalize(sectionsRes);
                if (list.length === 0) {
                    try {
                        const fallback = await financeService.getGradeSections({ limit: 100 });
                        list = normalize(fallback);
                    } catch {
                        // ignore
                    }
                }
                setClasses(list);
            } catch {
                toast.error("Failed to load configuration data");
            }
        };
        loadData();
    }, []);

    const handleDelete = async () => {
        if (!window.confirm("CRITICAL: This action will permanently remove charge records. Are you absolutely sure?")) return;

        const billingMonth = toYYYYMM(month, year);
        const monthsPayload = useMultipleMonths
            ? Array.from(selectedMonths).map(m => toYYYYMM(m, year)).filter(Boolean)
            : null;
        if (useMultipleMonths) {
            if (monthsPayload.length === 0) {
                toast.error('Select at least one billing month');
                return;
            }
        } else {
            if (!billingMonth) {
                toast.error('Invalid billing month/year');
                return;
            }
        }

        setLoading(true);
        try {
            if (!amountTypeId) {
                toast.error('Select an Amount Type to delete');
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
                toast.success(`Charges deleted successfully (${cancelledCount})`);
            } else {
                toast.error('No matching unpaid charges found to delete');
            }
            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || "Deletion failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen onClose={onClose} closeOnBackdrop={false} title="Delete Charges">
            <div className="space-y-5">
                    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl text-red-800">
                        <AlertCircle className="shrink-0 mt-0.5" size={18} />
                        <p className="text-xs font-bold leading-snug">
                            This will cancel unpaid invoices from student ledgers for the selected criteria.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Deletion Scope</label>
                            <DropdownSelect
                                value={scope}
                                onChange={(v) => {
                                    setScope(v);
                                    setTargetId('');
                                }}
                                options={scopeOptions}
                                clearable={false}
                                className="h-11 font-bold text-sm"
                            />
                        </div>

                        {scope === 'single' && (
                            <div className="sm:col-span-2 space-y-2 animate-in slide-in-from-top-2">
                                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Student Registration ID</label>
                                <Input
                                    type="text"
                                    className="w-full h-11 font-bold text-sm"
                                    placeholder="Ex: STU-1001"
                                    value={targetId}
                                    onChange={e => setTargetId(e.target.value)}
                                />
                            </div>
                        )}

                        {scope === 'class' && (
                            <div className="sm:col-span-2 space-y-2 animate-in slide-in-from-top-2">
                                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Select Target Class</label>
                                <SearchableSelect
                                    value={targetId}
                                    onChange={(v) => setTargetId(v)}
                                    options={classOptions}
                                    placeholder="-- Choose Class --"
                                    searchPlaceholder="Search classes…"
                                    maxVisible={6}
                                    className="h-11 font-bold text-sm"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Amount Type</label>
                            <SearchableSelect
                                value={amountTypeId}
                                onChange={(v) => setAmountTypeId(v)}
                                options={amountTypeOptions}
                                placeholder="-- All Types --"
                                searchPlaceholder="Search amount types…"
                                maxVisible={6}
                                className="h-11 font-bold text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Year</label>
                            <Input
                                type="number"
                                className="w-full h-11 font-bold text-sm"
                                value={year}
                                onChange={e => setYear(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center justify-between gap-3 text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1 select-none">
                                <span>Billing Month</span>
                                <span className="flex items-center gap-2">
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
                                </span>
                            </label>
                            <DropdownSelect
                                value={month}
                                onChange={(v) => setMonth(v)}
                                options={monthOptions}
                                clearable={false}
                                disabled={useMultipleMonths}
                                className="h-11 font-bold text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Created Date</label>
                                <label className="flex items-center gap-2 text-[10px] font-black text-surface-400 uppercase tracking-widest">
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
                                    Use Date Filter
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
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 bg-surface-50 border border-surface-200 rounded-xl p-3">
                                    {months.map(m => {
                                        const active = selectedMonths.has(m);
                                        return (
                                            <Button
                                                type="button"
                                                key={m}
                                                onClick={() => toggleSelectedMonth(m)}
                                                variant="neutral"
                                                size="sm"
                                                className={`px-2 py-2 shadow-none rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${active ? 'bg-surface-900! text-white! border-surface-900!' : 'bg-white! text-surface-700! border-surface-200! hover:bg-surface-100!'}`}
                                            >
                                                {m.slice(0, 3)}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                    <Button type="button" onClick={onClose} variant="neutral" size="md">
                        Close
                    </Button>

                    <Button
                        type="button"
                        onClick={handleDelete}
                        disabled={loading || (scope === 'single' && !targetId) || (scope === 'class' && !targetId)}
                        variant="danger"
                        size="md"
                    >
                        {loading ? 'Deleting...' : 'Delete Charges'}
                        {!loading && <Trash2 size={16} />}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
