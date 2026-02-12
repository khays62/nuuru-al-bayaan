import React, { useState, useEffect, useMemo } from 'react';
import { Receipt, Edit, Settings, GraduationCap, Search, Printer, PlusCircle, Trash2, FileText, Wallet } from 'lucide-react';
import financeService from '../api/finance';
import toast from 'react-hot-toast';
import { useFinanceStudentsSummaryQuery, usePreviousBalanceSummaryQuery } from '../hooks/studentFinanceHooks';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
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
import { listGradeSections } from '../../grades/api/gradeSections';

// --- SUB-COMPONENTS ---

const ReceiptTab = () => {
    const [search, setSearch] = useState('');
    const [classId, setClassId] = useState('');
    const [filterType, setFilterType] = useState('');
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
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

    const summaryQuery = useFinanceStudentsSummaryQuery(submittedParams, { enabled: true });
    const prevQuery = usePreviousBalanceSummaryQuery({ ...submittedParams, month: currentMonth }, { enabled: true });

    useEffect(() => {
        // initial load
        setSubmittedParams({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setLoading(Boolean(summaryQuery.isFetching || prevQuery.isFetching));
    }, [summaryQuery.isFetching, prevQuery.isFetching]);

    useEffect(() => {
        if (!summaryQuery.isError && !prevQuery.isError) return;
        toast.error('Search failed');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [summaryQuery.isError, prevQuery.isError]);

    useEffect(() => {
        const baseRows = Array.isArray(summaryQuery.data) ? summaryQuery.data : [];
        const prevRows = Array.isArray(prevQuery.data?.rows) ? prevQuery.data.rows : [];
        const prevByStudent = new Map(prevRows.map(r => [String(r.studentObjectId), r]));

        const merged = baseRows.map(r => {
            const p = prevByStudent.get(String(r._id));
            const prevOutstanding = Number(p?.balance || 0);
            const baseBalance = Number(r?.balance || 0);
            return {
                ...r,
                previousBalance: prevOutstanding,
                balanceWithPrevious: baseBalance + prevOutstanding,
            };
        });
        setStudents(merged);
    }, [summaryQuery.data, prevQuery.data]);

    // Removal of broken fetchStats - stats should be handled at parent level if needed

    // --- EXPORT FUNCTIONS ---

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
        toast.success("Exporting to Excel...");
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
            else if (totalBilled === 0) balanceColor = 'text-slate-400';

            const status = balance > 0
                ? 'Unpaid'
                : (chargeCountThisMonth === 0 ? 'Not Charged' : 'Paid');

            return {
                _id: s._id,
                studentId: s.studentId || '—',
                fullName: s.fullName || '—',
                contact: s.phone || s.parentPhone || '—',
                className: s.className || '—',
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
        <div className="p-6">
            {/* Top Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-6 bg-slate-50 p-4 rounded-xl border border-gray-300 shadow-sm">
                <button onClick={() => setShowChargeModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm hover:shadow-md active:scale-95">
                    <PlusCircle size={18} /> Charge
                </button>
                <button onClick={() => setShowUpdateModal(true)} className="bg-amber-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-amber-600 transition-all shadow-sm hover:shadow-md active:scale-95">
                    <Edit size={18} /> Update Charge
                </button>
                <button onClick={() => setShowDeleteModal(true)} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-600 transition-all shadow-sm hover:shadow-md active:scale-95">
                    <Trash2 size={18} /> Delete Charge
                </button>

                {/* Print Group */}
                <div className="flex gap-2 ml-auto mr-auto lg:mx-2 border-l border-gray-300 pl-2">
                    <button onClick={() => setShowMonthlyPrint(true)} className="bg-slate-800 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black transition-all text-xs">
                        <Printer size={16} /> Monthly
                    </button>
                    <button onClick={() => setShowDailyPrint(true)} className="bg-slate-800 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black transition-all text-xs">
                        <Printer size={16} /> Daily
                    </button>
                    <button onClick={() => setShowPassCardPrint(true)} className="bg-slate-800 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black transition-all text-xs">
                        <GraduationCap size={16} /> Passcard
                    </button>
                </div>

                {/* Export Group */}
                <div className="flex gap-2 ml-auto">
                    <button onClick={exportToCSV} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 transition-all shadow-sm hover:shadow-md active:scale-95">
                        <FileText size={18} /> Excel Export
                    </button>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                        <input
                            type="text"
                            className="w-full h-11 pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-4 focus:ring-blue-600/10 transition-all font-medium"
                            placeholder="Search ID, Name or Phone..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </form>
                <select
                    className="h-11 px-4 border rounded-xl outline-none focus:ring-4 focus:ring-blue-600/10 bg-white min-w-50 font-bold text-sm"
                    value={classId}
                    onChange={e => {
                        const val = e.target.value;
                        setClassId(val);
                        handleSearch({ classId: val });
                    }}
                >
                    <option value="">By Class Level</option>
                    {classes.map(cls => {
                        const gradeLabel = cls.grade?.gradeName || cls.grade?.name || cls.gradeName || '';
                        const sectionLabel = cls.section || cls.name || '';
                        const label = `${gradeLabel}${sectionLabel ? ` - ${sectionLabel}` : ''}`.trim();
                        return (
                            <option key={cls._id} value={cls._id}>{label || '—'}</option>
                        );
                    })}
                </select>

                <select
                    className="h-11 px-4 border rounded-xl outline-none focus:ring-4 focus:ring-blue-600/10 bg-white min-w-55 font-bold text-sm"
                    value={filterType}
                    onChange={e => {
                        const val = e.target.value;
                        setFilterType(val);
                        handleSearch({ type: val || null });
                    }}
                >
                    <option value="">Filter (This Month)</option>
                    <option value="charged">Charged This Month</option>
                    <option value="paid">Paid This Month</option>
                    <option value="unpaid">Unpaid This Month</option>
                    <option value="uncharged">Not Charged This Month</option>
                    <option value="hormaris">Hormaris</option>
                </select>
                <div className="flex gap-2">
                    <button onClick={handleSearch} className="h-11 bg-blue-600 text-white px-8 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95">Go</button>
                </div>
            </div>

            {/* Student Table */}
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <StandardTable
                    isLoading={loading}
                    error={null}
                    items={sortedItems}
                    loadingMessage="Syncing Ledger..."
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
                        { key: 'balance', label: 'Balance', sortable: true, field: 'balance', align: 'right' },
                        { key: 'actions', label: 'Info', sortable: false, align: 'right', noPrint: true, tdClassName: 'no-print' },
                    ]}
                    storageKey="finance:students:columns:v1"
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
                            case 'studentId':
                                return <span className="font-mono text-xs font-bold text-slate-500">{row?.studentId || '—'}</span>;
                            case 'fullName':
                                return <span className="font-bold text-slate-900">{row?.fullName || '—'}</span>;
                            case 'contact':
                                return <span className="text-slate-600 text-sm font-medium">{row?.contact || '—'}</span>;
                            case 'className':
                                return (
                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-tight border border-slate-200">
                                        {row?.className || '—'}
                                    </span>
                                );
                            case 'balance':
                                return (
                                    <div className="flex flex-col items-end leading-tight">
                                        <span className={`font-black text-sm ${row?.balanceColor || 'text-slate-900'}`}>
                                            ${Number(row?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                        {row?.hasHormaris ? (
                                            <span className="text-[9px] font-black uppercase tracking-widest text-red-600">Hormaris</span>
                                        ) : null}
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
                                                    setSelectedStudentRow({ student: row?.raw, totalBalance: row?.balance || 0 });
                                                    setShowInfoModal(true);
                                                },
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
                />
            </div>

            {/* Modal Components */}
            {
                showChargeModal && (
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
                    />
                )
            }

            {showMonthlyPrint && <PrintMonthlyInvoiceModal onClose={() => setShowMonthlyPrint(false)} />}
            {showDailyPrint && <PrintDailyInvoiceModal onClose={() => setShowDailyPrint(false)} />}
            {showPassCardPrint && <PrintPassCardModal onClose={() => setShowPassCardPrint(false)} />}

            {
                showUpdateModal && (
                    <UpdateChargeModal
                        onClose={() => setShowUpdateModal(false)}
                        onSuccess={handleSearch}
                    />
                )
            }

            {
                showDeleteModal && (
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
    const [activeTab, setActiveTab] = useState('receipt');

    const tabs = [
        { id: 'receipt', label: 'Receipt', icon: Receipt },
        { id: 'previousBalance', label: 'Previous Balance', icon: Wallet },
        { id: 'amountType', label: 'Amount Type', icon: Settings },
        { id: 'feeType', label: 'Fee Type', icon: Settings },
    ];

    return (
        <div className="space-y-6">
            <div className="bg-white border rounded-xl overflow-hidden p-2 flex gap-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="bg-white border rounded-xl min-h-125">
                {activeTab === 'receipt' && <ReceiptTab />}
                {activeTab === 'previousBalance' && <PreviousBalanceTab />}
                {activeTab === 'amountType' && <AmountTypeTab />}
                {activeTab === 'feeType' && <FeeTypeTab />}
            </div>
        </div>
    );
}
