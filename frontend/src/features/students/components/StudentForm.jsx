import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAcademicYears, getGrades, getShifts } from '../../lookups/api/lookups';
import { listGradeSections } from '../../grades/api/gradeSections';
import { listCohorts } from '../../cohorts/api/cohorts';
import toast from 'react-hot-toast';
import Label from '../../../shared/components/ui/Label.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Textarea from '../../../shared/components/ui/Textarea.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';
import { studentKeys } from '../queryKeys';
import { useI18n } from '../../../i18n/useI18n';
import SomaliaAddressFields from '../../../shared/components/address/SomaliaAddressFields.jsx';
import { normalizeSomaliaPhone, isValidSomaliaPhone } from '../../../shared/utils/phoneSomalia.js';

// Refactored StudentForm aligned with backend API (POST /api/students)
// Academic Year and Cohort are required at creation; GradeSection is AY-agnostic.
const EMPTY_ARR = [];

const BLUR_VALIDATION_TOAST_ID = 'student-form:blur-validation';

const STUDENT_PHOTO_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_STUDENT_PHOTO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const collapseWsKeepTrailing = (value) => {
    const raw = String(value ?? '');
    const endsWithSpace = /\s$/.test(raw);
    const collapsed = raw.replace(/\s+/g, ' ').replace(/^\s+/, '');
    const core = collapsed.trim();
    if (!core) return '';
    return endsWithSpace ? `${core} ` : core;
};

const toTitleCaseWordsLive = (value) => {
    const s = collapseWsKeepTrailing(value);
    if (!s) return '';
    const endsWithSpace = s.endsWith(' ');
    const core = s.trim();
    const formatted = core
        .split(' ')
        .filter(Boolean)
        .map((w) => {
            const word = String(w || '');
            const first = word[0]?.toUpperCase?.() || '';
            const rest = word.slice(1).toLowerCase();
            return `${first}${rest}`;
        })
        .join(' ');
    return endsWithSpace ? `${formatted} ` : formatted;
};

const countWords = (value) => {
    const s = String(value ?? '').replace(/\s+/g, ' ').trim();
    if (!s) return 0;
    return s.split(' ').filter(Boolean).length;
};

const sanitizeSomaliaPhoneInput = (value) => {
    const raw = String(value ?? '');
    const hasPlus = raw.startsWith('+');
    const digits = raw.replace(/\D/g, '');
    return hasPlus ? `+${digits}` : digits;
};

const getSomaliaNationalDigits = (value) => {
    const raw = String(value ?? '');
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('252')) return digits.slice(3);
    if (digits.startsWith('0')) return digits.slice(1);
    return digits;
};

export default function StudentForm({ student, onClose, onSubmit, submitting = false }) {
    const { t } = useI18n();
    const [, setTouched] = useState({});
    const [photoFile, setPhotoFile] = useState(null);
    const [photoInputKey, setPhotoInputKey] = useState(0);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
    const [formData, setFormData] = useState({
        fullName: '',
        motherName: '',
        gender: 'Male',
        dob: '',
        birthPlace: '',
        guardianName: '',
        guardianRelationship: 'Guardian',
        guardianPhone1: '',
        guardianPhone2: '',
        guardianEmail: '',
        studentPhone: '',
        studentEmail: '',
        transferIsTransfer: false,
        transferPreviousSchoolName: '',
        transferReason: '',
        notes: '',
        medicalAllergies: '',
        medicalConditions: '',
        disabilityFlags: '', // comma-separated
        bloodGroup: '',
        idType: '',
        idNumber: '',
        idIssuedBy: '',
        idExpiresAt: '',
        isSomali: true,
        residenceRegionId: '',
        residenceDistrictId: '',
        residenceNeighborhood: '',
        admissionDate: new Date().toISOString().split('T')[0],
        status: 'Active', // still local; not sent in create (backend sets default)
        academicYearId: '',
        cohortId: '',
        gradeId: '',
        shiftId: '',
        gradeSectionId: '',
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
            const transfer = student.transfer || {};
            const medical = student.medical || {};
            const idDoc = student.idDocument || {};
            // Reset any pending local photo selection when switching students
            setPhotoFile(null);
            setPhotoInputKey((k) => k + 1);
            setFormData(prev => ({
                ...prev,
                fullName: student.fullName || '',
                motherName: student.motherName || '',
                gender: student.gender || 'Male',
                dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '',
                birthPlace: student.birthPlace || '',
                guardianName: student.guardianName || '',
                guardianRelationship: student.guardianRelationship || 'Guardian',
                guardianPhone1: student.guardianPhone1 || student.contactNumber || '',
                guardianPhone2: student.guardianPhone2 || '',
                guardianEmail: student.guardianEmail || '',
                studentPhone: student.studentPhone || '',
                studentEmail: student.studentEmail || '',
                transferIsTransfer: Boolean(transfer.isTransfer),
                transferPreviousSchoolName: transfer.previousSchoolName || '',
                transferReason: transfer.transferReason || '',
                notes: student.notes || '',
                medicalAllergies: medical.allergies || '',
                medicalConditions: medical.medicalConditions || '',
                disabilityFlags: Array.isArray(medical.disabilityFlags) ? medical.disabilityFlags.join(', ') : (medical.disabilityFlags || ''),
                bloodGroup: medical.bloodGroup || '',
                idType: idDoc.idType || '',
                idNumber: idDoc.idNumber || '',
                idIssuedBy: idDoc.issuedBy || '',
                idExpiresAt: idDoc.expiresAt ? new Date(idDoc.expiresAt).toISOString().split('T')[0] : '',
                isSomali: typeof student.isSomali === 'boolean' ? student.isSomali : true,
                residenceRegionId: student.residenceRegionId || '',
                residenceDistrictId: student.residenceDistrictId || '',
                residenceNeighborhood: student.residenceNeighborhood || student.address || '',
                admissionDate: student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : prev.admissionDate,
                status: student.status || 'Active',
                // For create-only enrollment we hide cascading selects when editing
                gradeSectionId: ''
            }));
        }
    }, [student]);

    useEffect(() => {
        if (!photoFile) {
            setPhotoPreviewUrl('');
            return;
        }
        const url = URL.createObjectURL(photoFile);
        setPhotoPreviewUrl(url);
        return () => {
            try {
                URL.revokeObjectURL(url);
            } catch {
                // ignore
            }
        };
    }, [photoFile]);

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
    }, [gradeId, shiftId, sectionsQuery.isFetched, sectionsQuery.isFetching, sectionsKey, sections, t]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'fullName' || name === 'motherName' || name === 'guardianName') {
            setFormData(p => ({ ...p, [name]: toTitleCaseWordsLive(value) }));
            return;
        }
        if (name === 'guardianPhone1' || name === 'guardianPhone2' || name === 'studentPhone') {
            setFormData(p => ({ ...p, [name]: sanitizeSomaliaPhoneInput(value) }));
            return;
        }
        setFormData(p => ({ ...p, [name]: value }));
    };

    const setField = (name, value) => {
        setFormData((p) => ({ ...p, [name]: value }));
    };

    const validateFourNames = (value) => countWords(value) === 4;

    const getPhoneValidationError = (value) => {
        const national = getSomaliaNationalDigits(value);
        if (!national) return '';
        if (national.length > 9) return t('students.form.validations.phoneTooLong');
        // Show a helpful hint early when the number start is wrong (even before 9 digits).
        // Expected Somalia national formats typically start with 61/62/68 or 7x (accept +252/252/0-prefix).
        if (national.length >= 1) {
            const first = national[0];
            if (first !== '6' && first !== '7') return t('students.form.validations.phoneInvalidHint');
        }
        if (national.length >= 2) {
            const okStart = /^6[128]/.test(national) || /^7\d/.test(national);
            if (!okStart) return t('students.form.validations.phoneInvalidHint');
        }
        if (national.length < 9) return t('students.form.validations.phoneTooShort');
        return isValidSomaliaPhone(value) ? '' : t('students.form.validations.phoneInvalidHint');
    };

    const nameFieldState = (field) => {
        const v = String(formData[field] ?? '');
        const hasValue = Boolean(v.trim());
        if (!hasValue) {
            return 'neutral';
        }
        return validateFourNames(v) ? 'valid' : 'invalid';
    };

    const phoneFieldState = (field) => {
        const v = String(formData[field] ?? '').trim();
        if (!v) {
            return 'neutral';
        }
        return isValidSomaliaPhone(v) ? 'valid' : 'invalid';
    };

    const stateToClass = (state) => {
        if (state === 'invalid') return 'border-red-500';
        if (state === 'valid') return 'border-green-500';
        return '';
    };

    const onBlurValidate = (field, getErrorMessage, { label = '' } = {}) => {
        setTouched((p) => ({ ...p, [field]: true }));
        const v = String(formData[field] ?? '').trim();
        if (!v) {
            // Avoid noisy validation toasts when users tab through empty required fields.
            // Required errors are shown on submit; blur only marks touched for red borders.
            toast.dismiss(BLUR_VALIDATION_TOAST_ID);
            return;
        }

        const err = getErrorMessage('invalid');
        if (err) toast.error(label ? `${label}: ${err}` : err, { id: BLUR_VALIDATION_TOAST_ID });
        else toast.dismiss(BLUR_VALIDATION_TOAST_ID);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Mark these as touched so borders show immediately on failed submit
        setTouched((p) => ({
            ...p,
            fullName: true,
            motherName: true,
            guardianName: true,
            guardianPhone1: true,
        }));

        if (!String(formData.fullName || '').trim()) return toast.error(t('students.form.validations.fullNameRequired'));
        if (!validateFourNames(formData.fullName)) return toast.error(t('students.form.validations.fullNameFourNames'));

        if (!String(formData.motherName || '').trim()) return toast.error(t('students.form.validations.motherNameRequired'));
        if (!validateFourNames(formData.motherName)) return toast.error(t('students.form.validations.motherNameFourNames'));

        if (!String(formData.guardianName || '').trim()) return toast.error(t('students.form.validations.guardianNameRequired'));
        if (!validateFourNames(formData.guardianName)) return toast.error(t('students.form.validations.guardianNameFourNames'));

        if (!formData.dob) return toast.error(t('students.form.validations.dobRequired'));
        if (!String(formData.birthPlace || '').trim()) return toast.error(t('students.form.validations.birthPlaceRequired'));
        if (!String(formData.guardianRelationship || '').trim()) return toast.error(t('students.form.validations.guardianRelationshipRequired'));

        if (!formData.residenceNeighborhood?.trim()) {
            return toast.error(t('students.form.validations.neighborhoodRequired'));
        }
        if (formData.isSomali !== false) {
            if (!formData.residenceRegionId) return toast.error(t('students.form.validations.regionRequired'));
            if (!formData.residenceDistrictId) return toast.error(t('students.form.validations.districtRequired'));
        }

        const trimmedGuardianPhone1 = String(formData.guardianPhone1 || '').trim();
        if (!trimmedGuardianPhone1) return toast.error(t('students.form.validations.guardianPhone1Required'));
        if (!isValidSomaliaPhone(trimmedGuardianPhone1)) return toast.error(t('students.form.validations.guardianPhone1Invalid'));
        const normalizedGuardianPhone1 = normalizeSomaliaPhone(trimmedGuardianPhone1);

        const trimmedGuardianPhone2 = String(formData.guardianPhone2 || '').trim();
        if (trimmedGuardianPhone2 && !isValidSomaliaPhone(trimmedGuardianPhone2)) {
            return toast.error(t('students.form.validations.guardianPhone2Invalid'));
        }
        const normalizedGuardianPhone2 = trimmedGuardianPhone2 ? normalizeSomaliaPhone(trimmedGuardianPhone2) : '';

        const trimmedStudentPhone = String(formData.studentPhone || '').trim();
        if (trimmedStudentPhone && !isValidSomaliaPhone(trimmedStudentPhone)) {
            return toast.error(t('students.form.validations.studentPhoneInvalid'));
        }
        const normalizedStudentPhone = trimmedStudentPhone ? normalizeSomaliaPhone(trimmedStudentPhone) : '';

        if (formData.transferIsTransfer && !String(formData.transferPreviousSchoolName || '').trim()) {
            return toast.error(t('students.form.validations.previousSchoolNameRequired'));
        }

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
            motherName: formData.motherName.trim(),
            gender: formData.gender,
            dob: formData.dob,
            birthPlace: formData.birthPlace.trim(),
            guardianName: formData.guardianName.trim(),
            guardianRelationship: formData.guardianRelationship,
            guardianPhone1: normalizedGuardianPhone1 || formData.guardianPhone1.trim(),
            guardianPhone2: normalizedGuardianPhone2,
            guardianEmail: String(formData.guardianEmail || '').trim(),
            studentPhone: normalizedStudentPhone,
            studentEmail: String(formData.studentEmail || '').trim(),
            transfer: {
                isTransfer: Boolean(formData.transferIsTransfer),
                previousSchoolName: String(formData.transferPreviousSchoolName || '').trim(),
                transferReason: String(formData.transferReason || '').trim(),
            },
            notes: String(formData.notes || '').trim(),
            medical: {
                allergies: String(formData.medicalAllergies || '').trim(),
                medicalConditions: String(formData.medicalConditions || '').trim(),
                disabilityFlags: String(formData.disabilityFlags || '')
                    .split(',')
                    .map((s) => String(s || '').trim())
                    .filter(Boolean),
                bloodGroup: String(formData.bloodGroup || '').trim(),
            },
            idDocument: {
                idType: String(formData.idType || '').trim(),
                idNumber: String(formData.idNumber || '').trim(),
                issuedBy: String(formData.idIssuedBy || '').trim(),
                expiresAt: formData.idExpiresAt || null,
            },
            // Back-compat: keep legacy field used by list/export
            contactNumber: normalizedGuardianPhone1 || formData.guardianPhone1.trim(),
            isSomali: formData.isSomali !== false,
            residenceRegionId: formData.residenceRegionId || '',
            residenceDistrictId: formData.residenceDistrictId || '',
            residenceNeighborhood: formData.residenceNeighborhood.trim(),
            // Back-compat: keep a simple address string for any legacy UI.
            address: formData.residenceNeighborhood.trim(),
            admissionDate: formData.admissionDate
        };
        onSubmit?.(payload, { photoFile });
    };

    const handlePhotoChange = (e) => {
        const file = e?.target?.files?.[0] || null;
        if (!file) {
            setPhotoFile(null);
            return;
        }

        const mime = String(file.type || '').toLowerCase();
        const size = Number(file.size || 0);

        if (!ALLOWED_STUDENT_PHOTO_MIME.has(mime)) {
            toast.error(t('students.form.photo.invalidType'));
            setPhotoFile(null);
            setPhotoInputKey((k) => k + 1);
            return;
        }
        if (size > STUDENT_PHOTO_MAX_BYTES) {
            toast.error(t('students.form.photo.tooLarge'));
            setPhotoFile(null);
            setPhotoInputKey((k) => k + 1);
            return;
        }
        setPhotoFile(file);
    };

    const clearPhoto = () => {
        setPhotoFile(null);
        setPhotoInputKey((k) => k + 1);
    };

    const existingPhotoUrl = student?.photo?.url || student?.photoUrl || '';
    const displayPhotoUrl = photoPreviewUrl || existingPhotoUrl;

    const cardBase =
        'rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg-card) ' +
        'shadow-(--nb-shadow-md) shadow-[0_10px_18px_-12px_rgba(0,0,0,0.35)] ' +
        'hover:border-(--nb-color-accent) transition-colors';

    const cardHeaderBase =
        'px-3 py-1.5 border-b border-(--nb-color-border) ' +
        'bg-linear-to-r from-(--nb-color-brand-100) to-(--nb-color-accent-100) ' +
        'rounded-t-(--nb-radius-md)';

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                {/* Personal */}
                <div className={cardBase}>
                    <div className={cardHeaderBase}>
                        <div className="text-sm font-semibold text-(--nb-color-fg)">{t('students.form.sections.personal')}</div>
                    </div>
                    <div className="p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            <div>
                                <Label>{t('students.form.fullName')}</Label>
                                <Input
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    onBlur={() => onBlurValidate(
                                        'fullName',
                                        () => (validateFourNames(formData.fullName) ? '' : t('students.form.validations.fullNameFourNames')),
                                        { label: t('students.form.fullName') }
                                    )}
                                    type="text"
                                    required
                                    disabled={submitting}
                                    className={`mt-1 py-1.5 ${stateToClass(nameFieldState('fullName', true))}`}
                                />
                            </div>
                            <div>
                                <Label>{t('students.form.motherName')}</Label>
                                <Input
                                    name="motherName"
                                    value={formData.motherName}
                                    onChange={handleChange}
                                    onBlur={() => onBlurValidate(
                                        'motherName',
                                        () => (validateFourNames(formData.motherName) ? '' : t('students.form.validations.motherNameFourNames')),
                                        { label: t('students.form.motherName') }
                                    )}
                                    type="text"
                                    required
                                    disabled={submitting}
                                    className={`mt-1 py-1.5 ${stateToClass(nameFieldState('motherName', true))}`}
                                />
                            </div>
                            <div>
                                <Label>{t('students.form.gender')}</Label>
                                <div className="mt-1">
                                    <DropdownSelect
                                        id="student-gender"
                                        name="gender"
                                        value={formData.gender}
                                        onChange={(v) => setField('gender', v)}
                                        options={[
                                            { value: 'Male', label: t('students.form.male') },
                                            { value: 'Female', label: t('students.form.female') },
                                        ]}
                                        disabled={submitting}
                                        clearable={false}
                                        className="py-1.5"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>{t('students.form.dob')}</Label>
                                <Input name="dob" value={formData.dob} onChange={handleChange} type="date" required disabled={submitting} className="mt-1 py-1.5" />
                            </div>
                            <div>
                                <Label>{t('students.form.birthPlace')}</Label>
                                <Input name="birthPlace" value={formData.birthPlace} onChange={handleChange} type="text" required disabled={submitting} className="mt-1 py-1.5" />
                            </div>
                            <div>
                                <Label>{t('students.form.admissionDate')}</Label>
                                <Input name="admissionDate" value={formData.admissionDate} onChange={handleChange} type="date" required disabled={submitting} className="mt-1 py-1.5" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Academic Management (create-only) */}
                {!student ? (
                    <div className={cardBase}>
                        <div className={cardHeaderBase}>
                            <div className="text-sm font-semibold text-(--nb-color-fg)">{t('students.form.sections.academic')}</div>
                        </div>
                        <div className="p-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
                                            searchPlaceholder={t('common.search', { defaultValue: 'Searchâ€¦' })}
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
                                <div className="md:col-span-2 xl:col-span-3">
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
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={cardBase}>
                        <div className={cardHeaderBase}>
                            <div className="text-sm font-semibold text-(--nb-color-fg)">{t('students.form.sections.academic')}</div>
                        </div>
                        <div className="p-3 text-sm text-(--nb-color-muted)">
                            {t('students.form.sections.academicEditNote')}
                        </div>
                    </div>
                )}

                {/* Contacts */}
                <div className={cardBase}>
                    <div className={cardHeaderBase}>
                        <div className="text-sm font-semibold text-(--nb-color-fg)">{t('students.form.sections.contacts')}</div>
                    </div>
                    <div className="p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            <div>
                                <Label>{t('students.form.guardianName')}</Label>
                                <Input
                                    name="guardianName"
                                    value={formData.guardianName}
                                    onChange={handleChange}
                                    onBlur={() => onBlurValidate(
                                        'guardianName',
                                        () => (validateFourNames(formData.guardianName) ? '' : t('students.form.validations.guardianNameFourNames')),
                                        { label: t('students.form.guardianName') }
                                    )}
                                    type="text"
                                    required
                                    disabled={submitting}
                                    className={`mt-1 py-1.5 ${stateToClass(nameFieldState('guardianName', true))}`}
                                />
                            </div>
                            <div>
                                <Label>{t('students.form.guardianRelationship')}</Label>
                                <div className="mt-1">
                                    <DropdownSelect
                                        id="student-guardian-relationship"
                                        name="guardianRelationship"
                                        value={formData.guardianRelationship}
                                        onChange={(v) => setField('guardianRelationship', v)}
                                        options={[
                                            { value: 'Father', label: t('students.form.relationships.father') },
                                            { value: 'Mother', label: t('students.form.relationships.mother') },
                                            { value: 'Guardian', label: t('students.form.relationships.guardian') },
                                            { value: 'Other', label: t('students.form.relationships.other') },
                                        ]}
                                        disabled={submitting}
                                        clearable={false}
                                        className="py-1.5"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>{t('students.form.guardianPhone1')}</Label>
                                <Input
                                    name="guardianPhone1"
                                    value={formData.guardianPhone1}
                                    onChange={handleChange}
                                    onBlur={() => onBlurValidate(
                                        'guardianPhone1',
                                        () => getPhoneValidationError(formData.guardianPhone1),
                                        { label: t('students.form.guardianPhone1') }
                                    )}
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={13}
                                    required
                                    disabled={submitting}
                                    className={`mt-1 py-1.5 ${stateToClass(phoneFieldState('guardianPhone1', true))}`}
                                    placeholder={t('students.form.guardianPhone1Placeholder')}
                                />
                            </div>
                            <div>
                                <Label>{t('students.form.guardianPhone2')}</Label>
                                <Input
                                    name="guardianPhone2"
                                    value={formData.guardianPhone2}
                                    onChange={handleChange}
                                    onBlur={() => onBlurValidate(
                                        'guardianPhone2',
                                        () => getPhoneValidationError(formData.guardianPhone2),
                                        { label: t('students.form.guardianPhone2') }
                                    )}
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={13}
                                    disabled={submitting}
                                    className={`mt-1 py-1.5 ${stateToClass(phoneFieldState('guardianPhone2'))}`}
                                    placeholder={t('students.form.guardianPhone2Placeholder')}
                                />
                            </div>
                            <div>
                                <Label>{t('students.form.guardianEmail')}</Label>
                                <Input
                                    name="guardianEmail"
                                    value={formData.guardianEmail}
                                    onChange={handleChange}
                                    type="email"
                                    disabled={submitting}
                                    className="mt-1 py-1.5"
                                    placeholder={t('students.form.guardianEmailPlaceholder')}
                                />
                            </div>
                            <div>
                                <Label>{t('students.form.studentPhone')}</Label>
                                <Input
                                    name="studentPhone"
                                    value={formData.studentPhone}
                                    onChange={handleChange}
                                    onBlur={() => onBlurValidate(
                                        'studentPhone',
                                        () => getPhoneValidationError(formData.studentPhone),
                                        { label: t('students.form.studentPhone') }
                                    )}
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={13}
                                    disabled={submitting}
                                    className={`mt-1 py-1.5 ${stateToClass(phoneFieldState('studentPhone'))}`}
                                    placeholder={t('students.form.studentPhonePlaceholder')}
                                />
                            </div>
                            <div className="md:col-span-2 xl:col-span-3">
                                <Label>{t('students.form.studentEmail')}</Label>
                                <Input
                                    name="studentEmail"
                                    value={formData.studentEmail}
                                    onChange={handleChange}
                                    type="email"
                                    disabled={submitting}
                                    className="mt-1 py-1.5"
                                    placeholder={t('students.form.studentEmailPlaceholder')}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Residence */}
                <div className={cardBase}>
                    <div className={cardHeaderBase}>
                        <div className="text-sm font-semibold text-(--nb-color-fg)">{t('students.form.sections.residence')}</div>
                    </div>
                    <div className="p-3">
                        <SomaliaAddressFields
                            isSomali={formData.isSomali}
                            regionId={formData.residenceRegionId}
                            districtId={formData.residenceDistrictId}
                            neighborhood={formData.residenceNeighborhood}
                            onChange={(field, value) => {
                                if (field === 'isSomali') return setField('isSomali', value);
                                if (field === 'regionId') return setField('residenceRegionId', value);
                                if (field === 'districtId') return setField('residenceDistrictId', value);
                                if (field === 'neighborhood') return setField('residenceNeighborhood', value);
                            }}
                            disabled={submitting}
                            required
                            idPrefix="student-residence"
                            dense
                        />
                    </div>
                </div>

                {/* Transfer */}
                <div className={cardBase}>
                    <div className={cardHeaderBase}>
                        <div className="text-sm font-semibold text-(--nb-color-fg)">{t('students.form.sections.transfer')}</div>
                    </div>
                    <div className="p-3">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={Boolean(formData.transferIsTransfer)}
                                onChange={(e) => setField('transferIsTransfer', e.target.checked)}
                                disabled={submitting}
                            />
                            <Label className="mb-0">{t('students.form.transfer.isTransfer')}</Label>
                        </div>

                        {formData.transferIsTransfer ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                <div>
                                    <Label>{t('students.form.transfer.previousSchoolName')}</Label>
                                    <Input
                                        name="transferPreviousSchoolName"
                                        value={formData.transferPreviousSchoolName}
                                        onChange={handleChange}
                                        type="text"
                                        required
                                        disabled={submitting}
                                        className="mt-1 py-1.5"
                                        placeholder={t('students.form.transfer.previousSchoolNamePlaceholder')}
                                    />
                                </div>
                                <div>
                                    <Label>{t('students.form.transfer.transferReason')}</Label>
                                    <Input
                                        name="transferReason"
                                        value={formData.transferReason}
                                        onChange={handleChange}
                                        type="text"
                                        disabled={submitting}
                                        className="mt-1 py-1.5"
                                        placeholder={t('students.form.transfer.transferReasonPlaceholder')}
                                    />
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Medical */}
                <div className={cardBase}>
                    <div className={cardHeaderBase}>
                        <div className="text-sm font-semibold text-(--nb-color-fg)">{t('students.form.sections.medical')}</div>
                    </div>
                    <div className="p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            <div>
                                <Label>{t('students.form.medical.allergies')}</Label>
                                <Textarea
                                    name="medicalAllergies"
                                    value={formData.medicalAllergies}
                                    onChange={handleChange}
                                    disabled={submitting}
                                    className="mt-1 py-1.5"
                                    rows={1}
                                    placeholder={t('students.form.medical.allergiesPlaceholder')}
                                />
                            </div>
                            <div>
                                <Label>{t('students.form.medical.medicalConditions')}</Label>
                                <Textarea
                                    name="medicalConditions"
                                    value={formData.medicalConditions}
                                    onChange={handleChange}
                                    disabled={submitting}
                                    className="mt-1 py-1.5"
                                    rows={1}
                                    placeholder={t('students.form.medical.medicalConditionsPlaceholder')}
                                />
                            </div>
                            <div>
                                <Label>{t('students.form.medical.bloodGroup')}</Label>
                                <div className="mt-1">
                                    <DropdownSelect
                                        id="student-blood-group"
                                        name="bloodGroup"
                                        value={formData.bloodGroup}
                                        onChange={(v) => setField('bloodGroup', v)}
                                        options={['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((bg) => ({ value: bg, label: bg }))}
                                        placeholder={t('students.form.medical.bloodGroupNone')}
                                        disabled={submitting}
                                        className="py-1.5"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>{t('students.form.medical.disabilityFlags')}</Label>
                                <Input
                                    name="disabilityFlags"
                                    value={formData.disabilityFlags}
                                    onChange={handleChange}
                                    type="text"
                                    disabled={submitting}
                                    className="mt-1 py-1.5"
                                    placeholder={t('students.form.medical.disabilityFlagsPlaceholder')}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ID Document */}
                <div className={cardBase}>
                    <div className={cardHeaderBase}>
                        <div className="text-sm font-semibold text-(--nb-color-fg)">{t('students.form.sections.idDocument')}</div>
                    </div>
                    <div className="p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            <div>
                                <Label>{t('students.form.idDocument.idType')}</Label>
                                <div className="mt-1">
                                    <DropdownSelect
                                        id="student-id-type"
                                        name="idType"
                                        value={formData.idType}
                                        onChange={(v) => setField('idType', v)}
                                        options={[
                                            { value: 'National ID', label: t('students.form.idDocument.types.nationalId') },
                                            { value: 'Passport', label: t('students.form.idDocument.types.passport') },
                                            { value: 'Birth Certificate', label: t('students.form.idDocument.types.birthCertificate') },
                                            { value: 'Other', label: t('students.form.idDocument.types.other') },
                                        ]}
                                        placeholder={t('students.form.idDocument.idTypeNone')}
                                        disabled={submitting}
                                        className="py-1.5"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>{t('students.form.idDocument.idNumber')}</Label>
                                <Input
                                    name="idNumber"
                                    value={formData.idNumber}
                                    onChange={handleChange}
                                    type="text"
                                    disabled={submitting}
                                    className="mt-1 py-1.5"
                                    placeholder={t('students.form.idDocument.idNumberPlaceholder')}
                                />
                            </div>
                            <div>
                                <Label>{t('students.form.idDocument.issuedBy')}</Label>
                                <Input
                                    name="idIssuedBy"
                                    value={formData.idIssuedBy}
                                    onChange={handleChange}
                                    type="text"
                                    disabled={submitting}
                                    className="mt-1 py-1.5"
                                    placeholder={t('students.form.idDocument.issuedByPlaceholder')}
                                />
                            </div>
                            <div>
                                <Label>{t('students.form.idDocument.expiresAt')}</Label>
                                <Input
                                    name="idExpiresAt"
                                    value={formData.idExpiresAt}
                                    onChange={handleChange}
                                    type="date"
                                    disabled={submitting}
                                    className="mt-1 py-1.5"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className={cardBase}>
                    <div className={cardHeaderBase}>
                        <div className="text-sm font-semibold text-(--nb-color-fg)">{t('students.form.sections.notes')}</div>
                    </div>
                    <div className="p-3">
                        <Textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            disabled={submitting}
                            className="mt-1 py-1.5"
                            rows={3}
                            placeholder={t('students.form.notesPlaceholder')}
                        />
                    </div>
                </div>

                {/* Photo (optional) */}
                <div className={cardBase}>
                    <div className={cardHeaderBase}>
                        <div className="text-sm font-semibold text-(--nb-color-fg)">{t('students.form.photo.label')}</div>
                    </div>
                    <div className="p-3">
                        <div className="flex items-start gap-3">
                            <div className="w-20 h-20 rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg) overflow-hidden">
                                {displayPhotoUrl ? (
                                    <img
                                        src={displayPhotoUrl}
                                        alt={t('students.profileTab.photo.alt', { defaultValue: 'Student photo' })}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[11px] text-(--nb-color-muted)">
                                        {t('common.none', { defaultValue: 'None' })}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1">
                                <div className="flex flex-col gap-2">
                                    <Input
                                        key={photoInputKey}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handlePhotoChange}
                                        disabled={submitting}
                                        className="py-1.5"
                                    />
                                    {photoFile ? (
                                        <div className="flex items-center gap-2">
                                            <Button type="button" size="sm" variant="neutral" onClick={clearPhoto} disabled={submitting}>
                                                {t('students.form.photo.clear')}
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                                <div className="mt-1 text-[11px] text-(--nb-color-muted)">
                                    {photoFile
                                        ? t('students.form.photo.selected', { name: photoFile.name })
                                        : t('students.form.photo.hint')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
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

