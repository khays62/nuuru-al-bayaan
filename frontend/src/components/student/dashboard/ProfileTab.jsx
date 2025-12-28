import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Spinner from '../../common/Feedback/Spinner';
import { getStudentTransfers } from '../../../api';
import TransferBadge from '../../student/TransferBadge';
import { User as UserIcon } from 'lucide-react';

export default function ProfileTab() {
  const { studentId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latestTransfer, setLatestTransfer] = useState(null);
  const [reloadSig, setReloadSig] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function fetchProfile() {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/students/${studentId}`);
        if (!res.ok) throw new Error('Profile request failed');
        const json = await res.json();
        if (mounted) setProfile(json);
      } catch (e) {
        console.error(e);
        if (mounted) setError('Failed to load profile');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (studentId) fetchProfile();
    return () => { mounted = false; };
  }, [studentId, reloadSig]);

  useEffect(() => {
    let mounted = true;
    async function loadTransfers() {
      try {
        const res = await getStudentTransfers(studentId, { limit: 1 });
        if (!mounted) return;
        const logs = res.data || [];
        setLatestTransfer(logs[0] || null);
      } catch (e) {
        // non-blocking
      }
    }
    if (studentId) loadTransfers();
    return () => { mounted = false; };
  }, [studentId]);

  return (
    <div className="bg-white p-0 rounded-xl shadow overflow-hidden">
      {loading ? (
        <div className="p-6 text-gray-600 flex items-center gap-2"><Spinner size={20} /> Loading…</div>
      ) : error ? (
        <div className="p-6 text-red-600 text-sm flex items-center gap-3">
          <span>{error}</span>
          <button onClick={() => setReloadSig(s => s + 1)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded">Retry</button>
        </div>
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
              <section className="rounded-xl border bg-white">
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
              </section>

              <section className="rounded-xl border bg-white">
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
              </section>
            </div>
          </div>
        </>
      ) : null}
    </div>
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
