import React, { useEffect, useState } from 'react';
import financeService from '../api/finance';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RecordPaymentModal({ invoice, onClose, onSuccess }) {
    const [paymentMethods, setPaymentMethods] = useState(['Cash']);
    const [paymentType, setPaymentType] = useState('Invoice'); // Invoice or Hormaris
    const [formData, setFormData] = useState({
        invoiceId: invoice?._id,
        studentId: invoice?.student?._id, // Required for Hormaris
        amount: invoice?.balance || '',
        method: 'Cash',
        reference: '',
        remarks: '',
        targetMonth: '' // For Hormaris
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await financeService.getFinanceCategories('paymentMethod');
                const list = (res?.data || res || []).map(x => x?.name).filter(Boolean);
                const methods = list.length ? list : ['Cash'];
                setPaymentMethods(methods);
                if (!methods.includes(formData.method)) {
                    setFormData(prev => ({ ...prev, method: methods[0] }));
                }
            } catch {
                // fall back to default
                setPaymentMethods(['Cash']);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                transactionType: paymentType === 'Hormaris' ? 'Hormaris' : 'Payment'
            };
            await financeService.recordPayment(payload);
            toast.success("Payment Recorded Successfully");
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to record payment", error);
            toast.error(error.response?.data?.message || "Failed to record payment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-(--nb-color-bg-card) w-full max-w-lg rounded-xl shadow-(--nb-shadow-md) overflow-hidden border border-(--nb-color-border)">
                <div className="flex justify-between items-center p-6 border-b border-(--nb-color-border)">
                    <div>
                        <h3 className="text-lg font-black text-(--nb-color-fg) uppercase tracking-tight">Record Payment</h3>
                        <p className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest leading-none mt-1">
                            Invoice or Hormaris credit
                        </p>
                    </div>
                    <button onClick={onClose} className="text-(--nb-color-muted) hover:text-(--nb-color-fg) transition-colors p-2 hover:bg-(--nb-color-bg) rounded-full">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 bg-(--nb-color-bg) border-b border-(--nb-color-border) space-y-3">
                    <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-(--nb-color-fg)">
                            <input
                                type="radio"
                                checked={paymentType === 'Invoice'}
                                onChange={() => setPaymentType('Invoice')}
                            />
                            Pay Invoice
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-(--nb-color-fg)">
                            <input
                                type="radio"
                                checked={paymentType === 'Hormaris'}
                                onChange={() => setPaymentType('Hormaris')}
                            />
                            Hormaris (Advance)
                        </label>
                    </div>

                    {paymentType === 'Invoice' ? (
                        <div className="text-sm space-y-1 text-(--nb-color-fg)">
                            <p>Paying for: <span className="font-black text-(--nb-color-fg)">{invoice?.title}</span></p>
                            <p>Student: <span className="font-black text-(--nb-color-fg)">{invoice?.student?.firstName} {invoice?.student?.lastName}</span></p>
                            <p>Total Balance: <span className="font-black text-blue-600">${invoice?.balance}</span></p>
                        </div>
                    ) : (
                        <div className="text-sm space-y-1 text-(--nb-color-fg)">
                            <p>Student: <span className="font-black text-(--nb-color-fg)">{invoice?.student?.firstName} {invoice?.student?.lastName}</span></p>
                            <p className="text-(--nb-color-muted) italic">This will credit the student's account for future fees.</p>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Amount to {paymentType === 'Hormaris' ? 'Credit' : 'Pay'}</label>
                        <input
                            type="number"
                            className="w-full px-5 py-3.5 bg-(--nb-color-bg-card) text-(--nb-color-fg) border border-(--nb-color-border) rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                            value={formData.amount}
                            max={paymentType === 'Invoice' ? invoice?.balance : undefined}
                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            required
                        />
                    </div>

                    {paymentType === 'Hormaris' && (
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Target Month (YYYY-MM)</label>
                            <input
                                type="month"
                                className="w-full px-5 py-3.5 bg-(--nb-color-bg-card) text-(--nb-color-fg) border border-(--nb-color-border) rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                value={formData.targetMonth}
                                onChange={e => setFormData({ ...formData, targetMonth: e.target.value })}
                                required
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Method</label>
                            <select
                                className="w-full px-5 py-3.5 bg-(--nb-color-bg-card) text-(--nb-color-fg) border border-(--nb-color-border) rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                value={formData.method}
                                onChange={e => setFormData({ ...formData, method: e.target.value })}
                            >
                                {paymentMethods.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Reference No.</label>
                            <input
                                type="text"
                                className="w-full px-5 py-3.5 bg-(--nb-color-bg-card) text-(--nb-color-fg) border border-(--nb-color-border) rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                placeholder="Optional"
                                value={formData.reference}
                                onChange={e => setFormData({ ...formData, reference: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-3 font-black uppercase text-xs tracking-widest text-(--nb-color-muted) hover:bg-(--nb-color-bg) rounded-xl">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-xs tracking-widest py-3 rounded-xl disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Confirm Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
