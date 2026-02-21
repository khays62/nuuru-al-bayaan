import React, { useState, useEffect } from 'react';
import { Search, Users, DollarSign, Printer, PlusCircle, Trash2, FileText, Info, RotateCcw } from 'lucide-react';
import financeService from '../api/finance';
import toast from 'react-hot-toast';
import StudentResponsibilityModal from './StudentResponsibilityModal';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import GradeSelect from '../../lookups/components/GradeSelect.jsx';
import ShiftSelect from '../../lookups/components/ShiftSelect.jsx';
import GradeSectionSelect from '../../lookups/components/GradeSectionSelect.jsx';

export default function ResponsiblePaymentTab() {
    const [search, setSearch] = useState('');
    const [classId, setClassId] = useState('');
    const [gradeId, setGradeId] = useState('');
    const [shiftId, setShiftId] = useState('');
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedStudentRow, setSelectedStudentRow] = useState(null);
    const [showInfoModal, setShowInfoModal] = useState(false);

    const resetFilters = () => {
        setSearch('');
        setGradeId('');
        setShiftId('');
        setClassId('');
        setStudents([]);
    };

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

    const columns = [
        {
            key: 'id',
            label: 'ID',
            render: (row) => (
                <span className="font-mono text-xs font-bold text-(--nb-color-muted)">
                    {row.student?.studentId || '—'}
                </span>
            ),
        },
        {
            key: 'name',
            label: 'Student Name',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-(--nb-color-fg)">{row.student?.fullName || '—'}</span>
                    {row.student?.admissionDate ? (
                        <span className="text-[10px] text-(--nb-color-muted) font-mono uppercase tracking-tighter">
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
                <span className="px-2 py-1 bg-(--nb-color-bg) text-(--nb-color-muted) rounded text-[10px] font-black uppercase tracking-tight border border-(--nb-color-border)">
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
            tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-(--nb-color-fg) border-x border-(--nb-color-border) text-center',
            render: (row) => (
                <button
                    onClick={() => { setSelectedStudentRow(row); setShowInfoModal(true); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all hover:shadow-lg active:scale-95"
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
                        <Search className="absolute left-3 top-2.5 text-(--nb-color-muted)" size={20} />
                        <input
                            type="text"
                            className="w-full h-11 pl-10 pr-4 py-2 bg-(--nb-color-bg-card) border border-(--nb-color-border) text-(--nb-color-fg) rounded-xl outline-none focus:ring-4 focus:ring-blue-600/10 transition-all font-medium"
                            placeholder="Search Responsible Name, ID or Phone..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </form>
                <GradeSelect
                    value={gradeId}
                    onChange={(v) => {
                        setGradeId(v || '');
                        setClassId('');
                    }}
                    placeholder="Grade"
                    className="h-11 min-w-40 font-bold text-sm"
                />
                <ShiftSelect
                    value={shiftId}
                    onChange={(v) => {
                        setShiftId(v || '');
                        setClassId('');
                    }}
                    placeholder="Shift"
                    className="h-11 min-w-40 font-bold text-sm"
                />
                <GradeSectionSelect
                    gradeId={gradeId}
                    shiftId={shiftId}
                    value={classId}
                    onChange={(v) => setClassId(v || '')}
                    searchable
                    maxVisible={6}
                    placeholder="Section"
                    searchPlaceholder="Search…"
                    className="h-11 min-w-50 font-bold text-sm"
                />
                <div className="flex gap-2">
                    <button onClick={handleSearch} className="h-11 bg-blue-600 text-white px-8 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95">Go</button>
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="h-11 bg-(--nb-color-bg-card) text-(--nb-color-fg) px-6 rounded-xl font-black text-sm uppercase tracking-widest border border-(--nb-color-border) hover:bg-(--nb-color-bg) transition-all active:scale-95 inline-flex items-center gap-2"
                        title="Reset filters"
                    >
                        <RotateCcw size={16} />
                        Reset
                    </button>
                </div>
            </div>

            <div className="bg-(--nb-color-bg-card) border border-(--nb-color-border) rounded-xl overflow-hidden shadow-(--nb-shadow-sm)">
                <StandardTable
                    isLoading={loading}
                    loadingMessage="Syncing Matrix..."
                    items={students}
                    rows={students}
                    columns={columns}
                    storageKey="finance:responsible-payments:students"
                    getRowKey={(row) => row.student?._id}
                    emptyTitle="No records found"
                    emptyDescription="No records found for this selection."
                />
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
