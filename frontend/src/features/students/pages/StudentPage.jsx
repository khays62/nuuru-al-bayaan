import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Download, Plus, Printer, RotateCcw, Upload } from 'lucide-react';
import StudentTable from '../components/StudentTable';
import StudentForm from '../components/StudentForm';
import StudentImportExcelModal from '../components/StudentImportExcelModal.jsx';
import { STUDENT_IMPORT_TEMPLATE_FIELDS, getTemplateHeaderLabel } from '../importTemplateConfig.js';
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

import { useI18n } from '../../../i18n/useI18n';

import { useAuth } from '../../../auth/AuthContext';
import { useDebounce } from '../../../hooks/useDebounce';
import { studentKeys } from '../queryKeys';
import { SOMALIA_REGIONS, SOMALIA_DISTRICTS_BY_REGION } from '../../../shared/data/somaliaAdminDivisions.js';

// Student listing page using reusable entity list hook + pagination controls
export default function StudentPage() {
    const { auth, hasPermission } = useAuth();
    const { t, lang, isRTL } = useI18n();
    const queryClient = useQueryClient();
    const isAdmin = String(auth?.user?.role || '').toLowerCase() === 'admin';
    const canAddStudent = isAdmin || hasPermission('students', 'add');
    const canEditStudent = isAdmin || hasPermission('students', 'edit');
    // Students module doesn't define a separate "print" action; treat printing/exports as data download.
    const canDownloadStudents = isAdmin || hasPermission('students', 'download');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [loadingEdit, setLoadingEdit] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [downloadingTemplate, setDownloadingTemplate] = useState(false);
    const [createFormKey, setCreateFormKey] = useState(0);
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

    const years = useMemo(() => (yearsQuery.data || []), [yearsQuery.data]);
    const grades = useMemo(() => (gradesQuery.data || []), [gradesQuery.data]);
    const shifts = useMemo(() => (shiftsQuery.data || []), [shiftsQuery.data]);

    const sectionsQuery = useQuery({
        queryKey: studentKeys.gradeSectionsByGradeShift({ gradeId: gradeFilter, shiftId: shiftFilter, limit: 200 }),
        enabled: Boolean(gradeFilter && shiftFilter),
        queryFn: async ({ signal }) => {
            const res = await listGradeSections({ grade: gradeFilter, shift: shiftFilter, limit: 200 }, { signal });
            return Array.isArray(res) ? res : (res?.data || []);
        },
        placeholderData: (prev) => prev,
    });
    const sections = useMemo(() => (sectionsQuery.data || []), [sectionsQuery.data]);

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

    const students = useMemo(() => (studentsQuery.data?.data || []), [studentsQuery.data?.data]);
    const meta = studentsQuery.data?.meta || { page, limit, total: 0, totalPages: 1 };
    const isLoading = Boolean(studentsQuery.isLoading && studentsQuery.data == null);
    const error = studentsQuery.isError ? studentsQuery.error : null;

    const refresh = useCallback(() => {
        studentsQuery.refetch();
    }, [studentsQuery]);

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
            toast.error(t('students.table.permissions.noAdd'));
            return;
        }
        setEditingStudent(null);
        setCreateFormKey((k) => k + 1);
        setIsModalOpen(true);
    };
    // ------------------------------------------------------------
    // Edit Flow Optimization:
    //  1. Open the modal immediately (instant UX) instead of waiting for profile fetch.
    //  2. Show basic list data so the user can see the form.
    //  3. Update with the full profile asynchronously when it arrives.
    //  4. Use cache-based memory so repeat edits are faster.
    // ------------------------------------------------------------
    const handleEdit = async (student) => {
        if (!canEditStudent) {
            toast.error(t('students.table.permissions.noEdit'));
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
                toast.error(t('students.table.errors.loadDetailsFailed'));
            }
        } catch (e) {
            try {
                if (import.meta?.env?.DEV || localStorage.getItem('debug:students') === '1') console.error(e);
            } catch { /* ignore */ }
            toast.error(t('students.table.errors.loadDetailsError'));
        } finally {
            setLoadingEdit(false);
        }
    };
    // Delete flow intentionally unimplemented in Phase 1
    const closeModal = () => { setIsModalOpen(false); setEditingStudent(null); };

    const handleSubmit = async (payload, opts = {}) => {
        const photoFile = opts?.photoFile || null;
        try {
            setIsSaving(true);
            if (editingStudent) {
                if (!canEditStudent) {
                    toast.error(t('students.table.permissions.noEdit'));
                    return { ok: false };
                }
                const { ok, status, data } = await updateStudentApi(editingStudent._id, { ...payload, photoFile });
                if (ok) {
                    toast.success(t('students.table.toasts.updated'));
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
                    return { ok: true, studentId: String(editingStudent._id) };
                } else {
                    if (status === 409) toast.error(data.message || t('students.table.errors.conflictUpdate'));
                    else toast.error(data.message || t('students.table.errors.updateFailed'));
                    return { ok: false };
                }
            } else {
                if (!canAddStudent) {
                    toast.error(t('students.table.permissions.noAdd'));
                    return { ok: false };
                }
                const { ok, status, data } = await createStudent({ ...payload, photoFile });
                if (ok) {
                    const createdId = String(data?.student?._id || '');
                    const savedName = String(payload?.fullName || '').trim();
                    toast.success(
                        savedName
                            ? t('students.table.toasts.createdWithName', { name: savedName })
                            : t('students.table.toasts.created')
                    );
                    // Keep modal open for fast multi-student entry; clear the form.
                    setCreateFormKey((k) => k + 1);
                    emitStudentsChanged({ source: 'local', action: 'create', id: String(data?.student?._id || ''), ts: Date.now() });
                    return { ok: true, studentId: createdId };
                } else if (status === 409) {
                    toast.error(data.message || t('students.table.errors.conflictCreate'));
                    return { ok: false };
                } else {
                    const savedName = String(payload?.fullName || '').trim();
                    toast.error(
                        data.message
                        || (savedName
                            ? t('students.table.errors.createFailedWithName', { name: savedName })
                            : t('students.table.errors.createFailed'))
                    );
                    return { ok: false };
                }
            }
        } catch (e) {
            try {
                if (import.meta?.env?.DEV || localStorage.getItem('debug:students') === '1') console.error(e);
            } catch { /* ignore */ }
            toast.error(t('students.table.errors.network'));
            return { ok: false };
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
            toast.error(t('students.table.permissions.noExport'));
            return;
        }
        setTimeout(() => window.print(), 0);
    };

    const canExport = Boolean(canDownloadStudents && !isLoading && Array.isArray(students) && students.length > 0);
    const importFiltersReady = Boolean(yearFilter && gradeFilter && shiftFilter && gradeSectionFilter);
    const importParams = useMemo(() => ({
        academicYearId: yearFilter,
        gradeSectionId: gradeSectionFilter,
        cohortId,
        gradeId: gradeFilter,
        shiftId: shiftFilter,
    }), [yearFilter, gradeSectionFilter, cohortId, gradeFilter, shiftFilter]);

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
            { key: 'studentId', label: t('students.table.columns.studentId'), get: (st) => st.studentId || '' },
            { key: 'emisNumber', label: t('students.table.columns.emisNumber'), get: (st) => st.emisNumber || '' },
            { key: 'fullName', label: t('students.table.columns.fullName'), get: (st) => st.fullName || '' },
            { key: 'gender', label: t('students.table.columns.gender'), get: (st) => st.gender || '' },
            { key: 'grade', label: t('students.table.columns.grade'), get: (st) => st.grade || '' },
            { key: 'section', label: t('students.table.columns.section'), get: (st) => (st.section ? `${t('students.export.sectionPrefix')} ${st.section}` : '') },
            { key: 'academicYear', label: t('students.table.columns.academicYear'), get: (st) => st.academicYear || '' },
            { key: 'shift', label: t('students.table.columns.shift'), get: (st) => st.shift || '' },
            { key: 'status', label: t('students.table.columns.status'), get: (st) => st.status || '' },
            { key: 'contact', label: t('students.table.columns.contact'), get: (st) => st.contactNumber || '' },
            // actions are UI-only; never export
        ].filter((c) => isVisible(c.key));

        const headers = cols.map((c) => c.label);
        const rows = (students || []).map((st) => cols.map((c) => c.get(st)));

        const gs = (sections || []).find(s => String(s._id) === String(gradeSectionFilter));
        const secName = gs?.section ? `${t('students.export.sectionPrefix')} ${gs.section}` : (gs?.sectionName || '');
        const cohortLabel = cohortId ? ((students || [])[0]?.cohort || t('students.export.selected')) : '';

        const subtitleParts = [
            yearFilter ? `${t('students.export.labels.academicYear')}: ${years.find(y => String(y._id) === String(yearFilter))?.yearName || ''}` : null,
            gradeFilter ? `${t('students.export.labels.grade')}: ${grades.find(g => String(g._id) === String(gradeFilter))?.gradeName || ''}` : null,
            shiftFilter ? `${t('students.export.labels.shift')}: ${shifts.find(s => String(s._id) === String(shiftFilter))?.shiftName || ''}` : null,
            gradeSectionFilter ? (secName ? `${t('students.export.labels.section')}: ${secName}` : `${t('students.export.labels.section')}: ${t('students.export.selected')}`) : null,
            statusFilter ? `${t('students.export.labels.status')}: ${statusFilter}` : null,
            cohortId ? `${t('students.export.labels.cohort')}: ${cohortLabel}` : null,
            // Per request: do not include Enrollment in PDF/exports
        ].filter(Boolean);

        return {
            filename: t('students.export.filename'),
            sheetName: t('students.export.sheetName'),
            title: '',
            subtitle: subtitleParts.join(' • '),
            headerImageSrc: headerImg,
            headers,
            rows,
        };
    }, [canExport, students, sections, gradeSectionFilter, cohortId, yearFilter, gradeFilter, shiftFilter, statusFilter, years, grades, shifts, t]);

    const ensureImportFilters = () => {
        if (!importFiltersReady) {
            toast.error(t('students.import.errors.selectFiltersFirst'));
            return false;
        }
        return true;
    };

    const safeFilePart = (s) => String(s || '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^\p{L}\p{N}_-]+/gu, '')
        .slice(0, 50);

    const downloadStudentTemplate = async () => {
        if (!canAddStudent) {
            toast.error(t('students.table.permissions.noAdd'));
            return;
        }
        if (!ensureImportFilters()) return;
        if (downloadingTemplate) return;

        setDownloadingTemplate(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const wb = new ExcelJS.Workbook();
            wb.creator = 'Nuuru Al-Bayaan';
            wb.created = new Date();

            const ws = wb.addWorksheet('Students');
            const headers = STUDENT_IMPORT_TEMPLATE_FIELDS.map((h) => getTemplateHeaderLabel(h, lang));
            ws.addRow(headers);
            ws.getRow(1).font = { bold: true };
            ws.views = [{ state: 'frozen', ySplit: 1, rightToLeft: Boolean(isRTL) }];
            ws.columns = headers.map(() => ({ width: 22 }));

            const maxRows = 500;
            const colIndexByKey = new Map();
            STUDENT_IMPORT_TEMPLATE_FIELDS.forEach((field, idx) => {
                colIndexByKey.set(field.key, idx + 1);
            });

            const listSheet = wb.addWorksheet('_lists');
            listSheet.state = 'veryHidden';
            listSheet.views = [{ rightToLeft: Boolean(isRTL) }];

            const toColumnLetter = (n) => {
                let num = Number(n || 0);
                let out = '';
                while (num > 0) {
                    const rem = (num - 1) % 26;
                    out = String.fromCharCode(65 + rem) + out;
                    num = Math.floor((num - 1) / 26);
                }
                return out || 'A';
            };

            const uniqueValues = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

            const writeListColumn = (colIndex, values) => {
                const clean = uniqueValues(values);
                clean.forEach((value, idx) => {
                    listSheet.getCell(idx + 1, colIndex).value = value;
                });
                const colLetter = toColumnLetter(colIndex);
                return `'${listSheet.name}'!$${colLetter}$1:$${colLetter}$${Math.max(clean.length, 1)}`;
            };

            const applyListValidation = (colIndex, range) => {
                if (!colIndex) return;
                for (let row = 2; row <= maxRows; row += 1) {
                    ws.getCell(row, colIndex).dataValidation = {
                        type: 'list',
                        allowBlank: true,
                        formulae: [range],
                        showErrorMessage: false,
                    };
                }
            };

            const applyDateValidation = (colIndex) => {
                if (!colIndex) return;
                ws.getColumn(colIndex).numFmt = 'yyyy-mm-dd';
                for (let row = 2; row <= maxRows; row += 1) {
                    ws.getCell(row, colIndex).dataValidation = {
                        type: 'date',
                        operator: 'between',
                        allowBlank: true,
                        formulae: [new Date(1900, 0, 1), new Date(2100, 11, 31)],
                    };
                }
            };

            const yesNoList = [
                t('common.yes', { defaultValue: 'Yes' }),
                t('common.no', { defaultValue: 'No' }),
            ];
            const genderList = [
                t('students.form.male', { defaultValue: 'Male' }),
                t('students.form.female', { defaultValue: 'Female' }),
            ];
            const guardianRelList = [
                t('students.form.relationships.father', { defaultValue: 'Father' }),
                t('students.form.relationships.mother', { defaultValue: 'Mother' }),
                t('students.form.relationships.guardian', { defaultValue: 'Guardian' }),
                t('students.form.relationships.other', { defaultValue: 'Other' }),
            ];
            const nationalityList = [
                t('students.address.nationality.somali', { defaultValue: 'Somali' }),
                t('students.address.nationality.notSomali', { defaultValue: 'Not Somali' }),
            ];
            const idTypeList = [
                t('students.form.idDocument.types.nationalId', { defaultValue: 'National ID' }),
                t('students.form.idDocument.types.passport', { defaultValue: 'Passport' }),
                t('students.form.idDocument.types.birthCertificate', { defaultValue: 'Birth Certificate' }),
                t('students.form.idDocument.types.other', { defaultValue: 'Other' }),
            ];
            const bloodGroupList = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

            const langKey = String(lang || 'en').toLowerCase().startsWith('ar')
                ? 'ar'
                : (String(lang || 'en').toLowerCase().startsWith('so') ? 'so' : 'en');
            const regionList = uniqueValues(
                SOMALIA_REGIONS.map((r) => r?.label?.[langKey] || r?.label?.en)
            );

            const districtRows = Object.values(SOMALIA_DISTRICTS_BY_REGION || {}).flat();
            const districtList = uniqueValues(
                districtRows.map((d) => d?.label?.[langKey] || d?.label?.en)
            );

            const yesNoRange = writeListColumn(1, yesNoList);
            const genderRange = writeListColumn(2, genderList);
            const guardianRelRange = writeListColumn(3, guardianRelList);
            const nationalityRange = writeListColumn(4, nationalityList);
            const idTypeRange = writeListColumn(5, idTypeList);
            const bloodGroupRange = writeListColumn(6, bloodGroupList);
            const regionRange = writeListColumn(7, regionList);
            const districtRange = writeListColumn(8, districtList);

            applyListValidation(colIndexByKey.get('gender'), genderRange);
            applyDateValidation(colIndexByKey.get('dob'));
            applyDateValidation(colIndexByKey.get('admissionDate'));
            applyListValidation(colIndexByKey.get('guardianRelationship'), guardianRelRange);
            applyListValidation(colIndexByKey.get('isSomali'), nationalityRange);
            applyListValidation(colIndexByKey.get('residenceRegionId'), regionRange);
            applyListValidation(colIndexByKey.get('residenceDistrictId'), districtRange);
            applyListValidation(colIndexByKey.get('idType'), idTypeRange);
            applyDateValidation(colIndexByKey.get('idExpiresAt'));
            applyListValidation(colIndexByKey.get('medicalAllergies'), yesNoRange);
            applyListValidation(colIndexByKey.get('medicalConditions'), yesNoRange);
            applyListValidation(colIndexByKey.get('disabilityFlags'), yesNoRange);
            applyListValidation(colIndexByKey.get('transferIsTransfer'), yesNoRange);
            applyListValidation(colIndexByKey.get('bloodGroup'), bloodGroupRange);

            const gs = (sections || []).find((s) => String(s._id) === String(gradeSectionFilter));
            const gradeName = grades.find((g) => String(g._id) === String(gradeFilter))?.gradeName || '';
            const shiftName = shifts.find((s) => String(s._id) === String(shiftFilter))?.shiftName || '';
            const secName = gs?.section ? `${t('students.export.sectionPrefix')} ${gs.section}` : '';

            const meta = wb.addWorksheet('_meta');
            meta.addRow(['academicYearId', String(yearFilter || '')]);
            meta.addRow(['gradeSectionId', String(gradeSectionFilter || '')]);
            meta.addRow(['cohortId', String(cohortId || '')]);
            meta.addRow(['gradeId', String(gradeFilter || '')]);
            meta.addRow(['shiftId', String(shiftFilter || '')]);
            meta.addRow(['gradeName', String(gradeName || '')]);
            meta.addRow(['shiftName', String(shiftName || '')]);
            meta.addRow(['section', String(secName || '')]);
            meta.addRow(['generatedAt', new Date().toISOString()]);
            meta.state = 'veryHidden';

            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const parts = [
                'students_template',
                safeFilePart(gradeName) || safeFilePart(gradeFilter),
                safeFilePart(shiftName) || safeFilePart(shiftFilter),
                safeFilePart(secName) || safeFilePart(gradeSectionFilter),
            ].filter(Boolean);
            a.download = `${parts.join('_')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Template download failed', e);
            toast.error(e?.message || t('common.error', { defaultValue: 'Error' }));
        } finally {
            setDownloadingTemplate(false);
        }
    };

    const openImportModal = () => {
        if (!canAddStudent) {
            toast.error(t('students.table.permissions.noAdd'));
            return;
        }
        if (!ensureImportFilters()) return;
        setIsImportOpen(true);
    };

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
        <div className="space-y-6 with-print-header with-print-footer print-fit-wide">
            <PrintHeader />
            <PrintFooter left={t('common.generatedBy')} />

            <EnrollmentCohortToolbar
                enrollmentStatus={enrollmentStatus}
                enrollmentStatusOptions={[
                    { value: 'open', label: t('students.enrollmentStatus.open') },
                    { value: 'active', label: t('students.enrollmentStatus.active') },
                    { value: 'inactive', label: t('students.enrollmentStatus.inactive') },
                    { value: 'promoted', label: t('students.enrollmentStatus.promoted') },
                    { value: 'graduated', label: t('students.enrollmentStatus.graduated') },
                    { value: 'transferred', label: t('students.enrollmentStatus.transferred') },
                    { value: 'withdrawn', label: t('students.enrollmentStatus.withdrawn') },
                    { value: 'all', label: t('students.enrollmentStatus.all') },
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
                cohortPlaceholder={t('students.cohortOptional')}
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
                            <SearchInput value={searchTerm} onChange={setSearch} placeholder={t('students.searchPlaceholder')} />
                        </div>

                        <FilterRow className="flex-1">
                            <FilterItem grow minWidthClass="sm:min-w-40">
                                <AcademicYearSelect
                                    placeholder={t('students.filters.academicYear')}
                                    value={yearFilter}
                                    onChange={(v)=>{ setYearFilter(v); setPage(1); }}
                                    searchable
                                    maxVisible={5}
                                    searchPlaceholder={t('students.filters.searchAcademicYears')}
                                    className="w-full"
                                />
                            </FilterItem>

                            <FilterItem minWidthClass="sm:min-w-44">
                                <DropdownSelect
                                    value={gradeFilter}
                                    onChange={(v)=>{ setGradeFilter(v); setPage(1); }}
                                    placeholder={t('students.filters.grade')}
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
                                    placeholder={t('students.filters.shift')}
                                    options={(shifts || []).map((s) => ({ value: s._id, label: s.shiftName }))}
                                    maxVisible={5}
                                />
                            </FilterItem>

                            <FilterItem minWidthClass="sm:min-w-56">
                                <FilterDropdownSelect
                                    value={gradeSectionFilter}
                                    onChange={(v)=>{ setGradeSectionFilter(v); setPage(1); }}
                                    placeholder={t('students.filters.section')}
                                    disabled={!gradeFilter || !shiftFilter}
                                    options={(sections || []).map((gs) => {
                                        const gradeName = gs?.grade?.gradeName;
                                        const sectionNum = gs?.section;
                                        const yearName = gs?.academicYear?.yearName;
                                        const shiftName = gs?.shift?.shiftName;
                                        const tail = [yearName, shiftName].filter(Boolean).join(' - ');
                                        const label = [
                                            gradeName ? `${gradeName}` : null,
                                            sectionNum ? `${t('students.export.sectionPrefix')} ${sectionNum}` : null,
                                            tail ? `(${tail})` : null,
                                        ].filter(Boolean).join(' - ');
                                        return { value: gs._id, label: label || gs.sectionName || t('students.filters.section') };
                                    })}
                                    maxVisible={5}
                                    searchPlaceholder={t('students.filters.searchSections')}
                                />
                            </FilterItem>

                            <FilterItem minWidthClass="sm:min-w-44">
                                <DropdownSelect
                                    value={statusFilter}
                                    onChange={(v) => { setStatusFilter(v); setPage(1); }}
                                    placeholder={t('students.filters.status')}
                                    options={[
                                        { value: '', label: t('students.filters.all') },
                                        { value: 'Active', label: t('students.filters.active') },
                                        { value: 'Inactive', label: t('students.filters.inactive') },
                                    ]}
                                />
                            </FilterItem>
                        </FilterRow>
                    </div>

                    {/* Row 2: Add + Import (left) + Actions (right) */}
                    <div className="w-full flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 w-full lg:w-auto">
                            {canAddStudent && (
                                <Button
                                    variant="brand"
                                    size="lg"
                                    onClick={handleAddNew}
                                    icon={<Plus size={20} />}
                                    className="w-full sm:w-auto justify-center"
                                >
                                    {t('students.addNew')}
                                </Button>
                            )}
                            <ActionButton
                                variant="outline"
                                onClick={downloadStudentTemplate}
                                disabled={!importFiltersReady || downloadingTemplate}
                                icon={<Download size={16} />}
                                className="w-full sm:w-auto justify-center"
                                title={t('students.import.actions.downloadTemplate')}
                            >
                                {t('students.import.actions.downloadTemplate')}
                            </ActionButton>
                            <ActionButton
                                variant="outline"
                                onClick={openImportModal}
                                disabled={!importFiltersReady}
                                icon={<Upload size={16} />}
                                className="w-full sm:w-auto justify-center"
                                title={t('students.import.actions.importExcel')}
                            >
                                {t('students.import.actions.importExcel')}
                            </ActionButton>
                        </div>

                        <div className="flex items-center justify-end gap-2 flex-nowrap overflow-x-auto w-full lg:w-auto">
                            {canDownloadStudents && (
                                <>
                                    <ActionButton
                                        variant="outline"
                                        onClick={handlePrint}
                                        title={t('common.actions.print')}
                                        icon={<Printer size={16} />}
                                    >
                                        {t('common.actions.print')}
                                    </ActionButton>

                                    <PdfDownloadButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
                                    <ExcelDownloadButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
                                    <CsvDownloadButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
                                    <CopyTableButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
                                </>
                            )}

                            <ActionButton
                                variant="outline"
                                onClick={handleReset}
                                title={t('students.resetFilters')}
                                icon={<RotateCcw size={16} />}
                            >
                                {t('common.actions.reset')}
                            </ActionButton>
                        </div>
                    </div>
                </div>
            </Card>
            <TableState
                isLoading={isLoading && students.length === 0}
                error={error}
                items={students}
                loadingMessage={t('students.table.loading')}
                loadingVariant="table"
                loadingRows={6}
                loadingColumns={8}
                emptyTitle={t('students.table.emptyTitle')}
                emptyDescription={t('students.table.emptyDescription')}
                emptyActionLabel={t('students.table.emptyAction')}
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

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingStudent ? t('students.editTitle') : t('students.addTitle')}
                panelClassName="max-w-none w-[96vw]"
                headerClassName="bg-linear-to-r from-(--nb-color-brand) to-(--nb-color-accent) text-white border-b border-white/10"
                titleClassName="text-white text-xl font-bold"
                closeButtonClassName="text-white/90 hover:text-white p-1 rounded-(--nb-radius-sm) hover:bg-white/10 transition-colors"
                bodyClassName="p-3 nb-scrollbar-none"
            >
                <div className="relative">
                    {loadingEdit && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 text-sm text-gray-600">
                            {t('students.loadingFullDetails')}
                        </div>
                    )}
                    <StudentForm
                        key={editingStudent ? String(editingStudent?._id || 'edit') : `create:${createFormKey}`}
                        student={editingStudent}
                        onClose={closeModal}
                        onSubmit={handleSubmit}
                        classes={classes}
                        submitting={isSaving}
                    />
                </div>
            </Modal>

            <StudentImportExcelModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                canInput={canAddStudent}
                importParams={importParams}
                onImported={() => {
                    try { queryClient.invalidateQueries({ queryKey: studentKeys.adminListBase }); } catch { /* ignore */ }
                }}
            />

            {/* Transfer flow removed from Student page; use Transfers page */}
        </div>
    );
}
// Simple CSV export of current page

