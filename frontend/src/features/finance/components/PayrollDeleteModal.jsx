import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import financeService from '../api/finance';
import axios from '../api/axios';

export default function PayrollDeleteModal({
    onClose,
    onSuccess,
    defaultMonth,
    academicYears,
    defaultAcademicYearId,
}) {
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState([]);

    const [form, setForm] = useState({
        deleteType: 'all', // all | single
        staffId: '',
        month: defaultMonth,
        academicYear: defaultAcademicYearId || '',
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
        if (!form.month) return toast.error('Month is required');
        if (!form.academicYear) return toast.error('Academic Year is required');
        if (form.deleteType === 'single' && !form.staffId) return toast.error('Employee is required');

        if (!window.confirm('Are you sure? This will delete charges (not Paid).')) return;

        setLoading(true);
        try {
            await financeService.deletePayrollCharges({
                deleteType: form.deleteType,
                month: form.month,
                academicYear: form.academicYear,
                staffId: form.deleteType === 'single' ? form.staffId : undefined,
            });
            toast.success('Deleted');
            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Delete failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-slate-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/30">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Payroll Delete</h3>
                        <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">Delete All / Delete Single</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm">
                        <X size={22} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delete Type</label>
                            <select
                                value={form.deleteType}
                                onChange={(e) => setForm(prev => ({ ...prev, deleteType: e.target.value, staffId: '' }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                            >
                                <option value="all">Delete All Charges</option>
                                <option value="single">Delete Single Charge</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Month</label>
                            <input
                                type="month"
                                value={form.month}
                                onChange={(e) => setForm(prev => ({ ...prev, month: e.target.value }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee (required for single)</label>
                            <select
                                value={form.staffId}
                                disabled={form.deleteType !== 'single'}
                                onChange={(e) => setForm(prev => ({ ...prev, staffId: e.target.value }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold disabled:opacity-50"
                            >
                                <option value="">Select Employee</option>
                                {staffList.map(s => (
                                    <option key={s._id} value={s._id}>{s.fullName}</option>
                                ))}
                            </select>
                        </div>
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
                            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] disabled:opacity-50"
                        >
                            {loading ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
