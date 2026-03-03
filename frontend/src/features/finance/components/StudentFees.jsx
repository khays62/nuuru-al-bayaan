import React, { useState, useEffect, useMemo } from 'react';
import { Receipt, Edit, Settings, GraduationCap, Search, Printer, PlusCircle, Trash2, FileText, Wallet, RotateCcw } from 'lucide-react';
import financeService from '../api/finance';
import toast from 'react-hot-toast';
import { useFinanceStudentsSummaryQuery, usePreviousBalanceSummaryQuery } from '../hooks/studentFinanceHooks';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import Card from '../../../shared/components/ui/Card.jsx';
import Tabs from '../../attendance/components/Tabs.jsx';
import { useI18n } from '../../../i18n/useI18n';
import { useAuth } from '../../../auth/AuthContext';
import GradeSelect from '../../lookups/components/GradeSelect.jsx';
import ShiftSelect from '../../lookups/components/ShiftSelect.jsx';
import GradeSectionSelect from '../../lookups/components/GradeSectionSelect.jsx';
import StudentChargeModal from './StudentChargeModal';
import UpdateChargeModal from './UpdateChargeModal';
import DeleteChargeModal from './DeleteChargeModal';
import AmountTypeTab from './AmountTypeTab';
import FeeTypeTab from './FeeTypeTab';
import StudentFinanceEditTab from './StudentFinanceEditTab';
import PreviousBalanceTab from './PreviousBalanceTab';
import StudentFinancePrintTab from './StudentFinancePrintTab';
import { PrintMonthlyInvoiceModal, PrintDailyInvoiceModal, PrintPassCardModal } from './PrintModals';
import StudentFinancePaymentModal from './StudentFinancePaymentModal';
import ConfirmationModal from '../common/ConfirmationModal';

// --- SUB-COMPONENTS ---

const ReceiptTab = () => {
    const { t } = useI18n();
    const { hasPermission } = useAuth();

    const canCharge = hasPermission('financeStudentReceipt', 'add');
    const canUpdateCharge = hasPermission('financeStudentReceipt', 'edit');
    const canDeleteCharge = hasPermission('financeStudentReceipt', 'delete');
    const canDownload = hasPermission('financeStudentReceipt', 'download');
    const canPrint = hasPermission('financePrint', 'print');
    const canViewReceiptLedger = ['view', 'edit', 'delete', 'download'].some((a) => hasPermission('financeStudentReceipt', a));
    const canSeePreviousBalanceData = ['view', 'add', 'edit', 'delete'].some((a) => hasPermission('financeStudentPreviousBalance', a));

    const canViewInfoModal =
        hasPermission('financeStudentReceiptModal', 'view') ||
        hasPermission('financeStudentReceiptModal', 'full') ||
        ['view', 'add', 'edit', 'delete', 'download'].some((a) => hasPermission('financeStudentReceipt', a));

    const [search, setSearch] = useState('');
    const [classId, setClassId] = useState('');
    const [gradeId, setGradeId] = useState('');
    const [shiftId, setShiftId] = useState('');
    const [filterType, setFilterType] = useState('');
    const [loading, setLoading] = useState(false);

    const [submittedParams, setSubmittedParams] = useState({});

    const [sortBy, setSortBy] = useState('fullName');
    const [sortDir, setSortDir] = useState('asc');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    // Modal States
    const [showChargeModal, setShowChargeModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [showMonthlyPrint, setShowMonthlyPrint] = useState(false);
    const [showDailyPrint, setShowDailyPrint] = useState(false);
    const [showPassCardPrint, setShowPassCardPrint] = useState(false);

    const [selectedStudentRow, setSelectedStudentRow] = useState(null);
    const [showInfoModal, setShowInfoModal] = useState(false);

    const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

    const queryUX = {
        enabled: Boolean(canViewReceiptLedger),
        staleTime: 60_000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    };

    const prevQueryUX = {
        ...queryUX,
        enabled: Boolean(queryUX.enabled) && Boolean(canSeePreviousBalanceData),
    };

    const summaryQuery = useFinanceStudentsSummaryQuery(submittedParams, queryUX);
    const prevQuery = usePreviousBalanceSummaryQuery({ ...submittedParams, month: currentMonth }, prevQueryUX);

    useEffect(() => {
        // Only show skeleton on first load. Background refetches (isFetching)
        // should keep the current rows visible to avoid tab-switch flicker.
        setLoading(Boolean(summaryQuery.isLoading || (prevQueryUX.enabled && prevQuery.isLoading)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [summaryQuery.isLoading, prevQuery.isLoading, prevQueryUX.enabled]);

    useEffect(() => {
        if (summaryQuery.isError) {
            toast.error(t('finance.studentFinance.receiptTab.toasts.searchFailed', { defaultValue: 'Search failed' }));
            return;
        }

        // Receipt tab optionally includes Previous Balance. If the user doesn't have that permission,
        // do not fetch it and do not show error toasts.
        if (prevQueryUX.enabled && prevQuery.isError) {
            toast.error(t('finance.studentFinance.receiptTab.toasts.previousBalanceLoadFailed', { defaultValue: 'Failed to fetch student balance data' }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [summaryQuery.isError, prevQuery.isError, prevQueryUX.enabled]);

    const students = useMemo(() => {
        const baseRows = Array.isArray(summaryQuery.data) ? summaryQuery.data : [];
        const prevRows = (canSeePreviousBalanceData && Array.isArray(prevQuery.data?.rows)) ? prevQuery.data.rows : [];
        const prevByStudent = new Map(prevRows.map(r => [String(r.studentObjectId), r]));

        return baseRows.map(r => {
            const p = prevByStudent.get(String(r._id));
            const prevOutstanding = canSeePreviousBalanceData ? Number(p?.balance || 0) : 0;
            const baseBalance = Number(r?.balance || 0);
            return {
                ...r,
                previousBalance: prevOutstanding,
                balanceWithPrevious: baseBalance + prevOutstanding,
            };
        });
    }, [summaryQuery.data, prevQuery.data, canSeePreviousBalanceData]);

    // Removal of broken fetchStats - stats should be handled at parent level if needed

    // --- EXPORT FUNCTIONS ---

    const exportToCSV = () => {
        const headers = ["Student ID", "Name", "Class", "Contact", "Status", "Balance"];
        const rows = students.map(s => {
            const balance = (s.balanceWithPrevious ?? s.balance) || 0;
            const chargeCountThisMonth = Number(s.chargeCountThisMonth || 0);
            const status = balance > 0
                ? 'Unpaid'
                : (chargeCountThisMonth === 0 ? 'Not Charged' : 'Paid');
            return [
                s.studentId || 'N/A',
                s.fullName || 'N/A',
                s.className || 'N/A',
                s.phone || s.parentPhone || 'N/A',
                status,
                balance.toFixed(2)
            ];
        });

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Student_Balances_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(t('finance.studentFinance.receiptTab.toasts.exporting', { defaultValue: 'Exporting to Excelâ€¦' }));
    };

    useEffect(() => {
        setPage(1);
    }, [classId, filterType, search]);



    const handleSearch = async (overrides = {}) => {
        // Handle event if called from form
        if (overrides && overrides.preventDefault) overrides.preventDefault();

        const params = {};
        const activeSearch = overrides.search !== undefined ? overrides.search : search;
        const activeClassId = overrides.classId !== undefined ? overrides.classId : classId;
        const activeType = overrides.type !== undefined ? overrides.type : (filterType || null);

        if (activeSearch) params.search = activeSearch;
        if (activeClassId) params.classId = activeClassId;
        if (activeType) params.type = activeType;

        setSubmittedParams(params);
    };

    const resetFilters = () => {
        setSearch('');
        setGradeId('');
        setShiftId('');
        setClassId('');
        setFilterType('');
        setSubmittedParams({});
    };

    const tableItems = useMemo(() => {
        const list = Array.isArray(students) ? students : [];
        return list.map((s) => {
            const balance = Number((s.balanceWithPrevious ?? s.balance) || 0);
            const chargeCountThisMonth = Number(s.chargeCountThisMonth || 0);
            const totalPaid = Number(s.totalPaid || 0);
            const totalBilled = Number(s.totalBilled || 0);

            let balanceColor = 'text-red-500';
            if (balance <= 0 && totalBilled > 0) balanceColor = 'text-green-600';
            else if (totalPaid > 0 && balance > 0) balanceColor = 'text-orange-500';
            else if (totalBilled === 0) balanceColor = 'text-(--nb-color-muted)';

            const status = balance > 0
                ? 'Unpaid'
                : (chargeCountThisMonth === 0 ? 'Not Charged' : 'Paid');

            return {
                _id: s._id,
                studentId: s.studentId || 'â€”',
                fullName: s.fullName || 'â€”',
                contact: s.phone || s.parentPhone || 'â€”',
                className: s.className || 'â€”',
                balance,
                balanceColor,
                hasHormaris: Number(s.hormarisOutstandingAmount || 0) > 0,
                status,
                raw: s,
            };
        });
    }, [students]);

    const onSort = (field) => {
        const f = String(field || '').trim();
        if (!f) return;
        setSortBy((prev) => {
            if (prev === f) {
                setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                return prev;
            }
            setSortDir('asc');
            return f;
        });
    };

    const sortedItems = useMemo(() => {
        const list = Array.isArray(tableItems) ? tableItems.slice() : [];
        const dir = sortDir === 'desc' ? -1 : 1;
        const field = String(sortBy || '').trim();
        if (!field) return list;

        list.sort((a, b) => {
            const av = a?.[field];
            const bv = b?.[field];
            if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
            return String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true, sensitivity: 'base' }) * dir;
        });
        return list;
    }, [tableItems, sortBy, sortDir]);

    const total = sortedItems.length;
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const currentRows = sortedItems.slice(start, start + limit);

    return (
        <div className="space-y-4">
            {/* Toolbar (actions + filters) */}
            <Card className="p-6 rounded-3xl shadow-(--nb-shadow-md) no-print">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                    {canCharge ? (
                        <Button
                            onClick={() => setShowChargeModal(true)}
                            variant="brand"
                            size="lg"
                            icon={<PlusCircle size={18} />}
                            className="rounded-lg font-bold"
                        >
                            {t('finance.studentFinance.receiptTab.actions.charge', { defaultValue: 'Charge' })}
                        </Button>
                    ) : null}

                    {canUpdateCharge ? (
                        <Button
                            onClick={() => setShowUpdateModal(true)}
                            variant="primary"
                            size="lg"
                            icon={<Edit size={18} />}
                            className="rounded-lg font-bold"
                        >
                            {t('finance.studentFinance.receiptTab.actions.updateCharge', { defaultValue: 'Update Charge' })}
                        </Button>
                    ) : null}

                    {canDeleteCharge ? (
                        <Button
                            onClick={() => setShowDeleteModal(true)}
                            variant="danger"
                            size="lg"
                            icon={<Trash2 size={18} />}
                            className="rounded-lg font-bold"
                        >
                            {t('finance.studentFinance.receiptTab.actions.deleteCharge', { defaultValue: 'Delete Charge' })}
                        </Button>
                    ) : null}

                    {/* Print Group */}
                        {canPrint ? (
                            <div className="flex gap-2 lg:mx-2 border-l border-(--nb-color-border) pl-2">
                                <Button
                                    onClick={() => setShowMonthlyPrint(true)}
                                    variant="neutral"
                                    size="md"
                                    icon={<Printer size={16} />}
                                    className="rounded-lg font-bold text-xs"
                                >
                                    {t('finance.studentFinance.receiptTab.actions.printMonthly', { defaultValue: 'Monthly' })}
                                </Button>
                                <Button
                                    onClick={() => setShowDailyPrint(true)}
                                    variant="neutral"
                                    size="md"
                                    icon={<Printer size={16} />}
                                    className="rounded-lg font-bold text-xs"
                                >
                                    {t('finance.studentFinance.receiptTab.actions.printDaily', { defaultValue: 'Daily' })}
                                </Button>
                                <Button
                                    onClick={() => setShowPassCardPrint(true)}
                                    variant="neutral"
                                    size="md"
                                    icon={<GraduationCap size={16} />}
                                    className="rounded-lg font-bold text-xs"
                                >
                                    {t('finance.studentFinance.receiptTab.actions.printPasscard', { defaultValue: 'Passcard' })}
                                </Button>
                            </div>
                        ) : null}
                    </div>

                    {/* Export Group */}
                    <div className="flex gap-2">
                        {canDownload ? (
                            <Button
                                onClick={exportToCSV}
                                variant="neutral"
                                size="lg"
                                icon={<FileText size={18} />}
                                className="rounded-lg font-bold"
                            >
                                {t('finance.studentFinance.receiptTab.actions.excelExport', { defaultValue: 'Excel Export' })}
                            </Button>
                        ) : null}
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-(--nb-color-border) flex flex-col md:flex-row items-stretch gap-4">
                    <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-(--nb-color-muted)" size={20} />
                            <Input
                                type="text"
                                className="h-11 pl-10 pr-4 font-medium"
                                placeholder={t('finance.studentFinance.receiptTab.placeholders.search', { defaultValue: 'Search ID, Name or Phoneâ€¦' })}
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
                        onChange={(v) => {
                            setClassId(v || '');
                            handleSearch({ classId: v || '' });
                        }}
                        searchable
                        maxVisible={6}
                        placeholder={t('common.filters.section', { defaultValue: 'Section' })}
                        searchPlaceholder={t('common.search', { defaultValue: 'Searchâ€¦' })}
                        className="h-11 min-w-50 font-bold text-sm"
                    />

                    <DropdownSelect
                        value={filterType}
                        onChange={(v) => {
                            setFilterType(v);
                            handleSearch({ type: v || null });
                        }}
                        options={[
                            { value: '', label: t('finance.studentFinance.receiptTab.filters.thisMonth.title', { defaultValue: 'Filter (This Month)' }) },
                            { value: 'charged', label: t('finance.studentFinance.receiptTab.filters.thisMonth.charged', { defaultValue: 'Charged This Month' }) },
                            { value: 'paid', label: t('finance.studentFinance.receiptTab.filters.thisMonth.paid', { defaultValue: 'Paid This Month' }) },
                            { value: 'unpaid', label: t('finance.studentFinance.receiptTab.filters.thisMonth.unpaid', { defaultValue: 'Unpaid This Month' }) },
                            { value: 'uncharged', label: t('finance.studentFinance.receiptTab.filters.thisMonth.uncharged', { defaultValue: 'Not Charged This Month' }) },
                            { value: 'hormaris', label: t('finance.studentFinance.receiptTab.filters.thisMonth.hormaris', { defaultValue: 'Hormaris' }) },
                        ]}
                        clearable={false}
                        className="h-11 min-w-55 font-bold text-sm"
                    />

                    <div className="flex gap-2">
                        <Button
                            onClick={handleSearch}
                            variant="brand"
                            size="lg"
                            className="h-11 px-8 font-black text-sm uppercase tracking-widest"
                        >
                            {t('finance.studentFinance.receiptTab.actions.go', { defaultValue: 'Go' })}
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
                </div>
            </Card>

            {/* Student Table */}
            <Card className="rounded-3xl shadow-(--nb-shadow-md)">
                <StandardTable
                    isLoading={loading}
                    error={null}
                    items={sortedItems}
                    loadingMessage={t('finance.studentFinance.receiptTab.loading.syncingLedger', { defaultValue: 'Syncing Ledgerâ€¦' })}
                    loadingVariant="table"
                    loadingRows={8}
                    loadingColumns={6}
                    emptyTitle={t('finance.studentFinance.receiptTab.empty.title', { defaultValue: 'No records found for this selection.' })}
                    emptyDescription=""

                    rows={currentRows}
                    columns={[
                        { key: 'studentId', label: t('finance.studentFinance.receiptTab.columns.id', { defaultValue: 'ID' }), sortable: true, field: 'studentId' },
                        { key: 'fullName', label: t('finance.studentFinance.receiptTab.columns.studentName', { defaultValue: 'Student Name' }), sortable: true, field: 'fullName' },
                        { key: 'contact', label: t('finance.studentFinance.receiptTab.columns.contact', { defaultValue: 'Contact' }), sortable: true, field: 'contact' },
                        { key: 'className', label: t('finance.studentFinance.receiptTab.columns.class', { defaultValue: 'Class' }), sortable: true, field: 'className' },
                        { key: 'balance', label: t('finance.studentFinance.receiptTab.columns.balance', { defaultValue: 'Balance' }), sortable: true, field: 'balance', align: 'right' },
                        { key: 'actions', label: t('finance.studentFinance.receiptTab.columns.info', { defaultValue: 'Info' }), sortable: false, align: 'right', noPrint: true, tdClassName: 'no-print' },
                    ]}
                    storageKey="finance:studentFinance:receipt:columns:v1"
                    controlsProps={{
                        limit,
                        total,
                        onLimit: (v) => {
                            setLimit(v);
                            setPage(1);
                        },
                        className: 'px-6 bg-(--nb-color-bg-card)',
                    }}
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={onSort}
                    getRowKey={(row) => row?._id || row?.id}
                    renderCell={(row, col) => {
                        switch (col.key) {
                            case 'studentId':
                                return <span className="font-mono text-xs font-bold text-(--nb-color-muted)">{row?.studentId || 'â€”'}</span>;
                            case 'fullName':
                                return <span className="font-bold text-(--nb-color-fg)">{row?.fullName || 'â€”'}</span>;
                            case 'contact':
                                return <span className="text-(--nb-color-muted) text-sm font-medium">{row?.contact || 'â€”'}</span>;
                            case 'className':
                                return (
                                    <span className="px-2 py-1 bg-(--nb-color-bg) text-(--nb-color-muted) rounded text-[10px] font-black uppercase tracking-tight border border-(--nb-color-border)">
                                        {row?.className || 'â€”'}
                                    </span>
                                );
                            case 'balance':
                                return (
                                    <div className="flex flex-col items-end leading-tight">
                                        <span className={`font-black text-sm ${row?.balanceColor || 'text-(--nb-color-fg)'}`}>
                                            ${Number(row?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                        {row?.hasHormaris ? (
                                            <span className="text-[9px] font-black uppercase tracking-widest text-red-600">
                                                {t('finance.studentFinance.receiptTab.labels.hormaris', { defaultValue: 'Hormaris' })}
                                            </span>
                                        ) : null}
                                    </div>
                                );
                            case 'actions':
                                return (
                                    <RowActionButtons
                                        actions={[
                                            ...(canViewInfoModal ? [
                                                {
                                                    key: 'info',
                                                    label: t('finance.studentFinance.receiptTab.actions.viewInfo', { defaultValue: 'View Info' }),
                                                    title: t('finance.studentFinance.receiptTab.actions.viewInfo', { defaultValue: 'View Info' }),
                                                    tone: 'view',
                                                    showLabel: true,
                                                    icon: null,
                                                    onClick: () => {
                                                        setSelectedStudentRow({ student: row?.raw, totalBalance: row?.balance || 0 });
                                                        setShowInfoModal(true);
                                                    },
                                                },
                                            ] : []),
                                        ]}
                                    />
                                );
                            default:
                                return '';
                        }
                    }}
                    meta={{ page: safePage, totalPages, limit, total }}
                    onPage={setPage}
                    onLimit={(v) => { setLimit(v); setPage(1); }}
                    showRowsSelector={false}
                    paginationProps={{ className: 'no-print', infoVariant: 'page' }}
                    tableProps={{
                        shellClassName: 'rounded-none border-0 shadow-none ring-0',
                    }}
                />
            </Card>

            {/* Modal Components */}
            {
                showChargeModal && canCharge && (
                    <StudentChargeModal
                        onClose={() => setShowChargeModal(false)}
                        onSuccess={handleSearch}
                    />
                )
            }

            {
                showInfoModal && selectedStudentRow && (
                    <StudentFinancePaymentModal
                        row={selectedStudentRow}
                        onClose={() => setShowInfoModal(false)}
                        onPaid={handleSearch}
                        permissionModule="financeStudentReceiptModal"
                        legacyModule="financeStudentReceipt"
                    />
                )
            }

            {showMonthlyPrint && canPrint && <PrintMonthlyInvoiceModal onClose={() => setShowMonthlyPrint(false)} />}
            {showDailyPrint && canPrint && <PrintDailyInvoiceModal onClose={() => setShowDailyPrint(false)} />}
            {showPassCardPrint && canPrint && <PrintPassCardModal onClose={() => setShowPassCardPrint(false)} />}

            {
                showUpdateModal && canUpdateCharge && (
                    <UpdateChargeModal
                        onClose={() => setShowUpdateModal(false)}
                        onSuccess={handleSearch}
                    />
                )
            }

            {
                showDeleteModal && canDeleteCharge && (
                    <DeleteChargeModal
                        onClose={() => setShowDeleteModal(false)}
                        onSuccess={handleSearch}
                    />
                )
            }
        </div >
    );
};

// Placeholder tabs removed - replaced by actual components above


export default function StudentFees() {
    const { t } = useI18n();
    const { hasPermission } = useAuth();

    const canSeeReceiptTab = ['view', 'add', 'edit', 'delete', 'download'].some((a) => hasPermission('financeStudentReceipt', a));
    const canSeePreviousBalanceTab = ['view', 'add', 'edit', 'delete'].some((a) => hasPermission('financeStudentPreviousBalance', a));
    const canSeeAmountTypeTab = ['view', 'add', 'edit', 'delete'].some((a) => hasPermission('financeStudentAmountType', a));
    const canSeeFeeTypeTab = ['view', 'add', 'edit', 'delete'].some((a) => hasPermission('financeStudentFeeType', a));

    const initialTab = (
        canSeeReceiptTab ? 'receipt'
            : (canSeePreviousBalanceTab ? 'previousBalance'
                : (canSeeAmountTypeTab ? 'amountType'
                    : (canSeeFeeTypeTab ? 'feeType' : 'receipt')))
    );

    const [activeTab, setActiveTab] = useState(initialTab);

    const tabs = [
        canSeeReceiptTab ? { id: 'receipt', label: t('finance.studentFinance.tabs.receipt', { defaultValue: 'Receipt' }), icon: Receipt } : null,
        canSeePreviousBalanceTab ? { id: 'previousBalance', label: t('finance.studentFinance.tabs.previousBalance', { defaultValue: 'Previous Balance' }), icon: Wallet } : null,
        canSeeAmountTypeTab ? { id: 'amountType', label: t('finance.studentFinance.tabs.amountType', { defaultValue: 'Amount Type' }), icon: Settings } : null,
        canSeeFeeTypeTab ? { id: 'feeType', label: t('finance.studentFinance.tabs.feeType', { defaultValue: 'Fee Type' }), icon: Settings } : null,
    ];

    const visibleTabs = useMemo(() => tabs.filter(Boolean), [tabs]);

    useEffect(() => {
        if (visibleTabs.some((tab) => tab.id === activeTab)) return;
        setActiveTab(visibleTabs[0]?.id || 'receipt');
    }, [activeTab, visibleTabs]);

    return (
        <div className="space-y-6">
            <div className="no-print">
                <div className="w-full overflow-x-auto">
                    <div className="min-w-max">
                        <Tabs
                            value={activeTab}
                            onChange={setActiveTab}
                            tone="blue"
                            options={visibleTabs.map((tab) => {
                                const Icon = tab.icon;
                                return {
                                    value: tab.id,
                                    label: (
                                        <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                            <Icon size={14} />
                                            <span>{tab.label}</span>
                                        </span>
                                    ),
                                };
                            })}
                        />
                    </div>
                </div>
            </div>

            <div className="min-h-125">
                {activeTab === 'receipt' && canSeeReceiptTab ? <ReceiptTab /> : null}
                {activeTab === 'previousBalance' && canSeePreviousBalanceTab ? <PreviousBalanceTab /> : null}
                {activeTab === 'amountType' && canSeeAmountTypeTab ? <AmountTypeTab /> : null}
                {activeTab === 'feeType' && canSeeFeeTypeTab ? <FeeTypeTab /> : null}
            </div>
        </div>
    );
}
