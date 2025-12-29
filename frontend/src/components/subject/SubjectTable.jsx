// import React from 'react';
// import { Pencil, Trash2 } from 'lucide-react';
// import TableShell from '../common/table/TableShell';

// export default function SubjectTable({ subjects, onEdit, onDelete }) {
//     return (
//         <TableShell>
//             <thead className="bg-gray-800">
//                 <tr>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Subject Name</th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Subject Code</th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Associated Grades</th>
//                     <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Actions</th>
//                 </tr>
//             </thead>
//             <tbody className="divide-y divide-gray-200">
//                 {subjects.length === 0 ? (
//                     <tr>
//                         <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No subjects found. Please add a new subject.</td>
//                     </tr>
//                 ) : (
//                     subjects.map(subject => (
//                         <tr key={subject._id} className="odd:bg-white even:bg-gray-50 hover:bg-gray-50 transition-colors">
//                             <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 border-x border-gray-200">{subject.subjectName}</td>
//                             <td className="px-6 py-4 whitespace-nowrap text-gray-600 border-x border-gray-200">{subject.subjectCode}</td>
//                             <td className="px-6 py-4 text-gray-600 border-x border-gray-200">
//                                 <div className="flex flex-wrap gap-1 max-w-xs">
//                                     {subject.grades && subject.grades.map(grade => (
//                                         <span key={grade._id} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-md">
//                                             {grade.gradeName}
//                                         </span>
//                                     ))}
//                                 </div>
//                             </td>
//                             <td className="px-6 py-4 whitespace-nowrap text-right font-medium space-x-2 border-x border-gray-200">
//                                 <button onClick={() => onEdit(subject)} className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-100 transition-colors" title="Edit Subject">
//                                     <Pencil size={18} />
//                                 </button>
//                                 <button onClick={() => onDelete(subject._id)} className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 transition-colors" title="Delete Subject">
//                                     <Trash2 size={18} />
//                                 </button>
//                             </td>
//                         </tr>
//                     ))
//                 )}
//             </tbody>
//         </TableShell>
//     );
// }

import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import TableShell from '../common/table/TableShell';

export default function SubjectTable({ subjects, onEdit, onDelete, canEdit, canDelete }) {
    return (
        <TableShell>
            <thead className="bg-gray-800">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Subject Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Subject Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Associated Grades</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {subjects.length === 0 ? (
                    <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No subjects found. Please add a new subject.</td>
                    </tr>
                ) : (
                    subjects.map(subject => (
                        <tr key={subject._id} className="odd:bg-white even:bg-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 border-x border-gray-200">{subject.subjectName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 border-x border-gray-200">{subject.subjectCode}</td>
                            <td className="px-6 py-4 text-gray-600 border-x border-gray-200">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                    {subject.grades && subject.grades.map(grade => (
                                        <span key={grade._id} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-md">
                                            {grade.gradeName}
                                        </span>
                                    ))}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-medium space-x-2 border-x border-gray-200">

                            {canEdit && (
                                <button onClick={() => onEdit(subject)} className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-100 transition-colors" title="Edit Subject">
                                    <Pencil size={18} />
                                </button>
                            )}
                             
                           {canDelete && (
                              <button onClick={() => onDelete(subject._id)} className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 transition-colors" title="Delete Subject">
                                    <Trash2 size={18} />
                                </button>
                            )}
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </TableShell>
    );
}

