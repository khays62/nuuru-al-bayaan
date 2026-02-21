import React, { useMemo, useState, useEffect } from 'react';
import { Search, Pencil, RotateCcw } from 'lucide-react';
import financeService from '../api/finance';
import toast from 'react-hot-toast';
import StudentFinancePaymentModal from './StudentFinancePaymentModal';
import { useFinanceStudentsSummaryQuery, usePreviousBalanceSummaryQuery } from '../hooks/studentFinanceHooks';
import { useFinanceCategoriesQuery } from '../hooks/financeConfigHooks';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import Card from '../../../shared/components/ui/Card.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import GradeSelect from '../../lookups/components/GradeSelect.jsx';
import ShiftSelect from '../../lookups/components/ShiftSelect.jsx';
import GradeSectionSelect from '../../lookups/components/GradeSectionSelect.jsx';

export default function PreviousBalanceTab() {
    const [search, setSearch] = useState('');
    const [classId, setClassId] = useState('');
    const [gradeId, setGradeId] = useState('');
    const [shiftId, setShiftId] = useState('');
    const [showMode, setShowMode] = useState('all'); // 'all' | 'withPrev'
    const [loading, setLoading] = useState(false);
    const [submittedParams, setSubmittedParams] = useState({});
    const [addMode, setAddMode] = useState(false);
    const [selectedStudentRow, setSelectedStudentRow] = useState(null);
    const [showInfoModal, setShowInfoModal] = useState(false);

    const [editingPrevBalance, setEditingPrevBalance] = useState({});

    const [sortBy, setSortBy] = useState('fullName');
    const [sortDir, setSortDir] = useState('asc');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    useEffect(() => {
        setPage(1);
    }, [search, classId, showMode]);

    const resetFilters = () => {
        setSearch('');
        setGradeId('');
        setShiftId('');
        setClassId('');
        setShowMode('all');
        setAddMode(false);
        setSubmittedParams({});
        setEditingPrevBalance({});
        setPage(1);
    };

    const feeCategoriesQuery = useFinanceCategoriesQuery({ type: 'fee', includePreviousBalance: true }, { staleTime: 30_000 });
    const feeCategories = Array.isArray(feeCategoriesQuery.data) ? feeCategoriesQuery.data : [];

    const previousBalanceCategoryId = useMemo(() => {
        const list = Array.isArray(feeCategories) ? feeCategories : [];
        const normalized = list
            .filter(c => c && c.type === 'fee' && (!c.status || c.status === 'active'))
            .map(c => ({ ...c, _name: String(c.name || '').trim().toLowerCase() }));

        const exact = normalized.find(c => c._name === 'previous balance');
        if (exact?._id) return exact._id;

        const contains = normalized.find(c => c._name.includes('previous') && c._name.includes('balance'));
        if (contains?._id) return contains._id;

        const fallback = normalized.find(c => c._name.includes('balance'));
        return fallback?._id || null;
    }, [feeCategories]);

    const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

    const queryUX = {
        enabled: true,
        staleTime: 60_000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    };

    const summaryQuery = useFinanceStudentsSummaryQuery(submittedParams, queryUX);
    const prevCurrentQuery = usePreviousBalanceSummaryQuery({ ...submittedParams, month: currentMonth }, queryUX);
    const prevAnyQuery = usePreviousBalanceSummaryQuery(submittedParams, {
        ...queryUX,
        enabled: showMode === 'withPrev',
    });

    useEffect(() => {
        // Only show skeleton on first load. Background refetches should keep data visible.
        setLoading(Boolean(summaryQuery.isLoading || prevCurrentQuery.isLoading || prevAnyQuery.isLoading));
    }, [summaryQuery.isLoading, prevCurrentQuery.isLoading, prevAnyQuery.isLoading]);

    useEffect(() => {
        if (!summaryQuery.isError && !prevCurrentQuery.isError && !prevAnyQuery.isError) return;
        toast.error('Failed to fetch student balance data');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [summaryQuery.isError, prevCurrentQuery.isError, prevAnyQuery.isError]);

    const students = useMemo(() => {
        const baseRows = Array.isArray(summaryQuery.data) ? summaryQuery.data : [];
        const currentRows = Array.isArray(prevCurrentQuery.data?.rows) ? prevCurrentQuery.data.rows : [];
        const anyRows = Array.isArray(prevAnyQuery.data?.rows) ? prevAnyQuery.data.rows : [];

        const currentByStudent = new Map(currentRows.map(r => [String(r.studentObjectId), r]));
        const anyByStudent = new Map(anyRows.map(r => [String(r.studentObjectId), r]));

        let merged = baseRows.map(r => {
            const pCurrent = currentByStudent.get(String(r._id));
            const pAny = anyByStudent.get(String(r._id));

            return {
                ...r,
                prevInvoiceId: pCurrent?.invoiceId || null,
                prevAmount: Number(pCurrent?.amount || 0),
                prevPaidAmount: Number(pCurrent?.paidAmount || 0),
                prevBalance: Number(pCurrent?.balance || 0),
                anyPrevInvoiceId: pAny?.invoiceId || null,
                anyPrevBillingMonth: pAny?.billingMonth || null,
            };
        });

        if (showMode === 'withPrev') {
            if (anyRows.length === 0) merged = [];
            else merged = merged.filter(r => !!r.anyPrevInvoiceId);
        }

        return merged;
    }, [summaryQuery.data, prevCurrentQuery.data, prevAnyQuery.data, showMode]);

    const handleSearch = async (e, overrides = {}) => {
        if (e && e.preventDefault) e.preventDefault();

        const effectiveSearch = typeof overrides.search === 'string' ? overrides.search : search;
        const effectiveClassId = typeof overrides.classId === 'string' ? overrides.classId : classId;

        const params = {};
        if (effectiveSearch) params.search = effectiveSearch;
        if (effectiveClassId) params.classId = effectiveClassId;

        setSubmittedParams(params);
    };

    const handlePrevBalanceChange = (studentObjectId, val) => {
        setEditingPrevBalance(prev => ({ ...prev, [studentObjectId]: val }));
    };

    const handleEditRow = (row) => {
        if (!row?._id) return;
        setAddMode(true);
        const suggested = row?.prevInvoiceId
            ? (row?.prevAmount ?? '')
            : (row?.prevBalance ?? '');
        setEditingPrevBalance(prev => ({
            ...prev,
            [row._id]: suggested === null || suggested === undefined ? '' : String(suggested),
        }));
    };


    const handleSavePreviousBalances = async () => {
        if (!previousBalanceCategoryId) {
            return toast.error('Create an Amount Type named "Previous Balance" first');
        }

        const entries = (students || [])
            .map(s => ({ student: s, raw: String(editingPrevBalance?.[s?._id] ?? '').trim() }))
            .filter(x => x.student?._id && x.raw);

        if (entries.length === 0) return toast.error('Enter at least one balance amount');

        for (const { raw } of entries) {
            const amt = Number(raw);
            if (!Number.isFinite(amt) || amt <= 0) return toast.error('Enter valid amounts (greater than 0)');
        }

        try {
            setLoading(true);
            toast.loading('Saving previous balances...');

            for (const { student, raw } of entries) {
                const amount = Number(raw);

                // Upsert for CURRENT month only
                if (student?.prevInvoiceId) {
                    const alreadyPaid = Number(student?.prevPaidAmount || 0);
                    if (alreadyPaid > amount) {
                        throw new Error(`Cannot set ${student?.fullName || 'student'} below already paid ($${alreadyPaid.toFixed(2)})`);
                    }
                    await financeService.updateCharge({
                        studentId: student._id,
                        categoryId: previousBalanceCategoryId,
                        month: currentMonth,
                        amount,
                        reason: 'Previous Balance edit',
                    });
                } else {
                    await financeService.chargeStudentFees({
                        chargeType: 'single',
                        studentId: student._id,
                        classId: classId || undefined,
                        month: currentMonth,
                        categoryId: previousBalanceCategoryId,
                        feeType: 'personal',
                        amount,
                    });
                }
            }

            setEditingPrevBalance({});
            setAddMode(false);
            toast.dismiss();
            toast.success('Previous balances saved');
            await handleSearch();
        } catch (err) {
            toast.dismiss();
            toast.error(err?.response?.data?.message || err?.message || 'Failed to save previous balances');
        } finally {
            setLoading(false);
        }
    };

    const getInputValue = (row) => {
        const edited = editingPrevBalance?.[row?._id];
        if (edited !== undefined) return edited;
        if (row?.prevInvoiceId) return row.prevAmount ? String(row.prevAmount) : '';
        return '';
    };

    const tableItems = useMemo(() => {
        const list = Array.isArray(students) ? students : [];
        return list.map((s) => ({
            _id: s._id,
            studentId: s.studentId || '—',
            fullName: s.fullName || '—',
            contact: s.phone || '—',
            className: s.className || '—',
            prevBalance: Number(s.prevBalance || 0),
            raw: s,
        }));
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
            <Card className="p-6 rounded-3xl shadow-(--nb-shadow-md) no-print">
                <div className="flex flex-col md:flex-row items-stretch gap-4">
                    <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-(--nb-color-muted)" size={20} />
                            <Input
                                type="text"
                                className="h-11 pl-10 pr-4 font-medium"
                                placeholder="Search Student ID, Name or Phone..."
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
                            setAddMode(false);
                        }}
                        placeholder="Grade"
                        className="h-11 min-w-40 font-bold text-sm"
                    />

                    <ShiftSelect
                        value={shiftId}
                        onChange={(v) => {
                            setShiftId(v || '');
                            setClassId('');
                            setAddMode(false);
                        }}
                        placeholder="Shift"
                        className="h-11 min-w-40 font-bold text-sm"
                    />

                    <GradeSectionSelect
                        gradeId={gradeId}
                        shiftId={shiftId}
                        value={classId}
                        onChange={(v) => {
                            setClassId(v || '');
                            setAddMode(false);
                            handleSearch(null, { classId: v || '' });
                        }}
                        searchable
                        maxVisible={6}
                        placeholder="Section"
                        searchPlaceholder="Search…"
                        className="h-11 min-w-50 font-bold text-sm"
                    />

                    <DropdownSelect
                        value={showMode}
                        onChange={(v) => {
                            setShowMode(v);
                            setAddMode(false);
                        }}
                        options={[
                            { value: 'all', label: 'Show All' },
                            { value: 'withPrev', label: 'Show Previous Balance' },
                        ]}
                        clearable={false}
                        className="h-11 min-w-50 font-bold text-sm"
                    />

                    <div className="flex gap-2">
                        <Button
                            onClick={handleSavePreviousBalances}
                            variant="primary"
                            size="lg"
                            className="h-11 px-8 font-black text-sm uppercase tracking-widest"
                        >
                            Save
                        </Button>
                        <Button
                            onClick={() => {
                                setAddMode(true);
                                handleSearch();
                            }}
                            variant="brand"
                            size="lg"
                            className="h-11 px-8 font-black text-sm uppercase tracking-widest"
                        >
                            Add
                        </Button>
                        <Button
                            onClick={resetFilters}
                            variant="neutral"
                            size="lg"
                            icon={<RotateCcw size={16} />}
                            className="h-11 px-6 font-black text-sm uppercase tracking-widest"
                            title="Reset filters"
                        >
                            Reset
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="rounded-3xl shadow-(--nb-shadow-md)">
                <StandardTable
                    isLoading={loading}
                    error={null}
                    items={sortedItems}
                    loadingMessage="Opening Archives..."
                    loadingVariant="table"
                    loadingRows={8}
                    loadingColumns={6}
                    emptyTitle="No records found for this selection."
                    emptyDescription=""

                    rows={currentRows}
                    columns={[
                        { key: 'studentId', label: 'ID', sortable: true, field: 'studentId' },
                        { key: 'fullName', label: 'Student Name', sortable: true, field: 'fullName' },
                        { key: 'contact', label: 'Contact', sortable: true, field: 'contact' },
                        { key: 'className', label: 'Class', sortable: true, field: 'className' },
                        { key: 'prevBalance', label: 'Balance', sortable: true, field: 'prevBalance', align: 'right' },
                        { key: 'actions', label: 'Actions', sortable: false, align: 'right', noPrint: true, tdClassName: 'no-print' },
                    ]}
                    storageKey="finance:previous-balance:columns:v1"
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
                        const raw = row?.raw;
                        switch (col.key) {
                            case 'studentId':
                                return <span className="p-0 font-mono text-xs font-bold text-(--nb-color-muted)">{row?.studentId || '—'}</span>;
                            case 'fullName':
                                return (
                                    <div className="flex flex-col items-start">
                                        <span className="font-bold text-(--nb-color-fg)">{row?.fullName || '—'}</span>
                                        <span className="text-[10px] text-(--nb-color-muted) font-mono uppercase tracking-widest">B/F ACCOUNT</span>
                                    </div>
                                );
                            case 'contact':
                                return <span className="text-(--nb-color-muted) text-sm font-medium">{row?.contact || '—'}</span>;
                            case 'className':
                                return (
                                    <span className="px-2 py-1 bg-(--nb-color-bg) text-(--nb-color-muted) rounded text-[10px] font-black uppercase tracking-tight border border-(--nb-color-border)">
                                        {row?.className || '—'}
                                    </span>
                                );
                            case 'prevBalance':
                                return (
                                    <div className="flex flex-col items-end gap-2">
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="0.00"
                                            value={getInputValue(raw)}
                                            onChange={(e) => handlePrevBalanceChange(raw?._id, e.target.value)}
                                            disabled={!addMode}
                                            readOnly={!addMode}
                                            className={`h-9 w-32 font-black text-xs text-right ${addMode ? 'bg-(--nb-color-bg)' : 'bg-(--nb-color-bg-card) cursor-not-allowed opacity-75'}`}
                                        />
                                        <span className="text-[10px] font-bold text-(--nb-color-muted)">Current: ${Number(raw?.prevBalance || 0).toFixed(2)}</span>
                                    </div>
                                );
                            case 'actions':
                                return (
                                    <RowActionButtons
                                        actions={[
                                            {
                                                key: 'info',
                                                label: 'View Info',
                                                title: 'View Info',
                                                tone: 'view',
                                                showLabel: true,
                                                icon: null,
                                                onClick: () => {
                                                    setSelectedStudentRow({ student: raw, totalBalance: Number(raw?.balance || 0) });
                                                    setShowInfoModal(true);
                                                },
                                            },
                                            {
                                                key: 'edit',
                                                label: 'Edit',
                                                title: 'Edit',
                                                tone: 'edit',
                                                showLabel: true,
                                                icon: <Pencil size={16} />,
                                                onClick: () => handleEditRow(raw),
                                            },
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

            {showInfoModal && (
                <StudentFinancePaymentModal
                    row={selectedStudentRow}
                    onClose={() => setShowInfoModal(false)}
                    onPaid={handleSearch}
                />
            )}
        </div>
    );
}
