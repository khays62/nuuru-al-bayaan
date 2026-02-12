import React, { useState, useEffect } from 'react';
import financeService from '../api/finance';
import { Layers, Plus, Save, Trash2, PieChart, Landmark, ArrowRightLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FinanceApportionmentTab() {
    const [categories, setCategories] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [apportionments, setApportionments] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isAdding, setIsAdding] = useState(false);
    const [newRule, setNewRule] = useState({
        categoryId: '',
        accountId: '',
        splitPercentage: 100,
        description: ''
    });

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [catRes, accRes] = await Promise.all([
                financeService.getFinanceCategories('fee'),
                financeService.getAccounts()
            ]);
            setCategories(catRes.data || catRes || []);
            setAccounts(accRes.data || accRes || []);

            // Placeholder for apportionment rules - in a real app, this would be a separate endpoint
            setApportionments([
                { id: '1', category: 'Tuition Fee', account: 'School Main Account', split: 100, status: 'Prime' },
                { id: '2', category: 'Bus Fee', account: 'Transport Operations', split: 100, status: 'Linked' }
            ]);
        } catch {
            toast.error("Failed to load apportionment data");
        } finally {
            setLoading(false);
        }
    };

    const handleAddRule = () => {
        if (!newRule.categoryId || !newRule.accountId) return toast.error("Select both Fee and Account");

        const catName = categories.find(c => c._id === newRule.categoryId)?.name;
        const accName = accounts.find(a => a._id === newRule.accountId)?.name;

        setApportionments([...apportionments, {
            id: Date.now().toString(),
            category: catName,
            account: accName,
            split: newRule.splitPercentage,
            status: 'Custom'
        }]);
        setIsAdding(false);
        toast.success("Apportionment Rule Established");
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-surface-900 tracking-tight">Finance Apportionment Engine</h3>
                    <p className="text-sm text-surface-500">Automated fund distribution mapping between fee types and ledger accounts.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-primary text-white px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary-dark transition-all"
                >
                    <Plus size={18} /> Define New Distribution
                </button>
            </div>

            {isAdding && (
                <div className="bg-primary-50 border border-primary-200 p-6 rounded-2xl animate-in slide-in-from-top-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div>
                            <label className="text-[10px] font-black text-primary-700 uppercase tracking-widest block mb-2">Select Fee Type</label>
                            <select
                                className="w-full h-11 bg-white border border-primary-100 rounded-xl px-4 outline-none focus:ring-4 focus:ring-primary/10 font-bold text-sm"
                                value={newRule.categoryId}
                                onChange={e => setNewRule({ ...newRule, categoryId: e.target.value })}
                            >
                                <option value="">Choose Category</option>
                                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="flex justify-center md:pb-3">
                            <ArrowRightLeft className="text-primary-300" size={20} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-primary-700 uppercase tracking-widest block mb-2">Target Account</label>
                            <select
                                className="w-full h-11 bg-white border border-primary-100 rounded-xl px-4 outline-none focus:ring-4 focus:ring-primary/10 font-bold text-sm"
                                value={newRule.accountId}
                                onChange={e => setNewRule({ ...newRule, accountId: e.target.value })}
                            >
                                <option value="">Choose Account</option>
                                {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setIsAdding(false)} className="flex-1 h-11 bg-white border border-primary-100 text-primary font-bold rounded-xl text-xs uppercase tracking-widest">Cancel</button>
                            <button onClick={handleAddRule} className="flex-1 h-11 bg-primary text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-primary/20">Save Rule</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="p-20 text-center text-surface-400 font-bold italic tracking-widest">Compiling Ledger Maps...</div>
                    ) : (
                        apportionments.map(rule => (
                            <div key={rule.id} className="bg-white border border-surface-200 p-5 rounded-2xl flex items-center justify-between group hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 bg-surface-50 rounded-xl flex items-center justify-center text-primary border border-surface-100">
                                        <PieChart size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-bold text-surface-900">{rule.category}</p>
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-tighter rounded border border-blue-100">{rule.status}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-surface-500">
                                            <Landmark size={12} />
                                            <span>Mappped to: <strong className="text-surface-700">{rule.account}</strong></span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <p className="font-black text-xl text-surface-900 tracking-tight">{rule.split}%</p>
                                        <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Allocation</p>
                                    </div>
                                    <button className="p-2 text-surface-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-surface-900 p-8 rounded-4xl text-white overflow-hidden relative shadow-2xl shadow-surface-200">
                        <div className="relative z-10">
                            <Layers className="text-primary mb-6" size={40} />
                            <h4 className="text-2xl font-black uppercase tracking-tighter mb-2 leading-none">Smart Apportionment</h4>
                            <p className="text-surface-400 text-sm leading-relaxed mb-6">
                                Automatically divert income during reconciliation. Use this to separate Tuition from Operational funds.
                            </p>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-surface-800">
                                    <span className="text-xs text-surface-400 font-bold uppercase">Total Rules</span>
                                    <span className="font-mono font-bold">{apportionments.length}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-surface-800">
                                    <span className="text-xs text-surface-400 font-bold uppercase">Active Mappings</span>
                                    <span className="font-mono font-bold text-green-400">100%</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-50" />
                    </div>
                </div>
            </div>
        </div>
    );
}
