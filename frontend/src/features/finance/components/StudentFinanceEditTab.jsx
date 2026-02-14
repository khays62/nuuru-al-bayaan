import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import financeService from '../api/finance';
import { listGradeSections } from '../../grades/api/gradeSections';
import toast from 'react-hot-toast';
import UpdateChargeModal from './UpdateChargeModal';
import { useInvoicesQuery } from '../hooks/studentFinanceHooks';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';
import { useI18n } from '../../../i18n/I18nProvider.jsx';

export default function StudentFinanceEditTab() {
    const { t } = useI18n();

    const [search, setSearch] = useState('');
    const [classId, setClassId] = useState('');
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submittedParams, setSubmittedParams] = useState({});
    const [selectedStudentRow, setSelectedStudentRow] = useState(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);

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

    const invoicesQuery = useInvoicesQuery(submittedParams, {
        enabled: true,
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
        setPage(1);
        setSubmittedParams(params);
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
                <span className="font-mono text-xs font-bold text-slate-500">{row.student?.studentId || '—'}</span>
            ),
        },
        {
            key: 'name',
            label: t('finance.studentFinance.editTab.columns.studentName', { defaultValue: 'Student Name' }),
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-900">{row.student?.fullName || '—'}</span>
                    {row.student?.admissionDate ? (
                        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">
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
            render: (row) => row.student?.phoneNumber || row.student?.contactNumber || '—',
        },
        {
            key: 'class',
            label: t('finance.studentFinance.editTab.columns.class', { defaultValue: 'Class' }),
            render: (row) => (
                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-tight border border-slate-200">
                    {row.student?.currentClass || '—'}
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
            tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200 text-center',
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
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                        <Input
                            type="text"
                            className="h-11 pl-10 pr-4 font-medium"
                            placeholder={t('finance.studentFinance.editTab.placeholders.search', { defaultValue: 'Search Student ID, Name or Phone…' })}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </form>
                <SearchableSelect
                    value={classId}
                    onChange={(v) => setClassId(v)}
                    options={classes.map((cls) => {
                        const gradeLabel = cls.grade?.gradeName || cls.grade?.name || cls.gradeName || '';
                        const sectionLabel = cls.section || cls.name || '';
                        const label = `${gradeLabel}${sectionLabel ? ` - ${sectionLabel}` : ''}`.trim();
                        return { value: cls._id, label: label || '—' };
                    })}
                    placeholder={t('finance.studentFinance.editTab.filters.byClassLevel', { defaultValue: 'By Class Level' })}
                    searchPlaceholder={t('common.search', { defaultValue: 'Search…' })}
                    maxVisible={6}
                    className="h-11 min-w-50 font-bold text-sm"
                />
                <Button onClick={handleSearch} variant="brand" size="lg" className="h-11 px-8 font-black text-sm uppercase tracking-widest">
                    {t('finance.studentFinance.editTab.actions.go', { defaultValue: 'Go' })}
                </Button>
            </div>

            <div className="bg-white border rounded-xl shadow-sm">
                <StandardTable
                    isLoading={loading}
                    loadingMessage={t('finance.studentFinance.editTab.loading.fetchingProfiles', { defaultValue: 'Fetching Profiles…' })}
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
                        className: 'px-6 bg-white',
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
