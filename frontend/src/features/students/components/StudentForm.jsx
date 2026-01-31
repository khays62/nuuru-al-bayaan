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

// Refactored StudentForm aligned with backend API (POST /api/students)
// Academic Year and Cohort are required at creation; GradeSection is AY-agnostic.
const EMPTY_ARR = [];

export default function StudentForm({ student, onClose, onSubmit, submitting = false }) {
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
                toast.info('No sections found. Adjust filters.', { id: 'no-sections' });
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
            if (!formData.academicYearId) return toast.error('Academic Year is required');
            if (!formData.cohortId) return toast.error('Cohort is required');
            if (!formData.gradeId) return toast.error('Grade is required');
            if (!formData.shiftId) return toast.error('Shift is required');
            if (!formData.gradeSectionId) return toast.error('Section is required');
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
                    <Label>Full Name</Label>
                    <Input name="fullName" value={formData.fullName} onChange={handleChange} type="text" required disabled={submitting} className="mt-1" />
                </div>
                <div>
                    <Label>Gender</Label>
                    <Select name="gender" value={formData.gender} onChange={handleChange} disabled={submitting} className="mt-1">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </Select>
                </div>
                <div>
                    <Label>Date of Birth</Label>
                    <Input name="dob" value={formData.dob} onChange={handleChange} type="date" disabled={submitting} className="mt-1" />
                </div>
                <div>
                    <Label>Parent/Guardian Name</Label>
                    <Input name="guardianName" value={formData.guardianName} onChange={handleChange} type="text" required disabled={submitting} className="mt-1" />
                </div>
                <div>
                    <Label>Contact Number</Label>
                    <Input name="contactNumber" value={formData.contactNumber} onChange={handleChange} type="text" required disabled={submitting} className="mt-1" />
                </div>
                <div>
                    <Label>Admission Date</Label>
                    <Input name="admissionDate" value={formData.admissionDate} onChange={handleChange} type="date" required disabled={submitting} className="mt-1" />
                </div>
                <div className="md:col-span-2">
                    <Label>Address</Label>
                    <Textarea name="address" value={formData.address} onChange={handleChange} rows={3} disabled={submitting} className="mt-1" />
                </div>

                <Separator className="md:col-span-2 my-2" />

                {!student && (
                    <>
                        <div>
                            <Label>Academic Year</Label>
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
                                    placeholder="-- Select Academic Year --"
                                    maxVisible={5}
                                    searchPlaceholder="Search academic years…"
                                    disabled={submitting}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Cohort</Label>
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
                                    placeholder="-- Select Cohort --"
                                    maxVisible={5}
                                    searchPlaceholder="Search cohorts…"
                                    disabled={submitting || !formData.academicYearId}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Grade</Label>
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
                                    placeholder="-- Select Grade --"
                                    disabled={submitting}
                                    maxHeightClassName="max-h-72"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Shift</Label>
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
                                    placeholder="-- Select Shift --"
                                    disabled={submitting || !formData.gradeId}
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <Label>Enroll in Section</Label>
                            <div className="mt-1">
                                <DropdownSelect
                                    id="student-section"
                                    name="gradeSectionId"
                                    value={formData.gradeSectionId}
                                    onChange={(v) => setField('gradeSectionId', v)}
                                    options={(sections || []).map((sec) => ({
                                        value: sec._id,
                                        label: `${sec.grade?.gradeName || ''} - Sec ${sec.section} (${sec.shift?.shiftName || ''})`,
                                    }))}
                                    placeholder={loadingSections ? 'Loading sections…' : '-- Select Section --'}
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
                    Cancel
                </Button>
                <Button type="submit" disabled={submitting} variant="brand">
                    {submitting ? (student ? 'Updating…' : 'Saving…') : (student ? 'Update Student' : 'Save Student')}
                </Button>
            </div>
        </form>
    );
}

