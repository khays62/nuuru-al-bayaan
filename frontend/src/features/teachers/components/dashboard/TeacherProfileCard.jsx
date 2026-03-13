import React, { useEffect, useMemo, useState } from 'react';
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
import Skeleton from '../../../../shared/components/ui/Skeleton.jsx';
import AuditHistoryTable from '../../../../shared/components/audit/AuditHistoryTable.jsx';
import { fetchJson } from '../../../../shared/api/http';
import { getAssignments, getTeacherAuditLogs, getTeacherProfile } from '../../api/teachersApi.js';
import { teacherKeys } from '../../queryKeys';
import { useTeachersRealtimeInvalidation } from '../../useTeachersRealtimeInvalidation';
import { useI18n } from '../../../../i18n/useI18n';
import { getSomaliaDistrictLabel, getSomaliaRegionLabel } from '../../../../shared/data/somaliaAdminDivisions.js';
import { getSlotsWithOptions } from '../../../timetable/api/timetable';
import {
	getPasswordIssueMessage,
	getPasswordValidationState,
	resolvePasswordPolicy,
} from '../../../../shared/utils/passwordPolicy.js';
import { displayText } from '../../../../utils/displayText';

function firstChar(s) {
	const t = String(s || '').trim();
	return t ? t.charAt(0).toUpperCase() : '?';
}

function safeStr(v) {
	return displayText(v, '-');
}

function SmallStat({ label, value, tone = 'indigo' }) {
	const tones = {
		indigo: 'bg-(--nb-color-brand-50) text-(--nb-color-fg) border-(--nb-color-border)',
		blue: 'bg-(--nb-color-brand-50) text-(--nb-color-fg) border-(--nb-color-border)',
		emerald: 'bg-(--nb-color-accent-50) text-(--nb-color-fg) border-(--nb-color-border)',
		violet: 'bg-(--nb-color-accent-50) text-(--nb-color-fg) border-(--nb-color-border)',
	};
	return (
		<div className={`rounded-lg border px-4 py-3 ${tones[tone] || tones.indigo}`}>
			<div className="text-xs font-medium opacity-80">{label}</div>
			<div className="text-base font-semibold tabular-nums">{displayText(value, '-')}</div>
		</div>
	);
}

export default function TeacherProfileCard({ user, summary }) {
	const { t } = useI18n();
	const fullName = String(user?.fullName || '').trim();
	const photoUrl = String(user?.photo?.url || user?.photoUrl || '').trim();
	const initials = useMemo(() => {
		const parts = fullName.split(/\s+/).filter(Boolean);
		if (parts.length >= 2) return `${firstChar(parts[0])}${firstChar(parts[1])}`;
		return firstChar(fullName);
	}, [fullName]);

	const role = String(user?.role || '').trim();
	const publicTeacherId = String(user?.employeeId || user?.teacherId || '').trim();

	const stats = summary || {};

	return (
		<Card className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden shadow-[0_10px_18px_-12px_rgba(0,0,0,0.35)] hover:border-(--nb-color-accent) focus-within:border-(--nb-color-accent) focus-within:ring-2 focus-within:ring-(--nb-color-accent-200) transition-colors">
			<div className="px-6 py-3 bg-(--nb-color-brand) text-white">
				<div className="font-semibold">{t('teachers.dashboard.profile.title', { defaultValue: 'My Profile' })}</div>
				<div className="text-xs text-white/80 mt-0.5">{t('teachers.dashboard.profile.subtitle', { defaultValue: 'Quick account info' })}</div>
			</div>

			<div className="p-6 lg:p-8">
				<div className="flex items-start gap-4">
					<div className="shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-full bg-linear-to-r from-(--nb-color-brand) to-(--nb-color-accent) text-white flex items-center justify-center text-lg md:text-xl font-semibold overflow-hidden">
						{photoUrl ? (
							<img src={photoUrl} alt={t('teachers.form.photo.alt', { defaultValue: 'Teacher photo' })} className="w-full h-full object-cover" loading="lazy" />
						) : (
							initials
						)}
					</div>

					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<div className="text-xl md:text-2xl font-semibold text-(--nb-color-text) truncate">{fullName || t('teachers.dashboard.profile.teacherFallback', { defaultValue: 'Teacher' })}</div>
							<span className="inline-flex items-center gap-1 rounded-full bg-(--nb-color-accent-50) text-(--nb-color-fg) border border-(--nb-color-border) px-2 py-0.5 text-xs font-semibold">
								<BadgeCheck size={14} /> {role ? role.toUpperCase() : t('teachers.dashboard.profile.roleFallback', { defaultValue: 'TEACHER' })}
							</span>
						</div>

						<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
							<div className="flex items-center gap-2 rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2 text-base text-(--nb-color-text) min-w-0">
								<UserCircle2 size={18} className="text-(--nb-color-muted)" />
								<span className="truncate">{t('teachers.dashboard.profile.fields.username', { defaultValue: 'Username' })}: {safeStr(user?.username)}</span>
							</div>
							<div className="flex items-center gap-2 rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2 text-base text-(--nb-color-text) min-w-0">
								<Hash size={18} className="text-(--nb-color-muted)" />
								<span className="truncate">{t('teachers.form.employeeId', { defaultValue: 'Employee ID' })}: {displayText(publicTeacherId, '-')}</span>
							</div>
							<div className="flex items-center gap-2 rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2 text-base text-(--nb-color-text) min-w-0">
								<Mail size={18} className="text-(--nb-color-muted)" />
								<span className="truncate">{t('teachers.dashboard.profile.fields.email', { defaultValue: 'Email' })}: {safeStr(user?.email)}</span>
							</div>
							<div className="flex items-center gap-2 rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2 text-base text-(--nb-color-text) min-w-0">
								<Phone size={18} className="text-(--nb-color-muted)" />
								<span className="truncate">{t('teachers.dashboard.profile.fields.phone', { defaultValue: 'Phone' })}: {safeStr(user?.phone)}</span>
							</div>
						</div>

						<div className="mt-5 flex flex-wrap gap-3">
							<SmallStat label={t('teachers.dashboard.profile.stats.classes', { defaultValue: 'Classes' })} value={Number.isFinite(stats?.classesCount) ? stats.classesCount : null} tone="indigo" />
							<SmallStat label={t('teachers.dashboard.profile.stats.subjects', { defaultValue: 'Subjects' })} value={Number.isFinite(stats?.subjectsCount) ? stats.subjectsCount : null} tone="blue" />
							<SmallStat label={t('teachers.dashboard.profile.stats.today', { defaultValue: 'Today' })} value={Number.isFinite(stats?.todayLessons) ? stats.todayLessons : null} tone="emerald" />
							<SmallStat label={t('teachers.dashboard.profile.stats.week', { defaultValue: 'Week' })} value={Number.isFinite(stats?.weeklyLessons) ? stats.weeklyLessons : null} tone="violet" />
						</div>

						<div className="mt-4 flex items-center gap-2 text-xs text-(--nb-color-muted)">
							<Building2 size={14} className="text-(--nb-color-muted)" />
							<span>{t('teachers.dashboard.profile.tip', { defaultValue: 'Tip: If profile fields are missing, ask admin to update your teacher record.' })}</span>
						</div>
					</div>
				</div>
			</div>
		</Card>
	);
}

function TeacherProfileCardSkeleton() {
	return (
		<Card className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden shadow-[0_10px_18px_-12px_rgba(0,0,0,0.35)]">
			<div className="px-6 py-3 bg-(--nb-color-brand) text-white">
				<Skeleton className="h-4 w-28" />
				<Skeleton className="h-3 w-40 mt-2" />
			</div>

			<div className="p-6 lg:p-8">
				<div className="flex items-start gap-4">
					<Skeleton className="shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-full" />
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<Skeleton className="h-7 w-56" />
							<Skeleton className="h-6 w-20 rounded-full" />
						</div>

						<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
							<Skeleton className="h-10 w-full rounded-lg" />
							<Skeleton className="h-10 w-full rounded-lg" />
							<Skeleton className="h-10 w-full rounded-lg" />
							<Skeleton className="h-10 w-full rounded-lg" />
						</div>

						<div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
							<Skeleton className="h-16 w-full rounded-lg" />
							<Skeleton className="h-16 w-full rounded-lg" />
							<Skeleton className="h-16 w-full rounded-lg" />
							<Skeleton className="h-16 w-full rounded-lg" />
						</div>
					</div>
				</div>
			</div>
		</Card>
	);
}

function TeacherDetailsCardsSkeleton() {
	const cardBase =
		'rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg-card) ' +
		'shadow-(--nb-shadow-md) shadow-[0_10px_18px_-12px_rgba(0,0,0,0.35)]';

	return (
		<div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
			{Array.from({ length: 4 }).map((_, i) => (
				<Card key={i} className={cardBase}>
					<div className="px-4 py-3 border-b border-(--nb-color-border) bg-linear-to-r from-(--nb-color-brand-100) to-(--nb-color-accent-100) rounded-t-(--nb-radius-md)">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-3 w-44 mt-2" />
					</div>
					<div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
						{Array.from({ length: 6 }).map((__, j) => (
							<div key={j}>
								<Skeleton className="h-3 w-24" />
								<Skeleton className="h-4 w-full mt-2" />
							</div>
						))}
					</div>
				</Card>
			))}
		</div>
	);
}

function InfoItem({ label, value }) {
	return (
		<div className="min-w-0">
			<div className="text-xs text-(--nb-color-muted)">{label}</div>
			<div className="text-sm font-semibold text-(--nb-color-text) wrap-break-word">{displayText(value, '-')}</div>
		</div>
	);
}

function fmtDate(value) {
	if (!value) return '-';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return safeStr(value);
	return d.toISOString().slice(0, 10);
}

function formatGender(v, t) {
	const s = String(v || '').trim();
	if (!s) return '-';
	if (s.toLowerCase() === 'male') return t('teachers.form.genderOptions.male', { defaultValue: 'Male' });
	if (s.toLowerCase() === 'female') return t('teachers.form.genderOptions.female', { defaultValue: 'Female' });
	return s;
}

function formatEmploymentType(v, t) {
	const s = String(v || '').trim();
	if (!s) return '-';
	if (s === 'fullTime') return t('teachers.form.employmentTypeOptions.fullTime', { defaultValue: 'Full-time' });
	if (s === 'partTime') return t('teachers.form.employmentTypeOptions.partTime', { defaultValue: 'Part-time' });
	if (s === 'contract') return t('teachers.form.employmentTypeOptions.contract', { defaultValue: 'Contract' });
	return s;
}

function formatTeacherStatus(v, t) {
	const s = String(v || '').trim();
	if (!s) return '-';
	if (s.toLowerCase() === 'active') return t('teachers.form.active', { defaultValue: 'Active' });
	if (s.toLowerCase() === 'inactive') return t('teachers.form.inactive', { defaultValue: 'Inactive' });
	return s;
}

function formatQualification(v, t) {
	const s = String(v || '').trim();
	if (!s) return '-';
	if (s === 'certificate') return t('teachers.form.qualificationOptions.certificate', { defaultValue: 'Certificate' });
	if (s === 'diploma') return t('teachers.form.qualificationOptions.diploma', { defaultValue: 'Diploma' });
	if (s === 'bachelor') return t('teachers.form.qualificationOptions.bachelor', { defaultValue: "Bachelor's" });
	if (s === 'master') return t('teachers.form.qualificationOptions.master', { defaultValue: "Master's" });
	if (s === 'phd') return t('teachers.form.qualificationOptions.phd', { defaultValue: 'PhD' });
	if (s === 'other') return t('teachers.form.qualificationOptions.other', { defaultValue: 'Other' });
	return s;
}

function TeacherDetailsCards({ teacher, lang }) {
	const { t } = useI18n();
	const isSomali = teacher?.isSomali !== false;
	const regionLabel = teacher?.residenceRegionId ? getSomaliaRegionLabel(teacher.residenceRegionId, lang) : '';
	const districtLabel = (teacher?.residenceRegionId && teacher?.residenceDistrictId)
		? getSomaliaDistrictLabel(teacher.residenceRegionId, teacher.residenceDistrictId, lang)
		: '';

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
		<div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
			<Card className={cardBase}>
				<div className={cardHeaderBase}>
					<h3 className={cardTitleClass}>{t('teachers.form.sections.personal', { defaultValue: 'Personal' })}</h3>
					<p className="text-xs text-(--nb-color-muted)">{t('teachers.dashboard.profile.subtitle', { defaultValue: 'Quick account info' })}</p>
				</div>
				<div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
					<InfoItem label={t('teachers.form.fullName', { defaultValue: 'Full Name' })} value={teacher?.fullName} />
					<InfoItem label={t('teachers.form.gender', { defaultValue: 'Gender' })} value={formatGender(teacher?.gender, t)} />
					<InfoItem label={t('teachers.form.dob', { defaultValue: 'Date of Birth' })} value={fmtDate(teacher?.dob)} />
					<InfoItem label={t('teachers.form.employeeId', { defaultValue: 'Employee ID' })} value={teacher?.employeeId} />
				</div>
			</Card>

			<Card className={cardBase}>
				<div className={cardHeaderBase}>
					<h3 className={cardTitleClass}>{t('teachers.form.sections.contact', { defaultValue: 'Contact' })}</h3>
					<p className="text-xs text-(--nb-color-muted)">{t('students.profileTab.contacts.subtitle', { defaultValue: 'Phone numbers and email addresses' })}</p>
				</div>
				<div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
					<InfoItem label={t('teachers.form.email', { defaultValue: 'Email' })} value={teacher?.email} />
					<InfoItem label={t('teachers.form.primaryPhone', { defaultValue: 'Primary Phone' })} value={teacher?.phone} />
					<InfoItem label={t('teachers.form.secondaryPhone', { defaultValue: 'Secondary Phone' })} value={teacher?.phone2} />
					<InfoItem label={t('teachers.form.teacherId', { defaultValue: 'Username' })} value={teacher?.teacherId} />
				</div>
			</Card>

			<Card className={cardBase}>
				<div className={cardHeaderBase}>
					<h3 className={cardTitleClass}>{t('teachers.form.sections.address', { defaultValue: 'Address' })}</h3>
					<p className="text-xs text-(--nb-color-muted)">{t('students.profileTab.residence.subtitle', { defaultValue: 'Home location details' })}</p>
				</div>
				<div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
					<InfoItem
						label={t('students.address.nationality.label', { defaultValue: 'Nationality' })}
						value={isSomali
							? t('students.address.nationality.somali', { defaultValue: 'Somali' })
							: t('students.address.nationality.notSomali', { defaultValue: 'Not Somali' })}
					/>
					<InfoItem
						label={t('teachers.form.nationalityDetail', { defaultValue: 'Nationality (details)' })}
						value={isSomali ? '-' : (teacher?.nationality || '-')}
					/>
					<InfoItem
						label={t('students.address.region.label', { defaultValue: 'Region' })}
						value={!isSomali ? '-' : (regionLabel || teacher?.residenceRegionId)}
					/>
					<InfoItem
						label={t('students.address.district.label', { defaultValue: 'District' })}
						value={!isSomali ? '-' : (districtLabel || teacher?.residenceDistrictId)}
					/>
					<InfoItem
						label={t('students.address.neighborhood.label', { defaultValue: 'Neighborhood' })}
						value={!isSomali ? '-' : teacher?.residenceNeighborhood}
					/>
				</div>
			</Card>

			<Card className={cardBase}>
				<div className={cardHeaderBase}>
					<h3 className={cardTitleClass}>{t('teachers.form.sections.professional', { defaultValue: 'Professional' })}</h3>
					<p className="text-xs text-(--nb-color-muted)">{t('teachers.form.specialization', { defaultValue: 'Specialization' })}</p>
				</div>
				<div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
					<InfoItem label={t('teachers.form.specialization', { defaultValue: 'Specialization' })} value={teacher?.specialization} />
					<InfoItem label={t('teachers.form.qualification', { defaultValue: 'Qualification' })} value={formatQualification(teacher?.qualification, t)} />
					<InfoItem label={t('teachers.form.yearsOfExperience', { defaultValue: 'Years of Experience' })} value={teacher?.yearsOfExperience} />
					<InfoItem label={t('teachers.form.sections.employment', { defaultValue: 'Employment' })} value={formatTeacherStatus(teacher?.status, t)} />
					<InfoItem label={t('teachers.form.hireDate', { defaultValue: 'Hire Date' })} value={fmtDate(teacher?.hireDate)} />
					<InfoItem label={t('teachers.form.employmentType', { defaultValue: 'Employment Type' })} value={formatEmploymentType(teacher?.employmentType, t)} />
				</div>
			</Card>
		</div>
	);
}

function TeacherChangePasswordCard() {
	const { auth, refreshUser } = useAuth();
	const { t } = useI18n();
	const isForcePasswordChange = Boolean(auth?.user?.mustChangePassword);
	const passwordPolicy = React.useMemo(
		() => resolvePasswordPolicy(auth?.privacyPolicy?.passwordPolicy),
		[auth?.privacyPolicy?.passwordPolicy],
	);

	const [currentPassword, setCurrentPassword] = React.useState('');
	const [newPassword, setNewPassword] = React.useState('');
	const [confirmPassword, setConfirmPassword] = React.useState('');
	const [saving, setSaving] = React.useState(false);
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
		mutationFn: async (payload) => {
			return await fetchJson('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) });
		},
		onSuccess: async () => {
			toast.success(t('students.profileTab.password.changedSuccess', { defaultValue: 'Password changed successfully.' }));
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
			toast.error(err?.data?.message || err?.message || t('students.profileTab.password.changeFailed', { defaultValue: 'Failed to change password.' }));
		},
	});

	const submit = async () => {
		const curr = String(currentPassword || '').trim();
		const next = normalizedNewPassword;
		const confirm = normalizedConfirmPassword;

		if (!next || !confirm || (!isForcePasswordChange && !curr)) {
			toast.error(t('students.profileTab.password.fieldsRequired', { defaultValue: 'Please fill in all required fields.' }));
			return;
		}
		if (!passwordUi.ok) {
			toast.error(firstPasswordIssueMessage || t('students.profileTab.password.invalid', { defaultValue: 'Password policy validation failed.' }));
			return;
		}
		if (next !== confirm) {
			toast.error(t('students.profileTab.password.noMatch', { defaultValue: 'Passwords do not match.' }));
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
		<div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden">
			<div className="px-4 py-3 border-b border-(--nb-color-border)">
				<div className="flex items-center gap-2">
					<Shield size={18} className="text-(--nb-color-text)" />
					<h3 className="text-base font-semibold">{t('students.profileTab.password.title', { defaultValue: 'Change Password' })}</h3>
				</div>
				<p className="text-xs text-(--nb-color-muted)">{t('students.profileTab.password.subtitle', { defaultValue: 'Update your password' })}</p>
			</div>
			<div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div className="sm:col-span-1">
					<label className="block text-sm font-medium text-(--nb-color-text) mb-1">{t('students.profileTab.password.current', { defaultValue: 'Current password' })}</label>
					<div className="relative">
						<Input
							type={showCurrentPw ? 'text' : 'password'}
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
							className="pr-10"
							autoComplete="current-password"
							disabled={saving || isForcePasswordChange}
							placeholder={isForcePasswordChange ? t('students.profileTab.password.defaultPasswordPlaceholder', { defaultValue: 'Default password' }) : ''}
						/>
						<button
							type="button"
							className="absolute right-3 top-1/2 -translate-y-1/2 text-(--nb-color-muted) hover:text-(--nb-color-text)"
							onMouseEnter={() => setShowCurrentPw(true)}
							onMouseLeave={() => setShowCurrentPw(false)}
							onMouseDown={(e) => e.preventDefault()}
							aria-label={t('students.profileTab.password.showCurrentAria', { defaultValue: 'Show current password' })}
							title={t('students.profileTab.password.showPasswordTitle', { defaultValue: 'Show password' })}
							disabled={saving || isForcePasswordChange}
						>
							{showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
						</button>
					</div>
					{isForcePasswordChange ? (
						<div className="mt-1 text-[11px] text-(--nb-color-muted)">
							{t('students.profileTab.password.defaultPasswordNote', { defaultValue: 'Your account is using the default password. Please change it now.' })}
						</div>
					) : null}
				</div>

				<div className="sm:col-span-1">
					<label className="block text-sm font-medium text-(--nb-color-text) mb-1">{t('students.profileTab.password.new', { defaultValue: 'New password' })}</label>
					<div className="relative">
						<Input
							type={showNewPw ? 'text' : 'password'}
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							className={`pr-10 ${passwordUi.newPasswordState === 'valid' ? 'border-green-500' : (passwordUi.newPasswordState === 'invalid' ? 'border-red-500' : '')}`}
							autoComplete="new-password"
							disabled={saving}
						/>
						<button
							type="button"
							className="absolute right-3 top-1/2 -translate-y-1/2 text-(--nb-color-muted) hover:text-(--nb-color-text)"
							onMouseEnter={() => setShowNewPw(true)}
							onMouseLeave={() => setShowNewPw(false)}
							onMouseDown={(e) => e.preventDefault()}
							aria-label={t('students.profileTab.password.showNewAria', { defaultValue: 'Show new password' })}
							title={t('students.profileTab.password.showPasswordTitle', { defaultValue: 'Show password' })}
						>
							{showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
						</button>
					</div>
					{passwordUi.passwordTouched && firstPasswordIssueMessage ? (
						<div className="mt-1 text-xs text-red-600">{firstPasswordIssueMessage}</div>
					) : null}
				</div>

				<div className="sm:col-span-1">
					<label className="block text-sm font-medium text-(--nb-color-text) mb-1">{t('students.profileTab.password.confirm', { defaultValue: 'Confirm password' })}</label>
					<div className="relative">
						<Input
							type={showConfirmPw ? 'text' : 'password'}
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className={`pr-10 ${passwordUi.confirmPasswordState === 'valid' ? 'border-green-500' : (passwordUi.confirmPasswordState === 'invalid' ? 'border-red-500' : '')}`}
							autoComplete="new-password"
							disabled={saving}
						/>
						<button
							type="button"
							className="absolute right-3 top-1/2 -translate-y-1/2 text-(--nb-color-muted) hover:text-(--nb-color-text)"
							onMouseEnter={() => setShowConfirmPw(true)}
							onMouseLeave={() => setShowConfirmPw(false)}
							onMouseDown={(e) => e.preventDefault()}
							aria-label={t('students.profileTab.password.showConfirmAria', { defaultValue: 'Show confirm password' })}
							title={t('students.profileTab.password.showPasswordTitle', { defaultValue: 'Show password' })}
						>
							{showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
						</button>
					</div>
					{passwordUi.confirmTouched && passwordUi.passwordsMismatch ? (
						<div className="mt-1 text-xs text-red-600">{t('students.profileTab.password.noMatch', { defaultValue: 'Passwords do not match.' })}</div>
					) : null}
					{passwordUi.passwordsMatch ? (
						<div className="mt-1 text-xs text-green-600">{t('students.profileTab.password.match', { defaultValue: 'Passwords match.' })}</div>
					) : null}
				</div>

				<div className="sm:col-span-3 flex justify-end">
					<Button type="button" variant="brand" onClick={submit} disabled={saving}>
						{saving ? t('common.saving', { defaultValue: 'Savingâ€¦' }) : t('common.actions.save', { defaultValue: 'Save' })}
					</Button>
				</div>
			</div>
		</div>
	);
}

export function TeacherProfilePage() {
	const { t, lang } = useI18n();
	const { teacherId } = useParams();
	const { auth } = useAuth();
	const authUser = auth?.user || null;
	const role = String(authUser?.role || '').toLowerCase();
	const isTeacherRole = role === 'teacher';
	const isAdminView = Boolean(teacherId) && (role === 'admin' || role === 'staff');
	const rawTeacherRef = authUser?.teacherRef;
	const teacherRefId = rawTeacherRef?._id || rawTeacherRef || null;
	const effectiveTeacherId = teacherId || teacherRefId || null;
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);

	useTeachersRealtimeInvalidation({ teacherId: isAdminView ? teacherId : undefined });

	const profileQuery = useQuery({
		queryKey: teacherKeys.adminProfile(effectiveTeacherId),
		enabled: Boolean(effectiveTeacherId),
		queryFn: async ({ signal }) => {
			const res = await getTeacherProfile(effectiveTeacherId, { signal });
			const data = res?.data || res;
			const teacher = data?.teacher || (data && typeof data === 'object' && data._id ? data : null);
			const user = data?.user || null;
			return { teacher, user };
		},
	});

	const assignmentsQuery = useQuery({
		queryKey: teacherKeys.assignments(effectiveTeacherId),
		enabled: Boolean(effectiveTeacherId),
		queryFn: async ({ signal }) => {
			const res = await getAssignments(effectiveTeacherId, {}, { signal });
			return Array.isArray(res?.data) ? res.data : [];
		},
	});

	const getTimetableDayIndexFromLocalDate = (d = new Date()) => {
		const js = d.getDay();
		if (js === 6) return 0;
		if (js === 0) return 1;
		return js + 1;
	};
	const todayIdx = getTimetableDayIndexFromLocalDate(new Date());

	const todaySlotsQuery = useQuery({
		queryKey: isTeacherRole
			? teacherKeys.timetableTodayMine({ dayIndex: todayIdx })
			: ['timetableTodayTeacher', String(effectiveTeacherId || ''), String(todayIdx)],
		enabled: Boolean(effectiveTeacherId),
		queryFn: async ({ signal }) => {
			const params = isTeacherRole
				? { mine: 1, day: todayIdx }
				: { teacher: effectiveTeacherId, day: todayIdx };
			const res = await getSlotsWithOptions(params, { signal });
			return Array.isArray(res?.data) ? res.data : [];
		},
	});

	const weekSlotsQuery = useQuery({
		queryKey: isTeacherRole
			? ['teacher', 'timetableWeekMine']
			: ['timetableWeekTeacher', String(effectiveTeacherId || '')],
		enabled: Boolean(effectiveTeacherId),
		queryFn: async ({ signal }) => {
			const params = isTeacherRole ? { mine: 1 } : { teacher: effectiveTeacherId };
			const res = await getSlotsWithOptions(params, { signal });
			return Array.isArray(res?.data) ? res.data : [];
		},
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
	const effectiveTeacher = profile.teacher;
	const effectiveUser = isAdminView ? (profile.user || authUser) : authUser;
	const fullName = (effectiveTeacher?.fullName || effectiveUser?.fullName || t('teachers.dashboard.profile.teacherFallback', { defaultValue: 'Teacher' }));
	const teacherPhotoUrl = String(effectiveTeacher?.photo?.url || effectiveTeacher?.photoUrl || '').trim();
	const mergedUserForSummary = useMemo(() => {
		const base = effectiveUser || {};
		return {
			...base,
			fullName: fullName,
			email: effectiveTeacher?.email ?? base.email,
			phone: effectiveTeacher?.phone ?? base.phone,
			photoUrl: teacherPhotoUrl,
			employeeId: effectiveTeacher?.employeeId ?? base.employeeId,
			teacherId: effectiveTeacher?.teacherId ?? base.teacherId,
		};
	}, [effectiveUser, effectiveTeacher?.email, effectiveTeacher?.phone, effectiveTeacher?.employeeId, effectiveTeacher?.teacherId, fullName, teacherPhotoUrl]);

	const profileSummary = useMemo(() => {
		const assignments = Array.isArray(assignmentsQuery.data) ? assignmentsQuery.data : null;
		const todaySlots = Array.isArray(todaySlotsQuery.data) ? todaySlotsQuery.data : null;
		const weekSlots = Array.isArray(weekSlotsQuery.data) ? weekSlotsQuery.data : null;
		const countLessons = (rows) => rows.filter((r) => !r?.isBreak).length;

		const classIds = assignments
			? new Set(
					assignments
						.map((a) => a?.gradeSection?._id || a?.gradeSection)
						.filter(Boolean)
						.map((id) => String(id))
				)
			: null;
		const subjectIds = assignments
			? new Set(
					assignments
						.map((a) => a?.subject?._id || a?.subject)
						.filter(Boolean)
						.map((id) => String(id))
				)
			: null;

		return {
			classesCount: classIds ? classIds.size : undefined,
			subjectsCount: subjectIds ? subjectIds.size : undefined,
			todayLessons: todaySlots ? countLessons(todaySlots) : undefined,
			weeklyLessons: weekSlots ? countLessons(weekSlots) : undefined,
		};
	}, [assignmentsQuery.data, todaySlotsQuery.data, weekSlotsQuery.data]);

	useEffect(() => {
		if (!isAdminView) return;
		setPage(1);
		setLimit(10);
	}, [isAdminView, teacherId]);

	const isInitialProfileLoading = Boolean(profileQuery.isLoading && profileQuery.data == null);

	return (
		<Card className="p-0 rounded-xl overflow-hidden">
			<div className="p-6">
				{isAdminView ? (
					<div className="mb-4">
						<Button as={Link} to="/teachers" variant="neutral" size="md" icon={<ArrowLeft size={15} />}>
							{t('teachers.profile.backToTeachers', { defaultValue: 'Back to Teachers' })}
						</Button>
					</div>
				) : null}

				{profileQuery.isError ? (
					<div className="text-sm text-red-600 mb-4">{profileQuery.error?.data?.message || profileQuery.error?.message || t('teachers.profile.loadFailed', { defaultValue: 'Failed to load teacher profile' })}</div>
				) : null}

				{isInitialProfileLoading ? (
					<>
						<div className="w-full">
							<TeacherProfileCardSkeleton />
						</div>
						<TeacherDetailsCardsSkeleton />
					</>
				) : (
					<>
						<div className="w-full">
							<TeacherProfileCard user={mergedUserForSummary} summary={profileSummary} />
						</div>

						{effectiveTeacher ? (
							<TeacherDetailsCards teacher={effectiveTeacher} lang={lang} />
						) : null}
					</>
				)}

				{isAdminView ? null : (
					<div className="mt-6">
						<TeacherChangePasswordCard />
					</div>
				)}

				{isAdminView ? (
					<div className="mt-6">
						<div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden">
							<div className="px-4 py-3 border-b border-(--nb-color-border)">
								<h3 className="text-base font-semibold">{t('teachers.profile.audit.title', { defaultValue: 'Audit History' })}</h3>
								<p className="text-xs text-(--nb-color-muted)">{t('teachers.profile.audit.subtitle', { defaultValue: 'Recent actions recorded for this teacher account' })}</p>
							</div>
							<div className="p-4">
								<AuditHistoryTable
									logs={logsQuery.data?.data || []}
									isLoading={Boolean(logsQuery.isLoading && (logsQuery.data?.data || []).length === 0)}
									error={logsQuery.isError ? (logsQuery.error?.data?.message || logsQuery.error?.message || t('teachers.profile.audit.loadFailed', { defaultValue: 'Failed to load audit history' })) : null}
									meta={logsQuery.data?.meta || { page, limit, total: 0, totalPages: 1 }}
									onPage={setPage}
									onLimit={(v) => {
										setLimit(v);
										setPage(1);
									}}
									storageKey="teachers:profile:auditLogs:columns:v2"
									emptyTitle={t('teachers.profile.audit.emptyTitle', { defaultValue: 'No audit history.' })}
									emptyDescription={t('teachers.profile.audit.emptyDescription', { defaultValue: 'No actions have been recorded yet.' })}
								/>
							</div>
						</div>
					</div>
				) : null}

				
			</div>
		</Card>
	);
}

