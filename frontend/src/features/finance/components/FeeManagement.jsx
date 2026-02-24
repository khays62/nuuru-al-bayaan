import React, { useState, useEffect } from 'react';
import Card from '../../../shared/components/ui/Card';
import { Plus, Filter, Search, DollarSign, Layers, X, GraduationCap, RotateCcw } from 'lucide-react';
import StudentChargeModal from './StudentChargeModal';
import GenerateMonthlyFeeModal from './GenerateMonthlyFeeModal';
import RecordPaymentModal from './RecordPaymentModal';
import ClearanceModal from './ClearanceModal';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';

import financeService from '../api/finance';
import toast from 'react-hot-toast';
import GradeSelect from '../../lookups/components/GradeSelect.jsx';
import ShiftSelect from '../../lookups/components/ShiftSelect.jsx';
import GradeSectionSelect from '../../lookups/components/GradeSectionSelect.jsx';
import { useAuth } from '../../../auth/AuthContext';

export default function FeeManagement() {
    const { hasPermission } = useAuth();
    const canAdd =
        hasPermission('financeStudentReceiptModal', 'save') ||
        hasPermission('financeStudentReceiptModal', 'full') ||
        // Backward-compatible legacy
        hasPermission('financeStudentReceipt', 'add') ||
        hasPermission('financeStudentReceipt', 'edit');

    const canView =
        hasPermission('financeStudentReceiptModal', 'view') ||
        hasPermission('financeStudentReceiptModal', 'full') ||
        // Backward-compatible legacy
        hasPermission('financeStudentReceipt', 'view') ||
        hasPermission('financeStudentReceipt', 'add') ||
        hasPermission('financeStudentReceipt', 'edit') ||
        hasPermission('financeStudentReceipt', 'delete') ||
        hasPermission('financeStudentReceipt', 'download');

    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

    // Filter States
    const [gradeId, setGradeId] = useState('');
    const [shiftId, setShiftId] = useState('');
    const [filters, setFilters] = useState({
        classId: '',
        status: '',
        studentId: '' // Search text
    });

    const handleResetClassFilters = () => {
        setGradeId('');
        setShiftId('');
        setFilters(prev => ({ ...prev, classId: '' }));
    };

    // Modal States
    const [showChargeModal, setShowChargeModal] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showClearanceModal, setShowClearanceModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null); // For payment modal

    const fetchInvoices = async (page = 1, limit = 10) => {
        setLoading(true);
        try {
            // Convert filters to query params
            const params = { page, limit };
            if (filters.status) params.status = filters.status;
            if (filters.classId) params.classId = filters.classId;
            if (filters.studentId) params.search = filters.studentId;

            const response = await financeService.getInvoices(params);

            // Check if response is paginated (new format) or array (old format fallback)
            if (response.data && response.meta) {
                setInvoices(response.data);
                setMeta(response.meta);
            } else if (Array.isArray(response)) {
                setInvoices(response);
                setMeta({ page: 1, limit: response.length, total: response.length, totalPages: 1 });
            }
        } catch {
            toast.error("Failed to fetch invoices");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices(1, meta.limit); // Reset to page 1 on filter change
    }, [filters.classId, filters.status]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchInvoices(1, meta.limit);
        }, 500);
        return () => clearTimeout(timer);
    }, [filters.studentId]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Paid': return 'bg-green-100 text-green-700';
            case 'Partial': return 'bg-yellow-100 text-yellow-700';
            case 'Unpaid': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const columns = [
        {
            key: 'student',
            label: 'Student',
            render: (row) => row.student?.fullName || 'Unknown',
            tdClassName: 'px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 border-x border-gray-200'
        },
        { key: 'type', label: 'Type', render: (row) => row.type || '' },
        {
            key: 'amount',
            label: 'Amount',
            render: (row) => `$${row.amount}`,
            tdClassName: 'px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700 border-x border-gray-200'
        },
        {
            key: 'balance',
            label: 'Balance',
            render: (row) => `$${row.balance}`,
            tdClassName: 'px-6 py-4 whitespace-nowrap text-sm font-bold text-primary border-x border-gray-200'
        },
        {
            key: 'dueDate',
            label: 'Due Date',
            render: (row) => new Date(row.dueDate).toLocaleDateString(),
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => (
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(row.status)}`}>
                    {row.status}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
                <div className="flex justify-end gap-2">
                    {canAdd && row.status !== 'Paid' && (
                        <button
                            onClick={() => setSelectedInvoice(row)}
                            className="text-green-600 hover:bg-green-50 p-1 rounded"
                            title="Record Payment"
                        >
                            <DollarSign size={20} />
                        </button>
                    )}
                </div>
            ),
            align: 'right',
            tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200 text-right'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="bg-white border rounded-xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Fee Management</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                if (!canAdd) return toast.error('You do not have permission to generate invoices');
                                setShowGenerateModal(true);
                            }}
                            disabled={!canAdd}
                            title={!canAdd ? 'You do not have permission to generate invoices' : undefined}
                            className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-amber-200 disabled:opacity-60 disabled:hover:bg-amber-100"
                        >
                            <Layers size={18} /> Bulk Generate
                        </button>
                        <button
                            onClick={() => {
                                if (!canView) return toast.error('You do not have permission to view clearance');
                                setShowClearanceModal(true);
                            }}
                            disabled={!canView}
                            title={!canView ? 'You do not have permission to view clearance' : undefined}
                            className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-indigo-200 disabled:opacity-60 disabled:hover:bg-indigo-100"
                        >
                            <GraduationCap size={18} /> Clearance
                        </button>
                        <button
                            onClick={() => {
                                if (!canAdd) return toast.error('You do not have permission to create invoices');
                                setShowChargeModal(true);
                            }}
                            disabled={!canAdd}
                            title={!canAdd ? 'You do not have permission to create invoices' : undefined}
                            className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-primary-dark shadow-sm disabled:opacity-60 disabled:hover:bg-primary"
                        >
                            <Plus size={18} /> New Invoice
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="relative col-span-2 flex items-center gap-2">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by student name or ID..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                            value={filters.studentId}
                            onChange={(e) => setFilters(prev => ({ ...prev, studentId: e.target.value }))}
                        />
                        <button
                            type="button"
                            onClick={handleResetClassFilters}
                            className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold text-sm inline-flex items-center gap-2 hover:bg-slate-50"
                            title="Reset class filters"
                        >
                            <RotateCcw size={16} />
                            Reset
                        </button>
                    </div>
                    <div className="flex flex-col md:flex-row gap-2">
                        <GradeSelect
                            value={gradeId}
                            onChange={(v) => {
                                setGradeId(v || '');
                                setFilters(prev => ({ ...prev, classId: '' }));
                            }}
                            placeholder="Grade"
                            className="p-2 border rounded-lg outline-none"
                        />
                        <ShiftSelect
                            value={shiftId}
                            onChange={(v) => {
                                setShiftId(v || '');
                                handleResetClassFilters();
                            }}
                            placeholder="Shift"
                            className="p-2 border rounded-lg outline-none"
                        />
                        <GradeSectionSelect
                            gradeId={gradeId}
                            shiftId={shiftId}
                            value={filters.classId}
                            onChange={(v) => setFilters(prev => ({ ...prev, classId: v || '' }))}
                            searchable
                            maxVisible={7}
                            placeholder="Section"
                            searchPlaceholder="Search…"
                            className="p-2 border rounded-lg outline-none"
                        />
                    </div>
                    <select
                        className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    >
                        <option value="">All Statuses</option>
                        <option value="Paid">Paid</option>
                        <option value="Unpaid">Unpaid</option>
                        <option value="Partial">Partial</option>
                    </select>
                </div>

                <StandardTable
                    isLoading={loading}
                    items={invoices}
                    rows={invoices}
                    columns={columns}
                    storageKey="finance:fees:invoices"
                    meta={meta}
                    onPage={(p) => fetchInvoices(p, meta.limit)}
                    onLimit={(l) => fetchInvoices(1, l)}
                    showRowsSelector
                    emptyTitle="Records will appear here."
                />
            </div>

            {/* Modals */}
            {showChargeModal && (
                <StudentChargeModal
                    onClose={() => setShowChargeModal(false)}
                    onSuccess={() => fetchInvoices(1, meta.limit)}
                />
            )}

            {showGenerateModal && (
                <GenerateMonthlyFeeModal
                    onClose={() => setShowGenerateModal(false)}
                    onSuccess={() => fetchInvoices(1, meta.limit)}
                />
            )}

            {showClearanceModal && (
                <ClearanceModal
                    onClose={() => setShowClearanceModal(false)}
                />
            )}

            {selectedInvoice && (
                <RecordPaymentModal
                    invoice={selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                    onSuccess={() => fetchInvoices(meta.page, meta.limit)}
                />
            )}
        </div>
    );
}
