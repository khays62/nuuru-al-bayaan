import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, Download } from 'lucide-react';
import StudentTable from '../components/student/StudentTable';
import StudentForm from '../components/student/StudentForm';
import Modal from '../components/common/Modal';
import PaginationControls from '../components/common/Pagination/PaginationControls';
import { useEntityList } from '../hooks/useEntityList';
import toast from 'react-hot-toast';
import { listStudents, createStudent, updateStudent as updateStudentApi, getStudentProfile as fetchStudentProfile, getAcademicYears, getGrades, getShifts, listGradeSections, transferEnrollmentApi } from '../api';
import { on as onEvent, off as offEvent, EVENTS, emitStudentsChanged } from '../utils/events';
import LoadingState from '../components/common/Feedback/LoadingState';
import EmptyState from '../components/common/Feedback/EmptyState';
import DataToolbar from '../components/common/DataToolbar/DataToolbar';
import SearchInput from '../components/common/DataToolbar/SearchInput';
import SortControls from '../components/common/DataToolbar/SortControls';
import FilterSelect from '../components/common/DataToolbar/FilterSelect';
import AcademicYearSelect from '../components/lookups/AcademicYearSelect';
import GradeSelect from '../components/lookups/GradeSelect';
import ShiftSelect from '../components/lookups/ShiftSelect';
import GradeSectionSelect from '../components/lookups/GradeSectionSelect';

// Student listing page using reusable entity list hook + pagination controls
export default function StudentPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [loadingEdit, setLoadingEdit] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [classes, setClasses] = useState([]);
    const [gradeSectionFilter, setGradeSectionFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    // Enrollment filter (open/all/graduated/promoted/transferred/withdrawn)
    const [enrollmentFilter, setEnrollmentFilter] = useState('open');
    // Toolbar cascading filters
    const [yearFilter, setYearFilter] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [shiftFilter, setShiftFilter] = useState('');
    // removed: legacy filterSections state (using GradeSectionSelect which loads itself)
    // Transfer modal state (row action)
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [transferStudent, setTransferStudent] = useState(null);
    const [transferBusy, setTransferBusy] = useState(false);
    // Cascading lookups
    const [years, setYears] = useState([]);
    const [grades, setGrades] = useState([]);
    const [shifts, setShifts] = useState([]);
    // Selected filters
    const [selYear, setSelYear] = useState('');
    const [selGrade, setSelGrade] = useState('');
    const [selShift, setSelShift] = useState('');
    const [selSection, setSelSection] = useState('');
    // No filter persistence per request

    // Dynamic extra filters: ensure clearing enrollmentStatus/includeClosed when switching back to 'open'
    const extraFilters = useMemo(() => {
        const ef = {
            gradeSectionId: gradeSectionFilter,
            status: statusFilter,
            academicYear: yearFilter,
            grade: gradeFilter,
            shift: shiftFilter,
            // Always include enrollmentStatus/includeClosed keys (may be empty string) so stale values are overwritten
            enrollmentStatus: '',
            includeClosed: ''
        };
        if (enrollmentFilter === 'all') {
            ef.includeClosed = 'true'; // truthy string; filtered out if ''
        } else if (['graduated','promoted','transferred','withdrawn'].includes(enrollmentFilter)) {
            ef.enrollmentStatus = enrollmentFilter;
        }
        return ef;
    }, [gradeSectionFilter, statusFilter, yearFilter, gradeFilter, shiftFilter, enrollmentFilter]);

    // fetchFn ha noqon mid aan dib isu abuureyn marka filters is beddelaan; filters waxay imanayaan extraFilters
    const fetchFn = useCallback(async ({ page, limit, search, sortBy, sortDir, gradeSectionId, status, academicYear, grade, shift, enrollmentStatus, includeClosed }) => {
        const result = await listStudents({ page, limit, search, sortBy, sortDir, gradeSectionId, status, academicYear, grade, shift, enrollmentStatus, includeClosed });
        return { data: result.data, meta: result.meta };
    }, []);

    const {
        items: students,
        meta,
        isLoading,
        searchTerm,
        setSearch,
        setPage,
        setLimit,
        refresh,
        toggleSort,
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

    // -----------------------------
    // Reassign (row) helpers
    // -----------------------------
    const ensureLookupsLoaded = useCallback(async () => {
        try {
            if (years.length === 0) {
                const y = await getAcademicYears();
                setYears(Array.isArray(y) ? y : (y.data || []));
            }
            if (grades.length === 0) {
                const g = await getGrades();
                setGrades(Array.isArray(g) ? g : (g.data || []));
            }
            if (shifts.length === 0) {
                const s = await getShifts();
                setShifts(Array.isArray(s) ? s : (s.data || []));
            }
        } catch (e) {
            console.error('Lookups load failed', e);
        }
    }, [years.length, grades.length, shifts.length]);

    // Removed updateSections; GradeSectionSelect handles loading its options

    const openTransferModalFromRow = async (st) => {
        try {
            setTransferStudent(st);
            setIsTransferOpen(true);
            setSelYear(''); setSelGrade(''); setSelShift(''); setSelSection('');
            await ensureLookupsLoaded();
            // Fetch full profile to prefill selections
            const profile = await fetchStudentProfile(st._id);
            const latest = profile?.latestEnrollment;
            if (latest) {
                const ay = latest.academicYear?._id || '';
                const gr = latest.gradeSection?.grade?._id || latest.grade?._id || '';
                const sh = latest.gradeSection?.shift?._id || latest.shift?._id || '';
                setSelYear(ay);
                setSelGrade(gr);
                setSelShift(sh);
                // Load candidate sections for these filters
                // options are loaded within GradeSectionSelect
                // Do not preselect current section, force explicit choice
            }
        } catch {
            console.error('Open transfer failed');
        }
    };

    // React to cascade filter changes
    useEffect(() => {
        if (!isTransferOpen) return;
        // Only fetch when all 3 parents selected
        if (!selYear || !selGrade || !selShift) {
            setSelSection('');
        }
    }, [selYear, selGrade, selShift, isTransferOpen]);

    const handleTransferSubmit = async () => {
        if (!transferStudent || !selSection) return;
        try {
            setTransferBusy(true);
            const { ok, data, status } = await transferEnrollmentApi(transferStudent._id, { gradeSectionId: selSection });
            if (!ok) {
                toast.error(data?.message || `Failed to transfer (status ${status})`);
                return;
            }
            const msg = (data?.message || '').toString();
            if (/no\s+changes/i.test(msg)) {
                // No-op: already in this section
                toast.success('No changes: already in this section');
            } else {
                toast.success('Enrollment transferred');
            }
            setIsTransferOpen(false);
            setTransferStudent(null);
            setSelYear(''); setSelGrade(''); setSelShift(''); setSelSection('');
            // Refresh table then notify listeners
            await refresh();
            emitStudentsChanged();
        } catch (e) {
            console.error(e);
            toast.error('Network or server error');
        } finally {
            setTransferBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Student Management</h1>
                    <p className="mt-1 text-sm text-gray-600">Manage all student records in the system.</p>
                </div>
                <button onClick={handleAddNew} className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700">
                    <Plus size={20} className="mr-2" />Add New Student
                </button>
            </div>

            <DataToolbar
                showReset={false}
                searchSlot={<SearchInput value={searchTerm} onChange={setSearch} placeholder="Search by name or ID..." />}
                filtersSlot={<div className="flex flex-row flex-wrap gap-2 w-full items-center">
                    <AcademicYearSelect placeholder="Academic Year" value={yearFilter} onChange={(v)=>{ setYearFilter(v); setPage(1); }} className="flex-1 min-w-[140px]" />
                    <GradeSelect placeholder="Grade" value={gradeFilter} onChange={(v)=>{ setGradeFilter(v); setPage(1); }} className="flex-1 min-w-[120px]" />
                    <ShiftSelect placeholder="Shift" value={shiftFilter} onChange={(v)=>{ setShiftFilter(v); setPage(1); }} className="flex-1 min-w-[120px]" />
                    <GradeSectionSelect gradeId={gradeFilter} shiftId={shiftFilter} value={gradeSectionFilter} onChange={(v)=>{ setGradeSectionFilter(v); setPage(1); }} className="flex-1 min-w-[160px]" />
                    <FilterSelect
                        value={enrollmentFilter}
                        onChange={(v) => { setEnrollmentFilter(v); setPage(1); }}
                        options={[
                            { value: 'open', label: 'Open only' },
                            { value: 'all', label: 'All (include closed)' },
                            { value: 'graduated', label: 'Graduated only' },
                            { value: 'promoted', label: 'Promoted only' },
                            { value: 'transferred', label: 'Transferred only' },
                            { value: 'withdrawn', label: 'Withdrawn only' },
                        ]}
                        placeholder="Enrollment"
                        className="flex-1 min-w-[150px]"
                    />
                    <FilterSelect
                        value={statusFilter}
                        onChange={(v) => { setStatusFilter(v); setPage(1); }}
                        options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]}
                        placeholder="Status"
                        className="flex-1 min-w-[120px]"
                    />
                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                        <SortControls
                            currentField={meta.sortBy}
                            currentDir={meta.sortDir}
                            onSort={toggleSort}
                            fields={[
                                { field: 'createdAt', label: 'Created' },
                                { field: 'fullName', label: 'Name' },
                                { field: 'studentId', label: 'Student ID' },
                            ]}
                        />
                        <button
                            type="button"
                            onClick={() => exportCsv(students)}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm flex items-center"
                        >
                            <Download size={16} className="mr-1"/>CSV
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setYearFilter('');
                                setGradeFilter('');
                                setShiftFilter('');
                                setGradeSectionFilter('');
                                setStatusFilter('');
                                setEnrollmentFilter('open');
                                resetAndReload({ filters: {}, search: '' });
                            }}
                            className="px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md border text-sm"
                        >
                            Reset
                        </button>
                    </div>
                </div>}
            />
            {isLoading ? (
                <LoadingState variant="table" message="Loading students..." rows={6} columns={8} />
            ) : students.length === 0 ? (
                <EmptyState title="No students found" description="Try adjusting filters or add a new student." actionLabel="Add Student" onAction={handleAddNew} />
            ) : (
                <StudentTable students={students} onEdit={handleEdit} onTransfer={openTransferModalFromRow} />
            )}

            <PaginationControls
                page={meta.page || 1}
                totalPages={meta.totalPages || 1}
                limit={meta.limit || 10}
                onPage={setPage}
                onLimit={setLimit}
            />

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingStudent ? `Edit Student: ${editingStudent.fullName}` : 'Add New Student'}>
                <div className="relative">
                    {loadingEdit && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 text-sm text-gray-600">
                            Loading full details...
                        </div>
                    )}
                    <StudentForm student={editingStudent} onClose={closeModal} onSubmit={handleSubmit} classes={classes} submitting={isSaving} />
                </div>
            </Modal>

            {/* Transfer Section Modal (row action) */}
            <Modal isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)} title={`Transfer Section${transferStudent ? `: ${transferStudent.fullName}` : ''}`}>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
                            <AcademicYearSelect placeholder="-- Select Academic Year --" value={selYear} onChange={(v)=> { setSelYear(v); setSelSection(''); }} className="w-full" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
                            <GradeSelect placeholder="-- Select Grade --" value={selGrade} onChange={(v)=> { setSelGrade(v); setSelSection(''); }} className="w-full" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Shift</label>
                            <ShiftSelect placeholder="-- Select Shift --" value={selShift} onChange={(v)=> { setSelShift(v); setSelSection(''); }} className="w-full" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
                            <GradeSectionSelect gradeId={selGrade} shiftId={selShift} value={selSection} onChange={(v)=> setSelSection(v)} className="w-full" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={()=> setIsTransferOpen(false)} className="px-3 py-2 text-sm rounded border">Cancel</button>
                        <button disabled={transferBusy || !selSection} onClick={handleTransferSubmit} className="px-3 py-2 text-sm rounded bg-blue-600 text-white disabled:opacity-50">
                            {transferBusy ? 'Transferring...' : 'Confirm Transfer'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// Simple CSV export of current page
function exportCsv(rows) {
    if (!rows || !rows.length) return toast.error('No rows to export');
    const headers = ['studentId','fullName','gender','status','gradeDisplay','academicYear','shift','contactNumber'];
    const lines = [headers.join(',')];
    for (const r of rows) {
        lines.push(headers.map(h => formatCsv(r[h])).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_page_export.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
function formatCsv(val) {
    if (val == null) return '';
    const str = String(val).replace(/"/g,'""');
    if (/[",\n]/.test(str)) return `"${str}"`;
    return str;
}

