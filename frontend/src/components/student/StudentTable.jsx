import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Pencil, Trash2, RotateCcw, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';

// Displays students returned by backend list endpoint
const StudentTable = ({ students, onEdit, onDelete, onReassign }) => (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {students.map(st => (
                    <tr key={st._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{st.studentId}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{st.fullName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{st.gender}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{st.gradeDisplay || st.grade || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                st.status === 'Active' ? 'bg-green-100 text-green-800' :
                                st.status === 'On Hold' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                            }`}>{st.status}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{st.contactNumber || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <Link
                                to={`/students/${st._id}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-white hover:bg-gray-50 shadow-sm text-blue-700 border-blue-300"
                                title="View Profile"
                            >
                                <Eye size={16} /> <span className="hidden sm:inline">View</span>
                            </Link>
                            <button
                                onClick={() => onEdit(st)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300"
                                title="Edit Student"
                            >
                                <Pencil size={16} /> <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                                onClick={() => onReassign && onReassign(st)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-300"
                                title="Reassign Section"
                            >
                                <Repeat size={16} /> <span className="hidden sm:inline">Reassign</span>
                            </button>
                            {st.status === 'Active' ? (
                                <button
                                    onClick={async () => {
                                        if (!window.confirm('Are you sure you want to deactivate this student?')) return;
                                        try {
                                            const res = await fetch(`/api/students/${st._id}/deactivate`, { method: 'PATCH' });
                                            if (res.ok) {
                                                toast.success('Student deactivated');
                                                window.dispatchEvent(new CustomEvent('students:changed'));
                                            } else {
                                                const msg = await res.json().catch(() => ({}));
                                                toast.error(msg.message || 'Failed to deactivate');
                                            }
                                        } catch (e) { console.error(e); toast.error('Network error'); }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-300"
                                    title="Deactivate Student"
                                >
                                    <Trash2 size={16} /> <span className="hidden sm:inline">Deactivate</span>
                                </button>
                            ) : (
                                <button
                                    onClick={async () => {
                                        try {
                                            const res = await fetch(`/api/students/${st._id}/reactivate`, { method: 'PATCH' });
                                            if (res.ok) {
                                                toast.success('Student reactivated');
                                                window.dispatchEvent(new CustomEvent('students:changed'));
                                            } else {
                                                const msg = await res.json().catch(() => ({}));
                                                toast.error(msg.message || 'Failed to reactivate');
                                            }
                                        } catch (e) { console.error(e); toast.error('Network error'); }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300"
                                    title="Reactivate Student"
                                >
                                    <RotateCcw size={16} /> <span className="hidden sm:inline">Reactivate</span>
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default StudentTable;

