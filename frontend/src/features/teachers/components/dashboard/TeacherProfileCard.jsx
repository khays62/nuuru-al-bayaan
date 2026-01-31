import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
	BadgeCheck,
	ArrowLeft,
	Building2,
	Hash,
	Mail,
	Phone,
	UserCircle2,
	User as UserIcon,
	Eye,
	EyeOff,
	Shield,
} from 'lucide-react';
import { useAuth } from '../../../../auth/AuthContext';
import Button from '../../../../shared/components/ui/Button.jsx';
import Card from '../../../../shared/components/ui/Card.jsx';
import Input from '../../../../shared/components/ui/Input.jsx';
import AuditHistoryTable from '../../../../shared/components/audit/AuditHistoryTable.jsx';
import { fetchJson } from '../../../../shared/api/http';
import { getTeacherAuditLogs, getTeacherProfile } from '../../api/teachersApi.js';
import { teacherKeys } from '../../queryKeys';
import { useTeachersRealtimeInvalidation } from '../../useTeachersRealtimeInvalidation';

function firstChar(s) {
	const t = String(s || '').trim();
	return t ? t.charAt(0).toUpperCase() : '?';
}

function safeStr(v) {
	const s = String(v || '').trim();
	return s || '—';
}

function SmallStat({ label, value, tone = 'indigo' }) {
	const tones = {
		indigo: 'bg-indigo-50 text-indigo-800 border-indigo-100',
		blue: 'bg-blue-50 text-blue-800 border-blue-100',
		emerald: 'bg-emerald-50 text-emerald-800 border-emerald-100',
		violet: 'bg-violet-50 text-violet-800 border-violet-100',
	};
	return (
		<div className={`rounded-lg border px-4 py-3 ${tones[tone] || tones.indigo}`}>
			<div className="text-xs font-medium opacity-80">{label}</div>
			<div className="text-base font-semibold tabular-nums">{value ?? '—'}</div>
		</div>
	);
}

export default function TeacherProfileCard({ user, summary }) {
	const fullName = String(user?.fullName || '').trim();
	const initials = useMemo(() => {
		const parts = fullName.split(/\s+/).filter(Boolean);
		if (parts.length >= 2) return `${firstChar(parts[0])}${firstChar(parts[1])}`;
		return firstChar(fullName);
	}, [fullName]);

	const role = String(user?.role || '').trim();
	const teacherRef = user?.teacherRef ? String(user.teacherRef) : '';

	const stats = summary || {};

	return (
		<Card className="rounded-xl border-blue-100 shadow-sm overflow-hidden">
			<div className="px-6 py-3 bg-gray-800 text-white">
				<div className="font-semibold">My Profile</div>
				<div className="text-xs text-white/80 mt-0.5">Quick account info</div>
			</div>

			<div className="p-6 lg:p-8">
				<div className="flex items-start gap-4">
					<div className="shrink-0 w-14 h-14 rounded-full bg-linear-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-center font-semibold">
						{initials}
					</div>

					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<div className="text-xl md:text-2xl font-semibold text-gray-900 truncate">{fullName || 'Teacher'}</div>
							<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 text-xs font-semibold">
								<BadgeCheck size={14} /> {role ? role.toUpperCase() : 'TEACHER'}
							</span>
						</div>

						<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
							<div className="flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 text-base text-gray-800 min-w-0">
								<UserCircle2 size={18} className="text-gray-400" />
								<span className="truncate">Username: {safeStr(user?.username)}</span>
							</div>
							<div className="flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 text-base text-gray-800 min-w-0">
								<Hash size={18} className="text-gray-400" />
								<span className="break-all">Teacher Ref: {teacherRef ? teacherRef : '—'}</span>
							</div>
							<div className="flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 text-base text-gray-800 min-w-0">
								<Mail size={18} className="text-gray-400" />
								<span className="truncate">Email: {safeStr(user?.email)}</span>
							</div>
							<div className="flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 text-base text-gray-800 min-w-0">
								<Phone size={18} className="text-gray-400" />
								<span className="truncate">Phone: {safeStr(user?.phone)}</span>
							</div>
						</div>

						<div className="mt-5 flex flex-wrap gap-3">
							<SmallStat label="Classes" value={Number.isFinite(stats?.classesCount) ? stats.classesCount : '—'} tone="indigo" />
							<SmallStat label="Subjects" value={Number.isFinite(stats?.subjectsCount) ? stats.subjectsCount : '—'} tone="blue" />
							<SmallStat label="Today" value={Number.isFinite(stats?.todayLessons) ? stats.todayLessons : '—'} tone="emerald" />
							<SmallStat label="Week" value={Number.isFinite(stats?.weeklyLessons) ? stats.weeklyLessons : '—'} tone="violet" />
						</div>

						<div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
							<Building2 size={14} className="text-gray-400" />
							<span>Tip: If profile fields are missing, ask admin to update your teacher record.</span>
						</div>
					</div>
				</div>
			</div>
		</Card>
	);
}

function TeacherChangePasswordCard() {
	const { auth, refreshUser } = useAuth();
	const isForcePasswordChange = Boolean(auth?.user?.mustChangePassword);

	const [currentPassword, setCurrentPassword] = React.useState('');
	const [newPassword, setNewPassword] = React.useState('');
	const [confirmPassword, setConfirmPassword] = React.useState('');
	const [saving, setSaving] = React.useState(false);
	const [showCurrentPw, setShowCurrentPw] = React.useState(false);
	const [showNewPw, setShowNewPw] = React.useState(false);
	const [showConfirmPw, setShowConfirmPw] = React.useState(false);

	const confirmTouched = String(confirmPassword || '').length > 0;
	const nextTouched = String(newPassword || '').length > 0;
	const passwordsMatch = nextTouched && confirmTouched && newPassword === confirmPassword;
	const passwordsMismatch = confirmTouched && newPassword !== confirmPassword;

	const changePasswordMutation = useMutation({
		mutationFn: async (payload) => {
			return await fetchJson('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) });
		},
		onSuccess: async () => {
			toast.success('You changed your password successfully');
			setCurrentPassword('');
			setNewPassword('');
			setConfirmPassword('');
			try {
				if (typeof refreshUser === 'function') await refreshUser();
			} catch {
				// ignore
			}
		},
		onError: (err) => {
			toast.error(err?.data?.message || err?.message || 'Failed to change password.');
		},
	});

	const submit = async () => {
		const curr = String(currentPassword || '').trim();
		const next = String(newPassword || '').trim();
		const confirm = String(confirmPassword || '').trim();

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

		setSaving(true);
		try {
			const payload = isForcePasswordChange
				? { newPassword: next }
				: { currentPassword: curr, newPassword: next };
			await changePasswordMutation.mutateAsync(payload);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="rounded-xl border bg-white overflow-hidden">
			<div className="px-4 py-3 border-b">
				<div className="flex items-center gap-2">
					<Shield size={18} className="text-gray-700" />
					<h3 className="text-base font-semibold">Change Password</h3>
				</div>
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
							disabled={saving || isForcePasswordChange}
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
							disabled={saving || isForcePasswordChange}
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
							disabled={saving}
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
							disabled={saving}
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
					<Button type="button" variant="brand" onClick={submit} disabled={saving}>
						{saving ? 'Saving…' : 'Save'}
					</Button>
				</div>
			</div>
		</div>
	);
}

export function TeacherProfilePage() {
	const { teacherId } = useParams();
	const { auth } = useAuth();
	const authUser = auth?.user || null;
	const role = String(authUser?.role || '').toLowerCase();
	const isAdminView = Boolean(teacherId) && (role === 'admin' || role === 'staff');
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);

	useTeachersRealtimeInvalidation({ teacherId: isAdminView ? teacherId : undefined });

	const profileQuery = useQuery({
		queryKey: teacherKeys.adminProfile(teacherId),
		enabled: Boolean(isAdminView && teacherId),
		queryFn: async ({ signal }) => {
			const res = await getTeacherProfile(teacherId, { signal });
			const data = res?.data || res;
			return { teacher: data?.teacher || null, user: data?.user || null };
		},
		placeholderData: (prev) => prev,
	});

	const logsQuery = useQuery({
		queryKey: teacherKeys.adminAuditLogs({ teacherId, page, limit }),
		enabled: Boolean(isAdminView && teacherId),
		queryFn: async ({ signal }) => {
			const res = await getTeacherAuditLogs(teacherId, { page, limit }, { signal });
			return {
				data: Array.isArray(res?.data) ? res.data : [],
				meta: res?.meta || { page, limit, total: 0, totalPages: 1 },
			};
		},
		placeholderData: (prev) => prev,
	});

	const profile = profileQuery.data || { teacher: null, user: null };
	const effectiveTeacher = isAdminView ? profile.teacher : null;
	const effectiveUser = isAdminView ? profile.user : authUser;
	const fullName = (effectiveTeacher?.fullName || effectiveUser?.fullName || 'Teacher');
	const mergedUserForSummary = useMemo(() => {
		const base = effectiveUser || {};
		return {
			...base,
			fullName: fullName,
			email: effectiveTeacher?.email ?? base.email,
			phone: effectiveTeacher?.phone ?? base.phone,
		};
	}, [effectiveUser, effectiveTeacher?.email, effectiveTeacher?.phone, fullName]);

	useEffect(() => {
		if (!isAdminView) return;
		setPage(1);
		setLimit(10);
	}, [isAdminView, teacherId]);

	return (
		<Card className="p-0 rounded-xl overflow-hidden">
			<div className="bg-white p-10 border-b border-gray-200">
				{isAdminView ? (
					<div className="mb-4">
						<Button as={Link} to="/teachers" variant="neutral" size="md" icon={<ArrowLeft size={15} />}>
							Back to Teachers
						</Button>
					</div>
				) : null}

				<div className="flex flex-col items-center text-center gap-4">
					<div className="w-28 h-28 rounded-full bg-white flex items-center justify-center shadow-inner ring-2 ring-gray-300">
						<UserIcon size={56} className="text-black" />
					</div>
					<h2 className="text-2xl md:text-3xl font-bold leading-tight text-black">{fullName}</h2>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-6xl mt-3">
						<div className="rounded-lg p-4 bg-indigo-50 text-indigo-700 border border-indigo-100">
							<div className="text-xs uppercase tracking-wide font-semibold">Username</div>
							<div className="font-mono text-xl font-bold">{safeStr(effectiveUser?.username)}</div>
						</div>
						<div className="rounded-lg p-4 bg-emerald-50 text-emerald-700 border border-emerald-100">
							<div className="text-xs uppercase tracking-wide font-semibold">Role</div>
							<div className="text-xl font-bold">{String(effectiveUser?.role || 'teacher').toUpperCase()}</div>
						</div>
						<div className="rounded-lg p-4 bg-amber-50 text-amber-700 border border-amber-100">
							<div className="text-xs uppercase tracking-wide font-semibold">Teacher Ref</div>
							<div className="font-mono text-lg font-bold break-all leading-snug">{effectiveUser?.teacherRef ? String(effectiveUser.teacherRef) : '-'}</div>
						</div>
					</div>
				</div>
			</div>

			<div className="p-6">
				{isAdminView && profileQuery.isLoading && profileQuery.data == null ? (
					<div className="text-sm text-gray-600 mb-4">Loading teacher profile…</div>
				) : null}
				{isAdminView && profileQuery.isError ? (
					<div className="text-sm text-red-600 mb-4">{profileQuery.error?.data?.message || profileQuery.error?.message || 'Failed to load teacher profile'}</div>
				) : null}
				<div className="w-full">
					<TeacherProfileCard user={mergedUserForSummary} summary={{}} />
				</div>

				{isAdminView ? null : (
					<div className="mt-6">
						<TeacherChangePasswordCard />
					</div>
				)}

				{isAdminView ? (
					<div className="mt-6">
						<div className="rounded-xl border bg-white overflow-hidden">
							<div className="px-4 py-3 border-b">
								<h3 className="text-base font-semibold">Audit History</h3>
								<p className="text-xs text-gray-500">Recent actions recorded for this teacher account</p>
							</div>
							<div className="p-4">
								<AuditHistoryTable
									logs={logsQuery.data?.data || []}
									isLoading={Boolean(logsQuery.isLoading && (logsQuery.data?.data || []).length === 0)}
									error={logsQuery.isError ? (logsQuery.error?.data?.message || logsQuery.error?.message || 'Failed to load audit history') : null}
									meta={logsQuery.data?.meta || { page, limit, total: 0, totalPages: 1 }}
									onPage={setPage}
									onLimit={(v) => {
										setLimit(v);
										setPage(1);
									}}
									storageKey="teachers:profile:auditLogs:columns:v2"
									emptyTitle="No audit history."
									emptyDescription="No actions have been recorded yet."
								/>
							</div>
						</div>
					</div>
				) : null}

				
			</div>
		</Card>
	);
}

