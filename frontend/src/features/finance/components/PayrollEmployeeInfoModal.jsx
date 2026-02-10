import React, { useEffect, useMemo, useState } from 'react';
import { Printer, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import financeService from '../api/finance';
import axios from '../api/axios';

export default function PayrollEmployeeInfoModal({
    onClose,
    onRefresh,
    academicYears,
    defaultAcademicYearId,
    initialStaffId,
}) {
    const [loading, setLoading] = useState(false);

    const [staffList, setStaffList] = useState([]);
    const [accounts, setAccounts] = useState([]);

    const [selected, setSelected] = useState({
        staffId: initialStaffId || '',
        academicYear: defaultAcademicYearId || '',
        accountId: '',
        date: new Date().toISOString().slice(0, 10),
    });

    const [ledger, setLedger] = useState([]);
    const [rowEdits, setRowEdits] = useState({});
    const [saveLoadingId, setSaveLoadingId] = useState('');
    const [editingRowId, setEditingRowId] = useState('');

    const formatEmployeeType = (employeeType, role) => {
        const raw = String(employeeType || role || '').trim();
        if (!raw) return '';
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    };

    useEffect(() => {
        const load = async () => {
            try {
                const [accData, staffRes] = await Promise.all([
                    financeService.getAccounts(),
                    axios.get('/users', { params: { status: 'active', includeTeachers: true } }),
                ]);
                setAccounts(accData || []);
                setStaffList((staffRes.data || []).filter(u => u.status !== 'inactive'));
            } catch {
                setAccounts([]);
                setStaffList([]);
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (accounts.length === 0) return;
        setSelected(prev => (prev.accountId ? prev : { ...prev, accountId: accounts[0]._id }));
    }, [accounts]);

    const loadLedger = async () => {
        if (!selected.staffId) {
            setLedger([]);
            return;
        }
        setLoading(true);
        try {
            const rows = await financeService.getPayrollStaffLedger({
                staffId: selected.staffId,
                academicYear: selected.academicYear || undefined,
            });
            const next = rows || [];
            setLedger(next);
            setRowEdits((prev) => {
                const base = { ...prev };
                next.forEach((p) => {
                    if (base[p._id]) return;
                    base[p._id] = {
                        sendNumber: p.sendNumber || p.staff?.phone || staff?.phone || '',
                        description: p.description || 'Salary',
                        commission: Number(p.commission || 0),
                        decrease: Number(p.decrease || 0),
                        paidAmount: Number(p.paidAmount || 0),
                    };
                });
                return base;
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load employee info');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLedger();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected.staffId, selected.academicYear]);

    const staff = useMemo(() => ledger?.[0]?.staff, [ledger]);

    const computedRows = useMemo(() => {
        let running = 0;
        return (ledger || []).map((p, idx) => {
            const edit = rowEdits[p._id] || {};
            const dr = Number(p.netSalary || 0);
            const paidAmount = Number((edit.paidAmount ?? p.paidAmount ?? (p.status === 'Paid' ? dr : 0)) || 0);
            const cr = paidAmount;
            running += dr - paidAmount;

            return {
                _id: p._id,
                no: idx + 1,
                month: p.month,
                sendNumber: edit.sendNumber ?? p.sendNumber ?? staff?.phone ?? p.staff?.phone ?? '',
                description: edit.description ?? p.description ?? 'Salary',
                commission: Number(edit.commission ?? p.commission ?? 0),
                decrease: Number(edit.decrease ?? p.decrease ?? 0),
                paidAmount,
                dr,
                cr,
                paid: paidAmount,
                balance: running,
                payroll: p,
            };
        });
    }, [ledger, rowEdits, staff]);

    const onRowChange = (id, field, value) => {
        setRowEdits((prev) => ({
            ...prev,
            [id]: { ...prev[id], [field]: value },
        }));
    };

    const isRowDirty = (row) => {
        const edit = rowEdits[row._id] || {};
        const current = {
            sendNumber: row.sendNumber ?? '',
            description: row.description ?? '',
            commission: Number(row.commission ?? 0),
            decrease: Number(row.decrease ?? 0),
            paidAmount: Number(row.paidAmount ?? 0),
        };
        const next = {
            sendNumber: edit.sendNumber ?? current.sendNumber,
            description: edit.description ?? current.description,
            commission: Number(edit.commission ?? current.commission),
            decrease: Number(edit.decrease ?? current.decrease),
            paidAmount: Number(edit.paidAmount ?? current.paidAmount),
        };
        return JSON.stringify(current) !== JSON.stringify(next);
    };

    const doSave = async (row) => {
        setSaveLoadingId(row._id);
        try {
            const edit = rowEdits[row._id] || {};
            await financeService.updatePayrollLedger(row._id, {
                sendNumber: edit.sendNumber ?? row.sendNumber,
                description: edit.description ?? row.description,
                commission: Number(edit.commission ?? row.commission ?? 0),
                decrease: Number(edit.decrease ?? row.decrease ?? 0),
                paidAmount: Number(edit.paidAmount ?? row.paidAmount ?? 0),
            });
            toast.success('Saved');
            setEditingRowId('');
            await loadLedger();
            onRefresh?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Save failed');
        } finally {
            setSaveLoadingId('');
        }
    };

    const doPrint = (row) => {
        const w = window.open('', '_blank', 'width=900,height=700');
        if (!w) return;
        const safe = (v) => String(v ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        w.document.write(`
            <html>
            <head>
                <title>Payroll Receipt</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
                    h1 { font-size: 20px; margin: 0 0 8px; }
                    .sub { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 16px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                    th, td { border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 12px; text-align: left; }
                    th { background: #f8fafc; text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; }
                </style>
            </head>
            <body>
                <h1>Payroll Receipt</h1>
                <div class="sub">${safe(row.month)} · ${safe(staff?.fullName || '')}</div>
                <table>
                    <tr><th>Send Number</th><td>${safe(row.sendNumber)}</td></tr>
                    <tr><th>Description</th><td>${safe(row.description)}</td></tr>
                    <tr><th>Commission</th><td>${safe(row.commission)}</td></tr>
                    <tr><th>Decrease</th><td>${safe(row.decrease)}</td></tr>
                    <tr><th>Salary</th><td>${safe(row.dr)}</td></tr>
                    <tr><th>Paid</th><td>${safe(row.paid)}</td></tr>
                    <tr><th>Balance</th><td>${safe(row.balance)}</td></tr>
                </table>
                <script>window.print();</script>
            </body>
            </html>
        `);
        w.document.close();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-7xl rounded-xl shadow-2xl overflow-hidden border border-slate-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/30">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Employee Info</h3>
                        <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">Paid / Edit / Show</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm">
                        <X size={22} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-4 space-y-5 max-h-[75vh] overflow-y-auto overflow-x-hidden">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</label>
                            <select
                                value={selected.staffId}
                                onChange={(e) => setSelected(prev => ({ ...prev, staffId: e.target.value }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                            >
                                <option value="">Select Employee</option>
                                {staffList.map(s => (
                                    <option key={s._id} value={s._id}>{s.fullName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Year</label>
                            <select
                                value={selected.academicYear}
                                onChange={(e) => setSelected(prev => ({ ...prev, academicYear: e.target.value }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                            >
                                <option value="">Select Academic Year</option>
                                {academicYears.map(y => (
                                    <option key={y._id} value={y._id}>{y.yearName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Account</label>
                            <select
                                value={selected.accountId}
                                onChange={(e) => setSelected(prev => ({ ...prev, accountId: e.target.value }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                            >
                                <option value="">Select Account</option>
                                {accounts.map(acc => (
                                    <option key={acc._id} value={acc._id}>
                                        {acc.name}{acc.accountNumber ? ` (${acc.accountNumber})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 items-end">
                        <div className="col-span-2">
                            <div className="text-sm font-bold text-slate-900">{staff?.fullName || ''}</div>
                            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                                {formatEmployeeType(staff?.employeeType, staff?.role)}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Register Date</label>
                            <input
                                type="date"
                                value={selected.date}
                                onChange={(e) => setSelected(prev => ({ ...prev, date: e.target.value }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                            />
                        </div>
                        <div>
                            <button
                                type="button"
                                onClick={loadLedger}
                                className="w-full px-6 py-3 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-[0.2em]"
                            >
                                Show
                            </button>
                        </div>
                    </div>

                    <div className="border border-slate-100 rounded-xl max-h-[45vh] overflow-auto">
                        <table className="w-full min-w-[980px] text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-slate-100">
                                    {[
                                        'No',
                                        'Month',
                                        'Send Number',
                                        'Description',
                                        'Commission',
                                        'Decrease',
                                        'Dr',
                                        'Cr',
                                        'Paid',
                                        'Balance',
                                        'Actions',
                                    ].map(h => (
                                        <th key={h} className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={11} className="py-10 text-center text-slate-400 font-bold uppercase tracking-widest">Loading...</td></tr>
                                ) : computedRows.length === 0 ? (
                                    <tr><td colSpan={11} className="py-10 text-center text-slate-400 font-bold uppercase tracking-widest">No data</td></tr>
                                ) : (
                                    computedRows.map(r => (
                                        <React.Fragment key={r._id}>
                                            <tr
                                                className="hover:bg-slate-50 cursor-pointer"
                                                onClick={() => {
                                                    if (r.payroll.status !== 'Paid') {
                                                        setEditingRowId(r._id);
                                                    }
                                                }}
                                            >
                                                <td className="py-3 px-4 font-mono text-sm">{r.no}</td>
                                                <td className="py-3 px-4 font-mono text-sm">{r.month}</td>
                                                <td className="py-3 px-4">
                                                    {editingRowId === r._id && r.payroll.status !== 'Paid' ? (
                                                        <input
                                                            value={r.sendNumber}
                                                            onChange={(e) => onRowChange(r._id, 'sendNumber', e.target.value)}
                                                            className="w-40 px-2 py-1 border border-slate-200 rounded-lg text-sm"
                                                        />
                                                    ) : (
                                                        <span className="text-left text-sm text-slate-700">{r.sendNumber || '-'}</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {editingRowId === r._id && r.payroll.status !== 'Paid' ? (
                                                        <input
                                                            value={r.description}
                                                            onChange={(e) => onRowChange(r._id, 'description', e.target.value)}
                                                            className="w-40 px-2 py-1 border border-slate-200 rounded-lg text-sm"
                                                        />
                                                    ) : (
                                                        <span className="text-left text-sm text-slate-700">{r.description || '-'}</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {editingRowId === r._id && r.payroll.status !== 'Paid' ? (
                                                        <input
                                                            type="number"
                                                            value={r.commission}
                                                            onChange={(e) => onRowChange(r._id, 'commission', e.target.value)}
                                                            className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-sm text-green-700"
                                                            min="0"
                                                        />
                                                    ) : (
                                                        <span className="text-left text-sm text-green-700">{r.commission}</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {editingRowId === r._id && r.payroll.status !== 'Paid' ? (
                                                        <input
                                                            type="number"
                                                            value={r.decrease}
                                                            onChange={(e) => onRowChange(r._id, 'decrease', e.target.value)}
                                                            className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-sm text-red-700"
                                                            min="0"
                                                        />
                                                    ) : (
                                                        <span className="text-left text-sm text-red-700">{r.decrease}</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 font-mono text-sm">{r.dr}</td>
                                                <td className="py-3 px-4 font-mono text-sm">{r.cr}</td>
                                                <td className="py-3 px-4">
                                                    {editingRowId === r._id && r.payroll.status !== 'Paid' ? (
                                                        <input
                                                            type="number"
                                                            value={r.paid}
                                                            onChange={(e) => onRowChange(r._id, 'paidAmount', e.target.value)}
                                                            className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-sm"
                                                            min="0"
                                                        />
                                                    ) : (
                                                        <span className="text-left text-sm text-slate-700">{r.paid}</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 font-mono text-sm">{r.balance}</td>
                                                <td className="py-3 px-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={saveLoadingId === r._id || r.payroll.status === 'Paid' || !isRowDirty(r)}
                                                            onClick={() => doSave(r)}
                                                            className="p-2 bg-slate-900 hover:bg-black text-white rounded-lg disabled:opacity-50"
                                                            title="Save"
                                                        >
                                                            <Save size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => doPrint(r)}
                                                            disabled={isRowDirty(r) || editingRowId === r._id}
                                                            className="p-2 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg"
                                                            title="Print"
                                                        >
                                                            <Printer size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-[0.2em]"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
