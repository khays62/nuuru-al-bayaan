import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useAuth } from '../../../auth/AuthContext.jsx';
import { useI18n } from '../../../i18n/useI18n.js';
import Alert from '../../../shared/components/ui/Alert.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Card from '../../../shared/components/ui/Card.jsx';
import LoadingState from '../../../shared/components/ui/LoadingState.jsx';
import Skeleton from '../../../shared/components/ui/Skeleton.jsx';
import { emitPrivacyPolicyChanged } from '../../../utils/events.js';
import PrivacyPolicyAuditNotice from '../components/PrivacyPolicyAuditNotice.jsx';
import LoginProtectionPolicyCard from '../components/LoginProtectionPolicyCard.jsx';
import PasswordPolicyCard from '../components/PasswordPolicyCard.jsx';
import SessionExpiryPolicyCard from '../components/SessionExpiryPolicyCard.jsx';
import StudentDashboardTabsPolicyCard from '../components/StudentDashboardTabsPolicyCard.jsx';
import AiChatPolicyCard from '../components/AiChatPolicyCard.jsx';
import { getPrivacyPolicy, updatePrivacyPolicy } from '../api/privacyPolicyApi.js';
import { getResolvedPrivacyPolicy } from '../privacyPolicyDefaults.js';
import { privacyPolicyKeys } from '../queryKeys.js';
import { hasPrivacyPolicyErrors, validatePrivacyPolicyDraft } from '../privacyPolicyValidators.js';
import { usePrivacyPolicyRealtimeInvalidation } from '../usePrivacyPolicyRealtimeInvalidation.js';

function PolicySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-52 w-full rounded-xl" />
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-52 w-full rounded-xl" />
      <Skeleton className="h-52 w-full rounded-xl" />
    </div>
  );
}

export default function PrivacyControlPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [draft, setDraft] = React.useState(() => getResolvedPrivacyPolicy());

  usePrivacyPolicyRealtimeInvalidation({ enabled: true });

  const canEdit = typeof hasPermission === 'function' && hasPermission('security', 'edit');

  const policyQuery = useQuery({
    queryKey: privacyPolicyKeys.admin(),
    queryFn: async ({ signal }) => {
      const data = await getPrivacyPolicy({ signal });
      return data;
    },
    staleTime: 30_000,
  });

  React.useEffect(() => {
    if (policyQuery.data?.policy) {
      setDraft(getResolvedPrivacyPolicy(policyQuery.data.policy));
    }
  }, [policyQuery.data]);

  const errors = React.useMemo(() => validatePrivacyPolicyDraft(draft, t), [draft, t]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => updatePrivacyPolicy(payload),
    onSuccess: async (data) => {
      const next = getResolvedPrivacyPolicy(data?.policy || draft);
      queryClient.setQueryData(privacyPolicyKeys.admin(), { ...(data || {}), policy: next });
      emitPrivacyPolicyChanged({ source: 'local', ts: Date.now(), op: 'update' });
      toast.success(t('privacyControl.saved', { defaultValue: 'Privacy policy updated.' }));
      setDraft(next);
      await queryClient.invalidateQueries({ queryKey: privacyPolicyKeys.client(), refetchType: 'active' });
    },
    onError: (error) => {
      toast.error(error?.data?.message || error?.message || t('privacyControl.updateFailed', { defaultValue: 'Failed to update privacy policy.' }));
    },
  });

  const resetToSaved = () => {
    setDraft(getResolvedPrivacyPolicy(policyQuery.data?.policy || {}));
  };

  const handleSave = async () => {
    if (!canEdit) return;
    if (hasPrivacyPolicyErrors(errors)) {
      toast.error(t('privacyControl.validation.fixErrors', { defaultValue: 'Fix validation errors before saving.' }));
      return;
    }
    await saveMutation.mutateAsync(draft);
  };

  if (policyQuery.isLoading && !policyQuery.data) {
    return <PolicySkeleton />;
  }

  if (policyQuery.isError && !policyQuery.data) {
    return <Alert variant="danger" title={t('privacyControl.loadFailed', { defaultValue: 'Failed to load privacy policy.' })} className="py-3" />;
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border border-(--nb-color-border) bg-linear-to-r from-(--nb-color-brand-50) to-(--nb-color-accent-50) p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xl md:text-2xl font-semibold text-(--nb-color-fg)">{t('privacyControl.title', { defaultValue: 'Privacy Control' })}</div>
            <div className="text-sm text-(--nb-color-muted) mt-1">{t('privacyControl.subtitle', { defaultValue: 'Centralize password rules, login protection, session timeout, and student dashboard visibility.' })}</div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="neutral" onClick={resetToSaved} disabled={saveMutation.isPending}>
              {t('privacyControl.reset', { defaultValue: 'Reset' })}
            </Button>
            <Button type="button" variant="brand" onClick={handleSave} disabled={!canEdit || saveMutation.isPending}>
              {saveMutation.isPending
                ? t('privacyControl.saving', { defaultValue: 'Saving...' })
                : t('privacyControl.save', { defaultValue: 'Save changes' })}
            </Button>
          </div>
        </div>

        {!canEdit ? (
          <div className="mt-3 text-xs text-(--nb-color-muted)">{t('privacyControl.readOnly', { defaultValue: 'You can view this policy, but your account cannot edit it.' })}</div>
        ) : null}
      </Card>

      <PrivacyPolicyAuditNotice />

      {policyQuery.isFetching && !policyQuery.isLoading ? (
        <div className="rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg-card) px-4 py-3">
          <LoadingState label={t('privacyControl.refreshing', { defaultValue: 'Refreshing privacy policy...' })} className="border-0 bg-transparent p-0 justify-start" />
        </div>
      ) : null}

      <LoginProtectionPolicyCard value={draft.loginProtection} onChange={(next) => setDraft((prev) => ({ ...prev, loginProtection: next }))} errors={errors} disabled={!canEdit} />
      <PasswordPolicyCard value={draft.passwordPolicy} onChange={(next) => setDraft((prev) => ({ ...prev, passwordPolicy: next }))} errors={errors} disabled={!canEdit} />
      <SessionExpiryPolicyCard value={draft.sessionPolicy} onChange={(next) => setDraft((prev) => ({ ...prev, sessionPolicy: next }))} errors={errors} disabled={!canEdit} />
      <StudentDashboardTabsPolicyCard value={draft.studentDashboard} onChange={(next) => setDraft((prev) => ({ ...prev, studentDashboard: next }))} disabled={!canEdit} />
      <AiChatPolicyCard value={draft.aiChat} onChange={(next) => setDraft((prev) => ({ ...prev, aiChat: next }))} errors={errors} disabled={!canEdit} />
    </div>
  );
}