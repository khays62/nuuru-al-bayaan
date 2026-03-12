import React from 'react';

import Card from '../../../shared/components/ui/Card.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox.jsx';
import { useI18n } from '../../../i18n/useI18n.js';
import { STUDENT_DASHBOARD_TABS } from '../privacyPolicyDefaults.js';

export default function StudentDashboardTabsPolicyCard({ value, onChange, disabled = false }) {
  const { t } = useI18n();

  const setField = (key, checked) => {
    onChange({ ...value, [key]: checked });
  };

  return (
    <Card className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden">
      <div className="px-5 py-3 border-b border-(--nb-color-border)">
        <div className="text-base font-semibold text-(--nb-color-text)">{t('privacyControl.studentDashboard.title', { defaultValue: 'Student dashboard visibility' })}</div>
        <div className="text-xs text-(--nb-color-muted) mt-1">{t('privacyControl.studentDashboard.subtitle', { defaultValue: 'Turning off a tab also hides its linked home card or widget automatically.' })}</div>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        {STUDENT_DASHBOARD_TABS.map((item) => (
          <label key={item.key} className="flex items-start gap-3 rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-3">
            <Checkbox checked={value?.[item.key] !== false} disabled={disabled} onChange={(e) => setField(item.key, e.target.checked)} />
            <div>
              <div className="text-sm font-medium text-(--nb-color-text)">{t(item.labelKey, { defaultValue: item.key })}</div>
              <div className="text-xs text-(--nb-color-muted)">
                {item.hasHomeWidget
                  ? t('privacyControl.studentDashboard.withWidget', { defaultValue: 'Also controls linked home widget.' })
                  : item.hasShortcutCard
                    ? t('privacyControl.studentDashboard.withShortcut', { defaultValue: 'Also controls linked shortcut card.' })
                    : t('privacyControl.studentDashboard.routeOnly', { defaultValue: 'Controls sidebar and route visibility.' })}
              </div>
            </div>
          </label>
        ))}
      </div>
    </Card>
  );
}