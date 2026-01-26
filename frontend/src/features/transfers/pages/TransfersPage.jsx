import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import DataToolbar from '../../../shared/components/DataToolbar/DataToolbar.jsx';
import SearchInput from '../../../shared/components/DataToolbar/SearchInput.jsx';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import AcademicYearSelect from '../../lookups/components/AcademicYearSelect';
import GradeSelect from '../../lookups/components/GradeSelect';
import ShiftSelect from '../../lookups/components/ShiftSelect';
import GradeSectionSelect from '../../lookups/components/GradeSectionSelect';

import Modal from '../../../shared/components/ui/Modal.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import Card from '../../../shared/components/ui/Card.jsx';
import Spinner from '../../../shared/components/feedback/Spinner.jsx';
import { useClientSort } from '../../../shared/hooks/useClientSort';

import { listTransferCandidates, performTransfer, listTransferLogs } from '../api/transfers';
import { getStudentProfile } from '../../students/api/studentsApi';

import TransfersCandidatesTable from '../components/TransfersCandidatesTable.jsx';
import TransfersLogsTable from '../components/TransfersLogsTable.jsx';

export default function TransfersPage() {
	// Filters
	const [search, setSearch] = useState('');
	const [ay, setAy] = useState('');
	const [grade, setGrade] = useState('');
	const [shift, setShift] = useState('');
	const [section, setSection] = useState('');
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);

	// Data
	const [loading, setLoading] = useState(false);
	const [rows, setRows] = useState([]);
	const [meta, setMeta] = useState({ page: 1, totalPages: 1, limit: 10, total: 0 });

	// Logs state (global)
	const [logsLoading, setLogsLoading] = useState(false);
	const [logs, setLogs] = useState([]);
	const [logsMeta, setLogsMeta] = useState({ page: 1, totalPages: 1, limit: 10, total: 0 });
	const [logsPage, setLogsPage] = useState(1);
	const [logsLimit, setLogsLimit] = useState(10);
	const [logsSearch, setLogsSearch] = useState('');

	// Modal state
	const [isOpen, setIsOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [selected, setSelected] = useState(null);
	const [selAy, setSelAy] = useState('');
	const [selGrade, setSelGrade] = useState('');
	const [selShift, setSelShift] = useState('');
	const [selSection, setSelSection] = useState('');
	const [modalLoading, setModalLoading] = useState(false);
	const [openingId, setOpeningId] = useState(null);

	// Recent transfers (session only) for quick Return
	const [recent, setRecent] = useState([]);
	// Holds the student's previous (current before transfer) enrollment ids and display
	const prevInfoRef = useRef({}); // { academicYearId, gradeSectionId, label }

	const params = useMemo(() => ({
		search,
		page,
		limit,
		academicYear: ay,
		grade,
		shift,
		gradeSectionId: section,
	}), [search, page, limit, ay, grade, shift, section]);

	const candidatesCoreApplied = Boolean(ay || grade || shift || search);

	const load = async () => {
		// Gating: ha soo jiidin wax rows ilaa ugu yaraan mid ka mid ah filters (AY / Grade / Shift / Search) la doorto
		const coreApplied = !!(params.academicYear || params.grade || params.shift || params.search);
		if (!coreApplied) {
			setLoading(false);
			setRows([]);
			setMeta({ page: 1, limit, total: 0, totalPages: 1 });
			return;
		}

		setLoading(true);
		try {
			const res = await listTransferCandidates(params);
			setRows(res.data || []);
			setMeta(res.meta || { page: 1, totalPages: 1, limit, total: 0 });
		} catch (e) {
			console.error(e);
			toast.error('Failed to load candidates');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void load();
	}, [params.limit, params.page, params.academicYear, params.grade, params.shift, params.gradeSectionId, params.search]);

	const {
		sortBy: candSortBy,
		sortDir: candSortDir,
		onSort: onCandSort,
		sortedRows: sortedCandidates,
	} = useClientSort(rows, {
		initialSortBy: 'fullName',
		initialSortDir: 'asc',
		getValue: (st, field) => {
			const le = st?.latestEnrollment || {};
			const ayVal = st?.academicYear || le?.academicYear?.yearName || '';
			const gradeVal = st?.grade || le?.grade?.gradeName || le?.gradeSection?.grade?.gradeName || '';
			const sectionVal = st?.section ?? le?.gradeSection?.section ?? null;
			const shiftVal = st?.shift || le?.shift?.shiftName || le?.gradeSection?.shift?.shiftName || '';

			switch (field) {
				case 'studentId':
					return String(st?.studentId || '').toLowerCase();
				case 'fullName':
					return String(st?.fullName || '').toLowerCase();
				case 'academicYear':
					return String(ayVal || '').toLowerCase();
				case 'grade':
					return String(gradeVal || '').toLowerCase();
				case 'section':
					return sectionVal == null ? -1 : Number(sectionVal);
				case 'shift':
					return String(shiftVal || '').toLowerCase();
				default:
					return '';
			}
		},
	});

	const loadLogs = async () => {
		setLogsLoading(true);
		try {
			const res = await listTransferLogs({ page: logsPage, limit: logsLimit, search: logsSearch });
			setLogs(res.data || []);
			setLogsMeta(res.meta || { page: 1, totalPages: 1, limit: logsLimit, total: 0 });
		} catch (e) {
			console.error(e);
			toast.error('Failed to load transfers log');
		} finally {
			setLogsLoading(false);
		}
	};

	useEffect(() => {
		void loadLogs();
	}, [logsPage, logsLimit, logsSearch]);

	const {
		sortBy: logsSortBy,
		sortDir: logsSortDir,
		onSort: onLogsSort,
		sortedRows: sortedLogs,
	} = useClientSort(logs, {
		initialSortBy: 'date',
		initialSortDir: 'desc',
		getValue: (l, field) => {
			const dateTs = l?.date ? new Date(l.date).getTime() : 0;
			const studentIdVal = l?.student?.studentId || '';
			const studentNameVal = l?.student?.fullName || '';
			const fromLbl = [l?.from?.grade, (l?.from?.section != null ? `Sec ${l.from.section}` : null), (l?.from?.shift ? `(${l.from.shift})` : null)]
				.filter(Boolean)
				.join(' ');
			const toLbl = [l?.to?.grade, (l?.to?.section != null ? `Sec ${l.to.section}` : null), (l?.to?.shift ? `(${l.to.shift})` : null)]
				.filter(Boolean)
				.join(' ');
			const typeVal = l?.revertOf ? 'Revert' : 'Transfer';

			switch (field) {
				case 'date':
					return dateTs;
				case 'student':
					return `${studentNameVal} ${studentIdVal}`.toLowerCase();
				case 'from':
					return String(fromLbl || '').toLowerCase();
				case 'to':
					return String(toLbl || '').toLowerCase();
				case 'type':
					return String(typeVal || '').toLowerCase();
				case 'reason':
					return String(l?.reason || '').toLowerCase();
				default:
					return '';
			}
		},
	});

	const onReset = () => {
		setSearch('');
		setAy('');
		setGrade('');
		setShift('');
		setSection('');
		setPage(1);
		setLimit(10);
	};

	const openModal = async (st) => {
		setOpeningId(st._id);
		setModalLoading(true);
		setSelected(st);
		setSelAy('');
		setSelGrade('');
		setSelShift('');
		setSelSection('');
		setIsOpen(true);
		try {
			// Fetch full profile to get accurate latestEnrollment (ids + labels for prev)
			const prof = await getStudentProfile(st._id);
			const le = prof?.latestEnrollment || {};
			const ayId = le.academicYear?._id || '';
			const gradeId = le.gradeSection?.grade?._id || le.grade?._id || '';
			const shiftId = le.gradeSection?.shift?._id || le.shift?._id || '';
			setSelAy(ayId);
			setSelGrade(gradeId);
			setSelShift(shiftId);
			setSelSection('');
			// Build previous label for display
			const labelParts = [];
			const gName = le.gradeSection?.grade?.gradeName || le.grade?.gradeName || '';
			const sec = le.gradeSection?.section;
			const shName = le.gradeSection?.shift?.shiftName || le.shift?.shiftName || '';
			const ayName = le.academicYear?.yearName || '';
			if (gName) labelParts.push(gName);
			if (sec != null) labelParts.push(`Sec ${sec}`);
			const tail = [ayName, shName].filter(Boolean).join(' - ');
			if (tail) labelParts.push(`(${tail})`);
			prevInfoRef.current = {
				academicYearId: ayId,
				gradeSectionId: le.gradeSection?._id || '',
				label: labelParts.filter(Boolean).join(' '),
			};
		} catch (e) {
			console.error('Open transfer failed', e);
			toast.error('Failed to open transfer');
			setIsOpen(false);
		} finally {
			setModalLoading(false);
			setOpeningId(null);
		}
	};

	useEffect(() => {
		if (isOpen && (!selAy || !selGrade || !selShift)) {
			setSelSection('');
		}
	}, [selAy, selGrade, selShift, isOpen]);

	const submit = async () => {
		if (!selected || !selAy || !selGrade || !selShift || !selSection) {
			toast.error('Please select Year, Grade, Shift and Section');
			return;
		}
		try {
			setBusy(true);
			const { ok, data, status } = await performTransfer(selected._id, { academicYearId: selAy, gradeSectionId: selSection });
			if (!ok) {
				toast.error(data?.message || `Failed to transfer (status ${status})`);
				return;
			}
			const msg = (data?.message || '').toString();
			if (/no\s+changes/i.test(msg)) toast.success('No changes: already in this section');
			else toast.success('Enrollment transferred');

			// Record recent transfer for quick Return
			const prev = prevInfoRef.current || {};
			setRecent((list) => [
				{
					ts: Date.now(),
					studentId: selected._id,
					fullName: selected.fullName,
					from: { academicYearId: prev.academicYearId, gradeSectionId: prev.gradeSectionId, label: prev.label || 'Previous section' },
					to: { academicYearId: selAy, gradeSectionId: selSection },
				},
				...list,
			].slice(0, 10));

			setIsOpen(false);
			setSelected(null);
			setSelAy('');
			setSelGrade('');
			setSelShift('');
			setSelSection('');
			await load();
			await loadLogs();
		} catch (e) {
			console.error(e);
			toast.error('Network or server error');
		} finally {
			setBusy(false);
		}
	};

	const handleReturn = async (item) => {
		try {
			const { ok, data, status } = await performTransfer(item.studentId, {
				academicYearId: item.from.academicYearId,
				gradeSectionId: item.from.gradeSectionId,
			});
			if (!ok) {
				toast.error(data?.message || `Failed to return (status ${status})`);
				return;
			}
			toast.success('Returned to previous');
			setRecent((list) => list.filter((x) => !(x.studentId === item.studentId && x.ts === item.ts)));
			await load();
			await loadLogs();
		} catch (e) {
			console.error(e);
			toast.error('Network or server error');
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-800">Transfers</h1>
				<p className="mt-1 text-sm text-gray-600">Search and transfer active students. Forward to any future AY; returns are controlled.</p>
			</div>

			<DataToolbar
				searchSlot={<SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name or ID" />}
				filtersSlot={(
					<FilterRow>
						<FilterItem grow minWidthClass="min-w-[140px]">
							<AcademicYearSelect
								placeholder="Academic Year"
								value={ay}
								onChange={(v) => { setAy(v); setPage(1); }}
								searchable
								maxVisible={5}
								searchPlaceholder="Search academic years…"
							/>
						</FilterItem>

						<FilterItem grow minWidthClass="min-w-[120px]">
							<GradeSelect placeholder="Grade" value={grade} onChange={(v) => { setGrade(v); setPage(1); }} />
						</FilterItem>

						<FilterItem grow minWidthClass="min-w-[120px]">
							<ShiftSelect
								placeholder="Shift"
								value={shift}
								onChange={(v) => { setShift(v); setPage(1); }}
								searchable
								maxVisible={5}
								searchPlaceholder="Search shifts…"
							/>
						</FilterItem>

						<FilterItem grow minWidthClass="min-w-[160px]">
							<GradeSectionSelect
								gradeId={grade}
								shiftId={shift}
								value={section}
								onChange={(v) => { setSection(v); setPage(1); }}
								placeholder="Section"
								searchable
								maxVisible={5}
								searchPlaceholder="Search sections…"
							/>
						</FilterItem>
					</FilterRow>
				)}
				onReset={onReset}
			/>

			<Card className="overflow-hidden">
				<TransfersCandidatesTable
					items={rows}
					rows={sortedCandidates}
					meta={meta}
					isLoading={candidatesCoreApplied && loading && rows.length === 0}
					openingId={openingId}
					candidatesCoreApplied={candidatesCoreApplied}
					sortBy={candSortBy}
					sortDir={candSortDir}
					onSort={onCandSort}
					onOpen={openModal}
					onPage={setPage}
					onLimit={(v) => { setLimit(v); setPage(1); }}
				/>
			</Card>

			{recent.length > 0 ? (
				<Card className="p-4">
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-lg font-semibold text-gray-800">Recent transfers (session)</h2>
						<button type="button" className="text-xs text-gray-600 underline" onClick={() => setRecent([])}>
							Clear
						</button>
					</div>
					<div className="space-y-2">
						{recent.map((r) => (
							<div key={r.ts} className="flex items-center justify-between gap-3 border rounded p-3">
								<div className="min-w-0">
									<div className="text-sm font-medium text-gray-800 truncate">{r.fullName || 'Student'}</div>
									<div className="text-xs text-gray-600 truncate">From: {r.from?.label || 'Previous section'}</div>
								</div>
								<ActionButton variant="warning" title="Return" onClick={() => handleReturn(r)}>
									Return
								</ActionButton>
							</div>
						))}
					</div>
					<div className="mt-2 text-[11px] text-gray-500">Recent transfers are kept only during this page session.</div>
				</Card>
			) : null}

			<Card className="p-4">
				<div className="flex items-center justify-between mb-3">
					<h2 className="text-lg font-semibold text-gray-800">All Transfers</h2>
					<div className="w-full max-w-xs">
						<SearchInput value={logsSearch} onChange={(v) => { setLogsSearch(v); setLogsPage(1); }} placeholder="Search by name or ID..." />
					</div>
				</div>

				<TransfersLogsTable
					items={logs}
					rows={sortedLogs}
					meta={logsMeta}
					isLoading={logsLoading && logs.length === 0}
					sortBy={logsSortBy}
					sortDir={logsSortDir}
					onSort={onLogsSort}
					onPage={setLogsPage}
					onLimit={(v) => { setLogsLimit(v); setLogsPage(1); }}
				/>
			</Card>

			<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`Transfer Section${selected ? `: ${selected.fullName}` : ''}`}>
				<div className="space-y-4">
					{modalLoading ? (
						<div className="py-6 text-sm text-gray-600 flex items-center gap-2">
							<Spinner size={18} />
							<span>Loading current enrollment…</span>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
								<AcademicYearSelect placeholder="-- Select Academic Year --" value={selAy} onChange={(v) => { setSelAy(v); setSelSection(''); }} className="w-full" disabled={modalLoading || busy} />
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
								<GradeSelect placeholder="-- Select Grade --" value={selGrade} onChange={(v) => { setSelGrade(v); setSelSection(''); }} className="w-full" disabled={modalLoading || busy} />
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">Shift</label>
								<ShiftSelect placeholder="-- Select Shift --" value={selShift} onChange={(v) => { setSelShift(v); setSelSection(''); }} className="w-full" disabled={modalLoading || busy} />
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
								<GradeSectionSelect academicYearId={selAy} gradeId={selGrade} shiftId={selShift} value={selSection} onChange={(v) => setSelSection(v)} className="w-full" disabled={modalLoading || busy} />
							</div>
						</div>
					)}
					<div className="flex justify-between text-[11px] text-gray-500">
						<div>Forward allowed to any future AY. Returns must match previous section.</div>
						<div>No scores migrate across AY.</div>
					</div>
					<div className="flex justify-end gap-2">
						<ActionButton variant="neutral" onClick={() => setIsOpen(false)} disabled={busy || modalLoading}>Cancel</ActionButton>
						<ActionButton variant="brand" disabled={busy || modalLoading || !selSection} onClick={submit} className="inline-flex items-center gap-2">
							{busy ? (
								<>
									<Spinner size={16} color="#fff" />
									<span>Transferring…</span>
								</>
							) : (
								modalLoading ? (
									<>
										<Spinner size={16} color="#fff" />
										<span>Loading…</span>
									</>
								) : (
									'Confirm Transfer'
								)
							)}
						</ActionButton>
					</div>
				</div>
			</Modal>
		</div>
	);
}
