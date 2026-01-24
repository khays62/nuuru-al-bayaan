import TableShell from '../../../shared/components/table/TableShell.jsx';
import AttendanceSkeletonRow from './AttendanceSkeletonRow';
import AttendanceStatusPills from './AttendanceStatusPills';

export default function AttendanceTable({
  canAct,
  canEdit,
  loading,
  rows,
  showAuditColumns,
  onChangeStatus,
  onChangeRemarks,
  onPickExtraStatus,
}) {
  if (!canAct) return null;

  const effectiveCanEdit = canEdit ?? canAct;

  const colCount = showAuditColumns ? 5 : 3;

  return (
    <TableShell>
      <thead className="bg-gray-800">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Student ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Full Name</th>
          {showAuditColumns ? (
            <>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Marked</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Updated</th>
            </>
          ) : null}
          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Status</th>
        </tr>
      </thead>
      <tbody className={`divide-y divide-gray-200 ${loading ? 'animate-pulse' : ''}`}>
        {loading && Array.from({ length: 7 }).map((_, i) => (
          <AttendanceSkeletonRow key={`sk-${i}`} keyId={`sk-${i}`} />
        ))}

        {!loading && rows.length === 0 && (
          <tr>
            <td className="px-6 py-6 text-sm text-gray-600" colSpan={colCount}>No students found for this selection.</td>
          </tr>
        )}

        {!loading && rows.length > 0 && rows.map(stu => (
          <tr key={stu._id || stu.studentId} className="odd:bg-white even:bg-gray-50 hover:bg-gray-50 transition-colors">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">{stu.studentId}</td>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200">{stu.fullName}</td>
            {showAuditColumns ? (
              <>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">
                  <div className="leading-tight">
                    <div className="font-medium">{stu?.audit?.markedBy?.name || '—'}</div>
                    <div className="text-xs text-gray-500">{stu?.audit?.markedBy?.role || ''}{stu?.audit?.markedAt ? ` • ${new Date(stu.audit.markedAt).toLocaleString()}` : ''}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">
                  <div className="leading-tight">
                    <div className="font-medium">{stu?.audit?.updatedBy?.name || '—'}</div>
                    <div className="text-xs text-gray-500">{stu?.audit?.updatedBy?.role || ''}{stu?.audit?.updatedAt ? ` • ${new Date(stu.audit.updatedAt).toLocaleString()}` : ''}</div>
                  </div>
                </td>
              </>
            ) : null}
            <td className="px-6 py-4 whitespace-nowrap border-x border-gray-200">
              <AttendanceStatusPills
                value={stu.status}
                remarks={stu.remarks}
                disabled={!effectiveCanEdit}
                onChange={(next) => onChangeStatus(stu._id, next)}
                onChangeRemarks={(val) => onChangeRemarks(stu._id, val)}
                onPickExcusedPreset={(label) => onPickExtraStatus(stu._id, label)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}
