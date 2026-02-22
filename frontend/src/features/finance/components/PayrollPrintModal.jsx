import React, { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { printPayrollList } from '../api/payrollApi';
import headerImg from '../../../assets/nuuruBayaanHeader.png';

import Modal from '../../../shared/components/ui/Modal.jsx';
import FormField from '../../../shared/components/ui/FormField.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import {
    exportTableToPDF,
    exportTableToExcel,
    exportTableToCSV,
    exportTableToClipboard,
    printHtmlDocument,
} from '../../../utils/exportTable';

import AcademicYearSelect from '../../lookups/components/AcademicYearSelect.jsx';

import { useI18n } from '../../../i18n/I18nProvider.jsx';

const getLogoUrl = () => {
    try {
        const storedLogo = localStorage.getItem('headerImg');
        return storedLogo || headerImg;
    } catch {
        return headerImg;
    }
};

const escapeCsv = (value) => {
    const str = String(value ?? '');
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
};

const formatEmployeeType = (employeeType, role) => {
    const raw = String(employeeType || role || '').trim();
    if (!raw) return '';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
};

export default function PayrollPrintModal({
    onClose,
    defaultMonth,
    academicYears,
    defaultAcademicYearId,
}) {
    const { t, lang } = useI18n();
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        month: defaultMonth,
        academicYear: defaultAcademicYearId || '',
        status: 'Paid',
        exportType: 'print', // print | pdf | excel | csv | copy
    });

    const canRun = useMemo(() => {
        return Boolean(form.month && form.academicYear);
    }, [form]);

    const getHeaderImageSrc = () => {
        return getLogoUrl();
    };

    const printPdf = ({ title, tableHtml }) => {
        const logoUrl = getLogoUrl();
                const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; }
            .header-logo { display: block; margin: 0 auto 12px; width: 100%; max-height: 28mm; object-fit: contain; }
            h1 { text-align: center; margin: 0 0 16px; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
            th { background: #f4f4f4; }
            tfoot td { font-weight: bold; }
          </style>
        </head>
        <body>
          ${logoUrl ? `<img src="${logoUrl}" class="header-logo" />` : ''}
          <h1>${title}</h1>
          ${tableHtml}
        </body>
      </html>
        `;

                printHtmlDocument(html, { title });
    };

    const formatMonthLong = (monthValue) => {
        const raw = String(monthValue || '').trim();
        if (!/^[0-9]{4}-[0-9]{2}$/.test(raw)) return raw;
        const [yStr, mStr] = raw.split('-');
        const y = Number(yStr);
        const m = Number(mStr);
        if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return raw;
        const dt = new Date(y, m - 1, 1);
        try {
            return new Intl.DateTimeFormat(String(lang || 'en'), { month: 'long', year: 'numeric' }).format(dt);
        } catch {
            return raw;
        }
    };

    const fetchPayrollRows = async () => {
        const payload = await printPayrollList({
            month: form.month,
            academicYear: form.academicYear,
            status: form.status,
        });

        const payrolls = payload?.payrolls || [];
        const rows = payrolls.map((p, idx) => ({
            no: idx + 1,
            date: p.paymentDate
                ? new Date(p.paymentDate).toLocaleDateString(String(lang || 'en'))
                : new Date(p.createdAt).toLocaleDateString(String(lang || 'en')),
            id: p.staff?.employeeId || (p._id ? String(p._id).slice(-6).toUpperCase() : ''),
            name: p.staff?.fullName || '',
            phone: p.staff?.phone || '',
            employeeType: formatEmployeeType(p.staff?.employeeType, p.staff?.role),
            salary: Number(p.netSalary || 0),
            status: p.status || '',
        }));
        return rows;
    };

    const buildExportPayload = async () => {
        if (!canRun) return null;

        const STORAGE_KEY = 'finance:payroll:columns:v1';
        let visible = {};
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') visible = parsed;
            }
        } catch {
            // ignore
        }
        const isVisible = (key) => visible?.[String(key)] !== false;

        const cols = [
            { key: 'date', label: t('finance.payroll.columns.date', { defaultValue: 'Date' }), get: (r) => String(r?.date || '') },
            { key: 'no', label: t('finance.payroll.columns.no', { defaultValue: 'No' }), get: (r) => Number(r?.no || 0) },
            { key: 'employeeId', label: t('finance.payroll.columns.employeeId', { defaultValue: 'ID' }), get: (r) => String(r?.id || '') },
            { key: 'employeeName', label: t('finance.payroll.columns.employeeName', { defaultValue: 'Employee Name' }), get: (r) => String(r?.name || '') },
            { key: 'phone', label: t('finance.payroll.columns.phone', { defaultValue: 'Phone' }), get: (r) => String(r?.phone || '') },
            { key: 'employeeType', label: t('finance.payroll.columns.employeeType', { defaultValue: 'Employee Type' }), get: (r) => String(r?.employeeType || '') },
            { key: 'salary', label: t('finance.payroll.columns.salary', { defaultValue: 'Salary' }), get: (r) => Number(r?.salary || 0) },
            { key: 'status', label: t('common.filters.status', { defaultValue: 'Status' }), get: (r) => String(r?.status || '') },
        ].filter((c) => isVisible(c.key));

        const rows = await fetchPayrollRows();

        const headers = cols.map((c) => c.label);
        const body = (rows || []).map((r) => cols.map((c) => c.get(r)));

        const academicYearName = academicYears.find((y) => y?._id === form.academicYear)?.yearName || '';
        const monthLabel = formatMonthLong(form.month);
        const subtitle = [
            monthLabel ? t('finance.payroll.export.month', { defaultValue: 'Month: {{month}}', month: monthLabel }) : null,
            academicYearName ? t('finance.payroll.export.academicYear', { defaultValue: 'Academic Year: {{year}}', year: academicYearName }) : null,
            form.status ? t('finance.payroll.export.status', { defaultValue: 'Status: {{status}}', status: form.status }) : null,
        ].filter(Boolean).join(' • ');

        return {
            filename: `payroll-${form.month || 'all'}`,
            sheetName: t('finance.payroll.export.sheetName', { defaultValue: 'Payroll' }),
            title: t('finance.payroll.export.title', { defaultValue: 'Payroll' }),
            subtitle,
            headerImageSrc: getHeaderImageSrc() || headerImg,
            headers,
            rows: body,
        };
    };

    const getPrimaryActionText = (exportType) => {
        const type = String(exportType || 'print');
        switch (type) {
            case 'pdf':
                return t('common.export.pdf', { defaultValue: 'PDF' });
            case 'excel':
                return t('common.export.excel', { defaultValue: 'Excel' });
            case 'csv':
                return t('common.export.csv', { defaultValue: 'CSV' });
            case 'copy':
                return t('common.actions.copy', { defaultValue: 'Copy' });
            case 'print':
            default:
                return t('common.actions.print', { defaultValue: 'Print' });
        }
    };

    const handlePrint = async (e) => {
        e.preventDefault();
        if (!canRun) return;

        setLoading(true);
        try {
            const exportType = String(form.exportType || 'print');

            if (exportType !== 'print') {
                const payload = await buildExportPayload();
                if (!payload) return;

                if (exportType === 'pdf') {
                    await exportTableToPDF({ ...payload, orientation: 'landscape' });
                    onClose?.();
                    return;
                }

                if (exportType === 'excel') {
                    const filename = String(payload.filename || 'export.pdf').replace(/\.pdf$/i, '.xlsx');
                    await exportTableToExcel({
                        filename,
                        sheetName: payload.sheetName || 'Sheet1',
                        title: payload.title || '',
                        subtitle: payload.subtitle || '',
                        headerImageSrc: payload.headerImageSrc || '',
                        headers: payload.headers || [],
                        rows: payload.rows || [],
                        sheets: Array.isArray(payload.sheets) ? payload.sheets : null,
                    });
                    onClose?.();
                    return;
                }

                if (exportType === 'csv') {
                    const filename = String(payload.filename || 'export.pdf').replace(/\.pdf$/i, '.csv');
                    exportTableToCSV({
                        filename,
                        title: payload.title || '',
                        subtitle: payload.subtitle || '',
                        includeMetaRows: false,
                        headers: payload.headers || [],
                        rows: payload.rows || [],
                        tables: Array.isArray(payload.tables) ? payload.tables : null,
                    });
                    onClose?.();
                    return;
                }

                if (exportType === 'copy') {
                    await exportTableToClipboard({
                        headers: payload.headers || [],
                        rows: payload.rows || [],
                        tables: Array.isArray(payload.tables) ? payload.tables : null,
                        includeMeta: true,
                        delimiter: '\t',
                    });
                    toast.success(t('common.actions.copied', { defaultValue: 'Copied' }));
                    onClose?.();
                }

                return;
            }

            const rows = await fetchPayrollRows();
            const total = rows.reduce((sum, r) => sum + Number(r.salary || 0), 0);

            const tableHtml = `
                <table>
                    <thead>
                        <tr>
                            <th>${t('finance.payroll.columns.date', { defaultValue: 'Date' })}</th>
                            <th>${t('finance.payroll.columns.no', { defaultValue: 'No' })}</th>
                            <th>${t('finance.payroll.columns.employeeId', { defaultValue: 'ID' })}</th>
                            <th>${t('finance.payroll.columns.employeeName', { defaultValue: 'Employee Name' })}</th>
                            <th>${t('finance.payroll.columns.phone', { defaultValue: 'Phone' })}</th>
                            <th>${t('finance.payroll.columns.employeeType', { defaultValue: 'Employee Type' })}</th>
                            <th>${t('finance.payroll.columns.salary', { defaultValue: 'Salary' })}</th>
                            <th>${t('common.filters.status', { defaultValue: 'Status' })}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => `
                            <tr>
                                <td>${escapeCsv(r.date)}</td>
                                <td>${escapeCsv(r.no)}</td>
                                <td>${escapeCsv(r.id)}</td>
                                <td>${escapeCsv(r.name)}</td>
                                <td>${escapeCsv(r.phone)}</td>
                                <td>${escapeCsv(r.employeeType)}</td>
                                <td>${escapeCsv(r.salary)}</td>
                                <td>${escapeCsv(r.status)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="7">${t('common.total', { defaultValue: 'Total' })}</td>
                            <td>${escapeCsv(total)}</td>
                        </tr>
                    </tfoot>
                </table>
            `;

            const academicYearName = academicYears.find(y => y._id === form.academicYear)?.yearName || '';
            const monthLabel = formatMonthLong(form.month);

            // Close the modal so the user only sees ONE thing (the print preview).
            onClose?.();
            printPdf({
                title: t('finance.payroll.print.title', { defaultValue: 'Payroll - {{month}} {{year}}', month: monthLabel || form.month, year: academicYearName }),
                tableHtml,
            });
        } catch (error) {
            toast.error(error?.response?.data?.message || t('finance.payroll.print.errors.failed', { defaultValue: 'Print failed' }));
        } finally {
            setLoading(false);
        }
    };

    const statusOptions = useMemo(() => ([
        { value: 'Paid', label: t('finance.payroll.status.paid', { defaultValue: 'Paid' }) },
        { value: 'Draft', label: t('finance.payroll.status.draft', { defaultValue: 'Draft' }) },
        { value: 'Approved', label: t('finance.payroll.status.approved', { defaultValue: 'Approved' }) },
    ]), [t]);

    const exportTypeOptions = useMemo(() => ([
        { value: 'print', label: t('common.actions.print', { defaultValue: 'Print' }) },
        { value: 'pdf', label: t('common.export.pdf', { defaultValue: 'PDF' }) },
        { value: 'excel', label: t('common.export.excel', { defaultValue: 'Excel' }) },
        { value: 'csv', label: t('common.export.csv', { defaultValue: 'CSV' }) },
        { value: 'copy', label: t('common.actions.copy', { defaultValue: 'Copy' }) },
    ]), [t]);

    const monthLabel = formatMonthLong(form.month);
    const academicYearName = academicYears.find((y) => y?._id === form.academicYear)?.yearName || '';

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={t('finance.payroll.printModal.title', { defaultValue: 'Payroll Print & Export' })}
            panelClassName="max-w-2xl"
        >
            <form onSubmit={handlePrint} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                    <FormField label={t('common.filters.status', { defaultValue: 'Status' })}>
                        <DropdownSelect
                            value={form.status}
                            onChange={(v) => setForm((prev) => ({ ...prev, status: v }))}
                            options={statusOptions}
                            clearable={false}
                        />
                    </FormField>

                    <FormField
                        label={t('common.export.title', { defaultValue: 'Export' })}
                        hint={
                            [
                                monthLabel ? t('finance.payroll.export.month', { defaultValue: 'Month: {{month}}', month: monthLabel }) : null,
                                academicYearName ? t('finance.payroll.export.academicYear', { defaultValue: 'Academic Year: {{year}}', year: academicYearName }) : null,
                            ].filter(Boolean).join(' • ')
                        }
                        className="sm:col-span-2"
                    >
                        <DropdownSelect
                            value={form.exportType}
                            onChange={(v) => setForm((prev) => ({ ...prev, exportType: v }))}
                            options={exportTypeOptions}
                            clearable={false}
                        />
                    </FormField>
                </div>

                <div className="flex items-center justify-end gap-2 flex-wrap">
                    <Button variant="neutral" onClick={onClose}>
                        {t('common.close', { defaultValue: 'Close' })}
                    </Button>
                    <ActionButton
                        variant="outline"
                        icon={<Printer size={16} />}
                        type="submit"
                        disabled={!canRun || loading}
                        title={getPrimaryActionText(form.exportType)}
                    >
                        {loading ? t('common.loading', { defaultValue: 'Loading…' }) : getPrimaryActionText(form.exportType)}
                    </ActionButton>
                </div>
            </form>
        </Modal>
    );
}
