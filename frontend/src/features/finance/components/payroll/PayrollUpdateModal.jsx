import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import financeService from '../../api/finance';
import axios from '../../api/axios';

export default function PayrollUpdateModal({
    onClose,
    onSuccess,
    defaultMonth,
    academicYears,
    defaultAcademicYear
}) {
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [staffSearch, setStaffSearch] = useState('');

    const [form, setForm] = useState({
        updateType: 'salary',
        staffId: '',
        month: defaultMonth || new Date().toISOString().slice(0, 7),
        academicYear: defaultAcademicYear || '',
        amount: 0,
    });

    useEffect(() => {
        axios
            .get('/staff')
            .then((res) => setStaffList(res.data || []))
            .catch(() => toast.error('Failed to load staff list'));
    }, []);

    const filteredStaff = useMemo(() => {
        const q = staffSearch.trim().toLowerCase();
        if (!q) return staffList;
        return staffList.filter((s) => (s.fullName || '').toLowerCase().includes(q));
    }, [staffList, staffSearch]);

    const handleSave = async () => {
        if (!form.staffId) return toast.error('Employee is required');
        if (!form.month) return toast.error('Month is required');
        if (!form.academicYear) return toast.error('Academic Year is required');

        setLoading(true);
        try {
            const payrolls = await financeService.getPayrolls({
                month: form.month,
                academicYear: form.academicYear,
            });

            const payroll = (payrolls || []).find((p) => p.staff?._id === form.staffId);
            if (!payroll) return toast.error('No payroll record found for this employee/month/year');

            const payload = {};
            if (form.updateType === 'salary') payload.basicSalary = Number(form.amount || 0);
            if (form.updateType === 'commission') payload.commission = Number(form.amount || 0);
            if (form.updateType === 'decrease') payload.decrease = Number(form.amount || 0);

            await financeService.adjustPayroll(payroll._id, payload);

            onSuccess?.();
            onClose?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-(--nb-color-bg-card) w-full max-w-2xl rounded-2xl shadow-(--nb-shadow-md) overflow-hidden border border-(--nb-color-border)">
                <div className="p-6 border-b border-(--nb-color-border) bg-(--nb-color-bg) flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-(--nb-color-fg) uppercase tracking-tight">Payroll Update</h3>
                        <p className="text-xs text-(--nb-color-muted) font-bold">Update Types: Salary Charge, Commission, Salary Decrease</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-(--nb-color-bg-card) rounded-xl transition-all">
                        <X size={20} className="text-(--nb-color-muted)" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <div className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest">Update Type</div>
                            <select
                                value={form.updateType}
                                onChange={(e) => setForm((p) => ({ ...p, updateType: e.target.value }))}
                                className="w-full px-4 py-3 bg-(--nb-color-bg-card) text-(--nb-color-fg) border border-(--nb-color-border) rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                            >
                                <option value="salary">Salary Charge</option>
                                <option value="commission">Commission</option>
                                <option value="decrease">Salary Decrease</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest">Amount</div>
                            <input
                                type="number"
                                value={form.amount}
                                onChange={(e) => setForm((p) => ({ ...p, amount: Number(e.target.value) }))}
                                className="w-full px-4 py-3 bg-(--nb-color-bg-card) text-(--nb-color-fg) border border-(--nb-color-border) rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <div className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest">Month</div>
                            <input
                                type="month"
                                value={form.month}
                                onChange={(e) => setForm((p) => ({ ...p, month: e.target.value }))}
                                className="w-full px-4 py-3 bg-(--nb-color-bg-card) text-(--nb-color-fg) border border-(--nb-color-border) rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest">Academic Year</div>
                            <select
                                value={form.academicYear}
                                onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))}
                                className="w-full px-4 py-3 bg-(--nb-color-bg-card) text-(--nb-color-fg) border border-(--nb-color-border) rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                            >
                                <option value="">Select Academic Year</option>
                                {academicYears.map((ay) => (
                                    <option key={ay._id} value={ay._id}>{ay.yearName}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest">Employee</div>
                        <input
                            type="text"
                            value={staffSearch}
                            onChange={(e) => setStaffSearch(e.target.value)}
                            placeholder="Search employee..."
                            className="w-full px-4 py-3 bg-(--nb-color-bg-card) text-(--nb-color-fg) border border-(--nb-color-border) rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                        />
                        <div className="max-h-56 overflow-y-auto border border-(--nb-color-border) rounded-2xl divide-y divide-(--nb-color-border)">
                            {filteredStaff.map((s) => (
                                <button
                                    key={s._id}
                                    onClick={() => setForm((p) => ({ ...p, staffId: s._id }))}
                                    className={`w-full px-4 py-3 text-left hover:bg-(--nb-color-bg) transition-all ${form.staffId === s._id ? 'bg-primary/5' : ''}`}
                                >
                                    <div className="font-black text-(--nb-color-fg)">{s.fullName}</div>
                                    <div className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest">{s.employeeType || s.role || 'Employee'}</div>
                                </button>
                            ))}
                            {filteredStaff.length === 0 && (
                                <div className="px-4 py-6 text-center text-(--nb-color-muted) font-bold">No employees found.</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-(--nb-color-border) bg-(--nb-color-bg) flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-3 bg-(--nb-color-bg-card) border border-(--nb-color-border) text-(--nb-color-fg) rounded-xl font-black uppercase text-[10px] tracking-widest hover:border-(--nb-color-focus) transition-all"
                        disabled={loading}
                    >
                        Close
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-3 bg-(--nb-color-brand) text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:opacity-90 transition-all"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
