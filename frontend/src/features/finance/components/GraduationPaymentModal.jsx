import React, { useState } from 'react';
import { X, GraduationCap, DollarSign, Receipt, Printer, History } from 'lucide-react';
import financeService from '../api/finance';
import toast from 'react-hot-toast';
import { useI18n } from '../../../i18n/useI18n';

export default function GraduationPaymentModal({ student, row, onClose, onSuccess }) {
    const { t } = useI18n();

    const [loading, setLoading] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [paidAmount, setPaidAmount] = useState(0);
    const [paymentType, setPaymentType] = useState('Cash');
    const [accountId] = useState('67756f125aed30282b0f4ef5'); // Default Cash Account

    const handlePay = async () => {
        if (!selectedInvoice) return toast.error(t('finance.graduationPaymentModal.toasts.selectInvoiceRequired', { defaultValue: 'Select an invoice to pay' }));
        if (paidAmount <= 0) return toast.error(t('finance.graduationPaymentModal.toasts.amountInvalid', { defaultValue: 'Enter a valid amount' }));

        setLoading(true);
        try {
            await financeService.payChargedMonth({
                studentId: student._id,
                month: selectedInvoice.billingMonth,
                academicYearId: selectedInvoice.academicYear,
                accountId,
                amount: paidAmount,
                paymentType,
                description: t('finance.graduationPaymentModal.description', { defaultValue: 'Graduation Fee Payment: {{title}}', title: selectedInvoice.title })
            });
            toast.success(t('finance.graduationPaymentModal.toasts.receiptGenerated', { defaultValue: 'Graduation Receipt Generated' }));
            onSuccess();
            onClose();
        } catch {
            toast.error(t('finance.graduationPaymentModal.toasts.paymentFailed', { defaultValue: 'Payment registration failed' }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-center justify-center p-4">
            <div className="bg-(--nb-color-bg-card) w-full max-w-2xl rounded-[2.5rem] shadow-(--nb-shadow-md) overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-(--nb-color-border)">
                <div className="p-8 border-b border-(--nb-color-border) flex justify-between items-center bg-purple-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
                            <GraduationCap size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-(--nb-color-fg) uppercase tracking-tighter">{t('finance.graduationPaymentModal.title', { defaultValue: 'Graduation Payment' })}</h3>
                            <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">{student.fullName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 hover:bg-(--nb-color-bg) rounded-xl flex items-center justify-center transition-colors shadow-(--nb-shadow-sm)">
                        <X size={20} className="text-(--nb-color-muted)" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-[0.2em] ml-1">{t('finance.graduationPaymentModal.labels.selectInvoice', { defaultValue: 'Select Graduation Invoice' })}</label>
                        <div className="grid grid-cols-1 gap-3">
                            {row.invoices.map(inv => (
                                <button
                                    key={inv._id}
                                    onClick={() => {
                                        setSelectedInvoice(inv);
                                        setPaidAmount(inv.amount - inv.paidAmount);
                                    }}
                                    className={`p-4 rounded-2xl border-2 transition-all text-left flex justify-between items-center ${selectedInvoice?._id === inv._id ? 'border-purple-600 bg-purple-50 shadow-(--nb-shadow-sm)' : 'border-(--nb-color-border) hover:border-purple-200'}`}
                                >
                                    <div>
                                        <p className="font-bold text-(--nb-color-fg)">{inv.title}</p>
                                        <p className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest">{t('finance.graduationPaymentModal.labels.balance', { defaultValue: 'Balance' })}: ${Number(inv.amount - inv.paidAmount).toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-lg text-(--nb-color-fg) tabular-nums">${Number(inv.amount).toLocaleString()}</p>
                                        {inv.paidAmount > 0 && <p className="text-[10px] text-green-600 font-bold uppercase tracking-tight">{t('finance.graduationPaymentModal.labels.paid', { defaultValue: 'Paid' })}: ${inv.paidAmount}</p>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedInvoice && (
                        <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">{t('finance.graduationPaymentModal.labels.paymentAmount', { defaultValue: 'Payment Amount' })}</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-(--nb-color-muted)" size={18} />
                                    <input
                                        type="number"
                                        className="w-full h-14 pl-10 pr-6 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-2xl font-black text-lg text-(--nb-color-fg) outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                                        value={paidAmount}
                                        onChange={e => setPaidAmount(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">{t('finance.graduationPaymentModal.labels.paymentMethod', { defaultValue: 'Payment Method' })}</label>
                                <select
                                    className="w-full h-14 px-6 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-2xl font-black text-xs uppercase text-(--nb-color-fg) outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                                    value={paymentType}
                                    onChange={e => setPaymentType(e.target.value)}
                                >
                                    <option value="Cash">{t('finance.graduationPaymentModal.methods.cash', { defaultValue: 'Cash' })}</option>
                                    <option value="Bank">{t('finance.graduationPaymentModal.methods.bank', { defaultValue: 'Bank Transfer' })}</option>
                                    <option value="E-Dahab">{t('finance.graduationPaymentModal.methods.edahab', { defaultValue: 'E-Dahab' })}</option>
                                    <option value="Sahay">{t('finance.graduationPaymentModal.methods.sahay', { defaultValue: 'Sahal / Zaad' })}</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-(--nb-color-bg) border-t border-(--nb-color-border) flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest text-(--nb-color-muted) hover:bg-(--nb-color-bg-card) transition-all border border-(--nb-color-border)"
                    >
                        {t('finance.graduationPaymentModal.actions.cancel', { defaultValue: 'Cancel' })}
                    </button>
                    <button
                        onClick={handlePay}
                        disabled={loading || !selectedInvoice}
                        className="flex-2 h-14 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-purple-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-3"
                    >
                        {loading ? t('finance.graduationPaymentModal.actions.processing', { defaultValue: 'Processing...' }) : (
                            <>
                                <Printer size={18} /> {t('finance.graduationPaymentModal.actions.processAndPrint', { defaultValue: 'Process & Print Receipt' })}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
