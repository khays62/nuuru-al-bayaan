import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../api/axios';
import { listAccounts } from '../../api/accountsApi';
import { adjustPayroll, listPayrolls, updatePayrollStatus } from '../../api/payrollApi';
import StandardTable from '../../../../shared/components/table/StandardTable.jsx';

function safeNumber(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
}

export default function PayrollEmployeeInfoModal({ onClose, onChanged, academicYears, defaultAcademicYear }) {
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [accounts, setAccounts] = useState([]);

    const [staffSearch, setStaffSearch] = useState('');

    const [form, setForm] = useState({
        staffId: '',
        academicYear: defaultAcademicYear || '',
        accountId: '',
        registerDate: new Date().toISOString().slice(0, 10),
    });

    const [rows, setRows] = useState([]);

    useEffect(() => {
        axios
            .get('/staff')
            .then((res) => setStaffList(res.data || []))
            .catch(() => toast.error('Failed to load staff list'));

        listAccounts({ includeInactive: false })
            .then((data) => {
                setAccounts(data || []);
                if (!form.accountId && data?.length) {
                    setForm((p) => ({ ...p, accountId: data[0]._id }));
                }
            })
            .catch(() => toast.error('Failed to load accounts'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredStaff = useMemo(() => {
        const q = staffSearch.trim().toLowerCase();
        if (!q) return staffList;
        return staffList.filter((s) => (s.fullName || '').toLowerCase().includes(q));
    }, [staffList, staffSearch]);

    const fetchLedger = async () => {
        if (!form.staffId) return toast.error('Employee is required');
        if (!form.academicYear) return toast.error('Academic Year is required');

        setLoading(true);
        try {
            const payrolls = await listPayrolls({ academicYear: form.academicYear });
            const staffPayrolls = (payrolls || [])
                .filter((p) => p.staff?._id === form.staffId)
                .sort((a, b) => (a.month || '').localeCompare(b.month || ''));

            // Running balance (Dr - Cr)
            let running = 0;
            const ledger = staffPayrolls.map((p, idx) => {
                const dr = safeNumber(p.netSalary);
                const cr = p.status === 'Paid' ? safeNumber(p.netSalary) : 0;
                const paid = cr;
                running = running + dr - cr;

                return {
                    _id: p._id,
                    no: idx + 1,
                    month: p.month,
                    sendNumber: p.staff?.phone || '-',
                    description: `Salary - ${p.month}`,
                    commission: safeNumber(p.commission),
                    decrease: safeNumber(p.decrease),
                    dr,
                    cr,
                    paid,
                    balance: running,
                    status: p.status,
                };
            });

            setRows(ledger);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load employee ledger');
        } finally {
            setLoading(false);
        }
    };

    const markPaid = async (row) => {
        if (!form.accountId) return toast.error('Select Account');
        if (!form.registerDate) return toast.error('Register Date is required');

        setLoading(true);
        try {
            await updatePayrollStatus(row._id, {
                status: 'Paid',
                accountId: form.accountId,
                date: form.registerDate,
            });
            await fetchLedger();
            onChanged?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Payment failed');
        } finally {
            setLoading(false);
        }
    };

    const editRow = async (row) => {
        const amountStr = window.prompt('Enter new Salary Charge amount', String(row.dr));
        if (amountStr === null) return;
        const amount = Number(amountStr);
        if (!Number.isFinite(amount)) return toast.error('Invalid amount');

        setLoading(true);
        try {
            await adjustPayroll(row._id, { basicSalary: amount });
            await fetchLedger();
            onChanged?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Edit failed');
        } finally {
            setLoading(false);
        }
    };

    const showRow = (row) => {
        const info = [
            `Month: ${row.month}`,
            `Description: ${row.description}`,
            `Commission: ${row.commission}`,
            `Decrease: ${row.decrease}`,
            `Dr: ${row.dr}`,
            `Cr: ${row.cr}`,
            `Paid: ${row.paid}`,
            `Balance: ${row.balance}`,
            `Status: ${row.status}`,
        ].join('\n');
        window.alert(info);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden border border-surface-200">
                <div className="p-6 border-b border-surface-100 bg-surface-50/40 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-surface-900 uppercase tracking-tight">Employee Info</h3>
                        <p className="text-xs text-surface-500 font-bold">Select Account • Register Date • Actions: Paid / Edit / Show</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all">
                        <X size={20} className="text-surface-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Academic Year</div>
                            <select
                                value={form.academicYear}
                                onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))}
                                className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                            >
                                <option value="">Select Academic Year</option>
                                {academicYears.map((ay) => (
                                    <option key={ay._id} value={ay._id}>{ay.yearName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Select Account</div>
                            <select
                                value={form.accountId}
                                onChange={(e) => setForm((p) => ({ ...p, accountId: e.target.value }))}
                                className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                            >
                                <option value="">Select Account</option>
                                {accounts.map((acc) => (
                                    <option key={acc._id} value={acc._id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Register Date</div>
                            <input
                                type="date"
                                value={form.registerDate}
                                onChange={(e) => setForm((p) => ({ ...p, registerDate: e.target.value }))}
                                className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={fetchLedger}
                                className="w-full px-6 py-3 bg-surface-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all"
                                disabled={loading}
                            >
                                {loading ? 'Loading...' : 'Show'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Employee</div>
                        <input
                            type="text"
                            value={staffSearch}
                            onChange={(e) => setStaffSearch(e.target.value)}
                            placeholder="Search employee..."
                            className="w-full px-4 py-3 bg-white border border-surface-200 rounded-xl font-bold focus:ring-4 focus:ring-primary/10 transition-all"
                        />
                        <div className="max-h-40 overflow-y-auto border border-surface-100 rounded-2xl divide-y divide-surface-100">
                            {filteredStaff.map((s) => (
                                <button
                                    key={s._id}
                                    onClick={() => setForm((p) => ({ ...p, staffId: s._id }))}
                                    className={`w-full px-4 py-3 text-left hover:bg-surface-50 transition-all ${form.staffId === s._id ? 'bg-primary/5' : ''}`}
                                >
                                    <div className="font-black text-surface-900">{s.fullName}</div>
                                    <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest">{s.employeeType || s.role || 'Employee'}</div>
                                </button>
                            ))}
                            {filteredStaff.length === 0 && (
                                <div className="px-4 py-6 text-center text-surface-400 font-bold">No employees found.</div>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto border border-surface-100 rounded-2xl">
                        <StandardTable
                            isLoading={loading}
                            loadingMessage="Loading..."
                            items={rows}
                            rows={rows}
                            columns={[
                                { key: 'no', label: 'No' },
                                { key: 'month', label: 'Month' },
                                { key: 'sendNumber', label: 'Send Number' },
                                { key: 'description', label: 'Description' },
                                { key: 'commission', label: 'Commission' },
                                { key: 'decrease', label: 'Decrease' },
                                { key: 'dr', label: 'Dr' },
                                { key: 'cr', label: 'Cr' },
                                { key: 'paid', label: 'Paid' },
                                { key: 'balance', label: 'Balance' },
                                { key: 'actions', label: 'Actions', noPrint: true, tdClassName: 'no-print' },
                            ]}
                            storageKey="finance:payroll:employee-ledger"
                            getRowKey={(row) => row?._id}
                            emptyTitle="No records."
                            tableProps={{ shellClassName: 'ring-0 shadow-none rounded-none' }}
                            renderCell={(row, col) => {
                                switch (col.key) {
                                    case 'actions':
                                        return (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => markPaid(row)}
                                                    className="px-3 py-2 bg-surface-900 text-white rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all"
                                                    disabled={loading || row.status === 'Paid'}
                                                >
                                                    Paid
                                                </button>
                                                <button
                                                    onClick={() => editRow(row)}
                                                    className="px-3 py-2 bg-white border border-surface-200 text-surface-700 rounded-lg font-black uppercase text-[10px] tracking-widest hover:border-surface-300 transition-all"
                                                    disabled={loading}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => showRow(row)}
                                                    className="px-3 py-2 bg-white border border-surface-200 text-surface-700 rounded-lg font-black uppercase text-[10px] tracking-widest hover:border-surface-300 transition-all"
                                                    disabled={loading}
                                                >
                                                    Show
                                                </button>
                                            </div>
                                        );
                                    default:
                                        return row?.[col.key] ?? '—';
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-surface-100 bg-surface-50/40 flex items-center justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-3 bg-white border border-surface-200 text-surface-700 rounded-xl font-black uppercase text-[10px] tracking-widest hover:border-surface-300 transition-all"
                        disabled={loading}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
