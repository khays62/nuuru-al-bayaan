import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import financeService from '../api/finance';
import axios from '../api/axios';

export default function PayrollUpdateModal({
    onClose,
    onSuccess,
    defaultMonth,
    academicYears,
    defaultAcademicYearId,
    initialEmployeeId,
    initialMonth,
    initialAcademicYearId,
}) {
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState([]);

    const [form, setForm] = useState({
        updateType: 'salaryCharge', // salaryCharge | commission | salaryDecrease
        employee: initialEmployeeId || '',
        month: initialMonth || defaultMonth,
        academicYear: initialAcademicYearId || defaultAcademicYearId || '',
        amount: '',
    });

    useEffect(() => {
        const load = async () => {
            try {
                const res = await axios.get('/users', { params: { status: 'active', includeTeachers: true } });
                setStaffList((res.data || []).filter(u => u.status !== 'inactive'));
            } catch {
                setStaffList([]);
            }
        };
        load();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.employee) return toast.error('Employee is required');
        if (!form.month) return toast.error('Month is required');
        if (!form.academicYear) return toast.error('Academic Year is required');
        if (form.amount === '') return toast.error('Amount is required');

        setLoading(true);
        try {
            await financeService.updatePayrollByParams({
                employee: form.employee,
                month: form.month,
                academicYear: form.academicYear,
                updateType: form.updateType,
                amount: Number(form.amount),
            });
            toast.success('Payroll updated');
            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-slate-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/30">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Payroll Update</h3>
                        <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">Salary Charge / Commission / Decrease</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm">
                        <X size={22} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Type</label>
                            <select
                                value={form.updateType}
                                onChange={(e) => setForm(prev => ({ ...prev, updateType: e.target.value }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                            >
                                <option value="salaryCharge">Salary Charge</option>
                                <option value="commission">Commission</option>
                                <option value="salaryDecrease">Salary Decrease</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</label>
                            <input
                                type="number"
                                value={form.amount}
                                onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                            />
                        </div>
                    </div>

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

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</label>
                        <select
                            value={form.employee}
                            onChange={(e) => setForm(prev => ({ ...prev, employee: e.target.value }))}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                        >
                            <option value="">Select Employee</option>
                            {staffList.map(s => (
                                <option key={s._id} value={s._id}>{s.fullName}</option>
                            ))}
                        </select>
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
                            disabled={loading}
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
