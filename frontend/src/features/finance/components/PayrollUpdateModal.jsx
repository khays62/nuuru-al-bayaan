import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useUpdatePayrollByParamsMutation } from '../hooks/payrollHooks';
import { listUsers } from '../../users/api/usersApi.js';
import AcademicYearSelect from '../../lookups/components/AcademicYearSelect.jsx';

import Modal from '../../../shared/components/ui/Modal.jsx';
import FormField from '../../../shared/components/ui/FormField.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import { useI18n } from '../../../i18n/useI18n';

export default function PayrollUpdateModal({
    onClose,
    onSuccess,
    defaultMonth,
    defaultAcademicYearId,
    initialEmployeeId,
    initialMonth,
    initialAcademicYearId,
}) {
    const { t } = useI18n();
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [showPaidConfirm, setShowPaidConfirm] = useState(false);
    const [paidConfirmText, setPaidConfirmText] = useState('');
    const [pendingPayload, setPendingPayload] = useState(null);

    const [form, setForm] = useState({
        updateType: 'salaryCharge', // salaryCharge | commission | salaryDecrease
        employee: initialEmployeeId || '',
        month: initialMonth || defaultMonth,
        academicYear: initialAcademicYearId || defaultAcademicYearId || '',
        amount: '',
    });

    const updateMutation = useUpdatePayrollByParamsMutation();

    useEffect(() => {
        const load = async () => {
            try {
                const users = await listUsers({ status: 'active', includeTeachers: true });
                setStaffList((users || []).filter((u) => u.status !== 'inactive'));
            } catch {
                setStaffList([]);
            }
        };
        load();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.employee) return toast.error(t('finance.payroll.validations.employeeRequired', { defaultValue: 'Employee is required' }));
        if (!form.month) return toast.error(t('finance.payroll.validations.monthRequired', { defaultValue: 'Month is required' }));
        if (!form.academicYear) return toast.error(t('finance.payroll.validations.academicYearRequired', { defaultValue: 'Academic Year is required' }));
        if (form.amount === '') return toast.error(t('finance.payroll.validations.amountRequired', { defaultValue: 'Amount is required' }));

        const payload = {
            employee: form.employee,
            month: form.month,
            academicYear: form.academicYear,
            updateType: form.updateType,
            amount: Number(form.amount),
        };

        setLoading(true);
        try {
            await updateMutation.mutateAsync(payload);
            toast.success(t('finance.payroll.update.success', { defaultValue: 'Payroll updated' }));
            onSuccess?.();
            onClose();
        } catch (error) {
            const code = error?.response?.data?.code;
            if (code === 'PAYROLL_PAID_CONFIRM_REQUIRED') {
                setPendingPayload(payload);
                setPaidConfirmText('');
                setShowPaidConfirm(true);
            } else {
                toast.error(error.response?.data?.message || t('finance.payroll.update.errors.failed', { defaultValue: 'Update failed' }));
            }
        } finally {
            setLoading(false);
        }
    };

    const confirmUpdatePaid = async () => {
        const expected = 'UPDATE PAID';
        if (String(paidConfirmText || '').trim().toUpperCase() !== expected) {
            toast.error(t('finance.payroll.updatePaid.confirmTextRequired', { defaultValue: `Type "${expected}" to confirm` }));
            return;
        }
        if (!pendingPayload) return;

        setLoading(true);
        try {
            await updateMutation.mutateAsync({ ...pendingPayload, confirm: 'UPDATE_PAID' });
            toast.success(t('finance.payroll.update.success', { defaultValue: 'Payroll updated' }));
            setShowPaidConfirm(false);
            setPendingPayload(null);
            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || t('finance.payroll.update.errors.failed', { defaultValue: 'Update failed' }));
        } finally {
            setLoading(false);
        }
    };

    const updateTypeOptions = [
        { value: 'salaryCharge', label: t('finance.payroll.update.types.salaryCharge', { defaultValue: 'Salary charge' }) },
        { value: 'commission', label: t('finance.payroll.update.types.commission', { defaultValue: 'Commission' }) },
        { value: 'salaryDecrease', label: t('finance.payroll.update.types.salaryDecrease', { defaultValue: 'Salary decrease' }) },
    ];

    const staffOptions = (staffList || []).map((u) => ({
        value: u._id,
        label: String(u?.fullName || u?.name || u?.username || u?.email || u._id),
    }));

    return (
        <>
            <Modal
                isOpen
                onClose={onClose}
                title={t('finance.payroll.modals.updateTitle', { defaultValue: 'Update Payroll' })}
                panelClassName="max-w-2xl"
            >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label={t('finance.payroll.update.fields.updateType', { defaultValue: 'Update type' })} required>
                        <DropdownSelect
                            value={form.updateType}
                            onChange={(v) => setForm((prev) => ({ ...prev, updateType: v }))}
                            options={updateTypeOptions}
                            clearable={false}
                        />
                    </FormField>

                    <FormField label={t('finance.payroll.fields.employee', { defaultValue: 'Employee' })} required>
                        <SearchableSelect
                            value={form.employee}
                            onChange={(v) => setForm((prev) => ({ ...prev, employee: v }))}
                            options={staffOptions}
                            placeholder={t('finance.payroll.placeholders.employee', { defaultValue: 'Select employeeâ€¦' })}
                            maxVisible={5}
                            searchPlaceholder={t('common.searchPlaceholders.employees', { defaultValue: 'Search employeesâ€¦' })}
                        />
                    </FormField>

                    <FormField label={t('finance.payroll.filters.month', { defaultValue: 'Month' })} required>
                        <Input
                            type="month"
                            value={form.month}
                            onChange={(e) => setForm((prev) => ({ ...prev, month: e.target.value }))}
                        />
                    </FormField>

                    <FormField label={t('common.filters.academicYear', { defaultValue: 'Academic Year' })} required>
                        <AcademicYearSelect
                            value={form.academicYear}
                            onChange={(v) => setForm((prev) => ({ ...prev, academicYear: v }))}
                            maxVisible={5}
                            searchPlaceholder={t('common.searchPlaceholders.academicYears', { defaultValue: 'Search academic yearsâ€¦' })}
                        />
                    </FormField>

                    <FormField label={t('finance.payroll.update.fields.amount', { defaultValue: 'Amount' })} required className="sm:col-span-2">
                        <Input
                            type="number"
                            value={form.amount}
                            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                            placeholder="0"
                        />
                    </FormField>
                </div>

                <div className="flex items-center justify-end gap-2">
                    <Button variant="neutral" onClick={onClose}>
                        {t('common.actions.cancel', { defaultValue: 'Cancel' })}
                    </Button>
                    <Button type="submit" variant="brand" disabled={loading}>
                        {loading ? t('common.working', { defaultValue: 'WORKINGâ€¦' }) : t('common.actions.update', { defaultValue: 'Update' })}
                    </Button>
                </div>
            </form>
            </Modal>

            {showPaidConfirm ? (
                <Modal
                    isOpen
                    onClose={() => setShowPaidConfirm(false)}
                    title={t('finance.payroll.updatePaid.title', { defaultValue: 'Confirm update Paid payroll' })}
                    panelClassName="max-w-xl"
                >
                    <div className="space-y-4">
                        <div className="text-sm text-(--nb-color-fg)">
                            {t('finance.payroll.updatePaid.warning', {
                                defaultValue: 'You are updating a Paid payroll record. This may affect financial history. Continue only if you understand the impact.',
                            })}
                        </div>

                        <FormField
                            label={t('finance.payroll.updatePaid.confirmLabel', { defaultValue: 'Type UPDATE PAID to confirm' })}
                            required
                        >
                            <Input
                                value={paidConfirmText}
                                onChange={(e) => setPaidConfirmText(e.target.value)}
                                placeholder="UPDATE PAID"
                                autoFocus
                            />
                        </FormField>

                        <div className="flex items-center justify-end gap-2">
                            <Button variant="neutral" onClick={() => setShowPaidConfirm(false)}>
                                {t('common.actions.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button
                                variant="danger"
                                disabled={loading || String(paidConfirmText || '').trim().toUpperCase() !== 'UPDATE PAID'}
                                onClick={confirmUpdatePaid}
                            >
                                {loading ? t('common.working', { defaultValue: 'WORKINGâ€¦' }) : t('common.actions.update', { defaultValue: 'Update' })}
                            </Button>
                        </div>
                    </div>
                </Modal>
            ) : null}
        </>
    );
}
