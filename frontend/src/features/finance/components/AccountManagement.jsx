import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ArrowRightLeft, Building, DollarSign, History, TrendingUp, Trash2, Pencil, Printer } from 'lucide-react';
import axios from '../api/axios';
import toast from 'react-hot-toast';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import Tabs from '../../attendance/components/Tabs.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import FormField from '../../../shared/components/ui/FormField.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import PdfDownloadButton from '../../../shared/components/exports/downloadButtons/PdfDownloadButton.jsx';
import ExcelDownloadButton from '../../../shared/components/exports/downloadButtons/ExcelDownloadButton.jsx';
import CsvDownloadButton from '../../../shared/components/exports/downloadButtons/CsvDownloadButton.jsx';
import CopyTableButton from '../../../shared/components/exports/downloadButtons/CopyTableButton.jsx';
import headerImg from '../../../assets/nuuruBayaanHeader.png';

import PrintHeader from '../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../shared/components/print/PrintFooter.jsx';

import { listAccounts as listAccountsApi, createAccount as createAccountApi, updateAccount as updateAccountApi, deleteAccount as deleteAccountApi, transferFunds as transferFundsApi, recordIncome as recordIncomeApi } from '../api/accountsApi';
import { accountKeys } from '../queryKeys';

import { useI18n } from '../../../i18n/I18nProvider.jsx';

export default function AccountManagement() {
    const { t } = useI18n();

    const getAccountTypeLabel = useCallback((raw) => {
        const v = String(raw || '');
        if (v === 'Bank') return t('finance.accounts.options.accountType.bank', { defaultValue: 'Bank' });
        if (v === 'Cash') return t('finance.accounts.options.accountType.cash', { defaultValue: 'Cash' });
        if (v === 'Mobile Money') return t('finance.accounts.options.accountType.mobileMoney', { defaultValue: 'Mobile Money' });
        return v || '—';
    }, [t]);

    const [expandedSection, setExpandedSection] = useState('list');
    const [ledgerSortBy, setLedgerSortBy] = useState('createdAt');
    const [ledgerSortDir, setLedgerSortDir] = useState('desc');
    const [ledgerPage, setLedgerPage] = useState(1);
    const [ledgerLimit, setLedgerLimit] = useState(10);

    // Modals
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showIncomeModal, setShowIncomeModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const [deletingAccountId, setDeletingAccountId] = useState(null);

    // Form States
    const [newAccount, setNewAccount] = useState({ name: '', institution: '', accountNumber: '', balance: 0, branch: 'Main', type: 'Bank' });
    const [editingAccount, setEditingAccount] = useState(null);
    const [transferData, setTransferData] = useState({ fromAccountId: '', toAccountId: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
    const [incomeData, setIncomeData] = useState({ incomeName: '', comment: '', receivedNumber: '', amount: '', accountId: '', date: new Date().toISOString().split('T')[0] });

    const queryClient = useQueryClient();

    const accountsQuery = useQuery({
        queryKey: accountKeys.list({ includeInactive: true }),
        queryFn: async ({ signal }) => {
            const res = await listAccountsApi({ includeInactive: true }, { signal });
            return Array.isArray(res) ? res : [];
        },
        placeholderData: (prev) => prev,
        staleTime: 30_000,
        // App default is refetchOnMount: false; finance wants a mount refetch so
        // moving from Payroll -> Accounts shows latest balances without reload.
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
    });

    const ledgerQuery = useQuery({
        queryKey: ['finance', 'audit', 'accounts'],
        enabled: expandedSection === 'ledger',
        queryFn: async ({ signal }) => {
            const response = await axios.get('/finance/audit', { params: { q: 'account' }, signal });
            const payload = response.data;
            const rows = Array.isArray(payload)
                ? payload
                : (Array.isArray(payload?.data) ? payload.data : []);
            return Array.isArray(rows) ? rows : [];
        },
        placeholderData: (prev) => prev,
        staleTime: 10_000,
        refetchOnWindowFocus: false,
    });

    const accounts = accountsQuery.data || [];
    const ledgerLogs = ledgerQuery.data || [];

    const getFinanceAccountsErrorText = (error, fallbackKey, fallbackDefaultValue) => {
        const code = error?.response?.data?.code;
        const serverMessage = error?.response?.data?.message;

        if (code) {
            return t(`finance.accounts.apiErrors.${code}`, {
                defaultValue: serverMessage || fallbackDefaultValue,
            });
        }

        if (serverMessage) return serverMessage;

        return t(fallbackKey, { defaultValue: fallbackDefaultValue });
    };

    const createAccountMutation = useMutation({
        mutationFn: (payload) => createAccountApi(payload),
        onSuccess: () => {
            toast.success(t('finance.accounts.toasts.created', { defaultValue: 'Account created successfully' }));
            try {
                queryClient.invalidateQueries({ queryKey: accountKeys.listBase, refetchType: 'active' });
            } catch { /* ignore */ }
            try {
                queryClient.invalidateQueries({ queryKey: ['finance', 'audit', 'accounts'], refetchType: 'active' });
            } catch { /* ignore */ }
        },
        onError: (error) => {
            toast.error(getFinanceAccountsErrorText(error, 'finance.accounts.toasts.createFailed', 'Failed to create account'));
        },
    });

    const updateAccountMutation = useMutation({
        mutationFn: ({ id, payload }) => updateAccountApi(id, payload),
        onSuccess: () => {
            toast.success(t('finance.accounts.toasts.updated', { defaultValue: 'Account updated successfully' }));
            try {
                queryClient.invalidateQueries({ queryKey: accountKeys.listBase, refetchType: 'active' });
            } catch { /* ignore */ }
        },
        onError: (error) => {
            toast.error(getFinanceAccountsErrorText(error, 'finance.accounts.toasts.updateFailed', 'Failed to update account'));
        },
    });

    const deleteAccountMutation = useMutation({
        mutationFn: (id) => deleteAccountApi(id),
        onSuccess: () => {
            toast.success(t('finance.accounts.toasts.deleted', { defaultValue: 'Account deleted successfully' }));
            try {
                queryClient.invalidateQueries({ queryKey: accountKeys.listBase, refetchType: 'active' });
            } catch { /* ignore */ }
            try {
                queryClient.invalidateQueries({ queryKey: ['finance', 'audit', 'accounts'], refetchType: 'active' });
            } catch { /* ignore */ }
        },
        onError: (error) => {
            toast.error(getFinanceAccountsErrorText(error, 'finance.accounts.toasts.deleteFailed', 'Failed to delete account'));
        },
    });

    const recordIncomeMutation = useMutation({
        mutationFn: (payload) => recordIncomeApi(payload),
        onSuccess: () => {
            toast.success(t('finance.accounts.toasts.incomeRecorded', { defaultValue: 'Income recorded successfully' }));
            try {
                queryClient.invalidateQueries({ queryKey: accountKeys.listBase, refetchType: 'active' });
            } catch { /* ignore */ }
            try {
                queryClient.invalidateQueries({ queryKey: ['finance', 'audit', 'accounts'], refetchType: 'active' });
            } catch { /* ignore */ }
        },
        onError: (error) => {
            toast.error(getFinanceAccountsErrorText(error, 'finance.accounts.toasts.incomeFailed', 'Recording failed'));
        },
    });

    const transferFundsMutation = useMutation({
        mutationFn: (payload) => transferFundsApi(payload),
        onSuccess: () => {
            toast.success(t('finance.accounts.toasts.transferSuccess', { defaultValue: 'Funds transferred successfully' }));
            try {
                queryClient.invalidateQueries({ queryKey: accountKeys.listBase, refetchType: 'active' });
            } catch { /* ignore */ }
            try {
                queryClient.invalidateQueries({ queryKey: ['finance', 'audit', 'accounts'], refetchType: 'active' });
            } catch { /* ignore */ }
        },
        onError: (error) => {
            toast.error(getFinanceAccountsErrorText(error, 'finance.accounts.toasts.transferFailed', 'Transfer failed'));
        },
    });

    const handleDeleteAccount = async (acc) => {
        const id = acc?._id;
        if (!id) return;

        const balance = Number(acc?.balance || 0);
        if (!Number.isFinite(balance) || balance !== 0) {
            toast.error(t('finance.accounts.toasts.deleteBlockedBalance', { defaultValue: 'Cannot delete an account with a non-zero balance' }));
            return;
        }

        const ok = window.confirm(
            t('finance.accounts.confirms.delete', {
                defaultValue: 'Delete this account? This cannot be undone.'
            })
        );
        if (!ok) return;

        try {
            setDeletingAccountId(String(id));
            await deleteAccountMutation.mutateAsync(String(id));
        } catch {
            // toast is already handled in mutation onError
        } finally {
            setDeletingAccountId(null);
        }
    };

    const isCreating = Boolean(createAccountMutation?.isPending ?? createAccountMutation?.isLoading);
    const isUpdating = Boolean(updateAccountMutation?.isPending ?? updateAccountMutation?.isLoading);
    const isDeleting = Boolean(deleteAccountMutation?.isPending ?? deleteAccountMutation?.isLoading);
    const isTransferring = Boolean(transferFundsMutation?.isPending ?? transferFundsMutation?.isLoading);
    const isRecordingIncome = Boolean(recordIncomeMutation?.isPending ?? recordIncomeMutation?.isLoading);

    const activeAccounts = useMemo(
        () => accounts.filter((a) => a.status !== 'inactive'),
        [accounts]
    );

    useEffect(() => {
        // If an account becomes inactive (or deleted), clear it from selections.
        const activeIds = new Set(activeAccounts.map((a) => String(a._id)));

        setTransferData((prev) => {
            let changed = false;
            let nextFromAccountId = prev.fromAccountId;
            let nextToAccountId = prev.toAccountId;

            if (nextFromAccountId && !activeIds.has(String(nextFromAccountId))) {
                nextFromAccountId = '';
                changed = true;
            }
            if (nextToAccountId && !activeIds.has(String(nextToAccountId))) {
                nextToAccountId = '';
                changed = true;
            }

            if (!changed) return prev;
            return { ...prev, fromAccountId: nextFromAccountId, toAccountId: nextToAccountId };
        });

        setIncomeData((prev) => {
            if (!prev.accountId) return prev;
            if (activeIds.has(String(prev.accountId))) return prev;
            return { ...prev, accountId: '' };
        });
    }, [activeAccounts]);

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        try {
            await createAccountMutation.mutateAsync(newAccount);
            setShowCreateModal(false);
            setNewAccount({ name: '', institution: '', accountNumber: '', balance: 0, branch: 'Main', type: 'Bank' });
        } catch {
            // toast is already handled in mutation onError
        }
    };

    const handleEditAccount = async (e) => {
        e.preventDefault();
        if (!editingAccount?._id) return;
        const payload = {
            name: editingAccount.name,
            type: editingAccount.type,
            status: editingAccount.status,
            institution: editingAccount.institution,
            branch: editingAccount.branch,
            accountNumber: editingAccount.accountNumber,
            // Balance edits are intentionally not exposed here
        };
        try {
            await updateAccountMutation.mutateAsync({ id: editingAccount._id, payload });
            setShowEditModal(false);
            setEditingAccount(null);
        } catch {
            // toast is already handled in mutation onError
        }
    };

    const handleRecordIncome = async (e) => {
        e.preventDefault();
        try {
            await recordIncomeMutation.mutateAsync(incomeData);
            setShowIncomeModal(false);
            setIncomeData({ incomeName: '', comment: '', receivedNumber: '', amount: '', accountId: '', date: new Date().toISOString().split('T')[0] });
        } catch {
            // toast is already handled in mutation onError
        }
    };

    const handleTransfer = async (e) => {
        e.preventDefault();
        try {
            await transferFundsMutation.mutateAsync(transferData);
            setShowTransferModal(false);
            setTransferData({ fromAccountId: '', toAccountId: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
        } catch {
            // toast is already handled in mutation onError
        }
    };

    const ledgerSortedItems = useMemo(() => {
        const arr = Array.isArray(ledgerLogs) ? [...ledgerLogs] : [];
        const dir = ledgerSortDir === 'asc' ? 1 : -1;
        arr.sort((a, b) => {
            const ta = new Date(a?.createdAt || 0).getTime();
            const tb = new Date(b?.createdAt || 0).getTime();
            if (ta < tb) return -1 * dir;
            if (ta > tb) return 1 * dir;
            return 0;
        });
        return arr;
    }, [ledgerLogs, ledgerSortDir]);

    useEffect(() => {
        const total = ledgerSortedItems.length;
        const tp = total <= 0 ? 1 : (ledgerLimit >= total ? 1 : Math.ceil(total / ledgerLimit));
        if (ledgerPage > tp) setLedgerPage(tp);
    }, [ledgerSortedItems.length, ledgerLimit, ledgerPage]);

    const ledgerTotal = ledgerSortedItems.length;
    const ledgerTotalPages = ledgerTotal <= 0 ? 1 : (ledgerLimit >= ledgerTotal ? 1 : Math.ceil(ledgerTotal / ledgerLimit));
    const ledgerCurrentRows = useMemo(() => {
        if (!Array.isArray(ledgerSortedItems)) return [];
        if (ledgerTotal <= 0) return [];
        if (ledgerLimit >= ledgerTotal) return ledgerSortedItems;
        const start = (Math.max(1, ledgerPage) - 1) * ledgerLimit;
        return ledgerSortedItems.slice(start, start + ledgerLimit);
    }, [ledgerSortedItems, ledgerPage, ledgerLimit, ledgerTotal]);

    const onLedgerSort = (field) => {
        if (field !== 'createdAt') return;
        if (ledgerSortBy === field) setLedgerSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else {
            setLedgerSortBy(field);
            setLedgerSortDir('asc');
        }
    };

    const ledgerIsLoading = Boolean(ledgerQuery.isLoading && ledgerQuery.data == null);
    const ledgerCanExport = Boolean(!ledgerIsLoading && Array.isArray(ledgerSortedItems) && ledgerSortedItems.length > 0);
    const buildLedgerExportPayload = useCallback(async () => {
        if (!ledgerCanExport) return null;

        const STORAGE_KEY = 'finance:accounts:ledger:columns:v1';
        let visible = {};
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') visible = parsed;
            }
        } catch { /* ignore */ }
        const isVisible = (key) => visible?.[String(key)] !== false;

        const dtf = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        const cols = [
            { key: 'createdAt', label: t('finance.accounts.ledger.export.columns.date', { defaultValue: 'Date' }), get: (l) => (l?.createdAt ? dtf.format(new Date(l.createdAt)) : '') },
            { key: 'targetModel', label: t('finance.accounts.ledger.export.columns.domain', { defaultValue: 'Domain' }), get: (l) => String(l?.targetModel || '') },
            { key: 'action', label: t('finance.accounts.ledger.export.columns.operation', { defaultValue: 'Operation' }), get: (l) => String(l?.action || '') },
            { key: 'user', label: t('finance.accounts.ledger.export.columns.user', { defaultValue: 'User' }), get: (l) => String(l?.user?.username || t('finance.accounts.ledger.export.systemUser', { defaultValue: 'SYSTEM' })) },
            { key: 'description', label: t('finance.accounts.ledger.export.columns.context', { defaultValue: 'Context' }), get: (l) => String(l?.description || '') },
        ].filter((c) => isVisible(c.key));

        const headers = cols.map((c) => c.label);
        const rows = (ledgerSortedItems || []).map((l) => cols.map((c) => c.get(l)));

        return {
            filename: 'accounts-ledger',
            sheetName: 'Ledger',
            title: '',
            subtitle: t('finance.accounts.ledger.title', { defaultValue: 'General Ledger History' }),
            headerImageSrc: headerImg,
            headers,
            rows,
        };
    }, [ledgerCanExport, ledgerSortedItems, t]);

    const renderTabs = () => (
        <div className="mb-8 no-print">
            <Tabs
                value={expandedSection}
                onChange={setExpandedSection}
                tone="blue"
                options={[
                    {
                        value: 'list',
                        label: (
                            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                <Building size={14} />
                                {t('finance.accounts.tabs.institutionAccounts', { defaultValue: 'Institution Accounts' })}
                            </span>
                        )
                    },
                    {
                        value: 'overview',
                        label: (
                            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                <TrendingUp size={14} />
                                {t('finance.accounts.tabs.balanceOverview', { defaultValue: 'Balance Overview & Projects' })}
                            </span>
                        )
                    },
                    {
                        value: 'ledger',
                        label: (
                            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                <History size={14} />
                                {t('finance.accounts.tabs.ledgerHistory', { defaultValue: 'General Ledger History' })}
                            </span>
                        )
                    },
                ]}
            />
        </div>
    );

    return (
        <div className="space-y-6 print-no-space with-print-header with-print-footer">
            <PrintHeader />
            <PrintFooter left={t('common.generatedBy', { defaultValue: 'Generated by Nuuru Al-Bayaan' })} />
            {renderTabs()}

            <div className="min-h-150">
                {/* 1. Account List & Actions */}
                {expandedSection === 'list' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{t('finance.accounts.sections.institutionAccounts', { defaultValue: 'Institution Accounts' })}</h3>
                                <p className="text-xs text-slate-400 font-medium font-mono uppercase tracking-widest mt-1">{t('finance.accounts.sections.institutionAccountsSubtitle', { defaultValue: 'Real-time liquidity management' })}</p>
                            </div>
                            <div className="flex gap-2">
                                <ActionButton
                                    variant="neutral"
                                    icon={<ArrowRightLeft size={16} />}
                                    onClick={() => setShowTransferModal(true)}
                                    disabled={isTransferring || isRecordingIncome || isCreating || isUpdating || isDeleting}
                                >
                                    {t('common.actions.transfer', { defaultValue: 'Transfer' })}
                                </ActionButton>
                                <ActionButton
                                    variant="neutral"
                                    icon={<DollarSign size={16} />}
                                    onClick={() => setShowIncomeModal(true)}
                                    disabled={isTransferring || isRecordingIncome || isCreating || isUpdating || isDeleting}
                                >
                                    {t('finance.accounts.actions.income', { defaultValue: 'Income' })}
                                </ActionButton>
                                <ActionButton
                                    variant="brand"
                                    icon={<Plus size={16} />}
                                    onClick={() => setShowCreateModal(true)}
                                    disabled={isTransferring || isRecordingIncome || isCreating || isUpdating || isDeleting}
                                >
                                    {t('finance.accounts.actions.newAccount', { defaultValue: 'New Account' })}
                                </ActionButton>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {accounts.map((acc) => (
                                <div key={acc._id} className="group relative bg-white p-7 rounded-3xl border border-slate-200 hover:border-blue-600/40 transition-all hover:shadow-2xl hover:shadow-blue-600/5">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-blue-600/5 transition-colors">
                                            <Building className="text-slate-400 group-hover:text-blue-600 transition-colors" size={24} />
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest
                                                ${acc.type === 'Bank' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                                {getAccountTypeLabel(acc.type)}
                                            </span>
                                            <span className={`ml-2 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest
                                                ${acc.status === 'inactive' ? 'bg-slate-100 text-slate-500' : 'bg-green-50 text-green-600'}`}>
                                                {acc.status === 'inactive'
                                                    ? t('common.status.inactive', { defaultValue: 'Inactive' })
                                                    : t('common.status.active', { defaultValue: 'Active' })}
                                            </span>
                                            <div className="mt-2 flex justify-end">
                                                <RowActionButtons
                                                    actions={[
                                                        {
                                                            key: 'edit',
                                                            label: t('common.actions.edit', { defaultValue: 'Edit' }),
                                                            title: t('common.actions.edit', { defaultValue: 'Edit' }),
                                                            tone: 'edit',
                                                            icon: <Pencil size={16} />,
                                                            disabled: isUpdating || isDeleting,
                                                            onClick: () => {
                                                                setEditingAccount({
                                                                    _id: acc._id,
                                                                    name: acc.name || '',
                                                                    type: acc.type || 'Bank',
                                                                    status: acc.status || 'active',
                                                                    institution: acc.institution || '',
                                                                    branch: acc.branch || 'Main',
                                                                    accountNumber: acc.accountNumber || '',
                                                                });
                                                                setShowEditModal(true);
                                                            },
                                                        },
                                                        {
                                                            key: 'delete',
                                                            label: t('common.actions.delete', { defaultValue: 'Delete' }),
                                                            title: t('common.actions.delete', { defaultValue: 'Delete' }),
                                                            tone: 'delete',
                                                            icon: <Trash2 size={16} />,
                                                            disabled: isDeleting || deletingAccountId === String(acc._id),
                                                            onClick: () => handleDeleteAccount(acc),
                                                        },
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1 mb-6">
                                        <h3 className="font-bold text-xl text-slate-900 truncate tracking-tight">{acc.name}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{acc.institution || '—'} {acc.branch ? `• ${acc.branch}` : ''}</p>
                                        <p className="font-mono text-[10px] text-slate-400 uppercase tracking-tighter">{t('finance.accounts.cards.refPrefix', { defaultValue: 'REF' })}: {acc.accountNumber}</p>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">{t('finance.accounts.cards.availableUsd', { defaultValue: 'Available USD' })}</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-black text-slate-900 tracking-tighter">${acc.balance?.toLocaleString()}</span>
                                            <span className="text-xs font-bold text-green-600">.00</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. Balance Overview */}
                {expandedSection === 'overview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-gray-900 rounded-[3rem] p-16 text-center shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-blue-600/20 transition-all duration-700" />
                            <div className="relative z-10 max-w-lg mx-auto">
                                <div className="w-24 h-24 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center mx-auto mb-8 text-blue-600 shadow-inner">
                                    <TrendingUp size={48} className="animate-pulse" />
                                </div>
                                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-4">{t('finance.accounts.overview.kicker', { defaultValue: 'Master Financial Overview' })}</h4>
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-6 leading-none">{t('finance.accounts.overview.title', { defaultValue: 'Total Aggregated Liquidity' })}</h2>
                                <div className="flex items-center justify-center gap-3 mb-8">
                                    <span className="text-7xl font-black text-white tracking-tighter">
                                        ${accounts.reduce((sum, a) => sum + (a.balance || 0), 0).toLocaleString()}
                                    </span>
                                    <span className="text-xl font-bold text-slate-400">{t('finance.accounts.overview.currency', { defaultValue: 'USD' })}</span>
                                </div>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                                    <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                        {t('finance.accounts.overview.verifiedFrom', {
                                            defaultValue: 'Verified from {{count}} linked accounts',
                                            count: accounts.length,
                                        })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Ledger History */}
                {expandedSection === 'ledger' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-4">
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 flex items-center justify-between gap-4 no-print">
                                <div className="min-w-0">
                                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter truncate">{t('finance.accounts.ledger.title', { defaultValue: 'General Ledger History' })}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 truncate">{t('finance.accounts.ledger.subtitle', { defaultValue: 'Immutable transaction audit stream' })}</p>
                                </div>

                                <div className="shrink-0 flex items-center gap-2">
                                    <ActionButton
                                        variant="outline"
                                        icon={<Printer size={16} />}
                                        disabled={!ledgerCanExport}
                                        onClick={() => { if (ledgerCanExport) setTimeout(() => window.print(), 0); }}
                                        title={t('common.actions.print', { defaultValue: 'Print' })}
                                    >
                                        {t('common.actions.print', { defaultValue: 'Print' })}
                                    </ActionButton>
                                    <PdfDownloadButton getPayload={buildLedgerExportPayload} disabled={!ledgerCanExport} variant="outline" />
                                    <ExcelDownloadButton getPayload={buildLedgerExportPayload} disabled={!ledgerCanExport} variant="outline" />
                                    <CsvDownloadButton getPayload={buildLedgerExportPayload} disabled={!ledgerCanExport} variant="outline" />
                                    <CopyTableButton getPayload={buildLedgerExportPayload} disabled={!ledgerCanExport} variant="outline" />
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl print-container print-fit-wide">
                                <StandardTable
                                isLoading={ledgerIsLoading}
                                error={ledgerQuery.isError ? (ledgerQuery.error?.data?.message || ledgerQuery.error?.message || t('finance.accounts.ledger.loadFailed', { defaultValue: 'Failed to load ledger' })) : null}
                                items={ledgerSortedItems}
                                loadingMessage={t('finance.accounts.ledger.loading', { defaultValue: 'Loading ledger…' })}
                                loadingVariant="table"
                                loadingRows={6}
                                loadingColumns={5}
                                emptyTitle={t('finance.accounts.ledger.emptyTitle', { defaultValue: 'No ledger records found.' })}
                                emptyDescription=""

                                rows={ledgerCurrentRows}
                                columns={[
                                    { key: 'createdAt', label: t('finance.accounts.ledger.columns.date', { defaultValue: 'Audit Pulse / Date' }), sortable: true, field: 'createdAt' },
                                    { key: 'targetModel', label: t('finance.accounts.ledger.columns.domain', { defaultValue: 'Domain' }), sortable: false, field: 'targetModel' },
                                    { key: 'action', label: t('finance.accounts.ledger.columns.operation', { defaultValue: 'Operation Type' }), sortable: false, field: 'action' },
                                    { key: 'user', label: t('finance.accounts.ledger.columns.user', { defaultValue: 'Authorized User' }), sortable: false, field: 'user' },
                                    { key: 'description', label: t('finance.accounts.ledger.columns.context', { defaultValue: 'System Context' }), sortable: false, field: 'description' },
                                ]}
                                storageKey="finance:accounts:ledger:columns:v1"
                                controlsProps={{
                                    limit: ledgerLimit,
                                    total: ledgerTotal,
                                    onLimit: (v) => {
                                        setLedgerLimit(v);
                                        setLedgerPage(1);
                                    },
                                    className: 'px-8 bg-white',
                                }}
                                sortBy={ledgerSortBy}
                                sortDir={ledgerSortDir}
                                onSort={onLedgerSort}
                                getRowKey={(row) => row?._id || row?.id}
                                renderCell={(row, col) => {
                                    switch (col.key) {
                                        case 'createdAt':
                                            return row?.createdAt
                                                ? (
                                                    <div>
                                                        <span className="font-mono text-[10px] text-slate-400 block mb-1">{new Date(row.createdAt).toLocaleDateString()}</span>
                                                        <span className="font-mono text-[10px] text-slate-900 font-bold">{new Date(row.createdAt).toLocaleTimeString()}</span>
                                                    </div>
                                                )
                                                : '—';
                                        case 'targetModel':
                                            return <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-tighter">{row?.targetModel || '—'}</span>;
                                        case 'action':
                                            {
                                                const action = String(row?.action || '');
                                                const tone = action.includes('DELETE')
                                                    ? 'bg-red-50 text-red-600'
                                                    : action.includes('UPDATE')
                                                        ? 'bg-blue-50 text-blue-600'
                                                        : 'bg-green-50 text-green-600';
                                                return (
                                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${tone}`}>{action || '—'}</span>
                                                );
                                            }
                                        case 'user':
                                            return (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-[10px]">{row?.user?.username?.charAt(0) || 'S'}</div>
                                                    <span className="text-slate-900 font-bold text-xs">{row?.user?.username || t('finance.accounts.ledger.export.systemUser', { defaultValue: 'SYSTEM' })}</span>
                                                </div>
                                            );
                                        case 'description':
                                            return <p className="text-[10px] text-slate-500 font-medium max-w-60 leading-relaxed line-clamp-2" title={row?.description}>{row?.description || ''}</p>;
                                        default:
                                            return '';
                                    }
                                }}
                                meta={{ page: ledgerPage, totalPages: ledgerTotalPages, limit: ledgerLimit, total: ledgerTotal }}
                                onPage={setLedgerPage}
                                onLimit={(v) => { setLedgerLimit(v); setLedgerPage(1); }}
                                showRowsSelector={false}
                                paginationProps={{ className: 'no-print', infoVariant: 'page' }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODALS */}
            <Modal
                isOpen={showTransferModal}
                onClose={() => setShowTransferModal(false)}
                title={t('finance.accounts.modals.transferTitle', { defaultValue: 'Inter-Account Transfer' })}
                panelClassName="max-w-md"
            >
                <form onSubmit={handleTransfer} className="space-y-4">
                    <FormField label={t('finance.accounts.fields.fromSource', { defaultValue: 'From Source' })} required>
                        <DropdownSelect
                            value={transferData.fromAccountId}
                            onChange={(v) => setTransferData({ ...transferData, fromAccountId: v })}
                            disabled={isTransferring}
                            placeholder={t('finance.accounts.transfer.sourcePlaceholder', { defaultValue: 'Source account…' })}
                            options={activeAccounts.map((a) => ({
                                value: a._id,
                                label: `${a.name} (${a.accountNumber || t('finance.accounts.placeholders.notAvailable', { defaultValue: 'N/A' })})`,
                            }))}
                        />
                    </FormField>

                    <FormField label={t('finance.accounts.fields.toDestination', { defaultValue: 'To Destination' })} required>
                        <DropdownSelect
                            value={transferData.toAccountId}
                            onChange={(v) => setTransferData({ ...transferData, toAccountId: v })}
                            disabled={isTransferring}
                            placeholder={t('finance.accounts.transfer.targetPlaceholder', { defaultValue: 'Target account…' })}
                            options={activeAccounts
                                .filter((a) => String(a._id) !== String(transferData.fromAccountId || ''))
                                .map((a) => ({
                                    value: a._id,
                                    label: `${a.name} (${a.accountNumber || t('finance.accounts.placeholders.notAvailable', { defaultValue: 'N/A' })})`,
                                }))}
                        />
                    </FormField>

                    <FormField label={t('finance.accounts.fields.transferAmountUsd', { defaultValue: 'Transfer Amount (USD)' })} required>
                        <Input
                            type="number"
                            placeholder={t('finance.accounts.placeholders.amount', { defaultValue: '0.00' })}
                            value={transferData.amount}
                            onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                            required
                            min="0.01"
                            step="0.01"
                        />
                    </FormField>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="neutral" onClick={() => setShowTransferModal(false)} disabled={isTransferring}>
                            {t('common.actions.cancel', { defaultValue: 'Cancel' })}
                        </Button>
                        <Button
                            type="submit"
                            variant="brand"
                            disabled={
                                isTransferring ||
                                !String(transferData.fromAccountId || '') ||
                                !String(transferData.toAccountId || '') ||
                                !String(transferData.amount || '')
                            }
                        >
                            {isTransferring
                                ? t('common.working', { defaultValue: 'WORKING…' })
                                : t('finance.accounts.actions.executeFunds', { defaultValue: 'Execute Funds' })}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title={t('finance.accounts.modals.createTitle', { defaultValue: 'Register New Account' })}
                panelClassName="max-w-md"
            >
                <form onSubmit={handleCreateAccount} className="space-y-4">
                    <FormField label={t('finance.accounts.fields.accountName', { defaultValue: 'Account Name' })} required>
                        <Input
                            value={newAccount.name}
                            onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                            placeholder={t('finance.accounts.placeholders.accountNameExample', { defaultValue: 'e.g. Petty Cash' })}
                            required
                        />
                    </FormField>

                    <div className="grid grid-cols-2 gap-3">
                        <FormField label={t('finance.accounts.fields.type', { defaultValue: 'Type' })}>
                            <DropdownSelect
                                value={newAccount.type}
                                onChange={(v) => setNewAccount({ ...newAccount, type: v })}
                                disabled={isCreating}
                                options={[
                                    { value: 'Bank', label: t('finance.accounts.options.accountType.bank', { defaultValue: 'Bank' }) },
                                    { value: 'Cash', label: t('finance.accounts.options.accountType.cash', { defaultValue: 'Cash' }) },
                                    { value: 'Mobile Money', label: t('finance.accounts.options.accountType.mobileMoney', { defaultValue: 'Mobile Money' }) },
                                ]}
                            />
                        </FormField>
                        <FormField label={t('finance.accounts.fields.branch', { defaultValue: 'Branch' })}>
                            <Input
                                value={newAccount.branch}
                                onChange={(e) => setNewAccount({ ...newAccount, branch: e.target.value })}
                                disabled={isCreating}
                            />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <FormField label={t('finance.accounts.fields.institution', { defaultValue: 'Institution' })} required>
                            <Input
                                value={newAccount.institution}
                                onChange={(e) => setNewAccount({ ...newAccount, institution: e.target.value })}
                                placeholder={t('finance.accounts.placeholders.institutionExample', { defaultValue: 'e.g. Salaam Bank' })}
                                required
                                disabled={isCreating}
                            />
                        </FormField>
                        <FormField label={t('finance.accounts.fields.accountNumber', { defaultValue: 'Account No.' })} required>
                            <Input
                                value={newAccount.accountNumber}
                                onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value })}
                                required
                                disabled={isCreating}
                            />
                        </FormField>
                    </div>

                    <FormField label={t('finance.accounts.fields.openingBalance', { defaultValue: 'Initial Opening Balance' })} required>
                        <Input
                            type="number"
                            value={newAccount.balance}
                            onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                            required
                            disabled={isCreating}
                        />
                    </FormField>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="neutral" onClick={() => setShowCreateModal(false)} disabled={isCreating}>
                            {t('common.actions.cancel', { defaultValue: 'Cancel' })}
                        </Button>
                        <Button
                            type="submit"
                            variant="brand"
                            disabled={
                                isCreating ||
                                !String(newAccount.name || '').trim() ||
                                !String(newAccount.institution || '').trim() ||
                                !String(newAccount.accountNumber || '').trim() ||
                                String(newAccount.balance || '') === ''
                            }
                        >
                            {isCreating
                                ? t('common.saving', { defaultValue: 'Saving…' })
                                : t('finance.accounts.actions.createAccount', { defaultValue: 'Create Account' })}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={showIncomeModal}
                onClose={() => setShowIncomeModal(false)}
                title={t('finance.accounts.modals.incomeTitle', { defaultValue: 'Record General Income' })}
                panelClassName="max-w-md"
            >
                <form onSubmit={handleRecordIncome} className="space-y-4">
                    <FormField label={t('finance.accounts.fields.depositTo', { defaultValue: 'Deposit To' })} required>
                        <DropdownSelect
                            value={incomeData.accountId}
                            onChange={(v) => setIncomeData({ ...incomeData, accountId: v })}
                            disabled={isRecordingIncome}
                            placeholder={t('finance.accounts.income.depositToPlaceholder', { defaultValue: 'Select account…' })}
                            options={activeAccounts.map((a) => ({ value: a._id, label: a.name }))}
                        />
                    </FormField>

                    <FormField label={t('finance.accounts.fields.incomeName', { defaultValue: 'Income Desc / Name' })} required>
                        <Input
                            value={incomeData.incomeName}
                            onChange={(e) => setIncomeData({ ...incomeData, incomeName: e.target.value })}
                            placeholder={t('finance.accounts.placeholders.incomeNameExample', { defaultValue: 'e.g. Donation from XYZ' })}
                            required
                            disabled={isRecordingIncome}
                        />
                    </FormField>

                    <div className="grid grid-cols-2 gap-3">
                        <FormField label={t('finance.accounts.fields.refNumber', { defaultValue: 'Ref #' })}>
                            <Input
                                value={incomeData.receivedNumber}
                                onChange={(e) => setIncomeData({ ...incomeData, receivedNumber: e.target.value })}
                                disabled={isRecordingIncome}
                            />
                        </FormField>
                        <FormField label={t('finance.accounts.fields.date', { defaultValue: 'Date' })}>
                            <Input
                                type="date"
                                value={incomeData.date}
                                onChange={(e) => setIncomeData({ ...incomeData, date: e.target.value })}
                                disabled={isRecordingIncome}
                            />
                        </FormField>
                    </div>

                    <FormField label={t('finance.accounts.fields.totalReceivedAmount', { defaultValue: 'Total Received Amount' })} required>
                        <Input
                            type="number"
                            value={incomeData.amount}
                            onChange={(e) => setIncomeData({ ...incomeData, amount: e.target.value })}
                            required
                            disabled={isRecordingIncome}
                        />
                    </FormField>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="neutral" onClick={() => setShowIncomeModal(false)} disabled={isRecordingIncome}>
                            {t('common.actions.cancel', { defaultValue: 'Cancel' })}
                        </Button>
                        <Button
                            type="submit"
                            variant="brand"
                            disabled={
                                isRecordingIncome ||
                                !String(incomeData.accountId || '') ||
                                !String(incomeData.incomeName || '').trim() ||
                                !String(incomeData.amount || '')
                            }
                        >
                            {isRecordingIncome
                                ? t('common.working', { defaultValue: 'WORKING…' })
                                : t('finance.accounts.actions.recordIncome', { defaultValue: 'Record Income' })}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={showEditModal && Boolean(editingAccount)}
                onClose={() => { setShowEditModal(false); setEditingAccount(null); }}
                title={t('finance.accounts.modals.editTitle', { defaultValue: 'Edit Account' })}
                panelClassName="max-w-md"
            >
                {editingAccount ? (
                    <form onSubmit={handleEditAccount} className="space-y-4">
                        <FormField label={t('finance.accounts.fields.accountName', { defaultValue: 'Account Name' })} required>
                            <Input
                                value={editingAccount.name}
                                onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                                required
                            />
                        </FormField>

                        <div className="grid grid-cols-2 gap-3">
                            <FormField label={t('finance.accounts.fields.type', { defaultValue: 'Type' })}>
                                <DropdownSelect
                                    value={editingAccount.type}
                                    onChange={(v) => setEditingAccount({ ...editingAccount, type: v })}
                                    disabled={isUpdating}
                                    options={[
                                        { value: 'Bank', label: t('finance.accounts.options.accountType.bank', { defaultValue: 'Bank' }) },
                                        { value: 'Cash', label: t('finance.accounts.options.accountType.cash', { defaultValue: 'Cash' }) },
                                        { value: 'Mobile Money', label: t('finance.accounts.options.accountType.mobileMoney', { defaultValue: 'Mobile Money' }) },
                                    ]}
                                />
                            </FormField>
                            <FormField label={t('finance.accounts.fields.branch', { defaultValue: 'Branch' })}>
                                <Input
                                    value={editingAccount.branch}
                                    onChange={(e) => setEditingAccount({ ...editingAccount, branch: e.target.value })}
                                    disabled={isUpdating}
                                />
                            </FormField>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <FormField label={t('finance.accounts.fields.institution', { defaultValue: 'Institution' })} required>
                                <Input
                                    value={editingAccount.institution}
                                    onChange={(e) => setEditingAccount({ ...editingAccount, institution: e.target.value })}
                                    required
                                    disabled={isUpdating}
                                />
                            </FormField>
                            <FormField label={t('finance.accounts.fields.accountNumber', { defaultValue: 'Account No.' })} required>
                                <Input
                                    value={editingAccount.accountNumber}
                                    onChange={(e) => setEditingAccount({ ...editingAccount, accountNumber: e.target.value })}
                                    required
                                    disabled={isUpdating}
                                />
                            </FormField>
                        </div>

                        <FormField label={t('finance.accounts.fields.status', { defaultValue: 'Status' })}>
                            <DropdownSelect
                                value={editingAccount.status || 'active'}
                                onChange={(v) => setEditingAccount({ ...editingAccount, status: v })}
                                disabled={isUpdating}
                                options={[
                                    { value: 'active', label: t('common.status.active', { defaultValue: 'Active' }) },
                                    { value: 'inactive', label: t('common.status.inactive', { defaultValue: 'Inactive' }) },
                                ]}
                            />
                        </FormField>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="neutral"
                                onClick={() => { setShowEditModal(false); setEditingAccount(null); }}
                                disabled={isUpdating}
                            >
                                {t('common.actions.cancel', { defaultValue: 'Cancel' })}
                            </Button>
                            <Button type="submit" variant="brand" disabled={isUpdating}>
                                {isUpdating
                                    ? t('common.updating', { defaultValue: 'Updating…' })
                                    : t('finance.accounts.actions.saveChanges', { defaultValue: 'Save Changes' })}
                            </Button>
                        </div>
                    </form>
                ) : null}
            </Modal>
        </div>
    );
}
