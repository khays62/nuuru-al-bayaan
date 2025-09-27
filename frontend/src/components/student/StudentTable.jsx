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
                            <Link to={`/students/${st._id}`} className="text-blue-600 hover:text-blue-800 inline-block p-1 rounded-full hover:bg-blue-100 transition-colors" title="View Profile">
                                <Eye size={18} />
                            </Link>
                            <button onClick={() => onEdit(st)} className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-100 transition-colors" title="Edit Student">
                                <Pencil size={18} />
                            </button>
                            <button onClick={() => onReassign && onReassign(st)} className="text-indigo-600 hover:text-indigo-800 p-1 rounded-full hover:bg-indigo-100 transition-colors" title="Reassign Section">
                                <Repeat size={18} />
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
                                    className="text-orange-600 hover:text-orange-800 p-1 rounded-full hover:bg-orange-100 transition-colors" title="Deactivate Student"
                                >
                                    <Trash2 size={18} />
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
                                    className="text-purple-600 hover:text-purple-800 p-1 rounded-full hover:bg-purple-100 transition-colors" title="Reactivate Student"
                                >
                                    <RotateCcw size={18} />
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

