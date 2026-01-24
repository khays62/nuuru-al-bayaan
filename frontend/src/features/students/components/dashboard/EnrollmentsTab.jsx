import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Spinner from '../../../../shared/components/feedback/Spinner.jsx';
import EmptyState from '../../../../shared/components/feedback/EmptyState.jsx';
import TableShell from '../../../../shared/components/table/TableShell.jsx';
import { getStudentHistory } from '../../../../api';
import { useAuth } from '../../../../auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { studentKeys } from '../../queryKeys';

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString();
}

function statusClass(status) {
  const s = (status || '').toLowerCase();
  const map = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-700',
    transferred: 'bg-sky-100 text-sky-700',
    promoted: 'bg-indigo-100 text-indigo-700',
    graduated: 'bg-amber-100 text-amber-800',
    withdrawn: 'bg-rose-100 text-rose-700',
  };
  return map[s] || 'bg-gray-100 text-gray-700';
}

export default function EnrollmentsTab() {
  const { studentId: paramStudentId } = useParams();
  const { auth } = useAuth();

  const studentIdFromAuth = useMemo(() => {
    const ref = auth?.user?.studentRef;
    if (!ref) return null;
    if (typeof ref === 'object' && ref._id) return ref._id;
    return ref;
  }, [auth?.user?.studentRef]);

  const studentId = paramStudentId || (auth?.user?.role === 'student' ? (studentIdFromAuth || null) : null);
  const [sort, setSort] = useState({ key: 'joinedAt', dir: 'desc' });

  const historyQuery = useQuery({
    queryKey: studentKeys.history(studentId, { page: 1, limit: 1000 }),
    enabled: !!studentId,
    queryFn: async () => {
      const res = await getStudentHistory(studentId, { page: 1, limit: 1000 });
      return Array.isArray(res?.data) ? res.data : [];
    },
  });

  const items = useMemo(() => {
    const rows = Array.isArray(historyQuery.data) ? historyQuery.data : [];
    const key = String(sort?.key || 'joinedAt');
    const dir = String(sort?.dir || 'desc');
    const mult = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a?.[key];
      const bv = b?.[key];
      // Date-ish comparisons
      const ad = av ? new Date(av).getTime() : 0;
      const bd = bv ? new Date(bv).getTime() : 0;
      if (!Number.isNaN(ad) && !Number.isNaN(bd) && (ad !== bd)) return (ad - bd) * mult;
      return String(av || '').localeCompare(String(bv || '')) * mult;
    });
  }, [historyQuery.data, sort]);

  const loading = historyQuery.isLoading;
  const error = historyQuery.isError ? 'Failed to load history' : null;

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-lg font-medium mb-2">Enrollments</h2>
      {loading && <div className="py-6 text-gray-600 flex items-center gap-2"><Spinner size={20} /> Loading…</div>}
      {error && <div className="py-4 text-red-600 text-sm">{error}</div>}
      {!loading && !error && (
        items.length === 0 ? (
          <EmptyState title="No enrollment history" description="This student has no recorded enrollments yet." />
        ) : (
          <TableShell>
            <thead>
              <tr className="border-b bg-gray-50 text-gray-700">
                {header('academicYear', 'Academic Year', sort, setSort)}
                {header('grade', 'Grade', sort, setSort)}
                {header('section', 'Section', sort, setSort)}
                {header('shift', 'Shift', sort, setSort)}
                {header('cohort', 'Cohort', sort, setSort)}
                {header('status', 'Status', sort, setSort)}
                {header('joinedAt', 'Joined', sort, setSort)}
                {header('leftAt', 'Left', sort, setSort)}
                {header('sequenceInYear', 'Seq', sort, setSort)}
              </tr>
            </thead>
            <tbody>
              {stableSort(items, getComparator(sort)).map(e => (
                <tr key={e._id} className="border-b last:border-0">
                  <td className="px-3 py-2">{e.academicYear?.yearName || '-'}</td>
                  <td className="px-3 py-2">{e.grade?.gradeName || e.gradeSection?.grade?.gradeName || '-'}</td>
                  <td className="px-3 py-2">{e.gradeSection?.section || '-'}</td>
                  <td className="px-3 py-2">{e.shift?.shiftName || '-'}</td>
                  <td className="px-3 py-2">{e.cohort?.name || '-'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${statusClass(e.status)}`}>{e.status || '-'}</span>
                  </td>
                  <td className="px-3 py-2">{formatDate(e.joinedAt)}</td>
                  <td className="px-3 py-2">{formatDate(e.leftAt)}</td>
                  <td className="px-3 py-2">{e.sequenceInYear ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )
      )}
    </div>
  );
}

function header(key, label, sort, setSort) {
  const active = sort.key === key;
  const dir = active ? sort.dir : undefined;
  return (
    <th
      className="text-left px-3 py-2 select-none cursor-pointer"
      onClick={() => setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))}
      title="Click to sort"
    >
      <div className="inline-flex items-center gap-1">
        <span>{label}</span>
        {active && (
          <span className="text-xs text-gray-500">{dir === 'asc' ? '▲' : '▼'}</span>
        )}
      </div>
    </th>
  );
}

function getComparator(sort) {
  const { key, dir } = sort;
  const mult = dir === 'asc' ? 1 : -1;
  return (a, b) => {
    let va, vb;
    switch (key) {
      case 'academicYear':
        va = a.academicYear?.yearName || '';
        vb = b.academicYear?.yearName || '';
        break;
      case 'grade':
        va = a.grade?.gradeName || a.gradeSection?.grade?.gradeName || '';
        vb = b.grade?.gradeName || b.gradeSection?.grade?.gradeName || '';
        break;
      case 'section':
        va = a.gradeSection?.section || '';
        vb = b.gradeSection?.section || '';
        break;
      case 'shift':
        va = a.shift?.shiftName || '';
        vb = b.shift?.shiftName || '';
        break;
      case 'cohort':
        va = a.cohort?.name || '';
        vb = b.cohort?.name || '';
        break;
      case 'status':
        va = a.status || '';
        vb = b.status || '';
        break;
      case 'joinedAt':
        va = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
        vb = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
        break;
      case 'leftAt':
        va = a.leftAt ? new Date(a.leftAt).getTime() : 0;
        vb = b.leftAt ? new Date(b.leftAt).getTime() : 0;
        break;
      case 'sequenceInYear':
        va = a.sequenceInYear ?? 0;
        vb = b.sequenceInYear ?? 0;
        break;
      default:
        va = 0; vb = 0;
    }
    if (va < vb) return -1 * mult;
    if (va > vb) return 1 * mult;
    return 0;
  };
}

function stableSort(array, comparator) {
  return array
    .map((el, idx) => [el, idx])
    .sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    })
    .map(pair => pair[0]);
}
