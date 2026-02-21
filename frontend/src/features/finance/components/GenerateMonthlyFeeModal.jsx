import React, { useState, useEffect } from 'react';
import financeService from '../api/finance';
import { X, Plus, Trash2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmationModal from '../common/ConfirmationModal';
import GradeSelect from '../../lookups/components/GradeSelect.jsx';
import ShiftSelect from '../../lookups/components/ShiftSelect.jsx';
import GradeSectionSelect from '../../lookups/components/GradeSectionSelect.jsx';

export default function GenerateMonthlyFeeModal({ onClose, onSuccess }) {
    const [feeTypes, setFeeTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Form State
    const [classId, setClassId] = useState('');
    const [gradeId, setGradeId] = useState('');
    const [shiftId, setShiftId] = useState('');
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');

    const resetClassFilters = () => {
        setGradeId('');
        setShiftId('');
        setClassId('');
    };

    // Multi-Item State
    const [selectedItems, setSelectedItems] = useState([
        { name: 'Tuition Fee', amount: 0, category: null }
    ]);

    // Discount State
    const [discount, setDiscount] = useState({
        name: '',
        type: 'fixed',
        value: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const catsRes = await financeService.getFinanceCategories('fee');
                setFeeTypes(catsRes.data || catsRes || []);
            } catch (error) {
                console.error("Failed to load initial data", error);
            }
        };
        fetchData();

        const date = new Date();
        const month = date.toLocaleString('default', { month: 'long' });
        setTitle(`${month} Invoices`);
        setDueDate(new Date(date.getFullYear(), date.getMonth() + 1, 5).toISOString().split('T')[0]);
    }, []);

    const handleAddItem = () => {
        setSelectedItems([...selectedItems, { name: '', amount: 0, category: null }]);
    };

    const handleRemoveItem = (index) => {
        if (selectedItems.length > 1) {
            setSelectedItems(selectedItems.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index, field, value) => {
        const newItems = [...selectedItems];
        newItems[index][field] = value;

        if (field === 'category') {
            const cat = feeTypes.find(f => f.name === value || f._id === value);
            if (cat) {
                newItems[index].name = cat.name;
                newItems[index].amount = cat.defaultAmount || 0;
            }
        }
        setSelectedItems(newItems);
    };

    const subtotal = selectedItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const discountAmount = discount.type === 'fixed'
        ? Number(discount.value)
        : (subtotal * Number(discount.value) / 100);
    const total = Math.max(0, subtotal - discountAmount);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!classId) return toast.error("Please select a class");
        if (subtotal <= 0) return toast.error("Total amount must be greater than zero");
        setShowConfirm(true);
    };

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const billingMonth = dueDate ? String(dueDate).slice(0, 7) : '';
            const payload = {
                classId,
                title,
                dueDate,
                billingMonth,
                items: selectedItems.map(i => ({
                    name: i.name,
                    amount: Number(i.amount),
                    category: (feeTypes.find(f => f._id === i.category || f.name === i.category || f.name === i.name)?._id) || null
                })),
                discounts: discount.value > 0 ? [{
                    name: discount.name || 'Batch Discount',
                    type: discount.type,
                    value: Number(discount.value),
                    amountOff: discountAmount
                }] : [],
                scope: 'class'
            };

            const response = await financeService.createBulkInvoice(payload);
            toast.success(`Generated ${response.stats?.created || ''} invoices successfully!`);
            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || "Generation failed");
        } finally {
            setLoading(false);
            setShowConfirm(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-(--nb-color-bg-card) w-full max-w-3xl rounded-xl shadow-(--nb-shadow-md) overflow-hidden flex flex-col max-h-[90vh] border border-(--nb-color-border)">
                <div className="flex justify-between items-center p-6 border-b border-(--nb-color-border)">
                    <div>
                        <h3 className="text-lg font-black text-(--nb-color-fg) uppercase tracking-tight">Bulk Fee Generation</h3>
                        <p className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest leading-none mt-1">Create monthly invoices for a class</p>
                    </div>
                    <button onClick={onClose} className="text-(--nb-color-muted) hover:text-(--nb-color-fg) transition-colors p-2 hover:bg-(--nb-color-bg) rounded-full">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Target Class</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <GradeSelect
                                    value={gradeId}
                                    onChange={(v) => {
                                        setGradeId(v || '');
                                        setClassId('');
                                    }}
                                    placeholder="Grade"
                                    className="w-full px-5 py-3.5 border border-(--nb-color-border) rounded-xl outline-none font-bold text-sm"
                                />
                                <ShiftSelect
                                    value={shiftId}
                                    onChange={(v) => {
                                        setShiftId(v || '');
                                        setClassId('');
                                    }}
                                    placeholder="Shift"
                                    className="w-full px-5 py-3.5 border border-(--nb-color-border) rounded-xl outline-none font-bold text-sm"
                                />
                                <GradeSectionSelect
                                    gradeId={gradeId}
                                    shiftId={shiftId}
                                    value={classId}
                                    onChange={(v) => setClassId(v || '')}
                                    searchable
                                    maxVisible={7}
                                    placeholder="Section"
                                    searchPlaceholder="Search…"
                                    className="w-full px-5 py-3.5 border border-(--nb-color-border) rounded-xl outline-none font-bold text-sm"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={resetClassFilters}
                                className="mt-2 h-10 px-4 rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) text-(--nb-color-fg) font-bold text-sm inline-flex items-center gap-2 hover:bg-(--nb-color-bg)"
                                title="Reset class filters"
                            >
                                <RotateCcw size={16} />
                                Reset
                            </button>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Invoice Title</label>
                            <input
                                type="text"
                                className="w-full px-5 py-3.5 border border-(--nb-color-border) bg-(--nb-color-bg) text-(--nb-color-fg) rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none font-bold text-sm"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. June Monthly Fees"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-black text-(--nb-color-fg) uppercase tracking-tight text-sm">Fee Items</h4>
                            <button type="button" onClick={handleAddItem} className="text-blue-600 hover:underline text-sm font-bold flex items-center gap-1">
                                <Plus size={16} /> Add Item
                            </button>
                        </div>

                        {selectedItems.map((item, index) => (
                            <div key={index} className="flex gap-2 items-end bg-(--nb-color-bg) p-4 rounded-xl border border-(--nb-color-border)">
                                <div className="flex-1 space-y-1">
                                    <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Category</label>
                                    <select
                                        className="w-full px-3 py-2.5 border border-(--nb-color-border) rounded-xl bg-(--nb-color-bg) text-(--nb-color-fg) text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                        value={item.category || ''}
                                        onChange={e => updateItem(index, 'category', e.target.value)}
                                    >
                                        <option value="">Select Category</option>
                                        {feeTypes.map(ft => (
                                            <option key={ft._id} value={ft.name}>{ft.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-2 space-y-1">
                                    <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Item Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2.5 border border-(--nb-color-border) rounded-xl bg-(--nb-color-bg) text-(--nb-color-fg) text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                        value={item.name}
                                        onChange={e => updateItem(index, 'name', e.target.value)}
                                        placeholder="Description"
                                    />
                                </div>
                                <div className="w-24 space-y-1">
                                    <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">Amount ($)</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2.5 border border-(--nb-color-border) rounded-xl bg-(--nb-color-bg) text-(--nb-color-fg) text-sm font-black outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                        value={item.amount}
                                        onChange={e => updateItem(index, 'amount', e.target.value)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveItem(index)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl"
                                    disabled={selectedItems.length === 1}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl space-y-3 border border-blue-100">
                        <h4 className="text-sm font-black text-blue-800 uppercase tracking-tight">Discount / Deduction (Optional)</h4>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 px-3 py-2.5 border border-blue-100 rounded-xl bg-(--nb-color-bg-card) text-(--nb-color-fg) text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                placeholder="Reason e.g. Early Bird"
                                value={discount.name}
                                onChange={e => setDiscount({ ...discount, name: e.target.value })}
                            />
                            <select
                                className="w-28 px-3 py-2.5 border border-blue-100 rounded-xl bg-(--nb-color-bg-card) text-(--nb-color-fg) text-sm font-bold outline-none"
                                value={discount.type}
                                onChange={e => setDiscount({ ...discount, type: e.target.value })}
                            >
                                <option value="fixed">$ Fixed</option>
                                <option value="percentage">% Percent</option>
                            </select>
                            <input
                                type="number"
                                className="w-24 px-3 py-2.5 border border-blue-100 rounded-xl bg-(--nb-color-bg-card) text-(--nb-color-fg) text-sm font-black outline-none"
                                value={discount.value}
                                onChange={e => setDiscount({ ...discount, value: e.target.value })}
                            />
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-(--nb-color-border) bg-(--nb-color-bg) flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-(--nb-color-muted) uppercase font-black tracking-widest">Per Student Total</p>
                        <p className="text-2xl font-black text-(--nb-color-fg) tabular-nums">${total.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="space-y-1 mr-4">
                            <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1 block">Due Date</label>
                            <input
                                type="date"
                                className="px-4 py-2.5 border border-(--nb-color-border) rounded-xl text-sm font-bold bg-(--nb-color-bg) text-(--nb-color-fg) outline-none"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Generate Invoices'}
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleConfirm}
                title="Confirm Batch Generation"
                message={`This will generate ${title} for all students in the selected class ($${total.toFixed(2)} each). Proceed?`}
                confirmText="Generate Now"
                loading={loading}
            />
        </div>
    );
}
