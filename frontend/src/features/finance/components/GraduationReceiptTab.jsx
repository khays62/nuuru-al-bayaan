import React, { useState, useEffect } from 'react';
import { Search, GraduationCap, Info } from 'lucide-react';
import financeService from '../api/finance';
import { listGradeSections } from '../../grades/api/gradeSections';
import toast from 'react-hot-toast';
import GraduationPaymentModal from './GraduationPaymentModal';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';

export default function GraduationReceiptTab() {
    const [search, setSearch] = useState('');
    const [classId, setClassId] = useState('');
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedStudentRow, setSelectedStudentRow] = useState(null);
    const [showGradModal, setShowGradModal] = useState(false);

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
            // Only include students who have 1 or more graduation related invoices
            const studentMap = {};
            data.forEach(inv => {
                const isGrad = inv.title?.toLowerCase().includes('graduat') || inv.category?.name?.toLowerCase().includes('graduat');
                if (!isGrad) return;

                const sid = inv.student._id;
                if (!studentMap[sid]) {
                    studentMap[sid] = {
                        student: inv.student,
                        gradBalance: 0,
                        invoices: []
                    };
                }
                studentMap[sid].gradBalance += (inv.amount - inv.paidAmount);
                studentMap[sid].invoices.push(inv);
            });

            setStudents(Object.values(studentMap));
        } catch {
            toast.error("Failed to fetch graduation records");
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            key: 'id',
            label: 'ID',
            render: (row) => (
                <span className="font-mono text-xs font-bold text-surface-500">{row.student?.studentId || '—'}</span>
            ),
        },
        {
            key: 'name',
            label: 'Student Name',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-surface-900">{row.student?.fullName || '—'}</span>
                    {row.student?.studentId ? (
                        <span className="text-[10px] text-purple-600 font-black uppercase tracking-widest">
                            Candidate #{String(row.student.studentId).slice(-4)}
                        </span>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'contact',
            label: 'Contact',
            render: (row) => row.student?.phoneNumber || '—',
        },
        {
            key: 'class',
            label: 'Class',
            render: (row) => (
                <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-[10px] font-black uppercase tracking-tight border border-purple-100 italic">
                    {row.student?.currentClass || 'GRADUATE'}
                </span>
            ),
        },
        {
            key: 'balance',
            label: 'Grad Balance',
            align: 'right',
            render: (row) => (
                <span className={`font-black text-sm ${Number(row.gradBalance || 0) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    ${Number(row.gradBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
            ),
        },
        {
            key: 'info',
            label: 'Info',
            align: 'center',
            tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200 text-center',
            render: (row) => (
                <button
                    onClick={() => { setSelectedStudentRow(row); setShowGradModal(true); }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all hover:shadow-lg active:scale-95"
                >
                    View Info
                </button>
            ),
        },
    ];

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                        <input
                            type="text"
                            className="w-full h-11 pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                            placeholder="Search Graduate Student Name or ID..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </form>
                <select
                    className="h-11 px-4 border rounded-xl outline-none focus:ring-4 focus:ring-primary/10 bg-white min-w-50 font-bold text-sm"
                    value={classId}
                    onChange={e => setClassId(e.target.value)}
                >
                    <option value="">By Graduating Class</option>
                    {classes.map(cls => {
                        const gradeLabel = cls.grade?.gradeName || cls.grade?.name || cls.gradeName || '';
                        const sectionLabel = cls.section || cls.name || '';
                        const label = `${gradeLabel}${sectionLabel ? ` - ${sectionLabel}` : ''}`.trim();
                        return (
                            <option key={cls._id} value={cls._id}>{label || '—'}</option>
                        );
                    })}
                </select>
                <button onClick={handleSearch} className="h-11 bg-purple-600 text-white px-8 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-purple-600/20 transition-all active:scale-95">Go</button>
            </div>

            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <StandardTable
                    isLoading={loading}
                    loadingMessage="Syncing Clearance Registry..."
                    items={students}
                    rows={students}
                    columns={columns}
                    storageKey="finance:graduation:students"
                    getRowKey={(row) => row.student?._id}
                    emptyTitle="No graduation records detected"
                    emptyDescription="No graduation records detected for this selection."
                    tableProps={{ shellClassName: 'ring-0 shadow-none rounded-none' }}
                />
            </div>

            {showGradModal && (
                <GraduationPaymentModal
                    student={selectedStudentRow?.student}
                    row={selectedStudentRow}
                    onClose={() => setShowGradModal(false)}
                    onSuccess={handleSearch}
                />
            )}
        </div>
    );
}
