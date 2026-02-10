import React, { useState } from 'react';
import { X, GraduationCap, DollarSign, Receipt, Printer, History } from 'lucide-react';
import financeService from '../api/finance';
import toast from 'react-hot-toast';

export default function GraduationPaymentModal({ student, row, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [paidAmount, setPaidAmount] = useState(0);
    const [paymentType, setPaymentType] = useState('Cash');
    const [accountId] = useState('67756f125aed30282b0f4ef5'); // Default Cash Account

    const handlePay = async () => {
        if (!selectedInvoice) return toast.error("Select an invoice to pay");
        if (paidAmount <= 0) return toast.error("Enter a valid amount");

        setLoading(true);
        try {
            await financeService.payChargedMonth({
                studentId: student._id,
                month: selectedInvoice.billingMonth,
                academicYearId: selectedInvoice.academicYear,
                accountId,
                amount: paidAmount,
                paymentType,
                description: `Graduation Fee Payment: ${selectedInvoice.title}`
            });
            toast.success("Graduation Receipt Generated");
            onSuccess();
            onClose();
        } catch {
            toast.error("Payment registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-surface-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-surface-100 flex justify-between items-center bg-purple-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
                            <GraduationCap size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-surface-900 uppercase tracking-tighter">Graduation Payment</h3>
                            <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">{student.fullName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 hover:bg-white rounded-xl flex items-center justify-center transition-colors shadow-sm">
                        <X size={20} className="text-surface-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-surface-400 uppercase tracking-[0.2em] ml-1">Select Graduation Invoice</label>
                        <div className="grid grid-cols-1 gap-3">
                            {row.invoices.map(inv => (
                                <button
                                    key={inv._id}
                                    onClick={() => {
                                        setSelectedInvoice(inv);
                                        setPaidAmount(inv.amount - inv.paidAmount);
                                    }}
                                    className={`p-4 rounded-2xl border-2 transition-all text-left flex justify-between items-center ${selectedInvoice?._id === inv._id ? 'border-purple-600 bg-purple-50 shadow-md' : 'border-surface-100 hover:border-purple-200'}`}
                                >
                                    <div>
                                        <p className="font-bold text-surface-900">{inv.title}</p>
                                        <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Balance: ${Number(inv.amount - inv.paidAmount).toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-lg text-surface-900 tabular-nums">${Number(inv.amount).toLocaleString()}</p>
                                        {inv.paidAmount > 0 && <p className="text-[10px] text-green-600 font-bold uppercase tracking-tight">Paid: ${inv.paidAmount}</p>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedInvoice && (
                        <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Payment Amount</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" size={18} />
                                    <input
                                        type="number"
                                        className="w-full h-14 pl-10 pr-6 bg-surface-50 border border-surface-200 rounded-2xl font-black text-lg outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                                        value={paidAmount}
                                        onChange={e => setPaidAmount(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Payment Method</label>
                                <select
                                    className="w-full h-14 px-6 bg-surface-50 border border-surface-200 rounded-2xl font-black text-xs uppercase outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                                    value={paymentType}
                                    onChange={e => setPaymentType(e.target.value)}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Bank">Bank Transfer</option>
                                    <option value="E-Dahab">E-Dahab</option>
                                    <option value="Sahay">Sahal / Zaad</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-surface-50 border-t border-surface-100 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest text-surface-400 hover:bg-white transition-all border border-surface-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handlePay}
                        disabled={loading || !selectedInvoice}
                        className="flex-[2] h-14 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-purple-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-3"
                    >
                        {loading ? 'Processing...' : (
                            <>
                                <Printer size={18} /> Process & Print Receipt
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
