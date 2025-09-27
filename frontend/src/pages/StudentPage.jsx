import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Download } from 'lucide-react';
import StudentTable from '../components/student/StudentTable';
import StudentForm from '../components/student/StudentForm';
import Modal from '../components/common/Modal';
import PaginationControls from '../components/common/Pagination/PaginationControls';
import { useEntityList } from '../hooks/useEntityList';
import toast from 'react-hot-toast';
import { listStudents, createStudent, updateStudent as updateStudentApi, getStudentProfile as fetchStudentProfile, getAcademicYears, getGrades, getShifts, listGradeSections, reassignEnrollmentApi } from '../api/apiService';
import LoadingState from '../components/common/Feedback/LoadingState';
import EmptyState from '../components/common/Feedback/EmptyState';
import DataToolbar from '../components/common/DataToolbar/DataToolbar';
import SearchInput from '../components/common/DataToolbar/SearchInput';
import SortControls from '../components/common/DataToolbar/SortControls';
import FilterSelect from '../components/common/DataToolbar/FilterSelect';

// Student listing page using reusable entity list hook + pagination controls
export default function StudentPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [loadingEdit, setLoadingEdit] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [classes, setClasses] = useState([]);
    const [gradeSectionFilter, setGradeSectionFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    // Toolbar cascading filters
    const [yearFilter, setYearFilter] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [shiftFilter, setShiftFilter] = useState('');
    const [filterSections, setFilterSections] = useState([]);
    const [filterSectionsLoading, setFilterSectionsLoading] = useState(false);
    // Reassign modal state (row action)
    const [isReassignOpen, setIsReassignOpen] = useState(false);
    const [reassignStudent, setReassignStudent] = useState(null);
    const [reassignBusy, setReassignBusy] = useState(false);
    // Cascading lookups
    const [years, setYears] = useState([]);
    const [grades, setGrades] = useState([]);
    const [shifts, setShifts] = useState([]);
    // Selected filters
    const [selYear, setSelYear] = useState('');
    const [selGrade, setSelGrade] = useState('');
    const [selShift, setSelShift] = useState('');
    const [selSection, setSelSection] = useState('');
    const [sections, setSections] = useState([]);
    const [sectionsLoading, setSectionsLoading] = useState(false);
    // No filter persistence per request

    // fetchFn ha noqon mid aan dib isu abuureyn marka filters is beddelaan; filters waxay imanayaan extraFilters
    const fetchFn = useCallback(async ({ page, limit, search, sortBy, sortDir, gradeSectionId, status, academicYear, grade, shift }) => {
        const result = await listStudents({ page, limit, search, sortBy, sortDir, gradeSectionId, status, academicYear, grade, shift });
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
        toggleSort
    } = useEntityList({
        fetchFn,
        initialSortBy: 'createdAt',
        initialSortDir: 'desc',
        initialLimit: 10,
        persistKey: 'students',
        extraFilters: { gradeSectionId: gradeSectionFilter, status: statusFilter, academicYear: yearFilter, grade: gradeFilter, shift: shiftFilter },
        debounceSearchMs: 350
    });

    // ------------------------------------------------------------
    // Fetch classes (cache + guard): Ka hortag laba-mar request (StrictMode / remount)
    // Isticmaal refs + module-level caching (optional future extract to context)
    // ------------------------------------------------------------
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
            // Fetch Grade Sections (formerly classes) for the enrollment dropdown
            const res = await fetch('/api/grades/sections');
            if (!res.ok) throw new Error('Failed classes fetch');
            const json = await res.json();
            const arr = json.data || json || [];
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
            } catch (e) {
                toast.error('Failed to load filters');
            }
        })();
    }, []);

    // Persist on change
    // No filter persistence

    useEffect(() => { fetchClasses(); }, [fetchClasses]);
    // Fetch toolbar Section options when parents selected; clear section on parent change
    useEffect(() => {
        (async () => {
            // clear previously selected section when any parent changes
            setGradeSectionFilter('');
            if (yearFilter && gradeFilter && shiftFilter) {
                setFilterSectionsLoading(true);
                try {
                    const res = await listGradeSections({ academicYear: yearFilter, grade: gradeFilter, shift: shiftFilter, limit: 200 });
                    const list = res?.data || [];
                    setFilterSections(list);
                    if (list.length === 0) toast.error('No sections found for selected filters');
                } catch (e) {
                    console.error('toolbar sections fetch failed', e);
                    setFilterSections([]);
                    toast.error('Failed to load sections');
                } finally {
                    setFilterSectionsLoading(false);
                }
            } else {
                setFilterSections([]);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [yearFilter, gradeFilter, shiftFilter]);
    useEffect(() => {
        const handler = () => refresh();
        window.addEventListener('students:changed', handler);
        // Clear any cached profiles so next edit fetches fresh data
        const clearProfiles = () => { profileCacheRef.current = {}; };
        window.addEventListener('students:changed', clearProfiles);
        return () => {
            window.removeEventListener('students:changed', handler);
            window.removeEventListener('students:changed', clearProfiles);
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
    const handleDelete = (studentId) => {
        if (window.confirm('Delete not implemented yet. Continue?')) {
            console.log('Would delete', studentId);
        }
    };
    const closeModal = () => { setIsModalOpen(false); setEditingStudent(null); };

    const handleSubmit = async (payload) => {
        try {
            setIsSaving(true);
            if (editingStudent) {
                const { ok, status, data } = await updateStudentApi(editingStudent._id, payload);
                if (ok) {
                    toast.success('Student updated');
                    // Invalidate and warm profile cache for immediate re-edit
                    try { delete profileCacheRef.current[editingStudent._id]; } catch(e) { /* ignore */ }
                    try {
                        const profile = await fetchStudentProfile(editingStudent._id);
                        if (profile && profile.student) {
                            const enriched = { ...profile.student };
                            if (profile.latestEnrollment?.class?._id) {
                                enriched.classId = profile.latestEnrollment.class._id;
                            }
                            profileCacheRef.current[editingStudent._id] = enriched;
                        }
                    } catch(e) { /* no-op prefetch */ }
                    closeModal();
                    window.dispatchEvent(new CustomEvent('students:changed'));
                } else {
                    if (status === 409) toast.error(data.message || 'Conflict updating student');
                    else toast.error(data.message || 'Update failed');
                }
            } else {
                const { ok, status, data } = await createStudent(payload);
                if (ok) {
                    toast.success('Student created');
                    closeModal();
                    window.dispatchEvent(new CustomEvent('students:changed'));
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

    const updateSections = useCallback(async (ay, gr, sh) => {
        if (!ay || !gr || !sh) { setSections([]); return; }
        setSectionsLoading(true);
        try {
            const res = await listGradeSections({ academicYear: ay, grade: gr, shift: sh, limit: 200 });
            const items = res?.data || [];
            setSections(items);
            if (items.length === 0) toast.error('No sections found for selected filters');
        } catch (e) {
            console.error('Sections fetch failed', e);
            setSections([]);
            toast.error('Failed to load sections');
        } finally {
            setSectionsLoading(false);
        }
    }, []);

    const openReassignModalFromRow = async (st) => {
        try {
            setReassignStudent(st);
            setIsReassignOpen(true);
            setSelYear(''); setSelGrade(''); setSelShift(''); setSelSection(''); setSections([]);
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
                await updateSections(ay, gr, sh);
                // Do not preselect current section, force explicit choice
            }
        } catch (e) {
            console.error('Open reassign failed', e);
        }
    };

    // React to cascade filter changes
    useEffect(() => {
        if (!isReassignOpen) return;
        // Only fetch when all 3 parents selected
        if (selYear && selGrade && selShift) {
            updateSections(selYear, selGrade, selShift);
        } else {
            setSections([]);
            setSelSection('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selYear, selGrade, selShift, isReassignOpen]);

    const handleReassignSubmit = async () => {
        if (!reassignStudent || !selSection) return;
        try {
            setReassignBusy(true);
            const { ok, data, status } = await reassignEnrollmentApi(reassignStudent._id, { gradeSectionId: selSection });
            if (!ok) {
                toast.error(data?.message || `Failed to reassign (status ${status})`);
                return;
            }
            toast.success('Enrollment reassigned');
            setIsReassignOpen(false);
            setReassignStudent(null);
            setSelYear(''); setSelGrade(''); setSelShift(''); setSelSection(''); setSections([]);
            // Refresh table
            await refresh();
            // Let others know
            window.dispatchEvent(new CustomEvent('students:changed'));
        } catch (e) {
            console.error(e);
            toast.error('Network or server error');
        } finally {
            setReassignBusy(false);
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
                searchSlot={<SearchInput value={searchTerm} onChange={(v)=> setSearch(v)} placeholder="Search by name or ID..." />}
                filtersSlot={(
                    <div className="flex flex-col sm:flex-row gap-3">
                        <FilterSelect
                            value={yearFilter}
                            onChange={(v) => { setYearFilter(v); setPage(1); }}
                            options={years.map(y => ({ value: y._id, label: y.yearName }))}
                            placeholder="Academic Year"
                        />
                        <FilterSelect
                            value={gradeFilter}
                            onChange={(v) => { setGradeFilter(v); setPage(1); }}
                            options={grades.map(g => ({ value: g._id, label: g.gradeName }))}
                            placeholder="Grade"
                        />
                        <FilterSelect
                            value={shiftFilter}
                            onChange={(v) => { setShiftFilter(v); setPage(1); }}
                            options={shifts.map(s => ({ value: s._id, label: s.shiftName }))}
                            placeholder="Shift"
                        />
                        <select
                            value={gradeSectionFilter}
                            onChange={(e) => { setGradeSectionFilter(e.target.value); setPage(1); }}
                            className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                            disabled={!yearFilter || !gradeFilter || !shiftFilter || filterSectionsLoading}
                        >
                            <option value="">{filterSectionsLoading ? 'Loading...' : 'Section'}</option>
                            {filterSections.map(s => (
                                <option key={s._id} value={s._id}>{`${s.grade?.gradeName || ''} - Sec ${s.section} (${s.academicYear?.yearName || ''} - ${s.shift?.shiftName || ''})`}</option>
                            ))}
                        </select>
                        <FilterSelect
                            value={statusFilter}
                            onChange={(v) => { setStatusFilter(v); setPage(1); }}
                            options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]}
                            placeholder="Status"
                        />
                    </div>
                )}
                sortSlot={(
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
                )}
                actionsSlot={(
                    <button onClick={() => exportCsv(students)} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm flex items-center"><Download size={16} className="mr-1"/>CSV</button>
                )}
            />
            {isLoading ? (
                <LoadingState variant="table" message="Loading students..." rows={6} columns={8} />
            ) : students.length === 0 ? (
                <EmptyState title="No students found" description="Try adjusting filters or add a new student." actionLabel="Add Student" onAction={handleAddNew} />
            ) : (
                <StudentTable students={students} onEdit={handleEdit} onDelete={handleDelete} onReassign={openReassignModalFromRow} />
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

            {/* Reassign Section Modal (row action) */}
            <Modal isOpen={isReassignOpen} onClose={() => setIsReassignOpen(false)} title={`Reassign Section${reassignStudent ? `: ${reassignStudent.fullName}` : ''}`}>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
                            <select value={selYear} onChange={e=> { setSelYear(e.target.value); setSelSection(''); }} className="w-full border rounded px-3 py-2 text-sm">
                                <option value="">-- Select --</option>
                                {years.map(y => <option key={y._id} value={y._id}>{y.yearName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
                            <select value={selGrade} onChange={e=> { setSelGrade(e.target.value); setSelSection(''); }} className="w-full border rounded px-3 py-2 text-sm" disabled={!selYear}>
                                <option value="">-- Select --</option>
                                {grades.map(g => <option key={g._id} value={g._id}>{g.gradeName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Shift</label>
                            <select value={selShift} onChange={e=> { setSelShift(e.target.value); setSelSection(''); }} className="w-full border rounded px-3 py-2 text-sm" disabled={!selYear || !selGrade}>
                                <option value="">-- Select --</option>
                                {shifts.map(s => <option key={s._id} value={s._id}>{s.shiftName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
                            <select value={selSection} onChange={e=> setSelSection(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" disabled={!selYear || !selGrade || !selShift || sectionsLoading}>
                                <option value="">{sectionsLoading ? 'Loading...' : '-- Select --'}</option>
                                {sections.map(s => (
                                    <option key={s._id} value={s._id}>{`${s.grade?.gradeName || ''} - Sec ${s.section} (${s.academicYear?.yearName || ''} - ${s.shift?.shiftName || ''})`}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={()=> setIsReassignOpen(false)} className="px-3 py-2 text-sm rounded border">Cancel</button>
                        <button disabled={reassignBusy || !selSection} onClick={handleReassignSubmit} className="px-3 py-2 text-sm rounded bg-blue-600 text-white disabled:opacity-50">
                            {reassignBusy ? 'Reassigning...' : 'Confirm Reassign'}
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

