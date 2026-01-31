import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, Printer, RotateCcw } from 'lucide-react';
import StudentTable from '../components/StudentTable';
import StudentForm from '../components/StudentForm';
import Modal from '../../../shared/components/ui/Modal.jsx';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    listStudents,
    createStudent,
    updateStudent as updateStudentApi,
    getStudentProfile as fetchStudentProfile,
} from '../api/studentsApi';
import { getAcademicYears, getGrades, getShifts } from '../../lookups/api/lookups';
import { listGradeSections } from '../../grades/api/gradeSections';
import { EVENTS, emitStudentsChanged } from '../../../utils/events';
import { useRealtimeInvalidation } from '../../../shared/realtime/useRealtimeInvalidation';
import SearchInput from '../../../shared/components/DataToolbar/SearchInput.jsx';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import AcademicYearSelect from '../../lookups/components/AcademicYearSelect';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import FilterDropdownSelect from '../../../shared/components/DataToolbar/FilterDropdownSelect.jsx';
import EnrollmentCohortToolbar from '../../../shared/components/filters/EnrollmentCohortToolbar.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import PdfDownloadButton from '../../../shared/components/exports/downloadButtons/PdfDownloadButton.jsx';
import ExcelDownloadButton from '../../../shared/components/exports/downloadButtons/ExcelDownloadButton.jsx';
import CsvDownloadButton from '../../../shared/components/exports/downloadButtons/CsvDownloadButton.jsx';
import CopyTableButton from '../../../shared/components/exports/downloadButtons/CopyTableButton.jsx';
import headerImg from '../../../assets/nuuruBayaanHeader.png';
import PrintHeader from '../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../shared/components/print/PrintFooter.jsx';
import TableState from '../../../shared/components/table/TableState.jsx';
import PaginationBar from '../../../shared/components/table/PaginationBar.jsx';
import { useClientSort } from '../../../shared/hooks/useClientSort';
import Card from '../../../shared/components/ui/Card.jsx';
import Button from '../../../shared/components/ui/Button.jsx';

import { useAuth } from '../../../auth/AuthContext';
import { useDebounce } from '../../../hooks/useDebounce';
import { studentKeys } from '../queryKeys';

// Student listing page using reusable entity list hook + pagination controls
export default function StudentPage() {
    const { auth, hasPermission } = useAuth();
    const queryClient = useQueryClient();
    const isAdmin = String(auth?.user?.role || '').toLowerCase() === 'admin';
    const canAddStudent = isAdmin || hasPermission('students', 'add');
    const canEditStudent = isAdmin || hasPermission('students', 'edit');
    // Students module doesn't define a separate "print" action; treat printing/exports as data download.
    const canDownloadStudents = isAdmin || hasPermission('students', 'download');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [loadingEdit, setLoadingEdit] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [gradeSectionFilter, setGradeSectionFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    // Enrollment status tabs (active/inactive/promoted/graduated/transferred/withdrawn/all)
    // 'open' means: show active + inactive enrollments (default)
    const [enrollmentStatus, setEnrollmentStatus] = useState('open');
    const [cohortId, setCohortId] = useState('');
    // Toolbar cascading filters
    const [yearFilter, setYearFilter] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [shiftFilter, setShiftFilter] = useState('');
    // removed: legacy filterSections state (using GradeSectionSelect which loads itself)
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 350);

    const lastLocalStudentsEventRef = useRef({ ts: 0, id: null });

    // Dynamic extra filters: ensure clearing enrollmentStatus/includeClosed when switching back to 'open'
    const extraFilters = useMemo(() => {
        const includeClosed = enrollmentStatus === 'all' ? 'true' : '';
        const ef = {
            gradeSectionId: gradeSectionFilter,
            status: statusFilter,
            academicYear: yearFilter,
            grade: gradeFilter,
            shift: shiftFilter,
            cohortId,
            // Always include keys (may be empty string) so stale values are overwritten
            enrollmentStatus: enrollmentStatus === 'open' ? '' : (enrollmentStatus || ''),
            includeClosed,
        };
        return ef;
    }, [gradeSectionFilter, statusFilter, yearFilter, gradeFilter, shiftFilter, enrollmentStatus, cohortId]);

    const yearsQuery = useQuery({
        queryKey: studentKeys.lookupsAcademicYears(),
        queryFn: async () => {
            const ys = await getAcademicYears();
            return Array.isArray(ys) ? ys : (ys?.data || []);
        },
        placeholderData: (prev) => prev,
    });
    const gradesQuery = useQuery({
        queryKey: studentKeys.lookupsGrades(),
        queryFn: async () => {
            const gs = await getGrades();
            return Array.isArray(gs) ? gs : (gs?.data || []);
        },
        placeholderData: (prev) => prev,
    });
    const shiftsQuery = useQuery({
        queryKey: studentKeys.lookupsShifts(),
        queryFn: async () => {
            const ss = await getShifts();
            return Array.isArray(ss) ? ss : (ss?.data || []);
        },
        placeholderData: (prev) => prev,
    });

    const years = yearsQuery.data || [];
    const grades = gradesQuery.data || [];
    const shifts = shiftsQuery.data || [];

    const sectionsQuery = useQuery({
        queryKey: studentKeys.gradeSectionsByGradeShift({ gradeId: gradeFilter, shiftId: shiftFilter, limit: 200 }),
        enabled: Boolean(gradeFilter && shiftFilter),
        queryFn: async ({ signal }) => {
            const res = await listGradeSections({ grade: gradeFilter, shift: shiftFilter, limit: 200 }, { signal });
            return Array.isArray(res) ? res : (res?.data || []);
        },
        placeholderData: (prev) => prev,
    });
    const sections = sectionsQuery.data || [];

    const classesQuery = useQuery({
        queryKey: studentKeys.gradeSectionsStudentsForm({ limit: 1000, sortBy: 'createdAt', sortDir: 'desc' }),
        queryFn: async ({ signal }) => {
            const result = await listGradeSections({ limit: 1000, sortBy: 'createdAt', sortDir: 'desc' }, { signal });
            const arr = result?.data || [];
            return arr.map(item => {
                const gradeName = item?.grade?.gradeName || 'Grade';
                const section = item?.section || '1';
                const yearName = item?.academicYear?.yearName || '';
                const shiftName = item?.shift?.shiftName || '';
                const tail = [yearName, shiftName].filter(Boolean).join(' - ');
                const label = tail ? `${gradeName} - Sec ${section} (${tail})` : `${gradeName} - Sec ${section}`;
                return { _id: item._id, className: label };
            });
        },
        placeholderData: (prev) => prev,
    });
    const classes = classesQuery.data || [];

    const listParams = useMemo(() => ({
        page,
        limit,
        search: debouncedSearch,
        sortBy: 'createdAt',
        sortDir: 'desc',
        ...extraFilters,
    }), [page, limit, debouncedSearch, extraFilters]);

    const studentsQuery = useQuery({
        queryKey: studentKeys.adminList(listParams),
        queryFn: async ({ signal }) => {
            const result = await listStudents(listParams, { signal });
            return {
                data: Array.isArray(result?.data) ? result.data : [],
                meta: result?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 },
            };
        },
        placeholderData: (prev) => prev,
    });

    const students = studentsQuery.data?.data || [];
    const meta = studentsQuery.data?.meta || { page, limit, total: 0, totalPages: 1 };
    const isLoading = Boolean(studentsQuery.isLoading && studentsQuery.data == null);
    const error = studentsQuery.isError ? studentsQuery.error : null;

    const refresh = useCallback(() => {
        studentsQuery.refetch();
    }, [studentsQuery]);

    const silentRefresh = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: studentKeys.adminListBase });
    }, [queryClient]);

    const resetAndReload = useCallback(({ search = '' } = {}) => {
        setSearchTerm(search);
        setPage(1);
        queryClient.invalidateQueries({ queryKey: studentKeys.adminListBase });
    }, [queryClient]);

    const setSearch = useCallback((v) => {
        setSearchTerm(v || '');
        setPage(1);
    }, []);

    const {
        sortBy,
        sortDir,
        onSort,
        sortedRows: sortedStudentsForView,
    } = useClientSort(students, {
        initialSortBy: 'createdAt',
        initialSortDir: 'desc',
        getValue: (st, field) => {
            switch (field) {
                case 'studentId':
                    return String(st?.studentId || '').toLowerCase();
                case 'fullName':
                    return String(st?.fullName || '').toLowerCase();
                case 'createdAt':
                default:
                    return new Date(st?.createdAt || 0).getTime();
            }
        },
    });

    // No filter persistence
    // Toolbar Section options are handled by GradeSectionSelect internally; simply clear selected section when parents change
    useEffect(() => {
        setGradeSectionFilter('');
    }, [yearFilter, gradeFilter, shiftFilter]);

    useRealtimeInvalidation(
        [EVENTS.STUDENTS_CHANGED, EVENTS.GRADE_SECTIONS_CHANGED],
        (detail, evt) => {
            const name = String(evt?.type || '');
            if (name === EVENTS.STUDENTS_CHANGED) {
                // Avoid duplicate refresh bursts from the same action:
                // local emit (this tab) + SSE echo (realtime) for the same student id.
                const src = String(detail?.source || '');
                const id = detail?.id != null ? String(detail.id) : null;
                const now = Date.now();

                if (src === 'realtime') {
                    const last = lastLocalStudentsEventRef.current;
                    if (last?.ts && id && last.id === id && (now - last.ts) < 1200) {
                        return;
                    }
                } else {
                    // Treat anything non-realtime as local.
                    lastLocalStudentsEventRef.current = { ts: now, id };
                }

                // Keep edit modal fast + consistent: clear cached profiles then refresh list silently.
                try { queryClient.removeQueries({ queryKey: studentKeys.adminProfileBase }); } catch { /* ignore */ }
                // invalidateQueries already refetches active observers in React Query v5.
                try { queryClient.invalidateQueries({ queryKey: studentKeys.adminListBase, refetchType: 'active' }); } catch { /* ignore */ }
                return;
            }
            if (name === EVENTS.GRADE_SECTIONS_CHANGED) {
                try { queryClient.invalidateQueries({ queryKey: studentKeys.gradeSectionsBase }); } catch { /* ignore */ }
            }
            void detail;
        },
        { enabled: true }
    );

    const handleAddNew = () => {
        if (!canAddStudent) {
            toast.error('You do not have permission to add students');
            return;
        }
        setEditingStudent(null);
        setIsModalOpen(true);
    };
    // ------------------------------------------------------------
    // Edit Flow Optimization:
    //  1. Furo modal isla markiiba (instant UX) halkii aan ka sugi lahayn profile fetch.
    //  2. Ku soo bandhig xogta liiska (basic) si user u arko form.
    //  3. Kadib si asyncronous ah u cusboonaysii profile dhammeystiran marka la soo helo.
    //  4. Isticmaal cache ku saleysan memory si edit mar labaad ah u deg degsado.
    // ------------------------------------------------------------
    const handleEdit = async (student) => {
        if (!canEditStudent) {
            toast.error('You do not have permission to edit students');
            return;
        }
        // Step 1: Immediate open with basic row data
        setEditingStudent(student);
        setIsModalOpen(true);

        const k = studentKeys.adminProfile(student._id);
        const cached = queryClient.getQueryData(k);
        if (cached && cached.student) {
            const enriched = { ...cached.student };
            if (cached.latestEnrollment?.gradeSection?._id) {
                enriched.classId = cached.latestEnrollment.gradeSection._id;
            }
            setEditingStudent(enriched);
            return;
        }

        setLoadingEdit(true);
        try {
            const profile = await queryClient.fetchQuery({
                queryKey: k,
                queryFn: () => fetchStudentProfile(student._id),
            });
            if (profile && profile.student) {
                const enriched = { ...profile.student };
                if (profile.latestEnrollment?.gradeSection?._id) {
                    enriched.classId = profile.latestEnrollment.gradeSection._id;
                }
                setEditingStudent(enriched);
            } else {
                toast.error('Failed to load full student details');
            }
        } catch (e) {
            try {
                if (import.meta?.env?.DEV || localStorage.getItem('debug:students') === '1') console.error(e);
            } catch { /* ignore */ }
            toast.error('Error loading student details');
        } finally {
            setLoadingEdit(false);
        }
    };
    // Delete flow intentionally unimplemented in Phase 1
    const closeModal = () => { setIsModalOpen(false); setEditingStudent(null); };

    const handleSubmit = async (payload) => {
        try {
            setIsSaving(true);
            if (editingStudent) {
                if (!canEditStudent) {
                    toast.error('You do not have permission to edit students');
                    return;
                }
                const { ok, status, data } = await updateStudentApi(editingStudent._id, payload);
                if (ok) {
                    toast.success('Student updated');
                    // Invalidate and warm profile cache for immediate re-edit
                    try { queryClient.removeQueries({ queryKey: studentKeys.adminProfile(editingStudent._id) }); } catch { /* ignore */ }
                    try {
                        const profile = await queryClient.fetchQuery({
                            queryKey: studentKeys.adminProfile(editingStudent._id),
                            queryFn: () => fetchStudentProfile(editingStudent._id),
                        });
                        void profile;
                    } catch { /* no-op prefetch */ }
                    closeModal();
                    emitStudentsChanged({ source: 'local', action: 'update', id: String(editingStudent._id), ts: Date.now() });
                } else {
                    if (status === 409) toast.error(data.message || 'Conflict updating student');
                    else toast.error(data.message || 'Update failed');
                }
            } else {
                if (!canAddStudent) {
                    toast.error('You do not have permission to add students');
                    return;
                }
                const { ok, status, data } = await createStudent(payload);
                if (ok) {
                    toast.success('Student created');
                    closeModal();
                    emitStudentsChanged({ source: 'local', action: 'create', id: String(data?.student?._id || ''), ts: Date.now() });
                } else if (status === 409) {
                    toast.error(data.message || 'Conflict creating student');
                } else {
                    toast.error(data.message || 'Error creating student');
                }
            }
        } catch (e) {
            try {
                if (import.meta?.env?.DEV || localStorage.getItem('debug:students') === '1') console.error(e);
            } catch { /* ignore */ }
            toast.error('Network error');
        } finally {
            setIsSaving(false);
        }
    };

    // Removed updateSections; GradeSectionSelect handles loading its options

    // Transfer flow removed from Student page; use dedicated Transfers page instead

    // React to cascade filter changes
    // No transfer modal state anymore

    // No transfer submit; handled by Transfers page

    const handlePrint = () => {
        if (!canDownloadStudents) {
            toast.error('You do not have permission to export/print students');
            return;
        }
        setTimeout(() => window.print(), 0);
    };

    const outlineBtn = '!bg-white !text-blue-700 !border-blue-400 hover:!bg-blue-50';
    const canExport = Boolean(canDownloadStudents && !isLoading && Array.isArray(students) && students.length > 0);
    const buildExportPayload = useCallback(async () => {
        if (!canExport) return null;

        // Export should match the currently visible table columns (and exclude action buttons).
        const STORAGE_KEY = 'students:columns:v1';
        let visible = {};
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') visible = parsed;
            }
        } catch { /* ignore */ }
        const isVisible = (key) => visible?.[String(key)] !== false;

        const cols = [
            { key: 'studentId', label: 'Student ID', get: (st) => st.studentId || '' },
            { key: 'fullName', label: 'Full Name', get: (st) => st.fullName || '' },
            { key: 'gender', label: 'Gender', get: (st) => st.gender || '' },
            { key: 'grade', label: 'Grade', get: (st) => st.grade || '' },
            { key: 'section', label: 'Section', get: (st) => (st.section ? `Sec ${st.section}` : '') },
            { key: 'academicYear', label: 'Academic Year', get: (st) => st.academicYear || '' },
            { key: 'shift', label: 'Shift', get: (st) => st.shift || '' },
            { key: 'status', label: 'Status', get: (st) => st.status || '' },
            { key: 'contact', label: 'Contact', get: (st) => st.contactNumber || '' },
            // actions are UI-only; never export
        ].filter((c) => isVisible(c.key));

        const headers = cols.map((c) => c.label);
        const rows = (students || []).map((st) => cols.map((c) => c.get(st)));

        const gs = (sections || []).find(s => String(s._id) === String(gradeSectionFilter));
        const secName = gs?.section ? `Sec ${gs.section}` : (gs?.sectionName || '');
        const cohortLabel = cohortId ? ((students || [])[0]?.cohort || 'selected') : '';

        const subtitleParts = [
            yearFilter ? `Academic Year: ${years.find(y => String(y._id) === String(yearFilter))?.yearName || ''}` : null,
            gradeFilter ? `Grade: ${grades.find(g => String(g._id) === String(gradeFilter))?.gradeName || ''}` : null,
            shiftFilter ? `Shift: ${shifts.find(s => String(s._id) === String(shiftFilter))?.shiftName || ''}` : null,
            gradeSectionFilter ? (secName ? `Section: ${secName}` : 'Section: selected') : null,
            statusFilter ? `Status: ${statusFilter}` : null,
            cohortId ? `Cohort: ${cohortLabel}` : null,
            // Per request: do not include Enrollment in PDF/exports
        ].filter(Boolean);

        return {
            filename: 'students.pdf',
            sheetName: 'Students',
            title: '',
            subtitle: subtitleParts.join(' • '),
            headerImageSrc: headerImg,
            headers,
            rows,
        };
    }, [canExport, students, sections, gradeSectionFilter, cohortId, yearFilter, gradeFilter, shiftFilter, statusFilter, years, grades, shifts]);

    const handleReset = () => {
        setYearFilter('');
        setGradeFilter('');
        setShiftFilter('');
        setGradeSectionFilter('');
        setStatusFilter('');
        setEnrollmentStatus('open');
        setCohortId('');
        resetAndReload({ search: '' });
    };

    return (
        <div className="space-y-6 with-print-header with-print-footer">
            <PrintHeader />
            <PrintFooter left="Generated by Nuuru Al-Bayaan" />

            <EnrollmentCohortToolbar
                enrollmentStatus={enrollmentStatus}
                enrollmentStatusOptions={[
                    { value: 'open', label: 'Open' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'promoted', label: 'Promoted' },
                    { value: 'graduated', label: 'Graduated' },
                    { value: 'transferred', label: 'Transferred' },
                    { value: 'withdrawn', label: 'Withdrawn' },
                    { value: 'all', label: 'All' },
                ]}
                onEnrollmentStatusChange={(v) => { setEnrollmentStatus(v || 'open'); setPage(1); }}
                cohortId={cohortId}
                onCohortChange={(v) => {
                    const next = v || '';
                    setCohortId(next);
                    setPage(1);
                    // When selecting a cohort, default to showing the full cohort (all statuses)
                    // so users don't see an empty table if everyone is graduated/transferred/etc.
                    if (next && enrollmentStatus === 'open') {
                        setEnrollmentStatus('all');
                    }
                }}
                cohortPlaceholder="Cohort (optional)"
                cohortSelectId="students-cohort"
                cohortSelectName="students-cohort"
                cohortSelectProps={{ searchable: true, maxVisible: 5 }}
                className="no-print"
            />

            <Card className="p-4 no-print">
                <div className="flex flex-col gap-3">
                    {/* Row 1: Search + selections (left) */}
                    <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3">
                        <div className="w-full md:max-w-xs grow">
                            <SearchInput value={searchTerm} onChange={setSearch} placeholder="Search by name or ID..." />
                        </div>

                        <FilterRow className="flex-1">
                            <FilterItem grow minWidthClass="sm:min-w-40">
                                <AcademicYearSelect
                                    placeholder="Academic Year"
                                    value={yearFilter}
                                    onChange={(v)=>{ setYearFilter(v); setPage(1); }}
                                    searchable
                                    maxVisible={5}
                                    searchPlaceholder="Search academic years…"
                                    className="w-full"
                                />
                            </FilterItem>

                            <FilterItem minWidthClass="sm:min-w-44">
                                <DropdownSelect
                                    value={gradeFilter}
                                    onChange={(v)=>{ setGradeFilter(v); setPage(1); }}
                                    placeholder="Grade"
                                    options={[...(grades || [])]
                                        .sort((a, b) => {
                                            const at = a?.createdAt ? new Date(a.createdAt).getTime() : Number.POSITIVE_INFINITY;
                                            const bt = b?.createdAt ? new Date(b.createdAt).getTime() : Number.POSITIVE_INFINITY;
                                            return at - bt;
                                        })
                                        .map((g) => ({ value: g._id, label: g.gradeName }))}
                                />
                            </FilterItem>

                            <FilterItem minWidthClass="sm:min-w-44">
                                <FilterDropdownSelect
                                    value={shiftFilter}
                                    onChange={(v)=>{ setShiftFilter(v); setPage(1); }}
                                    placeholder="Shift"
                                    options={(shifts || []).map((s) => ({ value: s._id, label: s.shiftName }))}
                                    maxVisible={5}
                                />
                            </FilterItem>

                            <FilterItem minWidthClass="sm:min-w-56">
                                <FilterDropdownSelect
                                    value={gradeSectionFilter}
                                    onChange={(v)=>{ setGradeSectionFilter(v); setPage(1); }}
                                    placeholder="Section"
                                    disabled={!gradeFilter || !shiftFilter}
                                    options={(sections || []).map((gs) => {
                                        const gradeName = gs?.grade?.gradeName;
                                        const sectionNum = gs?.section;
                                        const yearName = gs?.academicYear?.yearName;
                                        const shiftName = gs?.shift?.shiftName;
                                        const tail = [yearName, shiftName].filter(Boolean).join(' - ');
                                        const label = [
                                            gradeName ? `${gradeName}` : null,
                                            sectionNum ? `Sec ${sectionNum}` : null,
                                            tail ? `(${tail})` : null,
                                        ].filter(Boolean).join(' - ');
                                        return { value: gs._id, label: label || gs.sectionName || 'Section' };
                                    })}
                                    maxVisible={5}
                                    searchPlaceholder="Type to search sections…"
                                />
                            </FilterItem>

                            <FilterItem minWidthClass="sm:min-w-44">
                                <DropdownSelect
                                    value={statusFilter}
                                    onChange={(v) => { setStatusFilter(v); setPage(1); }}
                                    placeholder="Status"
                                    options={[
                                        { value: '', label: 'All' },
                                        { value: 'Active', label: 'Active' },
                                        { value: 'Inactive', label: 'Inactive' },
                                    ]}
                                />
                            </FilterItem>
                        </FilterRow>
                    </div>

                    {/* Row 2: Add button (left) + Actions (right) */}
                    <div className="w-full flex items-center justify-between gap-2 flex-wrap">
                        {canAddStudent && (
                            <Button
                                variant="brand"
                                size="lg"
                                onClick={handleAddNew}
                                icon={<Plus size={20} />}
                                className="w-full sm:w-auto justify-center"
                            >
                                Add New Student
                            </Button>
                        )}

                        <div className="flex items-center justify-end gap-2 flex-nowrap overflow-x-auto w-full sm:w-auto">
                            {canDownloadStudents && (
                                <>
                                    <ActionButton
                                        variant="neutral"
                                        className={outlineBtn}
                                        onClick={handlePrint}
                                        title="Print"
                                        icon={<Printer size={16} />}
                                    >
                                        Print
                                    </ActionButton>

                                    <PdfDownloadButton getPayload={buildExportPayload} disabled={!canExport} className={outlineBtn} />
                                    <ExcelDownloadButton getPayload={buildExportPayload} disabled={!canExport} className={outlineBtn} />
                                    <CsvDownloadButton getPayload={buildExportPayload} disabled={!canExport} className={outlineBtn} />
                                    <CopyTableButton getPayload={buildExportPayload} disabled={!canExport} className={outlineBtn} />
                                </>
                            )}

                            <ActionButton
                                variant="neutral"
                                className={outlineBtn}
                                onClick={handleReset}
                                title="Reset filters"
                                icon={<RotateCcw size={16} />}
                            >
                                Reset
                            </ActionButton>
                        </div>
                    </div>
                </div>
            </Card>
            <TableState
                isLoading={isLoading && students.length === 0}
                error={error}
                items={students}
                loadingMessage="Loading students..."
                loadingVariant="table"
                loadingRows={6}
                loadingColumns={8}
                emptyTitle="No students found"
                emptyDescription="Try adjusting filters or add a new student."
                emptyActionLabel="Add Student"
                onEmptyAction={canAddStudent ? handleAddNew : undefined}
                onRetry={refresh}
            >
                <StudentTable
                    students={sortedStudentsForView}
                    onEdit={handleEdit}
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={onSort}
                    limit={meta.limit || 10}
                    total={meta.total || 0}
                    onLimit={(v) => { setLimit(v); setPage(1); }}
                />
            </TableState>

            <PaginationBar
                meta={meta}
                className="no-print"
                onPage={setPage}
                onLimit={setLimit}
                showRowsSelector={false}
            />

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingStudent ? 'Edit Student' : 'Add New Student'}>
                <div className="relative">
                    {loadingEdit && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 text-sm text-gray-600">
                            Loading full details...
                        </div>
                    )}
                    <StudentForm student={editingStudent} onClose={closeModal} onSubmit={handleSubmit} classes={classes} submitting={isSaving} />
                </div>
            </Modal>

            {/* Transfer flow removed from Student page; use Transfers page */}
        </div>
    );
}
// Simple CSV export of current page

