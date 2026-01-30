import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, KeyRound, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../../../shared/components/ui/badges/StatusBadge.jsx';
import { deactivateStudentApi, reactivateStudentApi, resetStudentPassword } from '../api/studentsApi';
import { emitStudentsChanged } from '../../../utils/events';
import DataTable from '../../../shared/components/table/DataTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import { useAuth } from '../../../auth/AuthContext';

// Displays students returned by backend list endpoint
const StudentTable = ({ students, onEdit, sortBy, sortDir, onSort, limit, total, onLimit }) => {
    const navigate = useNavigate();
    const { auth, hasPermission } = useAuth();
    const STORAGE_KEY = 'students:columns:v1';
    const [optimisticStatusById, setOptimisticStatusById] = useState({});
    const [pendingId, setPendingId] = useState(null);

    const roleLower = String(auth?.user?.role || '').toLowerCase();
    const isAdmin = roleLower === 'admin';
    const canEdit = isAdmin || hasPermission('students', 'edit');
    const canDeactivate = isAdmin || hasPermission('students', 'deactivate');
    const canReactivate = isAdmin || hasPermission('students', 'reactivate');

    const canResetPw = roleLower !== 'student'
        && (isAdmin || hasPermission('students', 'resetPassword'));

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
                        return <StatusBadge status={optimisticStatusById[st._id] || st.status} />;
                    case 'contact': return st.contactNumber || '-';
                    case 'actions':
                        return (() => {
                            const effectiveStatus = optimisticStatusById[st._id] || st.status;
                            const isPending = pendingId === st._id;

                            return (
                                <RowActionButtons
                                    actions={[
                                    ...(canResetPw
                                        ? [
                                              {
                                                  key: 'resetPassword',
                                                  label: 'Reset Password',
                                                  title: 'Reset password to default (clears 24h lock/cooldown)',
                                                  tone: 'edit',
                                                  icon: <KeyRound size={16} />,
                                                  disabled: isPending || String(effectiveStatus || '').toLowerCase() === 'inactive',
                                                  onClick: async () => {
                                                      const ok = window.confirm('Reset this student\'s password to the default password and clear the 24h lock/cooldown?');
                                                      if (!ok) return;
                                                      setPendingId(st._id);
                                                      try {
                                                          const res = await resetStudentPassword(st._id);
                                                          if (!res.ok) throw new Error(res?.data?.message || 'Failed to reset password');
                                                          toast.success('Password reset to default. Student must change it after login.');
                                                      } catch (e) {
                                                          toast.error(e?.message || 'Failed to reset password');
                                                      } finally {
                                                          setPendingId(null);
                                                      }
                                                  },
                                              },
                                          ]
                                        : []),
                                    {
                                        key: 'view',
                                        label: 'View',
                                        title: 'View Profile',
                                        tone: 'view',
                                        icon: <Eye size={16} />,
                                        onClick: () => navigate(`/students/${st._id}`),
                                    },
                                    ...(canEdit
                                        ? [
                                              {
                                                  key: 'edit',
                                                  label: 'Edit',
                                                  title: 'Edit Student',
                                                  tone: 'edit',
                                                  icon: <Pencil size={16} />,
                                                  onClick: () => onEdit(st),
                                              },
                                          ]
                                        : []),
                                    ...(
                                        effectiveStatus === 'Active'
                                            ? (canDeactivate
                                                  ? [
                                                        {
                                                            key: 'deactivate',
                                                            label: 'Deactivate',
                                                            title: 'Deactivate Student',
                                                            tone: 'delete',
                                                            icon: <Trash2 size={16} />,
                                                            disabled: isPending,
                                                            onClick: async () => {
                                                                if (!window.confirm('Are you sure you want to deactivate this student?')) return;
                                                                setPendingId(st._id);
                                                                try {
                                                                    const { ok, data } = await deactivateStudentApi(st._id);
                                                                    if (ok) {
                                                                        setOptimisticStatusById((prev) => ({ ...prev, [st._id]: 'Inactive' }));
                                                                        toast.success('Student deactivated');
                                                                        emitStudentsChanged();
                                                                    } else {
                                                                        toast.error(data?.message || 'Failed to deactivate');
                                                                    }
                                                                } catch (e) {
                                                                    console.error(e);
                                                                    toast.error('Network error');
                                                                } finally {
                                                                    setPendingId(null);
                                                                }
                                                            },
                                                        },
                                                    ]
                                                  : [])
                                            : (canReactivate
                                                  ? [
                                                        {
                                                            key: 'reactivate',
                                                            label: 'Reactivate',
                                                            title: 'Reactivate Student',
                                                            tone: 'view',
                                                            icon: <RotateCcw size={16} />,
                                                            disabled: isPending,
                                                            onClick: async () => {
                                                                setPendingId(st._id);
                                                                try {
                                                                    const { ok, data } = await reactivateStudentApi(st._id);
                                                                    if (ok) {
                                                                        setOptimisticStatusById((prev) => ({ ...prev, [st._id]: 'Active' }));
                                                                        toast.success('Student reactivated');
                                                                        emitStudentsChanged();
                                                                    } else {
                                                                        toast.error(data?.message || 'Failed to reactivate');
                                                                    }
                                                                } catch (e) {
                                                                    console.error(e);
                                                                    toast.error('Network error');
                                                                } finally {
                                                                    setPendingId(null);
                                                                }
                                                            },
                                                        },
                                                    ]
                                                  : [])
                                    ),
                                    ]}
                                />
                            );
                        })();
                    default:
                        return '';
                }
            }}
        />
    );
};

export default StudentTable;

