import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { listAccounts } from '../api/accountsApi';
import { useChargePayrollMutation, usePayrollFullPaymentMutation } from '../hooks/payrollHooks';
import { listUsers } from '../../users/api/usersApi.js';
import AcademicYearSelect from '../../lookups/components/AcademicYearSelect.jsx';

import Modal from '../../../shared/components/ui/Modal.jsx';
import FormField from '../../../shared/components/ui/FormField.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import { useI18n } from '../../../i18n/I18nProvider.jsx';

export default function PayrollChargeModal({
    onClose,
    onSuccess,
    defaultMonth,
    academicYears,
    defaultAcademicYearId,
}) {
    const { t } = useI18n();
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [accounts, setAccounts] = useState([]);

    const [form, setForm] = useState({
        mode: 'charge', // charge | fullPayment
        scope: 'all', // all | single
        staffId: '',
        month: defaultMonth,
        academicYear: defaultAcademicYearId || '',
        accountId: '',
        date: new Date().toISOString().slice(0, 10),
    });

    const chargePayrollMutation = useChargePayrollMutation();
    const fullPaymentMutation = usePayrollFullPaymentMutation();

    useEffect(() => {
        const load = async () => {
            try {
                const [accRes, staffRes] = await Promise.all([
                    listAccounts({ includeInactive: false }),
                    listUsers({ status: 'active', includeTeachers: true }),
                ]);
                setAccounts(accRes || []);
                setStaffList((staffRes || []).filter((u) => u.status !== 'inactive'));
            } catch {
                // best-effort; per-field validation will handle missing selections
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (accounts.length === 0) return;
        setForm(prev => (prev.accountId ? prev : { ...prev, accountId: accounts[0]._id }));
    }, [accounts]);

    const canSubmit = useMemo(() => {
        if (!form.month) return false;
        if (!form.academicYear) return false;
        if (form.scope === 'single' && !form.staffId) return false;
        if (form.mode === 'fullPayment' && !form.accountId) return false;
        return true;
    }, [form]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;

        const invalidStaff = (scope, staffId) => {
            if (staffList.length === 0) return [];
            if (scope === 'single') {
                const target = staffList.find(s => s._id === staffId);
                return target && Number(target.salary || 0) <= 0 ? [target] : [];
            }
            return staffList.filter(s => Number(s.salary || 0) <= 0);
        };

        const missingSalary = invalidStaff(form.scope, form.staffId);
        if (missingSalary.length > 0) {
            const names = missingSalary.slice(0, 3).map(s => s.fullName || s.username || s._id).join(', ');
            const more = missingSalary.length > 3 ? ` (+${missingSalary.length - 3} more)` : '';
            toast.error(t('finance.payroll.charge.errors.missingSalary', { defaultValue: 'Missing salary amount for: {{names}}{{more}}', names, more }));
            return;
        }

        setLoading(true);
        try {
            if (form.mode === 'charge') {
                await chargePayrollMutation.mutateAsync({
                    chargeType: form.scope,
                    staffId: form.scope === 'single' ? form.staffId : undefined,
                    month: form.month,
                    academicYear: form.academicYear,
                });
                toast.success(t('finance.payroll.charge.success', { defaultValue: 'Payroll charge created' }));
            } else {
                await fullPaymentMutation.mutateAsync({
                    scope: form.scope,
                    staffId: form.scope === 'single' ? form.staffId : undefined,
                    month: form.month,
                    academicYear: form.academicYear,
                    accountId: form.accountId,
                    date: form.date,
                });
                toast.success(t('finance.payroll.fullPayment.success', { defaultValue: 'Full payment completed' }));
            }

            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || t('finance.payroll.charge.errors.failed', { defaultValue: 'Operation failed' }));
        } finally {
            setLoading(false);
        }
    };

    const scopeOptions = [
        { value: 'all', label: t('finance.payroll.charge.scope.all', { defaultValue: 'All employees' }) },
        { value: 'single', label: t('finance.payroll.charge.scope.single', { defaultValue: 'Single employee' }) },
    ];
    const modeOptions = [
        { value: 'charge', label: t('finance.payroll.charge.mode.charge', { defaultValue: 'Charge' }) },
        { value: 'fullPayment', label: t('finance.payroll.charge.mode.fullPayment', { defaultValue: 'Full payment (auto charge + payment)' }) },
    ];
    const staffOptions = (staffList || []).map((s) => ({ value: s._id, label: String(s?.fullName || s?.username || s?._id) }));
    const accountOptions = (accounts || []).map((acc) => ({
        value: acc._id,
        label: `${acc.name}${acc.accountNumber ? ` (${acc.accountNumber})` : ''}`,
    }));

    const isFullPayment = form.mode === 'fullPayment';

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={t('finance.payroll.modals.chargeTitle', { defaultValue: 'Payroll Charge' })}
            panelClassName="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label={t('finance.payroll.filters.month', { defaultValue: 'Month' })} required>
                        <Input type="month" value={form.month} onChange={(e) => setForm((prev) => ({ ...prev, month: e.target.value }))} />
                    </FormField>

                    <FormField label={t('common.filters.academicYear', { defaultValue: 'Academic Year' })} required>
                        <AcademicYearSelect
                            value={form.academicYear}
                            onChange={(v) => setForm((prev) => ({ ...prev, academicYear: v }))}
                            maxVisible={5}
                            searchPlaceholder={t('common.searchPlaceholders.academicYears', { defaultValue: 'Search academic years…' })}
                        />
                    </FormField>

                    <FormField label={t('finance.payroll.charge.fields.scope', { defaultValue: 'Scope' })} required>
                        <DropdownSelect
                            value={form.scope}
                            onChange={(v) => setForm((prev) => ({ ...prev, scope: v, staffId: '' }))}
                            options={scopeOptions}
                            clearable={false}
                        />
                    </FormField>

                    <FormField label={t('finance.payroll.charge.fields.mode', { defaultValue: 'Mode' })} required>
                        <DropdownSelect
                            value={form.mode}
                            onChange={(v) => setForm((prev) => ({ ...prev, mode: v }))}
                            options={modeOptions}
                            clearable={false}
                        />
                    </FormField>

                    {form.scope === 'single' ? (
                        <FormField label={t('finance.payroll.fields.employee', { defaultValue: 'Employee' })} required className="sm:col-span-2">
                            <SearchableSelect
                                value={form.staffId}
                                onChange={(v) => setForm((prev) => ({ ...prev, staffId: v }))}
                                options={staffOptions}
                                placeholder={t('finance.payroll.placeholders.employee', { defaultValue: 'Select employee…' })}
                                maxVisible={5}
                                searchPlaceholder={t('common.searchPlaceholders.employees', { defaultValue: 'Search employees…' })}
                            />
                        </FormField>
                    ) : null}

                    <FormField
                        label={t('finance.payroll.charge.fields.account', { defaultValue: 'Account' })}
                        hint={t('finance.payroll.charge.hints.account', { defaultValue: 'Used for full payment.' })}
                        className="sm:col-span-2"
                    >
                        <DropdownSelect
                            value={form.accountId}
                            onChange={(v) => setForm((prev) => ({ ...prev, accountId: v }))}
                            options={accountOptions}
                            placeholder={t('finance.payroll.placeholders.account', { defaultValue: 'Select account…' })}
                            disabled={!isFullPayment}
                        />
                    </FormField>

                    <FormField label={t('finance.payroll.charge.fields.date', { defaultValue: 'Date' })} className="sm:col-span-2">
                        <Input
                            type="date"
                            value={form.date}
                            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                            disabled={!isFullPayment}
                        />
                    </FormField>
                </div>

                <div className="flex items-center justify-end gap-2">
                    <Button variant="neutral" onClick={onClose}>
                        {t('common.actions.cancel', { defaultValue: 'Cancel' })}
                    </Button>
                    <Button type="submit" variant="brand" disabled={!canSubmit || loading}>
                        {loading ? t('common.saving', { defaultValue: 'Saving…' }) : t('common.actions.save', { defaultValue: 'Save' })}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
