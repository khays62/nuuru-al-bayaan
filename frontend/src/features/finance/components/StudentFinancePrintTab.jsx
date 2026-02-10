import React, { useState, useEffect } from 'react';
import { Search, Printer, FileText, UserCheck, ShieldCheck, Download } from 'lucide-react';
import financeService from '../api/finance';
import { listGradeSections } from '../../grades/api/gradeSections';
import { openMonthlyInvoicesPreview, openDailyAuditPreview, openPasscardsPreview } from './PrintModals';
import toast from 'react-hot-toast';

export default function StudentFinancePrintTab() {
    const [classId, setClassId] = useState('');
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState([]);

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
                if (!classId && list.length > 0) {
                    setClassId(list[0]?._id || '');
                }
            } catch (error) {
                console.error("Failed to load classes", error);
            }
        };
        fetchClasses();
    }, [classId]);

    const fetchStudentsByClass = async () => {
        if (!classId) return;
        setLoading(true);
        try {
            const response = await financeService.getInvoices({ classId });
            const data = Array.isArray(response)
                ? response
                : (response?.data || response?.data?.data || []);

            // Group by student
            const studentMap = {};
            data.forEach(inv => {
                const sid = inv.student._id;
                if (!studentMap[sid]) {
                    studentMap[sid] = {
                        student: inv.student,
                        totalBalance: 0,
                        invoices: []
                    };
                }
                studentMap[sid].totalBalance += (inv.amount - inv.paidAmount);
                studentMap[sid].invoices.push(inv);
            });

            const studentList = Object.values(studentMap);
            setStudents(studentList);
            setSelectedStudents(studentList.map(s => s.student._id)); // Select all by default
        } catch {
            toast.error("Failed to fetch students for this class");
        } finally {
            setLoading(false);
        }
    };

    const toggleStudent = (id) => {
        setSelectedStudents(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handlePrintDailyAudit = () => {
        const selectedData = students.filter(s => selectedStudents.includes(s.student._id));
        if (selectedData.length === 0) return toast.error("Select at least one student");
        openDailyAuditPreview({ students: selectedData });
    };

    const handlePrintMonthlyInvoices = () => {
        const selectedData = students.filter(s => selectedStudents.includes(s.student._id));
        if (selectedData.length === 0) return toast.error("Select at least one student");
        openMonthlyInvoicesPreview({ students: selectedData });
    };

    const handlePrintPasscards = () => {
        const selectedData = students.filter(s => selectedStudents.includes(s.student._id));
        if (selectedData.length === 0) return toast.error("Select at least one student");
        openPasscardsPreview({ students: selectedData });
    };

    return (
        <div className="p-8 space-y-8 bg-slate-50/30 min-h-screen">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-600/20">
                        <Printer size={24} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Finance Reporting Hub</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Bulk Invoice & Audit Processing</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3 space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-end gap-6">
                        <div className="flex-1 space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Academic Tier / Class</label>
                            <select
                                className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs uppercase outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                value={classId}
                                onChange={e => setClassId(e.target.value)}
                            >
                                <option value="">Target Class Level</option>
                                {classes.map(cls => {
                                    const gradeLabel = cls.grade?.gradeName || cls.grade?.name || cls.gradeName || '';
                                    const sectionLabel = cls.section || cls.name || '';
                                    const label = `${gradeLabel}${sectionLabel ? ` - ${sectionLabel}` : ''}`.trim();
                                    return (
                                        <option key={cls._id} value={cls._id}>{label || '—'}</option>
                                    );
                                })}
                            </select>
                        </div>
                        <button
                            onClick={fetchStudentsByClass}
                            className="h-14 px-10 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            Fetch Register
                        </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Class Census: {students.length} Students</h4>
                            <div className="flex gap-4">
                                <button onClick={() => setSelectedStudents(students.map(s => s.student._id))} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Select All</button>
                                <button onClick={() => setSelectedStudents([])} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:underline">Clear Selection</button>
                            </div>
                        </div>
                        <div className="max-h-[600px] overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        <th className="p-4 pl-8">Selection</th>
                                        <th className="p-4">Student ID</th>
                                        <th className="p-4">Full Name</th>
                                        <th className="p-4 text-right pr-8">Balance Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan="4" className="p-20 text-center text-slate-400 font-bold italic tracking-widest uppercase">Streaming Registry Data...</td></tr>
                                    ) : students.length === 0 ? (
                                        <tr><td colSpan="4" className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest italic">Target a class to begin reporting.</td></tr>
                                    ) : (
                                        students.map(row => (
                                            <tr key={row.student._id} onClick={() => toggleStudent(row.student._id)} className="hover:bg-blue-50/30 cursor-pointer transition-colors group">
                                                <td className="p-4 pl-8">
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedStudents.includes(row.student._id) ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/20' : 'border-slate-200 bg-white'}`}>
                                                        {selectedStudents.includes(row.student._id) && <UserCheck size={14} className="text-white" />}
                                                    </div>
                                                </td>
                                                <td className="p-4 font-mono text-xs font-bold text-slate-500">{row.student.studentId}</td>
                                                <td className="p-4 font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{row.student.fullName}</td>
                                                <td className="p-4 text-right pr-8 font-black tabular-nums transition-colors ${row.totalBalance > 0 ? 'text-red-500' : 'text-green-600'}">
                                                    ${Number(row.totalBalance).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center border-b border-slate-100 pb-4">Report Generation Tools</h4>

                        <button
                            onClick={handlePrintMonthlyInvoices}
                            className="w-full group mt-4 h-24 bg-slate-50 hover:bg-white border-2 border-transparent hover:border-blue-600 rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all hover:shadow-2xl hover:-translate-y-1"
                        >
                            <FileText className="text-blue-600 group-hover:scale-110 transition-transform" size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Monthly Invoices</span>
                        </button>

                        <button
                            onClick={handlePrintDailyAudit}
                            className="w-full group h-24 bg-slate-50 hover:bg-white border-2 border-transparent hover:border-amber-500 rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all hover:shadow-2xl hover:-translate-y-1"
                        >
                            <ShieldCheck className="text-amber-500 group-hover:scale-110 transition-transform" size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Daily Audit Ledger</span>
                        </button>

                        <button
                            onClick={handlePrintPasscards}
                            className="w-full group h-24 bg-slate-50 hover:bg-white border-2 border-transparent hover:border-purple-600 rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all hover:shadow-2xl hover:-translate-y-1"
                        >
                            <Download className="text-purple-600 group-hover:scale-110 transition-transform" size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Enrollment Passcards</span>
                        </button>
                    </div>

                    <div className="bg-blue-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                        <h5 className="font-black uppercase tracking-[0.2em] text-[10px] text-blue-300 mb-4">Print Queue Advice</h5>
                        <p className="text-xs text-blue-100 leading-relaxed opacity-80">
                            Bulk printing multiple invoices may take up to 30 seconds to render high-resolution institutional watermarks.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
