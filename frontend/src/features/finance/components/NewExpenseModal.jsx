import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import financeService from '../api/finance';
import toast from 'react-hot-toast';

export default function NewExpenseModal({ onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [accounts, setAccounts] = useState([]);

    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        category: '',
        date: new Date().toISOString().slice(0, 10),
        description: '',
        accountId: ''
    });

    useEffect(() => {
        const loadCats = async () => {
            try {
                const res = await financeService.getFinanceCategories('expense');
                setCategories(res.data || res || []);
            } catch (e) { console.error(e); }
        };
        loadCats();
    }, []);

    useEffect(() => {
        const loadAccounts = async () => {
            try {
                const res = await financeService.getAccounts();
                setAccounts(res.data || res || []);
            } catch (e) {
                console.error(e);
                toast.error('Failed to sync accounts');
            }
        };
        loadAccounts();
    }, []);

    const handleSubmit = async (e) => {
        if (e?.preventDefault) e.preventDefault();
        setLoading(true);
        try {
            await financeService.createExpense(formData);
            toast.success("Expense Recorded Successfully");
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || "Expense Recording Failed");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Record New Expense</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Expense voucher</p>
                    </div>
                    <button onClick={onClose} className="text-slate-300 hover:text-slate-900 transition-colors p-2 hover:bg-slate-100 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expense Title</label>
                        <input
                            type="text"
                            required
                            className="w-full px-5 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold text-sm"
                            placeholder="e.g. Electricity Bill"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount ($)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                className="w-full px-5 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold text-sm"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                            <input
                                type="date"
                                required
                                className="w-full px-5 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold text-sm"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                        <select
                            className="w-full px-5 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold text-sm"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                            required
                        >
                            <option value="">Select Category</option>
                            {categories.map(c => <option key={c._id || c.name} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Paying Account</label>
                        <select
                            className="w-full px-5 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold text-sm"
                            value={formData.accountId}
                            onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                            required
                        >
                            <option value="">Select Account</option>
                            {accounts.map(a => (
                                <option key={a._id} value={a._id}>
                                    {a.name} ({a.type}){a.accountNumber ? ` • ${a.accountNumber}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                        <textarea
                            className="w-full px-5 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none resize-none h-24 font-bold text-sm"
                            placeholder="Additional details..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </form>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 font-black uppercase text-xs tracking-widest hover:bg-slate-100 rounded-xl transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 bg-blue-600 hover:bg-blue-600/90 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all disabled:opacity-50 shadow-sm"
                    >
                        {loading ? 'Recording...' : 'Record Expense'}
                    </button>
                </div>
            </div>
        </div>
    );
}
