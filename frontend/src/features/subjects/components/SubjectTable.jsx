import React, { useMemo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import Chip from '../../../shared/components/ui/Chip.jsx';
import { useAuth } from '../../../auth/AuthContext';
import { useI18n } from '../../../i18n/I18nProvider';

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
    const { t } = useI18n();
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
            label: t('subjects.table.columns.subjectName', { defaultValue: 'Subject Name' }),
            sortable: true,
            field: 'subjectName',
        },
        {
            key: 'subjectCode',
            label: t('subjects.table.columns.subjectCode', { defaultValue: 'Subject Code' }),
            sortable: true,
            field: 'subjectCode',
        },
        {
            key: 'grades',
            label: t('subjects.table.columns.grades', { defaultValue: 'Associated Grades' }),
        },
        {
            key: 'actions',
            label: t('common.table.actions', { defaultValue: 'Actions' }),
            align: 'right',
            noPrint: true,
            locked: false,
            tdClassName: 'px-6 py-4 whitespace-nowrap text-right font-medium border-x border-(--nb-color-border)',
        },
    ]), [t]);

    return (
        <StandardTable
            isLoading={isLoading}
            error={error}
            items={items}
            loadingVariant="table"
            loadingMessage={t('subjects.table.loading', { defaultValue: 'Loading subjects...' })}
            loadingRows={6}
            loadingColumns={5}
            emptyTitle={t('subjects.table.emptyTitle', { defaultValue: 'No subjects found' })}
            emptyDescription={t('subjects.table.emptyDescription', { defaultValue: 'Try adjusting search or add a new subject.' })}
            emptyActionLabel={canAdd ? t('subjects.actions.addSubject', { defaultValue: 'Add Subject' }) : undefined}
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
                                    <Chip key={grade._id} variant="neutral">
                                        {grade.gradeName}
                                    </Chip>
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
                                              label: t('common.actions.edit', { defaultValue: 'Edit' }),
                                              title: t('subjects.table.actionTitles.edit', { defaultValue: 'Edit Subject' }),
                                              tone: 'edit',
                                              icon: <Pencil size={16} />,
                                              onClick: () => onEdit?.(subject),
                                          }
                                        : null,
                                    canDelete
                                        ? {
                                              key: 'delete',
                                              label: t('common.actions.delete', { defaultValue: 'Delete' }),
                                              title: t('subjects.table.actionTitles.delete', { defaultValue: 'Delete Subject' }),
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
            paginationProps={{ className: 'no-print', infoVariant: 'page' }}
        />
    );
}

