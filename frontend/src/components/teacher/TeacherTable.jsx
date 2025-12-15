import React from 'react';
import TableShell from '../common/table/TableShell';
import ActionButton from '../common/ActionButton';

export default function TeacherTable({ items = [], loading = false, error = '', onAssign, onEdit, onDelete }) {
  return (
    <TableShell>
      <thead>
        <tr className="bg-black text-white">
          <th className="text-left px-3 py-2 border-r border-white/20">Name</th>
          <th className="text-left px-3 py-2 border-r border-white/20">Teacher ID</th>
          <th className="text-left px-3 py-2 border-r border-white/20">Email</th>
          <th className="text-left px-3 py-2 border-r border-white/20">Phone</th>
          <th className="text-left px-3 py-2 border-r border-white/20">Created</th>
          <th className="text-left px-3 py-2 border-r border-white/20">Status</th>
          <th className="text-left px-3 py-2" />
        </tr>
      </thead>
      <tbody>
        {loading && (
          <tr><td className="px-3 py-2 text-sm text-gray-500" colSpan={7}>Loading…</td></tr>
        )}
        {error && (
          <tr><td className="px-3 py-2 text-sm text-red-600" colSpan={7}>{error}</td></tr>
        )}
        {!loading && !error && (items?.length || 0) === 0 && (
          <tr><td className="px-3 py-2 text-sm text-gray-500" colSpan={7}>No teachers.</td></tr>
        )}
        {(items?.length || 0) > 0 && !loading && !error && items.map(t => (
          <tr key={t._id || t.id} className="border-t">
            <td className="px-3 py-2 border-r">{t.fullName || `${t.firstName || ''} ${t.lastName || ''}`}</td>
            <td className="px-3 py-2 border-r">{t.teacherId || '-'}</td>
            <td className="px-3 py-2 border-r">{t.email || '-'}</td>
            <td className="px-3 py-2 border-r">{t.phone || '-'}</td>
            <td className="px-3 py-2 border-r">{t.createdAt ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(t.createdAt)) : '-'}</td>
            <td className="px-3 py-2 border-r">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ring-1 ${t.status==='active' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-slate-50 text-slate-700 ring-slate-200'}`}>{t.status || '-'}</span>
            </td>
            <td className="px-3 py-2 text-right">
              <ActionButton variant="info" onClick={() => onAssign && onAssign(t)}>Assignments</ActionButton>
              <ActionButton className="ml-2" onClick={() => onEdit && onEdit(t)}>Edit</ActionButton>
              <ActionButton variant="danger" className="ml-2" onClick={() => onDelete && onDelete(t)}>Delete</ActionButton>
            </td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}
