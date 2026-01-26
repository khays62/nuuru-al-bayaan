import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, Printer, RotateCcw } from 'lucide-react';
import StudentTable from '../components/StudentTable';
import StudentForm from '../components/StudentForm';
import Modal from '../../../shared/components/ui/Modal.jsx';
import { useEntityList } from '../../../hooks/useEntityList';
import toast from 'react-hot-toast';
import {
    listStudents,
    createStudent,
    updateStudent as updateStudentApi,
    getStudentProfile as fetchStudentProfile,
} from '../api/studentsApi';
import { getAcademicYears, getGrades, getShifts } from '../../lookups/api/lookups';
import { listGradeSections } from '../../grades/api/gradeSections';
import { on as onEvent, off as offEvent, EVENTS, emitStudentsChanged } from '../../../utils/events';
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

// Student listing page using reusable entity list hook + pagination controls
export default function StudentPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [loadingEdit, setLoadingEdit] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [classes, setClasses] = useState([]);
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
    // Cascading lookups
    const [years, setYears] = useState([]);
    const [grades, setGrades] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [sections, setSections] = useState([]);
    // No filter persistence per request

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

    // fetchFn ha noqon mid aan dib isu abuureyn marka filters is beddelaan; filters waxay imanayaan extraFilters
    const fetchFn = useCallback(async ({ page, limit, search, sortBy, sortDir, gradeSectionId, status, academicYear, grade, shift, cohortId, enrollmentStatus, includeClosed }) => {
        const result = await listStudents({ page, limit, search, sortBy, sortDir, gradeSectionId, status, academicYear, grade, shift, cohortId, enrollmentStatus, includeClosed });
        return { data: result.data, meta: result.meta };
    }, []);

    const {
        items: students,
        meta,
        isLoading,
        error,
        searchTerm,
        setSearch,
        setPage,
        setLimit,
        refresh,
        resetAndReload
    } = useEntityList({
        fetchFn,
        initialSortBy: 'createdAt',
        initialSortDir: 'desc',
        initialLimit: 10,
        persistKey: 'students',
        extraFilters: extraFilters,
        debounceSearchMs: 350
    });

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

    // ------------------------------------------------------------
    // Fetch classes (cache + guard): Ka hortag laba-mar request (StrictMode / remount)
    // Isticmaal refs + module-level caching (optional future extract to context)
                // setSectionsLoading(false);
    const classesCacheRef = useRef(null);      // xogtii la helay
    const classesLoadingRef = useRef(false);   // in-flight guard
    const fetchClasses = useCallback(async () => {
        // Haddii cache hore u jiro oo component-kan wali aanu buuxin -> isticmaal
        if (classesCacheRef.current) {
            if (classes.length === 0) setClasses(classesCacheRef.current);
            return;
        }
        // Haddii request hore socda -> iska daa (mount duplicate)
        if (classesLoadingRef.current) return;
        classesLoadingRef.current = true;
        try {
            // Fetch Grade Sections (formerly classes) for the enrollment dropdown via apiService
            const result = await listGradeSections({ limit: 1000, sortBy: 'createdAt', sortDir: 'desc' });
            const arr = result?.data || [];
            // Build readable label similar to old className for UI reuse
            const formatted = arr.map(item => {
                const gradeName = item?.grade?.gradeName || 'Grade';
                const section = item?.section || '1';
                const yearName = item?.academicYear?.yearName || '';
                const shiftName = item?.shift?.shiftName || '';
                const tail = [yearName, shiftName].filter(Boolean).join(' - ');
                const label = tail ? `${gradeName} - Sec ${section} (${tail})` : `${gradeName} - Sec ${section}`;
                return { _id: item._id, className: label };
            });
            classesCacheRef.current = formatted; // ku kaydi cache
            setClasses(formatted);
        } catch (e) {
            console.error('[classes fetch error]', e);
        } finally {
            classesLoadingRef.current = false;
        }
    }, [classes.length]);

    // Load lookups for toolbar filters on mount
    useEffect(() => {
        (async () => {
            try {
                const [ys, gs, ss] = await Promise.all([
                    getAcademicYears(),
                    getGrades(),
                    getShifts(),
                ]);
                setYears(Array.isArray(ys) ? ys : (ys?.data || []));
                setGrades(Array.isArray(gs) ? gs : (gs?.data || []));
                setShifts(Array.isArray(ss) ? ss : (ss?.data || []));
            } catch { toast.error('Failed to load filters'); }
        })();
    }, []);

    // Persist on change
    // No filter persistence

    useEffect(() => { fetchClasses(); }, [fetchClasses]);
    // Toolbar Section options are handled by GradeSectionSelect internally; simply clear selected section when parents change
    useEffect(() => {
        setGradeSectionFilter('');
    }, [yearFilter, gradeFilter, shiftFilter]);

    useEffect(() => {
        let ignore = false;
        (async () => {
            if (!gradeFilter || !shiftFilter) {
                setSections([]);
                return;
            }
            try {
                const res = await listGradeSections({ grade: gradeFilter, shift: shiftFilter, limit: 200 });
                const data = Array.isArray(res) ? res : (res?.data || []);
                if (!ignore) setSections(data);
            } catch {
                if (!ignore) setSections([]);
            }
        })();
        return () => { ignore = true; };
    }, [gradeFilter, shiftFilter]);
    useEffect(() => {
        const handler = () => refresh();
        const clearProfiles = () => { profileCacheRef.current = {}; };
        onEvent(EVENTS.STUDENTS_CHANGED, handler);
        onEvent(EVENTS.STUDENTS_CHANGED, clearProfiles);
        return () => {
            offEvent(EVENTS.STUDENTS_CHANGED, handler);
            offEvent(EVENTS.STUDENTS_CHANGED, clearProfiles);
        };
    }, [refresh]);

    const handleAddNew = () => {
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
    const profileCacheRef = useRef({}); // { studentId: enrichedStudent }
    const handleEdit = async (student) => {
        // Step 1: Immediate open with basic row data
        setEditingStudent(student);
        setIsModalOpen(true);
        // Haddii horey loo helay profile buuxa -> apply isla markiiba
        if (profileCacheRef.current[student._id]) {
            setEditingStudent(profileCacheRef.current[student._id]);
            return; // no network wait
        }
        setLoadingEdit(true);
        try {
            const profile = await fetchStudentProfile(student._id);
            if (profile && profile.student) {
                const enriched = { ...profile.student };
                if (profile.latestEnrollment?.gradeSection?._id) {
                    enriched.classId = profile.latestEnrollment.gradeSection._id;
                }
                profileCacheRef.current[student._id] = enriched;
                setEditingStudent(enriched);
            } else {
                toast.error('Failed to load full student details');
            }
        } catch (e) {
            console.error(e);
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
                const { ok, status, data } = await updateStudentApi(editingStudent._id, payload);
                if (ok) {
                    toast.success('Student updated');
                    // Invalidate and warm profile cache for immediate re-edit
                    try { delete profileCacheRef.current[editingStudent._id]; } catch { /* ignore */ }
                    try {
                        const profile = await fetchStudentProfile(editingStudent._id);
                        if (profile && profile.student) {
                            const enriched = { ...profile.student };
                            if (profile.latestEnrollment?.gradeSection?._id) {
                                enriched.classId = profile.latestEnrollment.gradeSection._id;
                            }
                            profileCacheRef.current[editingStudent._id] = enriched;
                        }
                    } catch { /* no-op prefetch */ }
                    closeModal();
                    emitStudentsChanged();
                } else {
                    if (status === 409) toast.error(data.message || 'Conflict updating student');
                    else toast.error(data.message || 'Update failed');
                }
            } else {
                const { ok, status, data } = await createStudent(payload);
                if (ok) {
                    toast.success('Student created');
                    closeModal();
                    emitStudentsChanged();
                } else if (status === 409) {
                    toast.error(data.message || 'Conflict creating student');
                } else {
                    toast.error(data.message || 'Error creating student');
                }
            }
        } catch (e) {
            console.error(e);
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
        setTimeout(() => window.print(), 0);
    };

    const outlineBtn = '!bg-white !text-blue-700 !border-blue-400 hover:!bg-blue-50';
    const canExport = Boolean(!isLoading && Array.isArray(students) && students.length > 0);
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
        resetAndReload({ filters: {}, search: '' });
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
                        <Button
                            variant="brand"
                            size="lg"
                            onClick={handleAddNew}
                            icon={<Plus size={20} />}
                            className="w-full sm:w-auto justify-center"
                        >
                            Add New Student
                        </Button>

                        <div className="flex items-center justify-end gap-2 flex-nowrap overflow-x-auto w-full sm:w-auto">
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
                onEmptyAction={handleAddNew}
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

