import React from 'react';
import Alert from '../../../shared/components/ui/Alert.jsx';
import { useI18n } from '../../../i18n/useI18n.js';

export default function PrivacyPolicyAuditNotice() {
  const { t } = useI18n();

  return (
    <Alert
      variant="info"
      title={t('privacyControl.auditNoticeTitle', { defaultValue: 'Audit notice' })}
      className="py-3"
    >
      <div className="text-sm text-(--nb-color-text)">
        {t('privacyControl.auditNoticeBody', { defaultValue: 'Changes to privacy policy are recorded and broadcast in realtime so all active dashboards can refresh safely.' })}
      </div>
    </Alert>
  );
}