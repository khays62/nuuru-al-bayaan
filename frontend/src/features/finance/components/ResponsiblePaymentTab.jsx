import React, { useState, useEffect } from 'react';
import { Search, Users, DollarSign, Printer, PlusCircle, Trash2, FileText, Info } from 'lucide-react';
import financeService from '../api/finance';
import { listGradeSections } from '../../grades/api/gradeSections';
import toast from 'react-hot-toast';
import StudentResponsibilityModal from './StudentResponsibilityModal';

export default function ResponsiblePaymentTab() {
    const [search, setSearch] = useState('');
    const [classId, setClassId] = useState('');
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedStudentRow, setSelectedStudentRow] = useState(null);
    const [showInfoModal, setShowInfoModal] = useState(false);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const normalize = (payload) => Array.isArray(payload)
                    ? payload
                    : (payload?.data?.data || payload?.data || []);
                const res = await listGradeSections({ limit: 100 });
                let list = normalize(res);
                if (list.length === 0) {
                    try {
                        const fallback = await financeService.getGradeSections({ limit: 100 });
                        list = normalize(fallback);
                    } catch {
                        // ignore
                    }
                }
                setClasses(list);
            } catch (error) {
                console.error("Failed to load classes", error);
            }
        };
        fetchClasses();
    }, []);

    const handleSearch = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setLoading(true);
        try {
            const params = { search, classId };
            const response = await financeService.getInvoices(params);
            const data = response.data || [];

            // Group by student for the list view
            const studentMap = {};
            data.forEach(inv => {
                const sid = inv.student._id;
                if (!studentMap[sid]) {
                    studentMap[sid] = {
                        student: inv.student,
                        totalBalance: 0,
                        dueDate: inv.dueDate,
                        invoices: []
                    };
                }
                studentMap[sid].totalBalance += (inv.amount - inv.paidAmount);
                studentMap[sid].invoices.push(inv);
            });

            setStudents(Object.values(studentMap));
        } catch {
            toast.error("Failed to fetch student balances");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                        <input
                            type="text"
                            className="w-full h-11 pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-4 focus:ring-blue-600/10 transition-all font-medium"
                            placeholder="Search Responsible Name, ID or Phone..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </form>
                <select
                    className="h-11 px-4 border rounded-xl outline-none focus:ring-4 focus:ring-blue-600/10 bg-white min-w-[200px] font-bold text-sm"
                    value={classId}
                    onChange={e => setClassId(e.target.value)}
                >
                    <option value="">By Class Level</option>
                    {classes.map(cls => {
                        const gradeLabel = cls.grade?.gradeName || cls.grade?.name || cls.gradeName || '';
                        const sectionLabel = cls.section || cls.name || '';
                        const label = `${gradeLabel}${sectionLabel ? ` - ${sectionLabel}` : ''}`.trim();
                        return (
                            <option key={cls._id} value={cls._id}>{label || '—'}</option>
                        );
                    })}
                </select>
                <button onClick={handleSearch} className="h-11 bg-blue-600 text-white px-8 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95">Go</button>
            </div>

            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            <th className="p-4 pl-6">ID</th>
                            <th className="p-4">Student Name</th>
                            <th className="p-4">Contact</th>
                            <th className="p-4">Class</th>
                            <th className="p-4 text-right">Balance</th>
                            <th className="p-4 text-center">Info</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-bold italic tracking-widest uppercase">Syncing Matrix...</td></tr>
                        ) : students.length === 0 ? (
                            <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-medium">No records found for this selection.</td></tr>
                        ) : (
                            students.map(row => (
                                <tr key={row.student._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 pl-6 font-mono text-xs font-bold text-slate-500">{row.student.studentId}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900">{row.student.fullName}</span>
                                            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">Reg: {new Date(row.student.admissionDate).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-600 text-sm font-medium">{row.student.phoneNumber || row.student.contactNumber || '—'}</td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-tight border border-slate-200">
                                            {row.student.currentClass || '—'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className={`font-black text-sm ${row.totalBalance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                            ${Number(row.totalBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => { setSelectedStudentRow(row); setShowInfoModal(true); }}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all hover:shadow-lg active:scale-95"
                                        >
                                            View Info
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showInfoModal && (
                <StudentResponsibilityModal
                    student={selectedStudentRow?.student}
                    row={selectedStudentRow}
                    onClose={() => setShowInfoModal(false)}
                    onSuccess={handleSearch}
                />
            )}
        </div>
    );
}
