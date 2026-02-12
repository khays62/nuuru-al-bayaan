import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useDeletePayrollChargesMutation } from '../hooks/payrollHooks';
import { listUsers } from '../../users/api/usersApi.js';
import AcademicYearSelect from '../../lookups/components/AcademicYearSelect.jsx';

import Modal from '../../../shared/components/ui/Modal.jsx';
import FormField from '../../../shared/components/ui/FormField.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import { useI18n } from '../../../i18n/I18nProvider.jsx';

export default function PayrollDeleteModal({
    onClose,
    onSuccess,
    defaultMonth,
    academicYears,
    defaultAcademicYearId,
    initialDeleteType,
    initialStaffId,
    initialMonth,
    initialAcademicYearId,
}) {
    const { t } = useI18n();
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState([]);

    const [form, setForm] = useState({
        deleteType: initialDeleteType || 'all', // all | single
        staffId: initialStaffId || '',
        month: initialMonth || defaultMonth,
        academicYear: initialAcademicYearId || defaultAcademicYearId || '',
    });

    const deleteChargesMutation = useDeletePayrollChargesMutation();

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
        if (!form.month) return toast.error(t('finance.payroll.validations.monthRequired', { defaultValue: 'Month is required' }));
        if (!form.academicYear) {
            return toast.error(t('finance.payroll.validations.academicYearRequired', { defaultValue: 'Academic Year is required' }));
        }
        if (form.deleteType === 'single' && !form.staffId) {
            return toast.error(t('finance.payroll.validations.employeeRequired', { defaultValue: 'Employee is required' }));
        }

        if (!window.confirm(t('finance.payroll.delete.confirm', { defaultValue: 'Are you sure? This will delete charges (not Paid).' }))) {
            return;
        }

        setLoading(true);
        try {
            await deleteChargesMutation.mutateAsync({
                deleteType: form.deleteType,
                month: form.month,
                academicYear: form.academicYear,
                staffId: form.deleteType === 'single' ? form.staffId : undefined,
            });
            toast.success(t('finance.payroll.delete.success', { defaultValue: 'Deleted' }));
            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || t('finance.payroll.delete.errors.failed', { defaultValue: 'Delete failed' }));
        } finally {
            setLoading(false);
        }
    };

    const deleteTypeOptions = [
        { value: 'all', label: t('common.all', { defaultValue: 'All' }) },
        { value: 'single', label: t('finance.payroll.delete.single', { defaultValue: 'Single employee' }) },
    ];

    const staffOptions = (staffList || []).map((u) => ({
        value: u._id,
        label: String(u?.fullName || u?.name || u?.username || u?.email || u._id),
    }));

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={t('finance.payroll.modals.deleteTitle', { defaultValue: 'Delete Payroll Charges' })}
            panelClassName="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label={t('finance.payroll.delete.fields.deleteType', { defaultValue: 'Delete type' })} required>
                        <DropdownSelect
                            value={form.deleteType}
                            onChange={(v) => setForm((prev) => ({ ...prev, deleteType: v }))}
                            options={deleteTypeOptions}
                            clearable={false}
                        />
                    </FormField>

                    {form.deleteType === 'single' ? (
                        <FormField label={t('finance.payroll.fields.employee', { defaultValue: 'Employee' })} required>
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
                </div>

                <div className="flex items-center justify-end gap-2">
                    <Button variant="neutral" onClick={onClose}>
                        {t('common.actions.cancel', { defaultValue: 'Cancel' })}
                    </Button>
                    <Button type="submit" variant="danger" disabled={loading}>
                        {loading ? t('common.working', { defaultValue: 'WORKING…' }) : t('common.actions.delete', { defaultValue: 'Delete' })}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
