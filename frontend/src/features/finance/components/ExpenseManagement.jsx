import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, FileText, Tags, Printer, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

import financeService from '../api/finance';
import { listExpenses as listExpensesApi, deleteExpense as deleteExpenseApi, updateExpense as updateExpenseApi } from '../api/expensesApi';
import { expenseKeys, categoryKeys } from '../queryKeys';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import Tabs from '../../attendance/components/Tabs.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import FormField from '../../../shared/components/ui/FormField.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import PdfDownloadButton from '../../../shared/components/exports/downloadButtons/PdfDownloadButton.jsx';
import ExcelDownloadButton from '../../../shared/components/exports/downloadButtons/ExcelDownloadButton.jsx';
import CsvDownloadButton from '../../../shared/components/exports/downloadButtons/CsvDownloadButton.jsx';
import CopyTableButton from '../../../shared/components/exports/downloadButtons/CopyTableButton.jsx';
import headerImg from '../../../assets/nuuruBayaanHeader.png';

import PrintHeader from '../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../shared/components/print/PrintFooter.jsx';

import NewExpenseModal from './NewExpenseModal';

import { useI18n } from '../../../i18n/I18nProvider.jsx';
import { useAuth } from '../../../auth/AuthContext';

export default function ExpenseManagement() {
    const { t } = useI18n();
    const { hasPermission } = useAuth();

    const canAddExpense = hasPermission('financeExpenses', 'add');
    const canEditExpense = hasPermission('financeExpenses', 'edit');
    const canDeleteExpense = hasPermission('financeExpenses', 'delete');
    const canDownloadExpenses = hasPermission('financeExpenses', 'download');
    const canPrint = hasPermission('financePrint', 'print');

    const canViewConfig = hasPermission('financeConfig', 'view');
    const canAddCategory = hasPermission('financeConfig', 'add');
    const canEditCategory = hasPermission('financeConfig', 'edit');
    const canDeleteCategory = hasPermission('financeConfig', 'delete');

    const [expandedSection, setExpandedSection] = useState('ledger');

    useEffect(() => {
        if (expandedSection !== 'categories') return;
        if (canViewConfig) return;
        setExpandedSection('ledger');
    }, [expandedSection, canViewConfig]);

    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${d.getFullYear()}-${m}`;
    });

    const [sortBy, setSortBy] = useState('date');
    const [sortDir, setSortDir] = useState('desc');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const [staffNameById, setStaffNameById] = useState({});

    const [showModal, setShowModal] = useState(false);
    const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryBudget, setNewCategoryBudget] = useState('');

    const [editingCategory, setEditingCategory] = useState(null); // { _id, name, budget }
    const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);

    const queryClient = useQueryClient();

    const monthRange = useMemo(() => {
        if (!selectedMonth || !/^[0-9]{4}-[0-9]{2}$/.test(selectedMonth)) return null;
        const [yStr, mStr] = selectedMonth.split('-');
        const year = Number(yStr);
        const monthIdx = Number(mStr) - 1;
        if (!Number.isFinite(year) || !Number.isFinite(monthIdx) || monthIdx < 0 || monthIdx > 11) return null;
        const lastDay = new Date(year, monthIdx + 1, 0).getDate();
        const from = `${selectedMonth}-01`;
        const to = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
        return { from, to };
    }, [selectedMonth]);

    const expensesQuery = useQuery({
        queryKey: expenseKeys.list({ from: monthRange?.from, to: monthRange?.to }),
        enabled: expandedSection === 'ledger' || expandedSection === 'categories',
        queryFn: async ({ signal }) => {
            const res = await listExpensesApi({ from: monthRange?.from, to: monthRange?.to }, { signal });
            const list = Array.isArray(res) ? res : (res?.rows || res?.data || []);
            return Array.isArray(list) ? list : [];
        },
        placeholderData: (prev) => prev,
        staleTime: 30_000,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
    });

    const categoriesQuery = useQuery({
        queryKey: categoryKeys.list({ type: 'expense' }),
        enabled: expandedSection === 'categories',
        queryFn: async ({ signal }) => {
            // financeService methods don't accept signal; use api axios directly is heavier.
            // We'll keep it simple and rely on React Query cancellation semantics here.
            void signal;
            const res = await financeService.getFinanceCategories('expense');
            const list = Array.isArray(res) ? res : (res?.data || []);
            return Array.isArray(list) ? list : [];
        },
        placeholderData: (prev) => prev,
        staleTime: 30_000,
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
    });

    const getFinanceExpensesErrorText = (error, fallbackKey, fallbackDefaultValue) => {
        const code = error?.response?.data?.code;
        const serverMessage = error?.response?.data?.message;

        if (code) {
            return t(`finance.expenses.apiErrors.${code}`, {
                defaultValue: serverMessage || fallbackDefaultValue,
            });
        }

        if (serverMessage) return serverMessage;

        return t(fallbackKey, { defaultValue: fallbackDefaultValue });
    };

    const deleteExpenseMutation = useMutation({
        mutationFn: (id) => deleteExpenseApi(id),
        onSuccess: () => {
            toast.success(t('finance.expenses.toasts.deleted', { defaultValue: 'Expense deleted' }));
            try {
                queryClient.invalidateQueries({ queryKey: expenseKeys.listBase, refetchType: 'active' });
            } catch { /* ignore */ }
        },
        onError: (error) => {
            toast.error(getFinanceExpensesErrorText(error, 'finance.expenses.toasts.deleteFailed', 'Delete failed'));
        },
    });

    const updateExpenseMutation = useMutation({
        mutationFn: ({ id, payload }) => updateExpenseApi(id, payload),
        onSuccess: () => {
            toast.success(t('finance.expenses.toasts.updated', { defaultValue: 'Expense updated' }));
            try {
                queryClient.invalidateQueries({ queryKey: expenseKeys.listBase, refetchType: 'active' });
            } catch { /* ignore */ }
        },
        onError: (error) => {
            toast.error(getFinanceExpensesErrorText(error, 'finance.expenses.toasts.updateFailed', 'Update failed'));
        },
    });

    const createCategoryMutation = useMutation({
        mutationFn: (payload) => financeService.createFinanceCategory(payload),
        onSuccess: () => {
            toast.success(t('finance.expenses.toasts.categoryCreated', { defaultValue: 'Category created' }));
            setNewCategoryName('');
            setNewCategoryBudget('');
            try {
                queryClient.invalidateQueries({ queryKey: categoryKeys.listBase, refetchType: 'active' });
            } catch { /* ignore */ }
        },
        onError: (error) => {
            toast.error(getFinanceExpensesErrorText(error, 'finance.expenses.toasts.categoryCreateFailed', 'Failed to create category'));
        },
    });

    const updateCategoryMutation = useMutation({
        mutationFn: ({ id, payload }) => financeService.updateFinanceCategory(id, payload),
        onSuccess: () => {
            toast.success(t('finance.expenses.toasts.categoryUpdated', { defaultValue: 'Category updated' }));
            try {
                queryClient.invalidateQueries({ queryKey: categoryKeys.listBase, refetchType: 'active' });
            } catch { /* ignore */ }
        },
        onError: (error) => {
            toast.error(getFinanceExpensesErrorText(error, 'finance.expenses.toasts.categoryUpdateFailed', 'Failed to update category'));
        },
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: (id) => financeService.deleteFinanceCategory(id),
        onSuccess: () => {
            toast.success(t('finance.expenses.toasts.categoryDeleted', { defaultValue: 'Category archived' }));
            try {
                queryClient.invalidateQueries({ queryKey: categoryKeys.listBase, refetchType: 'active' });
            } catch { /* ignore */ }
        },
        onError: (error) => {
            toast.error(getFinanceExpensesErrorText(error, 'finance.expenses.toasts.categoryDeleteFailed', 'Failed to archive category'));
        },
    });

    const expenses = expensesQuery.data || [];
    const categories = categoriesQuery.data || [];

    const totalExpenses = useMemo(
        () => (expenses || []).reduce((sum, e) => sum + Number(e?.amount || 0), 0),
        [expenses]
    );

    const sortedItems = useMemo(() => {
        const arr = Array.isArray(expenses) ? [...expenses] : [];
        const dir = sortDir === 'asc' ? 1 : -1;
        const key = sortBy;
        arr.sort((a, b) => {
            if (key === 'date') {
                const ta = new Date(a?.date || 0).getTime();
                const tb = new Date(b?.date || 0).getTime();
                if (ta < tb) return -1 * dir;
                if (ta > tb) return 1 * dir;
                return 0;
            }
            if (key === 'amount') {
                const va = Number(a?.amount || 0);
                const vb = Number(b?.amount || 0);
                if (va < vb) return -1 * dir;
                if (va > vb) return 1 * dir;
                return 0;
            }
            const va = String(a?.[key] || '').toLowerCase();
            const vb = String(b?.[key] || '').toLowerCase();
            if (va < vb) return -1 * dir;
            if (va > vb) return 1 * dir;
            return 0;
        });
        return arr;
    }, [expenses, sortBy, sortDir]);

    // Keep page in range if total shrinks
    useEffect(() => {
        const total = sortedItems.length;
        const tp = total <= 0 ? 1 : (limit >= total ? 1 : Math.ceil(total / limit));
        if (page > tp) setPage(tp);
    }, [sortedItems.length, limit, page]);

    const total = sortedItems.length;
    const totalPages = total <= 0 ? 1 : (limit >= total ? 1 : Math.ceil(total / limit));
    const currentRows = useMemo(() => {
        if (!Array.isArray(sortedItems)) return [];
        if (total <= 0) return [];
        if (limit >= total) return sortedItems;
        const start = (Math.max(1, page) - 1) * limit;
        return sortedItems.slice(start, start + limit);
    }, [sortedItems, page, limit, total]);

    useEffect(() => {
        // no-op: categories are now fetched via React Query
    }, []);

    useEffect(() => {
        if (expandedSection !== 'ledger') return;
        const ids = new Set();
        for (const e of sortedItems || []) {
            const text = `${e?.title || ''}\n${e?.description || ''}`;
            const matches = text.matchAll(/staff\s*ID\s*:\s*([a-f0-9]{24})/gi);
            for (const m of matches) {
                if (m?.[1]) ids.add(String(m[1]));
            }
        }
        const missing = Array.from(ids).filter((id) => !staffNameById[id]);
        if (missing.length === 0) return;

        let cancelled = false;
        (async () => {
            try {
                const results = await Promise.all(
                    missing.map(async (id) => {
                        try {
                            const data = await financeService.getUserById(id);
                            const user = data?.data || data;
                            const label = String(user?.name || user?.fullName || user?.username || user?.email || id);
                            return [id, label];
                        } catch {
                            return [id, null];
                        }
                    })
                );
                if (cancelled) return;
                setStaffNameById((prev) => {
                    const next = { ...prev };
                    for (const [id, label] of results) {
                        if (label) next[id] = label;
                    }
                    return next;
                });
            } catch {
                // ignore
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [expandedSection, sortedItems, staffNameById]);

    const renderDescription = (desc) => {
        const text = String(desc || '');
        if (!text) return '';
        return text.replace(/staff\s*ID\s*:\s*([a-f0-9]{24})/gi, (match, id) => {
            const name = staffNameById?.[String(id)];
            if (!name) return match;
            return `staff: ${name}`;
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('finance.expenses.confirms.delete', { defaultValue: 'Are you sure? This cannot be undone.' }))) return;
        try {
            await deleteExpenseMutation.mutateAsync(id);
        } catch {
            // onError already shows a toast; prevent unhandled promise rejection noise
        }
    };

    const openEditExpense = (row) => {
        if (!canEditExpense) return;
        if (!row?._id) return;
        setEditingExpense(row);
        setShowEditExpenseModal(true);
    };

    const onSort = (field) => {
        if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else {
            setSortBy(field);
            setSortDir('asc');
        }
    };

    const isLoading = Boolean(expensesQuery.isLoading && expensesQuery.data == null);
    const hasExportData = Boolean(!isLoading && Array.isArray(sortedItems) && sortedItems.length > 0);
    const canExport = Boolean(hasExportData && canDownloadExpenses);
    const canPrintExport = Boolean(hasExportData && canPrint);
    const buildExportPayload = useCallback(async () => {
        if (!canExport) return null;

        const STORAGE_KEY = 'finance:expenses:columns:v1';
        let visible = {};
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') visible = parsed;
            }
        } catch { /* ignore */ }
        const isVisible = (key) => visible?.[String(key)] !== false;

        const dtf = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
        const cols = [
            { key: 'date', label: t('finance.expenses.columns.date', { defaultValue: 'Date' }), get: (e) => (e?.date ? dtf.format(new Date(e.date)) : '') },
            { key: 'category', label: t('finance.expenses.columns.category', { defaultValue: 'Category' }), get: (e) => String(e?.category || '') },
            { key: 'title', label: t('finance.expenses.columns.title', { defaultValue: 'Title' }), get: (e) => String(e?.title || '') },
            { key: 'description', label: t('finance.expenses.columns.description', { defaultValue: 'Description' }), get: (e) => String(renderDescription(e?.description || '')) },
            { key: 'amount', label: t('finance.expenses.columns.amount', { defaultValue: 'Amount' }), get: (e) => Number(e?.amount || 0) },
            {
                key: 'auditor',
                label: t('finance.expenses.columns.auditor', { defaultValue: 'Auditor' }),
                get: (e) => String(e?.approvedBy?.fullName || e?.approvedBy?.name || ''),
            },
        ].filter((c) => isVisible(c.key));

        const headers = cols.map((c) => c.label);
        const rows = (sortedItems || []).map((e) => cols.map((c) => c.get(e)));

        const subtitleParts = [
            selectedMonth ? t('finance.expenses.export.month', { defaultValue: 'Month: {{month}}', month: selectedMonth }) : null,
        ].filter(Boolean);

        return {
            filename: `expenses-${selectedMonth || 'all'}`,
            sheetName: 'Expenses',
            title: t('finance.expenses.export.title', { defaultValue: 'Expenses' }),
            subtitle: subtitleParts.join(' • '),
            headerImageSrc: headerImg,
            headers,
            rows,
        };
    }, [canExport, sortedItems, selectedMonth, renderDescription, t]);

    const handleCreateCategory = async () => {
        const trimmed = String(newCategoryName || '').trim();
        if (!trimmed) {
            toast.error(t('finance.expenses.toasts.categoryNameRequired', { defaultValue: 'Category name is required' }));
            return;
        }
        const budgetNum = newCategoryBudget === '' ? undefined : Number(newCategoryBudget);
        if (budgetNum !== undefined && (!Number.isFinite(budgetNum) || budgetNum < 0)) {
            toast.error(t('finance.expenses.toasts.budgetInvalid', { defaultValue: 'Budget must be a valid number' }));
            return;
        }

        try {
            await createCategoryMutation.mutateAsync({ name: trimmed, type: 'expense', budget: budgetNum });
        } catch {
            // onError already shows a toast
        }
    };

    const handleDeleteCategory = async (cat) => {
        if (!cat?._id) return;
        const catName = String(cat?.name || '').trim();
        const usedCount = (expenses || []).reduce((sum, e) => sum + (String(e?.category || '').trim() === catName ? 1 : 0), 0);
        if (usedCount > 0) {
            toast.error(t('finance.expenses.apiErrors.FIN_CATEGORY_IN_USE', { defaultValue: 'Category is already used in expenses' }));
            return;
        }
        if (!window.confirm(t('finance.expenses.confirms.deleteCategory', { defaultValue: 'Archive this category? It will no longer appear in new expenses.' }))) return;
        try {
            await deleteCategoryMutation.mutateAsync(cat._id);
        } catch {
            // toast handled
        }
    };

    const openEditCategory = (cat) => {
        if (!cat?._id) return;
        const catName = String(cat?.name || '').trim();
        const inUse = (expenses || []).some((e) => String(e?.category || '').trim() === catName);
        setEditingCategory({
            _id: cat._id,
            name: String(cat?.name || ''),
            budget: cat?.budget ?? 0,
            originalName: String(cat?.name || ''),
            inUse,
        });
        setShowEditCategoryModal(true);
    };

    const handleSaveCategory = async (e) => {
        if (e?.preventDefault) e.preventDefault();
        if (!editingCategory?._id) return;
        const name = String(editingCategory?.name || '').trim();
        if (!name) {
            toast.error(t('finance.expenses.toasts.categoryNameRequired', { defaultValue: 'Category name is required' }));
            return;
        }
        if (editingCategory?.inUse && String(editingCategory?.originalName || '').trim() !== name) {
            toast.error(t('finance.expenses.apiErrors.FIN_CATEGORY_IN_USE', { defaultValue: 'Category is already used in expenses' }));
            return;
        }
        const budget = Number(editingCategory?.budget ?? 0);
        if (!Number.isFinite(budget) || budget < 0) {
            toast.error(t('finance.expenses.toasts.budgetInvalid', { defaultValue: 'Budget must be a valid number' }));
            return;
        }

        try {
            await updateCategoryMutation.mutateAsync({ id: editingCategory._id, payload: { name, budget } });
            setShowEditCategoryModal(false);
            setEditingCategory(null);
        } catch {
            // onError already shows a toast
        }
    };

    const renderTabs = () => (
        <div className="mb-8 no-print">
            <Tabs
                value={expandedSection}
                onChange={setExpandedSection}
                tone="blue"
                options={[
                    {
                        value: 'ledger',
                        label: (
                            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                <FileText size={14} />
                                {t('finance.expenses.tabs.ledger', { defaultValue: 'Expense Ledger' })}
                            </span>
                        ),
                    },
                    canViewConfig ? {
                        value: 'categories',
                        label: (
                            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                <Tags size={14} />
                                {t('finance.expenses.tabs.categories', { defaultValue: 'Expense Categories' })}
                            </span>
                        ),
                    } : null,
                ].filter(Boolean)}
            />
        </div>
    );

    return (
        <div className="space-y-6 print-no-space with-print-header with-print-footer">
            <PrintHeader />
            <PrintFooter left={t('common.generatedBy', { defaultValue: 'Generated by Nuuru Al-Bayaan' })} />
            {renderTabs()}

            <div className="min-h-150">
                {expandedSection === 'ledger' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-(--nb-color-bg-card) rounded-3xl border border-(--nb-color-border) shadow-(--nb-shadow-md) p-6 flex flex-wrap items-center justify-between gap-4 no-print">
                            <div className="min-w-0">
                                <h4 className="text-xl font-black text-(--nb-color-fg) uppercase tracking-tighter truncate">{t('finance.expenses.ledger.title', { defaultValue: 'Expense Ledger' })}</h4>
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2">
                                    <div>
                                        <p className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest leading-none mb-1">{t('finance.expenses.ledger.kpiSpend', { defaultValue: 'Periodic Spend' })}</p>
                                        <p className="text-2xl font-black text-(--nb-color-fg) tracking-tight">${Number(totalExpenses || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="hidden sm:block h-10 w-px bg-(--nb-color-border)" />
                                    <div>
                                        <p className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest leading-none mb-1">{t('finance.expenses.ledger.kpiRecords', { defaultValue: 'Approved Audit Records' })}</p>
                                        <p className="text-2xl font-black text-blue-600 tracking-tight">{expenses.length}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="shrink-0 flex flex-wrap items-center gap-2">
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="h-10 px-3 bg-(--nb-color-bg-card) border border-(--nb-color-border) rounded-(--nb-radius-md) text-sm text-(--nb-color-fg) shadow-(--nb-shadow-sm) outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nb-color-brand) focus-visible:ring-offset-2"
                                    aria-label={t('finance.expenses.ledger.monthAria', { defaultValue: 'Select month' })}
                                />

                                {canAddExpense ? (
                                    <ActionButton
                                        variant="brand"
                                        icon={<Plus size={16} />}
                                        onClick={() => setShowModal(true)}
                                    >
                                        {t('finance.expenses.actions.newExpense', { defaultValue: 'Record New Expense' })}
                                    </ActionButton>
                                ) : null}

                                {canPrint ? (
                                    <ActionButton
                                        variant="outline"
                                        icon={<Printer size={16} />}
                                        disabled={!canPrintExport}
                                        onClick={() => { if (canPrintExport) setTimeout(() => window.print(), 0); }}
                                        title={t('common.actions.print', { defaultValue: 'Print' })}
                                    >
                                        {t('common.actions.print', { defaultValue: 'Print' })}
                                    </ActionButton>
                                ) : null}

                                {canDownloadExpenses ? (
                                    <>
                                        <PdfDownloadButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
                                        <ExcelDownloadButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
                                        <CsvDownloadButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
                                        <CopyTableButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
                                    </>
                                ) : null}
                            </div>
                        </div>

                        <div className="bg-(--nb-color-bg-card) rounded-3xl border border-(--nb-color-border) shadow-(--nb-shadow-md) print-container print-fit-wide">
                            <StandardTable
                            isLoading={isLoading}
                            error={expensesQuery.isError ? (expensesQuery.error?.data?.message || expensesQuery.error?.message || t('finance.expenses.toasts.loadFailed', { defaultValue: 'Failed to load expenses' })) : null}
                            items={sortedItems}
                            loadingMessage={t('finance.expenses.ledger.loading', { defaultValue: 'Loading expenses…' })}
                            loadingVariant="table"
                            loadingRows={6}
                            loadingColumns={7}
                            emptyTitle={t('finance.expenses.ledger.emptyTitle', { defaultValue: 'No expense records found.' })}
                            emptyDescription=""

                            rows={currentRows}
                            columns={[
                                { key: 'date', label: t('finance.expenses.columns.date', { defaultValue: 'Date' }), sortable: true, field: 'date' },
                                { key: 'category', label: t('finance.expenses.columns.category', { defaultValue: 'Category' }), sortable: true, field: 'category' },
                                { key: 'title', label: t('finance.expenses.columns.title', { defaultValue: 'Title' }), sortable: true, field: 'title' },
                                { key: 'description', label: t('finance.expenses.columns.description', { defaultValue: 'Description' }), sortable: false, field: 'description' },
                                { key: 'amount', label: t('finance.expenses.columns.amount', { defaultValue: 'Amount' }), sortable: true, field: 'amount' },
                                { key: 'auditor', label: t('finance.expenses.columns.auditor', { defaultValue: 'Auditor' }), sortable: false, field: 'auditor' },
                                { key: 'actions', label: t('common.columns.actions', { defaultValue: 'Actions' }), align: 'right', noPrint: true, tdClassName: 'no-print' },
                            ]}
                            storageKey="finance:expenses:columns:v1"
                                controlsProps={{
                                limit,
                                total,
                                onLimit: (v) => {
                                    setLimit(v);
                                    setPage(1);
                                },
                                    className: 'px-8 bg-(--nb-color-bg-card)',
                            }}
                            sortBy={sortBy}
                            sortDir={sortDir}
                            onSort={onSort}
                            getRowKey={(row) => row?._id || row?.id}
                            renderCell={(row, col) => {
                                switch (col.key) {
                                    case 'date':
                                        return row?.date ? new Date(row.date).toLocaleDateString() : '—';
                                    case 'category':
                                        return String(row?.category || '—');
                                    case 'title':
                                        return String(row?.title || '—');
                                    case 'description':
                                        return row?.description ? renderDescription(row.description) : '';
                                    case 'amount':
                                        return `$${Number(row?.amount || 0).toLocaleString()}`;
                                    case 'auditor':
                                        return row?.approvedBy?.fullName || row?.approvedBy?.name || '—';
                                    case 'actions':
                                        return (
                                            <RowActionButtons
                                                actions={[
                                                    canEditExpense ? {
                                                        key: 'edit',
                                                        label: t('common.actions.edit', { defaultValue: 'Edit' }),
                                                        title: t('common.actions.edit', { defaultValue: 'Edit' }),
                                                        tone: 'edit',
                                                        icon: <Pencil size={16} />,
                                                        disabled: updateExpenseMutation.isPending,
                                                        onClick: () => openEditExpense(row),
                                                    } : null,
                                                    canDeleteExpense ? {
                                                        key: 'delete',
                                                        label: t('common.actions.delete', { defaultValue: 'Delete' }),
                                                        title: t('common.actions.delete', { defaultValue: 'Delete' }),
                                                        tone: 'delete',
                                                        icon: <Trash2 size={16} />,
                                                        onClick: () => handleDelete(row?._id),
                                                    } : null,
                                                ].filter(Boolean)}
                                            />
                                        );
                                    default:
                                        return '';
                                }
                            }}
                            meta={{ page, totalPages, limit, total }}
                            onPage={setPage}
                            onLimit={(v) => { setLimit(v); setPage(1); }}
                            showRowsSelector={false}
                            paginationProps={{ className: 'no-print', infoVariant: 'page' }}
                            />
                        </div>
                    </div>
                )}

                {expandedSection === 'categories' && canViewConfig && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-(--nb-color-bg-card) rounded-3xl border border-(--nb-color-border) shadow-(--nb-shadow-md) p-6 flex flex-wrap items-center justify-between gap-4 no-print">
                            <div className="min-w-0">
                                <h4 className="text-xl font-black text-(--nb-color-fg) uppercase tracking-tighter truncate">{t('finance.expenses.categories.title', { defaultValue: 'Expense Categories' })}</h4>
                                <p className="text-[10px] text-(--nb-color-muted) font-bold uppercase tracking-widest mt-1 truncate">
                                    {t('finance.expenses.categories.count', { defaultValue: '{{count}} categories', count: categories.length })}
                                </p>
                            </div>

                            {canAddCategory ? (
                                <div className="shrink-0 flex flex-wrap gap-2 items-center">
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder={t('finance.expenses.categories.newPlaceholder', { defaultValue: 'New category name' })}
                                        className="h-10 w-64 px-3 bg-(--nb-color-bg-card) border border-(--nb-color-border) rounded-(--nb-radius-md) text-sm text-(--nb-color-fg) shadow-(--nb-shadow-sm) outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nb-color-brand) focus-visible:ring-offset-2"
                                    />
                                    <input
                                        type="number"
                                        value={newCategoryBudget}
                                        onChange={(e) => setNewCategoryBudget(e.target.value)}
                                        placeholder={t('finance.expenses.categories.budgetPlaceholder', { defaultValue: 'Budget (optional)' })}
                                        className="h-10 w-44 px-3 bg-(--nb-color-bg-card) border border-(--nb-color-border) rounded-(--nb-radius-md) text-sm text-(--nb-color-fg) shadow-(--nb-shadow-sm) outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nb-color-brand) focus-visible:ring-offset-2"
                                        min="0"
                                        step="0.01"
                                    />
                                    <ActionButton
                                        type="button"
                                        variant="brand"
                                        onClick={handleCreateCategory}
                                        disabled={createCategoryMutation.isPending}
                                    >
                                        {createCategoryMutation.isPending
                                            ? t('common.working', { defaultValue: 'WORKING…' })
                                            : t('finance.expenses.actions.createCategory', { defaultValue: 'Create Category' })}
                                    </ActionButton>
                                </div>
                            ) : null}
                        </div>

                        <div className="bg-(--nb-color-bg-card) rounded-3xl border border-(--nb-color-border) shadow-(--nb-shadow-md) p-6">
                            {categoriesQuery.isLoading && categoriesQuery.data == null ? (
                                <div className="py-16 text-center text-(--nb-color-muted) font-bold uppercase tracking-widest italic">
                                    {t('finance.expenses.categories.loading', { defaultValue: 'Loading categories…' })}
                                </div>
                            ) : categories.length === 0 ? (
                                <div className="py-16 text-center">
                                    <span className="text-[10px] text-(--nb-color-muted) font-black uppercase tracking-widest">{t('finance.expenses.categories.empty', { defaultValue: 'No categories yet' })}</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {categories.map((c) => {
                                        const catName = String(c?.name || '').trim();
                                        const spent = (expenses || []).reduce((sum, e) => sum + (String(e?.category || '').trim() === catName ? Number(e?.amount || 0) : 0), 0);
                                        const count = (expenses || []).reduce((sum, e) => sum + (String(e?.category || '').trim() === catName ? 1 : 0), 0);
                                        const budget = Number(c?.budget || 0);
                                        const hasBudget = Number.isFinite(budget) && budget > 0;
                                        const over = hasBudget && spent > budget;
                                        const remaining = hasBudget ? Math.max(0, budget - spent) : 0;

                                        return (
                                            <div
                                                key={c?._id}
                                                className={
                                                                        'group relative bg-(--nb-color-bg-card) p-6 rounded-3xl border shadow-(--nb-shadow-md) ' +
                                                                        'border-(--nb-color-border) transition-all duration-200 ease-out ' +
                                                                        'hover:-translate-y-0.5 hover:border-blue-600/40 hover:shadow-(--nb-shadow-md)'
                                                }
                                            >
                                                <div className="flex justify-between items-start gap-3 mb-5">
                                                    <div className="min-w-0">
                                                                <p className="text-lg font-black text-(--nb-color-fg) truncate">{catName || '—'}</p>
                                                        <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-1 truncate">
                                                            {selectedMonth
                                                                ? t('finance.expenses.categories.monthTag', { defaultValue: 'Month: {{month}}', month: selectedMonth })
                                                                : t('finance.expenses.categories.typeExpense', { defaultValue: 'Type: Expense' })}
                                                        </p>
                                                    </div>

                                                    <div className="shrink-0 flex justify-end">
                                                        <RowActionButtons
                                                            actions={[
                                                                canEditCategory ? {
                                                                    key: 'edit',
                                                                    label: t('common.actions.edit', { defaultValue: 'Edit' }),
                                                                    title: t('common.actions.edit', { defaultValue: 'Edit' }),
                                                                    tone: 'edit',
                                                                    icon: <Pencil size={16} />,
                                                                    disabled: updateCategoryMutation.isPending,
                                                                    onClick: () => openEditCategory(c),
                                                                } : null,
                                                                canDeleteCategory ? {
                                                                    key: 'delete',
                                                                    label: t('common.actions.delete', { defaultValue: 'Delete' }),
                                                                    title: t('common.actions.delete', { defaultValue: 'Delete' }),
                                                                    tone: 'delete',
                                                                    icon: <Trash2 size={16} />,
                                                                    disabled: deleteCategoryMutation.isPending || count > 0,
                                                                    onClick: () => handleDeleteCategory(c),
                                                                } : null,
                                                            ].filter(Boolean)}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                            <div className="bg-(--nb-color-bg) rounded-2xl p-4 border border-(--nb-color-border) shadow-(--nb-shadow-sm)">
                                                                <p className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest">{t('finance.expenses.categories.spent', { defaultValue: 'Spent' })}</p>
                                                                <p className={"mt-1 text-2xl font-black tracking-tighter " + (over ? 'text-red-600' : 'text-(--nb-color-fg)')}>
                                                            ${Number(spent || 0).toLocaleString()}
                                                        </p>
                                                                <p className="text-[10px] text-(--nb-color-muted) font-bold uppercase tracking-widest mt-1">
                                                            {t('finance.expenses.categories.records', { defaultValue: '{{count}} records', count })}
                                                        </p>
                                                    </div>

                                                            <div className="bg-(--nb-color-bg) rounded-2xl p-4 border border-(--nb-color-border) shadow-(--nb-shadow-sm)">
                                                                <p className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest">{t('finance.expenses.categories.budget', { defaultValue: 'Budget' })}</p>
                                                                <p className="mt-1 text-2xl font-black text-(--nb-color-fg) tracking-tighter">
                                                            {hasBudget ? `$${Number(budget || 0).toLocaleString()}` : t('finance.expenses.categories.noBudget', { defaultValue: '—' })}
                                                        </p>
                                                        {hasBudget ? (
                                                                    <p className={"text-[10px] font-bold uppercase tracking-widest mt-1 " + (over ? 'text-red-600' : 'text-(--nb-color-muted)')}>
                                                                {over
                                                                    ? t('finance.expenses.categories.overBudget', { defaultValue: 'Over budget' })
                                                                    : t('finance.expenses.categories.remaining', { defaultValue: 'Remaining: ${{value}}', value: Number(remaining || 0).toLocaleString() })}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {canEditCategory ? (
                <Modal
                    isOpen={showEditCategoryModal}
                    onClose={() => { setShowEditCategoryModal(false); setEditingCategory(null); }}
                    title={t('finance.expenses.categories.editTitle', { defaultValue: 'Edit Category' })}
                    panelClassName="max-w-md"
                >
                    <form onSubmit={handleSaveCategory} className="space-y-4">
                        <FormField
                            label={t('finance.expenses.categories.fields.name', { defaultValue: 'Name' })}
                            required
                            hint={
                                editingCategory?.inUse
                                    ? t('finance.expenses.categories.renameLockedHint', { defaultValue: 'This category already has recorded expenses. Renaming is locked.' })
                                    : undefined
                            }
                        >
                            <Input
                                value={editingCategory?.name || ''}
                                onChange={(e) => setEditingCategory((prev) => ({ ...(prev || {}), name: e.target.value }))}
                                placeholder={t('finance.expenses.categories.newPlaceholder', { defaultValue: 'New category name' })}
                                required
                                disabled={Boolean(editingCategory?.inUse) || updateCategoryMutation.isPending}
                            />
                        </FormField>

                        <FormField label={t('finance.expenses.categories.fields.budget', { defaultValue: 'Budget' })}>
                            <Input
                                type="number"
                                value={String(editingCategory?.budget ?? '')}
                                onChange={(e) => setEditingCategory((prev) => ({ ...(prev || {}), budget: e.target.value }))}
                                placeholder={t('finance.expenses.categories.budgetPlaceholder', { defaultValue: 'Budget (optional)' })}
                                min="0"
                                step="0.01"
                            />
                        </FormField>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="neutral" onClick={() => { setShowEditCategoryModal(false); setEditingCategory(null); }} disabled={updateCategoryMutation.isPending}>
                                {t('common.actions.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" variant="brand" disabled={updateCategoryMutation.isPending}>
                                {updateCategoryMutation.isPending ? t('common.working', { defaultValue: 'WORKING…' }) : t('common.actions.save', { defaultValue: 'Save' })}
                            </Button>
                        </div>
                    </form>
                </Modal>
            ) : null}

            {showModal && canAddExpense && (
                <NewExpenseModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    selectedMonth={selectedMonth}
                    monthExpenses={expenses}
                    onSuccess={() => {
                        try {
                            queryClient.invalidateQueries({ queryKey: expenseKeys.listBase, refetchType: 'active' });
                        } catch { /* ignore */ }
                        toast.success(t('finance.expenses.toasts.created', { defaultValue: 'Expense recorded successfully' }));
                    }}
                />
            )}

            {showEditExpenseModal && canEditExpense && (
                <NewExpenseModal
                    mode="edit"
                    initialExpense={editingExpense}
                    isOpen={showEditExpenseModal}
                    isSubmitting={updateExpenseMutation.isPending}
                    onClose={() => { setShowEditExpenseModal(false); setEditingExpense(null); }}
                    selectedMonth={selectedMonth}
                    monthExpenses={expenses}
                    onSubmit={(payload) => updateExpenseMutation.mutateAsync({ id: editingExpense?._id, payload })}
                    onSuccess={() => {
                        setShowEditExpenseModal(false);
                        setEditingExpense(null);
                    }}
                />
            )}
        </div>
    );
}
