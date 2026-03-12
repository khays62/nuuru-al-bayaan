import React from 'react';
import { useParams } from 'react-router-dom';
import { getStudentProfile, getStudentTransfers } from '../../../../api';
import TransferBadge from '../TransferBadge';
import { Eye, EyeOff, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../../../auth/AuthContext';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { fetchJson } from '../../../../shared/api/http';
import { studentKeys } from '../../queryKeys';
import Button from '../../../../shared/components/ui/Button.jsx';
import Input from '../../../../shared/components/ui/Input.jsx';
import Card from '../../../../shared/components/ui/Card.jsx';
import Alert from '../../../../shared/components/ui/Alert.jsx';
import UiLoadingState from '../../../../shared/components/ui/LoadingState.jsx';
import {
  getPasswordIssueMessage,
  getPasswordValidationState,
  resolvePasswordPolicy,
} from '../../../../shared/utils/passwordPolicy.js';
import { useI18n } from '../../../../i18n/useI18n';
import { getSomaliaDistrictLabel, getSomaliaRegionLabel } from '../../../../shared/data/somaliaAdminDivisions.js';
import { displayText } from '../../../../utils/displayText';

export default function ProfileTab() {
  const { studentId: paramStudentId } = useParams();
  const { auth, refreshUser } = useAuth();
  const { t, lang } = useI18n();
  const passwordPolicy = React.useMemo(
    () => resolvePasswordPolicy(auth?.privacyPolicy?.passwordPolicy),
    [auth?.privacyPolicy?.passwordPolicy],
  );

  const rawStudentRef = auth?.user?.studentRef;
  const studentRefId = rawStudentRef?._id || rawStudentRef || null;
  const studentId = paramStudentId || (auth?.user?.role === 'student' ? studentRefId : null);

  const isStudentSelf = auth?.user?.role === 'student' && !paramStudentId;
  const isForcePasswordChange = Boolean(isStudentSelf && auth?.user?.mustChangePassword);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showCurrentPw, setShowCurrentPw] = React.useState(false);
  const [showNewPw, setShowNewPw] = React.useState(false);
  const [showConfirmPw, setShowConfirmPw] = React.useState(false);

  const normalizedNewPassword = String(newPassword || '').trim();
  const normalizedConfirmPassword = String(confirmPassword || '').trim();
  const passwordUi = React.useMemo(
    () => getPasswordValidationState({
      password: normalizedNewPassword,
      confirmPassword: normalizedConfirmPassword,
      policyInput: passwordPolicy,
    }),
    [normalizedConfirmPassword, normalizedNewPassword, passwordPolicy],
  );
  const firstPasswordIssueMessage = passwordUi.issues[0]
    ? getPasswordIssueMessage(passwordUi.issues[0], t, passwordPolicy)
    : '';

  const changePasswordMutation = useMutation({
    mutationFn: async ({ oldPassword, newPassword }) => {
      const payload = isForcePasswordChange
        ? { newPassword }
        : { oldPassword, newPassword };

      await fetchJson('/students/change-password', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      toast.success(t('students.profileTab.password.changedSuccess'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (typeof refreshUser === 'function') await refreshUser();
    },
    onError: (err) => {
      toast.error(err?.data?.message || err?.message || t('students.profileTab.password.changeFailed'));
    },
  });

  const pwSaving = changePasswordMutation.isPending;

  const handleChangePassword = async () => {
    const curr = String(currentPassword || '').trim();
    const next = normalizedNewPassword;
    const confirm = normalizedConfirmPassword;

    // Security: we never read the current password from the DB.
    // If the account is still on default password (mustChangePassword), allow changing without entering current.
    if (!next || !confirm || (!isForcePasswordChange && !curr)) {
      toast.error(t('students.profileTab.password.fieldsRequired'));
      return;
    }
    if (!passwordUi.ok) {
      toast.error(firstPasswordIssueMessage || t('students.profileTab.password.invalid', { defaultValue: 'Password policy validation failed.' }));
      return;
    }
    if (next !== confirm) {
      toast.error(t('students.profileTab.password.noMatch'));
      return;
    }
    try {
      await changePasswordMutation.mutateAsync({
        oldPassword: curr,
        newPassword: next,
      });
    } catch {
      // Error is surfaced via onError
    }
  };

  const profileQuery = useQuery({
    queryKey: studentKeys.profile(studentId),
    enabled: !!studentId,
    queryFn: async () => {
      const data = await getStudentProfile(studentId);
      if (!data) throw new Error(t('students.profileTab.loadFailed'));
      return data;
    },
  });

  const transfersQuery = useQuery({
    queryKey: studentKeys.transfers(studentId, { limit: 1 }),
    enabled: !!studentId,
    queryFn: async () => {
      const res = await getStudentTransfers(studentId, { limit: 1 });
      return Array.isArray(res?.data) ? res.data : [];
    },
  });

  const loading = profileQuery.isLoading;
  const error = profileQuery.isError ? t('students.profileTab.loadFailed') : null;
  const profile = profileQuery.data ?? null;
  const latestTransfer = (transfersQuery.data || [])?.[0] ?? null;
  const student = profile?.student || null;

  const photoUrl = student?.photo?.url || student?.photoUrl || '';
  const regionLabel = student?.residenceRegionId ? getSomaliaRegionLabel(student.residenceRegionId, lang) : '';
  const districtLabel = (student?.residenceRegionId && student?.residenceDistrictId)
    ? getSomaliaDistrictLabel(student.residenceRegionId, student.residenceDistrictId, lang)
    : '';

  const transferIsEnabled = Boolean(student?.transfer?.isTransfer);
  const transferLabel = transferIsEnabled
    ? t('common.yes', { defaultValue: 'Yes' })
    : t('common.no', { defaultValue: 'No' });

  const disabilityLabel = Array.isArray(student?.medical?.disabilityFlags)
    ? student.medical.disabilityFlags.filter(Boolean).join(', ')
    : (student?.medical?.disabilityFlags || '');

  const cardBase =
    'rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg-card) ' +
    'shadow-(--nb-shadow-md) shadow-[0_10px_18px_-12px_rgba(0,0,0,0.35)] ' +
    'hover:border-(--nb-color-accent) focus-within:border-(--nb-color-accent) ' +
    'focus-within:ring-2 focus-within:ring-(--nb-color-accent-200) transition-colors';

  const cardHeaderBase =
    'px-4 py-3 border-b border-(--nb-color-border) ' +
    'bg-linear-to-r from-(--nb-color-brand-100) to-(--nb-color-accent-100) ' +
    'rounded-t-(--nb-radius-md)';

  const cardTitleClass = 'text-base font-semibold text-(--nb-color-fg)';

  return (
    <Card className="overflow-hidden rounded-(--nb-radius-md)">
      {loading ? (
        <div className="p-6">
          <UiLoadingState label={t('common.loading')} className="border-0 bg-transparent p-0 justify-start" />
        </div>
      ) : error ? (
        <Alert variant="danger" className="m-6 flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button size="sm" variant="brand" onClick={() => profileQuery.refetch()}>{t('common.retry')}</Button>
        </Alert>
      ) : profile ? (
        <>
          <div className="bg-(--nb-color-bg-card) p-10 border-b border-(--nb-color-border)">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-28 h-28 rounded-full bg-(--nb-color-bg-card) flex items-center justify-center shadow-inner ring-2 ring-(--nb-color-border) overflow-hidden">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={t('students.profileTab.photo.alt', { defaultValue: 'Student photo' })}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <UserIcon size={56} className="text-(--nb-color-text)" />
            )}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold leading-tight text-(--nb-color-text)">{student?.fullName || t('students.common.studentFallback')}</h2>

              {/* Summary cards: ID, Status, Cohort */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl mt-3">
                <div className="rounded-lg p-4 bg-(--nb-color-brand-50) text-(--nb-color-fg) border border-(--nb-color-border)">
                  <div className="text-xs uppercase tracking-wide font-semibold">{t('students.table.columns.studentId')}</div>
                  <div className="font-mono text-xl font-bold">{student?.studentId || '-'}</div>
                </div>
                <div className="rounded-lg p-4 bg-(--nb-color-accent-50) text-(--nb-color-fg) border border-(--nb-color-border)">
                  <div className="text-xs uppercase tracking-wide font-semibold">{t('students.table.columns.status')}</div>
                  <div className="text-xl font-bold">{student?.status || profile?.stats?.activeStatus || '-'}</div>
                </div>
                <div className="rounded-lg p-4 bg-(--nb-color-bg) text-(--nb-color-fg) border border-(--nb-color-border)">
                  <div className="text-xs uppercase tracking-wide font-semibold">{t('students.form.cohort')}</div>
                  <div className="text-xl font-bold">{profile?.latestEnrollment?.cohort?.name || '-'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className={cardBase}>
                <div className={cardHeaderBase}>
                  <h3 className={cardTitleClass}>{t('students.profileTab.personal.title')}</h3>
                  <p className="text-xs text-(--nb-color-muted)">{t('students.profileTab.personal.subtitle')}</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem label={t('students.form.fullName')} value={student?.fullName} />
                  <InfoItem label={t('students.form.gender')} value={student?.gender} />
                  <InfoItem label={t('students.form.dob')} value={formatDate(student)} />
                  <InfoItem label={t('students.form.birthPlace')} value={student?.birthPlace} />
                  <InfoItem label={t('students.form.motherName')} value={student?.motherName} />
                  <InfoItem label={t('students.form.guardianName')} value={student?.guardianName} />
                </div>
              </Card>

              <Card className={cardBase}>
                <div className={cardHeaderBase}>
                  <h3 className={cardTitleClass}>{t('students.profileTab.academic.title')}</h3>
                  <p className="text-xs text-(--nb-color-muted)">{t('students.profileTab.academic.subtitle')}</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem label={t('students.table.columns.academicYear')} value={profile?.latestEnrollment?.academicYear?.yearName} />
                  <InfoItem label={t('students.table.columns.grade')} value={profile?.latestEnrollment?.grade?.gradeName || profile?.latestEnrollment?.gradeSection?.grade?.gradeName} />
                  <InfoItem label={t('students.table.columns.section')} value={profile?.latestEnrollment?.gradeSection?.section} />
                  <InfoItem label={t('students.table.columns.shift')} value={profile?.latestEnrollment?.shift?.shiftName} />
                </div>
              </Card>

              <Card className={cardBase}>
                <div className={cardHeaderBase}>
                  <h3 className={cardTitleClass}>{t('students.profileTab.contacts.title', { defaultValue: 'Contacts' })}</h3>
                  <p className="text-xs text-(--nb-color-muted)">{t('students.profileTab.contacts.subtitle', { defaultValue: 'Phone numbers and email addresses' })}</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem label={t('students.form.guardianRelationship')} value={student?.guardianRelationship} />
                  <InfoItem label={t('students.form.guardianPhone1')} value={student?.guardianPhone1 || student?.contactNumber} />
                  <InfoItem label={t('students.form.guardianPhone2')} value={student?.guardianPhone2} />
                  <InfoItem label={t('students.form.guardianEmail')} value={student?.guardianEmail} />
                  <InfoItem label={t('students.form.studentPhone')} value={student?.studentPhone} />
                  <InfoItem label={t('students.form.studentEmail')} value={student?.studentEmail} />
                </div>
              </Card>

              <Card className={cardBase}>
                <div className={cardHeaderBase}>
                  <h3 className={cardTitleClass}>{t('students.profileTab.residence.title', { defaultValue: 'Residence' })}</h3>
                  <p className="text-xs text-(--nb-color-muted)">{t('students.profileTab.residence.subtitle', { defaultValue: 'Home location details' })}</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem
                    label={t('students.address.nationality.label', { defaultValue: 'Nationality' })}
                    value={student?.isSomali === false
                      ? t('students.address.nationality.notSomali', { defaultValue: 'Not Somali' })
                      : t('students.address.nationality.somali', { defaultValue: 'Somali' })}
                  />
                  <InfoItem
                    label={t('students.address.region.label', { defaultValue: 'Region' })}
                    value={(student?.isSomali === false) ? '-' : (regionLabel || student?.residenceRegionId)}
                  />
                  <InfoItem
                    label={t('students.address.district.label', { defaultValue: 'District' })}
                    value={(student?.isSomali === false) ? '-' : (districtLabel || student?.residenceDistrictId)}
                  />
                  <InfoItem
                    label={t('students.address.neighborhood.label', { defaultValue: 'Neighborhood' })}
                    value={student?.residenceNeighborhood || student?.address}
                  />
                  <InfoItem label={t('students.form.address')} value={student?.address} />
                </div>
              </Card>

              <Card className={cardBase}>
                <div className={cardHeaderBase}>
                  <h3 className={cardTitleClass}>{t('students.profileTab.transfer.title', { defaultValue: 'Transfer (Intake)' })}</h3>
                  <p className="text-xs text-(--nb-color-muted)">{t('students.profileTab.transfer.subtitle', { defaultValue: 'Transfer metadata collected on registration' })}</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem label={t('students.form.transfer.isTransfer')} value={transferLabel} />
                  <InfoItem label={t('students.form.transfer.previousSchoolName')} value={transferIsEnabled ? student?.transfer?.previousSchoolName : '-'} />
                  <InfoItem label={t('students.form.transfer.transferReason')} value={transferIsEnabled ? student?.transfer?.transferReason : '-'} />
                </div>
              </Card>

              <Card className={cardBase}>
                <div className={cardHeaderBase}>
                  <h3 className={cardTitleClass}>{t('students.profileTab.idDocument.title', { defaultValue: 'ID Document' })}</h3>
                  <p className="text-xs text-(--nb-color-muted)">{t('students.profileTab.idDocument.subtitle', { defaultValue: 'Identification details (optional)' })}</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem label={t('students.form.idDocument.idType')} value={student?.idDocument?.idType} />
                  <InfoItem label={t('students.form.idDocument.idNumber')} value={student?.idDocument?.idNumber} />
                  <InfoItem label={t('students.form.idDocument.issuedBy')} value={student?.idDocument?.issuedBy} />
                  <InfoItem label={t('students.form.idDocument.expiresAt')} value={student?.idDocument?.expiresAt ? new Date(student.idDocument.expiresAt).toLocaleDateString() : '-'} />
                </div>
              </Card>

              <Card className={cardBase}>
                <div className={cardHeaderBase}>
                  <h3 className={cardTitleClass}>{t('students.profileTab.medical.title', { defaultValue: 'Medical' })}</h3>
                  <p className="text-xs text-(--nb-color-muted)">{t('students.profileTab.medical.subtitle', { defaultValue: 'Important medical notes (optional)' })}</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem label={t('students.form.medical.allergies')} value={student?.medical?.allergies} />
                  <InfoItem label={t('students.form.medical.medicalConditions')} value={student?.medical?.medicalConditions} />
                  <InfoItem label={t('students.form.medical.disabilityFlags')} value={disabilityLabel} />
                  <InfoItem label={t('students.form.medical.bloodGroup')} value={student?.medical?.bloodGroup} />
                </div>
              </Card>

              <Card className={`${cardBase} lg:col-span-2`}>
                <div className={cardHeaderBase}>
                  <h3 className={cardTitleClass}>{t('students.profileTab.notes.title', { defaultValue: 'Notes' })}</h3>
                  <p className="text-xs text-(--nb-color-muted)">{t('students.profileTab.notes.subtitle', { defaultValue: 'Extra notes about this student' })}</p>
                </div>
                <div className="p-4">
                  <div className="text-sm text-(--nb-color-muted) whitespace-pre-wrap wrap-break-word">{student?.notes || '-'}</div>
                </div>
              </Card>
            </div>

            {latestTransfer ? (
              <div className="mt-6">
                <TransferBadge transfer={latestTransfer} />
              </div>
            ) : null}

            {isStudentSelf ? (
              <Card className={`mt-6 ${cardBase}`}>
                <div className={cardHeaderBase}>
                  <h3 className={cardTitleClass}>{t('students.profileTab.password.title')}</h3>
                  <p className="text-xs text-(--nb-color-muted)">{t('students.profileTab.password.subtitle')}</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-(--nb-color-text) mb-1">{t('students.profileTab.password.current')}</label>
                    <div className="relative">
                      <Input
                        type={showCurrentPw ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="pr-10"
                        autoComplete="current-password"
                        disabled={pwSaving || isForcePasswordChange}
                        placeholder={isForcePasswordChange ? t('students.profileTab.password.defaultPasswordPlaceholder') : ''}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-(--nb-color-muted) hover:text-(--nb-color-text)"
                        onMouseEnter={() => setShowCurrentPw(true)}
                        onMouseLeave={() => setShowCurrentPw(false)}
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label={t('students.profileTab.password.showCurrentAria')}
                        title={t('students.profileTab.password.showPasswordTitle')}
                        disabled={pwSaving || isForcePasswordChange}
                      >
                        {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {isForcePasswordChange ? (
                      <div className="mt-1 text-[11px] text-(--nb-color-muted)">
                        {t('students.profileTab.password.defaultPasswordNote')}
                      </div>
                    ) : null}
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-(--nb-color-text) mb-1">{t('students.profileTab.password.new')}</label>
                    <div className="relative">
                      <Input
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={`pr-10 ${passwordUi.newPasswordState === 'valid' ? 'border-green-500' : (passwordUi.newPasswordState === 'invalid' ? 'border-red-500' : '')}`}
                        autoComplete="new-password"
                        disabled={pwSaving}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-(--nb-color-muted) hover:text-(--nb-color-text)"
                        onMouseEnter={() => setShowNewPw(true)}
                        onMouseLeave={() => setShowNewPw(false)}
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label={t('students.profileTab.password.showNewAria')}
                        title={t('students.profileTab.password.showPasswordTitle')}
                      >
                        {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {passwordUi.passwordTouched && firstPasswordIssueMessage ? (
                      <div className="mt-1 text-xs text-red-600">{firstPasswordIssueMessage}</div>
                    ) : null}
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-(--nb-color-text) mb-1">{t('students.profileTab.password.confirm')}</label>
                    <div className="relative">
                      <Input
                        type={showConfirmPw ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`pr-10 ${passwordUi.confirmPasswordState === 'valid' ? 'border-green-500' : (passwordUi.confirmPasswordState === 'invalid' ? 'border-red-500' : '')}`}
                        autoComplete="new-password"
                        disabled={pwSaving}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-(--nb-color-muted) hover:text-(--nb-color-text)"
                        onMouseEnter={() => setShowConfirmPw(true)}
                        onMouseLeave={() => setShowConfirmPw(false)}
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label={t('students.profileTab.password.showConfirmAria')}
                        title={t('students.profileTab.password.showPasswordTitle')}
                      >
                        {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {passwordUi.confirmTouched && passwordUi.passwordsMismatch ? (
                      <div className="mt-1 text-xs text-red-600">{t('students.profileTab.password.noMatch')}</div>
                    ) : null}
                    {passwordUi.passwordsMatch ? (
                      <div className="mt-1 text-xs text-green-600">{t('students.profileTab.password.match', { defaultValue: 'Passwords match.' })}</div>
                    ) : null}
                  </div>

                  <div className="sm:col-span-3 flex justify-end">
                    <Button type="button" variant="brand" onClick={handleChangePassword} disabled={pwSaving}>
                      {pwSaving ? t('common.saving') : t('common.actions.save')}
                    </Button>
                  </div>
                </div>
              </Card>
            ) : null}
          </div>
        </>
      ) : null}
    </Card>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <div className="text-xs text-(--nb-color-muted)">{label}</div>
      <div className="font-medium wrap-break-word">{displayText(value, '-')}</div>
    </div>
  );
}

function formatDate(student) {
  if (!student) return '-';
  const d = student.dateOfBirth || student.dob || student.birthDate;
  if (!d) return '-';
  try {
    const dt = new Date(d);
    const valid = !isNaN(dt.getTime());
    return valid ? dt.toLocaleDateString() : '-';
  } catch {
    return '-';
  }
}
