import React, { useState, useEffect } from 'react';
import financeService from '../api/finance';
import { X, ChevronRight, Check, Search, ArrowLeft, Users, Calendar, Calculator, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../api/axios';

export default function RunPayrollModal({ onClose, onSuccess }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [search, setSearch] = useState('');

    const [formData, setFormData] = useState({
        month: new Date().toISOString().slice(0, 7), // YYYY-MM
        scope: 'all', // all, single
        staffId: ''
    });

    useEffect(() => {
        if (formData.scope === 'single') {
            fetchStaff();
        }
    }, [formData.scope]);

    const fetchStaff = async () => {
        try {
            const res = await axios.get('/users', { params: { status: 'active', includeTeachers: true } });
            setStaffList((res.data || []).filter(u => u.status !== 'inactive'));
        } catch {
            toast.error("Failed to load staff list");
        }
    };

    const handleRun = async () => {
        setLoading(true);
        try {
            if (formData.scope === 'all') {
                await financeService.generatePayroll({ month: formData.month });
            } else {
                await financeService.generateSinglePayroll({
                    month: formData.month,
                    staffId: formData.staffId
                });
            }
            toast.success("Payroll Pipeline Initiated Successfully");
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to initiate payroll");
        } finally {
            setLoading(false);
        }
    };

    const filteredStaff = staffList.filter(s =>
        s.fullName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${step === 1 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-green-500 border-green-500 text-white'}`}>
                                    {step === 1 ? '01' : <Check size={14} />}
                                </span>
                                <div className="h-px w-8 bg-slate-200" />
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${step === 2 ? 'bg-blue-600 border-blue-600 text-white' : 'text-slate-300 border-slate-200'}`}>
                                    02
                                </span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Payroll Pipeline</h3>
                            <p className="text-sm text-slate-500 font-medium font-mono uppercase tracking-widest">Process Salaries Period: {formData.month}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm">
                            <X size={22} className="text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 max-h-[70vh]">
                    {step === 1 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Calendar size={12} className="text-blue-600" /> Target Fiscal Month
                                </label>
                                <input
                                    type="month"
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none text-2xl font-black text-slate-900 tracking-tight"
                                    value={formData.month}
                                    onChange={e => setFormData({ ...formData, month: e.target.value })}
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Users size={12} className="text-blue-600" /> Scope of Operation
                                </label>
                                <div className="grid grid-cols-1 gap-4">
                                    {[
                                        { id: 'all', label: 'Institutional Wide', desc: 'Process salaries for all active faculty and staff.', icon: Users },
                                        { id: 'single', label: 'Single Staff Member', desc: 'Process payroll for a specific individual record.', icon: CheckCircle2 }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setFormData({ ...formData, scope: opt.id })}
                                            className={`flex items-start gap-5 p-6 rounded-3xl border-2 text-left transition-all ${formData.scope === opt.id ? 'border-blue-600 bg-blue-50 shadow-lg shadow-blue-600/5' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                                        >
                                            <div className={`p-4 rounded-2xl ${formData.scope === opt.id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                                <opt.icon size={24} />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 uppercase tracking-tight text-lg leading-tight mb-1">{opt.label}</p>
                                                <p className="text-sm text-slate-500 font-medium leading-relaxed">{opt.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            {formData.scope === 'single' ? (
                                <>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                        <input
                                            type="text"
                                            placeholder="Search directory..."
                                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-600/10 transition-all text-lg"
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-3 pr-2">
                                        <div className="grid grid-cols-1 gap-2">
                                            {filteredStaff.length === 0 ? (
                                                <p className="text-center py-10 text-slate-400 font-bold italic">No matching records found.</p>
                                            ) : filteredStaff.map(staff => (
                                                <button
                                                    key={staff._id}
                                                    onClick={() => setFormData({ ...formData, staffId: staff._id })}
                                                    className={`w-full flex items-center justify-between p-5 border-2 rounded-2xl transition-all ${formData.staffId === staff._id ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-slate-50 bg-white hover:border-slate-100'}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${formData.staffId === staff._id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                            {staff.fullName?.charAt(0)}
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-black text-slate-900 leading-tight">{staff.fullName}</p>
                                                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{staff.role || 'Personnel'}</p>
                                                        </div>
                                                    </div>
                                                    {formData.staffId === staff._id && (
                                                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                                                            <Check size={18} />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-12 space-y-6 bg-slate-50/50 rounded-4xl border-2 border-dashed border-slate-200">
                                    <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-blue-50">
                                        <Calculator size={48} className="stroke-[1.5]" />
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Bulk Initialization</h4>
                                        <p className="text-slate-500 font-medium max-w-xs mx-auto mt-2 leading-relaxed">
                                            The system will generate draft payroll records for <span className="text-blue-600 font-bold">all active faculty members</span> for the fiscal period <span className="font-black underline">{formData.month}</span>.
                                        </p>
                                    </div>
                                    <div className="flex justify-center gap-3">
                                        <span className="px-4 py-1.5 bg-green-50 text-green-600 text-[10px] font-black uppercase rounded-full border border-green-100">Auto-Apply Allowances</span>
                                        <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-full border border-blue-100">Filing Metadata</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-10 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    {step === 2 ? (
                        <button onClick={() => setStep(1)} className="px-6 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-900 flex items-center gap-3 transition-all">
                            <ArrowLeft size={16} /> Previous Step
                        </button>
                    ) : (
                        <button onClick={onClose} className="px-6 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-all">
                            Discard Pipeline
                        </button>
                    )}

                    <button
                        onClick={step === 1 ? () => setStep(2) : handleRun}
                        disabled={loading || (step === 2 && formData.scope === 'single' && !formData.staffId)}
                        className="bg-slate-900 hover:bg-black text-white px-10 py-5 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-slate-200 transition-all disabled:opacity-50 flex items-center gap-3"
                    >
                        {loading ? 'Processing Pipeline...' : step === 1 ? 'Configure Strategy' : 'Execute Generation'}
                        {!loading && <ChevronRight size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
