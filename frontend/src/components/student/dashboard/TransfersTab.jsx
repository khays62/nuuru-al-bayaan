import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Spinner from '../../common/Feedback/Spinner';
import EmptyState from '../../common/Feedback/EmptyState';
import { getStudentTransfers } from '../../../api';
import TransferTimeline from '../../student/TransferTimeline';

export default function TransfersTab() {
  const { studentId } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true); setError(null);
      try {
        const res = await getStudentTransfers(studentId, { limit: 50 });
        if (!mounted) return;
        setItems(res.data || []);
      } catch (e) {
        console.error(e);
        if (mounted) setError('Failed to load transfers');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (studentId) load();
    return () => { mounted = false; };
  }, [studentId]);

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-lg font-medium mb-2">Transfers</h2>
      {loading && <div className="py-6 text-gray-600 flex items-center gap-2"><Spinner size={20} /> Loading…</div>}
      {error && <div className="py-4 text-red-600 text-sm">{error}</div>}
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
