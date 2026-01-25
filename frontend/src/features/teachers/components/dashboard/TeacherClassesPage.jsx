import React, { useMemo, useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { listStudents } from '../../../../api';
import Modal from '../../../../shared/components/ui/Modal.jsx';
import TableShell from '../../../../shared/components/table/TableShell.jsx';
import { useAuth } from '../../../../auth/AuthContext';
import { getAssignments as getTeacherAssignments } from '../../api/teachersApi';
import { teacherKeys } from '../../queryKeys';

const CARD_THEMES = [
	{ header: 'bg-gradient-to-r from-blue-600 to-indigo-600' },
	{ header: 'bg-gradient-to-r from-emerald-600 to-teal-600' },
	{ header: 'bg-gradient-to-r from-purple-600 to-fuchsia-600' },
	{ header: 'bg-gradient-to-r from-amber-600 to-orange-600' },
	{ header: 'bg-gradient-to-r from-sky-600 to-blue-600' },
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

const buildSectionLabel = (gs) => {
	if (!gs) return '';
	const gradeName = titleCaseWords(gs?.grade?.gradeName);
	const sectionNum = gs?.section;
	const shiftName = titleCaseWords(gs?.shift?.shiftName);
	return [gradeName || null, sectionNum ? `Sec ${sectionNum}` : null, shiftName || null]
		.filter(Boolean)
		.join(' • ');
};

export default function TeacherClassesPage() {
	const { auth } = useAuth();
	const teacherRef = String(auth?.user?.teacherRef || '');

	const [rosterUi, setRosterUi] = useState({ isOpen: false, sectionId: '', label: '' });
	const assignmentsQuery = useQuery({
		queryKey: teacherKeys.assignments(teacherRef),
		enabled: Boolean(teacherRef),
		queryFn: async ({ signal }) => {
			const res = await getTeacherAssignments(teacherRef, {}, { signal });
			return Array.isArray(res?.data) ? res.data : [];
		},
		placeholderData: (prev) => prev,
	});

	const teacherAssignments = assignmentsQuery.data || [];

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
				error: q?.isError ? 'Failed' : '',
			};
		}
		return out;
	}, [sections, countQueries]);

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
	});

	const students = rosterQuery.data || [];
	const loadingStudents = Boolean(rosterQuery.isLoading && rosterQuery.data == null);
	const studentsError = rosterQuery.isError ? 'Failed to load roster' : '';

	const cards = useMemo(() => {
		const list = Array.isArray(sections) ? sections : [];
		return list
			.map((gs) => ({
				id: String(gs?._id || ''),
				label: buildSectionLabel(gs) || 'Class',
				raw: gs,
			}))
			.filter((x) => x.id);
	}, [sections]);

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
			<div className="rounded-2xl border border-blue-200/80 bg-white shadow-md p-4">
				<div className="text-lg font-semibold text-gray-900">My Classes</div>
				<div className="text-sm text-gray-600 mt-0.5">View active students for your assigned classes.</div>
			</div>

			{assignmentsQuery.isLoading && cards.length === 0 ? (
				<div className="text-sm text-gray-600">Loading classes…</div>
			) : assignmentsQuery.isError ? (
				<div className="text-sm text-red-600">Failed to load classes</div>
			) : cards.length === 0 ? (
				<div className="text-sm text-gray-600">No assigned classes.</div>
			) : (
				<div className="w-full">
					<div className={`grid ${gridColsClass} gap-4 items-stretch`}>
						{cards.map((c, idx) => {
							const info = countsBySectionId?.[c.id] || { loading: false, total: 0, error: '' };
							const countText = info.loading
								? 'Checking students…'
								: info.error
									? 'Students unavailable'
									: info.total > 0
										? `${info.total} active students`
										: 'No active students';

							const theme = CARD_THEMES[idx % CARD_THEMES.length];

							return (
								<button
									key={c.id}
									type="button"
									onClick={() => setRosterUi({ isOpen: true, sectionId: c.id, label: c.label })}
									className={
										'group text-left w-full rounded-2xl border border-blue-200/80 bg-white shadow-lg overflow-hidden flex flex-col min-h-96 ' +
										'hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 transition-all duration-200'
									}
								>
									<div className={`p-4 ${theme.header}`}>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<div className="text-base font-semibold text-white leading-snug tracking-tight truncate">{c.label}</div>
												<div className="text-xs text-white/85 mt-1">Tap to view students</div>
											</div>
										</div>
									</div>

									<div className="p-4 flex-1">
										<div className="rounded-xl border border-gray-200/70 bg-gray-50 p-4">
											<div className="text-sm font-semibold text-gray-900">Students</div>
											<div className="text-sm text-gray-600 mt-1">{countText}</div>
										</div>
									</div>

									<div className="px-4 pb-4">
										<div className="w-full text-center px-4 py-3 rounded-xl bg-(--nb-color-brand) text-white font-semibold shadow-sm group-hover:opacity-95 transition-colors">
											View Students
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
						<div className="text-xs uppercase tracking-wide text-white/90">Active Roster</div>
						<div className="text-base font-semibold text-white leading-snug mt-0.5">
							{rosterUi?.label || 'Class'}
						</div>
					</div>
				)}
			>
				{loadingStudents ? (
					<div className="text-sm text-gray-600">Loading roster…</div>
				) : (studentsError ? (
					<div className="text-sm text-red-600">{studentsError}</div>
				) : ((students || []).length === 0 ? (
					<div className="text-sm text-gray-600">No active students found.</div>
				) : (
					<div className="max-h-[65vh] overflow-auto">
						<TableShell>
							<thead>
								<tr className="bg-black text-white">
									<th className="text-left px-3 py-2">Student ID</th>
									<th className="text-left px-3 py-2">Full Name</th>
									<th className="text-left px-3 py-2">Gender</th>
								</tr>
							</thead>
							<tbody>
								{students.map((st) => (
									<tr key={st?._id || st?.studentId} className="border-t">
										<td className="px-3 py-2 text-sm text-gray-700">{st?.studentId || '—'}</td>
										<td className="px-3 py-2 text-sm text-gray-900">{st?.fullName || '—'}</td>
										<td className="px-3 py-2 text-sm text-gray-700">{st?.gender || '—'}</td>
									</tr>
								))}
							</tbody>
						</TableShell>
					</div>
				))) }
			</Modal>
		</div>
	);
}

