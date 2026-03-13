import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Button from '../../../shared/components/ui/Button.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Textarea from '../../../shared/components/ui/Textarea.jsx';
import Label from '../../../shared/components/ui/Label.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import SomaliaAddressFields from '../../../shared/components/address/SomaliaAddressFields.jsx';
import { useI18n } from '../../../i18n/useI18n';
import { isValidSomaliaPhone, normalizeSomaliaPhone } from '../../../shared/utils/phoneSomalia';
import { getSubjects } from '../../subjects/api/subjects';

const EMPTY_ARR = [];

export default function TeacherForm({ initialValue, onCancel, onSave }) {
  const { t } = useI18n();

  const BLUR_VALIDATION_TOAST_ID = 'teacher-form:blur-validation';

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

  const isValidEmail = (value) => {
    const v = String(value ?? '').trim();
    if (!v) return false;
    // Simple, robust email check (not RFC-perfect, but matches typical UI expectations)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  };
  const [form, setForm] = useState({
    fullName: '',
    gender: '',
    dob: '',
    nationality: 'Somalia',

    email: '',
    phone: '',
    phone2: '',

    employeeId: '',
    teacherId: '',
    hireDate: '',
    employmentType: '',
    salary: '',
    status: 'active',

    specialization: '',
    qualification: '',
    qualificationOther: '',
    yearsOfExperience: '',

    isSomali: true,
    residenceRegionId: '',
    residenceDistrictId: '',
    residenceNeighborhood: '',

    notes: '',
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects', 'teacher-form:specialization'],
    queryFn: async ({ signal }) => {
      const res = await getSubjects({ page: 1, limit: 500 }, { signal });
      const rows = res?.data || res?.items || res?.results || [];
      return Array.isArray(rows) ? rows : [];
    },
    placeholderData: (prev) => prev,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const subjects = subjectsQuery.data ?? EMPTY_ARR;

  const specializationOptions = useMemo(() => {
    const opts = (Array.isArray(subjects) ? subjects : [])
      .map((s) => String(s?.subjectName || s?.name || '').trim())
      .filter(Boolean)
      .map((name) => ({ value: name, label: name }));

    const current = String(form.specialization || '').trim();
    if (current && !opts.some((o) => o.value === current)) {
      opts.unshift({ value: current, label: current });
    }

    // de-dupe while preserving order
    const seen = new Set();
    return opts.filter((o) => {
      if (seen.has(o.value)) return false;
      seen.add(o.value);
      return true;
    });
  }, [subjects, form.specialization]);

  const qualificationOptions = useMemo(() => {
    const base = [
      { value: 'certificate', label: t('teachers.form.qualificationOptions.certificate') },
      { value: 'diploma', label: t('teachers.form.qualificationOptions.diploma') },
      { value: 'bachelor', label: t('teachers.form.qualificationOptions.bachelor') },
      { value: 'master', label: t('teachers.form.qualificationOptions.master') },
      { value: 'phd', label: t('teachers.form.qualificationOptions.phd') },
      { value: 'other', label: t('teachers.form.qualificationOptions.other') },
    ];

    const current = String(form.qualification || '').trim();
    if (current && !base.some((o) => o.value === current)) {
      return [{ value: current, label: current }, ...base];
    }
    return base;
  }, [form.qualification, t]);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');

  const TEACHER_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
  const ALLOWED_TEACHER_PHOTO_MIME = useMemo(() => new Set(['image/jpeg', 'image/png', 'image/webp']), []);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  useEffect(() => {
    if (initialValue) {
      const toDateInput = (value) => {
        if (!value) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };

      const initialQualificationRaw = String(initialValue.qualification || '').trim();
      const isKnownQualification = new Set(['certificate', 'diploma', 'bachelor', 'master', 'phd', 'other']);
      const initialQualification = initialQualificationRaw && isKnownQualification.has(initialQualificationRaw)
        ? initialQualificationRaw
        : (initialQualificationRaw ? 'other' : '');
      const initialQualificationOther = initialQualification === 'other'
        ? (initialQualificationRaw && !isKnownQualification.has(initialQualificationRaw) ? initialQualificationRaw : '')
        : '';

      setForm({
        fullName: initialValue.fullName || '',
        gender: initialValue.gender || '',
        dob: toDateInput(initialValue.dob),
        nationality: initialValue.nationality || (initialValue.isSomali === false ? '' : 'Somalia'),

        teacherId: initialValue.teacherId || '',
        employeeId: initialValue.employeeId || '',
        email: initialValue.email || '',
        phone: initialValue.phone || '',
        phone2: initialValue.phone2 || '',

        hireDate: toDateInput(initialValue.hireDate),
        employmentType: initialValue.employmentType || '',
        salary: initialValue.salary ?? '',
        status: initialValue.status || 'active',

        specialization: initialValue.specialization || '',
        qualification: initialQualification,
        qualificationOther: initialQualificationOther,
        yearsOfExperience: initialValue.yearsOfExperience ?? initialValue.yearsOfExperience === 0 ? String(initialValue.yearsOfExperience) : '',

        isSomali: typeof initialValue.isSomali === 'boolean' ? initialValue.isSomali : true,
        residenceRegionId: initialValue.residenceRegionId || '',
        residenceDistrictId: initialValue.residenceDistrictId || '',
        residenceNeighborhood: initialValue.residenceNeighborhood || '',

        notes: initialValue.notes || '',
      });

      setPhotoFile(null);
      setPhotoInputKey((k) => k + 1);

      // Reset touched state when switching edit targets
    }
  }, [initialValue]);

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === 'fullName') {
      setForm((prev) => ({ ...prev, [name]: toTitleCaseWordsLive(value) }));
      return;
    }
    if (name === 'phone' || name === 'phone2') {
      setForm((prev) => ({ ...prev, [name]: sanitizeSomaliaPhoneInput(value) }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const countWords = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;
  const validateFourNames = (value) => countWords(value) === 4;

  const getPhoneValidationError = (value) => {
    const national = getSomaliaNationalDigits(value);
    if (!national) return '';
    if (national.length > 9) return t('teachers.form.validations.phoneTooLong');
    // Show a helpful hint early when the number start is wrong (even before 9 digits).
    // Expected Somalia national formats typically start with 61/62/68 or 7x (accept +252/252/0-prefix).
    if (national.length >= 1) {
      const first = national[0];
      if (first !== '6' && first !== '7') return t('teachers.form.validations.phoneInvalidHint');
    }
    if (national.length >= 2) {
      const okStart = /^6[128]/.test(national) || /^7\d/.test(national);
      if (!okStart) return t('teachers.form.validations.phoneInvalidHint');
    }
    if (national.length < 9) return t('teachers.form.validations.phoneTooShort');
    return isValidSomaliaPhone(value) ? '' : t('teachers.form.validations.phoneInvalidHint');
  };

  const nameFieldState = (field) => {
    const v = String(form[field] ?? '');
    const hasValue = Boolean(v.trim());
    if (!hasValue) {
      return 'neutral';
    }
    return validateFourNames(v) ? 'valid' : 'invalid';
  };

  const emailFieldState = (field) => {
    const v = String(form[field] ?? '');
    const hasValue = Boolean(v.trim());
    if (!hasValue) {
      return 'neutral';
    }
    return isValidEmail(v) ? 'valid' : 'invalid';
  };

  const phoneFieldState = (field) => {
    const v = String(form[field] ?? '').trim();
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
    const v = String(form[field] ?? '').trim();
    if (!v) {
      toast.dismiss(BLUR_VALIDATION_TOAST_ID);
      return;
    }
    const err = getErrorMessage('invalid');
    if (err) toast.error(label ? `${label}: ${err}` : err, { id: BLUR_VALIDATION_TOAST_ID });
    else toast.dismiss(BLUR_VALIDATION_TOAST_ID);
  };

  const handlePhotoChange = (e) => {
    const file = e?.target?.files?.[0] || null;
    if (!file) {
      setPhotoFile(null);
      return;
    }
    const mime = String(file.type || '').toLowerCase();
    const size = Number(file.size || 0);

    if (!ALLOWED_TEACHER_PHOTO_MIME.has(mime)) {
      toast.error(t('teachers.form.photo.invalidType'));
      setPhotoFile(null);
      setPhotoInputKey((k) => k + 1);
      return;
    }
    if (size > TEACHER_PHOTO_MAX_BYTES) {
      toast.error(t('teachers.form.photo.tooLarge'));
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

  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);

      // Mark required fields as touched so borders show immediately on failed submit

      if (!validateFourNames(form.fullName)) {
        toast.error(t('teachers.form.validations.fullNameFourNames'));
        return;
      }
      if (!form.gender) {
        toast.error(t('teachers.form.validations.genderRequired'));
        return;
      }
      if (!form.dob) {
        toast.error(t('teachers.form.validations.dobRequired'));
        return;
      }

      // Nationality is selected in Address section (Somali / Not Somali).
      // If Not Somali, require a detail value.
      if (form.isSomali === false) {
        if (!String(form.nationality || '').trim()) {
          toast.error(t('teachers.form.validations.nationalityRequired'));
          return;
        }
      }
      if (!String(form.email || '').trim()) {
        toast.error(t('teachers.form.validations.emailRequired'));
        return;
      }
      if (!isValidEmail(form.email)) {
        toast.error(t('teachers.form.validations.emailInvalid'));
        return;
      }
      if (!String(form.phone || '').trim()) {
        toast.error(t('teachers.form.validations.phoneRequired'));
        return;
      }

      const normalizedPhone = normalizeSomaliaPhone(form.phone);
      if (!normalizedPhone || !isValidSomaliaPhone(normalizedPhone)) {
        toast.error(t('teachers.form.validations.phoneInvalid'));
        return;
      }
      const normalizedPhone2 = form.phone2 ? normalizeSomaliaPhone(form.phone2) : '';
      if (form.phone2 && (!normalizedPhone2 || !isValidSomaliaPhone(normalizedPhone2))) {
        toast.error(t('teachers.form.validations.phone2Invalid'));
        return;
      }

      if (String(form.qualification || '').trim() === 'other' && !String(form.qualificationOther || '').trim()) {
        toast.error(t('teachers.form.validations.qualificationOtherRequired'));
        return;
      }

      const payload = {
        fullName: String(form.fullName || '').trim(),
        gender: form.gender,
        dob: form.dob,
        nationality: form.isSomali === false ? String(form.nationality || '').trim() : 'Somalia',

        ...(String(form.teacherId || '').trim() ? { teacherId: String(form.teacherId || '').trim() } : {}),
        // employeeId is auto-generated server-side; send only if already present (edit)
        ...(form.employeeId ? { employeeId: String(form.employeeId).trim() } : {}),

        email: String(form.email || '').trim(),
        phone: normalizedPhone,
        phone2: normalizedPhone2,

        hireDate: form.hireDate || null,
        employmentType: form.employmentType || '',
        salary: form.salary === '' || form.salary == null ? 0 : Number(form.salary),
        status: form.status || 'active',

        specialization: String(form.specialization || '').trim(),
        qualification: String(form.qualification || '').trim() === 'other'
          ? String(form.qualificationOther || '').trim()
          : String(form.qualification || '').trim(),
        yearsOfExperience: form.yearsOfExperience === '' || form.yearsOfExperience == null ? 0 : Number(form.yearsOfExperience),

        isSomali: form.isSomali !== false,
        residenceRegionId: form.residenceRegionId || '',
        residenceDistrictId: form.residenceDistrictId || '',
        residenceNeighborhood: form.residenceNeighborhood || '',

        notes: String(form.notes || '').trim(),
      };

      await onSave(payload, photoFile);
    } finally {
      setSaving(false);
    }
  };

  const existingPhotoUrl = initialValue?.photo?.url || '';
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
    <form className="space-y-3" onSubmit={submit}>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {/* Personal */}
        <div className={cardBase}>
          <div className={cardHeaderBase}>
            <div className="text-sm font-semibold text-(--nb-color-fg)">{t('teachers.form.sections.personal')}</div>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <div className="xl:col-span-3">
                <Label>{t('teachers.form.fullName')}</Label>
                <Input
                  name="fullName"
                  value={form.fullName}
                  onChange={onChange}
                  onBlur={() => onBlurValidate(
                    'fullName',
                    () => (validateFourNames(form.fullName) ? '' : t('teachers.form.validations.fullNameFourNames')),
                    { label: t('teachers.form.fullName') }
                  )}
                  className={`mt-1 py-1.5 ${stateToClass(nameFieldState('fullName', true))}`}
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <Label>{t('teachers.form.gender')}</Label>
                <div className="mt-1">
                  <DropdownSelect
                    id="teacher-gender"
                    name="gender"
                    value={form.gender}
                    onChange={(v) => setField('gender', v)}
                    options={[
                      { value: 'Male', label: t('teachers.form.genderOptions.male') },
                      { value: 'Female', label: t('teachers.form.genderOptions.female') },
                    ]}
                    placeholder={t('common.select.placeholder')}
                    disabled={saving}
                    className="py-1.5"
                  />
                </div>
              </div>
              <div>
                <Label>{t('teachers.form.dob')}</Label>
                <Input type="date" name="dob" value={form.dob} onChange={onChange} className="mt-1 py-1.5" required disabled={saving} />
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className={cardBase}>
          <div className={cardHeaderBase}>
            <div className="text-sm font-semibold text-(--nb-color-fg)">{t('teachers.form.sections.contact')}</div>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <div>
                <Label>{t('teachers.form.email')}</Label>
                <Input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  onBlur={() => onBlurValidate(
                    'email',
                    () => (isValidEmail(form.email) ? '' : t('teachers.form.validations.emailInvalid')),
                    { label: t('teachers.form.email') }
                  )}
                  className={`mt-1 py-1.5 ${stateToClass(emailFieldState('email', true))}`}
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <Label>{t('teachers.form.primaryPhone')}</Label>
                <Input
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  onBlur={() => onBlurValidate(
                    'phone',
                    () => getPhoneValidationError(form.phone),
                    { label: t('teachers.form.primaryPhone') }
                  )}
                  type="tel"
                  inputMode="tel"
                  maxLength={13}
                  className={`mt-1 py-1.5 ${stateToClass(phoneFieldState('phone', true))}`}
                  placeholder={t('teachers.form.primaryPhonePlaceholder')}
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <Label>{t('teachers.form.secondaryPhone')}</Label>
                <Input
                  name="phone2"
                  value={form.phone2}
                  onChange={onChange}
                  onBlur={() => onBlurValidate(
                    'phone2',
                    () => getPhoneValidationError(form.phone2),
                    { label: t('teachers.form.secondaryPhone') }
                  )}
                  type="tel"
                  inputMode="tel"
                  maxLength={13}
                  className={`mt-1 py-1.5 ${stateToClass(phoneFieldState('phone2'))}`}
                  placeholder={t('teachers.form.secondaryPhonePlaceholder')}
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Address (optional) */}
        <div className={cardBase}>
          <div className={cardHeaderBase}>
            <div className="text-sm font-semibold text-(--nb-color-fg)">{t('teachers.form.sections.address')}</div>
          </div>
          <div className="p-3">
            <div>
              <Label className="text-xs">{t('students.address.nationality.label', { defaultValue: 'Nationality' })}</Label>
              <div className="mt-1">
                <DropdownSelect
                  id="teacher-address-nationality"
                  name="isSomali"
                  value={form.isSomali === false ? 'notSomali' : 'somali'}
                  onChange={(v) => {
                    const nextIsSomali = String(v) !== 'notSomali';
                    setField('isSomali', nextIsSomali);

                    if (nextIsSomali) {
                      setField('nationality', 'Somalia');
                      return;
                    }

                    // Not Somali: hide/clear Somalia-specific fields
                    setField('residenceRegionId', '');
                    setField('residenceDistrictId', '');
                    setField('residenceNeighborhood', '');

                    // Keep existing non-Somali value; if it was Somalia, clear it so user can enter details.
                    setField('nationality', String(form.nationality || '').trim().toLowerCase() === 'somalia' ? '' : form.nationality);
                  }}
                  options={[
                    { value: 'somali', label: t('students.address.nationality.somali', { defaultValue: 'Somali' }) },
                    { value: 'notSomali', label: t('students.address.nationality.notSomali', { defaultValue: 'Not Somali' }) },
                  ]}
                  disabled={saving}
                  className="py-1.5"
                />
              </div>
            </div>

            {form.isSomali !== false ? (
              <div className="mt-3">
                <SomaliaAddressFields
                  isSomali
                  regionId={form.residenceRegionId}
                  districtId={form.residenceDistrictId}
                  neighborhood={form.residenceNeighborhood}
                  onChange={(k, v) => {
                    if (k === 'regionId') setField('residenceRegionId', v);
                    if (k === 'districtId') setField('residenceDistrictId', v);
                    if (k === 'neighborhood') setField('residenceNeighborhood', v);
                  }}
                  disabled={saving}
                  required={false}
                  showNationality={false}
                  idPrefix="teacher-address"
                  dense
                />
              </div>
            ) : null}

            {form.isSomali === false ? (
              <div className="mt-3">
                <Label>{t('teachers.form.nationalityDetail')}</Label>
                <Input
                  name="nationality"
                  value={form.nationality}
                  onChange={onChange}
                  className="mt-1 py-1.5"
                  placeholder={t('teachers.form.nationalityDetailPlaceholder')}
                  required
                  disabled={saving}
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* Employment */}
        <div className={cardBase}>
          <div className={cardHeaderBase}>
            <div className="text-sm font-semibold text-(--nb-color-fg)">{t('teachers.form.sections.employment')}</div>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <div>
                <Label>{t('teachers.form.teacherId')}</Label>
                <Input name="teacherId" value={form.teacherId} onChange={onChange} className="mt-1 py-1.5" placeholder={t('teachers.form.teacherIdPlaceholder')} disabled={saving} />
                <div className="text-[11px] text-(--nb-color-muted) mt-1">{t('teachers.form.teacherIdHelp')}</div>
              </div>
              <div>
                <Label>{t('teachers.form.hireDate')}</Label>
                <Input type="date" name="hireDate" value={form.hireDate} onChange={onChange} className="mt-1 py-1.5" disabled={saving} />
              </div>
              <div>
                <Label>{t('teachers.form.employmentType')}</Label>
                <div className="mt-1">
                  <DropdownSelect
                    id="teacher-employment-type"
                    name="employmentType"
                    value={form.employmentType}
                    onChange={(v) => setField('employmentType', v)}
                    options={[
                      { value: '', label: t('common.none') },
                      { value: 'full-time', label: t('teachers.form.employmentTypeOptions.fullTime') },
                      { value: 'part-time', label: t('teachers.form.employmentTypeOptions.partTime') },
                      { value: 'contract', label: t('teachers.form.employmentTypeOptions.contract') },
                    ]}
                    disabled={saving}
                    className="py-1.5"
                  />
                </div>
              </div>
              <div>
                <Label>{t('teachers.form.salary')}</Label>
                <Input type="number" min="0" step="0.01" name="salary" value={form.salary} onChange={onChange} className="mt-1 py-1.5" disabled={saving} />
              </div>
              <div>
                <Label>{t('teachers.form.status')}</Label>
                <div className="mt-1">
                  <DropdownSelect
                    id="teacher-status"
                    name="status"
                    value={form.status}
                    onChange={(v) => setField('status', v)}
                    options={[
                      { value: 'active', label: t('teachers.form.active') },
                      { value: 'inactive', label: t('teachers.form.inactive') },
                    ]}
                    disabled={saving}
                    className="py-1.5"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional */}
        <div className={cardBase}>
          <div className={cardHeaderBase}>
            <div className="text-sm font-semibold text-(--nb-color-fg)">{t('teachers.form.sections.professional')}</div>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <div>
                <Label>{t('teachers.form.specialization')}</Label>
                <div className="mt-1">
                  <DropdownSelect
                    id="teacher-specialization"
                    name="specialization"
                    value={form.specialization}
                    onChange={(v) => setField('specialization', v)}
                    options={specializationOptions}
                    placeholder={t('common.select.placeholder')}
                    disabled={saving || subjectsQuery.isLoading}
                    className="py-1.5"
                  />
                </div>
              </div>
              <div>
                <Label>{t('teachers.form.qualification')}</Label>
                <div className="mt-1">
                  <DropdownSelect
                    id="teacher-qualification"
                    name="qualification"
                    value={form.qualification}
                    onChange={(v) => {
                      setField('qualification', v);
                      if (String(v) !== 'other') setField('qualificationOther', '');
                    }}
                    options={qualificationOptions}
                    placeholder={t('common.select.placeholder')}
                    disabled={saving}
                    className="py-1.5"
                  />
                </div>
              </div>

              {String(form.qualification || '').trim() === 'other' ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <Label>{t('teachers.form.qualificationOtherLabel')}</Label>
                  <Input
                    name="qualificationOther"
                    value={form.qualificationOther}
                    onChange={onChange}
                    className="mt-1 py-1.5"
                    placeholder={t('teachers.form.qualificationOtherPlaceholder')}
                    disabled={saving}
                  />
                </div>
              ) : null}
              <div>
                <Label>{t('teachers.form.yearsOfExperience')}</Label>
                <Input type="number" min="0" step="1" name="yearsOfExperience" value={form.yearsOfExperience} onChange={onChange} className="mt-1 py-1.5" disabled={saving} />
              </div>
            </div>
          </div>
        </div>

        {/* Photo (optional) */}
        <div className={cardBase}>
          <div className={cardHeaderBase}>
            <div className="text-sm font-semibold text-(--nb-color-fg)">{t('teachers.form.photo.label')}</div>
          </div>
          <div className="p-3">
            <div className="flex items-start gap-3">
              <div className="w-20 h-20 rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg) overflow-hidden">
                {displayPhotoUrl ? (
                  <img src={displayPhotoUrl} alt={t('teachers.form.photo.alt')} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[11px] text-(--nb-color-muted)">
                    {t('common.none')}
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
                    disabled={saving}
                    className="py-1.5"
                  />
                  {photoFile ? (
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" variant="neutral" onClick={clearPhoto} disabled={saving}>
                        {t('teachers.form.photo.clear')}
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="mt-1 text-[11px] text-(--nb-color-muted)">
                  {photoFile ? t('teachers.form.photo.selected', { name: photoFile.name }) : t('teachers.form.photo.hint')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes (bottom-most) */}
        <div className={`${cardBase} lg:col-span-2 xl:col-span-3`}>
          <div className={cardHeaderBase}>
            <div className="text-sm font-semibold text-(--nb-color-fg)">{t('teachers.form.sections.notes')}</div>
          </div>
          <div className="p-3">
            <Textarea name="notes" value={form.notes} onChange={onChange} className="mt-1 py-1.5" rows={3} disabled={saving} placeholder={t('teachers.form.notesPlaceholder')} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="neutral" onClick={onCancel} disabled={saving}>{t('teachers.form.cancel')}</Button>
        <Button type="submit" variant="brand" disabled={saving}>
          {saving ? (initialValue ? t('teachers.form.updating') : t('teachers.form.saving')) : (initialValue ? t('teachers.form.update') : t('teachers.form.save'))}
        </Button>
      </div>
    </form>
  );
}
