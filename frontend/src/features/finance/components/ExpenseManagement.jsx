import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Filter, FileText, Tags } from 'lucide-react';
import toast from 'react-hot-toast';
import financeService from '../api/finance';
import NewExpenseModal from './NewExpenseModal';

export default function ExpenseManagement() {
    const [expandedSection, setExpandedSection] = useState('ledger');

    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${d.getFullYear()}-${m}`;
    });

    const [page, setPage] = useState(1);
    const pageSize = 10;

    const [staffNameById, setStaffNameById] = useState({});

    const [expenses, setExpenses] = useState([]);
    const [loadingExpenses, setLoadingExpenses] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);

    const totalExpenses = useMemo(
        () => (expenses || []).reduce((sum, e) => sum + Number(e?.amount || 0), 0),
        [expenses]
    );

    const monthRange = useMemo(() => {
        if (!selectedMonth || !/^[0-9]{4}-[0-9]{2}$/.test(selectedMonth)) return null;
        const [yStr, mStr] = selectedMonth.split('-');
        const year = Number(yStr);
        const monthIdx = Number(mStr) - 1;
        if (!Number.isFinite(year) || !Number.isFinite(monthIdx) || monthIdx < 0 || monthIdx > 11) return null;
        const lastDay = new Date(year, monthIdx + 1, 0).getDate();
        const from = `${selectedMonth}-01`;
        const to = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
        return { from, to };
    }, [selectedMonth]);

    const totalPages = useMemo(() => {
        const total = (expenses || []).length;
        return Math.max(1, Math.ceil(total / pageSize));
    }, [expenses, pageSize]);

    const pagedExpenses = useMemo(() => {
        const start = (page - 1) * pageSize;
        return (expenses || []).slice(start, start + pageSize);
    }, [expenses, page, pageSize]);

    const fetchExpenses = async () => {
        setLoadingExpenses(true);
        try {
            const res = monthRange
                ? await financeService.getExpenseChargesByDate({ from: monthRange.from, to: monthRange.to })
                : await financeService.getExpenses();
            const list = Array.isArray(res) ? res : (res?.rows || res?.data || []);
            setExpenses(Array.isArray(list) ? list : []);
            setPage(1);
        } catch {
            toast.error('Failed to load expenses');
        } finally {
            setLoadingExpenses(false);
        }
    };

    const fetchCategories = async () => {
        setLoadingCategories(true);
        try {
            const res = await financeService.getFinanceCategories('expense');
            const list = Array.isArray(res) ? res : (res?.data || []);
            setCategories(Array.isArray(list) ? list : []);
        } catch {
            toast.error('Failed to load categories');
        } finally {
            setLoadingCategories(false);
        }
    };

    useEffect(() => {
        if (expandedSection === 'ledger') {
            fetchExpenses();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expandedSection, selectedMonth]);

    useEffect(() => {
        if (expandedSection === 'categories') {
            fetchCategories();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expandedSection]);

    useEffect(() => {
        if (expandedSection !== 'ledger') return;
        const ids = new Set();
        for (const e of expenses || []) {
            const text = `${e?.title || ''}\n${e?.description || ''}`;
            const matches = text.matchAll(/staff\s*ID\s*:\s*([a-f0-9]{24})/gi);
            for (const m of matches) {
                if (m?.[1]) ids.add(String(m[1]));
            }
        }
        const missing = Array.from(ids).filter((id) => !staffNameById[id]);
        if (missing.length === 0) return;

        let cancelled = false;
        (async () => {
            try {
                const results = await Promise.all(
                    missing.map(async (id) => {
                        try {
                            const data = await financeService.getUserById(id);
                            const user = data?.data || data;
                            const label = String(user?.name || user?.fullName || user?.username || user?.email || id);
                            return [id, label];
                        } catch {
                            return [id, null];
                        }
                    })
                );
                if (cancelled) return;
                setStaffNameById((prev) => {
                    const next = { ...prev };
                    for (const [id, label] of results) {
                        if (label) next[id] = label;
                    }
                    return next;
                });
            } catch {
                // ignore
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [expandedSection, expenses, staffNameById]);

    const renderDescription = (desc) => {
        const text = String(desc || '');
        if (!text) return '';
        return text.replace(/staff\s*ID\s*:\s*([a-f0-9]{24})/gi, (match, id) => {
            const name = staffNameById?.[String(id)];
            if (!name) return match;
            return `staff: ${name}`;
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await financeService.deleteExpense(id);
            toast.success('Expense Deleted');
            fetchExpenses();
        } catch {
            toast.error('Delete Failed');
        }
    };

    const handleCreateCategory = async () => {
        const trimmed = String(newCategoryName || '').trim();
        if (!trimmed) {
            toast.error('Category name is required');
            return;
        }

        setCreatingCategory(true);
        try {
            await financeService.createFinanceCategory({ name: trimmed, type: 'expense' });
            toast.success('Category created');
            setNewCategoryName('');
            fetchCategories();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to create category');
        } finally {
            setCreatingCategory(false);
        }
    };

    const tabs = [
        { id: 'ledger', label: 'Expense Ledger', icon: FileText },
        { id: 'categories', label: 'Expense Categories', icon: Tags },
    ];

    return (
        <div className="space-y-6">
            <div className="inline-flex flex-wrap gap-2 mb-8 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setExpandedSection(tab.id)}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all
                            ${expandedSection === tab.id
                                ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 scale-[1.02]'
                                : 'text-slate-500 hover:bg-white hover:text-slate-900'}`}
                    >
                        <tab.icon size={14} className={expandedSection === tab.id ? 'text-blue-600' : 'text-slate-400'} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="min-h-150 bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
                {expandedSection === 'ledger' && (
                    <div>
                        <div className="flex flex-wrap items-center justify-between p-8 bg-slate-50/50 border-b border-slate-100">
                            <div className="flex items-center gap-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Periodic Spend</p>
                                    <p className="text-2xl font-black text-slate-900 tracking-tight">${Number(totalExpenses || 0).toLocaleString()}</p>
                                </div>
                                <div className="h-10 w-px bg-slate-200" />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Approved Audit Records</p>
                                    <p className="text-2xl font-black text-blue-600 tracking-tight">{expenses.length}</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="h-12 px-4 bg-white border border-slate-200 rounded-xl font-black text-[11px] text-slate-900 outline-none focus:ring-4 focus:ring-blue-600/10"
                                    aria-label="Select month"
                                />
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center gap-2"
                                >
                                    <Plus size={14} /> Record New Expense
                                </button>
                                <button
                                    type="button"
                                    className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
                                    title="Filter"
                                >
                                    <Filter size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white border-b border-slate-100">
                                        <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Category</th>
                                        <th className="py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Title & Description</th>
                                        <th className="py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                        <th className="py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Auditor</th>
                                        <th className="py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loadingExpenses ? (
                                        <tr>
                                            <td colSpan="5" className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest italic">
                                                Synchronizing with ledger...
                                            </td>
                                        </tr>
                                    ) : expenses.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest">
                                                No expense records found.
                                            </td>
                                        </tr>
                                    ) : (
                                        pagedExpenses.map((e) => (
                                            <tr key={e?._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-6 px-8">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-900">
                                                            {e?.date ? new Date(e.date).toLocaleDateString() : '—'}
                                                        </span>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                            {String(e?.category || '—')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-6 px-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-900">{String(e?.title || '—')}</span>
                                                        {e?.description ? (
                                                            <span className="text-[11px] text-slate-500 mt-1 line-clamp-2">{renderDescription(e.description)}</span>
                                                        ) : null}
                                                    </div>
                                                </td>
                                                <td className="py-6 px-6">
                                                    <span className="font-black text-slate-900">${Number(e?.amount || 0).toLocaleString()}</span>
                                                </td>
                                                <td className="py-6 px-6">
                                                    <span className="text-sm font-black text-slate-900">
                                                        {e?.approvedBy?.name || e?.createdBy?.name || '—'}
                                                    </span>
                                                </td>
                                                <td className="py-6 px-8 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(e._id)}
                                                        className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100 bg-white">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-900 disabled:opacity-50"
                                >
                                    Prev
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-900 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {expandedSection === 'categories' && (
                    <div>
                        <div className="flex flex-wrap items-center justify-between p-8 bg-slate-50/50 border-b border-slate-100 gap-3">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Expense Categories</p>
                                <p className="text-2xl font-black text-slate-900 tracking-tight">{categories.length}</p>
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="New category name"
                                    className="h-11 w-64 px-4 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:ring-4 focus:ring-blue-600/10"
                                />
                                <button
                                    type="button"
                                    onClick={handleCreateCategory}
                                    disabled={creatingCategory}
                                    className="h-11 px-6 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest disabled:opacity-60"
                                >
                                    {creatingCategory ? 'Creating...' : 'Create Category'}
                                </button>
                            </div>
                        </div>

                        <div className="p-8">
                            {loadingCategories ? (
                                <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest italic">
                                    Loading categories...
                                </div>
                            ) : categories.length === 0 ? (
                                <div className="py-20 text-center">
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">No categories yet</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {categories.map((c) => (
                                        <div key={c?._id} className="bg-white border border-slate-200 rounded-2xl p-5">
                                            <p className="text-sm font-black text-slate-900">{String(c?.name || '—')}</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">Type: Expense</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <NewExpenseModal
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        fetchExpenses();
                        toast.success('Expense Recorded Successfully');
                    }}
                />
            )}
        </div>
    );
}
