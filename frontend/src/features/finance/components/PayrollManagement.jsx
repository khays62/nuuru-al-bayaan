import React, { useEffect, useMemo, useState } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import financeService from '../api/finance';

import PayrollChargeModal from './PayrollChargeModal';
import PayrollDeleteModal from './PayrollDeleteModal';
import PayrollEmployeeInfoModal from './PayrollEmployeeInfoModal';
import PayrollPrintModal from './PayrollPrintModal';
import PayrollUpdateModal from './PayrollUpdateModal';
import PayrollShowModal from './PayrollShowModal';

export default function PayrollManagement() {
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [academicYear, setAcademicYear] = useState('');
    const [academicYears, setAcademicYears] = useState([]);
    const [payrolls, setPayrolls] = useState([]);
    const [loading, setLoading] = useState(false);

    const [showCharge, setShowCharge] = useState(false);
    const [showUpdate, setShowUpdate] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [showEmployeeInfo, setShowEmployeeInfo] = useState(false);
    const [showUnpaid, setShowUnpaid] = useState(false);
    const [showPrint, setShowPrint] = useState(false);
    const [updateContext, setUpdateContext] = useState(null);
    const [infoStaffId, setInfoStaffId] = useState('');

    const fetchAcademicYears = async () => {
        try {
            const data = await financeService.getAcademicYears();
            const list = data || [];
            setAcademicYears(list);
            setAcademicYear(prev => prev || (list[0]?._id || ''));
        } catch {
            setAcademicYears([]);
        }
    };

    const fetchPayrolls = async () => {
        setLoading(true);
        try {
            const data = await financeService.getPayrolls({
                month,
                academicYear: academicYear || undefined,
            });
            setPayrolls(data || []);
        } catch {
            toast.error('Failed to load payroll data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAcademicYears();
    }, []);

    useEffect(() => {
        fetchPayrolls();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [month, academicYear]);

    const totalSalary = useMemo(
        () => (payrolls || []).reduce((sum, p) => sum + Number(p.netSalary || 0), 0),
        [payrolls]
    );

    const formatDate = (value) => {
        if (!value) return '-';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '-';
        return d.toISOString().slice(0, 10);
    };

    const formatEmployeeType = (staff) => {
        const raw = String(staff?.employeeType || staff?.role || '').trim();
        if (!raw) return '-';
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/40 flex flex-wrap gap-4 items-end justify-between">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="space-y-1">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Month</div>
                            <input
                                type="month"
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-blue-600/10 transition-all text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Year</div>
                            <select
                                value={academicYear}
                                onChange={(e) => setAcademicYear(e.target.value)}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-blue-600/10 transition-all text-sm min-w-[220px]"
                            >
                                {academicYears.map((ay) => (
                                    <option key={ay._id} value={ay._id}>{ay.yearName}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={fetchPayrolls}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all flex items-center gap-2"
                            title="Refresh"
                        >
                            <RefreshCw size={16} /> Refresh
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setShowCharge(true)}
                            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all"
                        >
                            Charge
                        </button>
                        <button
                            onClick={() => { setUpdateContext(null); setShowUpdate(true); }}
                            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-black uppercase text-[10px] tracking-widest hover:border-slate-300 transition-all"
                        >
                            Update
                        </button>
                        <button
                            onClick={() => setShowDelete(true)}
                            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-black uppercase text-[10px] tracking-widest hover:border-slate-300 transition-all"
                        >
                            Delete
                        </button>
                        <button
                            onClick={() => setShowUnpaid(true)}
                            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-black uppercase text-[10px] tracking-widest hover:border-slate-300 transition-all"
                        >
                            Show
                        </button>
                        <button
                            onClick={() => setShowPrint(true)}
                            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-black uppercase text-[10px] tracking-widest hover:border-slate-300 transition-all flex items-center gap-2"
                        >
                            <Printer size={14} /> Print
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-slate-100">
                                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">No</th>
                                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee Name</th>
                                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</th>
                                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee Type</th>
                                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Salary</th>
                                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Info</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="py-16 text-center text-slate-400 font-bold uppercase tracking-widest">Loading...</td>
                                </tr>
                            ) : (payrolls || []).length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="py-16 text-center text-slate-400 font-bold uppercase tracking-widest">No payroll entries found.</td>
                                </tr>
                            ) : (
                                (payrolls || []).map((p, idx) => (
                                    <tr key={p._id} className="hover:bg-slate-50 transition-all">
                                        <td className="py-3 px-6 text-sm text-slate-700">{formatDate(p.paymentDate || p.createdAt)}</td>
                                        <td className="py-3 px-4 text-sm text-slate-700">{idx + 1}</td>
                                        <td className="py-3 px-4 text-sm font-mono text-slate-500">{String(p.staff?.employeeId || p.staff?.username || p._id.slice(-6))}</td>
                                        <td className="py-3 px-6 text-sm font-bold text-slate-900 whitespace-nowrap">{p.staff?.fullName || '-'}</td>
                                        <td className="py-3 px-4 text-sm text-slate-700">{p.staff?.phone || '-'}</td>
                                        <td className="py-3 px-4 text-sm text-slate-700">{formatEmployeeType(p.staff)}</td>
                                        <td className="py-3 px-6 text-sm font-mono text-slate-900 text-right">{Number(p.netSalary || 0).toLocaleString()}</td>
                                        <td className="py-3 px-4 text-sm text-slate-700">{p.status || '-'}</td>
                                        <td className="py-3 px-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setInfoStaffId(p.staff?._id || '');
                                                    setShowEmployeeInfo(true);
                                                }}
                                                className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg font-black uppercase text-[10px] tracking-widest"
                                            >
                                                View Info
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-50/60 border-t border-slate-100">
                                <td className="py-4 px-6 text-sm font-black text-slate-700" colSpan="8">Total</td>
                                <td className="py-4 px-6 text-sm font-black font-mono text-slate-900 text-right">{totalSalary.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {showCharge && (
                <PayrollChargeModal
                    onClose={() => setShowCharge(false)}
                    onSuccess={() => { fetchPayrolls(); }}
                    defaultMonth={month}
                    academicYears={academicYears}
                    defaultAcademicYearId={academicYear}
                />
            )}

            {showUpdate && (
                <PayrollUpdateModal
                    onClose={() => { setShowUpdate(false); setUpdateContext(null); }}
                    onSuccess={() => { fetchPayrolls(); }}
                    defaultMonth={month}
                    academicYears={academicYears}
                    defaultAcademicYearId={academicYear}
                    initialEmployeeId={updateContext?.employee}
                    initialMonth={updateContext?.month}
                    initialAcademicYearId={updateContext?.academicYear}
                />
            )}

            {showDelete && (
                <PayrollDeleteModal
                    onClose={() => setShowDelete(false)}
                    onSuccess={() => { fetchPayrolls(); }}
                    defaultMonth={month}
                    academicYears={academicYears}
                    defaultAcademicYearId={academicYear}
                />
            )}

            {showEmployeeInfo && (
                <PayrollEmployeeInfoModal
                    onClose={() => setShowEmployeeInfo(false)}
                    onRefresh={() => fetchPayrolls()}
                    academicYears={academicYears}
                    defaultAcademicYearId={academicYear}
                    initialStaffId={infoStaffId}
                    onOpenUpdate={(ctx) => {
                        setUpdateContext(ctx);
                        setShowEmployeeInfo(false);
                        setShowUpdate(true);
                    }}
                />
            )}

            {showUnpaid && (
                <PayrollShowModal
                    onClose={() => setShowUnpaid(false)}
                    month={month}
                    academicYear={academicYear}
                    academicYears={academicYears}
                    onOpenInfo={(staffId) => {
                        setInfoStaffId(staffId || '');
                        setShowUnpaid(false);
                        setShowEmployeeInfo(true);
                    }}
                />
            )}

            {showPrint && (
                <PayrollPrintModal
                    onClose={() => setShowPrint(false)}
                    defaultMonth={month}
                    academicYears={academicYears}
                    defaultAcademicYearId={academicYear}
                />
            )}
        </div>
    );
}
