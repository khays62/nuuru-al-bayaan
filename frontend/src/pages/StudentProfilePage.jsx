import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader, RefreshCw, User, Phone, Calendar, MapPin, Users, IdCard } from 'lucide-react';
import toast from 'react-hot-toast';
// Modal and reassign API removed; reassign now handled from Students table

// Student Profile page: fetches student profile + latest enrollment + stats + history (paginated)
export default function StudentProfilePage() {
    const { studentId } = useParams(); // Waa _id ee Mongo (not studentId readable)
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // History state
    const [history, setHistory] = useState([]);
    const [histPage, setHistPage] = useState(1);
    const [histMeta, setHistMeta] = useState({ page: 1, totalPages: 1, total: 0 });
    const [historyLoading, setHistoryLoading] = useState(false);

    // Reassign UI removed from profile; handled in Students page

    // ------------------------------------------------------------
    // Profile fetch (dedupe) - Ka hortag laba wicitaan StrictMode / remount
    // ------------------------------------------------------------
    const profileInFlightRef = useRef(false);
    const profileLoadedRef = useRef(false); // mar haddii la helay, isla mount-ka ha labalaaban
    const fetchProfile = useCallback(async () => {
        if (!studentId) return;
        if (profileInFlightRef.current) return; // request socda
        if (profileLoadedRef.current) return;   // xog hore loo helay (mount duplicate)
        profileInFlightRef.current = true;
        setLoading(true); setError(null);
        try {
            const res = await fetch(`/api/students/${studentId}`);
            if (!res.ok) throw new Error('Profile request failed');
            const json = await res.json();
            setProfile(json);
            profileLoadedRef.current = true;
        } catch (e) {
            console.error(e);
            setError('Error: failed to load student profile');
        } finally {
            profileInFlightRef.current = false;
            setLoading(false);
        }
    }, [studentId]);

    // ------------------------------------------------------------
    // History fetch (dedupe): signature per (studentId + page)
    // Waxaa laga hortagayaa laba request degdeg ah
    // ------------------------------------------------------------
    const histInFlightRef = useRef(false);
    const lastHistSigRef = useRef(null);
    const fetchHistory = useCallback(async (page = 1) => {
        if (!studentId) return;
        const sig = `${studentId}:${page}`;
        if (histInFlightRef.current) return;
        if (lastHistSigRef.current === sig) return; // duplicate
        histInFlightRef.current = true;
        lastHistSigRef.current = sig;
        setHistoryLoading(true);
        try {
            const res = await fetch(`/api/students/${studentId}/history?page=${page}&limit=5`);
            if (!res.ok) throw new Error('History request failed');
            const json = await res.json();
            setHistory(json.data || []);
            setHistMeta(json.meta || { page: 1, totalPages: 1, total: 0 });
        } catch (e) {
            console.error(e);
            toast.error('History load failed');
        } finally {
            histInFlightRef.current = false;
            setHistoryLoading(false);
        }
    }, [studentId]);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);
    useEffect(() => { fetchHistory(histPage); }, [fetchHistory, histPage]);

    const retry = () => fetchProfile();

    // Reassign handlers removed

    return (
        <div className="space-y-6">
            <Link to="/students" className="flex items-center text-sm text-blue-600 hover:underline">
                <ArrowLeft size={16} className="mr-1" /> Back to Students
            </Link>

            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                {loading ? (
                    <div className="p-6 flex items-center gap-2 text-gray-500"><Loader size={18} className="animate-spin" /> Loading...</div>
                ) : error ? (
                    <div className="p-6 text-red-600 text-sm flex items-center gap-3">
                        <span>{error}</span>
                        <button onClick={retry} className="px-2 py-1 text-xs bg-blue-600 text-white rounded flex items-center gap-1"><RefreshCw size={12} /> Retry</button>
                    </div>
                ) : profile ? (
                    <div>
                        {/* Header - animated gradient dark style and responsive */}
                        <div className="animated-gradient-dark p-6 text-white border-b border-gray-700">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                                        <User size={28} />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold leading-tight">{profile.student.fullName}</h1>
                                        <div className="text-xs opacity-90 flex items-center gap-2 mt-1">
                                            <IdCard size={14} /> <span className="font-mono">{profile.student.studentId}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 items-center">
                                    <Badge color="emerald">{profile.stats?.activeStatus ?? profile.student.status}</Badge>
                                    <Badge>{`Total Years: ${profile.stats?.totalYears ?? 0}`}</Badge>
                                    {/* Reassign button removed; use Students list actions */}
                                </div>
                            </div>
                        </div>

                        {/* Info grid */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InfoRow icon={<Users className="text-blue-600" size={16} />} label="Gender" value={profile.student.gender} />
                            <InfoRow icon={<Calendar className="text-blue-600" size={16} />} label="DOB" value={profile.student.dob ? new Date(profile.student.dob).toLocaleDateString() : '-'} />
                            <InfoRow icon={<User className="text-blue-600" size={16} />} label="Guardian" value={profile.student.guardianName || '-'} />
                            <InfoRow icon={<Phone className="text-blue-600" size={16} />} label="Contact" value={profile.student.contactNumber || '-'} />
                            <InfoRow icon={<Calendar className="text-blue-600" size={16} />} label="Admission Date" value={profile.student.admissionDate ? new Date(profile.student.admissionDate).toLocaleDateString() : '-'} />
                            <InfoRow icon={<MapPin className="text-blue-600" size={16} />} label="Address" value={profile.student.address || '-'} />
                        </div>

                        {/* Latest enrollment */}
                        <div className="px-6 pb-6">
                            <h2 className="text-lg font-semibold text-gray-800 mb-3">Latest Enrollment</h2>
                            {profile.latestEnrollment ? (
                                <div className="p-4 border rounded-lg bg-gray-50 flex flex-wrap gap-2">
                                    <Chip>{`Grade: ${profile.latestEnrollment.grade?.gradeName || profile.latestEnrollment.gradeSection?.grade?.gradeName || '-'}`}</Chip>
                                    <Chip>{`Section: ${profile.latestEnrollment.gradeSection?.section || '-'}`}</Chip>
                                    <Chip>{`Year: ${profile.latestEnrollment.academicYear?.yearName || '-'}`}</Chip>
                                    <Chip>{`Shift: ${profile.latestEnrollment.shift?.shiftName || '-'}`}</Chip>
                                    <Chip color="indigo">{`Status: ${profile.latestEnrollment.status}`}</Chip>
                                    <Chip>{`Joined: ${profile.latestEnrollment.joinedAt ? new Date(profile.latestEnrollment.joinedAt).toLocaleDateString() : '-'}`}</Chip>
                                </div>
                            ) : <p className="text-sm text-gray-500">No enrollment found.</p>}
                        </div>
                    </div>
                ) : null}
            </div>

            {/* History Section */}
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Enrollment History</h2>
                    {historyLoading && <Loader size={16} className="animate-spin text-gray-400" />}
                </div>
                {history.length === 0 && !historyLoading ? (
                    <p className="text-sm text-gray-500">No history found.</p>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <Th>Academic Year</Th>
                                    <Th>Section</Th>
                                    <Th>Grade</Th>
                                    <Th>Shift</Th>
                                    <Th>Status</Th>
                                    <Th>Joined</Th>
                                    <Th>Left</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((h, idx) => (
                                    <tr key={h._id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                                        <Td>{h.academicYear?.yearName || '-'}</Td>
                                        <Td>{h.gradeSection?.section || '-'}</Td>
                                        <Td>{h.grade?.gradeName || h.gradeSection?.grade?.gradeName || '-'}</Td>
                                        <Td>{h.shift?.shiftName || '-'}</Td>
                                        <Td className="flex items-center gap-2">
                                            <Badge color={h.status === 'active' ? 'emerald' : 'gray'}>{h.status}</Badge>
                                            {/* Per-row Reassign removed */}
                                        </Td>
                                        <Td>{h.joinedAt ? new Date(h.joinedAt).toLocaleDateString() : '-'}</Td>
                                        <Td>{h.leftAt ? new Date(h.leftAt).toLocaleDateString() : '-'}</Td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex items-center justify-between mt-4 text-xs">
                    <span>Page {histMeta.page} / {histMeta.totalPages}</span>
                    <div className="space-x-2">
                        <button disabled={histMeta.page <= 1} onClick={() => setHistPage(p => Math.max(1, p - 1))} className="px-2 py-1 rounded border disabled:opacity-40">Prev</button>
                        <button disabled={histMeta.page >= histMeta.totalPages} onClick={() => setHistPage(p => Math.min(histMeta.totalPages, p + 1))} className="px-2 py-1 rounded border disabled:opacity-40">Next</button>
                    </div>
                </div>
            </div>
            {/* Reassign Modal removed */}
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div className="px-4 py-2 bg-gray-50 rounded border text-center">
            <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
            <div className="text-sm font-semibold text-gray-800 mt-1">{value}</div>
        </div>
    );
}
function Info({ label, value }) {
    return (
        <div className="text-sm">
            <div className="text-gray-400 uppercase tracking-wide text-xs">{label}</div>
            <div className="text-gray-800 font-medium mt-0.5 break-words">{value}</div>
        </div>
    );
}
function Th({ children }) { return <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</th>; }
function Td({ children }) { return <td className="px-3 py-2 whitespace-nowrap text-gray-700">{children}</td>; }

// Lightweight UI bits
function Badge({ children, color = 'gray' }) {
    const map = {
        emerald: 'bg-emerald-100 text-emerald-800',
        indigo: 'bg-indigo-100 text-indigo-800',
        gray: 'bg-gray-100 text-gray-800',
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${map[color] || map.gray}`}>
            {children}
        </span>
    );
}
function Chip({ children, color = 'gray' }) {
    const map = {
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        gray: 'bg-gray-50 text-gray-700 border-gray-200',
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${map[color] || map.gray}`}>
            {children}
        </span>
    );
}
function InfoRow({ icon, label, value }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg border bg-white">
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1">
                <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
                <div className="text-gray-800 font-medium">{value}</div>
            </div>
        </div>
    );
}
