import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import DataToolbar from '../components/common/DataToolbar/DataToolbar';
import SearchInput from '../components/common/DataToolbar/SearchInput';
import AcademicYearSelect from '../components/lookups/AcademicYearSelect';
import GradeSelect from '../components/lookups/GradeSelect';
import ShiftSelect from '../components/lookups/ShiftSelect';
import GradeSectionSelect from '../components/lookups/GradeSectionSelect';
import Modal from '../components/common/Modal';
import ActionButton from '../components/common/ActionButton';
import PaginationControls from '../components/common/Pagination/PaginationControls';
import LoadingState from '../components/common/Feedback/LoadingState';
import EmptyState from '../components/common/Feedback/EmptyState';
import { listTransferCandidates, performTransfer, getStudentProfile, listTransferLogs } from '../api';
import Spinner from '../components/common/Feedback/Spinner';
import { useAuth } from '../contexts/AuthContext';

function CandidateTable({ rows = [], onTransfer, openingId, canTransfer }) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-800">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Student ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Full Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Academic Year</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Grade</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Section</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Shift</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-100">
        {rows.map(st => {
          const le = st.latestEnrollment || {};
          const ay = st.academicYear || le.academicYear?.yearName || '';
          const grade = st.grade || le.grade?.gradeName || le.gradeSection?.grade?.gradeName || '';
          const section = st.section ?? le.gradeSection?.section ?? null;
          const shift = st.shift || le.shift?.shiftName || le.gradeSection?.shift?.shiftName || '';
          return (
            <tr key={st._id}>
              <td className="px-6 py-3 text-sm text-gray-800 border-x">{st.studentId || '-'}</td>
              <td className="px-6 py-3 text-sm text-gray-800 border-x">{st.fullName || '-'}</td>
              <td className="px-6 py-3 text-sm text-gray-600 border-x">{ay || '-'}</td>
              <td className="px-6 py-3 text-sm text-gray-600 border-x">{grade || '-'}</td>
              <td className="px-6 py-3 text-sm text-gray-600 border-x">{section != null ? `Sec ${section}` : '-'}</td>
              <td className="px-6 py-3 text-sm text-gray-600 border-x">{shift || '-'}</td>
              <td className="px-6 py-3 text-sm text-gray-800 border-x">
                {canTransfer ? (
                  <ActionButton variant="info" title="Transfer Section" onClick={() => onTransfer(st)} disabled={openingId === st._id}>
                    {openingId === st._id ? (
                      <>
                        <Spinner size={14} color="currentColor" />
                        <span>Opening…</span>
                      </>
                    ) : 'Transfer'}
                  </ActionButton>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function TransfersPage() {
  const { hasPermission } = useAuth();
  const canViewTransfers =
    hasPermission('transfers', 'view')
    || hasPermission('transfers', 'transfer')
    // Backward compatibility
    || hasPermission('students', 'transfer');

  const canTransfer =
    hasPermission('transfers', 'transfer')
    // Backward compatibility
    || hasPermission('students', 'transfer');

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

  const load = async () => {
    if (!canViewTransfers) {
      setRows([]);
      setMeta({ page: 1, limit, total: 0, totalPages: 1 });
      return;
    }
    setLoading(true);
    try {
      // Gating: ha soo jiidin wax rows ilaa ugu yaraan mid ka mid ah filters (AY / Grade / Shift / Search) la doorto
      const coreApplied = !!(params.academicYear || params.grade || params.shift || params.search);
      if (!coreApplied) {
        setRows([]);
        setMeta({ page: 1, limit, total: 0, totalPages: 1 });
        return;
      }
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

  useEffect(() => { load(); }, [canViewTransfers, params.limit, params.page, params.academicYear, params.grade, params.shift, params.gradeSectionId, params.search]);

  const loadLogs = async () => {
    if (!canViewTransfers) {
      setLogs([]);
      setLogsMeta({ page: 1, totalPages: 1, limit: logsLimit, total: 0 });
      return;
    }
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

  useEffect(() => { loadLogs(); }, [canViewTransfers, logsPage, logsLimit, logsSearch]);

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
    if (!canTransfer) {
      toast.error("You don’t have permission to transfer students");
      return;
    }
    setOpeningId(st._id);
    setModalLoading(true);
    setSelected(st);
    setSelAy(''); setSelGrade(''); setSelShift(''); setSelSection('');
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
        label: labelParts.filter(Boolean).join(' ')
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
    if (!canTransfer) {
      toast.error("You don’t have permission to transfer students");
      return;
    }
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
      setRecent(list => [
        {
          ts: Date.now(),
          studentId: selected._id,
          fullName: selected.fullName,
          from: { academicYearId: prev.academicYearId, gradeSectionId: prev.gradeSectionId, label: prev.label || 'Previous section' },
          to: { academicYearId: selAy, gradeSectionId: selSection }
        },
        ...list
      ].slice(0, 10));
      setIsOpen(false);
      setSelected(null);
      setSelAy(''); setSelGrade(''); setSelShift(''); setSelSection('');
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
    if (!canTransfer) {
      toast.error("You don’t have permission to transfer students");
      return;
    }
    try {
      const { ok, data, status } = await performTransfer(item.studentId, {
        academicYearId: item.from.academicYearId,
        gradeSectionId: item.from.gradeSectionId
      });
      if (!ok) {
        toast.error(data?.message || `Failed to return (status ${status})`);
        return;
      }
      toast.success('Returned to previous');
      setRecent(list => list.filter(x => !(x.studentId === item.studentId && x.ts === item.ts)));
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

      {/* Candidates section remains above */}

      <DataToolbar
        searchSlot={<SearchInput value={search} onChange={(v)=>{ setSearch(v); setPage(1); }} placeholder="Search by name or ID" />}
        filtersSlot={(
          <>
            <AcademicYearSelect placeholder="Academic Year" value={ay} onChange={(v)=>{ setAy(v); setPage(1); }} className="flex-1 min-w-35" />
            <GradeSelect placeholder="Grade" value={grade} onChange={(v)=>{ setGrade(v); setPage(1); }} className="flex-1 min-w-30" />
            <ShiftSelect placeholder="Shift" value={shift} onChange={(v)=>{ setShift(v); setPage(1); }} className="flex-1 min-w-30" />
            <GradeSectionSelect gradeId={grade} shiftId={shift} value={section} onChange={(v)=>{ setSection(v); setPage(1); }} className="flex-1 min-w-40" placeholder="Section" />
          </>
        )}
        onReset={onReset}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <LoadingState variant="table" message="Loading candidates..." rows={6} columns={8} />
        ) : rows.length === 0 ? (
          (ay || grade || shift || search)
            ? <EmptyState title="No candidates found" description="Try adjusting filters or search keyword." />
            : <EmptyState title="Select filters to begin" description="Choose Academic Year, Grade or Shift to load candidates." />
        ) : (
          <CandidateTable rows={rows} onTransfer={openModal} openingId={openingId} canTransfer={canTransfer} />
        )}
      </div>

      <PaginationControls
        page={meta.page || 1}
        totalPages={meta.totalPages || 1}
        limit={meta.limit || limit}
        onPage={setPage}
        onLimit={(v)=>{ setLimit(v); setPage(1); }}
      />

      {/* All Transfers (from DB) */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">All Transfers</h2>
          <div className="w-full max-w-xs">
            <SearchInput value={logsSearch} onChange={(v)=>{ setLogsSearch(v); setLogsPage(1); }} placeholder="Search by name or ID..." />
          </div>
        </div>
        {logsLoading ? (
          <LoadingState variant="table" message="Loading transfers..." rows={6} columns={6} />
        ) : logs.length === 0 ? (
          <EmptyState title="No transfers found" description="Transfers will appear here when recorded." />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Reason</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {logs.map(l => {
                const dateStr = l.date ? new Date(l.date).toLocaleString() : '';
                const fromLbl = [l.from?.grade, (l.from?.section != null ? `Sec ${l.from.section}` : null), (l.from?.shift ? `(${l.from.shift})` : null)].filter(Boolean).join(' ');
                const toLbl = [l.to?.grade, (l.to?.section != null ? `Sec ${l.to.section}` : null), (l.to?.shift ? `(${l.to.shift})` : null)].filter(Boolean).join(' ');
                const type = l.revertOf ? 'Revert' : 'Transfer';
                return (
                  <tr key={l._id}>
                    <td className="px-6 py-3 text-sm text-gray-600 border-x">{dateStr}</td>
                    <td className="px-6 py-3 text-sm text-gray-800 border-x">{l.student?.fullName || '-'} <span className="text-gray-500">({l.student?.studentId || ''})</span></td>
                    <td className="px-6 py-3 text-sm text-gray-700 border-x">{fromLbl || '-'}</td>
                    <td className="px-6 py-3 text-sm text-gray-700 border-x">{toLbl || '-'}</td>
                    <td className="px-6 py-3 text-sm text-gray-700 border-x">{type}</td>
                    <td className="px-6 py-3 text-sm text-gray-500 border-x">{l.reason || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="mt-3">
          <PaginationControls
            page={logsMeta.page || 1}
            totalPages={logsMeta.totalPages || 1}
            limit={logsMeta.limit || logsLimit}
            onPage={setLogsPage}
            onLimit={(v)=>{ setLogsLimit(v); setLogsPage(1); }}
          />
        </div>
      </div>

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
              <AcademicYearSelect placeholder="-- Select Academic Year --" value={selAy} onChange={(v)=> { setSelAy(v); setSelSection(''); }} className="w-full" disabled={modalLoading || busy} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
              <GradeSelect placeholder="-- Select Grade --" value={selGrade} onChange={(v)=> { setSelGrade(v); setSelSection(''); }} className="w-full" disabled={modalLoading || busy} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Shift</label>
              <ShiftSelect placeholder="-- Select Shift --" value={selShift} onChange={(v)=> { setSelShift(v); setSelSection(''); }} className="w-full" disabled={modalLoading || busy} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
              <GradeSectionSelect academicYearId={selAy} gradeId={selGrade} shiftId={selShift} value={selSection} onChange={(v)=> setSelSection(v)} className="w-full" disabled={modalLoading || busy} />
            </div>
          </div>
          )}
          <div className="flex justify-between text-[11px] text-gray-500">
            <div>Forward allowed to any future AY. Returns must match previous section.</div>
            <div>No scores migrate across AY.</div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={()=> setIsOpen(false)} className="px-3 py-2 text-sm rounded border">Cancel</button>
            <button disabled={busy || modalLoading || !selSection} onClick={submit} className="px-3 py-2 text-sm rounded bg-blue-600 text-white disabled:opacity-50 inline-flex items-center gap-2">
              {busy ? (<><Spinner size={16} color="#fff" /><span>Transferring…</span></>) : (modalLoading ? (<><Spinner size={16} color="#fff" /><span>Loading…</span></>) : 'Confirm Transfer')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
