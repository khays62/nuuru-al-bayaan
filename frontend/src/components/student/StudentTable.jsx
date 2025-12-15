import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Pencil, Trash2, RotateCcw, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';
import TableShell from '../common/table/TableShell';
import StatusBadge from '../common/badges/StatusBadge';
import ActionButton from '../common/ActionButton';
import { deactivateStudentApi, reactivateStudentApi } from '../../api';
import { emitStudentsChanged } from '../../utils/events';

// Displays students returned by backend list endpoint
const StudentTable = ({   students,
    onEdit,
    canView,      // <-- make sure this is here
    canEdit,      // <-- add this
    canDeactivate,
    canReactivate }) => (
    <TableShell>
            <thead className="bg-gray-800">
                <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Student ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Full Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Contact</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {students.map(st => (
                    <tr key={st._id} className="odd:bg-white even:bg-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">{st.studentId}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200">{st.fullName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-x border-gray-200">{st.gender}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-x border-gray-200">{st.gradeDisplay || st.grade || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap border-x border-gray-200">
                            <StatusBadge status={st.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-x border-gray-200">{st.contactNumber || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 border-x border-gray-200">
                            <Link to={`/students/${st._id}`} title="View Profile" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-white hover:bg-gray-50 shadow-sm text-blue-700 border-blue-300">
                                <Eye size={16} /> <span className="hidden sm:inline">View</span>
                            </Link>
                            {canEdit && onEdit && (
                                 <ActionButton variant="neutral" title="Edit Student" onClick={() => onEdit(st)} icon={<Pencil size={16} />}>
                                 <span className="hidden sm:inline">Edit</span>
                             </ActionButton>

                             )}

                           
                            {/* Transfer button removed; use dedicated Transfers page */}
                            {/* {st.status === 'Active' ? ( */}
                            {canDeactivate && st.status === "Active" && (
                                <ActionButton
                                    variant="danger"
                                    title="Deactivate Student"
                                    onClick={async () => {
                                        if (!window.confirm('Are you sure you want to deactivate this student?')) return;
                                        try {
                                            const { ok, data } = await deactivateStudentApi(st._id);
                                            if (ok) { toast.success('Student deactivated'); emitStudentsChanged(); }
                                            else { toast.error(data?.message || 'Failed to deactivate'); }
                                        } catch (e) { console.error(e); toast.error('Network error'); }
                                    }}
                                    icon={<Trash2 size={16} />}
                                >
                                    <span className="hidden sm:inline">Deactivate</span>
                                </ActionButton>
                            )}

                           {canReactivate && st.status !== "Active" && (
                                <ActionButton
                                    variant="primary"
                                    title="Reactivate Student"
                                    onClick={async () => {
                                        try {
                                            const { ok, data } = await reactivateStudentApi(st._id);
                                            if (ok) { toast.success('Student reactivated'); emitStudentsChanged(); }
                                            else { toast.error(data?.message || 'Failed to reactivate'); }
                                        } catch (e) { console.error(e); toast.error('Network error'); }
                                    }}
                                    icon={<RotateCcw size={16} />}
                                >
                                    <span className="hidden sm:inline">Reactivate</span>
                                </ActionButton>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
    </TableShell>
);

export default StudentTable;

// import React from "react";
// import { Link } from "react-router-dom";
// import { Eye, Pencil, Trash2, RotateCcw } from "lucide-react";
// import toast from "react-hot-toast";

// import TableShell from "../common/table/TableShell";
// import StatusBadge from "../common/badges/StatusBadge";
// import ActionButton from "../common/ActionButton";

// import {
//   deactivateStudentApi,
//   reactivateStudentApi
// } from "../../api";
// import { emitStudentsChanged } from "../../utils/events";

// const StudentTable = ({
//   students,
//   onEdit,
//   canView,
//   canEdit,
//   canDeactivate,
//   canReactivate
// }) => {
//   return (
//     <TableShell>
//       <thead className="bg-gray-800">
//         <tr>
//           <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase border">Student ID</th>
//           <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase border">Full Name</th>
//           <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase border">Gender</th>
//           <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase border">Grade</th>
//           <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase border">Status</th>
//           <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase border">Contact</th>
//           <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase border">Actions</th>
//         </tr>
//       </thead>

//       <tbody className="divide-y divide-gray-200">
//         {students.map((st) => (
//           <tr
//             key={st._id}
//             className="odd:bg-white even:bg-gray-50 hover:bg-gray-50"
//           >
//             <td className="px-6 py-4 text-sm border">{st.studentId}</td>
//             <td className="px-6 py-4 text-sm font-medium border">
//               {st.fullName}
//             </td>
//             <td className="px-6 py-4 text-sm border">{st.gender}</td>
//             <td className="px-6 py-4 text-sm border">
//               {st.gradeDisplay || st.grade || "-"}
//             </td>
//             <td className="px-6 py-4 border">
//               <StatusBadge status={st.status} />
//             </td>
//             <td className="px-6 py-4 text-sm border">
//               {st.contactNumber || "-"}
//             </td>

//             {/* ACTIONS */}
//             <td className="px-6 py-4 text-right text-sm space-x-2 border">
//               {/* VIEW */}
//               {canView && (
//                 <Link
//                   to={`/students/${st._id}`}
//                   title="View Profile"
//                   className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-white hover:bg-gray-50 text-blue-700 border-blue-300"
//                 >
//                   <Eye size={16} />
//                   <span className="hidden sm:inline">View</span>
//                 </Link>
//               )}

//               {/* EDIT */}
//               {canEdit && onEdit && (
//                 <ActionButton
//                   variant="neutral"
//                   title="Edit Student"
//                   onClick={() => onEdit(st)}
//                   icon={<Pencil size={16} />}
//                 >
//                   <span className="hidden sm:inline">Edit</span>
//                 </ActionButton>
//               )}

//               {/* DEACTIVATE */}
//               {canDeactivate && st.status === "Active" && (
//                 <ActionButton
//                   variant="danger"
//                   title="Deactivate Student"
//                   icon={<Trash2 size={16} />}
//                   onClick={async () => {
//                     if (!window.confirm("Deactivate this student?")) return;
//                     try {
//                       const { ok, data } = await deactivateStudentApi(st._id);
//                       if (ok) {
//                         toast.success("Student deactivated");
//                         emitStudentsChanged();
//                       } else {
//                         toast.error(data?.message || "Failed");
//                       }
//                     } catch {
//                       toast.error("Network error");
//                     }
//                   }}
//                 >
//                   <span className="hidden sm:inline">Deactivate</span>
//                 </ActionButton>
//               )}

//               {/* REACTIVATE */}
//               {canReactivate && st.status !== "Active" && (
//                 <ActionButton
//                   variant="primary"
//                   title="Reactivate Student"
//                   icon={<RotateCcw size={16} />}
//                   onClick={async () => {
//                     try {
//                       const { ok, data } = await reactivateStudentApi(st._id);
//                       if (ok) {
//                         toast.success("Student reactivated");
//                         emitStudentsChanged();
//                       } else {
//                         toast.error(data?.message || "Failed");
//                       }
//                     } catch {
//                       toast.error("Network error");
//                     }
//                   }}
//                 >
//                   <span className="hidden sm:inline">Reactivate</span>
//                 </ActionButton>
//               )}
//             </td>
//           </tr>
//         ))}
//       </tbody>
//     </TableShell>
//   );
// };

// export default StudentTable;
