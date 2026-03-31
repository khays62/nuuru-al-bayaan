import React, { useState } from 'react';
import financeService from '../api/finance';
import { X } from 'lucide-react';

export default function CreateInvoiceModal({ onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        studentId: '',
        classId: '', // Optional depending on flow
        title: '',
        type: 'Tuition',
        amount: '',
        dueDate: ''
    });
    const [loading, setLoading] = useState(false);

    // TODO: Fetch students from API to populate dropdown
    // For now, we will trust the user to input a valid Student ID or we mock a list if available.

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await financeService.createInvoice(formData);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to create invoice", error);
            alert("Failed to create invoice");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-(--nb-color-bg-card) w-full max-w-lg rounded-xl shadow-(--nb-shadow-md) overflow-hidden border border-(--nb-color-border)">
                <div className="flex justify-between items-center p-6 border-b border-(--nb-color-border)">
                    <div>
                        <h3 className="text-lg font-black text-(--nb-color-fg) uppercase tracking-tight">Create New Invoice</h3>
                        <p className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest leading-none mt-1">Single student invoice</p>
                    </div>
                    <button onClick={onClose} className="text-(--nb-color-muted) hover:text-(--nb-color-fg) transition-colors p-2 hover:bg-(--nb-color-bg) rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Student ID</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3.5 bg-(--nb-color-bg-card) border border-(--nb-color-border) rounded-xl font-bold text-sm text-(--nb-color-fg) outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                            placeholder="Enter Student ID"
                            value={formData.studentId}
                            onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                            required
                        />
                        <p className="text-[11px] text-(--nb-color-muted) mt-1">Copy ID from student list (e.g., 677...)</p>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Fee Title</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3.5 bg-(--nb-color-bg-card) border border-(--nb-color-border) rounded-xl font-bold text-sm text-(--nb-color-fg) outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                            placeholder="e.g. Monthly Tuition - Jan"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Type</label>
                            <select
                                className="w-full px-5 py-3.5 bg-(--nb-color-bg-card) border border-(--nb-color-border) rounded-xl font-bold text-sm text-(--nb-color-fg) outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="Tuition">Tuition</option>
                                <option value="Transport">Transport</option>
                                <option value="Exam">Exam</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Amount</label>
                            <input
                                type="number"
                                className="w-full px-5 py-3.5 bg-(--nb-color-bg-card) border border-(--nb-color-border) rounded-xl font-bold text-sm text-(--nb-color-fg) outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Due Date</label>
                        <input
                            type="date"
                            className="w-full px-5 py-3.5 bg-(--nb-color-bg-card) border border-(--nb-color-border) rounded-xl font-bold text-sm text-(--nb-color-fg) outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                            value={formData.dueDate}
                            onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                            required
                        />
                    </div>

                    <div className="pt-2 flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-3 rounded-xl font-black uppercase text-xs tracking-widest text-(--nb-color-muted) bg-(--nb-color-bg) hover:bg-(--nb-color-bg-card)"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Invoice'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
