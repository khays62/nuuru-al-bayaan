import React, { useMemo, useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, Settings, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import {
    useCreateFinanceCategoryMutation,
    useDeleteFinanceCategoryMutation,
    useFinanceCategoriesQuery,
    useUpdateFinanceCategoryMutation,
} from '../hooks/financeConfigHooks';
import { useI18n } from '../../../i18n/useI18n';
import { useAuth } from '../../../auth/AuthContext';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import Card from '../../../shared/components/ui/Card.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';

const DEFAULT_FEE_TYPES = ['Standard', 'Mandatory', 'Registration', 'Graduation', 'Optional'];

function normalizeFeeType(value) {
    return String(value || '').trim();
}

export default function AmountTypeTab() {
    const { t } = useI18n();
    const { hasPermission } = useAuth();

    const canAdd = hasPermission('financeStudentAmountType', 'add');
    const canEdit = hasPermission('financeStudentAmountType', 'edit');
    const canDelete = hasPermission('financeStudentAmountType', 'delete');

    const categoriesQuery = useFinanceCategoriesQuery(
        { type: 'fee', includePreviousBalance: true, includeInactive: true },
        { staleTime: 30_000 }
    );
    const createMutation = useCreateFinanceCategoryMutation();
    const updateMutation = useUpdateFinanceCategoryMutation();
    const deleteMutation = useDeleteFinanceCategoryMutation();

    const isSaving = Boolean(createMutation.isPending || updateMutation.isPending);

    const categories = useMemo(
        () => (Array.isArray(categoriesQuery.data) ? categoriesQuery.data : []),
        [categoriesQuery.data]
    );
    // Only show skeleton on the initial load; keep rows visible on background refetch.
    const loading = Boolean(categoriesQuery.isLoading);

    // Edit/Create State
    const [editingId, setEditingId] = useState(null); // null = none, 'new' = creating
    const [formData, setFormData] = useState({
        name: '',
        type: 'fee',
        defaultAmount: 0,
        feeType: 'Standard', // Standard, Mandatory, Optional, etc.
        status: 'active'
    });

    const [isCustomFeeType, setIsCustomFeeType] = useState(false);
    const [customFeeType, setCustomFeeType] = useState('');
    const [extraFeeTypes, setExtraFeeTypes] = useState([]);

    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    function feeTypeLabel(ft) {
        const key = String(ft || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        return t(`finance.studentFinance.amountTypeTab.defaults.${key}`, { defaultValue: String(ft || '') });
    }

    const feeTypeOptions = useMemo(() => {
        const feeTypeLabelInner = (ft) => {
            const key = String(ft || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            return t(`finance.studentFinance.amountTypeTab.defaults.${key}`, { defaultValue: String(ft || '') });
        };

        const fromExisting = (Array.isArray(categories) ? categories : [])
            .map((c) => String(c?.feeType || '').trim())
            .filter(Boolean);

        const pendingCustom = normalizeFeeType(customFeeType);
        const merged = Array.from(new Set([
            ...DEFAULT_FEE_TYPES,
            ...fromExisting,
            ...(Array.isArray(extraFeeTypes) ? extraFeeTypes : []),
            ...(pendingCustom ? [pendingCustom] : []),
        ]));
        merged.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        return merged.map((ft) => ({ value: ft, label: feeTypeLabelInner(ft) }));
    }, [categories, customFeeType, extraFeeTypes, t]);

    useEffect(() => {
        if (!categoriesQuery.isError) return;
        toast.error(t('finance.studentFinance.amountTypeTab.toasts.loadFailed', { defaultValue: 'Failed to load fee configurations' }));
    }, [categoriesQuery.isError, t]);

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

    const beginFeeTypeEdit = (value) => {
        const normalized = normalizeFeeType(value) || 'Standard';
        const isDefault = DEFAULT_FEE_TYPES.includes(normalized);
        setIsCustomFeeType(!isDefault);
        setCustomFeeType(!isDefault ? normalized : '');
        setFormData(prev => ({ ...prev, feeType: normalized }));
    };

    const handleSave = async () => {
        const requiresAdd = editingId === 'new';
        if (requiresAdd && !canAdd) {
            toast.error(t('finance.studentFinance.amountTypeTab.toasts.noAddPermission', { defaultValue: 'You do not have permission to add amount types' }));
            return false;
        }
        if (!requiresAdd && !canEdit) {
            toast.error(t('finance.studentFinance.amountTypeTab.toasts.noEditPermission', { defaultValue: 'You do not have permission to edit amount types' }));
            return false;
        }

        if (!formData.name) {
            toast.error(t('finance.studentFinance.amountTypeTab.validation.nameRequired', { defaultValue: 'Name is required' }));
            return false;
        }

        const finalFeeType = isCustomFeeType ? normalizeFeeType(customFeeType) : normalizeFeeType(formData.feeType);
        if (!finalFeeType) {
            toast.error(t('finance.studentFinance.amountTypeTab.validation.feeTypeRequired', { defaultValue: 'Fee Type is required' }));
            return false;
        }

        const payload = {
            ...formData,
            feeType: finalFeeType,
        };

        try {
            if (editingId === 'new') {
                await createMutation.mutateAsync(payload);
                toast.success(t('finance.studentFinance.amountTypeTab.toasts.created', { defaultValue: 'Fee structure defined successfully' }));
            } else {
                await updateMutation.mutateAsync({ id: editingId, payload });
                toast.success(t('finance.studentFinance.amountTypeTab.toasts.updated', { defaultValue: 'Configuration synchronized' }));
            }
            setEditingId(null);
            setIsCustomFeeType(false);
            setCustomFeeType('');
            return true;
        } catch (e) {
            const msg = e?.data?.message || e?.response?.data?.message || e?.message;
            toast.error(msg || t('finance.studentFinance.amountTypeTab.toasts.operationFailed', { defaultValue: 'Process interrupted by server' }));
            return false;
        }
    };

    const closeFormModal = () => {
        setEditingId(null);
        setIsCustomFeeType(false);
        setCustomFeeType('');
        setExtraFeeTypes([]);
    };

    const startNew = () => {
        if (!canAdd) {
            toast.error(t('finance.studentFinance.amountTypeTab.toasts.noAddPermission', { defaultValue: 'You do not have permission to add amount types' }));
            return;
        }
        setEditingId('new');
        setFormData({ name: '', type: 'fee', defaultAmount: 0, feeType: 'Standard', status: 'active' });
        setIsCustomFeeType(false);
        setCustomFeeType('');
        setExtraFeeTypes([]);
    };

    const startEdit = (cat) => {
        if (!canEdit) {
            toast.error(t('finance.studentFinance.amountTypeTab.toasts.noEditPermission', { defaultValue: 'You do not have permission to edit amount types' }));
            return;
        }
        setEditingId(cat._id);
        const normalized = normalizeFeeType(cat.feeType) || 'Standard';
        setIsCustomFeeType(!DEFAULT_FEE_TYPES.includes(normalized));
        setCustomFeeType(!DEFAULT_FEE_TYPES.includes(normalized) ? normalized : '');
        setExtraFeeTypes([]);
        setFormData({
            name: cat.name,
            type: cat.type,
            defaultAmount: cat.defaultAmount,
            feeType: normalized,
            status: cat.status || 'active'
        });
    };

    const handleDelete = async (id) => {
        if (!canDelete) {
            toast.error(t('finance.studentFinance.amountTypeTab.toasts.noDeletePermission', { defaultValue: 'You do not have permission to delete amount types' }));
            return;
        }
        if (!window.confirm(t('finance.studentFinance.amountTypeTab.confirms.delete', { defaultValue: "Delete this Amount Type permanently? If it is already used in invoices/appointments, deletion will be blocked - set it Inactive instead." }))) return;
        try {
            const res = await deleteMutation.mutateAsync(id);
            toast.success(res?.message || t('finance.studentFinance.amountTypeTab.toasts.deleted', { defaultValue: 'Deleted successfully' }));
        } catch (e) {
            const msg = e?.data?.message || e?.response?.data?.message || e?.message;
            toast.error(msg || t('finance.studentFinance.amountTypeTab.toasts.deleteFailed', { defaultValue: 'Delete failed' }));
        }
    };

    return (
        <div className="space-y-4">
            <Card className="p-6 rounded-3xl shadow-xl no-print">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-600/20">
                            <Settings size={24} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter truncate">{t('finance.studentFinance.amountTypeTab.title', { defaultValue: 'Amount Configuration' })}</h3>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-1 truncate">{t('finance.studentFinance.amountTypeTab.subtitle', { defaultValue: 'Global Fee Definition Matrix' })}</p>
                        </div>
                    </div>

                    <Button
                        onClick={startNew}
                        variant="brand"
                        size="md"
                        icon={<Plus size={18} strokeWidth={3} />}
                        className="w-full sm:w-auto justify-center font-black text-xs uppercase tracking-widest"
                        disabled={!canAdd}
                        title={!canAdd ? t('finance.studentFinance.amountTypeTab.toasts.noAddPermission', { defaultValue: 'You do not have permission to add amount types' }) : undefined}
                    >
                        {t('finance.studentFinance.amountTypeTab.actions.defineNew', { defaultValue: 'Define New Amount Type' })}
                    </Button>
                </div>
            </Card>

            <Modal
                isOpen={editingId === 'new' || (typeof editingId === 'string' && editingId !== 'new')}
                onClose={closeFormModal}
                title={editingId === 'new' ? t('finance.studentFinance.amountTypeTab.modal.create', { defaultValue: 'Define New Amount Type' }) : t('finance.studentFinance.amountTypeTab.modal.edit', { defaultValue: 'Edit Amount Type' })}
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('finance.studentFinance.amountTypeTab.form.label.feeLabel', { defaultValue: 'Fee Label / Identity' })}</label>
                            <Input
                                type="text"
                                className="h-11 font-bold"
                                placeholder={t('finance.studentFinance.amountTypeTab.placeholders.feeLabel', { defaultValue: 'e.g. Monthly Tuition' })}
                                value={formData.name}
                                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('finance.studentFinance.amountTypeTab.form.label.defaultMultiplier', { defaultValue: 'Default Multiplier ($)' })}</label>
                            <Input
                                type="number"
                                className="h-11 font-black"
                                placeholder={t('finance.studentFinance.amountTypeTab.placeholders.defaultAmount', { defaultValue: '0.00' })}
                                value={formData.defaultAmount}
                                onChange={(e) => setFormData((p) => ({ ...p, defaultAmount: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('finance.studentFinance.amountTypeTab.form.label.status', { defaultValue: 'Status' })}</label>
                            <DropdownSelect
                                value={formData.status}
                                onChange={(v) => setFormData((p) => ({ ...p, status: v || 'active' }))}
                                options={[
                                    { value: 'active', label: t('common.status.active', { defaultValue: 'Active' }) },
                                    { value: 'inactive', label: t('common.status.inactive', { defaultValue: 'Inactive' }) },
                                ]}
                                clearable={false}
                                className="h-11 font-black text-xs uppercase"
                            />
                        </div>
                        <div />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('finance.studentFinance.amountTypeTab.form.label.transactionCategory', { defaultValue: 'Transaction Category' })}</label>
                        <div className="flex gap-2">
                            {isCustomFeeType ? (
                                    <Input
                                    type="text"
                                    className="flex-1 h-11 font-black text-xs uppercase"
                                    placeholder={t('finance.studentFinance.amountTypeTab.placeholders.enterFeeType', { defaultValue: 'Enter Fee Type' })}
                                    value={customFeeType}
                                    onChange={(e) => setCustomFeeType(e.target.value)}
                                />
                            ) : (
                                <DropdownSelect
                                    value={formData.feeType}
                                    onChange={(v) => beginFeeTypeEdit(v)}
                                    options={feeTypeOptions}
                                    clearable={false}
                                    className="flex-1 h-11 font-black text-xs uppercase"
                                />
                            )}

                                    <Button
                                onClick={() => {
                                    if (isCustomFeeType) {
                                        const pendingCustom = normalizeFeeType(customFeeType);
                                        if (pendingCustom) {
                                            setExtraFeeTypes((prev) => {
                                                const list = Array.isArray(prev) ? prev : [];
                                                if (list.includes(pendingCustom)) return list;
                                                return [...list, pendingCustom];
                                            });
                                        }
                                        setIsCustomFeeType(false);
                                        setCustomFeeType('');
                                        setFormData((p) => ({ ...p, feeType: pendingCustom || p.feeType || 'Standard' }));
                                    } else {
                                        setIsCustomFeeType(true);
                                        setCustomFeeType('');
                                    }
                                }}
                                variant="neutral"
                                size="lg"
                                className="h-11 font-black text-[10px] uppercase tracking-widest"
                            >
                                {isCustomFeeType ? t('finance.studentFinance.amountTypeTab.actions.useList', { defaultValue: 'Use List' }) : t('finance.studentFinance.amountTypeTab.actions.custom', { defaultValue: 'Custom' })}
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
                            {t('common.actions.cancel', { defaultValue: 'Cancel' })}
                        </Button>
                        <Button
                            onClick={async () => {
                                if (isSaving) return;
                                const ok = await handleSave();
                                if (ok) closeFormModal();
                            }}
                            variant="primary"
                            size="lg"
                            className="h-11 font-black text-[10px] uppercase tracking-[0.2em]"
                            disabled={isSaving}
                            icon={isSaving ? <Loader2 size={18} className="animate-spin" /> : undefined}
                        >
                            {isSaving ? t('common.saving', { defaultValue: 'Saving...' }) : t('common.actions.save', { defaultValue: 'Save' })}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Card className="rounded-3xl shadow-xl">
                <StandardTable
                    isLoading={loading}
                    error={null}
                    items={tableRows}
                    loadingMessage={t('finance.studentFinance.amountTypeTab.loading.initializing', { defaultValue: 'Initializing Data Stream...' })}
                    loadingVariant="table"
                    loadingRows={6}
                    loadingColumns={5}
                    emptyTitle={t('finance.studentFinance.amountTypeTab.table.emptyTitle', { defaultValue: 'No configurations detected.' })}
                    emptyDescription=""

                    rows={currentRows}
                    columns={[
                        { key: 'name', label: t('finance.studentFinance.amountTypeTab.table.columns.name', { defaultValue: 'Fee Identity' }), sortable: true, field: 'name' },
                        { key: 'defaultAmount', label: t('finance.studentFinance.amountTypeTab.table.columns.defaultAmount', { defaultValue: 'Default Amount' }), sortable: true, field: 'defaultAmount' },
                        { key: 'feeType', label: t('finance.studentFinance.amountTypeTab.table.columns.feeType', { defaultValue: 'Category Type' }), sortable: true, field: 'feeType' },
                        { key: 'status', label: t('finance.studentFinance.amountTypeTab.table.columns.status', { defaultValue: 'Status' }), sortable: true, field: 'status' },
                        { key: 'actions', label: t('finance.studentFinance.amountTypeTab.table.columns.actions', { defaultValue: 'Actions' }), sortable: false, align: 'right', noPrint: true, tdClassName: 'no-print' },
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
										{feeTypeLabel(cat.feeType || 'Standard')}
                                    </span>
                                );
                            case 'status':
                                return (
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${cat.status === 'active' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{cat.status === 'active' ? t('common.status.active', { defaultValue: 'Active' }) : t('common.status.inactive', { defaultValue: 'Inactive' })}</span>
                                    </div>
                                );
                            case 'actions':
                                {
                                    const actions = [];
                                    if (canEdit) {
                                        actions.push({
                                            key: 'edit',
                                            label: t('common.actions.edit', { defaultValue: 'Edit' }),
                                            title: t('common.actions.edit', { defaultValue: 'Edit' }),
                                            tone: 'edit',
                                            icon: <Edit size={18} />,
                                            onClick: () => startEdit(cat),
                                        });
                                    }
                                    if (canDelete) {
                                        actions.push({
                                            key: 'delete',
                                            label: t('common.actions.delete', { defaultValue: 'Delete' }),
                                            title: t('common.actions.delete', { defaultValue: 'Delete' }),
                                            tone: 'delete',
                                            icon: <Trash2 size={18} />,
                                            onClick: () => handleDelete(cat._id),
                                        });
                                    }
                                    return <RowActionButtons actions={actions} />;
                                }
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
                    <h4 className="text-white font-black uppercase tracking-widest text-xs mb-2">
                        {t('finance.studentFinance.amountTypeTab.integrity.title', { defaultValue: 'Architectural Integrity Constraint' })}
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-4xl">
                        {t('finance.studentFinance.amountTypeTab.integrity.description', { defaultValue: 'Modifying default amounts will only affect future charges. Historical records are cryptographically linked to the amount defined at the time of charge generation to ensure audit trail consistency across academic years.' })}
                    </p>
                </div>
            </div>
        </div>
    );
}
