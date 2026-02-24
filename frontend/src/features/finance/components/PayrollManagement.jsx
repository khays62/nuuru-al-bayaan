import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Printer, RotateCcw, Trash2, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import financeService from '../api/finance';
import { usePayrollsQuery } from '../hooks/payrollHooks';

import { useI18n } from '../../../i18n/I18nProvider.jsx';
import { useAuth } from '../../../auth/AuthContext';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';

import Card from '../../../shared/components/ui/Card.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import AcademicYearSelect from '../../lookups/components/AcademicYearSelect.jsx';

import PayrollChargeModal from './PayrollChargeModal';
import PayrollDeleteModal from './PayrollDeleteModal';
import PayrollEmployeeInfoModal from './PayrollEmployeeInfoModal';
import PayrollPrintModal from './PayrollPrintModal';
import PayrollUpdateModal from './PayrollUpdateModal';
import PayrollShowModal from './PayrollShowModal';

export default function PayrollManagement() {
    const { t } = useI18n();
    const { hasPermission } = useAuth();

    const canCharge = hasPermission('financePayroll', 'add');
    const canUpdate = hasPermission('financePayroll', 'edit');
    const canDelete = hasPermission('financePayroll', 'delete');
    const canPrint = hasPermission('financePrint', 'print');

    const canViewEmployeeInfo =
        hasPermission('financePayrollEmployeeInfo', 'view') ||
        hasPermission('financePayrollEmployeeInfo', 'full') ||
        // Backward-compatible legacy
        hasPermission('financePayroll', 'view') ||
        hasPermission('financePayroll', 'edit');

    const queryClient = useQueryClient();
    const cachedAcademicYears = queryClient.getQueryData(['academicYears']);

    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [academicYear, setAcademicYear] = useState(() => cachedAcademicYears?.[0]?._id || '');
    const [toastKey, setToastKey] = useState(0);

    const [sortBy, setSortBy] = useState('dateSort');
    const [sortDir, setSortDir] = useState('desc');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const [showCharge, setShowCharge] = useState(false);
    const [showUpdate, setShowUpdate] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [showEmployeeInfo, setShowEmployeeInfo] = useState(false);
    const [showUnpaid, setShowUnpaid] = useState(false);
    const [showPrint, setShowPrint] = useState(false);
    const [updateContext, setUpdateContext] = useState(null);
    const [infoStaffId, setInfoStaffId] = useState('');

    const academicYearsQuery = useQuery({
        queryKey: ['academicYears'],
        queryFn: () => financeService.getAcademicYears(),
        placeholderData: (prev) => prev,
        staleTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    const academicYears = Array.isArray(academicYearsQuery.data) ? academicYearsQuery.data : [];

    useEffect(() => {
        if (!academicYear && academicYears?.length) {
            setAcademicYear(academicYears[0]?._id || '');
        }
    }, [academicYear, academicYears]);

    const payrollQuery = usePayrollsQuery(
        { month, academicYear: academicYear || undefined },
        // Avoid double/triple skeleton on mount:
        // we only fetch once academicYear is known.
        { enabled: Boolean(month) && Boolean(academicYear) }
    );

    const payrolls = Array.isArray(payrollQuery.data) ? payrollQuery.data : [];
    const isLoading = Boolean(payrollQuery.isLoading && payrollQuery.data == null);

    useEffect(() => {
        if (!payrollQuery.isError) return;
        const msg = payrollQuery.error?.response?.data?.message || payrollQuery.error?.message || t('finance.payroll.errors.loadFailed', { defaultValue: 'Failed to load payroll data' });
        // prevent spam while query retries/refetches
        if (toastKey === 0) {
            toast.error(msg);
            setToastKey(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payrollQuery.isError]);

    useEffect(() => {
        setToastKey(0);
    }, [month, academicYear]);

    useEffect(() => {
        setPage(1);
    }, [month, academicYear]);

    const totalSalary = useMemo(
        () => (payrolls || []).reduce((sum, p) => sum + Number(p.netSalary || 0), 0),
        [payrolls]
    );

    const formatDate = (value) => {
        if (!value) return '-';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '-';
        return d.toISOString().slice(0, 10);
    };

    const formatEmployeeType = (staff) => {
        const raw = String(staff?.employeeType || staff?.role || '').trim();
        if (!raw) return '-';
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    };

    const tableItems = useMemo(() => {
        const list = Array.isArray(payrolls) ? payrolls : [];
        return list.map((p, idx) => {
            const dateRaw = p.paymentDate || p.createdAt;
            const dateSort = dateRaw ? new Date(dateRaw).getTime() : 0;
            const staff = p.staff || {};
            return {
                _id: p._id,
                date: formatDate(dateRaw),
                dateSort: Number.isFinite(dateSort) ? dateSort : 0,
                no: idx + 1,
                employeeId: String(staff?.employeeId || staff?.username || p._id?.slice(-6) || '-'),
                employeeName: staff?.fullName || '-',
                phone: staff?.phone || '-',
                employeeType: formatEmployeeType(staff),
                salary: Number(p.netSalary || 0),
                status: p.status || '-',
                raw: p,
            };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payrolls]);

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

        const cmp = (a, b) => {
            const av = a?.[field];
            const bv = b?.[field];
            if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
            return String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true, sensitivity: 'base' }) * dir;
        };
        list.sort(cmp);
        return list;
    }, [tableItems, sortBy, sortDir]);

    const total = sortedItems.length;
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const currentRows = sortedItems.slice(start, start + limit);

    const onReset = () => {
        setMonth(new Date().toISOString().slice(0, 7));
        setAcademicYear(academicYears?.[0]?._id || '');
        setSortBy('dateSort');
        setSortDir('desc');
        setPage(1);
        setLimit(10);
        try {
            payrollQuery.refetch();
        } catch {
            // ignore
        }
    };

    return (
        <div className="space-y-6">
            <Card className="p-4">
                <div className="flex flex-col gap-3">
                    <FilterRow>
                        <FilterItem minWidthClass="sm:min-w-44">
                            <div className="space-y-1">
                                <div className="text-xs text-(--nb-color-muted)">{t('finance.payroll.filters.month', { defaultValue: 'Month' })}</div>
                                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                            </div>
                        </FilterItem>
                        <FilterItem minWidthClass="sm:min-w-56" className="sm:max-w-xs">
                            <div className="space-y-1">
                                <div className="text-xs text-(--nb-color-muted)">{t('common.filters.academicYear', { defaultValue: 'Academic Year' })}</div>
                                <AcademicYearSelect
                                    value={academicYear}
                                    onChange={(v) => setAcademicYear(v)}
                                    maxVisible={5}
                                    placeholder={t('common.filters.any', { defaultValue: 'Any' })}
                                    searchPlaceholder={t('common.searchPlaceholders.academicYears', { defaultValue: 'Search academic years…' })}
                                />
                            </div>
                        </FilterItem>

                        <FilterItem className="sm:ml-auto">
                            <div className="flex items-center justify-end gap-3 flex-wrap">
                                <div className="flex items-center justify-end gap-2 flex-wrap">
                                    {canCharge ? (
                                        <Button variant="brand" size="lg" onClick={() => setShowCharge(true)} className="w-full sm:w-auto justify-center">
                                            {t('finance.payroll.actions.charge', { defaultValue: 'Charge' })}
                                        </Button>
                                    ) : null}
                                    <Button variant="neutral" size="lg" onClick={() => setShowUnpaid(true)} className="w-full sm:w-auto justify-center">
                                        {t('finance.payroll.actions.show', { defaultValue: 'Show' })}
                                    </Button>
                                    {canPrint ? (
                                        <ActionButton
                                            variant="outline"
                                            icon={<Printer size={16} />}
                                            onClick={() => setShowPrint(true)}
                                            title={t('common.actions.print', { defaultValue: 'Print' })}
                                        >
                                            {t('common.actions.print', { defaultValue: 'Print' })}
                                        </ActionButton>
                                    ) : null}

                                    {canUpdate ? (
                                        <ActionButton
                                            variant="outline"
                                            icon={<Pencil size={16} />}
                                            onClick={() => {
                                                setUpdateContext(null);
                                                setShowUpdate(true);
                                            }}
                                            title={t('common.actions.update', { defaultValue: 'Update' })}
                                        >
                                            {t('common.actions.update', { defaultValue: 'Update' })}
                                        </ActionButton>
                                    ) : null}

                                    {canDelete ? (
                                        <ActionButton
                                            variant="danger"
                                            icon={<Trash2 size={16} />}
                                            onClick={() => {
                                                setUpdateContext(null);
                                                setShowDelete(true);
                                            }}
                                            title={t('common.actions.delete', { defaultValue: 'Delete' })}
                                        >
                                            {t('common.actions.delete', { defaultValue: 'Delete' })}
                                        </ActionButton>
                                    ) : null}

                                    <ActionButton
                                        variant="outline"
                                        onClick={onReset}
                                        title={t('common.filters.resetTitle', { defaultValue: 'Reset filters' })}
                                        icon={<RotateCcw size={16} />}
                                    >
                                        {t('common.actions.reset', { defaultValue: 'Reset' })}
                                    </ActionButton>

                                    <div
                                        className="inline-flex items-center justify-end gap-2 h-10 px-3 rounded-md border border-green-200 bg-(--nb-color-bg-card) text-green-800 whitespace-nowrap"
                                        title={t('common.total', { defaultValue: 'Total' })}
                                    >
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                        </span>
                                        <span className="text-xs font-black uppercase tracking-widest">
                                            {t('common.total', { defaultValue: 'Total' })}
                                        </span>
                                        <span className="text-sm font-black font-mono inline-flex items-center gap-1 text-green-700">
                                            <DollarSign size={14} className="shrink-0" />
                                            <span>{totalSalary.toLocaleString()}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </FilterItem>
                    </FilterRow>
                </div>
            </Card>

            <Card className="p-0 overflow-hidden print-container print-fit-wide">
                <StandardTable
                    isLoading={isLoading}
                    error={null}
                    items={sortedItems}
                    loadingMessage={t('finance.payroll.table.loading', { defaultValue: 'Loading payroll…' })}
                    loadingVariant="table"
                    loadingRows={6}
                    loadingColumns={9}
                    emptyTitle={t('finance.payroll.table.emptyTitle', { defaultValue: 'No payroll entries found.' })}
                    emptyDescription={t('finance.payroll.table.emptyDescription', { defaultValue: '' })}

                    rows={currentRows}
                    columns={[
                        { key: 'date', label: t('finance.payroll.columns.date', { defaultValue: 'Date' }), sortable: true, field: 'dateSort' },
                        { key: 'no', label: t('finance.payroll.columns.no', { defaultValue: 'No' }), sortable: true, field: 'no' },
                        { key: 'employeeId', label: t('finance.payroll.columns.employeeId', { defaultValue: 'ID' }), sortable: true, field: 'employeeId' },
                        { key: 'employeeName', label: t('finance.payroll.columns.employeeName', { defaultValue: 'Employee Name' }), sortable: true, field: 'employeeName' },
                        { key: 'phone', label: t('finance.payroll.columns.phone', { defaultValue: 'Phone' }), sortable: false, field: 'phone' },
                        { key: 'employeeType', label: t('finance.payroll.columns.employeeType', { defaultValue: 'Employee Type' }), sortable: true, field: 'employeeType' },
                        { key: 'salary', label: t('finance.payroll.columns.salary', { defaultValue: 'Salary' }), sortable: true, field: 'salary', align: 'right' },
                        { key: 'status', label: t('common.filters.status', { defaultValue: 'Status' }), sortable: true, field: 'status' },
                        { key: 'actions', label: t('common.actions.actions', { defaultValue: 'Actions' }), sortable: false, align: 'right', noPrint: true, tdClassName: 'no-print' },
                    ]}
                    storageKey="finance:payroll:columns:v1"
                    controlsProps={{
                        limit,
                        total,
                        onLimit: (v) => {
                            setLimit(v);
                            setPage(1);
                        },
                    }}
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={onSort}
                    getRowKey={(row) => row?._id || row?.id}
                    renderCell={(row, col) => {
                        switch (col.key) {
                            case 'date':
                                return row?.date || '-';
                            case 'no':
                                return row?.no;
                            case 'employeeId':
                                return <span className="font-mono text-(--nb-color-muted)">{row?.employeeId || '-'}</span>;
                            case 'employeeName':
                                return <span className="font-bold text-(--nb-color-fg)">{row?.employeeName || '-'}</span>;
                            case 'phone':
                                return row?.phone || '-';
                            case 'employeeType':
                                return row?.employeeType || '-';
                            case 'salary':
                                return <span className="font-mono font-bold">{Number(row?.salary || 0).toLocaleString()}</span>;
                            case 'status':
                                return row?.status || '-';
                            case 'actions':
                                return (
                                    <RowActionButtons
                                        actions={[
                                            ...(canViewEmployeeInfo ? [
                                                {
                                                    key: 'info',
                                                    label: t('finance.payroll.actions.viewInfo', { defaultValue: 'View Info' }),
                                                    title: t('finance.payroll.actions.viewInfo', { defaultValue: 'View Info' }),
                                                    tone: 'view',
                                                    showLabel: true,
                                                    icon: null,
                                                    onClick: () => {
                                                        setInfoStaffId(row?.raw?.staff?._id || '');
                                                        setShowEmployeeInfo(true);
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
                />
            </Card>

            {showCharge && canCharge && (
                <PayrollChargeModal
                    onClose={() => setShowCharge(false)}
                    onSuccess={() => { payrollQuery.refetch(); }}
                    defaultMonth={month}
                    academicYears={academicYears}
                    defaultAcademicYearId={academicYear}
                />
            )}

            {showUpdate && canUpdate && (
                <PayrollUpdateModal
                    onClose={() => { setShowUpdate(false); setUpdateContext(null); }}
                    onSuccess={() => { payrollQuery.refetch(); }}
                    defaultMonth={month}
                    academicYears={academicYears}
                    defaultAcademicYearId={academicYear}
                    initialEmployeeId={updateContext?.employee}
                    initialMonth={updateContext?.month}
                    initialAcademicYearId={updateContext?.academicYear}
                />
            )}

            {showDelete && canDelete && (
                <PayrollDeleteModal
                    onClose={() => { setShowDelete(false); setUpdateContext(null); }}
                    onSuccess={() => { payrollQuery.refetch(); }}
                    defaultMonth={month}
                    academicYears={academicYears}
                    defaultAcademicYearId={academicYear}
                    initialDeleteType={updateContext?.employee ? 'single' : undefined}
                    initialStaffId={updateContext?.employee}
                    initialMonth={updateContext?.month}
                    initialAcademicYearId={updateContext?.academicYear}
                />
            )}

            {showEmployeeInfo && (
                <PayrollEmployeeInfoModal
                    onClose={() => setShowEmployeeInfo(false)}
                    onRefresh={() => payrollQuery.refetch()}
                    academicYears={academicYears}
                    defaultAcademicYearId={academicYear}
                    initialStaffId={infoStaffId}
                    onOpenUpdate={(ctx) => {
                        setUpdateContext(ctx);
                        setShowEmployeeInfo(false);
                        setShowUpdate(true);
                    }}
                />
            )}

            {showUnpaid && (
                <PayrollShowModal
                    onClose={() => setShowUnpaid(false)}
                    month={month}
                    academicYear={academicYear}
                    academicYears={academicYears}
                    onOpenInfo={(staffId) => {
                        setInfoStaffId(staffId || '');
                        setShowUnpaid(false);
                        setShowEmployeeInfo(true);
                    }}
                />
            )}

            {showPrint && canPrint && (
                <PayrollPrintModal
                    onClose={() => setShowPrint(false)}
                    defaultMonth={month}
                    academicYears={academicYears}
                    defaultAcademicYearId={academicYear}
                />
            )}
        </div>
    );
}
