import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useDeletePaidPayrollsMutation, useDeletePayrollChargesMutation } from '../hooks/payrollHooks';
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
    const [showPaidConfirm, setShowPaidConfirm] = useState(false);
    const [paidConfirmText, setPaidConfirmText] = useState('');

    const normalizedInitialDeleteType =
        initialDeleteType === 'single'
            ? 'unpaid_single'
            : initialDeleteType === 'all'
                ? 'unpaid_all'
                : initialDeleteType;

    const [form, setForm] = useState({
        deleteType: normalizedInitialDeleteType || (initialStaffId ? 'unpaid_single' : 'unpaid_all'), // unpaid_all | unpaid_single | paid_all | paid_single
        staffId: initialStaffId || '',
        month: initialMonth || defaultMonth,
        academicYear: initialAcademicYearId || defaultAcademicYearId || '',
    });

    const deleteChargesMutation = useDeletePayrollChargesMutation();
    const deletePaidMutation = useDeletePaidPayrollsMutation();

    const getFinanceErrorText = (error, fallbackKey, fallbackDefaultValue) => {
        const code = error?.response?.data?.code;
        const serverMessage = error?.response?.data?.message;
        if (code) {
            const payrollKey = `finance.payroll.apiErrors.${code}`;
            const translatedPayroll = t(payrollKey, { defaultValue: '' });
            if (translatedPayroll && translatedPayroll !== payrollKey) return translatedPayroll;

            const accountsKey = `finance.accounts.apiErrors.${code}`;
            const translatedAccounts = t(accountsKey, { defaultValue: '' });
            if (translatedAccounts && translatedAccounts !== accountsKey) return translatedAccounts;

            return serverMessage || fallbackDefaultValue;
        }
        return serverMessage || t(fallbackKey, { defaultValue: fallbackDefaultValue });
    };

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
        if ((form.deleteType === 'unpaid_single' || form.deleteType === 'paid_single') && !form.staffId) {
            return toast.error(t('finance.payroll.validations.employeeRequired', { defaultValue: 'Employee is required' }));
        }

        if (form.deleteType === 'paid_all' || form.deleteType === 'paid_single') {
            setPaidConfirmText('');
            setShowPaidConfirm(true);
            return;
        }

        if (!window.confirm(t('finance.payroll.delete.confirm', { defaultValue: 'Are you sure? This will delete charges (not Paid).' }))) {
            return;
        }

        setLoading(true);
        try {
            await deleteChargesMutation.mutateAsync({
                deleteType: form.deleteType === 'unpaid_single' ? 'single' : 'all',
                month: form.month,
                academicYear: form.academicYear,
                staffId: form.deleteType === 'unpaid_single' ? form.staffId : undefined,
            });
            toast.success(t('finance.payroll.delete.success', { defaultValue: 'Deleted' }));
            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(getFinanceErrorText(error, 'finance.payroll.delete.errors.failed', 'Delete failed'));
        } finally {
            setLoading(false);
        }
    };

    const confirmDeletePaid = async () => {
        const expected = 'DELETE PAID';
        if (String(paidConfirmText || '').trim().toUpperCase() !== expected) {
            toast.error(t('finance.payroll.deletePaid.confirmTextRequired', { defaultValue: `Type "${expected}" to confirm` }));
            return;
        }

        setLoading(true);
        try {
            await deletePaidMutation.mutateAsync({
                scope: form.deleteType === 'paid_single' ? 'single' : 'all',
                month: form.month,
                academicYear: form.academicYear,
                staffId: form.deleteType === 'paid_single' ? form.staffId : undefined,
                confirm: 'DELETE_PAID',
            });
            toast.success(t('finance.payroll.deletePaid.success', { defaultValue: 'Paid payroll deleted' }));
            setShowPaidConfirm(false);
            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(getFinanceErrorText(error, 'finance.payroll.deletePaid.errors.failed', 'Delete failed'));
        } finally {
            setLoading(false);
        }
    };

    const deleteTypeOptions = [
        { value: 'unpaid_all', label: t('finance.payroll.delete.types.unpaidAll', { defaultValue: 'Unpaid (All)' }) },
        { value: 'unpaid_single', label: t('finance.payroll.delete.types.unpaidSingle', { defaultValue: 'Unpaid (Single employee)' }) },
        { value: 'paid_all', label: t('finance.payroll.delete.types.paidAll', { defaultValue: 'Paid (All)' }) },
        { value: 'paid_single', label: t('finance.payroll.delete.types.paidSingle', { defaultValue: 'Paid (Single employee)' }) },
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
                title={t('finance.payroll.modals.deleteTitle', { defaultValue: 'Delete Payroll' })}
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

                    {form.deleteType === 'unpaid_single' || form.deleteType === 'paid_single' ? (
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

            {showPaidConfirm ? (
                <Modal
                    isOpen
                    onClose={() => setShowPaidConfirm(false)}
                    title={t('finance.payroll.deletePaid.title', { defaultValue: 'Confirm delete Paid payroll' })}
                    panelClassName="max-w-xl"
                >
                    <div className="space-y-4">
                        <div className="text-sm text-(--nb-color-fg)">
                            {t('finance.payroll.deletePaid.warning', {
                                defaultValue: 'This will permanently delete Paid payroll records for the selected month/year. This action is risky and may affect financial history.',
                            })}
                        </div>

                        <FormField
                            label={t('finance.payroll.deletePaid.confirmLabel', { defaultValue: 'Type DELETE PAID to confirm' })}
                            required
                        >
                            <Input
                                value={paidConfirmText}
                                onChange={(e) => setPaidConfirmText(e.target.value)}
                                placeholder="DELETE PAID"
                                autoFocus
                            />
                        </FormField>

                        <div className="flex items-center justify-end gap-2">
                            <Button variant="neutral" onClick={() => setShowPaidConfirm(false)}>
                                {t('common.actions.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button
                                variant="danger"
                                disabled={loading || String(paidConfirmText || '').trim().toUpperCase() !== 'DELETE PAID'}
                                onClick={confirmDeletePaid}
                            >
                                {loading ? t('common.working', { defaultValue: 'WORKING…' }) : t('common.actions.delete', { defaultValue: 'Delete' })}
                            </Button>
                        </div>
                    </div>
                </Modal>
            ) : null}
        </>
    );
}
