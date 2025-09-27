import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

// GradeTable shows grade + year + shift + subjects count; hides class name
const GradeTable = ({ classes, onEdit, onDelete }) => (
  <div className="overflow-x-auto bg-white rounded-lg shadow">
    <table className="w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Year</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subjects</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {classes.map(cls => {
          const gradeName = cls.grade?.gradeName || cls.grade?.name || cls.grade || '—';
          const yearName = cls.academicYear?.yearName || cls.academicYear?.name || '—';
          const shiftName = cls.shift?.shiftName || cls.shift?.name || '—';
          return (
            <tr key={cls._id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{cls.section || '1'}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{gradeName}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{yearName}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{shiftName}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{(cls.subjects || []).length}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{cls.capacity || '—'}</td>
              <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
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
    </table>
  </div>
);

export default GradeTable;
