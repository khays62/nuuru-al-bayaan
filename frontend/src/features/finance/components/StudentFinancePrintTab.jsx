import React, { useMemo, useState, useEffect } from 'react';
import { Search, Printer, FileText, UserCheck, ShieldCheck, Download, RotateCcw } from 'lucide-react';
import { openMonthlyInvoicesPreview, openDailyAuditPreview, openPasscardsPreview } from './PrintModals';
import toast from 'react-hot-toast';
import { useInvoicesQuery } from '../hooks/studentFinanceHooks';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import GradeSelect from '../../lookups/components/GradeSelect.jsx';
import ShiftSelect from '../../lookups/components/ShiftSelect.jsx';
import GradeSectionSelect from '../../lookups/components/GradeSectionSelect.jsx';
import { useI18n } from '../../../i18n/useI18n';
import { useAuth } from '../../../auth/AuthContext';

export default function StudentFinancePrintTab() {
    const { t, lang } = useI18n();
    const { hasPermission } = useAuth();

    const canPrint = hasPermission('financePrint', 'print');

    const [classId, setClassId] = useState('');
    const [gradeId, setGradeId] = useState('');
    const [shiftId, setShiftId] = useState('');
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [hasUserSelection, setHasUserSelection] = useState(false);
    const [limit, setLimit] = useState(20);
    const [submittedParams, setSubmittedParams] = useState({});

    const queryUX = {
        enabled: Boolean(submittedParams?.classId),
        staleTime: 60_000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    };

    const invoicesQuery = useInvoicesQuery(submittedParams, queryUX);

    // Only show skeleton on first load; keep rows visible on background refetch.
    const loading = Boolean(invoicesQuery.isLoading);

    useEffect(() => {
        if (!invoicesQuery.isError) return;
        toast.error(t('finance.studentFinance.printTab.toasts.fetchFailed', { defaultValue: 'Failed to fetch students for this class' }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invoicesQuery.isError]);

    const students = useMemo(() => {
        const response = invoicesQuery.data;
        const data = Array.isArray(response)
            ? response
            : (Array.isArray(response?.data) ? response.data : (response?.data?.data || []));

        const studentMap = {};
        (data || []).forEach(inv => {
            const sid = inv?.student?._id;
            if (!sid) return;
            if (!studentMap[sid]) {
                studentMap[sid] = {
                    student: inv.student,
                    totalBalance: 0,
                    invoices: []
                };
            }
            studentMap[sid].totalBalance += (Number(inv.amount || 0) - Number(inv.paidAmount || 0));
            studentMap[sid].invoices.push(inv);
        });

        const studentList = Object.values(studentMap);
        return studentList;
    }, [invoicesQuery.data]);

    useEffect(() => {
        // Reset selection when the query target changes; default behavior is "select all".
        setHasUserSelection(false);
        setSelectedStudents([]);
    }, [submittedParams?.classId]);

    const fetchStudentsByClass = async () => {
        if (!classId) {
            toast.error(t('finance.studentFinance.printTab.toasts.selectClassFirst', { defaultValue: 'Select Grade / Shift / Section first' }));
            return;
        }
        setSubmittedParams({ classId });
    };

    const resetFilters = () => {
        setGradeId('');
        setShiftId('');
        setClassId('');
        setSubmittedParams({});
        setHasUserSelection(false);
        setSelectedStudents([]);
    };

    const toggleStudent = (id) => {
        const allIds = (students || []).map((s) => s?.student?._id).filter(Boolean);
        setHasUserSelection(true);
        setSelectedStudents((prev) => {
            const base = hasUserSelection ? prev : allIds;
            const set = new Set(base);
            if (set.has(id)) set.delete(id);
            else set.add(id);
            return Array.from(set);
        });
    };

    const selectedStudentIds = useMemo(() => {
        if (!hasUserSelection) {
            return (students || []).map((s) => s?.student?._id).filter(Boolean);
        }
        return selectedStudents;
    }, [hasUserSelection, selectedStudents, students]);

    const handlePrintDailyAudit = () => {
        if (!canPrint) {
            toast.error(t('finance.studentFinance.printTab.toasts.noPrintPermission', { defaultValue: 'You do not have permission to print' }));
            return;
        }
        const selectedData = students.filter(s => selectedStudentIds.includes(s.student._id));
        if (selectedData.length === 0) return toast.error(t('finance.studentFinance.printTab.toasts.selectAtLeastOne', { defaultValue: 'Select at least one student' }));
        // This tab doesn't collect transactions/dates; keep behavior consistent but localized.
        openDailyAuditPreview({ transactions: [], i18n: { t, lang } });
    };

    const handlePrintMonthlyInvoices = () => {
        if (!canPrint) {
            toast.error(t('finance.studentFinance.printTab.toasts.noPrintPermission', { defaultValue: 'You do not have permission to print' }));
            return;
        }
        const selectedData = students.filter(s => selectedStudentIds.includes(s.student._id));
        if (selectedData.length === 0) return toast.error(t('finance.studentFinance.printTab.toasts.selectAtLeastOne', { defaultValue: 'Select at least one student' }));
        openMonthlyInvoicesPreview({ students: selectedData, i18n: { t, lang } });
    };

    const handlePrintPasscards = () => {
        if (!canPrint) {
            toast.error(t('finance.studentFinance.printTab.toasts.noPrintPermission', { defaultValue: 'You do not have permission to print' }));
            return;
        }
        const selectedData = students.filter(s => selectedStudentIds.includes(s.student._id));
        if (selectedData.length === 0) return toast.error(t('finance.studentFinance.printTab.toasts.selectAtLeastOne', { defaultValue: 'Select at least one student' }));

        const cards = (selectedData || []).map((s) => {
            const student = s?.student || {};
            const inv0 = Array.isArray(s?.invoices) ? s.invoices[0] : null;
            const gradeName = inv0?.class?.grade?.gradeName || inv0?.class?.grade?.name || inv0?.class?.gradeName || '';
            const section = inv0?.class?.section || inv0?.class?.sectionName || '';
            const classLabel = (
                inv0?.classLabel ||
                inv0?.class?.name ||
                `${gradeName}${section ? ` - ${section}` : ''}`.trim() ||
                student?.currentClass ||
                student?.classLabel ||
                'â€”'
            );

            const shift =
                inv0?.class?.shift?.name ||
                inv0?.class?.shift?.shiftName ||
                inv0?.class?.shift?.label ||
                inv0?.shiftLabel ||
                (typeof inv0?.shift === 'string' ? inv0.shift : (inv0?.shift?.name || inv0?.shift?.shiftName || inv0?.shift?.label)) ||
                'MAIN';

            return {
                fullName: student?.fullName || '',
                studentId: student?.studentId || '',
                classLabel,
                shift,
            };
        });

        const examType = t('finance.studentFinance.printTab.defaults.passcardsExamType', { defaultValue: 'Enrollment' });
        openPasscardsPreview({ cards, examType, i18n: { t, lang } });
    };

    const renderPrintCell = (row, col) => {
        const id = row?.student?._id;
        const selected = Boolean(id && selectedStudentIds.includes(id));
        const balance = Number(row?.totalBalance || 0);

        switch (col.key) {
            case 'selection':
                return (
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selected ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/20' : 'border-(--nb-color-border) bg-(--nb-color-bg-card)'}`}>
                        {selected ? <UserCheck size={14} className="text-white" /> : null}
                    </div>
                );
            case 'studentId':
                return row?.student?.studentId || 'â€”';
            case 'fullName':
                return row?.student?.fullName || 'â€”';
            case 'balance':
                return (
                    <span className={balance > 0 ? 'text-red-500' : 'text-green-600'}>
                        ${balance.toLocaleString()}
                    </span>
                );
            default:
                return '';
        }
    };

    return (
        <div className="p-8 space-y-8 bg-(--nb-color-bg) min-h-screen">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-600/20">
                        <Printer size={24} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-(--nb-color-fg) uppercase tracking-tighter">
                            {t('finance.studentFinance.printTab.title', { defaultValue: 'Finance Reporting Hub' })}
                        </h3>
                        <p className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-[0.2em] mt-1">
                            {t('finance.studentFinance.printTab.subtitle', { defaultValue: 'Bulk Invoice & Audit Processing' })}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3 space-y-6">
                    <div className="bg-(--nb-color-bg-card) p-6 rounded-4xl border border-(--nb-color-border) shadow-(--nb-shadow-sm) flex items-end gap-6">
                        <div className="flex-1 space-y-3">
                            <label className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest ml-1">
                                {t('finance.studentFinance.printTab.labels.selectClass', { defaultValue: 'Select Academic Tier / Class' })}
                            </label>
                            <div className="flex flex-col md:flex-row gap-3">
                                <GradeSelect
                                    value={gradeId}
                                    onChange={(v) => {
                                        setGradeId(v || '');
                                        setClassId('');
                                    }}
                                    placeholder={t('common.filters.grade', { defaultValue: 'Grade' })}
                                    className="h-14 px-6 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-2xl font-black text-xs uppercase"
                                />
                                <ShiftSelect
                                    value={shiftId}
                                    onChange={(v) => {
                                        setShiftId(v || '');
                                        setClassId('');
                                    }}
                                    placeholder={t('common.filters.shift', { defaultValue: 'Shift' })}
                                    className="h-14 px-6 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-2xl font-black text-xs uppercase"
                                />
                                <GradeSectionSelect
                                    gradeId={gradeId}
                                    shiftId={shiftId}
                                    value={classId}
                                    onChange={(v) => setClassId(v || '')}
                                    searchable
                                    maxVisible={7}
                                    placeholder={t('common.filters.section', { defaultValue: 'Section' })}
                                    searchPlaceholder={t('common.search', { defaultValue: 'Searchâ€¦' })}
                                    className="h-14 px-6 bg-(--nb-color-bg) border border-(--nb-color-border) rounded-2xl font-black text-xs uppercase"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={fetchStudentsByClass}
                                variant="brand"
                                size="lg"
                                className="h-14 px-10 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                {t('finance.studentFinance.printTab.actions.fetchRegister', { defaultValue: 'Fetch Register' })}
                            </Button>
                            <Button
                                onClick={resetFilters}
                                variant="neutral"
                                size="lg"
                                icon={<RotateCcw size={16} />}
                                className="h-14 px-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em]"
                                title={t('common.filters.resetTitle', { defaultValue: 'Reset filters' })}
                            >
                                {t('common.actions.reset', { defaultValue: 'Reset' })}
                            </Button>
                        </div>
                    </div>

                    <div className="bg-(--nb-color-bg-card) border border-(--nb-color-border) rounded-4xl shadow-(--nb-shadow-sm)">
                        <div className="p-6 border-b border-(--nb-color-border) flex justify-between items-center bg-(--nb-color-bg)">
                            <h4 className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-widest">
                                {t('finance.studentFinance.printTab.labels.classCensus', { defaultValue: 'Class Census:' })}{' '}
                                {students.length}{' '}
                                {t('finance.studentFinance.printTab.labels.studentsCountSuffix', { defaultValue: 'Students' })}
                            </h4>
                            <div className="flex gap-4">
                                <Button
                                    onClick={() => {
                                        setHasUserSelection(true);
                                        setSelectedStudents(students.map(s => s.student._id));
                                    }}
                                    variant="primary"
                                    size="sm"
                                    className="text-[10px] font-black uppercase tracking-widest shadow-none border-0"
                                >
                                    {t('common.actions.selectAll', { defaultValue: 'Select All' })}
                                </Button>
                                <Button
                                    onClick={() => {
                                        setHasUserSelection(true);
                                        setSelectedStudents([]);
                                    }}
                                    variant="neutral"
                                    size="sm"
                                    className="text-[10px] font-black uppercase tracking-widest shadow-none border-0"
                                >
                                    {t('common.actions.clear', { defaultValue: 'Clear' })}
                                </Button>
                            </div>
                        </div>
                        <div className="max-h-150 overflow-y-auto">
                            <StandardTable
                                isLoading={loading}
                                loadingMessage={t('finance.studentFinance.printTab.loading.streamingRegistry', { defaultValue: 'Streaming Registry Dataâ€¦' })}
                                items={students}
                                rows={(students || []).slice(0, Math.max(1, Number(limit) || 20))}
                                columns={[
                                    {
                                        key: 'selection',
                                        label: t('finance.studentFinance.printTab.columns.selection', { defaultValue: 'Selection' }),
                                        locked: true,
                                        noPrint: true,
                                        thClassName: 'p-4 pl-8 text-[10px] font-black text-(--nb-color-muted) uppercase tracking-[0.2em]',
                                        tdClassName: 'p-4 pl-8 no-print',
                                    },
                                    {
                                        key: 'studentId',
                                        label: t('finance.studentFinance.printTab.columns.studentId', { defaultValue: 'Student ID' }),
                                        thClassName: 'p-4 text-[10px] font-black text-(--nb-color-muted) uppercase tracking-[0.2em]',
                                        tdClassName: 'p-4 font-mono text-xs font-bold text-(--nb-color-muted)',
                                    },
                                    {
                                        key: 'fullName',
                                        label: t('finance.studentFinance.printTab.columns.fullName', { defaultValue: 'Full Name' }),
                                        thClassName: 'p-4 text-[10px] font-black text-(--nb-color-muted) uppercase tracking-[0.2em]',
                                        tdClassName: 'p-4 font-bold text-(--nb-color-fg) group-hover:text-blue-600 transition-colors',
                                    },
                                    {
                                        key: 'balance',
                                        label: t('finance.studentFinance.printTab.columns.balanceStatus', { defaultValue: 'Balance Status' }),
                                        align: 'right',
                                        thClassName: 'p-4 text-right pr-8 text-[10px] font-black text-(--nb-color-muted) uppercase tracking-[0.2em]',
                                        tdClassName: 'p-4 text-right pr-8 font-black tabular-nums',
                                    },
                                ]}
                                storageKey="finance:printTab:students:columns:v1"
                                controlsProps={{
                                    limit,
                                    total: students.length,
                                    onLimit: (v) => setLimit(v),
                                    limits: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 'all'],
                                }}
                                getRowKey={(row) => row.student?._id}
                                emptyTitle={t('finance.studentFinance.printTab.empty.title', { defaultValue: 'Target a class to begin reporting.' })}
                                renderCell={renderPrintCell}
                                tableProps={{
                                    shellClassName: 'ring-0 shadow-none rounded-none',
                                    theadClassName: 'bg-(--nb-color-bg) border-b border-(--nb-color-border)',
                                    useDefaultHeaderStyles: false,
                                    tbodyClassName: '',
                                    renderBody: ({ rows, columns }) => (
                                        <>
                                            {(rows || []).map((row, idx) => {
                                                const id = row?.student?._id;
                                                return (
                                                    <tr
                                                        key={String(id || idx)}
                                                        onClick={() => id && toggleStudent(id)}
                                                        className={
                                                            'border-t border-(--nb-color-border) odd:bg-(--nb-color-bg-card) even:bg-(--nb-color-bg) hover:bg-blue-50/30 cursor-pointer transition-colors group'
                                                        }
                                                    >
                                                        {(columns || []).map((col) => {
                                                            const noPrint = col?.noPrint ? 'no-print' : '';
                                                            const tdClassName = col?.tdClassName || '';
                                                            return (
                                                                <td key={String(col.key)} className={`${tdClassName} ${noPrint}`.trim()}>
                                                                    {renderPrintCell(row, col)}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                        </>
                                    ),
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-(--nb-color-bg-card) p-8 rounded-[2.5rem] border border-(--nb-color-border) shadow-(--nb-shadow-md) space-y-6">
                        <h4 className="text-[10px] font-black text-(--nb-color-muted) uppercase tracking-[0.2em] text-center border-b border-(--nb-color-border) pb-4">
                            {t('finance.studentFinance.printTab.sections.reportTools', { defaultValue: 'Report Generation Tools' })}
                        </h4>

                        <Button
                            onClick={handlePrintMonthlyInvoices}
                            disabled={!canPrint}
                            variant="neutral"
                            size="lg"
                            className="w-full group mt-4 h-24 border-2 border-transparent rounded-4xl flex flex-col items-center justify-center gap-2 transition-all hover:shadow-(--nb-shadow-md) hover:-translate-y-1"
                            title={!canPrint ? t('finance.studentFinance.printTab.toasts.noPrintPermission', { defaultValue: 'You do not have permission to print' }) : undefined}
                        >
                            <FileText className="text-blue-600 group-hover:scale-110 transition-transform" size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {t('finance.studentFinance.printTab.actions.monthlyInvoices', { defaultValue: 'Monthly Invoices' })}
                            </span>
                        </Button>

                        <Button
                            onClick={handlePrintDailyAudit}
                            disabled={!canPrint}
                            variant="neutral"
                            size="lg"
                            className="w-full group h-24 border-2 border-transparent rounded-4xl flex flex-col items-center justify-center gap-2 transition-all hover:shadow-(--nb-shadow-md) hover:-translate-y-1"
                            title={!canPrint ? t('finance.studentFinance.printTab.toasts.noPrintPermission', { defaultValue: 'You do not have permission to print' }) : undefined}
                        >
                            <ShieldCheck className="text-amber-500 group-hover:scale-110 transition-transform" size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {t('finance.studentFinance.printTab.actions.dailyAuditLedger', { defaultValue: 'Daily Audit Ledger' })}
                            </span>
                        </Button>

                        <Button
                            onClick={handlePrintPasscards}
                            disabled={!canPrint}
                            variant="neutral"
                            size="lg"
                            className="w-full group h-24 border-2 border-transparent rounded-4xl flex flex-col items-center justify-center gap-2 transition-all hover:shadow-(--nb-shadow-md) hover:-translate-y-1"
                            title={!canPrint ? t('finance.studentFinance.printTab.toasts.noPrintPermission', { defaultValue: 'You do not have permission to print' }) : undefined}
                        >
                            <Download className="text-purple-600 group-hover:scale-110 transition-transform" size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {t('finance.studentFinance.printTab.actions.enrollmentPasscards', { defaultValue: 'Enrollment Passcards' })}
                            </span>
                        </Button>
                    </div>

                    <div className="bg-blue-900 p-8 rounded-[2.5rem] text-white shadow-(--nb-shadow-md) relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                        <h5 className="font-black uppercase tracking-[0.2em] text-[10px] text-blue-300 mb-4">
                            {t('finance.studentFinance.printTab.sections.printQueueAdvice', { defaultValue: 'Print Queue Advice' })}
                        </h5>
                        <p className="text-xs text-blue-100 leading-relaxed opacity-80">
                            {t('finance.studentFinance.printTab.hints.bulkPrinting', { defaultValue: 'Bulk printing multiple invoices may take up to 30 seconds to render high-resolution institutional watermarks.' })}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
