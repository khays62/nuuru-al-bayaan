import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import TableShell from '../common/table/TableShell';

// GradeTable shows section + grade + shift + subjects count; no AY/Cohort columns
const GradeTable = ({ classes, onEdit, onDelete }) => (
  <TableShell>
    <thead className="bg-gray-800">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Section</th>
        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Grade</th>
        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Shift</th>
        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Subjects</th>
        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Capacity</th>
        <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Actions</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-200">
      {classes.map(cls => {
          const gradeName = cls.grade?.gradeName || cls.grade?.name || cls.grade || '—';
          const shiftName = cls.shift?.shiftName || cls.shift?.name || '—';
          return (
            <tr key={cls._id} className="odd:bg-white even:bg-gray-50 hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap text-gray-700 border-x border-gray-200">{cls.section || '1'}</td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-700 border-x border-gray-200">{gradeName}</td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-700 border-x border-gray-200">{shiftName}</td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-700 border-x border-gray-200">{(cls.subjects || []).length}</td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-700 border-x border-gray-200">{cls.capacity || '—'}</td>
              <td className="px-4 py-3 whitespace-nowrap text-right font-medium space-x-2 border-x border-gray-200">
                <button onClick={() => onEdit(cls)} className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-100 transition-colors" title="Edit">
                  <Pencil size={18} />
                </button>
                <button onClick={() => onDelete(cls._id)} className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 transition-colors" title="Delete">
                  <Trash2 size={18} />
                </button>
              </td>
            </tr>
          );
        })}
    </tbody>
  </TableShell>
);

export default GradeTable;
