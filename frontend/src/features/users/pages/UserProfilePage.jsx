import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  ShieldCheck,
  Calendar,
  Laptop,
  Globe,
  Clock,
  IdCard,
} from 'lucide-react';
import toast from 'react-hot-toast';

import StatusBadge from '../../../shared/components/ui/badges/StatusBadge.jsx';
import { getUserById, getUserAuditLogs } from '../api/usersApi';

export default function UserProfilePage() {
  const { userId } = useParams();

  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const userRes = await getUserById(userId);
      if (userRes.ok) setUser(userRes.data);
      else throw new Error(userRes.error || 'User not found');

      const logRes = await getUserAuditLogs(userId);
      if (logRes.ok) setLogs(logRes.data);
      else setLogs([]);
    } catch (e) {
      // Keep console for debug, show friendly toast
      console.error('Profile fetch error:', e);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading)
    return (
      <div className="p-8 text-gray-600 animate-pulse">Loading user details…</div>
    );

  if (!user)
    return (
      <div className="p-8 text-red-600">Could not load user profile.</div>
    );

  return (
    <div className="space-y-8">
      <Link
        to="/users"
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-white border rounded-md hover:bg-gray-50"
      >
        <ArrowLeft size={15} /> Back to Users
      </Link>

      <div className="bg-white rounded-xl shadow border">
        <div className="flex justify-between items-center px-6 py-5 border-b">
          <div className="flex items-center gap-3">
            <User className="text-blue-600" size={34} />
            <div>
              <h1 className="text-xl font-semibold">{user.fullName}</h1>
              <p className="text-sm text-gray-600">{user.username}</p>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <StatusBadge status={user.status} />
            <span className="text-xs px-3 py-1 bg-purple-100 text-purple-600 rounded-full">
              Role: {user.role}
            </span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Info label="Full Name" value={user.fullName} icon={<User size={18} />} />
          <Info label="Username" value={user.username} icon={<IdCard size={18} />} />

          <Info label="Email" value={user.email} icon={<Mail size={18} />} />
          <Info label="Phone" value={user.phone || '—'} icon={<Phone size={18} />} />

          <Info label="Role" value={user.role} icon={<ShieldCheck size={18} />} />
          <Info label="Status" value={user.status} icon={<ShieldCheck size={18} />} />

          <Info label="Created At" value={format(user.createdAt)} icon={<Calendar size={18} />} />
          <Info
            label="Last Login"
            value={user.lastLogin ? format(user.lastLogin) : 'Never'}
            icon={<Clock size={18} />}
          />
        </div>

        <div className="border-t px-6 py-6">
          <h2 className="text-lg font-semibold mb-4">Audit History</h2>

          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm">No audit history available.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg bg-gray-50 flex flex-col md:flex-row md:justify-between md:items-center"
                >
                  <div>
                    <p className="font-medium">{log.action}</p>
                    <p className="text-sm text-gray-600">{log.description}</p>

                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={13} /> {format(log.timestamp)}
                      </span>

                      <span className="flex items-center gap-1">
                        <Laptop size={13} /> {log.device || 'Unknown device'}
                      </span>

                      <span className="flex items-center gap-1">
                        <Globe size={13} /> IP {log.ip}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, icon }) {
  return (
    <div className="border rounded-xl p-4 bg-white">
      <div className="text-xs text-gray-500 flex items-center gap-2 mb-1">
        {icon} {label.toUpperCase()}
      </div>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function format(date) {
  return new Date(date).toLocaleDateString();
}
