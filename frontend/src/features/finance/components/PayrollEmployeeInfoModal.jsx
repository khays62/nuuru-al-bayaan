import React, { useEffect, useMemo, useState } from 'react';
import { Printer, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { listAccounts } from '../api/accountsApi';
import { usePayrollStaffLedgerQuery, useUpdatePayrollLedgerMutation } from '../hooks/payrollHooks';
import { listUsers } from '../../users/api/usersApi.js';
import AcademicYearSelect from '../../lookups/components/AcademicYearSelect.jsx';

import Modal from '../../../shared/components/ui/Modal.jsx';
import FormField from '../../../shared/components/ui/FormField.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import { useI18n } from '../../../i18n/I18nProvider.jsx';
import { printHtmlDocument } from '../../../utils/exportTable';

export default function PayrollEmployeeInfoModal({
    onClose,
    onRefresh,
    academicYears,
    defaultAcademicYearId,
    initialStaffId,
}) {
    const { t } = useI18n();

    const [staffList, setStaffList] = useState([]);
    const [accounts, setAccounts] = useState([]);

    const [selected, setSelected] = useState({
        staffId: initialStaffId || '',
        academicYear: defaultAcademicYearId || '',
        accountId: '',
        date: new Date().toISOString().slice(0, 10),
    });

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
                    listAccounts({ includeInactive: false }),
                    listUsers({ status: 'active', includeTeachers: true }),
                ]);
                setAccounts(accData || []);
                setStaffList((staffRes || []).filter((u) => u.status !== 'inactive'));
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

    const ledgerQuery = usePayrollStaffLedgerQuery(
        { staffId: selected.staffId, academicYear: selected.academicYear || undefined },
        { enabled: Boolean(selected.staffId) && Boolean(selected.academicYear) }
    );

    const ledger = useMemo(() => {
        const data = ledgerQuery.data;
        return Array.isArray(data) ? data : [];
    }, [ledgerQuery.data]);

    const updateLedgerMutation = useUpdatePayrollLedgerMutation();

    const getFinanceErrorText = (error, fallbackKey, fallbackDefaultValue) => {
        const code = error?.response?.data?.code;
        const serverMessage = error?.response?.data?.message;

        if (code) {
            // Prefer shared finance apiErrors (accounts/expenses) first.
            const accountsKey = `finance.accounts.apiErrors.${code}`;
            const expensesKey = `finance.expenses.apiErrors.${code}`;
            const payrollKey = `finance.payroll.apiErrors.${code}`;

            const translatedAccounts = t(accountsKey, { defaultValue: '' });
            if (translatedAccounts && translatedAccounts !== accountsKey) return translatedAccounts;

            const translatedExpenses = t(expensesKey, { defaultValue: '' });
            if (translatedExpenses && translatedExpenses !== expensesKey) return translatedExpenses;

            const translatedPayroll = t(payrollKey, { defaultValue: '' });
            if (translatedPayroll && translatedPayroll !== payrollKey) return translatedPayroll;

            return serverMessage || fallbackDefaultValue;
        }

        if (serverMessage) return serverMessage;
        return t(fallbackKey, { defaultValue: fallbackDefaultValue });
    };

    const refetchLedger = async () => {
        if (!selected.staffId) return;
        try {
            await ledgerQuery.refetch();
        } catch (error) {
            toast.error(getFinanceErrorText(error, 'finance.payroll.employeeInfo.errors.loadFailed', 'Failed to load employee info'));
        }
    };

    useEffect(() => {
        const next = Array.isArray(ledger) ? ledger : [];
        setRowEdits((prev) => {
            const base = { ...(prev || {}) };
            next.forEach((p) => {
                if (!p?._id) return;
                if (base[p._id]) return;
                const dr = Number(p.netSalary || 0);
                base[p._id] = {
                    // Use the same defaults the UI shows so we don't mark rows "dirty" by default.
                    sendNumber: p.sendNumber ?? p.staff?.phone ?? '',
                    description: p.description ?? 'Salary',
                    commission: Number(p.commission || 0),
                    decrease: Number(p.decrease || 0),
                    paidAmount: Number(p.paidAmount ?? (p.status === 'Paid' ? dr : 0) ?? 0),
                };
            });
            return base;
        });
    }, [ledger]);

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
        if (!row?._id) return false;
        const edit = rowEdits[row._id] || {};

        // Compare against persisted values (payroll doc), not computed row values.
        const p = row.payroll || {};
        const dr = Number(row?.dr || p.netSalary || 0);
        const base = {
            // Normalize with same defaults used in UI
            sendNumber: String(p.sendNumber ?? p.staff?.phone ?? ''),
            description: String(p.description ?? 'Salary'),
            commission: Number(p.commission || 0),
            decrease: Number(p.decrease || 0),
            paidAmount: Number(p.paidAmount ?? (p.status === 'Paid' ? dr : 0) ?? 0),
        };
        const next = {
            sendNumber: String(edit.sendNumber ?? base.sendNumber ?? ''),
            description: String(edit.description ?? base.description ?? ''),
            commission: Number(edit.commission ?? base.commission ?? 0),
            decrease: Number(edit.decrease ?? base.decrease ?? 0),
            paidAmount: Number(edit.paidAmount ?? base.paidAmount ?? 0),
        };

        return (
            base.sendNumber !== next.sendNumber ||
            base.description !== next.description ||
            base.commission !== next.commission ||
            base.decrease !== next.decrease ||
            base.paidAmount !== next.paidAmount
        );
    };

    const getPaidStatus = (row) => {
        const dr = Number(row?.dr || 0);
        const paid = Number(row?.paid || 0);
        if (!Number.isFinite(dr) || !Number.isFinite(paid)) return { kind: 'unknown', delta: 0, remaining: 0 };
        const delta = paid - dr;
        const remaining = dr - paid;
        if (delta > 0) return { kind: 'over', delta, remaining: 0 };
        if (delta === 0) return { kind: 'exact', delta: 0, remaining: 0 };
        return { kind: 'under', delta, remaining };
    };

    const isPaidEdited = (row) => {
        if (!row?._id) return false;
        const p = row.payroll || {};
        const edit = rowEdits[row._id] || {};
        const dr = Number(row?.dr || p.netSalary || 0);
        const basePaid = Number(p.paidAmount ?? (p.status === 'Paid' ? dr : 0) ?? 0);
        const nextPaid = Number(edit.paidAmount ?? basePaid ?? 0);
        return basePaid !== nextPaid;
    };

    const doSave = async (row) => {
        const edit = rowEdits[row._id] || {};
        const sendNumberValue = String(edit.sendNumber ?? row.sendNumber ?? '').trim();
        if (!sendNumberValue) {
            toast.error(t('finance.payroll.employeeInfo.errors.sendNumberRequired', { defaultValue: 'Send number is required' }));
            return;
        }

        setSaveLoadingId(row._id);
        try {
            await updateLedgerMutation.mutateAsync({
                id: row._id,
                payload: {
                    sendNumber: sendNumberValue,
                    description: String((edit.description ?? row.description ?? 'Salary') || 'Salary').trim() || 'Salary',
                    commission: Number(edit.commission ?? row.commission ?? 0),
                    decrease: Number(edit.decrease ?? row.decrease ?? 0),
                    paidAmount: Number(edit.paidAmount ?? row.paidAmount ?? 0),
                    accountId: selected.accountId || undefined,
                    date: selected.date || undefined,
                },
            });
            toast.success(t('finance.payroll.employeeInfo.toasts.saved', { defaultValue: 'Saved' }));
            setEditingRowId('');
            await refetchLedger();
            onRefresh?.();
        } catch (error) {
            toast.error(getFinanceErrorText(error, 'finance.payroll.employeeInfo.errors.saveFailed', 'Save failed'));
        } finally {
            setSaveLoadingId('');
        }
    };

    const doPrint = (row) => {
        const safe = (v) => String(v ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const receiptTitle = t('finance.payroll.employeeInfo.receipt.title', { defaultValue: 'Payroll Receipt' });
        const labelSendNumber = t('finance.payroll.employeeInfo.receipt.sendNumber', { defaultValue: 'Send Number' });
        const labelDescription = t('finance.payroll.employeeInfo.receipt.description', { defaultValue: 'Description' });
        const labelCommission = t('finance.payroll.employeeInfo.receipt.commission', { defaultValue: 'Commission' });
        const labelDecrease = t('finance.payroll.employeeInfo.receipt.decrease', { defaultValue: 'Decrease' });
        const labelSalary = t('finance.payroll.employeeInfo.receipt.salary', { defaultValue: 'Salary' });
        const labelPaid = t('finance.payroll.employeeInfo.receipt.paid', { defaultValue: 'Paid' });
        const labelBalance = t('finance.payroll.employeeInfo.receipt.balance', { defaultValue: 'Balance' });

        const html = `
            <html>
            <head>
                <title>${safe(receiptTitle)}</title>
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
                <h1>${safe(receiptTitle)}</h1>
                <div class="sub">${safe(row.month)} · ${safe(staff?.fullName || '')}</div>
                <table>
                    <tr><th>${safe(labelSendNumber)}</th><td>${safe(row.sendNumber)}</td></tr>
                    <tr><th>${safe(labelDescription)}</th><td>${safe(row.description)}</td></tr>
                    <tr><th>${safe(labelCommission)}</th><td>${safe(row.commission)}</td></tr>
                    <tr><th>${safe(labelDecrease)}</th><td>${safe(row.decrease)}</td></tr>
                    <tr><th>${safe(labelSalary)}</th><td>${safe(row.dr)}</td></tr>
                    <tr><th>${safe(labelPaid)}</th><td>${safe(row.paid)}</td></tr>
                    <tr><th>${safe(labelBalance)}</th><td>${safe(row.balance)}</td></tr>
                </table>
            </body>
            </html>
        `;

        printHtmlDocument(html, { title: safe(receiptTitle) });
    };

    const staffOptions = (staffList || []).map((s) => ({ value: s._id, label: String(s?.fullName || s?.username || s?._id) }));
    const accountOptions = (accounts || []).map((acc) => ({
        value: acc._id,
        label: `${acc.name}${acc.accountNumber ? ` (${acc.accountNumber})` : ''}`,
    }));

    const isTableLoading = Boolean(selected.staffId && ledgerQuery.isLoading && ledgerQuery.data == null);
    const tableError = ledgerQuery.isError
        ? (ledgerQuery.error?.response?.data?.message || ledgerQuery.error?.message || t('finance.payroll.employeeInfo.errors.loadFailed', { defaultValue: 'Failed to load employee info' }))
        : null;

    const canEditRow = (r) => r?.payroll?.status !== 'Paid';
    const requestEdit = (r) => {
        if (!r?._id) return;
        if (!canEditRow(r)) return;

        // Ensure edit state exists so inputs always render a visible value.
        setRowEdits((prev) => {
            const next = { ...(prev || {}) };
            const current = next[r._id] || {};
            const dr = Number(r?.dr || r?.payroll?.netSalary || 0);

            if (current.sendNumber === undefined) current.sendNumber = r.sendNumber ?? r?.payroll?.sendNumber ?? r?.payroll?.staff?.phone ?? '';
            if (current.description === undefined) current.description = r.description ?? r?.payroll?.description ?? 'Salary';
            if (current.commission === undefined) current.commission = Number(r.commission ?? r?.payroll?.commission ?? 0);
            if (current.decrease === undefined) current.decrease = Number(r.decrease ?? r?.payroll?.decrease ?? 0);
            if (current.paidAmount === undefined) current.paidAmount = String(r.paidAmount ?? r?.payroll?.paidAmount ?? (r?.payroll?.status === 'Paid' ? dr : 0) ?? 0);

            next[r._id] = { ...current };
            return next;
        });
        setEditingRowId(r._id);
    };

    const shouldShowRemainingColumn = useMemo(() => {
        // Only show the whole column after the user interacts (editing)
        // OR when a partial payment exists (paid > 0 but still remaining).
        if (editingRowId) return true;
        return (computedRows || []).some((r) => {
            const status = getPaidStatus(r);
            const paid = Number(r?.paid || 0);
            return status.kind === 'under' && Number(status.remaining || 0) > 0 && paid > 0;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingRowId, computedRows]);

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={t('finance.payroll.employeeInfo.title', { defaultValue: 'Employee Info' })}
            panelClassName="max-w-7xl"
        >
            <div className="space-y-5 max-h-[75vh] overflow-y-auto overflow-x-hidden">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField label={t('finance.payroll.fields.employee', { defaultValue: 'Employee' })} required className="md:col-span-2">
                        <SearchableSelect
                            value={selected.staffId}
                            onChange={(v) => setSelected((prev) => ({ ...prev, staffId: v }))}
                            options={staffOptions}
                            placeholder={t('finance.payroll.placeholders.employee', { defaultValue: 'Select employee…' })}
                            maxVisible={5}
                            searchPlaceholder={t('common.searchPlaceholders.employees', { defaultValue: 'Search employees…' })}
                        />
                    </FormField>

                    <FormField label={t('common.filters.academicYear', { defaultValue: 'Academic Year' })} className="md:col-span-1">
                        <AcademicYearSelect
                            value={selected.academicYear}
                            onChange={(v) => setSelected((prev) => ({ ...prev, academicYear: v }))}
                            placeholder={t('common.select', { defaultValue: 'Select…' })}
                            maxVisible={5}
                            searchPlaceholder={t('common.searchPlaceholders.academicYears', { defaultValue: 'Search academic years…' })}
                        />
                    </FormField>

                    <FormField label={t('finance.payroll.employeeInfo.fields.account', { defaultValue: 'Account' })} className="md:col-span-1">
                        <DropdownSelect
                            value={selected.accountId}
                            onChange={(v) => setSelected((prev) => ({ ...prev, accountId: v }))}
                            options={accountOptions}
                            placeholder={t('finance.payroll.placeholders.account', { defaultValue: 'Select account…' })}
                        />
                    </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <div className="text-sm font-semibold text-(--nb-color-fg)">{staff?.fullName || ''}</div>
                        <div className="text-xs text-(--nb-color-muted)">{formatEmployeeType(staff?.employeeType, staff?.role)}</div>
                    </div>

                    <FormField label={t('finance.payroll.employeeInfo.fields.date', { defaultValue: 'Register date' })} className="md:col-span-1">
                        <Input
                            type="date"
                            value={selected.date}
                            onChange={(e) => setSelected((prev) => ({ ...prev, date: e.target.value }))}
                        />
                    </FormField>

                    <div className="md:col-span-1">
                        <Button variant="neutral" className="w-full" onClick={refetchLedger} disabled={!selected.staffId || ledgerQuery.isFetching}>
                            {t('finance.payroll.employeeInfo.actions.show', { defaultValue: 'Show' })}
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto border border-(--nb-color-border) rounded-xl">
                    <StandardTable
                        isLoading={isTableLoading}
                        error={tableError}
                        items={computedRows}
                        rows={computedRows}
                        loadingMessage={t('finance.payroll.employeeInfo.loading', { defaultValue: 'Loading…' })}
                        loadingVariant="table"
                        loadingRows={6}
                        loadingColumns={12}
                        emptyTitle={t('finance.payroll.employeeInfo.empty', { defaultValue: 'No data' })}
                        emptyDescription=""
                        storageKey="finance:payroll:employeeInfo:columns:v1"
                        getRowKey={(row) => row?._id}
                        columns={[
                            { key: 'no', label: t('finance.payroll.employeeInfo.columns.no', { defaultValue: 'No' }) },
                            { key: 'month', label: t('finance.payroll.employeeInfo.columns.month', { defaultValue: 'Month' }) },
                            { key: 'sendNumber', label: t('finance.payroll.employeeInfo.columns.sendNumber', { defaultValue: 'Send number' }), tdClassName: 'min-w-[180px]' },
                            { key: 'description', label: t('finance.payroll.employeeInfo.columns.description', { defaultValue: 'Description' }) },
                            { key: 'commission', label: t('finance.payroll.employeeInfo.columns.commission', { defaultValue: 'Commission' }) },
                            { key: 'decrease', label: t('finance.payroll.employeeInfo.columns.decrease', { defaultValue: 'Decrease' }) },
                            { key: 'dr', label: t('finance.payroll.employeeInfo.columns.dr', { defaultValue: 'Dr' }) },
                            { key: 'cr', label: t('finance.payroll.employeeInfo.columns.cr', { defaultValue: 'Cr' }) },
                            { key: 'paid', label: t('finance.payroll.employeeInfo.columns.paid', { defaultValue: 'Paid' }), tdClassName: 'min-w-[130px] text-center' },
                            { key: 'balance', label: t('finance.payroll.employeeInfo.columns.balance', { defaultValue: 'Balance' }) },
                            { key: 'actions', label: t('common.columns.actions', { defaultValue: 'Actions' }), align: 'right', noPrint: true, tdClassName: 'no-print' },
                            ...(shouldShowRemainingColumn
                                ? [{ key: 'remaining', label: t('finance.payroll.employeeInfo.columns.remaining', { defaultValue: 'Remaining' }), tdClassName: 'w-20 text-center' }]
                                : []),
                        ]}
                        tableProps={{ shellClassName: 'ring-0 shadow-none rounded-none' }}
                        renderCell={(r, col) => {
                            switch (col.key) {
                                case 'no':
                                    return <span className="font-mono">{r.no}</span>;
                                case 'month':
                                    return <span className="font-mono">{r.month}</span>;
                                case 'sendNumber':
                                    return editingRowId === r._id && canEditRow(r) ? (
                                        <Input
                                            value={r.sendNumber}
                                            onChange={(e) => onRowChange(r._id, 'sendNumber', e.target.value)}
                                            className="w-full min-w-45 h-9 px-3 bg-(--nb-color-bg) border border-(--nb-color-border) rounded text-xs font-bold text-(--nb-color-fg) outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                                        />
                                    ) : (
                                        <div
                                            className={canEditRow(r) ? 'cursor-pointer' : ''}
                                            onClick={() => requestEdit(r)}
                                        >
                                            <span className="text-sm text-(--nb-color-fg)">{r.sendNumber || '-'}</span>
                                        </div>
                                    );
                                case 'description':
                                    return editingRowId === r._id && canEditRow(r) ? (
                                        <Input
                                            value={r.description}
                                            onChange={(e) => onRowChange(r._id, 'description', e.target.value)}
                                            className="w-40"
                                        />
                                    ) : (
                                        <div
                                            className={canEditRow(r) ? 'cursor-pointer' : ''}
                                            onClick={() => requestEdit(r)}
                                        >
                                            <span className="text-sm text-(--nb-color-fg)">{r.description || '-'}</span>
                                        </div>
                                    );
                                case 'commission':
                                    return editingRowId === r._id && canEditRow(r) ? (
                                        <Input
                                            type="number"
                                            value={r.commission}
                                            onChange={(e) => onRowChange(r._id, 'commission', e.target.value)}
                                            className="w-24 text-green-700"
                                            min="0"
                                        />
                                    ) : (
                                        <div
                                            className={canEditRow(r) ? 'cursor-pointer' : ''}
                                            onClick={() => requestEdit(r)}
                                        >
                                            <span className="text-sm text-green-700">{r.commission}</span>
                                        </div>
                                    );
                                case 'decrease':
                                    return editingRowId === r._id && canEditRow(r) ? (
                                        <Input
                                            type="number"
                                            value={r.decrease}
                                            onChange={(e) => onRowChange(r._id, 'decrease', e.target.value)}
                                            className="w-24 text-red-700"
                                            min="0"
                                        />
                                    ) : (
                                        <div
                                            className={canEditRow(r) ? 'cursor-pointer' : ''}
                                            onClick={() => requestEdit(r)}
                                        >
                                            <span className="text-sm text-red-700">{r.decrease}</span>
                                        </div>
                                    );
                                case 'dr':
                                    return <span className="font-mono">{r.dr}</span>;
                                case 'cr':
                                    return <span className="font-mono">{r.cr}</span>;
                                case 'paid':
                                    {
                                        const status = getPaidStatus(r);
                                        const basePaidInputClass = 'h-9 w-full max-w-35 px-3 bg-(--nb-color-bg) border border-(--nb-color-border) rounded text-xs font-black text-(--nb-color-fg) outline-none focus:ring-2 focus:ring-blue-500/10 transition-all text-center';
                                        const paidInputClass = status.kind === 'over'
                                            ? `${basePaidInputClass} !border-red-300 !text-red-700`
                                            : status.kind === 'exact'
                                                ? `${basePaidInputClass} !border-green-300 !text-green-700`
                                                : status.kind === 'under'
                                                    ? `${basePaidInputClass} !border-yellow-300 !text-yellow-700`
                                                    : basePaidInputClass;

                                        return (
                                            <div
                                                className="flex justify-center"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    requestEdit(r);
                                                }}
                                            >
                                                {editingRowId === r._id && canEditRow(r) ? (
                                                    <Input
                                                        type="number"
                                                        value={rowEdits?.[r._id]?.paidAmount ?? ''}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => onRowChange(r._id, 'paidAmount', e.target.value)}
                                                        className={paidInputClass}
                                                        min="0"
                                                        inputMode="decimal"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span className="text-sm text-(--nb-color-fg) text-center">{r.paid}</span>
                                                )}
                                            </div>
                                        );
                                    }
                                case 'balance':
                                    return <span className="font-mono">{r.balance}</span>;
                                case 'actions':
                                    {
                                        const status = getPaidStatus(r);
                                        const saveColorClass = status.kind === 'over'
                                            ? '!bg-red-600 hover:!bg-red-700'
                                            : status.kind === 'exact'
                                                ? '!bg-green-600 hover:!bg-green-700'
                                                : status.kind === 'under'
                                                    ? '!bg-yellow-500 hover:!bg-yellow-600 !text-(--nb-color-fg)'
                                                    : '';

                                        return (
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="brand"
                                                    className={saveColorClass}
                                                    disabled={saveLoadingId === r._id || r.payroll.status === 'Paid' || !isRowDirty(r)}
                                                    onClick={() => doSave(r)}
                                                    title={t('common.actions.save', { defaultValue: 'Save' })}
                                                    icon={<Save size={16} />}
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="neutral"
                                                    disabled={isRowDirty(r) || editingRowId === r._id}
                                                    onClick={() => doPrint(r)}
                                                    title={t('common.actions.print', { defaultValue: 'Print' })}
                                                    icon={<Printer size={16} />}
                                                />
                                            </div>
                                        );
                                    }
                                case 'remaining':
                                    {
                                        const status = getPaidStatus(r);
                                        const paid = Number(r?.paid || 0);
                                        const show = (editingRowId === r._id || isRowDirty(r) || isPaidEdited(r) || paid > 0) && status.kind === 'under' && Number(status.remaining || 0) > 0;
                                        if (!show) return '';
                                        return (
                                            <span className="text-sm font-bold text-red-700 text-center block">
                                                {Number(status.remaining || 0).toLocaleString()}
                                            </span>
                                        );
                                    }
                                default:
                                    return '—';
                            }
                        }}
                    />
                </div>

                <div className="flex items-center justify-end">
                    <Button variant="neutral" onClick={onClose}>
                        {t('common.actions.close', { defaultValue: 'Close' })}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
