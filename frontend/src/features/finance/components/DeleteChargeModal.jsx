import React, { useState, useEffect } from 'react';
import financeService from '../api/finance';
import { listGradeSections } from '../../grades/api/gradeSections';
import { X, Trash2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

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

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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

            const res = await financeService.deleteBulkInvoices(params);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col border border-red-100">
                <div className="flex justify-between items-center p-6 border-b border-red-50 bg-red-50/30">
                    <div>
                        <h3 className="text-xl font-black text-red-900 uppercase tracking-tight">Delete Charges</h3>
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none mt-1">
                            Warning: Irreversible Action
                        </p>
                    </div>
                    <button onClick={onClose} className="text-red-300 hover:text-red-900 transition-colors p-2 hover:bg-red-100 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl text-red-800">
                        <AlertCircle className="shrink-0 mt-0.5" size={18} />
                        <p className="text-xs font-bold leading-snug">
                            This will cancel unpaid invoices from student ledgers for the selected criteria.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Deletion Scope</label>
                            <select
                                className="w-full px-5 py-3.5 bg-surface-50 border border-surface-200 rounded-xl font-bold text-sm text-surface-900 appearance-none outline-none focus:ring-4 focus:ring-red-500/10 transition-all"
                                value={scope}
                                onChange={(e) => setScope(e.target.value)}
                            >
                                <option value="all">Delete All Charges</option>
                                <option value="single">Single Student</option>
                                <option value="class">By Class/Grade</option>
                            </select>
                        </div>

                        {scope === 'single' && (
                            <div className="sm:col-span-2 space-y-2 animate-in slide-in-from-top-2">
                                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Student Registration ID</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3.5 bg-surface-50 border border-surface-200 rounded-xl font-bold text-sm placeholder:text-surface-300 outline-none focus:ring-4 focus:ring-red-500/10 transition-all"
                                    placeholder="Ex: STU-1001"
                                    value={targetId}
                                    onChange={e => setTargetId(e.target.value)}
                                />
                            </div>
                        )}

                        {scope === 'class' && (
                            <div className="sm:col-span-2 space-y-2 animate-in slide-in-from-top-2">
                                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Select Target Class</label>
                                <select
                                    className="w-full px-5 py-3.5 bg-surface-50 border border-surface-200 rounded-xl font-bold text-sm text-surface-900 appearance-none outline-none focus:ring-4 focus:ring-red-500/10 transition-all"
                                    value={targetId}
                                    onChange={e => setTargetId(e.target.value)}
                                >
                                    <option value="">-- Choose Class --</option>
                                    {classes.map(c => <option key={c._id} value={c._id}>{c.grade?.gradeName} - {c.section}</option>)}
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Amount Type</label>
                            <select
                                className="w-full px-5 py-3.5 bg-surface-50 border border-surface-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-red-500/10 transition-all"
                                value={amountTypeId}
                                onChange={e => setAmountTypeId(e.target.value)}
                            >
                                <option value="">-- All Types --</option>
                                {amountTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Year</label>
                            <input
                                type="number"
                                className="w-full px-5 py-3.5 bg-surface-50 border border-surface-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-red-500/10 transition-all"
                                value={year}
                                onChange={e => setYear(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center justify-between gap-3 text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1 select-none">
                                <span>Billing Month</span>
                                <span className="flex items-center gap-2">
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
                                                setSelectedMonths(new Set([month]));
                                            }
                                        }}
                                    />
                                    Multiple months
                                </span>
                            </label>
                            <select
                                className="w-full px-5 py-3.5 bg-surface-50 border border-surface-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-red-500/10 transition-all"
                                value={month}
                                onChange={e => setMonth(e.target.value)}
                                disabled={useMultipleMonths}
                            >
                                {months.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Created Date</label>
                                <label className="flex items-center gap-2 text-[10px] font-black text-surface-400 uppercase tracking-widest">
                                    <input
                                        type="checkbox"
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
                            <input
                                type="date"
                                className="w-full px-5 py-3.5 bg-surface-50 border border-surface-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-red-500/10 transition-all disabled:opacity-60"
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
                                            <button
                                                type="button"
                                                key={m}
                                                onClick={() => toggleSelectedMonth(m)}
                                                className={`px-2 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all border ${active ? 'bg-surface-900 text-white border-surface-900' : 'bg-white text-surface-700 border-surface-200 hover:bg-surface-100'}`}
                                            >
                                                {m.slice(0, 3)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-surface-100 bg-surface-50 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="text-surface-500 font-black uppercase text-xs tracking-widest hover:text-surface-900 transition-colors"
                    >
                        Close
                    </button>

                    <button
                        onClick={handleDelete}
                        disabled={loading || (scope === 'single' && !targetId) || (scope === 'class' && !targetId)}
                        className="bg-red-600 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-500/10 hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Deleting...' : 'Delete Charges'}
                        {!loading && <Trash2 size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
