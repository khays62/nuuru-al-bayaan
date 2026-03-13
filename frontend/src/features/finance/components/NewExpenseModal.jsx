import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import financeService from '../api/finance';
import { accountKeys, categoryKeys } from '../queryKeys';

import Modal from '../../../shared/components/ui/Modal.jsx';
import FormField from '../../../shared/components/ui/FormField.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Textarea from '../../../shared/components/ui/Textarea.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import Button from '../../../shared/components/ui/Button.jsx';

import { useI18n } from '../../../i18n/useI18n';

export default function NewExpenseModal({
    isOpen,
    onClose,
    onSuccess,
    selectedMonth,
    monthExpenses,
    mode = 'create',
    initialExpense,
    onSubmit,
    isSubmitting: isSubmittingProp,
}) {
    const { t } = useI18n();

    const getDefaultDateForSelectedMonth = (ym) => {
        const today = new Date();
        const pad2 = (n) => String(n).padStart(2, '0');
        const todayDay = today.getDate();

        if (!ym || !/^[0-9]{4}-[0-9]{2}$/.test(String(ym))) {
            return today.toISOString().slice(0, 10);
        }

        const [yStr, mStr] = String(ym).split('-');
        const year = Number(yStr);
        const monthIdx = Number(mStr) - 1;
        if (!Number.isFinite(year) || !Number.isFinite(monthIdx) || monthIdx < 0 || monthIdx > 11) {
            return today.toISOString().slice(0, 10);
        }

        const lastDay = new Date(year, monthIdx + 1, 0).getDate();
        const day = Math.min(Math.max(1, todayDay), lastDay);
        return `${year}-${pad2(monthIdx + 1)}-${pad2(day)}`;
    };

    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        categoryId: '',
        date: new Date().toISOString().slice(0, 10),
        description: '',
        accountId: '',
    });

    useEffect(() => {
        if (!isOpen) return;
        if (mode === 'edit' && initialExpense) {
            const exp = initialExpense;
            const expDate = exp?.date ? new Date(exp.date) : null;
            const isoDate = expDate && Number.isFinite(expDate.getTime()) ? expDate.toISOString().slice(0, 10) : getDefaultDateForSelectedMonth(selectedMonth);
            const catValue = exp?.categoryRef?._id || exp?.categoryRef || exp?.categoryId || exp?.category || '';
            const accountValue = exp?.account?._id || exp?.account || exp?.accountId || '';

            setFormData({
                title: String(exp?.title || ''),
                amount: String(exp?.amount ?? ''),
                categoryId: String(catValue || ''),
                date: isoDate,
                description: String(exp?.description || ''),
                accountId: String(accountValue || ''),
            });
            return;
        }

        setFormData({
            title: '',
            amount: '',
            categoryId: '',
            date: getDefaultDateForSelectedMonth(selectedMonth),
            description: '',
            accountId: '',
        });
    }, [isOpen, selectedMonth, mode, initialExpense]);

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

    const categoriesQuery = useQuery({
        queryKey: categoryKeys.list({ type: 'expense' }),
        enabled: Boolean(isOpen),
        queryFn: async ({ signal }) => {
            void signal;
            const res = await financeService.getFinanceCategories('expense');
            const list = Array.isArray(res) ? res : (res?.data || []);
            return Array.isArray(list) ? list : [];
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });

    const accountsQuery = useQuery({
        queryKey: accountKeys.list({ includeInactive: false }),
        enabled: Boolean(isOpen),
        queryFn: async ({ signal }) => {
            void signal;
            const res = await financeService.getAccounts({ includeInactive: false });
            const list = Array.isArray(res) ? res : (res?.data || []);
            return Array.isArray(list) ? list : [];
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });

    const createExpenseMutation = useMutation({
        mutationFn: (payload) => financeService.createExpense(payload),
    });

    const categoriesOptions = useMemo(() => {
        const list = Array.isArray(categoriesQuery.data) ? categoriesQuery.data : [];
        return list
            .filter((c) => c && (c?._id || c?.name))
            .map((c) => ({ value: String(c._id || c.name), label: String(c.name || '') }));
    }, [categoriesQuery.data]);

    const selectedCategory = useMemo(() => {
        const list = Array.isArray(categoriesQuery.data) ? categoriesQuery.data : [];
        const picked = String(formData.categoryId || '');
        if (!picked) return null;
        return list.find((c) => String(c?._id || c?.name || '') === picked) || null;
    }, [categoriesQuery.data, formData.categoryId]);

    const budgetInfo = useMemo(() => {
        const budget = Number(selectedCategory?.budget || 0);
        const hasBudget = Number.isFinite(budget) && budget > 0;
        const catName = String(selectedCategory?.name || '').trim();
        const list = Array.isArray(monthExpenses) ? monthExpenses : [];
        const spent = !catName ? 0 : list.reduce((sum, e) => sum + (String(e?.category || '').trim() === catName ? Number(e?.amount || 0) : 0), 0);
        const over = hasBudget && spent > budget;
        const remaining = hasBudget ? Math.max(0, budget - spent) : 0;
        return { hasBudget, budget, spent, remaining, over, catName };
    }, [selectedCategory, monthExpenses]);

    const accountsOptions = useMemo(() => {
        const list = Array.isArray(accountsQuery.data) ? accountsQuery.data : [];
        return list
            .filter((a) => a && a?._id)
            .map((a) => ({
                value: String(a._id),
                label: `${a.name} (${a.type})${a.accountNumber ? ` - ${a.accountNumber}` : ''}`,
            }));
    }, [accountsQuery.data]);

    const isSubmitting = Boolean(isSubmittingProp ?? createExpenseMutation.isPending);

    const handleSubmit = async (e) => {
        if (e?.preventDefault) e.preventDefault();

        const pickedCategory = String(formData.categoryId || '');
        const looksLikeObjectId = /^[a-fA-F0-9]{24}$/.test(pickedCategory);

        const payload = {
            title: String(formData.title || '').trim(),
            amount: formData.amount,
            categoryId: looksLikeObjectId ? pickedCategory : undefined,
            category: looksLikeObjectId ? undefined : pickedCategory,
            accountId: String(formData.accountId || ''),
            date: formData.date,
            description: formData.description,
        };

        try {
            if (typeof onSubmit === 'function') {
                await onSubmit(payload);
            } else {
                await createExpenseMutation.mutateAsync(payload);
            }
            onSuccess?.();
            onClose?.();
        } catch (error) {
            toast.error(getFinanceExpensesErrorText(error, 'finance.expenses.toasts.createFailed', 'Expense recording failed'));
        }
    };

    return (
        <Modal
            isOpen={Boolean(isOpen)}
            onClose={onClose}
            title={
                mode === 'edit'
                    ? t('finance.expenses.modals.editTitle', { defaultValue: 'Edit Expense' })
                    : t('finance.expenses.modals.createTitle', { defaultValue: 'Record New Expense' })
            }
            panelClassName="max-w-md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormField label={t('finance.expenses.fields.title', { defaultValue: 'Expense Title' })} required>
                    <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder={t('finance.expenses.placeholders.title', { defaultValue: 'e.g. Electricity Bill' })}
                        required
                        disabled={isSubmitting}
                    />
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                    <FormField label={t('finance.expenses.fields.amountUsd', { defaultValue: 'Amount (USD)' })} required>
                        <Input
                            type="number"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            placeholder={t('finance.expenses.placeholders.amount', { defaultValue: '0.00' })}
                            required
                            min="0"
                            step="0.01"
                            disabled={isSubmitting}
                        />
                    </FormField>
                    <FormField label={t('finance.expenses.fields.date', { defaultValue: 'Date' })} required>
                        <Input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            required
                            disabled={isSubmitting}
                        />
                    </FormField>
                </div>

                <FormField label={t('finance.expenses.fields.category', { defaultValue: 'Category' })} required>
                    <DropdownSelect
                        value={formData.categoryId}
                        onChange={(v) => setFormData({ ...formData, categoryId: v })}
                        placeholder={t('finance.expenses.placeholders.category', { defaultValue: 'Select categoryâ€¦' })}
                        options={categoriesOptions}
                        disabled={isSubmitting || categoriesQuery.isLoading}
                        clearable={false}
                    />
                </FormField>

                {selectedCategory ? (
                    <div className="rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg) p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs font-semibold text-(--nb-color-fg)">
                                {t('finance.expenses.budgetInfo.title', { defaultValue: 'Budget info' })}
                            </div>
                            {selectedMonth ? (
                                <div className="text-[10px] font-black uppercase tracking-widest text-(--nb-color-muted)">
                                    {t('finance.expenses.budgetInfo.month', { defaultValue: 'Month: {{month}}', month: selectedMonth })}
                                </div>
                            ) : null}
                        </div>

                        <div className="mt-2 grid grid-cols-3 gap-2">
                            <div className="rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg-card) px-3 py-2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-(--nb-color-muted)">
                                    {t('finance.expenses.budgetInfo.budget', { defaultValue: 'Budget' })}
                                </div>
                                <div className="text-sm font-black text-(--nb-color-fg)">
                                    {budgetInfo.hasBudget ? `$${Number(budgetInfo.budget || 0).toLocaleString()}` : t('finance.expenses.categories.noBudget', { defaultValue: '-' })}
                                </div>
                            </div>
                            <div className="rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg-card) px-3 py-2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-(--nb-color-muted)">
                                    {t('finance.expenses.budgetInfo.spent', { defaultValue: 'Spent' })}
                                </div>
                                <div className={'text-sm font-black ' + (budgetInfo.over ? 'text-red-600' : 'text-(--nb-color-fg)')}>
                                    ${Number(budgetInfo.spent || 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg-card) px-3 py-2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-(--nb-color-muted)">
                                    {t('finance.expenses.budgetInfo.remaining', { defaultValue: 'Remaining' })}
                                </div>
                                <div className={'text-sm font-black ' + (budgetInfo.over ? 'text-red-600' : 'text-(--nb-color-fg)')}>
                                    {budgetInfo.hasBudget ? `$${Number(budgetInfo.remaining || 0).toLocaleString()}` : t('finance.expenses.categories.noBudget', { defaultValue: '-' })}
                                </div>
                            </div>
                        </div>

                        {budgetInfo.hasBudget && budgetInfo.over ? (
                            <div className="mt-2 text-xs font-semibold text-red-600">
                                {t('finance.expenses.categories.overBudget', { defaultValue: 'Over budget' })}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <FormField label={t('finance.expenses.fields.payingAccount', { defaultValue: 'Paying Account' })} required>
                    <DropdownSelect
                        value={formData.accountId}
                        onChange={(v) => setFormData({ ...formData, accountId: v })}
                        placeholder={t('finance.expenses.placeholders.account', { defaultValue: 'Select accountâ€¦' })}
                        options={accountsOptions}
                        disabled={isSubmitting || accountsQuery.isLoading}
                        clearable={false}
                    />
                </FormField>

                <FormField label={t('finance.expenses.fields.description', { defaultValue: 'Description' })}>
                    <Textarea
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder={t('finance.expenses.placeholders.description', { defaultValue: 'Additional detailsâ€¦' })}
                        disabled={isSubmitting}
                    />
                </FormField>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="neutral" onClick={onClose} disabled={isSubmitting}>
                        {t('common.actions.cancel', { defaultValue: 'Cancel' })}
                    </Button>
                    <Button
                        type="submit"
                        variant="brand"
                        disabled={
                            isSubmitting ||
                            !String(formData.title || '').trim() ||
                            !String(formData.amount || '') ||
                            !String(formData.categoryId || '') ||
                            !String(formData.accountId || '') ||
                            !String(formData.date || '')
                        }
                    >
                        {isSubmitting
                            ? t('common.working', { defaultValue: 'WORKINGâ€¦' })
                            : mode === 'edit'
                                ? t('common.actions.save', { defaultValue: 'Save' })
                                : t('finance.expenses.actions.recordExpense', { defaultValue: 'Record Expense' })}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
