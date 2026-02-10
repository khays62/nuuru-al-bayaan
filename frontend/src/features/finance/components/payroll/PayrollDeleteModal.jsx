import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import financeService from '../../api/finance';
import axios from '../../api/axios';

export default function PayrollDeleteModal({
    onClose,
    onSuccess,
    defaultMonth,
    academicYears,
    defaultAcademicYear
}) {
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [staffSearch, setStaffSearch] = useState('');

    const [deleteType, setDeleteType] = useState('all');

    const [form, setForm] = useState({
        staffId: '',
        month: defaultMonth || new Date().toISOString().slice(0, 7),
        academicYear: defaultAcademicYear || '',
    });

    const needsStaff = deleteType === 'single';

    useEffect(() => {
        if (!needsStaff) return;
        axios
            .get('/staff')
            .then((res) => setStaffList(res.data || []))
            .catch(() => toast.error('Failed to load staff list'));
    }, [needsStaff]);

    const filteredStaff = useMemo(() => {
        const q = staffSearch.trim().toLowerCase();
        if (!q) return staffList;
        return staffList.filter((s) => (s.fullName || '').toLowerCase().includes(q));
    }, [staffList, staffSearch]);

    const handleDelete = async () => {
        if (!form.month) return toast.error('Month is required');
        if (!form.academicYear) return toast.error('Academic Year is required');
        if (needsStaff && !form.staffId) return toast.error('Employee is required');

        if (!window.confirm('Are you sure?')) return;

        setLoading(true);
        try {
            await financeService.deletePayrollCharges({
                deleteType,
                month: form.month,
                academicYear: form.academicYear,
                staffId: needsStaff ? form.staffId : undefined,
            });
            onSuccess?.();
            onClose?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Delete failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                <div className="p-6 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Payroll Delete</h3>
                        <p className="text-xs text-slate-500 font-bold">Delete All Charges / Delete Single Charge</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                            onClick={() => setDeleteType('all')}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${deleteType === 'all' ? 'border-blue-600 bg-blue-600/5' : 'border-slate-100 hover:border-slate-200'}`}
                        >
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Delete Type</div>
                            <div className="font-black text-slate-900">Delete All Charges</div>
                        </button>
                        <button
                            onClick={() => setDeleteType('single')}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${deleteType === 'single' ? 'border-blue-600 bg-blue-600/5' : 'border-slate-100 hover:border-slate-200'}`}
                        >
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Delete Type</div>
                            <div className="font-black text-slate-900">Delete Single Charge</div>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Month</div>
                            <input
                                type="month"
                                value={form.month}
                                onChange={(e) => setForm((p) => ({ ...p, month: e.target.value }))}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-blue-600/10 transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Year</div>
                            <select
                                value={form.academicYear}
                                onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-blue-600/10 transition-all"
                            >
                                <option value="">Select Academic Year</option>
                                {academicYears.map((ay) => (
                                    <option key={ay._id} value={ay._id}>{ay.yearName}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {needsStaff && (
                        <div className="space-y-3">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</div>
                            <input
                                type="text"
                                value={staffSearch}
                                onChange={(e) => setStaffSearch(e.target.value)}
                                placeholder="Search employee..."
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-blue-600/10 transition-all"
                            />
                            <div className="max-h-56 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100">
                                {filteredStaff.map((s) => (
                                    <button
                                        key={s._id}
                                        onClick={() => setForm((p) => ({ ...p, staffId: s._id }))}
                                        className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-all ${form.staffId === s._id ? 'bg-blue-600/5' : ''}`}
                                    >
                                        <div className="font-black text-slate-900">{s.fullName}</div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.employeeType || s.role || 'Employee'}</div>
                                    </button>
                                ))}
                                {filteredStaff.length === 0 && (
                                    <div className="px-4 py-6 text-center text-slate-400 font-bold">No employees found.</div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Required: Employee (for single), Month, Academic Year
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/40 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black uppercase text-[10px] tracking-widest hover:border-slate-300 transition-all"
                        disabled={loading}
                    >
                        Close
                    </button>
                    <button
                        onClick={handleDelete}
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all"
                        disabled={loading}
                    >
                        {loading ? 'Deleting...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
