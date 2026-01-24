import React, { useState, useEffect } from 'react';
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

// Refactored StudentForm aligned with backend API (POST /api/students)
// Academic Year and Cohort are required at creation; GradeSection is AY-agnostic.
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

    // Lookups
    const [years, setYears] = useState([]);
    const [grades, setGradesState] = useState([]);
    const [shifts, setShiftsState] = useState([]);
    const [cohorts, setCohorts] = useState([]);
    const [sections, setSections] = useState([]);
    const [loadingSections, setLoadingSections] = useState(false);

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

    // Load lookups on mount
    useEffect(() => {
        (async () => {
            const [ys, gs, ss] = await Promise.all([getAcademicYears(), getGrades(), getShifts()]);
            setYears(ys || []);
            setGradesState(gs || []);
            setShiftsState(ss || []);
        })();
    }, []);

    // When AY changes, load cohorts (optionally filter by AY)
    useEffect(() => {
        (async () => {
            try {
                // Filter cohorts by selected AY if provided; show active by default
                const { data } = await listCohorts({ status: 'active', ay: formData.academicYearId, limit: 200 });
                setCohorts(data || []);
            } catch {
                setCohorts([]);
            }
        })();
    }, [formData.academicYearId]);

    // When Grade/Shift changes, fetch sections (AY-agnostic)
    const { gradeId, shiftId } = formData;
    useEffect(() => {
        if (!gradeId || !shiftId) {
            setSections([]);
            setFormData(prev => ({ ...prev, gradeSectionId: '' }));
            return;
        }
        setLoadingSections(true);
        listGradeSections({ grade: gradeId, shift: shiftId, limit: 200 })
            .then(res => {
                const rows = res?.data || [];
                setSections(rows);
                if (rows.length === 0) {
                    toast.dismiss('no-sections');
                    toast.info('No sections found. Adjust filters.', { id: 'no-sections' });
                }
            })
            .catch(() => setSections([]))
            .finally(() => setLoadingSections(false));
    }, [gradeId, shiftId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
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
                            <Select name="academicYearId" value={formData.academicYearId} onChange={handleChange} required disabled={submitting} className="mt-1">
                                <option value="">-- Select Academic Year --</option>
                                {years.map(y => <option key={y._id} value={y._id}>{y.yearName}</option>)}
                            </Select>
                        </div>
                        <div>
                            <Label>Cohort</Label>
                            <Select name="cohortId" value={formData.cohortId} onChange={handleChange} required disabled={submitting || !formData.academicYearId} className="mt-1">
                                <option value="">-- Select Cohort --</option>
                                {(cohorts||[]).map(c => <option key={c._id} value={c._id}>{c.name}{c.startAcademicYear?.yearName ? ` (${c.startAcademicYear.yearName})` : ''}</option>)}
                            </Select>
                        </div>
                        <div>
                            <Label>Grade</Label>
                            <Select name="gradeId" value={formData.gradeId} onChange={handleChange} required disabled={submitting} className="mt-1">
                                <option value="">-- Select Grade --</option>
                                {[...grades].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map(g => <option key={g._id} value={g._id}>{g.gradeName}</option>)}
                            </Select>
                        </div>
                        <div>
                            <Label>Shift</Label>
                            <Select name="shiftId" value={formData.shiftId} onChange={handleChange} required disabled={submitting || !formData.gradeId} className="mt-1">
                                <option value="">-- Select Shift --</option>
                                {shifts.map(s => <option key={s._id} value={s._id}>{s.shiftName}</option>)}
                            </Select>
                        </div>
                        <div className="md:col-span-2">
                            <Label>Enroll in Section</Label>
                            <Select name="gradeSectionId" value={formData.gradeSectionId} onChange={handleChange} required disabled={submitting || loadingSections || !formData.gradeId || !formData.shiftId} className="mt-1">
                                <option value="">{loadingSections ? 'Loading sections…' : '-- Select Section --'}</option>
                                {sections.map(sec => (
                                    <option key={sec._id} value={sec._id}>{`${sec.grade?.gradeName || ''} - Sec ${sec.section} (${sec.shift?.shiftName || ''})`}</option>
                                ))}
                            </Select>
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

