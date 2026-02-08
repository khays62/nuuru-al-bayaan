import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, KeyRound, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import StatusBadge from '../../../shared/components/ui/badges/StatusBadge.jsx';
import { deactivateStudentApi, reactivateStudentApi, resetStudentPassword } from '../api/studentsApi';
import { emitStudentsChanged } from '../../../utils/events';
import DataTable from '../../../shared/components/table/DataTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import { useAuth } from '../../../auth/AuthContext';
import { useI18n } from '../../../i18n/I18nProvider';

// Displays students returned by backend list endpoint
const StudentTable = ({ students, onEdit, sortBy, sortDir, onSort, limit, total, onLimit }) => {
    const navigate = useNavigate();
    const { auth, hasPermission } = useAuth();
    const { t } = useI18n();
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

    const resetPwMutation = useMutation({
        mutationFn: async (studentId) => {
            const res = await resetStudentPassword(studentId);
            if (!res?.ok) throw new Error(res?.data?.message || t('students.table.errors.resetFailed'));
            return res;
        },
        onSuccess: (_res, studentId) => {
            toast.success(t('students.table.toasts.passwordReset'));
            emitStudentsChanged({ source: 'local', action: 'resetPassword', id: String(studentId), ts: Date.now() });
        },
        onError: (e) => {
            toast.error(e?.message || t('students.table.errors.resetFailed'));
        },
        onSettled: () => {
            setPendingId(null);
        },
    });

    const deactivateMutation = useMutation({
        mutationFn: async ({ studentId }) => {
            const res = await deactivateStudentApi(studentId);
            if (!res?.ok) throw new Error(res?.data?.message || t('students.table.actions.deactivate'));
            return res;
        },
        onMutate: async ({ studentId }) => {
            setPendingId(studentId);
            const prevStatus = optimisticStatusById[studentId];
            setOptimisticStatusById((prev) => ({ ...prev, [studentId]: 'Inactive' }));
            return { studentId, prevStatus };
        },
        onSuccess: (_res, vars) => {
            toast.success(t('students.table.toasts.deactivated'));
            emitStudentsChanged({ source: 'local', action: 'deactivate', id: String(vars?.studentId || ''), ts: Date.now() });
        },
        onError: (e, vars, ctx) => {
            const id = ctx?.studentId || vars?.studentId;
            setOptimisticStatusById((prev) => {
                const next = { ...prev };
                if (ctx?.prevStatus === undefined) delete next[id];
                else next[id] = ctx.prevStatus;
                return next;
            });
            toast.error(e?.message || t('students.table.errors.network'));
        },
        onSettled: () => {
            setPendingId(null);
        },
    });

    const reactivateMutation = useMutation({
        mutationFn: async ({ studentId }) => {
            const res = await reactivateStudentApi(studentId);
            if (!res?.ok) throw new Error(res?.data?.message || t('students.table.actions.reactivate'));
            return res;
        },
        onMutate: async ({ studentId }) => {
            setPendingId(studentId);
            const prevStatus = optimisticStatusById[studentId];
            setOptimisticStatusById((prev) => ({ ...prev, [studentId]: 'Active' }));
            return { studentId, prevStatus };
        },
        onSuccess: (_res, vars) => {
            toast.success(t('students.table.toasts.reactivated'));
            emitStudentsChanged({ source: 'local', action: 'reactivate', id: String(vars?.studentId || ''), ts: Date.now() });
        },
        onError: (e, vars, ctx) => {
            const id = ctx?.studentId || vars?.studentId;
            setOptimisticStatusById((prev) => {
                const next = { ...prev };
                if (ctx?.prevStatus === undefined) delete next[id];
                else next[id] = ctx.prevStatus;
                return next;
            });
            toast.error(e?.message || t('students.table.errors.network'));
        },
        onSettled: () => {
            setPendingId(null);
        },
    });

    const columns = useMemo(() => ([
        { key: 'studentId', label: t('students.table.columns.studentId'), sortable: true, field: 'studentId', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200' },
        { key: 'fullName', label: t('students.table.columns.fullName'), sortable: true, field: 'fullName', tdClassName: 'px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200' },
        { key: 'gender', label: t('students.table.columns.gender'), tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-x border-gray-200' },
        { key: 'grade', label: t('students.table.columns.grade'), tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200' },
        { key: 'section', label: t('students.table.columns.section'), tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-x border-gray-200' },
        { key: 'academicYear', label: t('students.table.columns.academicYear'), tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-x border-gray-200' },
        { key: 'shift', label: t('students.table.columns.shift'), tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-x border-gray-200' },
        { key: 'status', label: t('students.table.columns.status'), tdClassName: 'px-6 py-4 whitespace-nowrap border-x border-gray-200' },
        { key: 'contact', label: t('students.table.columns.contact'), tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-x border-gray-200' },
        { key: 'actions', label: t('students.table.columns.actions'), align: 'right', noPrint: true, locked: false, tdClassName: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 border-x border-gray-200 no-print' },
    ]), [t]);

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
                    case 'section': return st.section ? `${t('students.export.sectionPrefix')} ${st.section}` : '-';
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
                                                  label: t('students.table.actions.resetPassword'),
                                                  title: t('students.table.actionTitles.resetPasswordDefault'),
                                                  tone: 'edit',
                                                  icon: <KeyRound size={16} />,
                                                  disabled: isPending || resetPwMutation.isPending || String(effectiveStatus || '').toLowerCase() === 'inactive',
                                                  onClick: async () => {
                                                      const ok = window.confirm(t('students.table.confirms.resetPassword'));
                                                      if (!ok) return;
                                                      setPendingId(st._id);
                                                      resetPwMutation.mutate(st._id);
                                                  },
                                              },
                                          ]
                                        : []),
                                    {
                                        key: 'view',
                                        label: t('students.table.actions.view'),
                                        title: t('students.table.actionTitles.viewProfile'),
                                        tone: 'view',
                                        icon: <Eye size={16} />,
                                        onClick: () => navigate(`/students/${st._id}`),
                                    },
                                    ...(canEdit
                                        ? [
                                              {
                                                  key: 'edit',
                                                  label: t('students.table.actions.edit'),
                                                  title: t('students.table.actionTitles.editStudent'),
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
                                                            label: t('students.table.actions.deactivate'),
                                                            title: t('students.table.actionTitles.deactivateStudent'),
                                                            tone: 'delete',
                                                            icon: <Trash2 size={16} />,
                                                            disabled: isPending || deactivateMutation.isPending || reactivateMutation.isPending,
                                                            onClick: async () => {
                                                                if (!window.confirm(t('students.table.confirms.deactivate'))) return;
                                                                deactivateMutation.mutate({ studentId: st._id });
                                                            },
                                                        },
                                                    ]
                                                  : [])
                                            : (canReactivate
                                                  ? [
                                                        {
                                                            key: 'reactivate',
                                                            label: t('students.table.actions.reactivate'),
                                                            title: t('students.table.actionTitles.reactivateStudent'),
                                                            tone: 'view',
                                                            icon: <RotateCcw size={16} />,
                                                            disabled: isPending || deactivateMutation.isPending || reactivateMutation.isPending,
                                                            onClick: async () => {
                                                                reactivateMutation.mutate({ studentId: st._id });
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

