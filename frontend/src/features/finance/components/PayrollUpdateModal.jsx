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
import { useI18n } from '../../../i18n/I18nProvider.jsx';

export default function PayrollUpdateModal({
    onClose,
    onSuccess,
    defaultMonth,
    academicYears,
    defaultAcademicYearId,
    initialEmployeeId,
    initialMonth,
    initialAcademicYearId,
}) {
    const { t } = useI18n();
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState([]);

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

        setLoading(true);
        try {
            await updateMutation.mutateAsync({
                employee: form.employee,
                month: form.month,
                academicYear: form.academicYear,
                updateType: form.updateType,
                amount: Number(form.amount),
            });
            toast.success(t('finance.payroll.update.success', { defaultValue: 'Payroll updated' }));
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
                            placeholder={t('finance.payroll.placeholders.employee', { defaultValue: 'Select employee…' })}
                            maxVisible={5}
                            searchPlaceholder={t('common.searchPlaceholders.employees', { defaultValue: 'Search employees…' })}
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
                            searchPlaceholder={t('common.searchPlaceholders.academicYears', { defaultValue: 'Search academic years…' })}
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
                        {loading ? t('common.working', { defaultValue: 'WORKING…' }) : t('common.actions.update', { defaultValue: 'Update' })}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
