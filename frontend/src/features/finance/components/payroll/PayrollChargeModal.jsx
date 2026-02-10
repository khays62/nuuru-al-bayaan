import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import financeService from '../../api/finance';
import axios from '../../api/axios';

export default function PayrollChargeModal({
    onClose,
    onSuccess,
    defaultMonth,
    academicYears,
    defaultAcademicYear
}) {
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [staffSearch, setStaffSearch] = useState('');

    const [chargeOption, setChargeOption] = useState('all');

    const [form, setForm] = useState({
        month: defaultMonth || new Date().toISOString().slice(0, 7),
        academicYear: defaultAcademicYear || '',
        staffId: '',
        accountId: '',
        date: new Date().toISOString().slice(0, 10),
        autoChargeAndPayment: true,
    });

    const needsStaff = chargeOption === 'single';
    const isFullPayment = chargeOption === 'full';

    useEffect(() => {
        if (needsStaff) {
            axios
                .get('/staff')
                .then((res) => setStaffList(res.data || []))
                .catch(() => toast.error('Failed to load staff list'));
        }
    }, [needsStaff]);

    const filteredStaff = useMemo(() => {
        const q = staffSearch.trim().toLowerCase();
        if (!q) return staffList;
        return staffList.filter((s) => (s.fullName || '').toLowerCase().includes(q));
    }, [staffList, staffSearch]);

    const [accounts, setAccounts] = useState([]);
    useEffect(() => {
        if (!isFullPayment) return;
        financeService
            .getAccounts()
            .then((data) => {
                setAccounts(data || []);
                if (!form.accountId && data?.length) {
                    setForm((prev) => ({ ...prev, accountId: data[0]._id }));
                }
            })
            .catch(() => toast.error('Failed to load accounts'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFullPayment]);

    const handleSubmit = async () => {
        if (!form.month) return toast.error('Month is required');
        if (!form.academicYear) return toast.error('Academic Year is required');

        if (needsStaff && !form.staffId) return toast.error('Employee is required');

        setLoading(true);
        try {
            if (isFullPayment && form.autoChargeAndPayment) {
                if (!form.accountId) return toast.error('Account is required');
                await financeService.payrollFullPayment({
                    scope: needsStaff ? 'single' : 'all',
                    month: form.month,
                    academicYear: form.academicYear,
                    staffId: needsStaff ? form.staffId : undefined,
                    accountId: form.accountId,
                    date: form.date,
                });
            } else {
                await financeService.payrollCharge({
                    chargeType: needsStaff ? 'single' : 'all',
                    month: form.month,
                    academicYear: form.academicYear,
                    staffId: needsStaff ? form.staffId : undefined,
                });
            }

            onSuccess?.();
            onClose?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-surface-200">
                <div className="p-6 border-b border-surface-100 bg-surface-50/40 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-surface-900 uppercase tracking-tight">Payroll Charge</h3>
                        <p className="text-xs text-surface-500 font-bold">Salary Charging Options</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all">
                        <X size={20} className="text-surface-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button
                            onClick={() => setChargeOption('all')}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${chargeOption === 'all' ? 'border-primary bg-primary/5' : 'border-surface-100 hover:border-surface-200'}`}
                        >
                            <div className="text-[10px] font-black uppercase tracking-widest text-surface-400">Option</div>
                            <div className="font-black text-surface-900">All Employees</div>
                        </button>
                        <button
                            onClick={() => setChargeOption('single')}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${chargeOption === 'single' ? 'border-primary bg-primary/5' : 'border-surface-100 hover:border-surface-200'}`}
                        >
                            <div className="text-[10px] font-black uppercase tracking-widest text-surface-400">Option</div>
                            <div className="font-black text-surface-900">Single Employee</div>
                        </button>
                        <button
                            onClick={() => setChargeOption('full')}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${chargeOption === 'full' ? 'border-primary bg-primary/5' : 'border-surface-100 hover:border-surface-200'}`}
                        >
                            <div className="text-[10px] font-black uppercase tracking-widest text-surface-400">Option</div>
                            <div className="font-black text-surface-900">Full Payment</div>
                            <div className="text-xs text-surface-500 font-bold">(Charge + Pay Automatically)</div>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Month</div>
                            <input
                                type="month"
                                value={form.month}
                                onChange={(e) => setForm((p) => ({ ...p, month: e.target.value }))}
                                className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Academic Year</div>
                            <select
                                value={form.academicYear}
                                onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))}
                                className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                            >
                                <option value="">Select Academic Year</option>
                                {academicYears.map((ay) => (
                                    <option key={ay._id} value={ay._id}>{ay.yearName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Auto charge + payment</div>
                            <label className="flex items-center gap-3 px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl">
                                <input
                                    type="checkbox"
                                    checked={form.autoChargeAndPayment}
                                    onChange={(e) => setForm((p) => ({ ...p, autoChargeAndPayment: e.target.checked }))}
                                    className="h-4 w-4"
                                    disabled={!isFullPayment}
                                />
                                <span className={`text-sm font-black ${isFullPayment ? 'text-surface-900' : 'text-surface-300'}`}>Enabled</span>
                            </label>
                        </div>
                    </div>

                    {needsStaff && (
                        <div className="space-y-3">
                            <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Employee</div>
                            <input
                                type="text"
                                value={staffSearch}
                                onChange={(e) => setStaffSearch(e.target.value)}
                                placeholder="Search employee..."
                                className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                            <div className="max-h-56 overflow-y-auto border border-surface-100 rounded-2xl divide-y divide-surface-100">
                                {filteredStaff.map((s) => (
                                    <button
                                        key={s._id}
                                        onClick={() => setForm((p) => ({ ...p, staffId: s._id }))}
                                        className={`w-full px-4 py-3 text-left hover:bg-surface-50 transition-all ${form.staffId === s._id ? 'bg-primary/5' : ''}`}
                                    >
                                        <div className="font-black text-surface-900">{s.fullName}</div>
                                        <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest">{s.employeeType || s.role || 'Employee'}</div>
                                    </button>
                                ))}
                                {filteredStaff.length === 0 && (
                                    <div className="px-4 py-6 text-center text-surface-400 font-bold">No employees found.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {isFullPayment && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Account</div>
                                <select
                                    value={form.accountId}
                                    onChange={(e) => setForm((p) => ({ ...p, accountId: e.target.value }))}
                                    className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                                >
                                    <option value="">Select Account</option>
                                    {accounts.map((acc) => (
                                        <option key={acc._id} value={acc._id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Date</div>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                                    className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-surface-100 bg-surface-50/40 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-3 bg-white border border-surface-200 text-surface-700 rounded-xl font-black uppercase text-[10px] tracking-widest hover:border-surface-300 transition-all"
                        disabled={loading}
                    >
                        Close
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-3 bg-surface-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
