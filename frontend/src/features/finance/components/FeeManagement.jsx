import React, { useState, useEffect } from 'react';
import Card from '../../../shared/components/ui/Card';
import { Plus, Filter, Search, DollarSign, Layers, X, GraduationCap } from 'lucide-react';
import StudentChargeModal from './StudentChargeModal';
import GenerateMonthlyFeeModal from './GenerateMonthlyFeeModal';
import RecordPaymentModal from './RecordPaymentModal';
import ClearanceModal from './ClearanceModal';
import Table from '../common/Table';

import financeService from '../api/finance';
import { listGradeSections } from '../../grades/api/gradeSections';
import toast from 'react-hot-toast';

export default function FeeManagement() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

    // Filter States
    const [classes, setClasses] = useState([]);
    const [filters, setFilters] = useState({
        classId: '',
        status: '',
        studentId: '' // Search text
    });

    // Modal States
    const [showChargeModal, setShowChargeModal] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showClearanceModal, setShowClearanceModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null); // For payment modal

    // Fetch Classes on Mount
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const normalize = (payload) => Array.isArray(payload)
                    ? payload
                    : (payload?.data?.data || payload?.data || []);
                const data = await listGradeSections({ limit: 100 });
                let list = normalize(data);
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
            header: 'Student',
            render: (row) => row.student?.fullName || 'Unknown',
            className: 'font-bold text-gray-900'
        },
        { header: 'Type', accessor: 'type' },
        {
            header: 'Amount',
            render: (row) => `$${row.amount}`,
            className: 'font-bold'
        },
        {
            header: 'Balance',
            render: (row) => `$${row.balance}`,
            className: 'font-bold text-primary'
        },
        {
            header: 'Due Date',
            render: (row) => new Date(row.dueDate).toLocaleDateString(),
        },
        {
            header: 'Status',
            render: (row) => (
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(row.status)}`}>
                    {row.status}
                </span>
            )
        },
        {
            header: 'Actions',
            className: 'text-right',
            render: (row) => (
                <div className="flex justify-end gap-2">
                    {row.status !== 'Paid' && (
                        <button
                            onClick={() => setSelectedInvoice(row)}
                            className="text-green-600 hover:bg-green-50 p-1 rounded"
                            title="Record Payment"
                        >
                            <DollarSign size={20} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="bg-white border rounded-xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Fee Management</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setShowGenerateModal(true)} className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-amber-200">
                            <Layers size={18} /> Bulk Generate
                        </button>
                        <button onClick={() => setShowClearanceModal(true)} className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-indigo-200">
                            <GraduationCap size={18} /> Clearance
                        </button>
                        <button onClick={() => setShowChargeModal(true)} className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-primary-dark shadow-sm">
                            <Plus size={18} /> New Invoice
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="relative col-span-2">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by student name or ID..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                            value={filters.studentId}
                            onChange={(e) => setFilters(prev => ({ ...prev, studentId: e.target.value }))}
                        />
                    </div>
                    <select
                        className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                        value={filters.classId}
                        onChange={(e) => setFilters(prev => ({ ...prev, classId: e.target.value }))}
                    >
                        <option value="">All Classes</option>
                        {classes.map(cls => {
                            const gradeLabel = cls.grade?.gradeName || cls.grade?.name || cls.gradeName || '';
                            const sectionLabel = cls.section || cls.name || '';
                            const label = `${gradeLabel}${sectionLabel ? ` - ${sectionLabel}` : ''}`.trim();
                            return (
                                <option key={cls._id} value={cls._id}>
                                    {label || '—'}
                                </option>
                            );
                        })}
                    </select>
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

                {/* Reusable Table */}
                <Table
                    columns={columns}
                    data={invoices}
                    loading={loading}
                    pagination={{
                        page: meta.page,
                        totalPages: meta.totalPages,
                        limit: meta.limit,
                        onPageChange: (p) => fetchInvoices(p, meta.limit),
                        onLimitChange: (l) => fetchInvoices(1, l)
                    }}
                    emptyMessage="Records will appear here."
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
