import React, { useState } from 'react';
import { X, Search, CheckCircle, AlertCircle, Printer } from 'lucide-react';
import financeService from '../api/finance';
import toast from 'react-hot-toast';

export default function ClearanceModal({ onClose }) {
    const [studentId, setStudentId] = useState(''); // This should ideally be a search selection
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleCheck = async (e) => {
        e.preventDefault();
        if (!studentId) return;

        setLoading(true);
        try {
            const data = await financeService.checkClearance(studentId);
            setResult(data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to check clearance');
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print(); // Placeholder for actual print logic
        toast.success("Printing Clearance Certificate...");
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900">Graduation Clearance</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Search Input */}
                    <form onSubmit={handleCheck} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Enter Student ID (e.g. 64a...)"
                            className="input flex-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            required
                        />
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                            {loading ? 'Checking...' : 'Check'}
                        </button>
                    </form>

                    {/* Result Display */}
                    {result && (
                        <div className={`p-4 rounded-lg border ${result.canGraduate ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <div className="flex items-center gap-3 mb-4">
                                {result.canGraduate ? (
                                    <CheckCircle className="text-green-600" size={24} />
                                ) : (
                                    <AlertCircle className="text-red-600" size={24} />
                                )}
                                <div>
                                    <h4 className={`font-bold text-lg ${result.canGraduate ? 'text-green-800' : 'text-red-800'}`}>
                                        {result.status}
                                    </h4>
                                    <p className="text-sm text-slate-600">Student ID: {result.studentId}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 border-t border-slate-200/50 pt-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Total Billed</p>
                                    <p className="font-mono font-bold text-slate-900">${result.totalBilled}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Total Paid</p>
                                    <p className="font-mono font-bold text-green-600">${result.totalPaid}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-semibold">Balance</p>
                                    <p className={`font-mono font-bold ${result.balance > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                        ${result.balance}
                                    </p>
                                </div>
                            </div>

                            {result.canGraduate && (
                                <div className="mt-4 pt-4 border-t border-slate-200/50 flex justify-end">
                                    <button onClick={handlePrint} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2 text-sm font-medium">
                                        <Printer size={16} />
                                        Print Certificate
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
