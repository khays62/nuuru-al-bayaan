import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import financeService from '../api/finance';
import axios from '../api/axios';

export default function PayrollChargeModal({
    onClose,
    onSuccess,
    defaultMonth,
    academicYears,
    defaultAcademicYearId,
}) {
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [accounts, setAccounts] = useState([]);

    const [form, setForm] = useState({
        mode: 'charge', // charge | fullPayment
        scope: 'all', // all | single
        staffId: '',
        month: defaultMonth,
        academicYear: defaultAcademicYearId || '',
        accountId: '',
        date: new Date().toISOString().slice(0, 10),
    });

    useEffect(() => {
        const load = async () => {
            try {
                const [accRes, staffRes] = await Promise.all([
                    financeService.getAccounts(),
                    axios.get('/users', { params: { status: 'active', includeTeachers: true } }),
                ]);
                setAccounts(accRes || []);
                setStaffList((staffRes.data || []).filter(u => u.status !== 'inactive'));
            } catch {
                // best-effort; per-field validation will handle missing selections
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (accounts.length === 0) return;
        setForm(prev => (prev.accountId ? prev : { ...prev, accountId: accounts[0]._id }));
    }, [accounts]);

    const canSubmit = useMemo(() => {
        if (!form.month) return false;
        if (!form.academicYear) return false;
        if (form.scope === 'single' && !form.staffId) return false;
        if (form.mode === 'fullPayment' && !form.accountId) return false;
        return true;
    }, [form]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;

        const invalidStaff = (scope, staffId) => {
            if (staffList.length === 0) return [];
            if (scope === 'single') {
                const target = staffList.find(s => s._id === staffId);
                return target && Number(target.salary || 0) <= 0 ? [target] : [];
            }
            return staffList.filter(s => Number(s.salary || 0) <= 0);
        };

        const missingSalary = invalidStaff(form.scope, form.staffId);
        if (missingSalary.length > 0) {
            const names = missingSalary.slice(0, 3).map(s => s.fullName || s.username || s._id).join(', ');
            const more = missingSalary.length > 3 ? ` (+${missingSalary.length - 3} more)` : '';
            toast.error(`Missing salary amount for: ${names}${more}`);
            return;
        }

        setLoading(true);
        try {
            if (form.mode === 'charge') {
                await financeService.chargePayroll({
                    chargeType: form.scope,
                    staffId: form.scope === 'single' ? form.staffId : undefined,
                    month: form.month,
                    academicYear: form.academicYear,
                });
                toast.success('Payroll charge created');
            } else {
                await financeService.payrollFullPayment({
                    scope: form.scope,
                    staffId: form.scope === 'single' ? form.staffId : undefined,
                    month: form.month,
                    academicYear: form.academicYear,
                    accountId: form.accountId,
                    date: form.date,
                });
                toast.success('Full payment completed');
            }

            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-slate-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/30">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Payroll Charge</h3>
                        <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">Charge / Full Payment</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm">
                        <X size={22} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Month</label>
                            <input
                                type="month"
                                value={form.month}
                                onChange={(e) => setForm(prev => ({ ...prev, month: e.target.value }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Year</label>
                            <select
                                value={form.academicYear}
                                onChange={(e) => setForm(prev => ({ ...prev, academicYear: e.target.value }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                            >
                                <option value="">Select Academic Year</option>
                                {academicYears.map(y => (
                                    <option key={y._id} value={y._id}>{y.yearName}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salary Charging Options</label>
                            <select
                                value={form.scope}
                                onChange={(e) => setForm(prev => ({ ...prev, scope: e.target.value, staffId: '' }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                            >
                                <option value="all">All Employees</option>
                                <option value="single">Single Employee</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mode</label>
                            <select
                                value={form.mode}
                                onChange={(e) => setForm(prev => ({ ...prev, mode: e.target.value }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                            >
                                <option value="charge">Charge</option>
                                <option value="fullPayment">Full Payment (Auto charge + payment)</option>
                            </select>
                        </div>
                    </div>

                    {form.scope === 'single' && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</label>
                            <select
                                value={form.staffId}
                                onChange={(e) => setForm(prev => ({ ...prev, staffId: e.target.value }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                            >
                                <option value="">Select Employee</option>
                                {staffList.map(s => (
                                    <option key={s._id} value={s._id}>{s.fullName}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account</label>
                        <select
                            value={form.accountId}
                            onChange={(e) => setForm(prev => ({ ...prev, accountId: e.target.value }))}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                        >
                            <option value="">Select Account</option>
                            {accounts.map(acc => (
                                <option key={acc._id} value={acc._id}>
                                    {acc.name}{acc.accountNumber ? ` (${acc.accountNumber})` : ''}
                                </option>
                            ))}
                        </select>
                        <div className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                            Used for full payment
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                        <input
                            type="date"
                            value={form.date}
                            onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-[0.2em]"
                        >
                            Close
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit || loading}
                            className="px-8 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
