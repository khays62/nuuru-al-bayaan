import React, { useMemo, useState, useEffect } from 'react';
import financeService from '../api/finance';
import { Plus, Edit, Trash2, Check, X, Shield, Settings, Info } from 'lucide-react';
import toast from 'react-hot-toast';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';

export default function AmountTypeTab() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const DEFAULT_FEE_TYPES = ['Standard', 'Mandatory', 'Registration', 'Graduation', 'Optional'];

    // Edit/Create State
    const [editingId, setEditingId] = useState(null); // null = none, 'new' = creating
    const [formData, setFormData] = useState({
        name: '',
        type: 'fee',
        defaultAmount: 0,
        feeType: 'Standard' // Standard, Mandatory, Optional, etc.
    });

    const [isCustomFeeType, setIsCustomFeeType] = useState(false);
    const [customFeeType, setCustomFeeType] = useState('');

    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');

    useEffect(() => {
        loadCategories();
    }, []);

    const onSort = (field) => {
        const f = String(field || '').trim();
        if (!f) return;
        setSortBy((prev) => {
            if (prev === f) {
                setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                return prev;
            }
            setSortDir('asc');
            return f;
        });
    };

    const tableRows = useMemo(() => {
        const list = Array.isArray(categories) ? categories.slice() : [];
        const dir = sortDir === 'desc' ? -1 : 1;
        const field = String(sortBy || '').trim();
        if (!field) return list;

        list.sort((a, b) => {
            const av = a?.[field];
            const bv = b?.[field];
            if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
            return String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true, sensitivity: 'base' }) * dir;
        });
        return list;
    }, [categories, sortBy, sortDir]);

    const loadCategories = async () => {
        try {
            const res = await financeService.getFinanceCategories();
            setCategories(res.data ? res.data.filter(c => c.type === 'fee') : (Array.isArray(res) ? res.filter(c => c.type === 'fee') : []));
        } catch {
            toast.error("Failed to load fee configurations");
        } finally {
            setLoading(false);
        }
    };

    const normalizeFeeType = (value) => String(value || '').trim();

    const beginFeeTypeEdit = (value) => {
        const normalized = normalizeFeeType(value) || 'Standard';
        const isDefault = DEFAULT_FEE_TYPES.includes(normalized);
        setIsCustomFeeType(!isDefault);
        setCustomFeeType(!isDefault ? normalized : '');
        setFormData(prev => ({ ...prev, feeType: normalized }));
    };

    const handleSave = async () => {
        if (!formData.name) return toast.error("Name is required");

        const finalFeeType = isCustomFeeType ? normalizeFeeType(customFeeType) : normalizeFeeType(formData.feeType);
        if (!finalFeeType) return toast.error("Fee Type is required");

        const payload = {
            ...formData,
            feeType: finalFeeType
        };

        try {
            if (editingId === 'new') {
                await financeService.createFinanceCategory(payload);
                toast.success("Fee structure defined successfully");
            } else {
                await financeService.updateFinanceCategory(editingId, payload);
                toast.success("Configuration synchronized");
            }
            setEditingId(null);
            setIsCustomFeeType(false);
            setCustomFeeType('');
            loadCategories();
        } catch {
            toast.error("Process interrupted by server");
        }
    };

    const startEdit = (cat) => {
        setEditingId(cat._id);
        const normalized = normalizeFeeType(cat.feeType) || 'Standard';
        setIsCustomFeeType(!DEFAULT_FEE_TYPES.includes(normalized));
        setCustomFeeType(!DEFAULT_FEE_TYPES.includes(normalized) ? normalized : '');
        setFormData({
            name: cat.name,
            type: cat.type,
            defaultAmount: cat.defaultAmount,
            feeType: normalized
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Archiving this configuration will prevent new charges from using it. Proceed?")) return;
        try {
            await financeService.deleteFinanceCategory(id);
            toast.success("Configuration Archived");
            loadCategories();
        } catch {
            toast.error("Operation failed");
        }
    };

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-600/20">
                        <Settings size={24} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Amount Configuration</h3>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Global Fee Definition Matrix</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setEditingId('new');
                        setFormData({ name: '', type: 'fee', defaultAmount: 0, feeType: 'Standard' });
                        setIsCustomFeeType(false);
                        setCustomFeeType('');
                    }}
                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
                >
                    <Plus size={18} strokeWidth={3} /> Define New Amount Type
                </button>
            </div>

            {/* Editing Form Row (if new) */}
            {editingId === 'new' && (
                <div className="bg-white border-2 border-blue-600/20 p-8 rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fee Label / Identity</label>
                            <input type="text" className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-600/10 transition-all" placeholder="e.g. Monthly Tuition" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} autoFocus />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Multiplier ($)</label>
                            <input type="number" className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl font-black text-lg outline-none focus:ring-4 focus:ring-blue-600/10 transition-all" placeholder="0.00" value={formData.defaultAmount} onChange={e => setFormData({ ...formData, defaultAmount: e.target.value })} />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction Category</label>
                            <div className="flex gap-2">
                                {isCustomFeeType ? (
                                    <input
                                        type="text"
                                        className="flex-1 h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs uppercase outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                        placeholder="Enter Fee Type"
                                        value={customFeeType}
                                        onChange={e => setCustomFeeType(e.target.value)}
                                    />
                                ) : (
                                    <select
                                        className="flex-1 h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs uppercase outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                        value={formData.feeType}
                                        onChange={e => beginFeeTypeEdit(e.target.value)}
                                    >
                                        {DEFAULT_FEE_TYPES.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isCustomFeeType) {
                                            setIsCustomFeeType(false);
                                            setCustomFeeType('');
                                            setFormData(prev => ({ ...prev, feeType: 'Standard' }));
                                        } else {
                                            setIsCustomFeeType(true);
                                            setCustomFeeType('');
                                        }
                                    }}
                                    className="h-14 px-5 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                                >
                                    {isCustomFeeType ? 'Use List' : 'Create'}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3">
                            <button onClick={() => setEditingId(null)} className="h-14 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Discard</button>
                            <button onClick={handleSave} className="h-14 px-10 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all">Synchronize</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                <StandardTable
                    isLoading={loading}
                    error={null}
                    items={tableRows}
                    loadingMessage="Initializing Data Stream..."
                    loadingVariant="table"
                    loadingRows={6}
                    loadingColumns={5}
                    emptyTitle="No configurations detected."
                    emptyDescription=""

                    rows={tableRows}
                    columns={[
                        { key: 'name', label: 'Fee Identity', sortable: true, field: 'name' },
                        { key: 'defaultAmount', label: 'Default Amount', sortable: true, field: 'defaultAmount' },
                        { key: 'feeType', label: 'Category Type', sortable: true, field: 'feeType' },
                        { key: 'status', label: 'Status', sortable: true, field: 'status' },
                        { key: 'actions', label: 'System Actions', sortable: false, align: 'right', noPrint: true, tdClassName: 'no-print' },
                    ]}
                    storageKey="finance:amount-types:columns:v1"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={onSort}
                    getRowKey={(row) => row?._id}
                    renderCell={(cat, col) => {
                        switch (col.key) {
                            case 'name':
                                return editingId === cat._id ? (
                                    <input
                                        className="w-full h-11 px-4 bg-white border border-slate-300 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600/20"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-10 bg-blue-600/20 rounded-full" />
                                        <span className="font-bold text-slate-900 text-base">{cat.name}</span>
                                    </div>
                                );
                            case 'defaultAmount':
                                return editingId === cat._id ? (
                                    <input
                                        type="number"
                                        className="w-32 h-11 px-4 bg-white border border-slate-300 rounded-xl font-black text-sm outline-none focus:ring-2 focus:ring-blue-600/20"
                                        value={formData.defaultAmount}
                                        onChange={e => setFormData({ ...formData, defaultAmount: e.target.value })}
                                    />
                                ) : (
                                    <span className="font-black text-slate-900 text-lg tabular-nums">${Number(cat.defaultAmount).toLocaleString()}</span>
                                );
                            case 'feeType':
                                return editingId === cat._id ? (
                                    <div className="flex gap-2">
                                        {isCustomFeeType ? (
                                            <input
                                                className="flex-1 h-11 px-4 bg-white border border-slate-300 rounded-xl font-black text-[10px] uppercase outline-none focus:ring-2 focus:ring-blue-600/20"
                                                value={customFeeType}
                                                onChange={e => setCustomFeeType(e.target.value)}
                                            />
                                        ) : (
                                            <select
                                                className="flex-1 h-11 px-4 bg-white border border-slate-300 rounded-xl font-black text-[10px] uppercase outline-none focus:ring-2 focus:ring-blue-600/20"
                                                value={formData.feeType}
                                                onChange={e => beginFeeTypeEdit(e.target.value)}
                                            >
                                                {DEFAULT_FEE_TYPES.map(t => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isCustomFeeType) {
                                                    setIsCustomFeeType(false);
                                                    setCustomFeeType('');
                                                    setFormData(prev => ({ ...prev, feeType: 'Standard' }));
                                                } else {
                                                    setIsCustomFeeType(true);
                                                    setCustomFeeType(formData.feeType === 'Standard' ? '' : formData.feeType);
                                                }
                                            }}
                                            className="h-11 px-3 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                                        >
                                            {isCustomFeeType ? 'List' : 'Create'}
                                        </button>
                                    </div>
                                ) : (
                                    <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                        {cat.feeType || 'Standard'}
                                    </span>
                                );
                            case 'status':
                                return (
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${cat.status === 'active' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{cat.status}</span>
                                    </div>
                                );
                            case 'actions':
                                return editingId === cat._id ? (
                                    <RowActionButtons
                                        actions={[
                                            {
                                                key: 'cancel',
                                                label: 'Cancel',
                                                title: 'Cancel',
                                                tone: 'delete',
                                                icon: <X size={18} />,
                                                onClick: () => setEditingId(null),
                                            },
                                            {
                                                key: 'save',
                                                label: 'Save',
                                                title: 'Save',
                                                tone: 'edit',
                                                icon: <Check size={18} strokeWidth={3} />,
                                                onClick: handleSave,
                                            },
                                        ]}
                                    />
                                ) : (
                                    <RowActionButtons
                                        actions={[
                                            {
                                                key: 'edit',
                                                label: 'Edit',
                                                title: 'Edit',
                                                tone: 'edit',
                                                icon: <Edit size={18} />,
                                                onClick: () => startEdit(cat),
                                            },
                                            {
                                                key: 'delete',
                                                label: 'Delete',
                                                title: 'Delete',
                                                tone: 'delete',
                                                icon: <Trash2 size={18} />,
                                                onClick: () => handleDelete(cat._id),
                                            },
                                        ]}
                                    />
                                );
                            default:
                                return '';
                        }
                    }}

                    showRowsSelector={false}
                    paginationProps={{ className: 'no-print', infoVariant: 'page' }}
                />
            </div>

            <div className="bg-slate-900 p-8 rounded-[2.5rem] flex gap-6 items-start shadow-2xl">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400 shrink-0 border border-white/5">
                    <Shield size={24} />
                </div>
                <div>
                    <h4 className="text-white font-black uppercase tracking-widest text-xs mb-2">Architectural Integrity Constraint</h4>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-4xl">
                        Modifying default amounts will only affect future charges. Historical records are cryptographically linked to the amount defined at the time of charge generation to ensure audit trail consistency across academic years.
                    </p>
                </div>
            </div>
        </div>
    );
}
