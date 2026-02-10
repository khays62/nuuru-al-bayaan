import React, { useState, useEffect } from 'react';
import financeService from '../api/finance';
import { listGradeSections } from '../../grades/api/gradeSections';
import { X, CheckCircle, Wallet, Calendar, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentChargeModal({ onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState([]);
    const [amountTypes, setAmountTypes] = useState([]);
    const [feeTypes, setFeeTypes] = useState([]);

    const [scope, setScope] = useState('all'); // all, single, class
    const [targetId, setTargetId] = useState(''); // studentId or classId
    const [amountTypeId, setAmountTypeId] = useState('');
    const [feeType, setFeeType] = useState('personal'); // fee type code
    const [customAmount, setCustomAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [month, setMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [useMultipleMonths, setUseMultipleMonths] = useState(false);
    const [selectedMonths, setSelectedMonths] = useState(() => new Set());

    const [formStep, setFormStep] = useState(1); // 1: Select Option, 2: Select Charge Form

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
                const [catsRes, sectionsRes] = await Promise.all([
                    financeService.getFinanceCategories('fee'),
                    listGradeSections({ limit: 100 })
                ]);
                const rawCats = Array.isArray(catsRes?.data) ? catsRes.data : (Array.isArray(catsRes) ? catsRes : []);
                const cats = rawCats.filter(c => c.type === 'fee' && c.status !== 'inactive');
                setAmountTypes(cats);
                let list = Array.isArray(sectionsRes) ? sectionsRes : (sectionsRes?.data || []);
                if (list.length === 0) {
                    try {
                        const fallback = await financeService.getGradeSections({ limit: 100 });
                        list = Array.isArray(fallback)
                            ? fallback
                            : (fallback?.data || []);
                    } catch {
                        // ignore
                    }
                }
                setClasses(list);

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
                classId: (scope === 'class' || scope === 'all') ? targetId : undefined,
                // academicYearId is not yet in form, but backend allows it
            };

            await financeService.chargeStudentFees(payload);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Student Charge</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                            {formStep === 1 ? 'Step 1: Select Option' : 'Step 2: Select Charge Form'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-300 hover:text-slate-900 transition-colors p-2 hover:bg-slate-100 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {formStep === 1 ? (
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Charge Method</label>
                            <select
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 appearance-none outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                value={scope}
                                onChange={(e) => setScope(e.target.value)}
                            >
                                <option value="all">All Charge</option>
                                <option value="single">Single Charge</option>
                                <option value="class">Charge by Class/Grade</option>
                            </select>

                            {scope === 'single' && (
                                <div className="space-y-2 animate-in slide-in-from-top-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Registration ID</label>
                                    <input
                                        type="text"
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                        placeholder="Ex: STU-1001"
                                        value={targetId}
                                        onChange={e => setTargetId(e.target.value)}
                                    />
                                </div>
                            )}

                            {scope === 'class' && (
                                <div className="space-y-2 animate-in slide-in-from-top-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Target Class</label>
                                    <select
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 appearance-none outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                        value={targetId}
                                        onChange={e => setTargetId(e.target.value)}
                                    >
                                        <option value="">-- Choose Class --</option>
                                        {classes.map(c => {
                                            const gradeLabel = c.grade?.gradeName || c.grade?.name || c.gradeName || '';
                                            const sectionLabel = c.section || c.name || '';
                                            const label = `${gradeLabel}${sectionLabel ? ` - ${sectionLabel}` : ''}`.trim();
                                            return (
                                                <option key={c._id} value={c._id}>{label || '—'}</option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount Type</label>
                                    <select
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                        value={amountTypeId}
                                        onChange={e => setAmountTypeId(e.target.value)}
                                    >
                                        <option value="">-- Select Type --</option>
                                        {amountTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fee Type</label>
                                    <select
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                        value={feeType}
                                        onChange={e => setFeeType(e.target.value)}
                                    >
                                        {feeTypes.length > 0 ? (
                                            feeTypes.map(ft => (
                                                <option key={ft._id || ft.code} value={String(ft.code).toLowerCase()}>
                                                    {ft.name}
                                                </option>
                                            ))
                                        ) : (
                                            <>
                                                <option value="personal">Personal</option>
                                                <option value="free">Free</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>

                            {isSpecialType && (
                                <div className="space-y-2 animate-in zoom-in-95">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Enter Amount ($)</label>
                                    <input
                                        type="number"
                                        className="w-full px-6 py-4 bg-blue-600/5 border border-blue-600/20 rounded-xl font-black text-2xl text-blue-600 outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                        placeholder="0.00"
                                        value={customAmount}
                                        onChange={e => setCustomAmount(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Billing Month</label>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <select
                                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none"
                                                value={month}
                                                onChange={e => setMonth(e.target.value)}
                                                disabled={useMultipleMonths}
                                            >
                                                {months.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>

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
                                                        setSelectedMonths(new Set([month]));
                                                    }
                                                }}
                                            />
                                            Multiple months
                                        </label>

                                        {useMultipleMonths && (
                                            <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                                                {months.map(m => {
                                                    const active = selectedMonths.has(m);
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={m}
                                                            onClick={() => toggleSelectedMonth(m)}
                                                            className={`px-2 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                                        >
                                                            {m.slice(0, 3)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Charge Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-8 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="text-slate-500 font-black uppercase text-xs tracking-widest hover:text-slate-900 transition-colors"
                    >
                        Close
                    </button>

                    <div className="flex gap-3">
                        {formStep === 2 && (
                            <button
                                onClick={() => setFormStep(1)}
                                className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-100 transition-all"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={formStep === 1 ? () => setFormStep(2) : handleSubmit}
                            disabled={loading || (formStep === 1 && scope === 'single' && !targetId) || (formStep === 1 && scope === 'class' && !targetId)}
                            className="bg-slate-900 text-white px-10 py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center gap-3 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : (formStep === 1 ? 'Next Step' : 'Charge students')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
