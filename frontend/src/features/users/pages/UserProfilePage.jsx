import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  ShieldCheck,
  Calendar,
  Clock,
  IdCard,
} from 'lucide-react';
import toast from 'react-hot-toast';

import StatusBadge from '../../../shared/components/ui/badges/StatusBadge.jsx';
import Badge from '../../../shared/components/ui/Badge.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Card from '../../../shared/components/ui/Card.jsx';
import Alert from '../../../shared/components/ui/Alert.jsx';
import LoadingState from '../../../shared/components/ui/LoadingState.jsx';
import AuditHistoryTable from '../../../shared/components/audit/AuditHistoryTable.jsx';
import { getUserById, getUserAuditLogs } from '../api/usersApi';
import { useQuery } from '@tanstack/react-query';
import { userKeys } from '../queryKeys';
import { useUsersRealtimeInvalidation } from '../useUsersRealtimeInvalidation';

export default function UserProfilePage() {
  const { userId } = useParams();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useUsersRealtimeInvalidation({ userId });

  const userQuery = useQuery({
    queryKey: userKeys.adminProfile(userId),
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => getUserById(userId, { signal }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const logsQuery = useQuery({
    queryKey: userKeys.adminAuditLogs({ userId, page, limit }),
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => getUserAuditLogs(userId, { page, limit }, { signal }),
    placeholderData: (prev) => prev,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const logs = useMemo(() => logsQuery.data?.data || [], [logsQuery.data]);
  const logsMeta = useMemo(() => {
    const m = logsQuery.data?.meta;
    if (m) return m;
    const total = Array.isArray(logs) ? logs.length : 0;
    return { page, limit, total, totalPages: 1 };
  }, [logsQuery.data, logs, page, limit]);

  const loading = Boolean(userQuery.isLoading && userQuery.data == null);
  const user = userQuery.data || null;

  useEffect(() => {
    if (userQuery.isError) {
      toast.error('Failed to load profile');
    }
  }, [userQuery.isError]);

  if (loading) return <LoadingState message="Loading user details…" />;

  if (!user || userQuery.isError) {
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

          <AuditHistoryTable
            logs={logs}
            isLoading={Boolean(logsQuery.isLoading && logs.length === 0)}
            error={logsQuery.isError ? (logsQuery.error?.data?.message || logsQuery.error?.message || 'Failed to load audit history') : null}
            meta={logsMeta}
            onPage={setPage}
            onLimit={(v) => {
              setLimit(v);
              setPage(1);
            }}
            storageKey="users:auditLogs:columns:v2"
            emptyTitle="No audit history."
            emptyDescription="This user has no recorded actions yet."
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
