import React, { useState, useEffect } from 'react';
import financeService from '../api/finance';
import { X, ChevronRight, Check, Search, ArrowLeft, Users, Calendar, Calculator, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { useI18n } from '../../../i18n/I18nProvider';

export default function RunPayrollModal({ onClose, onSuccess }) {
    const { t } = useI18n();

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
            toast.error(t('finance.payroll.runModal.toasts.staffLoadFailed', { defaultValue: 'Failed to load staff list' }));
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
            toast.success(t('finance.payroll.runModal.toasts.pipelineStarted', { defaultValue: 'Payroll Pipeline Initiated Successfully' }));
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || t('finance.payroll.runModal.toasts.pipelineStartFailed', { defaultValue: 'Failed to initiate payroll' }));
        } finally {
            setLoading(false);
        }
    };

    const filteredStaff = staffList.filter(s =>
        s.fullName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-(--nb-color-bg-card) w-full max-w-2xl rounded-xl shadow-(--nb-shadow-md) overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-(--nb-color-border)">
                {/* Header */}
                <div className="p-6 border-b border-(--nb-color-border) bg-(--nb-color-bg)">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${step === 1 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-green-500 border-green-500 text-white'}`}>
                                    {step === 1 ? '01' : <Check size={14} />}
                                </span>
                                <div className="h-px w-8 bg-(--nb-color-border)" />
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${step === 2 ? 'bg-blue-600 border-blue-600 text-white' : 'text-(--nb-color-muted) border-(--nb-color-border)'}`}>
                                    02
                                </span>
                            </div>
                            <h3 className="text-2xl font-black text-(--nb-color-fg) tracking-tight uppercase">{t('finance.payroll.runModal.title', { defaultValue: 'Payroll Pipeline' })}</h3>
                            <p className="text-sm text-(--nb-color-muted) font-medium font-mono uppercase tracking-widest">
                                {t('finance.payroll.runModal.subtitle', { defaultValue: 'Process Salaries Period: {{month}}', month: formData.month })}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-(--nb-color-bg-card) rounded-xl transition-all shadow-(--nb-shadow-sm)">
                            <X size={22} className="text-(--nb-color-muted)" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 max-h-[70vh]">
                    {step === 1 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Calendar size={12} className="text-blue-600" /> {t('finance.payroll.runModal.labels.targetMonth', { defaultValue: 'Target Fiscal Month' })}
                                </label>
                                <input
                                    type="month"
                                    className="w-full px-5 py-4 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-xl focus:ring-4 focus:ring-blue-600/10 outline-none text-2xl font-black text-(--nb-color-fg) tracking-tight"
                                    value={formData.month}
                                    onChange={e => setFormData({ ...formData, month: e.target.value })}
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Users size={12} className="text-blue-600" /> {t('finance.payroll.runModal.labels.scope', { defaultValue: 'Scope of Operation' })}
                                </label>
                                <div className="grid grid-cols-1 gap-4">
                                    {[
                                        { id: 'all', label: t('finance.payroll.runModal.scopes.all.label', { defaultValue: 'Institutional Wide' }), desc: t('finance.payroll.runModal.scopes.all.desc', { defaultValue: 'Process salaries for all active faculty and staff.' }), icon: Users },
                                        { id: 'single', label: t('finance.payroll.runModal.scopes.single.label', { defaultValue: 'Single Staff Member' }), desc: t('finance.payroll.runModal.scopes.single.desc', { defaultValue: 'Process payroll for a specific individual record.' }), icon: CheckCircle2 }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setFormData({ ...formData, scope: opt.id })}
                                            className={`flex items-start gap-5 p-6 rounded-3xl border-2 text-left transition-all ${formData.scope === opt.id ? 'border-blue-600 bg-blue-50 shadow-lg shadow-blue-600/5' : 'border-(--nb-color-border) hover:border-(--nb-color-focus) bg-(--nb-color-bg-card)'}`}
                                        >
                                            <div className={`p-4 rounded-2xl ${formData.scope === opt.id ? 'bg-blue-600 text-white' : 'bg-(--nb-color-bg) text-(--nb-color-muted)'}`}>
                                                <opt.icon size={24} />
                                            </div>
                                            <div>
                                                <p className="font-black text-(--nb-color-fg) uppercase tracking-tight text-lg leading-tight mb-1">{opt.label}</p>
                                                <p className="text-sm text-(--nb-color-muted) font-medium leading-relaxed">{opt.desc}</p>
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
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-(--nb-color-muted)" size={20} />
                                        <input
                                            type="text"
                                            placeholder={t('finance.payroll.runModal.placeholders.search', { defaultValue: 'Search directory...' })}
                                            className="w-full pl-12 pr-6 py-4 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-600/10 transition-all text-lg text-(--nb-color-fg)"
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-3 pr-2">
                                        <div className="grid grid-cols-1 gap-2">
                                            {filteredStaff.length === 0 ? (
                                                <p className="text-center py-10 text-(--nb-color-muted) font-bold italic">{t('finance.payroll.runModal.empty.search', { defaultValue: 'No matching records found.' })}</p>
                                            ) : filteredStaff.map(staff => (
                                                <button
                                                    key={staff._id}
                                                    onClick={() => setFormData({ ...formData, staffId: staff._id })}
                                                    className={`w-full flex items-center justify-between p-5 border-2 rounded-2xl transition-all ${formData.staffId === staff._id ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-(--nb-color-border) bg-(--nb-color-bg-card) hover:border-(--nb-color-focus)'}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${formData.staffId === staff._id ? 'bg-blue-600 text-white' : 'bg-(--nb-color-bg) text-(--nb-color-muted)'}`}>
                                                            {staff.fullName?.charAt(0)}
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-black text-(--nb-color-fg) leading-tight">{staff.fullName}</p>
                                                            <p className="text-[10px] text-(--nb-color-muted) uppercase tracking-widest font-bold">{staff.role || t('finance.payroll.runModal.fallbacks.personnel', { defaultValue: 'Personnel' })}</p>
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
                                <div className="text-center py-12 space-y-6 bg-(--nb-color-bg) rounded-4xl border-2 border-dashed border-(--nb-color-border)">
                                    <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-blue-50">
                                        <Calculator size={48} className="stroke-[1.5]" />
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-black text-(--nb-color-fg) tracking-tight uppercase">{t('finance.payroll.runModal.bulk.title', { defaultValue: 'Bulk Initialization' })}</h4>
                                        <p className="text-(--nb-color-muted) font-medium max-w-xs mx-auto mt-2 leading-relaxed">
                                            {t('finance.payroll.runModal.bulk.desc', { defaultValue: 'The system will generate draft payroll records for {{staff}} for the fiscal period {{month}}.', staff: t('finance.payroll.runModal.bulk.staffAllActive', { defaultValue: 'all active faculty members' }), month: formData.month })}
                                        </p>
                                    </div>
                                    <div className="flex justify-center gap-3">
                                        <span className="px-4 py-1.5 bg-green-50 text-green-600 text-[10px] font-black uppercase rounded-full border border-green-100">{t('finance.payroll.runModal.bulk.tags.autoApply', { defaultValue: 'Auto-Apply Allowances' })}</span>
                                        <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-full border border-blue-100">{t('finance.payroll.runModal.bulk.tags.metadata', { defaultValue: 'Filing Metadata' })}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-10 border-t border-(--nb-color-border) bg-(--nb-color-bg) flex items-center justify-between">
                    {step === 2 ? (
                        <button onClick={() => setStep(1)} className="px-6 py-4 text-(--nb-color-muted) font-black uppercase text-[10px] tracking-widest hover:text-(--nb-color-fg) flex items-center gap-3 transition-all">
                            <ArrowLeft size={16} /> {t('finance.payroll.runModal.actions.previous', { defaultValue: 'Previous Step' })}
                        </button>
                    ) : (
                        <button onClick={onClose} className="px-6 py-4 text-(--nb-color-muted) font-black uppercase text-[10px] tracking-widest hover:text-(--nb-color-fg) transition-all">
                            {t('finance.payroll.runModal.actions.discard', { defaultValue: 'Discard Pipeline' })}
                        </button>
                    )}

                    <button
                        onClick={step === 1 ? () => setStep(2) : handleRun}
                        disabled={loading || (step === 2 && formData.scope === 'single' && !formData.staffId)}
                        className="bg-(--nb-color-brand) hover:bg-(--nb-color-brand) text-white px-10 py-5 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-(--nb-shadow-md) transition-all disabled:opacity-50 flex items-center gap-3"
                    >
                        {loading
                            ? t('finance.payroll.runModal.actions.processing', { defaultValue: 'Processing Pipeline...' })
                            : step === 1
                                ? t('finance.payroll.runModal.actions.configure', { defaultValue: 'Configure Strategy' })
                                : t('finance.payroll.runModal.actions.execute', { defaultValue: 'Execute Generation' })}
                        {!loading && <ChevronRight size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
