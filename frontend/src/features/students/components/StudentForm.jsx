import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAcademicYears, getGrades, getShifts } from '../../lookups/api/lookups';
import { listGradeSections } from '../../grades/api/gradeSections';
import { listCohorts } from '../../cohorts/api/cohorts';
import toast from 'react-hot-toast';
import Label from '../../../shared/components/ui/Label.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Select from '../../../shared/components/ui/Select.jsx';
import Textarea from '../../../shared/components/ui/Textarea.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Separator from '../../../shared/components/ui/Separator.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';
import { studentKeys } from '../queryKeys';
import { useI18n } from '../../../i18n/I18nProvider';

// Refactored StudentForm aligned with backend API (POST /api/students)
// Academic Year and Cohort are required at creation; GradeSection is AY-agnostic.
const EMPTY_ARR = [];

export default function StudentForm({ student, onClose, onSubmit, submitting = false }) {
    const { t } = useI18n();
    const [formData, setFormData] = useState({
        fullName: '',
        gender: 'Male',
        dob: '',
        guardianName: '',
        contactNumber: '',
        address: '',
        admissionDate: new Date().toISOString().split('T')[0],
        status: 'Active', // still local; not sent in create (backend sets default)
        academicYearId: '',
        cohortId: '',
        gradeId: '',
        shiftId: '',
        gradeSectionId: ''
    });

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

    const cohortsQuery = useQuery({
        queryKey: studentKeys.cohorts({ status: 'active', academicYearId: formData.academicYearId, limit: 200 }),
        queryFn: async () => {
            const { data } = await listCohorts({ status: 'active', ay: formData.academicYearId, limit: 200 });
            return Array.isArray(data) ? data : [];
        },
        placeholderData: (prev) => prev,
    });

    const { gradeId, shiftId } = formData;
    const sectionsQuery = useQuery({
        queryKey: studentKeys.gradeSectionsByGradeShift({ gradeId, shiftId, limit: 200 }),
        enabled: Boolean(gradeId && shiftId),
        queryFn: async ({ signal }) => {
            const res = await listGradeSections({ grade: gradeId, shift: shiftId, limit: 200 }, { signal });
            const rows = res?.data || res;
            return Array.isArray(rows) ? rows : [];
        },
        placeholderData: (prev) => prev,
    });

    const years = yearsQuery.data ?? EMPTY_ARR;
    const grades = gradesQuery.data ?? EMPTY_ARR;
    const shifts = shiftsQuery.data ?? EMPTY_ARR;
    const cohorts = cohortsQuery.data ?? EMPTY_ARR;
    const sections = sectionsQuery.data ?? EMPTY_ARR;
    const loadingSections = Boolean(sectionsQuery.isFetching && !sectionsQuery.data);

    useEffect(() => {
        if (student) {
            setFormData(prev => ({
                ...prev,
                fullName: student.fullName || '',
                gender: student.gender || 'Male',
                dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '',
                guardianName: student.guardianName || '',
                contactNumber: student.contactNumber || '',
                address: student.address || '',
                admissionDate: student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : prev.admissionDate,
                status: student.status || 'Active',
                // For create-only enrollment we hide cascading selects when editing
                gradeSectionId: ''
            }));
        }
    }, [student]);

    const lastNoSectionsKeyRef = useRef('');
    const sectionsKey = useMemo(() => `${String(gradeId || '')}|${String(shiftId || '')}`, [gradeId, shiftId]);

    useEffect(() => {
        if (!gradeId || !shiftId) {
            setFormData(prev => (prev.gradeSectionId ? ({ ...prev, gradeSectionId: '' }) : prev));
            lastNoSectionsKeyRef.current = '';
            return;
        }

        // If sections result is empty, mirror old UX: show a single info toast.
        if (sectionsQuery.isFetched && !sectionsQuery.isFetching) {
            const rows = Array.isArray(sections) ? sections : [];
            if (rows.length === 0 && lastNoSectionsKeyRef.current !== sectionsKey) {
                lastNoSectionsKeyRef.current = sectionsKey;
                toast.dismiss('no-sections');
                toast.info(t('students.form.info.noSections'), { id: 'no-sections' });
            }
        }
    }, [gradeId, shiftId, sectionsQuery.isFetched, sectionsQuery.isFetching, sectionsKey, sections]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value }));
    };

    const setField = (name, value) => {
        setFormData((p) => ({ ...p, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!student) {
            if (!formData.academicYearId) return toast.error(t('students.form.validations.academicYearRequired'));
            if (!formData.cohortId) return toast.error(t('students.form.validations.cohortRequired'));
            if (!formData.gradeId) return toast.error(t('students.form.validations.gradeRequired'));
            if (!formData.shiftId) return toast.error(t('students.form.validations.shiftRequired'));
            if (!formData.gradeSectionId) return toast.error(t('students.form.validations.sectionRequired'));
        }

        // Only include fields API expects
        const payload = {
            academicYearId: formData.academicYearId,
            cohortId: formData.cohortId,
            gradeSectionId: formData.gradeSectionId,
            fullName: formData.fullName.trim(),
            gender: formData.gender,
            dob: formData.dob || null,
            guardianName: formData.guardianName.trim(),
            contactNumber: formData.contactNumber.trim(),
            address: formData.address?.trim() || '',
            admissionDate: formData.admissionDate
        };
        onSubmit?.(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label>{t('students.form.fullName')}</Label>
                    <Input name="fullName" value={formData.fullName} onChange={handleChange} type="text" required disabled={submitting} className="mt-1" />
                </div>
                <div>
                    <Label>{t('students.form.gender')}</Label>
                    <Select name="gender" value={formData.gender} onChange={handleChange} disabled={submitting} className="mt-1">
                        <option value="Male">{t('students.form.male')}</option>
                        <option value="Female">{t('students.form.female')}</option>
                    </Select>
                </div>
                <div>
                    <Label>{t('students.form.dob')}</Label>
                    <Input name="dob" value={formData.dob} onChange={handleChange} type="date" disabled={submitting} className="mt-1" />
                </div>
                <div>
                    <Label>{t('students.form.guardianName')}</Label>
                    <Input name="guardianName" value={formData.guardianName} onChange={handleChange} type="text" required disabled={submitting} className="mt-1" />
                </div>
                <div>
                    <Label>{t('students.form.contactNumber')}</Label>
                    <Input name="contactNumber" value={formData.contactNumber} onChange={handleChange} type="text" required disabled={submitting} className="mt-1" />
                </div>
                <div>
                    <Label>{t('students.form.admissionDate')}</Label>
                    <Input name="admissionDate" value={formData.admissionDate} onChange={handleChange} type="date" required disabled={submitting} className="mt-1" />
                </div>
                <div className="md:col-span-2">
                    <Label>{t('students.form.address')}</Label>
                    <Textarea name="address" value={formData.address} onChange={handleChange} rows={3} disabled={submitting} className="mt-1" />
                </div>

                <Separator className="md:col-span-2 my-2" />

                {!student && (
                    <>
                        <div>
                            <Label>{t('students.form.academicYear')}</Label>
                            <div className="mt-1">
                                <SearchableSelect
                                    id="student-academic-year"
                                    name="academicYearId"
                                    value={formData.academicYearId}
                                    onChange={(v) => {
                                        setField('academicYearId', v);
                                        setField('cohortId', '');
                                    }}
                                    options={(years || []).map((y) => ({ value: y._id, label: y.yearName }))}
                                    placeholder={t('students.form.selectAcademicYear')}
                                    maxVisible={5}
                                    searchPlaceholder={t('students.filters.searchAcademicYears')}
                                    disabled={submitting}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>{t('students.form.cohort')}</Label>
                            <div className="mt-1">
                                <SearchableSelect
                                    id="student-cohort"
                                    name="cohortId"
                                    value={formData.cohortId}
                                    onChange={(v) => setField('cohortId', v)}
                                    options={(cohorts || []).map((c) => ({
                                        value: c._id,
                                        label: `${c.name}${c.startAcademicYear?.yearName ? ` (${c.startAcademicYear.yearName})` : ''}`,
                                    }))}
                                    placeholder={t('students.form.selectCohort')}
                                    maxVisible={5}
                                    searchPlaceholder={t('common.search', { defaultValue: 'Search…' })}
                                    disabled={submitting || !formData.academicYearId}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>{t('students.form.grade')}</Label>
                            <div className="mt-1">
                                <DropdownSelect
                                    id="student-grade"
                                    name="gradeId"
                                    value={formData.gradeId}
                                    onChange={(v) => {
                                        setField('gradeId', v);
                                        setField('shiftId', '');
                                        setField('gradeSectionId', '');
                                    }}
                                    options={[...(grades || [])]
                                        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                                        .map((g) => ({ value: g._id, label: g.gradeName }))}
                                    placeholder={t('students.form.selectGrade')}
                                    disabled={submitting}
                                    maxHeightClassName="max-h-72"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>{t('students.form.shift')}</Label>
                            <div className="mt-1">
                                <DropdownSelect
                                    id="student-shift"
                                    name="shiftId"
                                    value={formData.shiftId}
                                    onChange={(v) => {
                                        setField('shiftId', v);
                                        setField('gradeSectionId', '');
                                    }}
                                    options={(shifts || []).map((s) => ({ value: s._id, label: s.shiftName }))}
                                    placeholder={t('students.form.selectShift')}
                                    disabled={submitting || !formData.gradeId}
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <Label>{t('students.form.enrollSection')}</Label>
                            <div className="mt-1">
                                <DropdownSelect
                                    id="student-section"
                                    name="gradeSectionId"
                                    value={formData.gradeSectionId}
                                    onChange={(v) => setField('gradeSectionId', v)}
                                    options={(sections || []).map((sec) => ({
                                        value: sec._id,
                                        label: `${sec.grade?.gradeName || ''} - ${t('students.export.sectionPrefix')} ${sec.section} (${sec.shift?.shiftName || ''})`,
                                    }))}
                                    placeholder={loadingSections ? t('students.form.loadingSections') : t('students.form.selectSection')}
                                    disabled={submitting || loadingSections || !formData.gradeId || !formData.shiftId}
                                    maxHeightClassName="max-h-72"
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
            <div className="mt-8 flex justify-end space-x-4">
                <Button type="button" onClick={onClose} disabled={submitting} variant="neutral">
                    {t('students.form.cancel')}
                </Button>
                <Button type="submit" disabled={submitting} variant="brand">
                    {submitting
                        ? (student ? t('students.form.updating') : t('students.form.saving'))
                        : (student ? t('students.form.updateStudent') : t('students.form.saveStudent'))}
                </Button>
            </div>
        </form>
    );
}

