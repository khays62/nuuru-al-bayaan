import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import financeService from '../api/finance';

export default function PayrollShowModal({
    onClose,
    month,
    academicYear,
    academicYears,
    onOpenInfo,
}) {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);

    const academicYearName = useMemo(
        () => academicYears.find((y) => y._id === academicYear)?.yearName || '',
        [academicYears, academicYear]
    );

    const load = async () => {
        if (!month || !academicYear) {
            setRows([]);
            return;
        }
        setLoading(true);
        try {
            const data = await financeService.getPayrolls({ month, academicYear });
            const unpaid = (data || []).filter((p) => p.status !== 'Paid');
            setRows(unpaid);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load unpaid salaries');
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [month, academicYear]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden border border-slate-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/30">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Unpaid Salaries</h3>
                        <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">{month} {academicYearName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm">
                        <X size={22} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="text-xs text-slate-500 font-mono uppercase tracking-widest">
                        Charge salaries first to populate this list.
                    </div>

                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-slate-100">
                                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee Name</th>
                                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</th>
                                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance</th>
                                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Info</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest">Loading...</td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest">No unpaid salaries found.</td>
                                    </tr>
                                ) : (
                                    rows.map((p) => (
                                        <tr key={p._id} className="hover:bg-slate-50">
                                            <td className="py-3 px-4 text-sm font-mono text-slate-600">
                                                {String(p.staff?.employeeId || p.staff?.username || p._id.slice(-6))}
                                            </td>
                                            <td className="py-3 px-4 text-sm font-bold text-slate-900 whitespace-nowrap">{p.staff?.fullName || '-'}</td>
                                            <td className="py-3 px-4 text-sm text-slate-700">{p.staff?.phone || '-'}</td>
                                            <td className="py-3 px-4 text-sm font-mono text-slate-900">{Number(p.netSalary || 0).toLocaleString()}</td>
                                            <td className="py-3 px-4">
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenInfo?.(p.staff?._id)}
                                                    className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg font-black uppercase text-[10px] tracking-widest"
                                                >
                                                    Info
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-[0.2em]"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
