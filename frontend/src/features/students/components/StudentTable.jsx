import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Pencil, Trash2, RotateCcw, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../../../shared/components/ui/badges/StatusBadge.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import { deactivateStudentApi, reactivateStudentApi } from '../api/studentsApi';
import { emitStudentsChanged } from '../../../utils/events';
import DataTable from '../../../shared/components/table/DataTable.jsx';

// Displays students returned by backend list endpoint
const StudentTable = ({ students, onEdit, sortBy, sortDir, onSort, limit, total, onLimit }) => {
    const STORAGE_KEY = 'students:columns:v1';

    const columns = useMemo(() => ([
        { key: 'studentId', label: 'Student ID', sortable: true, field: 'studentId', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200' },
        { key: 'fullName', label: 'Full Name', sortable: true, field: 'fullName', tdClassName: 'px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200' },
        { key: 'gender', label: 'Gender', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-x border-gray-200' },
        { key: 'grade', label: 'Grade', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200' },
        { key: 'section', label: 'Section', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-x border-gray-200' },
        { key: 'academicYear', label: 'Academic Year', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-x border-gray-200' },
        { key: 'shift', label: 'Shift', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-x border-gray-200' },
        { key: 'status', label: 'Status', tdClassName: 'px-6 py-4 whitespace-nowrap border-x border-gray-200' },
        { key: 'contact', label: 'Contact', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-x border-gray-200' },
        { key: 'actions', label: 'Actions', align: 'right', noPrint: true, locked: false, tdClassName: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 border-x border-gray-200 no-print' },
    ]), []);

    return (
        <DataTable
            rows={students}
            columns={columns}
            storageKey={STORAGE_KEY}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
            getRowKey={(st) => st._id}
            controlsProps={{
                limit,
                total,
                onLimit,
                limits: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 'all'],
            }}
            renderCell={(st, col) => {
                switch (col.key) {
                    case 'studentId': return st.studentId;
                    case 'fullName': return st.fullName;
                    case 'gender': return st.gender;
                    case 'grade': return st.grade || '-';
                    case 'section': return st.section ? `Sec ${st.section}` : '-';
                    case 'academicYear': return st.academicYear || '-';
                    case 'shift': return st.shift || '-';
                    case 'status':
                        return <StatusBadge status={st.status} />;
                    case 'contact': return st.contactNumber || '-';
                    case 'actions':
                        return (
                            <>
                                <Button as={Link} to={`/students/${st._id}`} title="View Profile" variant="primary" icon={<Eye size={16} />}>
                                    <span className="hidden sm:inline">View</span>
                                </Button>
                                <ActionButton variant="neutral" title="Edit Student" onClick={() => onEdit(st)} icon={<Pencil size={16} />}>
                                    <span className="hidden sm:inline">Edit</span>
                                </ActionButton>
                                {/* Transfer button removed; use dedicated Transfers page */}
                                {st.status === 'Active' ? (
                                    <ActionButton
                                        variant="danger"
                                        title="Deactivate Student"
                                        onClick={async () => {
                                            if (!window.confirm('Are you sure you want to deactivate this student?')) return;
                                            try {
                                                const { ok, data } = await deactivateStudentApi(st._id);
                                                if (ok) { toast.success('Student deactivated'); emitStudentsChanged(); }
                                                else { toast.error(data?.message || 'Failed to deactivate'); }
                                            } catch (e) { console.error(e); toast.error('Network error'); }
                                        }}
                                        icon={<Trash2 size={16} />}
                                    >
                                        <span className="hidden sm:inline">Deactivate</span>
                                    </ActionButton>
                                ) : (
                                    <ActionButton
                                        variant="primary"
                                        title="Reactivate Student"
                                        onClick={async () => {
                                            try {
                                                const { ok, data } = await reactivateStudentApi(st._id);
                                                if (ok) { toast.success('Student reactivated'); emitStudentsChanged(); }
                                                else { toast.error(data?.message || 'Failed to reactivate'); }
                                            } catch (e) { console.error(e); toast.error('Network error'); }
                                        }}
                                        icon={<RotateCcw size={16} />}
                                    >
                                        <span className="hidden sm:inline">Reactivate</span>
                                    </ActionButton>
                                )}
                            </>
                        );
                    default:
                        return '';
                }
            }}
        />
    );
};

export default StudentTable;

