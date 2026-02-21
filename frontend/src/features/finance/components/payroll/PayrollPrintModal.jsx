import React from 'react';
import { X } from 'lucide-react';
import headerImg from '../../../assets/nuuruBayaan.png';

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function downloadCsv(filename, rows) {
    const csv = rows
        .map((r) => r.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export default function PayrollPrintModal({ onClose, payrolls, month, academicYear }) {
    const storedLogo = localStorage.getItem('headerImg');
    const logoUrl = storedLogo || headerImg;

    const rows = (payrolls || []).map((p, idx) => {
        const dateVal = p.paymentDate || p.createdAt;
        const date = dateVal ? new Date(dateVal).toISOString().slice(0, 10) : '-';
        const id = p.staff?.username || p._id?.slice(-6) || '';
        const name = p.staff?.fullName || '';
        const phone = p.staff?.phone || '';
        const type = p.staff?.employeeType || '';
        const salary = Number(p.netSalary || 0);

        return [date, idx + 1, id, name, phone, type, salary];
    });

    const total = (payrolls || []).reduce((sum, p) => sum + Number(p.netSalary || 0), 0);

    const handlePdf = () => {
        const win = window.open('', '_blank');
        const rowsHtml = rows
            .map(
                (r) => `
                <tr>
                    <td>${escapeHtml(r[0])}</td>
                    <td>${escapeHtml(r[1])}</td>
                    <td>${escapeHtml(r[2])}</td>
                    <td>${escapeHtml(r[3])}</td>
                    <td>${escapeHtml(r[4])}</td>
                    <td>${escapeHtml(r[5])}</td>
                    <td style="text-align:right">${escapeHtml(Number(r[6]).toLocaleString())}</td>
                </tr>`
            )
            .join('');

        win.document.write(`
            <html>
              <head>
                <title>Payroll - ${escapeHtml(month)}</title>
                <style>
                  body { font-family: Arial, sans-serif; padding: 16px; }
                  .logo { width: 100%; max-height: 90px; object-fit: contain; display: block; margin: 0 auto 12px; }
                  h1 { font-size: 18px; margin: 0; }
                  .meta { font-size: 12px; color: #555; margin: 4px 0 12px; }
                  table{width:100%;border-collapse:collapse;font-size:12px;} 
                  th,td{border:1px solid #ddd;padding:8px;text-align:left;} 
                  th{background:#f4f4f4;} 
                  tfoot td{font-weight:bold;background:#fafafa;}
                </style>
              </head>
              <body>
                ${logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
                <h1>Payroll</h1>
                <div class="meta">Month: ${escapeHtml(month)}${academicYear ? ` • Academic Year: ${escapeHtml(academicYear)}` : ''}</div>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>No</th>
                      <th>ID</th>
                      <th>Employee Name</th>
                      <th>Phone</th>
                      <th>Employee Type</th>
                      <th style="text-align:right">Salary</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="6">Total</td>
                      <td style="text-align:right">${escapeHtml(total.toLocaleString())}</td>
                    </tr>
                  </tfoot>
                </table>
              </body>
            </html>
        `);
        win.document.close();
        win.focus();
        win.print();
    };

    const handleExcel = () => {
        const header = ['Date', 'No', 'ID', 'Employee Name', 'Phone', 'Employee Type', 'Salary'];
        const out = [header, ...rows, ['', '', '', '', '', 'Total', total]];
        downloadCsv(`payroll_${month}.csv`, out);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-(--nb-color-bg-card) w-full max-w-xl rounded-2xl shadow-(--nb-shadow-md) overflow-hidden border border-(--nb-color-border)">
                <div className="p-6 border-b border-(--nb-color-border) bg-(--nb-color-bg) flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-(--nb-color-fg) uppercase tracking-tight">Print</h3>
                        <p className="text-xs text-(--nb-color-muted) font-bold">Print (PDF / Excel)</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-(--nb-color-bg-card) rounded-xl transition-all">
                        <X size={20} className="text-(--nb-color-muted)" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <button
                        onClick={handlePdf}
                        className="w-full px-6 py-3 bg-(--nb-color-brand) text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:opacity-90 transition-all"
                    >
                        PDF
                    </button>
                    <button
                        onClick={handleExcel}
                        className="w-full px-6 py-3 bg-(--nb-color-bg-card) border border-(--nb-color-border) text-(--nb-color-fg) rounded-xl font-black uppercase text-[10px] tracking-widest hover:border-(--nb-color-focus) transition-all"
                    >
                        Excel
                    </button>
                </div>

                <div className="p-6 border-t border-(--nb-color-border) bg-(--nb-color-bg) flex items-center justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-3 bg-(--nb-color-bg-card) border border-(--nb-color-border) text-(--nb-color-fg) rounded-xl font-black uppercase text-[10px] tracking-widest hover:border-(--nb-color-focus) transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
