import React, { useMemo, useState, useEffect } from 'react';
import { Search, Pencil } from 'lucide-react';
import financeService from '../api/finance';
import { listGradeSections } from '../../grades/api/gradeSections';
import toast from 'react-hot-toast';
import StudentFinancePaymentModal from './StudentFinancePaymentModal';

export default function PreviousBalanceTab() {
    const [search, setSearch] = useState('');
    const [classId, setClassId] = useState('');
    const [showMode, setShowMode] = useState('all'); // 'all' | 'withPrev'
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [addMode, setAddMode] = useState(false);
    const [selectedStudentRow, setSelectedStudentRow] = useState(null);
    const [showInfoModal, setShowInfoModal] = useState(false);

    const [feeCategories, setFeeCategories] = useState([]);
    const [editingPrevBalance, setEditingPrevBalance] = useState({});

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
                console.error('Failed to load classes', error);
            }
        };
        fetchClasses();
    }, []);

    useEffect(() => {
        const loadFeeCategories = async () => {
            try {
                const res = await financeService.getFinanceCategories('fee', { includePreviousBalance: true });
                setFeeCategories(res?.data || res || []);
            } catch {
                setFeeCategories([]);
            }
        };
        loadFeeCategories();
    }, []);

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

    const handleSearch = async (e, overrides = {}) => {
        if (e && e.preventDefault) e.preventDefault();
        setLoading(true);
        try {
            const effectiveSearch = typeof overrides.search === 'string' ? overrides.search : search;
            const effectiveClassId = typeof overrides.classId === 'string' ? overrides.classId : classId;
            const effectiveShowMode = (overrides.showMode ?? showMode);

            const params = {};
            if (effectiveSearch) params.search = effectiveSearch;
            if (effectiveClassId) params.classId = effectiveClassId;

            const requests = [
                financeService.getStudentSummary(params),
                // current-month Previous Balance (used for SAVE/upsert + current display)
                financeService.getPreviousBalanceSummary({ ...params, month: currentMonth }),
            ];

            // any-month Previous Balance (used only for the filter)
            if (effectiveShowMode === 'withPrev') {
                requests.push(financeService.getPreviousBalanceSummary(params));
            }

            const [summary, prevCurrent, prevAny] = await Promise.all(requests);

            const baseRows = Array.isArray(summary) ? summary : [];
            const currentRows = Array.isArray(prevCurrent?.rows) ? prevCurrent.rows : [];
            const anyRows = Array.isArray(prevAny?.rows) ? prevAny.rows : [];

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

            if (effectiveShowMode === 'withPrev') {
                if (anyRows.length === 0) merged = [];
                else merged = merged.filter(r => !!r.anyPrevInvoiceId);
            }

            setStudents(merged);
        } catch {
            toast.error('Failed to fetch student balance data');
        } finally {
            setLoading(false);
        }
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

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                        <input
                            type="text"
                            className="w-full h-11 pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-600/10 transition-all font-medium"
                            placeholder="Search Student ID, Name or Phone..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </form>

                <select
                    className="h-11 px-4 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-600/10 bg-white min-w-[200px] font-bold text-sm"
                    value={classId}
                    onChange={(e) => {
                        const next = e.target.value;
                        setClassId(next);
                        setAddMode(false);
                        handleSearch(null, { classId: next });
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
                    className="h-11 px-4 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-600/10 bg-white min-w-[200px] font-bold text-sm"
                    value={showMode}
                    onChange={(e) => {
                        const next = e.target.value;
                        setShowMode(next);
                        setAddMode(false);
                        handleSearch(null, { showMode: next });
                    }}
                >
                    <option value="all">Show All</option>
                    <option value="withPrev">Show Previous Balance</option>
                </select>

                <div className="flex gap-2">
                    <button onClick={handleSavePreviousBalances} className="h-11 bg-slate-900 text-white px-8 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-slate-900/10 transition-all active:scale-95">Save</button>
                    <button
                        onClick={() => {
                            setAddMode(true);
                            handleSearch();
                        }}
                        className="h-11 bg-blue-600 text-white px-8 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                    >
                        Add
                    </button>
                </div>
            </div>

            <div className="bg-white border text-center rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            <th className="p-4 pl-6">ID</th>
                            <th className="p-4">Student Name</th>
                            <th className="p-4">Contact</th>
                            <th className="p-4">Class</th>
                            <th className="p-4 text-right">Balance</th>
                            <th className="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-bold italic tracking-widest uppercase">Opening Archives...</td></tr>
                        ) : students.length === 0 ? (
                            <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-medium">No records found for this selection.</td></tr>
                        ) : (
                            students.map(row => (
                                <tr key={row._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 pl-6 font-mono text-xs font-bold text-slate-500">{row.studentId}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900">{row.fullName}</span>
                                            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">B/F ACCOUNT</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-600 text-sm font-medium">{row.phone || '—'}</td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-tight border border-slate-200">
                                            {row.className || '—'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex flex-col items-end gap-2">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0.00"
                                                value={getInputValue(row)}
                                                onChange={(e) => handlePrevBalanceChange(row._id, e.target.value)}
                                                disabled={!addMode}
                                                readOnly={!addMode}
                                                className={`h-9 w-32 px-3 border border-slate-200 rounded-lg font-black text-xs text-slate-900 outline-none text-right ${addMode ? 'bg-slate-50' : 'bg-slate-100 cursor-not-allowed opacity-75'}`}
                                            />
                                            <span className="text-[10px] font-bold text-slate-400">Current: ${Number(row.prevBalance || 0).toFixed(2)}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => { setSelectedStudentRow({ student: row, totalBalance: Number(row.balance || 0) }); setShowInfoModal(true); }}
                                                className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all hover:shadow-lg active:scale-95"
                                            >
                                                View Info
                                            </button>
                                            <button
                                                onClick={() => handleEditRow(row)}
                                                className="bg-amber-500 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all hover:shadow-lg active:scale-95 flex items-center gap-2"
                                                title="Edit"
                                            >
                                                <Pencil size={14} /> Edit
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

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
