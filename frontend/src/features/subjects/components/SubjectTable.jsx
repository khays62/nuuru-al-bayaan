import React, { useMemo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import DataTable from '../../../shared/components/table/DataTable.jsx';

export default function SubjectTable({ subjects, onEdit, onDelete, sortBy, sortDir, onSort, limit, total, onLimit }) {
    const STORAGE_KEY = 'subjects:columns:v1';

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
            tdClassName: 'px-6 py-4 whitespace-nowrap text-right font-medium space-x-2 border-x border-gray-200',
        },
    ]), []);

    return (
        <DataTable
            rows={subjects}
            columns={columns}
            storageKey={STORAGE_KEY}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
            controlsProps={{
                limit,
                total,
                onLimit,
                limits: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 'all'],
            }}
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
                            <>
                                <button
                                    onClick={() => onEdit(subject)}
                                    className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-100 transition-colors"
                                    title="Edit Subject"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button
                                    onClick={() => onDelete(subject._id)}
                                    className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 transition-colors"
                                    title="Delete Subject"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </>
                        );
                    default:
                        return '';
                }
            }}
        />
    );
}

