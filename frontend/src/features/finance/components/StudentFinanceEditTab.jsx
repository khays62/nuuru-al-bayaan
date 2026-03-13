import React, { useState, useEffect } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import UpdateChargeModal from './UpdateChargeModal';
import { useInvoicesQuery } from '../hooks/studentFinanceHooks';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import GradeSelect from '../../lookups/components/GradeSelect.jsx';
import ShiftSelect from '../../lookups/components/ShiftSelect.jsx';
import GradeSectionSelect from '../../lookups/components/GradeSectionSelect.jsx';
import { useI18n } from '../../../i18n/useI18n';

export default function StudentFinanceEditTab() {
    const { t } = useI18n();

    const [search, setSearch] = useState('');
    const [classId, setClassId] = useState('');
    const [gradeId, setGradeId] = useState('');
    const [shiftId, setShiftId] = useState('');
    const [loading, setLoading] = useState(false);
    const [submittedParams, setSubmittedParams] = useState({});
    const [selectedStudentRow, setSelectedStudentRow] = useState(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);

    const invoicesQuery = useInvoicesQuery(submittedParams, {
        enabled: Boolean(submittedParams?.search || submittedParams?.classId),
        staleTime: 60_000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    useEffect(() => {
        // Only show skeleton on first load; keep rows visible on background refetch.
        setLoading(Boolean(invoicesQuery.isLoading));
    }, [invoicesQuery.isLoading]);

    useEffect(() => {
        if (!invoicesQuery.isError) return;
        toast.error(t('finance.studentFinance.editTab.toasts.fetchFailed', { defaultValue: 'Failed to fetch student records' }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invoicesQuery.isError]);

    const students = React.useMemo(() => {
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

        return Object.values(studentMap);
    }, [invoicesQuery.data]);

    useEffect(() => {
        setPage(1);
    }, [students.length, classId, search]);

    const handleSearch = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const params = {};
        if (search) params.search = search;
        if (classId) params.classId = classId;

        if (!params.search && !params.classId) {
            toast.error(t('finance.studentFinance.editTab.toasts.selectFilterOrSearch', { defaultValue: 'Select a section or enter a search term' }));
            return;
        }
        setPage(1);
        setSubmittedParams(params);
    };

    const resetFilters = () => {
        setSearch('');
        setGradeId('');
        setShiftId('');
        setClassId('');
        setSubmittedParams({});
        setPage(1);
    };

    const total = students.length;
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const currentRows = (students || []).slice(start, start + limit);

    const columns = [
        {
            key: 'id',
            label: t('finance.studentFinance.editTab.columns.id', { defaultValue: 'ID' }),
            render: (row) => (
                <span className="font-mono text-xs font-bold text-(--nb-color-muted)">{row.student?.studentId || '-'}</span>
            ),
        },
        {
            key: 'name',
            label: t('finance.studentFinance.editTab.columns.studentName', { defaultValue: 'Student Name' }),
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-(--nb-color-fg)">{row.student?.fullName || '-'}</span>
                    {row.student?.admissionDate ? (
                        <span className="text-[10px] text-(--nb-color-muted) font-mono uppercase tracking-tighter">
                            {t('finance.studentFinance.editTab.labels.regPrefix', { defaultValue: 'Reg:' })}{' '}
                            {new Date(row.student.admissionDate).toLocaleDateString()}
                        </span>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'contact',
            label: t('finance.studentFinance.editTab.columns.contact', { defaultValue: 'Contact' }),
            render: (row) => row.student?.phoneNumber || row.student?.contactNumber || '-',
        },
        {
            key: 'class',
            label: t('finance.studentFinance.editTab.columns.class', { defaultValue: 'Class' }),
            render: (row) => (
                <span className="px-2 py-1 bg-(--nb-color-bg) text-(--nb-color-muted) rounded text-[10px] font-black uppercase tracking-tight border border-(--nb-color-border)">
                    {row.student?.currentClass || '-'}
                </span>
            ),
        },
        {
            key: 'balance',
            label: t('finance.studentFinance.editTab.columns.balance', { defaultValue: 'Balance' }),
            align: 'right',
            render: (row) => (
                <span className={`font-black text-sm ${Number(row.totalBalance || 0) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    ${Number(row.totalBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
            ),
        },
        {
            key: 'info',
            label: t('finance.studentFinance.editTab.columns.info', { defaultValue: 'Info' }),
            align: 'center',
            tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-(--nb-color-fg) border-x border-(--nb-color-border) text-center',
            render: (row) => (
                <RowActionButtons
                    actions={[
                        {
                            key: 'info',
                            label: t('finance.studentFinance.editTab.actions.viewInfo', { defaultValue: 'View Info' }),
                            title: t('finance.studentFinance.editTab.actions.viewInfo', { defaultValue: 'View Info' }),
                            tone: 'view',
                            showLabel: true,
                            icon: null,
                            onClick: () => {
                                setSelectedStudentRow(row);
                                setShowUpdateModal(true);
                            },
                        },
                    ]}
                />
            ),
        },
    ];

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-(--nb-color-muted)" size={20} />
                        <Input
                            type="text"
                            className="h-11 pl-10 pr-4 font-medium"
                            placeholder={t('finance.studentFinance.editTab.placeholders.search', { defaultValue: 'Search Student ID, Name or Phoneâ€¦' })}
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
                    placeholder={t('common.filters.grade', { defaultValue: 'Grade' })}
                    className="h-11 min-w-40 font-bold text-sm"
                />

                <ShiftSelect
                    value={shiftId}
                    onChange={(v) => {
                        setShiftId(v || '');
                        setClassId('');
                    }}
                    placeholder={t('common.filters.shift', { defaultValue: 'Shift' })}
                    className="h-11 min-w-40 font-bold text-sm"
                />

                <GradeSectionSelect
                    gradeId={gradeId}
                    shiftId={shiftId}
                    value={classId}
                    onChange={(v) => setClassId(v || '')}
                    searchable
                    maxVisible={6}
                    placeholder={t('common.filters.section', { defaultValue: 'Section' })}
                    searchPlaceholder={t('common.search', { defaultValue: 'Searchâ€¦' })}
                    className="h-11 min-w-50 font-bold text-sm"
                />
                <Button onClick={handleSearch} variant="brand" size="lg" className="h-11 px-8 font-black text-sm uppercase tracking-widest">
                    {t('finance.studentFinance.editTab.actions.go', { defaultValue: 'Go' })}
                </Button>
                <Button
                    onClick={resetFilters}
                    variant="neutral"
                    size="lg"
                    icon={<RotateCcw size={16} />}
                    className="h-11 px-6 font-black text-sm uppercase tracking-widest"
                    title={t('common.filters.resetTitle', { defaultValue: 'Reset filters' })}
                >
                    {t('common.actions.reset', { defaultValue: 'Reset' })}
                </Button>
            </div>

            <div className="bg-(--nb-color-bg-card) border border-(--nb-color-border) rounded-xl shadow-(--nb-shadow-sm)">
                <StandardTable
                    isLoading={loading}
                    loadingMessage={t('finance.studentFinance.editTab.loading.fetchingProfiles', { defaultValue: 'Fetching Profilesâ€¦' })}
                    items={students}
                    rows={currentRows}
                    columns={columns}
                    storageKey="finance:studentFinance:edit:columns:v1"
                    controlsProps={{
                        limit,
                        total,
                        onLimit: (v) => {
                            setLimit(v);
                            setPage(1);
                        },
                        className: 'px-6 bg-(--nb-color-bg-card)',
                    }}
                    getRowKey={(row) => row.student?._id}
                    emptyTitle={t('finance.studentFinance.editTab.empty.title', { defaultValue: 'No records found' })}
                    emptyDescription={t('finance.studentFinance.editTab.empty.description', { defaultValue: 'No records found for this selection.' })}
                    tableProps={{ shellClassName: 'ring-0 shadow-none rounded-none' }}
                    meta={{ page: safePage, totalPages, limit, total }}
                    onPage={setPage}
                    onLimit={(v) => { setLimit(v); setPage(1); }}
                    showRowsSelector={false}
                    paginationProps={{ className: 'no-print', infoVariant: 'page' }}
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
