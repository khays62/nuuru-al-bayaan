import React, { useMemo, useState } from 'react';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { listStudents } from '../../../../api';
import Modal from '../../../../shared/components/ui/Modal.jsx';
import StandardTable from '../../../../shared/components/table/StandardTable.jsx';
import { useAuth } from '../../../../auth/AuthContext';
import { getAssignments as getTeacherAssignments } from '../../api/teachersApi';
import { teacherKeys } from '../../queryKeys';
import { EVENTS } from '../../../../utils/events';
import { useRealtimeInvalidation } from '../../../../shared/realtime/useRealtimeInvalidation';
import { useI18n } from '../../../../i18n/useI18n';

const CARD_THEMES = [
	{ header: 'bg-gradient-to-r from-(--nb-color-brand) to-(--nb-color-accent)' },
	{ header: 'bg-gradient-to-r from-(--nb-color-brand) to-(--nb-color-accent)' },
	{ header: 'bg-gradient-to-r from-(--nb-color-brand) to-(--nb-color-accent)' },
	{ header: 'bg-gradient-to-r from-(--nb-color-brand) to-(--nb-color-accent)' },
	{ header: 'bg-gradient-to-r from-(--nb-color-brand) to-(--nb-color-accent)' },
];

const themeIndexForKey = (key) => {
	const s = String(key || '');
	let hash = 0;
	for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
	return CARD_THEMES.length ? (hash % CARD_THEMES.length) : 0;
};

const titleCaseWords = (value) => {
	const s = String(value || '').trim();
	if (!s) return '';
	return s
		.split(/\s+/)
		.map((w) => {
			const word = String(w || '');
			if (!word) return '';
			const isAllCaps = word.toUpperCase() === word;
			const hasDigit = /\d/.test(word);
			if (isAllCaps || hasDigit) return word;
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		})
		.filter(Boolean)
		.join(' ');
};

const buildSectionLabel = (gs, { sectionPrefix = 'Sec' } = {}) => {
	if (!gs) return '';
	const gradeName = titleCaseWords(gs?.grade?.gradeName);
	const sectionNum = gs?.section;
	const shiftName = titleCaseWords(gs?.shift?.shiftName);
	return [gradeName || null, sectionNum ? `${sectionPrefix} ${sectionNum}` : null, shiftName || null]
		.filter(Boolean)
		.join(' - ');
};

export default function TeacherClassesPage() {
	const { auth } = useAuth();
	const { t } = useI18n();
	const teacherRef = String(auth?.user?.teacherRef || '');
	const queryClient = useQueryClient();

	const sectionPrefix = t('teachers.dashboard.classes.sectionPrefix', { defaultValue: 'Sec' });
	const classFallback = t('teachers.dashboard.classes.classFallback', { defaultValue: 'Class' });

	const [rosterUi, setRosterUi] = useState({ isOpen: false, sectionId: '', label: '' });
	const assignmentsQuery = useQuery({
		queryKey: teacherKeys.assignments(teacherRef),
		enabled: Boolean(teacherRef),
		queryFn: async ({ signal }) => {
			const res = await getTeacherAssignments(teacherRef, {}, { signal });
			return Array.isArray(res?.data) ? res.data : [];
		},
		placeholderData: (prev) => prev,
		staleTime: 15_000,
		refetchOnWindowFocus: false,
	});

	// Live refresh: keep My Classes in sync (assignments + rosters).
	useRealtimeInvalidation(
		[
			EVENTS.TEACHERS_CHANGED,
			EVENTS.STUDENTS_CHANGED,
			EVENTS.TRANSFERS_CHANGED,
			EVENTS.PROMOTIONS_CHANGED,
		],
		() => {
			if (!teacherRef) return;
			try {
				queryClient.invalidateQueries({ queryKey: teacherKeys.assignmentsBase, refetchType: 'active' });
				queryClient.invalidateQueries({ queryKey: teacherKeys.studentsCountBase, refetchType: 'active' });
				queryClient.invalidateQueries({ queryKey: teacherKeys.studentsListBase, refetchType: 'active' });
			} catch {
				// ignore
			}
		},
		{ enabled: true }
	);

	const teacherAssignments = useMemo(() => (assignmentsQuery.data || []), [assignmentsQuery.data]);

	const sections = useMemo(() => {
		const unique = [];
		const seen = new Set();
		for (const a of teacherAssignments || []) {
			const gs = a?.gradeSection;
			const id = String(gs?._id || '');
			if (!id || seen.has(id)) continue;
			seen.add(id);
			unique.push(gs);
		}
		return unique;
	}, [teacherAssignments]);

	const countQueries = useQueries({
		queries: (sections || []).map((gs) => {
			const id = String(gs?._id || '');
			return {
				queryKey: teacherKeys.studentsCount({ gradeSectionId: id, enrollmentStatus: 'active' }),
				enabled: Boolean(id),
				queryFn: async ({ signal }) => {
					const r = await listStudents({ gradeSectionId: id, enrollmentStatus: 'active', limit: 1 }, { signal });
					const total = Number(r?.meta?.total ?? 0);
					return Number.isFinite(total) ? total : 0;
				},
				placeholderData: (prev) => prev,
				staleTime: 5 * 60_000,
			};
		}),
	});

	const countsBySectionId = useMemo(() => {
		const out = {};
		for (let i = 0; i < (sections || []).length; i += 1) {
			const id = String(sections[i]?._id || '');
			const q = countQueries[i];
			out[id] = {
				loading: Boolean(q?.isLoading && q?.data == null),
				total: Number(q?.data ?? 0),
				error: q?.isError ? t('teachers.dashboard.classes.countFailed', { defaultValue: 'Failed' }) : '',
			};
		}
		return out;
	}, [sections, countQueries, t]);

	const rosterQuery = useQuery({
		queryKey: teacherKeys.studentsList({
			gradeSectionId: rosterUi?.sectionId,
			enrollmentStatus: 'active',
			limit: 100,
			sortBy: 'fullName',
			sortDir: 'asc',
		}),
		enabled: Boolean(rosterUi?.isOpen && rosterUi?.sectionId),
		queryFn: async ({ signal }) => {
			const res = await listStudents(
				{
					gradeSectionId: rosterUi.sectionId,
					enrollmentStatus: 'active',
					limit: 100,
					sortBy: 'fullName',
					sortDir: 'asc',
				},
				{ signal }
			);
			return Array.isArray(res?.data) ? res.data : [];
		},
		placeholderData: (prev) => prev,
		staleTime: 15_000,
		refetchOnWindowFocus: false,
	});

	const students = rosterQuery.data || [];
	const loadingStudents = Boolean(rosterQuery.isLoading && rosterQuery.data == null);
	const studentsError = rosterQuery.isError ? t('teachers.dashboard.classes.rosterLoadFailed', { defaultValue: 'Failed to load roster' }) : '';

	const cards = useMemo(() => {
		const list = Array.isArray(sections) ? sections : [];
		return list
			.map((gs) => ({
				id: String(gs?._id || ''),
				label: buildSectionLabel(gs, { sectionPrefix }) || classFallback,
				raw: gs,
			}))
			.filter((x) => x.id);
	}, [sections, sectionPrefix, classFallback]);

	const gridColsClass = useMemo(() => {
		const n = cards.length;
		if (n <= 1) return 'grid-cols-1';
		if (n === 2) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2';
		return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
	}, [cards.length]);

	const modalTheme = useMemo(() => {
		const idx = themeIndexForKey(rosterUi?.sectionId);
		return CARD_THEMES[idx] || CARD_THEMES[0];
	}, [rosterUi?.sectionId]);

	return (
		<div className="space-y-4">
			<div className="rounded-2xl border border-(--nb-color-border) bg-(--nb-color-bg-card) shadow-md p-4">
				<div className="text-lg font-semibold text-(--nb-color-fg)">{t('teachers.dashboard.classes.title', { defaultValue: 'My Classes' })}</div>
				<div className="text-sm text-(--nb-color-muted) mt-0.5">{t('teachers.dashboard.classes.subtitle', { defaultValue: 'View active students for your assigned classes.' })}</div>
			</div>

			{assignmentsQuery.isLoading && cards.length === 0 ? (
				<div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.classes.loading', { defaultValue: 'Loading classesâ€¦' })}</div>
			) : assignmentsQuery.isError ? (
				<div className="text-sm text-red-600">{t('teachers.dashboard.classes.loadFailed', { defaultValue: 'Failed to load classes' })}</div>
			) : cards.length === 0 ? (
				<div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.classes.empty', { defaultValue: 'No assigned classes.' })}</div>
			) : (
				<div className="w-full">
					<div className={`grid ${gridColsClass} gap-4 items-stretch`}>
						{cards.map((c, idx) => {
							const info = countsBySectionId?.[c.id] || { loading: false, total: 0, error: '' };
							const countText = info.loading
								? t('teachers.dashboard.classes.checkingStudents', { defaultValue: 'Checking studentsâ€¦' })
								: info.error
									? t('teachers.dashboard.classes.studentsUnavailable', { defaultValue: 'Students unavailable' })
									: info.total > 0
										? t('teachers.dashboard.classes.activeStudentsCount', { defaultValue: '{{count}} active students', count: info.total })
										: t('teachers.dashboard.classes.noActiveStudents', { defaultValue: 'No active students' });

							const theme = CARD_THEMES[idx % CARD_THEMES.length];

							return (
								<button
									key={c.id}
									type="button"
									onClick={() => setRosterUi({ isOpen: true, sectionId: c.id, label: c.label })}
									className={
										'group text-left w-full rounded-2xl border border-(--nb-color-border) bg-(--nb-color-bg-card) shadow-lg overflow-hidden flex flex-col min-h-96 ' +
										'hover:shadow-xl hover:-translate-y-1 hover:border-(--nb-color-accent) transition-all duration-200'
									}
								>
									<div className={`p-4 ${theme.header}`}>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<div className="text-base font-semibold text-white leading-snug tracking-tight truncate">{c.label}</div>
												<div className="text-xs text-white/85 mt-1">{t('teachers.dashboard.classes.tapToViewStudents', { defaultValue: 'Tap to view students' })}</div>
											</div>
										</div>
									</div>

									<div className="p-4 flex-1">
										<div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg) p-4">
											<div className="text-sm font-semibold text-(--nb-color-fg)">{t('teachers.dashboard.classes.studentsCardTitle', { defaultValue: 'Students' })}</div>
											<div className="text-sm text-(--nb-color-muted) mt-1">{countText}</div>
										</div>
									</div>

									<div className="px-4 pb-4">
										<div className="w-full text-center px-4 py-3 rounded-xl bg-(--nb-color-brand) text-white font-semibold shadow-sm group-hover:opacity-95 transition-colors">
											{t('teachers.dashboard.classes.viewStudents', { defaultValue: 'View Students' })}
										</div>
									</div>
								</button>
							);
						})}
					</div>
				</div>
			)}

			<Modal
				isOpen={Boolean(rosterUi?.isOpen)}
				onClose={() => setRosterUi({ isOpen: false, sectionId: '', label: '' })}
				headerClassName={`${modalTheme?.header || ''} border-b-0`}
				closeButtonClassName="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/15 transition-colors"
				title={(
					<div className="flex flex-col">
						<div className="text-xs uppercase tracking-wide text-white/90">{t('teachers.dashboard.classes.activeRoster', { defaultValue: 'Active Roster' })}</div>
						<div className="text-base font-semibold text-white leading-snug mt-0.5">
							{rosterUi?.label || classFallback}
						</div>
					</div>
				)}
			>
				{loadingStudents ? (
					<div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.classes.loadingRoster', { defaultValue: 'Loading rosterâ€¦' })}</div>
				) : (studentsError ? (
					<div className="text-sm text-red-600">{studentsError}</div>
				) : ((students || []).length === 0 ? (
					<div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.classes.noActiveStudentsFound', { defaultValue: 'No active students found.' })}</div>
				) : (
					<div className="max-h-[65vh] overflow-auto">
						<StandardTable
							isLoading={false}
							items={students}
							rows={students}
							emptyTitle={t('teachers.dashboard.classes.noActiveStudentsFound', { defaultValue: 'No active students found.' })}
							columns={[
								{
									key: 'studentId',
									label: t('teachers.dashboard.classes.rosterTable.studentId', { defaultValue: 'Student ID' }),
									thClassName: 'text-left px-3 py-2',
									tdClassName: 'px-3 py-2 text-sm text-(--nb-color-fg)',
								},
								{
									key: 'fullName',
									label: t('teachers.dashboard.classes.rosterTable.fullName', { defaultValue: 'Full Name' }),
									thClassName: 'text-left px-3 py-2',
									tdClassName: 'px-3 py-2 text-sm text-(--nb-color-fg)',
								},
								{
									key: 'gender',
									label: t('teachers.dashboard.classes.rosterTable.gender', { defaultValue: 'Gender' }),
									thClassName: 'text-left px-3 py-2',
									tdClassName: 'px-3 py-2 text-sm text-(--nb-color-fg)',
								},
							]}
							getRowKey={(st) => st?._id || st?.studentId}
							renderCell={(st, col) => {
								switch (col.key) {
									case 'studentId':
										return st?.studentId || '-';
									case 'fullName':
										return st?.fullName || '-';
									case 'gender':
										return st?.gender || '-';
									default:
										return '';
								}
							}}
							tableProps={{
								theadClassName: 'bg-(--nb-color-brand) text-white',
								useDefaultHeaderStyles: false,
								baseRowClassName: 'border-t border-(--nb-color-border)',
							}}
						/>
					</div>
				))) }
			</Modal>
		</div>
	);
}

