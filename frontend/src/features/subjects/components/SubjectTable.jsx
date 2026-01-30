import React, { useMemo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import { useAuth } from '../../../auth/AuthContext';

export default function SubjectTable({
    items = [],
    rows = [],
    isLoading = false,
    error = null,
    sortBy,
    sortDir,
    onSort,
    meta,
    onPage,
    onLimit,
    onAdd,
    onEdit,
    onDelete,
}) {
    const STORAGE_KEY = 'subjects:columns:v1';

    const { auth, hasPermission } = useAuth();
    const roleLower = String(auth?.user?.role || '').toLowerCase();
    const isAdmin = roleLower === 'admin';
    const canAdd = isAdmin || hasPermission('subjects', 'add');
    const canEdit = isAdmin || hasPermission('subjects', 'edit');
    const canDelete = isAdmin || hasPermission('subjects', 'delete');

    const columns = useMemo(() => ([
        {
            key: 'subjectName',
            label: 'Subject Name',
            sortable: true,
            field: 'subjectName',
            tdClassName: 'px-6 py-4 whitespace-nowrap font-medium text-gray-900 border-x border-gray-200',
        },
        {
            key: 'subjectCode',
            label: 'Subject Code',
            sortable: true,
            field: 'subjectCode',
            tdClassName: 'px-6 py-4 whitespace-nowrap text-gray-600 border-x border-gray-200',
        },
        {
            key: 'grades',
            label: 'Associated Grades',
            tdClassName: 'px-6 py-4 text-gray-600 border-x border-gray-200',
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            noPrint: true,
            locked: false,
            tdClassName: 'px-6 py-4 whitespace-nowrap text-right font-medium border-x border-gray-200',
        },
    ]), []);

    return (
        <StandardTable
            isLoading={isLoading}
            error={error}
            items={items}
            loadingVariant="table"
            loadingMessage="Loading subjects..."
            loadingRows={6}
            loadingColumns={5}
            emptyTitle="No subjects found"
            emptyDescription="Try adjusting search or add a new subject."
            emptyActionLabel={canAdd ? 'Add Subject' : undefined}
            onEmptyAction={canAdd ? onAdd : undefined}

            rows={rows}
            columns={columns}
            storageKey={STORAGE_KEY}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
            controlsProps={
                meta
                    ? {
                            limit: meta.limit || 10,
                            total: meta.total || 0,
                            onLimit: (l) => onLimit?.(l),
                            limits: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 'all'],
                        }
                    : undefined
            }
            getRowKey={(s) => s._id}
            renderCell={(subject, col) => {
                switch (col.key) {
                    case 'subjectName':
                        return subject.subjectName;
                    case 'subjectCode':
                        return subject.subjectCode;
                    case 'grades':
                        return (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                                {(subject.grades || []).map((grade) => (
                                    <span key={grade._id} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-md">
                                        {grade.gradeName}
                                    </span>
                                ))}
                            </div>
                        );
                    case 'actions':
                        return (
                            <RowActionButtons
                                actions={[
                                    canEdit
                                        ? {
                                              key: 'edit',
                                              label: 'Edit',
                                              title: 'Edit Subject',
                                              tone: 'edit',
                                              icon: <Pencil size={16} />,
                                              onClick: () => onEdit?.(subject),
                                          }
                                        : null,
                                    canDelete
                                        ? {
                                              key: 'delete',
                                              label: 'Delete',
                                              title: 'Delete Subject',
                                              tone: 'delete',
                                              icon: <Trash2 size={16} />,
                                              onClick: () => onDelete?.(subject._id),
                                          }
                                        : null,
                                ]}
                            />
                        );
                    default:
                        return '';
                }
            }}
            meta={meta}
            onPage={onPage}
            onLimit={onLimit}
            showRowsSelector={false}
        />
    );
}

