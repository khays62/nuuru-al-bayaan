import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, ClipboardList, Clock, CheckCircle, XCircle, RefreshCw, Printer, CreditCard, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import financeService from '../api/finance';
import { listGradeSections } from '../../grades/api/gradeSections';
import { listStudents } from '../../students/api/studentsApi';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';

const paymentMethods = ['Cash', 'Bank', 'Mobile Money', 'Cheque'];

const normalizeList = (payload) => Array.isArray(payload)
    ? payload
    : (payload?.data?.data || payload?.data || []);

const statusBadge = (status) => {
    const base = 'px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest';
    switch (status) {
        case 'Completed':
            return `${base} bg-green-100 text-green-700`;
        case 'Missed':
            return `${base} bg-amber-100 text-amber-700`;
        case 'Cancelled':
            return `${base} bg-red-100 text-red-700`;
        default:
            return `${base} bg-blue-100 text-blue-700`;
    }
};

const formatClassLabel = (cls) => {
    if (!cls) return '—';
    if (typeof cls === 'string') return cls;
    const gradeLabel = cls?.grade?.gradeName || cls?.grade?.name || cls?.gradeName || '';
    const sectionLabel = cls?.section || cls?.name || '';
    const label = `${gradeLabel}${sectionLabel ? ` - ${sectionLabel}` : ''}`.trim();
    return label || '—';
};

const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '—';
    const dateLabel = d.toLocaleDateString();
    return timeStr ? `${dateLabel} ${timeStr}` : dateLabel;
};

const AppointmentSlip = ({ appointment }) => {
    const cls = appointment?.class;
    const classLabel = formatClassLabel(cls);
    const yearName = appointment?.academicYear?.yearName || '—';
    const amountType = appointment?.amountType?.name || '—';

    return `
        <html>
            <head>
                <title>Appointment Slip</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; }
                    .header { text-align: center; font-weight: 800; font-size: 18px; margin-bottom: 12px; }
                    .subtitle { text-align: center; font-size: 12px; letter-spacing: 2px; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    td { border: 1px solid #000; padding: 10px; font-size: 13px; }
                    .muted { color: #444; font-weight: 700; }
                    .signature { margin-top: 24px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">FINANCE APPOINTMENT SLIP</div>
                <div class="subtitle">${yearName}</div>
                <table>
                    <tr><td class="muted">Student Name</td><td>${appointment?.student?.fullName || '—'}</td></tr>
                    <tr><td class="muted">Student ID</td><td>${appointment?.student?.studentId || '—'}</td></tr>
                    <tr><td class="muted">Class / Grade</td><td>${classLabel}</td></tr>
                    <tr><td class="muted">Amount Type</td><td>${amountType}</td></tr>
                    <tr><td class="muted">Expected Amount</td><td>$${Number(appointment?.expectedAmount || 0).toFixed(2)}</td></tr>
                    <tr><td class="muted">Appointment Date & Time</td><td>${formatDateTime(appointment?.appointmentDate, appointment?.appointmentTime)}</td></tr>
                    <tr><td class="muted">Payment Method</td><td>${appointment?.paymentMethod || '—'}</td></tr>
                </table>
                <div class="signature">Signature: ___________________________</div>
            </body>
        </html>
    `;
};

const PaymentModal = ({ open, onClose, onSubmit, accounts, appointment }) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState(paymentMethods[0]);
    const [accountId, setAccountId] = useState('');
    const [reference, setReference] = useState('');
    const [remarks, setRemarks] = useState('');

    useEffect(() => {
        if (!open) return;
        setAmount(String(appointment?.expectedAmount || ''));
        setMethod(appointment?.paymentMethod || paymentMethods[0]);
        setAccountId('');
        setReference('');
        setRemarks('');
    }, [open, appointment]);

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h3 className="text-lg font-black uppercase">Start Payment</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Appointment Payment</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-900">✕</button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paid Amount</label>
                            <input className="w-full px-4 py-2 border rounded-xl" value={amount} onChange={e => setAmount(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</label>
                            <select className="w-full px-4 py-2 border rounded-xl" value={method} onChange={e => setMethod(e.target.value)}>
                                {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account</label>
                            <select className="w-full px-4 py-2 border rounded-xl" value={accountId} onChange={e => setAccountId(e.target.value)}>
                                <option value="">-- Select Account --</option>
                                {accounts.map(a => <option key={a._id} value={a._id}>{a.name || a.accountName || a.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference</label>
                            <input className="w-full px-4 py-2 border rounded-xl" value={reference} onChange={e => setReference(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remarks</label>
                        <input className="w-full px-4 py-2 border rounded-xl" value={remarks} onChange={e => setRemarks(e.target.value)} />
                    </div>
                </div>
                <div className="p-6 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl border">Cancel</button>
                    <button
                        onClick={() => onSubmit({ paidAmount: amount, method, accountId, reference, remarks })}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
                    >
                        Confirm Payment
                    </button>
                </div>
            </div>
        </div>
    );
};

const RescheduleModal = ({ open, onClose, onSubmit }) => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (!open) return;
        setDate('');
        setTime('');
        setReason('');
    }, [open]);

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h3 className="text-lg font-black uppercase">Reschedule Appointment</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Date & Time</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-900">✕</button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Date</label>
                            <input type="date" className="w-full px-4 py-2 border rounded-xl" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Time</label>
                            <input type="time" className="w-full px-4 py-2 border rounded-xl" value={time} onChange={e => setTime(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason</label>
                        <input className="w-full px-4 py-2 border rounded-xl" value={reason} onChange={e => setReason(e.target.value)} />
                    </div>
                </div>
                <div className="p-6 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl border">Cancel</button>
                    <button
                        onClick={() => onSubmit({ appointmentDate: date, appointmentTime: time, reason })}
                        className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold"
                    >
                        Reschedule
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function FinanceAppointments() {
    const [activeTab, setActiveTab] = useState('create');
    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState([]);
    const [years, setYears] = useState([]);
    const [amountTypes, setAmountTypes] = useState([]);
    const [accounts, setAccounts] = useState([]);

    const [studentSearch, setStudentSearch] = useState('');
    const [studentClassFilter, setStudentClassFilter] = useState('');
    const [studentResults, setStudentResults] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const [form, setForm] = useState({
        academicYear: '',
        classId: '',
        amountTypeId: '',
        expectedAmount: '',
        appointmentDate: '',
        appointmentTime: '',
        paymentMethod: paymentMethods[0],
        notes: '',
        overrideConflict: false
    });

    const [listData, setListData] = useState([]);

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);

    const fetchReferenceData = async () => {
        try {
            const [clsRes, yrRes, catRes, accRes] = await Promise.all([
                listGradeSections({ limit: 100 }),
                financeService.getAcademicYears(),
                financeService.getFinanceCategories('fee'),
                financeService.getAccounts()
            ]);
            let classList = normalizeList(clsRes);
            if (classList.length === 0) {
                try {
                    const fallback = await financeService.getGradeSections({ limit: 100 });
                    classList = normalizeList(fallback);
                } catch {
                    // ignore
                }
            }
            setClasses(classList);
            setYears(normalizeList(yrRes));
            const cats = normalizeList(catRes).filter(c => String(c?.name || '').trim().toLowerCase() !== 'previous balance');
            setAmountTypes(cats);
            setAccounts(normalizeList(accRes));
        } catch {
            toast.error('Failed to load appointment resources');
        }
    };

    useEffect(() => {
        fetchReferenceData();
    }, []);

    useEffect(() => {
        if (years.length > 0 && !form.academicYear) {
            setForm((prev) => ({ ...prev, academicYear: years[0]?._id || '' }));
        }
    }, [years, form.academicYear]);

    const handleStudentSearch = async () => {
        try {
            const classId = studentClassFilter || form.classId || undefined;
            if (!classId) {
                toast.error('Select a class first');
                setStudentResults([]);
                return;
            }

            const summary = await financeService.getStudentSummary({
                search: studentSearch || undefined,
                classId,
                academicYearId: form.academicYear || undefined
            });

            let results = Array.isArray(summary)
                ? summary.map(s => ({
                    _id: s._id,
                    studentId: s.studentId,
                    fullName: s.fullName,
                    phoneNumber: s.phone,
                    classLabel: s.className || '',
                    classId
                }))
                : [];

            if (results.length === 0 && form.academicYear) {
                const fallbackSummary = await financeService.getStudentSummary({
                    search: studentSearch || undefined,
                    classId
                });
                results = Array.isArray(fallbackSummary)
                    ? fallbackSummary.map(s => ({
                        _id: s._id,
                        studentId: s.studentId,
                        fullName: s.fullName,
                        phoneNumber: s.phone,
                        classLabel: s.className || '',
                        classId
                    }))
                    : [];
            }

            if (results.length === 0) {
                const res = await listStudents({
                    search: studentSearch || undefined,
                    classId,
                    academicYear: form.academicYear || undefined,
                    includeClosed: 'true',
                    limit: 100
                });
                results = (res?.data || []).map(s => ({
                    _id: s._id,
                    studentId: s.studentId,
                    fullName: s.fullName,
                    phoneNumber: s.phoneNumber || s.contactNumber,
                    classLabel: formatClassLabel(s.class || s.currentClass || ''),
                    classId
                }));
            }

            setStudentResults(results);
        } catch {
            setStudentResults([]);
        }
    };

    const handleSelectStudent = (student) => {
        setSelectedStudent(student);
        if (student?.classId) {
            setForm((prev) => ({ ...prev, classId: student.classId }));
        }
    };

    const resetForm = () => {
        setSelectedStudent(null);
        setStudentResults([]);
        setForm({
            academicYear: years[0]?._id || '',
            classId: '',
            amountTypeId: '',
            expectedAmount: '',
            appointmentDate: '',
            appointmentTime: '',
            paymentMethod: paymentMethods[0],
            notes: '',
            overrideConflict: false
        });
    };

    const handleCreate = async () => {
        if (!selectedStudent?._id) return toast.error('Select a student');
        if (!form.academicYear) return toast.error('Select academic year');
        if (!form.classId) return toast.error('Select class');
        if (!form.amountTypeId) return toast.error('Select amount type');
        if (!form.expectedAmount) return toast.error('Expected amount required');
        if (!form.appointmentDate || !form.appointmentTime) return toast.error('Appointment date & time required');

        const dateTime = new Date(`${form.appointmentDate}T${form.appointmentTime}`);
        if (Number.isNaN(dateTime.getTime()) || dateTime <= new Date()) {
            return toast.error('Appointment date must be in the future');
        }

        setLoading(true);
        try {
            await financeService.createAppointment({
                academicYear: form.academicYear,
                studentId: selectedStudent._id,
                classId: form.classId,
                amountTypeId: form.amountTypeId,
                expectedAmount: Number(form.expectedAmount),
                appointmentDate: form.appointmentDate,
                appointmentTime: form.appointmentTime,
                paymentMethod: form.paymentMethod,
                notes: form.notes,
                overrideConflict: form.overrideConflict
            });
            toast.success('Appointment created');
            resetForm();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to create appointment');
        } finally {
            setLoading(false);
        }
    };

    const loadList = async (mode) => {
        setLoading(true);
        try {
            if (mode === 'today') {
                const res = await financeService.getTodayAppointments();
                setListData(res?.data || []);
            } else if (mode === 'missed') {
                const res = await financeService.getMissedAppointments();
                setListData(res?.data || []);
            } else if (mode === 'completed') {
                const res = await financeService.getCompletedAppointments();
                setListData(res?.data || []);
            } else {
                const res = await financeService.listAppointments({ limit: 200 });
                setListData(res?.data || []);
            }
        } catch {
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'create') return;
        loadList(activeTab);
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'create') return;
        const timer = setTimeout(() => {
            if (studentSearch || studentClassFilter) {
                handleStudentSearch();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [studentSearch, studentClassFilter, form.academicYear, activeTab]);

    const openPayment = (appt) => {
        setSelectedAppointment(appt);
        setPaymentModalOpen(true);
    };

    const openReschedule = (appt) => {
        setSelectedAppointment(appt);
        setRescheduleModalOpen(true);
    };

    const handlePaymentSubmit = async (payload) => {
        if (!selectedAppointment?._id) return;
        setLoading(true);
        try {
            await financeService.startAppointmentPayment(selectedAppointment._id, payload);
            toast.success('Payment completed');
            setPaymentModalOpen(false);
            loadList(activeTab);
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Payment failed');
        } finally {
            setLoading(false);
        }
    };

    const handleReschedule = async (payload) => {
        if (!selectedAppointment?._id) return;
        setLoading(true);
        try {
            await financeService.rescheduleAppointment(selectedAppointment._id, payload);
            toast.success('Appointment rescheduled');
            setRescheduleModalOpen(false);
            loadList(activeTab);
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Reschedule failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (appt) => {
        if (!window.confirm('Cancel this appointment?')) return;
        setLoading(true);
        try {
            await financeService.cancelAppointment(appt._id);
            toast.success('Appointment cancelled');
            loadList(activeTab);
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Cancel failed');
        } finally {
            setLoading(false);
        }
    };

    const handlePrintSlip = async (appt) => {
        try {
            const data = await financeService.getAppointmentSlip(appt._id);
            const win = window.open('', '_blank');
            if (!win) return;
            win.document.open();
            win.document.write(AppointmentSlip({ appointment: data?.appointment || appt }));
            win.document.close();
            win.print();
        } catch {
            toast.error('Failed to print slip');
        }
    };

    const listTitle = useMemo(() => {
        switch (activeTab) {
            case 'today': return "Today's Appointments";
            case 'missed': return 'Missed Appointments';
            case 'completed': return 'Completed Appointments';
            default: return 'Appointment List';
        }
    }, [activeTab]);

    return (
        <div className="space-y-6">
            <div className="bg-white border rounded-xl overflow-hidden p-2 flex flex-wrap gap-2">
                {[
                    { key: 'create', label: 'Create Appointment', icon: CalendarCheck },
                    { key: 'list', label: 'Appointment List', icon: ClipboardList },
                    { key: 'today', label: "Today's Appointments", icon: Clock },
                    { key: 'missed', label: 'Missed Appointments', icon: XCircle },
                    { key: 'completed', label: 'Completed Appointments', icon: CheckCircle },
                ].map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${active ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Icon size={14} /> {tab.label}
                        </button>
                    );
                })}
                <button
                    onClick={() => loadList(activeTab === 'create' ? 'list' : activeTab)}
                    className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg text-gray-600 hover:bg-gray-100"
                >
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {activeTab === 'create' ? (
                <div className="bg-white border rounded-xl min-h-125 p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Year</label>
                            <select
                                className="w-full h-11 px-4 border rounded-xl"
                                value={form.academicYear}
                                onChange={e => setForm(prev => ({ ...prev, academicYear: e.target.value }))}
                            >
                                <option value="">-- Choose Year --</option>
                                {years.map(y => <option key={y._id} value={y._id}>{y.yearName}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Class / Grade</label>
                            <select
                                className="w-full h-11 px-4 border rounded-xl"
                                value={form.classId}
                                onChange={e => setForm(prev => ({ ...prev, classId: e.target.value }))}
                            >
                                <option value="">-- Choose Class --</option>
                                {classes.map(cls => <option key={cls._id} value={cls._id}>{formatClassLabel(cls)}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                            <Search size={12} /> Student Search
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input
                                className="h-11 px-4 py-2 border rounded-xl"
                                placeholder="Search name or ID"
                                value={studentSearch}
                                onChange={e => setStudentSearch(e.target.value)}
                            />
                            <select
                                className="h-11 px-4 py-2 border rounded-xl"
                                value={studentClassFilter}
                                onChange={e => setStudentClassFilter(e.target.value)}
                            >
                                <option value="">All Classes</option>
                                {classes.map(cls => <option key={cls._id} value={cls._id}>{formatClassLabel(cls)}</option>)}
                            </select>
                            <button onClick={handleStudentSearch} className="h-11 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold">Search</button>
                        </div>
                        <div className="mt-3">
                            <select
                                className="w-full h-11 px-4 py-2 border rounded-xl"
                                value={selectedStudent?._id || ''}
                                onChange={e => {
                                    const target = studentResults.find(s => s._id === e.target.value);
                                    handleSelectStudent(target);
                                }}
                            >
                                <option value="">-- Select Student --</option>
                                {studentResults.map(s => (
                                    <option key={s._id} value={s._id}>
                                        {s.fullName} ({s.studentId})
                                    </option>
                                ))}
                            </select>
                        </div>
                        {selectedStudent && (
                            <div className="mt-3 text-xs text-slate-600">
                                Selected: <strong>{selectedStudent.fullName}</strong> ({selectedStudent.studentId})
                            </div>
                        )}
                        {studentResults.length > 0 && (
                            <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
                                <StandardTable
                                    isLoading={false}
                                    items={studentResults}
                                    rows={studentResults}
                                    columns={[
                                        { key: 'id', label: 'ID' },
                                        { key: 'name', label: 'Student Name' },
                                        { key: 'class', label: 'Class' },
                                        { key: 'contact', label: 'Contact' },
                                        { key: 'action', label: 'Action', align: 'right' },
                                    ]}
                                    storageKey="finance:appointments:student-results"
                                    getRowKey={(row) => row?._id}
                                    emptyTitle="No students found"
                                    tableProps={{ shellClassName: 'ring-0 shadow-none rounded-none' }}
                                    renderCell={(row, col) => {
                                        switch (col.key) {
                                            case 'id':
                                                return <span className="text-xs font-mono font-bold">{row?.studentId || '—'}</span>;
                                            case 'name':
                                                return <span className="text-sm font-bold">{row?.fullName || '—'}</span>;
                                            case 'class':
                                                return <span className="text-xs font-bold">{formatClassLabel(row?.classLabel || row?.class)}</span>;
                                            case 'contact':
                                                return <span className="text-xs">{row?.phoneNumber || row?.contactNumber || '—'}</span>;
                                            case 'action':
                                                return (
                                                    <button
                                                        onClick={() => handleSelectStudent(row)}
                                                        className="px-3 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase"
                                                    >
                                                        Select
                                                    </button>
                                                );
                                            default:
                                                return '—';
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Type</label>
                            <select
                                className="w-full h-11 px-4 py-2 border rounded-xl"
                                value={form.amountTypeId}
                                onChange={e => setForm(prev => ({ ...prev, amountTypeId: e.target.value }))}
                            >
                                <option value="">-- Choose Amount Type --</option>
                                {amountTypes.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected Amount</label>
                            <input
                                className="w-full h-11 px-4 py-2 border rounded-xl"
                                value={form.expectedAmount}
                                onChange={e => setForm(prev => ({ ...prev, expectedAmount: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Appointment Date</label>
                            <input
                                type="date"
                                className="w-full h-11 px-4 py-2 border rounded-xl"
                                value={form.appointmentDate}
                                onChange={e => setForm(prev => ({ ...prev, appointmentDate: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Appointment Time</label>
                            <input
                                type="time"
                                className="w-full h-11 px-4 py-2 border rounded-xl"
                                value={form.appointmentTime}
                                onChange={e => setForm(prev => ({ ...prev, appointmentTime: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</label>
                            <select
                                className="w-full h-11 px-4 py-2 border rounded-xl"
                                value={form.paymentMethod}
                                onChange={e => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                            >
                                {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes (Optional)</label>
                        <input
                            className="w-full h-11 px-4 py-2 border rounded-xl"
                            value={form.notes}
                            onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                        />
                    </div>

                    <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                        <input
                            type="checkbox"
                            checked={form.overrideConflict}
                            onChange={e => setForm(prev => ({ ...prev, overrideConflict: e.target.checked }))}
                        />
                        Admin Override Conflict
                    </label>

                    <div className="flex gap-3">
                        <button
                            disabled={loading}
                            onClick={handleCreate}
                            className="px-6 py-2 rounded-xl bg-blue-600 text-white font-black uppercase text-xs tracking-widest"
                        >
                            Save Appointment
                        </button>
                        <button onClick={resetForm} className="px-6 py-2 rounded-xl border font-black uppercase text-xs tracking-widest">Cancel</button>
                    </div>
                </div>
            ) : (
                <div className="bg-white border rounded-xl min-h-125 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black uppercase">{listTitle}</h3>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{listData.length} items</span>
                    </div>

                    <StandardTable
                        isLoading={loading}
                        loadingMessage="Loading..."
                        items={listData}
                        rows={listData}
                        columns={[
                            { key: 'id', label: 'ID' },
                            { key: 'student', label: 'Student' },
                            { key: 'class', label: 'Class' },
                            { key: 'amountType', label: 'Amount Type' },
                            { key: 'expected', label: 'Expected' },
                            { key: 'dateTime', label: 'Date & Time' },
                            { key: 'status', label: 'Status' },
                            { key: 'actions', label: 'Actions', align: 'right', noPrint: true, tdClassName: 'no-print' },
                        ]}
                        storageKey="finance:appointments:list"
                        getRowKey={(row) => row?._id}
                        emptyTitle="No appointments found"
                        tableProps={{ shellClassName: 'ring-0 shadow-none rounded-none' }}
                        renderCell={(row, col) => {
                            switch (col.key) {
                                case 'id':
                                    return <span className="text-xs font-mono font-bold">{row?.appointmentId || row?._id?.slice(-6) || '—'}</span>;
                                case 'student':
                                    return (
                                        <div>
                                            <div className="font-bold">{row?.student?.fullName || '—'}</div>
                                            <div className="text-xs text-slate-400">{row?.student?.studentId || ''}</div>
                                        </div>
                                    );
                                case 'class':
                                    return <span className="text-xs font-bold">{formatClassLabel(row?.class)}</span>;
                                case 'amountType':
                                    return <span className="text-xs font-bold">{row?.amountType?.name || '—'}</span>;
                                case 'expected':
                                    return <span className="text-xs font-bold">${Number(row?.expectedAmount || 0).toFixed(2)}</span>;
                                case 'dateTime':
                                    return <span className="text-xs font-bold">{formatDateTime(row?.appointmentDate, row?.appointmentTime)}</span>;
                                case 'status':
                                    return <span className={statusBadge(row?.status)}>{row?.status}</span>;
                                case 'actions':
                                    return (
                                        <div className="flex items-center gap-2 justify-end">
                                            {row?.status === 'Pending' && (
                                                <button onClick={() => openPayment(row)} className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase flex items-center gap-1"><CreditCard size={12} /> Pay</button>
                                            )}
                                            {row?.status === 'Pending' && (
                                                <button onClick={() => openReschedule(row)} className="px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-black uppercase">Reschedule</button>
                                            )}
                                            {row?.status !== 'Completed' && (
                                                <button onClick={() => handleCancel(row)} className="px-2 py-1 rounded-lg bg-red-500 text-white text-[10px] font-black uppercase">Cancel</button>
                                            )}
                                            <button onClick={() => handlePrintSlip(row)} className="px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-black uppercase flex items-center gap-1"><Printer size={12} /> Slip</button>
                                        </div>
                                    );
                                default:
                                    return '—';
                            }
                        }}
                    />
                </div>
            )}

            <PaymentModal
                open={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                onSubmit={handlePaymentSubmit}
                accounts={accounts}
                appointment={selectedAppointment}
            />
            <RescheduleModal
                open={rescheduleModalOpen}
                onClose={() => setRescheduleModalOpen(false)}
                onSubmit={handleReschedule}
            />
        </div>
    );
}
