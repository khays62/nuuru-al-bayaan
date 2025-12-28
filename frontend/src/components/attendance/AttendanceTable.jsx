import TableShell from '../common/table/TableShell';
import AttendanceSkeletonRow from './AttendanceSkeletonRow';
import AttendanceStatusPills from './AttendanceStatusPills';

export default function AttendanceTable({
  canAct,
  loading,
  rows,
  onChangeStatus,
  onChangeRemarks,
  onPickExtraStatus,
}) {
  if (!canAct) return null;

  return (
    <TableShell>
      <thead className="bg-gray-800">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Student ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Full Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Status</th>
        </tr>
      </thead>
      <tbody className={`divide-y divide-gray-200 ${loading ? 'animate-pulse' : ''}`}>
        {loading && Array.from({ length: 7 }).map((_, i) => (
          <AttendanceSkeletonRow keyId={`sk-${i}`} />
        ))}

        {!loading && rows.length === 0 && (
          <tr>
            <td className="px-6 py-6 text-sm text-gray-600" colSpan={3}>No students found for this selection.</td>
          </tr>
        )}

        {!loading && rows.length > 0 && rows.map(stu => (
          <tr key={stu._id} className="odd:bg-white even:bg-gray-50 hover:bg-gray-50 transition-colors">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">{stu.studentId}</td>
            <td className="px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200">{stu.fullName}</td>
            <td className="px-6 py-4 whitespace-nowrap border-x border-gray-200">
              <AttendanceStatusPills
                value={stu.status}
                remarks={stu.remarks}
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
