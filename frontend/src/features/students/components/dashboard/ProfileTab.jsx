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
import { useI18n } from '../../../../i18n/I18nProvider';

export default function ProfileTab() {
  const { studentId: paramStudentId } = useParams();
  const { auth, refreshUser } = useAuth();
  const { t } = useI18n();

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

  const confirmTouched = String(confirmPassword || '').length > 0;
  const nextTouched = String(newPassword || '').length > 0;
  const passwordsMatch = nextTouched && confirmTouched && newPassword === confirmPassword;
  const passwordsMismatch = confirmTouched && newPassword !== confirmPassword;

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
    const next = String(newPassword || '').trim();
    const confirm = String(confirmPassword || '').trim();

    // Security: we never read the current password from the DB.
    // If the account is still on default password (mustChangePassword), allow changing without entering current.
    if (!next || !confirm || (!isForcePasswordChange && !curr)) {
      toast.error(t('students.profileTab.password.fieldsRequired'));
      return;
    }
    if (next.length < 6) {
      toast.error(t('students.profileTab.password.minLength'));
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

  return (
    <Card className="overflow-hidden">
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
          <div className="w-28 h-28 rounded-full bg-(--nb-color-bg-card) flex items-center justify-center shadow-inner ring-2 ring-(--nb-color-border)">
            <UserIcon size={56} className="text-(--nb-color-text)" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold leading-tight text-(--nb-color-text)">{profile?.student?.fullName || t('students.common.studentFallback')}</h2>
              {/* Summary cards: ID, Status, Cohort */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl mt-3">
                <div className="rounded-lg p-4 bg-(--nb-color-brand-50) text-(--nb-color-fg) border border-(--nb-color-border)">
                  <div className="text-xs uppercase tracking-wide font-semibold">{t('students.table.columns.studentId')}</div>
                  <div className="font-mono text-xl font-bold">{profile?.student?.studentId || '-'}</div>
                </div>
                <div className="rounded-lg p-4 bg-(--nb-color-accent-50) text-(--nb-color-fg) border border-(--nb-color-border)">
                  <div className="text-xs uppercase tracking-wide font-semibold">{t('students.table.columns.status')}</div>
                  <div className="text-xl font-bold">{profile?.student?.status || profile?.stats?.activeStatus || '-'}</div>
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
              <Card className="rounded-xl shadow-none">
                <div className="px-4 py-3 border-b border-(--nb-color-border)">
                  <h3 className="text-base font-semibold">{t('students.profileTab.personal.title')}</h3>
                  <p className="text-xs text-(--nb-color-muted)">{t('students.profileTab.personal.subtitle')}</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem label={t('students.form.fullName')} value={profile?.student?.fullName} />
                  <InfoItem label={t('students.form.gender')} value={profile?.student?.gender} />
                  <InfoItem label={t('students.form.dob')} value={formatDate(profile?.student)} />
                  <InfoItem label={t('students.form.guardianName')} value={profile?.student?.guardianName} />
                  <InfoItem label={t('students.form.contactNumber')} value={profile?.student?.contactNumber} />
                  <InfoItem label={t('students.form.admissionDate')} value={profile?.student?.admissionDate ? new Date(profile.student.admissionDate).toLocaleDateString() : '-'} />
                  <InfoItem label={t('students.form.address')} value={profile?.student?.address} />
                </div>
              </Card>

              <Card className="rounded-xl shadow-none">
                <div className="px-4 py-3 border-b border-(--nb-color-border)">
                  <h3 className="text-base font-semibold">{t('students.profileTab.academic.title')}</h3>
                  <p className="text-xs text-(--nb-color-muted)">{t('students.profileTab.academic.subtitle')}</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem label={t('students.table.columns.academicYear')} value={profile?.latestEnrollment?.academicYear?.yearName} />
                  <InfoItem label={t('students.table.columns.grade')} value={profile?.latestEnrollment?.grade?.gradeName || profile?.latestEnrollment?.gradeSection?.grade?.gradeName} />
                  <InfoItem label={t('students.table.columns.section')} value={profile?.latestEnrollment?.gradeSection?.section} />
                  <InfoItem label={t('students.table.columns.shift')} value={profile?.latestEnrollment?.shift?.shiftName} />
                </div>
              </Card>
            </div>

            {latestTransfer ? (
              <div className="mt-6">
                <TransferBadge transfer={latestTransfer} />
              </div>
            ) : null}

            {isStudentSelf ? (
              <Card className="mt-6 rounded-xl shadow-none">
                <div className="px-4 py-3 border-b border-(--nb-color-border)">
                  <h3 className="text-base font-semibold">{t('students.profileTab.password.title')}</h3>
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
                        className={`pr-10 ${passwordsMatch ? 'border-green-500' : (passwordsMismatch ? 'border-red-500' : '')}`}
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
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-(--nb-color-text) mb-1">{t('students.profileTab.password.confirm')}</label>
                    <div className="relative">
                      <Input
                        type={showConfirmPw ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`pr-10 ${passwordsMatch ? 'border-green-500' : (passwordsMismatch ? 'border-red-500' : '')}`}
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
      <div className="font-medium wrap-break-word">{value ?? '-'}</div>
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
