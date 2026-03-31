import React, { useState, useEffect } from 'react';
import financeService from '../api/finance';
import { X, Save, DollarSign, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EditPayrollModal({ payroll, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [formData, setFormData] = useState({
        basicSalary: payroll.basicSalary || 0,
        commission: payroll.commission || 0,
        decrease: payroll.decrease || 0,
        correction: payroll.correction || 0,
        paymentMethod: 'Cash',
        reference: '',
        accountId: '',
        status: 'Paid'
    });

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const data = await financeService.getAccounts();
            setAccounts(data || []);
            if (data.length > 0) setFormData(prev => ({ ...prev, accountId: data[0]._id }));
        } catch {
            toast.error("Failed to load accounts");
        }
    };

    const netSalary = (formData.basicSalary || 0) +
        (formData.commission || 0) +
        (formData.correction || 0) -
        (formData.decrease || 0);

    const handleAdjustOnly = async () => {
        setLoading(true);
        try {
            await financeService.adjustPayroll(payroll._id, {
                basicSalary: formData.basicSalary,
                commission: formData.commission,
                decrease: formData.decrease,
                correction: formData.correction
            });
            toast.success("Adjustments Saved");
            onSuccess();
            onClose();
        } catch {
            toast.error("Adjustment Failed");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmPayment = async (e) => {
        e.preventDefault();
        if (!formData.accountId) return toast.error("Please select a disbursement account");

        setLoading(true);
        try {
            // First save adjustments
            await financeService.adjustPayroll(payroll._id, {
                basicSalary: formData.basicSalary,
                commission: formData.commission,
                decrease: formData.decrease,
                correction: formData.correction
            });

            // Then mark as paid
            await financeService.updatePayrollStatus(payroll._id, {
                status: 'Paid',
                paymentMethod: formData.paymentMethod,
                reference: formData.reference,
                accountId: formData.accountId
            });

            toast.success("Salary Disbursed Successfully");
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || "Payment Processing Failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-(--nb-color-bg-card) w-full max-w-2xl rounded-xl shadow-(--nb-shadow-md) overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-(--nb-color-border)">
                <div className="flex justify-between items-center p-6 border-b border-(--nb-color-border)">
                    <div>
                        <h3 className="text-xl font-black text-(--nb-color-fg) tracking-tight flex items-center gap-3">
                            <Calculator className="text-blue-600" size={24} />
                            Payroll Adjustment & Release
                        </h3>
                        <p className="text-sm text-(--nb-color-muted) font-medium">Employee: {payroll.staff?.fullName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-(--nb-color-bg) rounded-xl transition-all">
                        <X size={24} className="text-(--nb-color-muted)" />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 overflow-y-auto max-h-[70vh]">
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest border-b border-(--nb-color-border) pb-2">Salary Components</h4>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-(--nb-color-fg) uppercase tracking-wider">Base Salary ($)</label>
                            <input
                                type="number"
                                className="w-full p-3 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold text-lg text-(--nb-color-fg)"
                                value={formData.basicSalary}
                                onChange={e => setFormData({ ...formData, basicSalary: Number(e.target.value) })}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-(--nb-color-fg) uppercase tracking-wider">Commission (+)</label>
                                <input
                                    type="number"
                                    className="w-full p-3 bg-green-50/50 border border-green-100 rounded-xl focus:ring-4 focus:ring-green-500/10 outline-none font-bold text-green-700"
                                    value={formData.commission}
                                    onChange={e => setFormData({ ...formData, commission: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-(--nb-color-fg) uppercase tracking-wider">Decrease (-)</label>
                                <input
                                    type="number"
                                    className="w-full p-3 bg-red-50/50 border border-red-100 rounded-xl focus:ring-4 focus:ring-red-500/10 outline-none font-bold text-red-700"
                                    value={formData.decrease}
                                    onChange={e => setFormData({ ...formData, decrease: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-(--nb-color-fg) uppercase tracking-wider">Correction (+/-)</label>
                            <input
                                type="number"
                                className="w-full p-3 bg-blue-50/50 border border-blue-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-blue-700"
                                value={formData.correction}
                                onChange={e => setFormData({ ...formData, correction: Number(e.target.value) })}
                            />
                        </div>

                        <div className="bg-(--nb-color-brand) p-6 rounded-2xl">
                            <p className="text-[10px] font-black text-white/80 uppercase tracking-widest leading-none mb-2">Net Payable Salary</p>
                            <p className="text-3xl font-black text-white tracking-tighter">${netSalary.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest border-b border-(--nb-color-border) pb-2">Disbursement Details</h4>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-(--nb-color-fg) uppercase tracking-wider">Source Account</label>
                            <select
                                className="w-full p-3 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold text-(--nb-color-fg)"
                                value={formData.accountId}
                                onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                            >
                                <option value="">Select Institutional Account</option>
                                {accounts.map(acc => (
                                    <option key={acc._id} value={acc._id}>{acc.name} (${acc.balance?.toLocaleString()})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-(--nb-color-fg) uppercase tracking-wider">Payment Method</label>
                            <select
                                className="w-full p-3 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold text-(--nb-color-fg)"
                                value={formData.paymentMethod}
                                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                            >
                                <option value="Cash">Institutional Petty Cash</option>
                                <option value="Bank Transfer">Central Bank Transfer</option>
                                <option value="Mobile Money">Mobile Disbursement</option>
                                <option value="Cheque">Corporate Cheque</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-(--nb-color-fg) uppercase tracking-wider">Internal Reference</label>
                            <input
                                type="text"
                                className="w-full p-3 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none text-(--nb-color-fg)"
                                placeholder="E.g. PB-990-2024"
                                value={formData.reference}
                                onChange={e => setFormData({ ...formData, reference: e.target.value })}
                            />
                        </div>

                        <div className="pt-4 grid grid-cols-1 gap-3">
                            <button
                                onClick={handleConfirmPayment}
                                disabled={loading}
                                className="w-full bg-(--nb-color-brand) hover:opacity-90 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-(--nb-shadow-md)"
                            >
                                <DollarSign size={14} /> Release Disbursement
                            </button>
                            <button
                                onClick={handleAdjustOnly}
                                disabled={loading}
                                className="w-full bg-(--nb-color-bg-card) border border-(--nb-color-border) text-(--nb-color-muted) hover:text-(--nb-color-fg) hover:bg-(--nb-color-bg) py-3 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Save size={14} /> Only Save Adjustment
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

