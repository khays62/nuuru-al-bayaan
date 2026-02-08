import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import EmptyState from '../../../../shared/components/ui/EmptyState.jsx';
import { getStudentTransfers } from '../../../../api';
import TransferTimeline from '../TransferTimeline';
import { useAuth } from '../../../../auth/AuthContext';
import { studentKeys } from '../../queryKeys';
import Button from '../../../../shared/components/ui/Button.jsx';
import Card from '../../../../shared/components/ui/Card.jsx';
import Alert from '../../../../shared/components/ui/Alert.jsx';
import LoadingState from '../../../../shared/components/ui/LoadingState.jsx';
import { useI18n } from '../../../../i18n/I18nProvider';

export default function TransfersTab() {
  const { studentId: paramStudentId } = useParams();
  const { auth } = useAuth();
  const { t } = useI18n();

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
  const error = transfersQuery.isError ? t('students.transfersTab.loadFailed') : null;

  return (
    <Card className="p-4">
      <h2 className="text-lg font-medium mb-2">{t('nav.transfers')}</h2>
      {loading && (
        <div className="py-6">
          <LoadingState label={t('common.loading')} className="border-0 bg-transparent p-0 justify-start" />
        </div>
      )}
      {error && (
        <Alert variant="danger" className="py-3 flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button type="button" size="sm" variant="brand" onClick={() => transfersQuery.refetch()}>
            {t('common.retry')}
          </Button>
        </Alert>
      )}
      {!loading && !error && (
        items.length === 0 ? (
          <EmptyState title={t('students.transfersTab.emptyTitle')} description={t('students.transfersTab.emptyDescription')} />
        ) : (
          <TransferTimeline logs={items} />
        )
      )}
    </Card>
  );
}
