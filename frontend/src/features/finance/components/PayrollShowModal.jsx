import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { usePayrollsQuery } from '../hooks/payrollHooks';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';

import Modal from '../../../shared/components/ui/Modal.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import { useI18n } from '../../../i18n/useI18n';

export default function PayrollShowModal({
    onClose,
    month,
    academicYear,
    academicYears,
    onOpenInfo,
}) {
    const { t } = useI18n();
    const [rows, setRows] = useState([]);

    const academicYearName = useMemo(
        () => academicYears.find((y) => y._id === academicYear)?.yearName || '',
        [academicYears, academicYear]
    );

    const payrollQuery = usePayrollsQuery({ month, academicYear }, { enabled: Boolean(month) && Boolean(academicYear) });

    const isLoading = Boolean(payrollQuery.isLoading && payrollQuery.data == null);

    useEffect(() => {
        if (payrollQuery.isError) {
            toast.error(t('finance.payroll.show.errors.loadFailed', { defaultValue: 'Failed to load unpaid salaries' }));
            setRows([]);
            return;
        }
        const data = Array.isArray(payrollQuery.data) ? payrollQuery.data : [];
        const unpaid = (data || []).filter((p) => p.status !== 'Paid');
        setRows(unpaid);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payrollQuery.data, payrollQuery.isError]);

    const subtitle = `${month || ''}${month && academicYearName ? ' ' : ''}${academicYearName || ''}`.trim();

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={t('finance.payroll.show.title', { defaultValue: 'Unpaid Salaries' })}
            panelClassName="max-w-5xl"
        >
            <div className="space-y-4">
                {subtitle ? <div className="text-xs text-(--nb-color-muted) font-mono uppercase tracking-widest">{subtitle}</div> : null}

                <div className="text-xs text-(--nb-color-muted)">
                    {t('finance.payroll.show.hint', { defaultValue: 'Charge salaries first to populate this list.' })}
                </div>

                <div className="overflow-x-auto border border-(--nb-color-border) rounded-xl">
                    <StandardTable
                        isLoading={isLoading}
                        loadingMessage={t('finance.payroll.table.loading', { defaultValue: 'Loadingâ€¦' })}
                        items={rows}
                        rows={rows}
                        columns={[
                            { key: 'id', label: t('finance.payroll.columns.employeeId', { defaultValue: 'ID' }) },
                            { key: 'name', label: t('finance.payroll.columns.employeeName', { defaultValue: 'Employee name' }) },
                            { key: 'phone', label: t('finance.payroll.columns.phone', { defaultValue: 'Phone' }) },
                            { key: 'balance', label: t('finance.payroll.show.columns.balance', { defaultValue: 'Balance' }) },
                            {
                                key: 'info',
                                label: t('finance.payroll.show.columns.info', { defaultValue: 'Info' }),
                                noPrint: true,
                                tdClassName: 'no-print',
                            },
                        ]}
                        storageKey="finance:payroll:unpaid"
                        getRowKey={(row) => row?._id}
                        emptyTitle={t('finance.payroll.show.emptyTitle', { defaultValue: 'No unpaid salaries found.' })}
                        tableProps={{ shellClassName: 'ring-0 shadow-none rounded-none' }}
                        renderCell={(row, col) => {
                            switch (col.key) {
                                case 'id':
                                    return String(row?.staff?.employeeId || row?.staff?.username || row?._id?.slice(-6) || 'â€”');
                                case 'name':
                                    return <span className="font-bold">{row?.staff?.fullName || '-'}</span>;
                                case 'phone':
                                    return row?.staff?.phone || '-';
                                case 'balance':
                                    return <span className="font-mono">{Number(row?.netSalary || 0).toLocaleString()}</span>;
                                case 'info':
                                    return (
                                        <Button size="sm" variant="neutral" onClick={() => onOpenInfo?.(row?.staff?._id)}>
                                            {t('finance.payroll.show.actions.info', { defaultValue: 'Info' })}
                                        </Button>
                                    );
                                default:
                                    return 'â€”';
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
