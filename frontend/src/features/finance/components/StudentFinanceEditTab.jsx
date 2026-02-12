import React, { useState, useEffect } from 'react';
import { Search, Edit, Info, Users } from 'lucide-react';
import financeService from '../api/finance';
import { listGradeSections } from '../../grades/api/gradeSections';
import toast from 'react-hot-toast';
import UpdateChargeModal from './UpdateChargeModal';
import { useInvoicesQuery } from '../hooks/studentFinanceHooks';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';

export default function StudentFinanceEditTab() {
    const [search, setSearch] = useState('');
    const [classId, setClassId] = useState('');
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submittedParams, setSubmittedParams] = useState({});
    const [selectedStudentRow, setSelectedStudentRow] = useState(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

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

    const invoicesQuery = useInvoicesQuery(submittedParams, { enabled: true });

    useEffect(() => {
        setLoading(Boolean(invoicesQuery.isFetching));
    }, [invoicesQuery.isFetching]);

    useEffect(() => {
        if (!invoicesQuery.isError) return;
        toast.error('Failed to fetch student records');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invoicesQuery.isError]);

    useEffect(() => {
        const response = invoicesQuery.data;
        const data = Array.isArray(response)
            ? response
            : (Array.isArray(response?.data) ? response.data : (response?.data?.data || []));

        const studentMap = {};
        (data || []).forEach(inv => {
            const sid = inv?.student?._id;
            if (!sid) return;
            if (!studentMap[sid]) {
                studentMap[sid] = {
                    student: inv.student,
                    totalBalance: 0,
                    invoices: []
                };
            }
            studentMap[sid].totalBalance += (Number(inv.amount || 0) - Number(inv.paidAmount || 0));
            studentMap[sid].invoices.push(inv);
        });

        setStudents(Object.values(studentMap));
    }, [invoicesQuery.data]);

    const handleSearch = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const params = {};
        if (search) params.search = search;
        if (classId) params.classId = classId;
        setSubmittedParams(params);
    };

    const columns = [
        {
            key: 'id',
            label: 'ID',
            render: (row) => (
                <span className="font-mono text-xs font-bold text-slate-500">{row.student?.studentId || '—'}</span>
            ),
        },
        {
            key: 'name',
            label: 'Student Name',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-900">{row.student?.fullName || '—'}</span>
                    {row.student?.admissionDate ? (
                        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">
                            Reg: {new Date(row.student.admissionDate).toLocaleDateString()}
                        </span>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'contact',
            label: 'Contact',
            render: (row) => row.student?.phoneNumber || row.student?.contactNumber || '—',
        },
        {
            key: 'class',
            label: 'Class',
            render: (row) => (
                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-tight border border-slate-200">
                    {row.student?.currentClass || '—'}
                </span>
            ),
        },
        {
            key: 'balance',
            label: 'Balance',
            align: 'right',
            render: (row) => (
                <span className={`font-black text-sm ${Number(row.totalBalance || 0) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    ${Number(row.totalBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                    onClick={() => { setSelectedStudentRow(row); setShowUpdateModal(true); }}
                    className="bg-amber-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all hover:shadow-lg active:scale-95"
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
                            className="w-full h-11 pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-4 focus:ring-blue-600/10 transition-all font-medium"
                            placeholder="Search Student ID, Name or Phone..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </form>
                <select
                    className="h-11 px-4 border rounded-xl outline-none focus:ring-4 focus:ring-blue-600/10 bg-white min-w-50 font-bold text-sm"
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
                <StandardTable
                    isLoading={loading}
                    loadingMessage="Fetching Profiles..."
                    items={students}
                    rows={students}
                    columns={columns}
                    storageKey="finance:student-finance:edit"
                    getRowKey={(row) => row.student?._id}
                    emptyTitle="No records found"
                    emptyDescription="No records found for this selection."
                    tableProps={{ shellClassName: 'ring-0 shadow-none rounded-none' }}
                />
            </div>

            {showUpdateModal && (
                <UpdateChargeModal
                    student={selectedStudentRow?.student}
                    onClose={() => setShowUpdateModal(false)}
                    onSuccess={handleSearch}
                />
            )}
        </div>
    );
}
