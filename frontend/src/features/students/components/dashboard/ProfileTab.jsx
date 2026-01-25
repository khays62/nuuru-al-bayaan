import React from 'react';
import { useParams } from 'react-router-dom';
import Spinner from '../../../../shared/components/feedback/Spinner.jsx';
import { getStudentProfile, getStudentTransfers } from '../../../../api';
import TransferBadge from '../TransferBadge';
import { Eye, EyeOff, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../../../auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { fetchJson } from '../../../../shared/api/http';
import { studentKeys } from '../../queryKeys';
import Button from '../../../../shared/components/ui/Button.jsx';
import Input from '../../../../shared/components/ui/Input.jsx';
import Card from '../../../../shared/components/ui/Card.jsx';
import Alert from '../../../../shared/components/ui/Alert.jsx';
import UiLoadingState from '../../../../shared/components/ui/LoadingState.jsx';

export default function ProfileTab() {
  const { studentId: paramStudentId } = useParams();
  const { auth, refreshUser } = useAuth();

  const rawStudentRef = auth?.user?.studentRef;
  const studentRefId = rawStudentRef?._id || rawStudentRef || null;
  const studentId = paramStudentId || (auth?.user?.role === 'student' ? studentRefId : null);

  const isStudentSelf = auth?.user?.role === 'student' && !paramStudentId;
  const isForcePasswordChange = Boolean(isStudentSelf && auth?.user?.mustChangePassword);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [pwSaving, setPwSaving] = React.useState(false);
  const [showCurrentPw, setShowCurrentPw] = React.useState(false);
  const [showNewPw, setShowNewPw] = React.useState(false);
  const [showConfirmPw, setShowConfirmPw] = React.useState(false);

  const confirmTouched = String(confirmPassword || '').length > 0;
  const nextTouched = String(newPassword || '').length > 0;
  const passwordsMatch = nextTouched && confirmTouched && newPassword === confirmPassword;
  const passwordsMismatch = confirmTouched && newPassword !== confirmPassword;

  const handleChangePassword = async () => {
    const curr = String(currentPassword || '').trim();
    const next = String(newPassword || '').trim();
    const confirm = String(confirmPassword || '').trim();

    // Security: we never read the current password from the DB.
    // If the account is still on default password (mustChangePassword), allow changing without entering current.
    if (!next || !confirm || (!isForcePasswordChange && !curr)) {
      toast.error('Please fill in all required password fields.');
      return;
    }
    if (next.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (next !== confirm) {
      toast.error('New passwords do not match.');
      return;
    }

    setPwSaving(true);
    try {
      const payload = isForcePasswordChange
        ? { newPassword: next }
        : { oldPassword: curr, newPassword: next };

      await fetchJson('/students/change-password', { method: 'PUT', body: JSON.stringify(payload) });
      toast.success('You changed your password successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (typeof refreshUser === 'function') await refreshUser();
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  const profileQuery = useQuery({
    queryKey: studentKeys.profile(studentId),
    enabled: !!studentId,
    queryFn: async () => {
      const data = await getStudentProfile(studentId);
      if (!data) throw new Error('Failed to load profile');
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
  const error = profileQuery.isError ? 'Failed to load profile' : null;
  const profile = profileQuery.data ?? null;
  const latestTransfer = (transfersQuery.data || [])?.[0] ?? null;

  return (
    <Card className="overflow-hidden">
      {loading ? (
        <div className="p-6">
          <UiLoadingState label="Loading…" className="border-0 bg-transparent p-0 justify-start" />
        </div>
      ) : error ? (
        <Alert variant="danger" className="m-6 flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button size="sm" variant="brand" onClick={() => profileQuery.refetch()}>Retry</Button>
        </Alert>
      ) : profile ? (
        <>
          <div className="bg-white p-10 border-b border-gray-200">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center shadow-inner ring-2 ring-gray-300">
            <UserIcon size={56} className="text-black" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold leading-tight text-black">{profile?.student?.fullName || 'Student'}</h2>
              {/* Summary cards: ID, Status, Cohort */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl mt-3">
                <div className="rounded-lg p-4 bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <div className="text-xs uppercase tracking-wide font-semibold">Student ID</div>
                  <div className="font-mono text-xl font-bold">{profile?.student?.studentId || '-'}</div>
                </div>
                <div className="rounded-lg p-4 bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <div className="text-xs uppercase tracking-wide font-semibold">Status</div>
                  <div className="text-xl font-bold">{profile?.student?.status || profile?.stats?.activeStatus || '-'}</div>
                </div>
                <div className="rounded-lg p-4 bg-amber-50 text-amber-700 border border-amber-100">
                  <div className="text-xs uppercase tracking-wide font-semibold">Cohort</div>
                  <div className="text-xl font-bold">{profile?.latestEnrollment?.cohort?.name || '-'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="rounded-xl shadow-none">
                <div className="px-4 py-3 border-b">
                  <h3 className="text-base font-semibold">Personal Information</h3>
                  <p className="text-xs text-gray-500">Student personal details</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem label="Full Name" value={profile?.student?.fullName} />
                  <InfoItem label="Gender" value={profile?.student?.gender} />
                  <InfoItem label="Date of Birth" value={formatDate(profile?.student)} />
                  <InfoItem label="Parent/Guardian Name" value={profile?.student?.guardianName} />
                  <InfoItem label="Contact Number" value={profile?.student?.contactNumber} />
                  <InfoItem label="Admission Date" value={profile?.student?.admissionDate ? new Date(profile.student.admissionDate).toLocaleDateString() : '-'} />
                  <InfoItem label="Address" value={profile?.student?.address} />
                </div>
              </Card>

              <Card className="rounded-xl shadow-none">
                <div className="px-4 py-3 border-b">
                  <h3 className="text-base font-semibold">Academic Information</h3>
                  <p className="text-xs text-gray-500">Student academic details</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem label="Academic Year" value={profile?.latestEnrollment?.academicYear?.yearName} />
                  <InfoItem label="Grade" value={profile?.latestEnrollment?.grade?.gradeName || profile?.latestEnrollment?.gradeSection?.grade?.gradeName} />
                  <InfoItem label="Section" value={profile?.latestEnrollment?.gradeSection?.section} />
                  <InfoItem label="Shift" value={profile?.latestEnrollment?.shift?.shiftName} />
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
                <div className="px-4 py-3 border-b">
                  <h3 className="text-base font-semibold">Change Password</h3>
                  <p className="text-xs text-gray-500">Update your account password</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current</label>
                    <div className="relative">
                      <Input
                        type={showCurrentPw ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="pr-10"
                        autoComplete="current-password"
                        disabled={pwSaving || isForcePasswordChange}
                        placeholder={isForcePasswordChange ? 'Default password' : ''}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onMouseEnter={() => setShowCurrentPw(true)}
                        onMouseLeave={() => setShowCurrentPw(false)}
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label="Show current password"
                        title="Show password"
                        disabled={pwSaving || isForcePasswordChange}
                      >
                        {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {isForcePasswordChange ? (
                      <div className="mt-1 text-[11px] text-gray-500">
                        Your account is using the default password. Set a new one.
                      </div>
                    ) : null}
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">New</label>
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onMouseEnter={() => setShowNewPw(true)}
                        onMouseLeave={() => setShowNewPw(false)}
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label="Show new password"
                        title="Show password"
                      >
                        {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm</label>
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onMouseEnter={() => setShowConfirmPw(true)}
                        onMouseLeave={() => setShowConfirmPw(false)}
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label="Show confirm password"
                        title="Show password"
                      >
                        {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-3 flex justify-end">
                    <Button type="button" variant="brand" onClick={handleChangePassword} disabled={pwSaving}>
                      {pwSaving ? 'Saving…' : 'Save'}
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
      <div className="text-xs text-gray-500">{label}</div>
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
