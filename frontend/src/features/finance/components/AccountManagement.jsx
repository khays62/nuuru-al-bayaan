import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ArrowRightLeft, Building, DollarSign, ChevronDown, History, TrendingUp, TrendingDown, Users } from 'lucide-react';
import axios from '../api/axios';
import financeService from '../api/finance';
import toast from 'react-hot-toast';

export default function AccountManagement() {
    const [expandedSection, setExpandedSection] = useState('list');
    const [accounts, setAccounts] = useState([]);
    const [ledgerLogs, setLedgerLogs] = useState([]);

    // Modals
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showIncomeModal, setShowIncomeModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Form States
    const [newAccount, setNewAccount] = useState({ name: '', institution: '', accountNumber: '', balance: 0, branch: 'Main', type: 'Bank' });
    const [editingAccount, setEditingAccount] = useState(null);
    const [transferData, setTransferData] = useState({ fromAccountId: '', toAccountId: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
    const [incomeData, setIncomeData] = useState({ incomeName: '', comment: '', receivedNumber: '', amount: '', accountId: '', date: new Date().toISOString().split('T')[0] });

    const fetchAccounts = async () => {
        try {
            const data = await financeService.getAccounts({ includeInactive: true });
            setAccounts(data);
        } catch {
            toast.error('Failed to load accounts');
        }
    };

    const fetchLedger = async () => {
        try {
            // Finance audit logs are exposed under /api/finance/audit
            // Use q filter to focus on Account-related actions.
            const response = await axios.get('/finance/audit', { params: { q: 'account' } });
            const payload = response.data;
            const rows = Array.isArray(payload)
                ? payload
                : (Array.isArray(payload?.data) ? payload.data : []);
            setLedgerLogs(rows);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchAccounts();
        if (expandedSection === 'ledger') fetchLedger();
    }, [expandedSection]);

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
            await financeService.createAccount(newAccount);
            toast.success('Account created successfully');
            setShowCreateModal(false);
            setNewAccount({ name: '', institution: '', accountNumber: '', balance: 0, branch: 'Main', type: 'Bank' });
            fetchAccounts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create account');
        }
    };

    const handleEditAccount = async (e) => {
        e.preventDefault();
        if (!editingAccount?._id) return;
        try {
            const payload = {
                name: editingAccount.name,
                type: editingAccount.type,
                status: editingAccount.status,
                institution: editingAccount.institution,
                branch: editingAccount.branch,
                accountNumber: editingAccount.accountNumber,
                // Balance edits are intentionally not exposed here
            };
            await financeService.updateAccount(editingAccount._id, payload);
            toast.success('Account updated successfully');
            setShowEditModal(false);
            setEditingAccount(null);
            fetchAccounts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update account');
        }
    };

    const handleRecordIncome = async (e) => {
        e.preventDefault();
        try {
            await financeService.recordIncome(incomeData);
            toast.success('Income recorded successfully');
            setShowIncomeModal(false);
            setIncomeData({ incomeName: '', comment: '', receivedNumber: '', amount: '', accountId: '', date: new Date().toISOString().split('T')[0] });
            fetchAccounts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Recording failed');
        }
    };

    const handleTransfer = async (e) => {
        e.preventDefault();
        try {
            await financeService.transferFunds(transferData);
            toast.success('Funds transferred successfully');
            setShowTransferModal(false);
            setTransferData({ fromAccountId: '', toAccountId: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
            fetchAccounts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Transfer failed');
        }
    };

    const renderTabs = () => (
        <div className="inline-flex flex-wrap gap-2 mb-8 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            {[
                { id: 'list', label: 'Institution Accounts', icon: Building },
                { id: 'overview', label: 'Balance Overview & Projects', icon: TrendingUp },
                { id: 'ledger', label: 'General Ledger History', icon: History }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setExpandedSection(tab.id)}
                    className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all
                        ${expandedSection === tab.id
                            ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 scale-[1.02]'
                            : 'text-slate-500 hover:bg-white hover:text-slate-900'}`}
                >
                    <tab.icon size={14} className={expandedSection === tab.id ? 'text-blue-600' : 'text-slate-400'} />
                    {tab.label}
                </button>
            ))}
        </div>
    );

    return (
        <div className="space-y-6">
            {renderTabs()}

            <div className="min-h-150">
                {/* 1. Account List & Actions */}
                {expandedSection === 'list' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Institution Accounts</h3>
                                <p className="text-xs text-slate-400 font-medium font-mono uppercase tracking-widest mt-1">Real-time liquidity management</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowTransferModal(true)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                    <ArrowRightLeft size={14} /> Transfer
                                </button>
                                <button onClick={() => setShowIncomeModal(true)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                    <DollarSign size={14} /> Income
                                </button>
                                <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:scale-[1.02] flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                    <Plus size={14} /> New Account
                                </button>
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
                                                {acc.type}
                                            </span>
                                            <span className={`ml-2 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest
                                                ${acc.status === 'inactive' ? 'bg-slate-100 text-slate-500' : 'bg-green-50 text-green-600'}`}>
                                                {acc.status === 'inactive' ? 'Inactive' : 'Active'}
                                            </span>
                                            <button
                                                onClick={() => {
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
                                                }}
                                                className="ml-2 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                                                type="button"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1 mb-6">
                                        <h3 className="font-bold text-xl text-slate-900 truncate tracking-tight">{acc.name}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{acc.institution || '—'} {acc.branch ? `• ${acc.branch}` : ''}</p>
                                        <p className="font-mono text-[10px] text-slate-400 uppercase tracking-tighter">REF: {acc.accountNumber}</p>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Available USD</p>
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
                                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-4">Master Financial Overview</h4>
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-6 leading-none">Total Aggregated Liquidity</h2>
                                <div className="flex items-center justify-center gap-3 mb-8">
                                    <span className="text-7xl font-black text-white tracking-tighter">
                                        ${accounts.reduce((sum, a) => sum + (a.balance || 0), 0).toLocaleString()}
                                    </span>
                                    <span className="text-xl font-bold text-slate-400">USD</span>
                                </div>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                                    <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Verified from {accounts.length} linked accounts</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Ledger History */}
                {expandedSection === 'ledger' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">General Ledger History</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Immutable transaction audit stream</p>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl text-slate-500 text-[10px] font-black uppercase racking-widest">
                                    <History size={14} /> Real-time tracking
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <tr>
                                            <th className="py-5 px-8">Audit Pulse / Date</th>
                                            <th className="py-5 px-8">Domain</th>
                                            <th className="py-5 px-8">Operation Type</th>
                                            <th className="py-5 px-8">Authorized User</th>
                                            <th className="py-5 px-8">System Context</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {ledgerLogs.length === 0 ? (
                                            <tr><td colSpan="5" className="py-32 text-center text-slate-300 italic font-medium">No ledger records detected in current session.</td></tr>
                                        ) : (
                                            ledgerLogs.map(log => (
                                                <tr key={log._id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="py-5 px-8">
                                                        <span className="font-mono text-[10px] text-slate-400 block mb-1">{new Date(log.createdAt).toLocaleDateString()}</span>
                                                        <span className="font-mono text-[10px] text-slate-900 font-bold">{new Date(log.createdAt).toLocaleTimeString()}</span>
                                                    </td>
                                                    <td className="py-5 px-8">
                                                        <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-tighter">{log.targetModel}</span>
                                                    </td>
                                                    <td className="py-5 px-8">
                                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest
                                                            ${log.action.includes('DELETE') ? 'bg-red-50 text-red-600' :
                                                                log.action.includes('UPDATE') ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="py-5 px-8">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-[10px]">{log.user?.username?.charAt(0) || 'S'}</div>
                                                            <span className="text-slate-900 font-bold text-xs">{log.user?.username || 'SYSTEM'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-8">
                                                        <p className="text-[10px] text-slate-500 font-medium max-w-60 leading-relaxed line-clamp-2" title={log.description}>{log.description}</p>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODALS */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-100">
                    <div className="bg-white rounded-4xl max-w-md w-full p-10 shadow-3xl animate-in zoom-in-95 duration-200 border border-slate-100">
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8">Inter-Account Transfer</h3>
                        <form onSubmit={handleTransfer} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">From Source</label>
                                <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600/20 outline-none transition-all" value={transferData.fromAccountId} onChange={e => setTransferData({ ...transferData, fromAccountId: e.target.value })} required>
                                    <option value="">-- Source Account --</option>
                                    {activeAccounts.map(a => <option key={a._id} value={a._id}>{a.name} ({a.accountNumber || 'N/A'})</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">To Destination</label>
                                <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600/20 outline-none transition-all" value={transferData.toAccountId} onChange={e => setTransferData({ ...transferData, toAccountId: e.target.value })} required>
                                    <option value="">-- Target Account --</option>
                                    {activeAccounts.filter(a => a._id !== transferData.fromAccountId).map(a => <option key={a._id} value={a._id}>{a.name} ({a.accountNumber || 'N/A'})</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transfer Amount (USD)</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">$</span>
                                    <input type="number" className="w-full pl-10 pr-5 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-3xl text-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all" placeholder="0.00" value={transferData.amount} onChange={e => setTransferData({ ...transferData, amount: e.target.value })} required min="1" />
                                </div>
                            </div>
                            <div className="pt-6 flex gap-4">
                                <button type="button" onClick={() => setShowTransferModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                                <button type="submit" className="flex-2 py-4 bg-slate-900 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl shadow-slate-200 hover:bg-black transition-all">Execute Funds</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-100">
                    <div className="bg-white rounded-4xl max-w-md w-full p-10 shadow-3xl animate-in zoom-in-95 duration-200 border border-slate-100">
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8 text-left">Register New Account</h3>
                        <form onSubmit={handleCreateAccount} className="space-y-6">
                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Name</label>
                                <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600/20 outline-none" placeholder="e.g. Petty Cash" value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-left">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                                    <select className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600/20 outline-none" value={newAccount.type} onChange={e => setNewAccount({ ...newAccount, type: e.target.value })}>
                                        <option>Bank</option>
                                        <option>Cash</option>
                                        <option>Mobile Money</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch</label>
                                    <input type="text" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600/20 outline-none" value={newAccount.branch} onChange={e => setNewAccount({ ...newAccount, branch: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-left">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institution</label>
                                    <input type="text" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600/20 outline-none" placeholder="e.g. Salaam Bank" value={newAccount.institution} onChange={e => setNewAccount({ ...newAccount, institution: e.target.value })} required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account No.</label>
                                    <input type="text" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600/20 outline-none" value={newAccount.accountNumber} onChange={e => setNewAccount({ ...newAccount, accountNumber: e.target.value })} required />
                                </div>
                            </div>
                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Opening Balance</label>
                                <input type="number" className="w-full px-5 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-3xl text-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none" value={newAccount.balance} onChange={e => setNewAccount({ ...newAccount, balance: e.target.value })} required />
                            </div>
                            <div className="pt-6 flex gap-4">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                                <button type="submit" className="flex-2 py-4 bg-slate-900 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl hover:bg-black transition-all">Create Account</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showIncomeModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-100">
                    <div className="bg-white rounded-4xl max-w-md w-full p-10 shadow-3xl animate-in zoom-in-95 duration-200 border border-slate-100">
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8 text-left">Record General Income</h3>
                        <form onSubmit={handleRecordIncome} className="space-y-6">
                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deposit To</label>
                                <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600/20" value={incomeData.accountId} onChange={e => setIncomeData({ ...incomeData, accountId: e.target.value })} required>
                                    <option value="">-- Select Account --</option>
                                    {activeAccounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Income Desc / Name</label>
                                <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600/20" placeholder="e.g. Donation from XYZ" value={incomeData.incomeName} onChange={e => setIncomeData({ ...incomeData, incomeName: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-left">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ref #</label>
                                    <input type="text" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" value={incomeData.receivedNumber} onChange={e => setIncomeData({ ...incomeData, receivedNumber: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                    <input type="date" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs" value={incomeData.date} onChange={e => setIncomeData({ ...incomeData, date: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Received Amount</label>
                                <input type="number" className="w-full px-5 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-3xl text-blue-600 outline-none focus:ring-2 focus:ring-blue-600/20" value={incomeData.amount} onChange={e => setIncomeData({ ...incomeData, amount: e.target.value })} required />
                            </div>
                            <div className="pt-6 flex gap-4">
                                <button type="button" onClick={() => setShowIncomeModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                                <button type="submit" className="flex-2 py-4 bg-slate-900 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl hover:bg-black transition-all">Record Income</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditModal && editingAccount && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-100">
                    <div className="bg-white rounded-4xl max-w-md w-full p-10 shadow-3xl animate-in zoom-in-95 duration-200 border border-slate-100">
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8 text-left">Edit Account</h3>
                        <form onSubmit={handleEditAccount} className="space-y-6">
                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Name</label>
                                <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600/20 outline-none" value={editingAccount.name} onChange={e => setEditingAccount({ ...editingAccount, name: e.target.value })} required />
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-left">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                                    <select className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600/20 outline-none" value={editingAccount.type} onChange={e => setEditingAccount({ ...editingAccount, type: e.target.value })}>
                                        <option>Bank</option>
                                        <option>Cash</option>
                                        <option>Mobile Money</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch</label>
                                    <input type="text" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600/20 outline-none" value={editingAccount.branch} onChange={e => setEditingAccount({ ...editingAccount, branch: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-left">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institution</label>
                                    <input type="text" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600/20 outline-none" value={editingAccount.institution} onChange={e => setEditingAccount({ ...editingAccount, institution: e.target.value })} required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account No.</label>
                                    <input type="text" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600/20 outline-none" value={editingAccount.accountNumber} onChange={e => setEditingAccount({ ...editingAccount, accountNumber: e.target.value })} required />
                                </div>
                            </div>

                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                                <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-blue-600/20 outline-none" value={editingAccount.status || 'active'} onChange={e => setEditingAccount({ ...editingAccount, status: e.target.value })}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <div className="pt-6 flex gap-4">
                                <button type="button" onClick={() => { setShowEditModal(false); setEditingAccount(null); }} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                                <button type="submit" className="flex-2 py-4 bg-slate-900 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl hover:bg-black transition-all">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
