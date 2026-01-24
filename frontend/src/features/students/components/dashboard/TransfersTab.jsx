import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import Spinner from '../../../../shared/components/feedback/Spinner.jsx';
import EmptyState from '../../../../shared/components/feedback/EmptyState.jsx';
import { getStudentTransfers } from '../../../../api';
import TransferTimeline from '../TransferTimeline';
import { useAuth } from '../../../../auth/AuthContext';
import { studentKeys } from '../../queryKeys';
import Button from '../../../../shared/components/ui/Button.jsx';

export default function TransfersTab() {
  const { studentId: paramStudentId } = useParams();
  const { auth } = useAuth();

  const rawStudentRef = auth?.user?.studentRef;
  const studentRefId = rawStudentRef?._id || rawStudentRef || null;
  const studentId = paramStudentId || (auth?.user?.role === 'student' ? studentRefId : null);

  const transfersQuery = useQuery({
    queryKey: studentKeys.transfers(studentId, { limit: 50 }),
    enabled: !!studentId,
    queryFn: async () => {
      const res = await getStudentTransfers(studentId, { limit: 50 });
      return Array.isArray(res?.data) ? res.data : [];
    },
  });

  const items = transfersQuery.data || [];
  const loading = transfersQuery.isLoading;
  const error = transfersQuery.isError ? 'Failed to load transfers' : null;

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-lg font-medium mb-2">Transfers</h2>
      {loading && (
        <div className="py-6 text-gray-600 flex items-center gap-2">
          <Spinner size={20} /> Loading…
        </div>
      )}
      {error && (
        <div className="py-4 text-red-600 text-sm flex items-center gap-3">
          <span>{error}</span>
          <Button type="button" size="sm" variant="brand" onClick={() => transfersQuery.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {!loading && !error && (
        items.length === 0 ? (
          <EmptyState title="No transfers" description="This student has no transfer history yet." />
        ) : (
          <TransferTimeline logs={items} />
        )
      )}
    </div>
  );
}
