import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import financeService from '../api/finance';
import headerImg from '../../../assets/nuuruBayaanHeader.png';

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
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        month: defaultMonth,
        academicYear: defaultAcademicYearId || '',
        status: 'Paid',
        format: 'pdf', // pdf | excel
    });

    const canPrint = useMemo(() => {
        return Boolean(form.month && form.academicYear && form.format);
    }, [form]);

    const downloadCsv = (filename, rows) => {
        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const printPdf = ({ title, tableHtml }) => {
        const logoUrl = getLogoUrl();
        const win = window.open('', '_blank');
        if (!win) return toast.error('Popup blocked');

        win.document.write(`
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
    `);
        win.document.close();
        win.focus();
        win.print();
    };

    const handlePrint = async (e) => {
        e.preventDefault();
        if (!canPrint) return;

        setLoading(true);
        try {
            const payload = await financeService.printPayrollList({
                month: form.month,
                academicYear: form.academicYear,
                status: form.status,
            });

            const payrolls = payload.payrolls || [];
            const rows = payrolls.map((p, idx) => ({
                no: idx + 1,
                date: p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString(),
                id: p.staff?.employeeId || (p._id ? String(p._id).slice(-6).toUpperCase() : ''),
                name: p.staff?.fullName || '',
                phone: p.staff?.phone || '',
                employeeType: formatEmployeeType(p.staff?.employeeType, p.staff?.role),
                salary: Number(p.netSalary || 0),
            }));

            const total = rows.reduce((sum, r) => sum + Number(r.salary || 0), 0);

            if (form.format === 'excel') {
                const header = ['Date', 'No', 'ID', 'Employee Name', 'Phone', 'Employee Type', 'Salary'];
                const csvRows = [header.map(escapeCsv).join(',')];
                for (const r of rows) {
                    csvRows.push([
                        r.date,
                        r.no,
                        r.id,
                        r.name,
                        r.phone,
                        r.employeeType,
                        r.salary,
                    ].map(escapeCsv).join(','));
                }
                csvRows.push(['', '', '', '', '', 'Total', total].map(escapeCsv).join(','));
                downloadCsv(`payroll_${form.month}.csv`, csvRows);
                toast.success('Excel downloaded');
                return;
            }

            const tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>No</th>
              <th>ID</th>
              <th>Employee Name</th>
              <th>Phone</th>
              <th>Employee Type</th>
              <th>Salary</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${r.date}</td>
                <td>${r.no}</td>
                <td>${r.id}</td>
                <td>${r.name}</td>
                <td>${r.phone}</td>
                <td>${r.employeeType}</td>
                <td>${r.salary}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="6">Total</td>
              <td>${total}</td>
            </tr>
          </tfoot>
        </table>
      `;

            const academicYearName = academicYears.find(y => y._id === form.academicYear)?.yearName || '';
            printPdf({ title: `Payroll - ${form.month} ${academicYearName}`, tableHtml });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Print failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-slate-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/30">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Payroll Print</h3>
                        <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">PDF / Excel</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm">
                        <X size={22} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handlePrint} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Month</label>
                            <input
                                type="month"
                                value={form.month}
                                onChange={(e) => setForm(prev => ({ ...prev, month: e.target.value }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Year</label>
                            <select
                                value={form.academicYear}
                                onChange={(e) => setForm(prev => ({ ...prev, academicYear: e.target.value }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                            >
                                <option value="">Select Academic Year</option>
                                {academicYears.map(y => (
                                    <option key={y._id} value={y._id}>{y.yearName}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Format</label>
                            <select
                                value={form.format}
                                onChange={(e) => setForm(prev => ({ ...prev, format: e.target.value }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                            >
                                <option value="pdf">PDF</option>
                                <option value="excel">Excel</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show</label>
                            <select
                                value={form.status}
                                onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold"
                            >
                                <option value="Paid">Paid</option>
                                <option value="Draft">Draft</option>
                                <option value="Approved">Approved</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-[0.2em]"
                        >
                            Close
                        </button>
                        <button
                            type="submit"
                            disabled={!canPrint || loading}
                            className="px-8 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Print'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
