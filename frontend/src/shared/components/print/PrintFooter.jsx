import React from 'react';
import { useI18n } from '../../../i18n/useI18n';

export default function PrintFooter({ left = 'Nuuru Al-Bayaan', date, showPage = true }) {
  const { t } = useI18n();
  const printedOn = date || new Date().toLocaleString();
  return (
    <div className="print-only print-footer">
      <div style={{ justifySelf: 'start', textAlign: 'left' }}>{left}</div>
      <div style={{ justifySelf: 'center', textAlign: 'center' }}>{printedOn}</div>
      <div style={{ justifySelf: 'end', textAlign: 'right' }}>
        {showPage ? <>{t('common.page', { defaultValue: 'Page' })} <span className="pageNumber" /> {t('common.of', { defaultValue: 'of' })} <span className="totalPages" /></> : null}
      </div>
    </div>
  );
}
