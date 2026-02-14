import React, { useMemo, useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

import {
    useCreateFinanceCategoryMutation,
    useDeleteFinanceCategoryMutation,
    useFinanceCategoriesQuery,
    useUpdateFinanceCategoryMutation,
} from '../hooks/financeConfigHooks';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import Card from '../../../shared/components/ui/Card.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';

export default function AmountTypeTab() {
    const categoriesQuery = useFinanceCategoriesQuery({ type: 'fee', includePreviousBalance: true }, { staleTime: 30_000 });
    const createMutation = useCreateFinanceCategoryMutation();
    const updateMutation = useUpdateFinanceCategoryMutation();
    const deleteMutation = useDeleteFinanceCategoryMutation();

    const categories = Array.isArray(categoriesQuery.data) ? categoriesQuery.data : [];
    // Only show skeleton on the initial load; keep rows visible on background refetch.
    const loading = Boolean(categoriesQuery.isLoading);

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

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    useEffect(() => {
        if (!categoriesQuery.isError) return;
        toast.error('Failed to load fee configurations');
    }, [categoriesQuery.isError]);

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

    useEffect(() => {
        setPage(1);
    }, [sortBy, sortDir, categories.length]);

    const total = tableRows.length;
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const currentRows = tableRows.slice(start, start + limit);

    const normalizeFeeType = (value) => String(value || '').trim();

    const beginFeeTypeEdit = (value) => {
        const normalized = normalizeFeeType(value) || 'Standard';
        const isDefault = DEFAULT_FEE_TYPES.includes(normalized);
        setIsCustomFeeType(!isDefault);
        setCustomFeeType(!isDefault ? normalized : '');
        setFormData(prev => ({ ...prev, feeType: normalized }));
    };

    const handleSave = async () => {
        if (!formData.name) {
            toast.error("Name is required");
            return false;
        }

        const finalFeeType = isCustomFeeType ? normalizeFeeType(customFeeType) : normalizeFeeType(formData.feeType);
        if (!finalFeeType) {
            toast.error("Fee Type is required");
            return false;
        }

        const payload = {
            ...formData,
            feeType: finalFeeType
        };

        try {
            if (editingId === 'new') {
                await createMutation.mutateAsync(payload);
                toast.success("Fee structure defined successfully");
            } else {
                await updateMutation.mutateAsync({ id: editingId, payload });
                toast.success("Configuration synchronized");
            }
            setEditingId(null);
            setIsCustomFeeType(false);
            setCustomFeeType('');
            return true;
        } catch {
            toast.error("Process interrupted by server");
            return false;
        }
    };

    const closeFormModal = () => {
        setEditingId(null);
        setIsCustomFeeType(false);
        setCustomFeeType('');
    };

    const startNew = () => {
        setEditingId('new');
        setFormData({ name: '', type: 'fee', defaultAmount: 0, feeType: 'Standard' });
        setIsCustomFeeType(false);
        setCustomFeeType('');
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
            await deleteMutation.mutateAsync(id);
            toast.success("Configuration Archived");
        } catch {
            toast.error("Operation failed");
        }
    };

    return (
        <div className="space-y-4">
            <Card className="p-6 rounded-3xl shadow-xl no-print">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-600/20">
                            <Settings size={24} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter truncate">Amount Configuration</h3>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-1 truncate">Global Fee Definition Matrix</p>
                        </div>
                    </div>

                    <Button
                        onClick={startNew}
                        variant="brand"
                        size="lg"
                        icon={<Plus size={18} strokeWidth={3} />}
                        className="font-black text-xs uppercase tracking-widest"
                    >
                        Define New Amount Type
                    </Button>
                </div>
            </Card>

            <Modal
                isOpen={editingId === 'new' || (typeof editingId === 'string' && editingId !== 'new')}
                onClose={closeFormModal}
                title={editingId === 'new' ? 'Define New Amount Type' : 'Edit Amount Type'}
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fee Label / Identity</label>
                            <Input
                                type="text"
                                className="h-11 font-bold"
                                placeholder="e.g. Monthly Tuition"
                                value={formData.name}
                                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Multiplier ($)</label>
                            <Input
                                type="number"
                                className="h-11 font-black"
                                placeholder="0.00"
                                value={formData.defaultAmount}
                                onChange={(e) => setFormData((p) => ({ ...p, defaultAmount: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction Category</label>
                        <div className="flex gap-2">
                            {isCustomFeeType ? (
                                <Input
                                    type="text"
                                    className="flex-1 h-11 font-black text-xs uppercase"
                                    placeholder="Enter Fee Type"
                                    value={customFeeType}
                                    onChange={(e) => setCustomFeeType(e.target.value)}
                                />
                            ) : (
                                <DropdownSelect
                                    value={formData.feeType}
                                    onChange={(v) => beginFeeTypeEdit(v)}
                                    options={DEFAULT_FEE_TYPES.map((t) => ({ value: t, label: t }))}
                                    clearable={false}
                                    className="flex-1 h-11 font-black text-xs uppercase"
                                />
                            )}

                            <Button
                                onClick={() => {
                                    if (isCustomFeeType) {
                                        setIsCustomFeeType(false);
                                        setCustomFeeType('');
                                        setFormData((p) => ({ ...p, feeType: 'Standard' }));
                                    } else {
                                        setIsCustomFeeType(true);
                                        setCustomFeeType('');
                                    }
                                }}
                                variant="neutral"
                                size="lg"
                                className="h-11 font-black text-[10px] uppercase tracking-widest"
                            >
                                {isCustomFeeType ? 'Use List' : 'Create'}
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            onClick={closeFormModal}
                            variant="neutral"
                            size="lg"
                            className="h-11 font-black text-[10px] uppercase tracking-widest"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={async () => {
                                const ok = await handleSave();
                                if (ok) closeFormModal();
                            }}
                            variant="primary"
                            size="lg"
                            className="h-11 font-black text-[10px] uppercase tracking-[0.2em]"
                        >
                            Save
                        </Button>
                    </div>
                </div>
            </Modal>

            <Card className="rounded-3xl shadow-xl">
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

                    rows={currentRows}
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
                    controlsProps={{
                        limit,
                        total,
                        onLimit: (v) => {
                            setLimit(v);
                            setPage(1);
                        },
                        className: 'px-6 bg-white',
                    }}
                    tableProps={{ shellClassName: 'rounded-none border-0 shadow-none ring-0' }}
                    renderCell={(cat, col) => {
                        switch (col.key) {
                            case 'name':
                                return (
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-10 bg-blue-600/20 rounded-full" />
                                        <span className="font-bold text-slate-900 text-base">{cat.name}</span>
                                    </div>
                                );
                            case 'defaultAmount':
                                return (
                                    <span className="font-black text-slate-900 text-lg tabular-nums">${Number(cat.defaultAmount).toLocaleString()}</span>
                                );
                            case 'feeType':
                                return (
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
                                return (
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
                    meta={{ page: safePage, totalPages, limit, total }}
                    onPage={setPage}
                    onLimit={(v) => { setLimit(v); setPage(1); }}
                    showRowsSelector={false}
                    paginationProps={{ className: 'no-print', infoVariant: 'page' }}
                />
            </Card>

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
