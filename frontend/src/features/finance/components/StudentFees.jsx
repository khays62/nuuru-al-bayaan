import React, { useState, useEffect, useMemo } from 'react';
import { Receipt, Edit, Settings, GraduationCap, Search, Printer, PlusCircle, Trash2, FileText, Wallet } from 'lucide-react';
import financeService from '../api/finance';
import toast from 'react-hot-toast';
import Table from '../common/Table';
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



    const handleSearch = async (overrides = {}) => {
        // Handle event if called from form
        if (overrides && overrides.preventDefault) overrides.preventDefault();

        setLoading(true);
        try {
            const params = {};

            // Use override or current state (state might be stale during immediate call)
            const activeSearch = overrides.search !== undefined ? overrides.search : search;
            const activeClassId = overrides.classId !== undefined ? overrides.classId : classId;
            const activeType = overrides.type !== undefined ? overrides.type : (filterType || null);

            if (activeSearch) params.search = activeSearch;
            if (activeClassId) params.classId = activeClassId;
            if (activeType) params.type = activeType;

            const [summary, prev] = await Promise.all([
                financeService.getStudentSummary(params),
                financeService.getPreviousBalanceSummary({ ...params, month: currentMonth }),
            ]);

            const baseRows = Array.isArray(summary) ? summary : [];
            const prevRows = Array.isArray(prev?.rows) ? prev.rows : [];
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
        } catch {
            toast.error("Search failed");
        } finally {
            setLoading(false);
        }
    };

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
                    className="h-11 px-4 border rounded-xl outline-none focus:ring-4 focus:ring-blue-600/10 bg-white min-w-[200px] font-bold text-sm"
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
                    className="h-11 px-4 border rounded-xl outline-none focus:ring-4 focus:ring-blue-600/10 bg-white min-w-[220px] font-bold text-sm"
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
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            <th className="p-4 pl-6">ID</th>
                            <th className="p-4">Student Name</th>
                            <th className="p-4">Contact</th>
                            <th className="p-4">Class</th>
                            <th className="p-4 text-right">Balance</th>
                            <th className="p-4 text-center">Info</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-bold italic tracking-widest uppercase">Syncing Ledger...</td></tr>
                        ) : students.length === 0 ? (
                            <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-medium">No records found for this selection.</td></tr>
                        ) : (
                            students.map(row => {
                                const balance = (row.balanceWithPrevious ?? row.balance) || 0;
                                const totalPaid = row.totalPaid || 0;
                                const totalBilled = row.totalBilled || 0;

                                // Specific ERP Color Rules:
                                // Green -> Fully paid
                                // Orange -> Partially paid
                                // Red -> Unpaid
                                let balanceColor = "text-red-500"; // Default Red
                                if (balance <= 0 && totalBilled > 0) balanceColor = "text-green-600";
                                else if (totalPaid > 0 && balance > 0) balanceColor = "text-orange-500";
                                else if (totalBilled === 0) balanceColor = "text-slate-400"; // No charge yet

                                return (
                                    <tr key={row._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 pl-6 font-mono text-xs font-bold text-slate-500">{row.studentId}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900">{row.fullName}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-600 text-sm font-medium">{row.phone || row.parentPhone || '—'}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-tight border border-slate-200">
                                                {row.className || '—'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex flex-col items-end leading-tight">
                                                <span className={`font-black text-sm ${balanceColor}`}>
                                                    ${Number(balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                                {Number(row.hormarisOutstandingAmount || 0) > 0 ? (
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-red-600">Hormaris</span>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => { setSelectedStudentRow({ student: row, totalBalance: balance }); setShowInfoModal(true); }}
                                                className="bg-slate-800 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all hover:shadow-lg active:scale-95"
                                            >
                                                View Info
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
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

            <div className="bg-white border rounded-xl min-h-[500px]">
                {activeTab === 'receipt' && <ReceiptTab />}
                {activeTab === 'previousBalance' && <PreviousBalanceTab />}
                {activeTab === 'amountType' && <AmountTypeTab />}
                {activeTab === 'feeType' && <FeeTypeTab />}
            </div>
        </div>
    );
}
