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
import Badge from '../../../shared/components/ui/Badge.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Card from '../../../shared/components/ui/Card.jsx';
import Alert from '../../../shared/components/ui/Alert.jsx';
import LoadingState from '../../../shared/components/feedback/LoadingState.jsx';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import { useClientSort } from '../../../shared/hooks/useClientSort.js';
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

  const {
    sortBy,
    sortDir,
    onSort,
    sortedRows: sortedLogs,
  } = useClientSort(logs, {
    initialSortBy: 'timestamp',
    initialSortDir: 'desc',
    getValue: (row, field) => {
      switch (field) {
        case 'action':
          return String(row?.action || '').toLowerCase();
        case 'ip':
          return String(row?.ip || '').toLowerCase();
        case 'device':
          return String(row?.device || '').toLowerCase();
        case 'timestamp':
        default:
          return new Date(row?.timestamp || 0).getTime();
      }
    },
  });

  if (loading) return <LoadingState message="Loading user details…" />;

  if (!user) {
    return <Alert variant="danger" title="Could not load user profile." />;
  }

  return (
    <div className="space-y-8">
      <Button as={Link} to="/users" variant="neutral" size="md" icon={<ArrowLeft size={15} />}>
        Back to Users
      </Button>

      <Card className="overflow-hidden">
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <User className="text-(--nb-color-brand)" size={34} />
            <div>
              <h1 className="text-xl font-semibold">{user.fullName}</h1>
              <p className="text-sm text-slate-600">{user.username}</p>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <StatusBadge status={user.status} />
            <Badge variant="primary">Role: {user.role}</Badge>
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

        <div className="border-t border-slate-200 px-6 py-6">
          <h2 className="text-lg font-semibold mb-4">Audit History</h2>

          <StandardTable
            isLoading={false}
            items={sortedLogs}
            rows={sortedLogs}
            emptyTitle="No audit history."
            emptyDescription="This user has no recorded actions yet."
            loadingVariant="table"
            columns={[
              { key: 'action', label: 'Action', sortable: true, field: 'action', tdClassName: 'px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200' },
              { key: 'description', label: 'Description', sortable: false, field: 'description' },
              { key: 'ip', label: 'IP', sortable: true, field: 'ip' },
              { key: 'device', label: 'Device', sortable: true, field: 'device' },
              { key: 'timestamp', label: 'Time', sortable: true, field: 'timestamp' },
            ]}
            storageKey="users:auditLogs:columns:v1"
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
            showRowsSelector={false}
            paginationProps={{ className: 'no-print', infoVariant: 'count' }}
            getRowKey={(r) => `${r.timestamp || ''}-${r.action || ''}-${r.ip || ''}`}
            renderCell={(r, col) => {
              switch (col.key) {
                case 'action':
                  return r.action || '-';
                case 'description':
                  return r.description || '-';
                case 'ip':
                  return r.ip || '-';
                case 'device':
                  return r.device || 'Unknown device';
                case 'timestamp':
                  return r.timestamp ? new Date(r.timestamp).toLocaleString() : '-';
                default:
                  return '';
              }
            }}
          />
        </div>
      </Card>
    </div>
  );
}

function Info({ label, value, icon }) {
  return (
    <Card className="p-4 shadow-(--nb-shadow-sm)">
      <div className="text-xs text-slate-500 flex items-center gap-2 mb-1">
        {icon} {label.toUpperCase()}
      </div>
      <p className="font-medium">{value}</p>
    </Card>
  );
}

function format(date) {
  return new Date(date).toLocaleDateString();
}
