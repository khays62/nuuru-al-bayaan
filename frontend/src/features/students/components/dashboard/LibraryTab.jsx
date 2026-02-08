import React from 'react';
import PrintHeader from '../../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../../shared/components/print/PrintFooter.jsx';
import Card from '../../../../shared/components/ui/Card.jsx';
import { useI18n } from '../../../../i18n/I18nProvider';

export default function LibraryTab() {
  const { t } = useI18n();
  return (
    <Card className="p-4 with-print-header with-print-footer">
      <PrintHeader />
      <h2 className="text-lg font-medium mb-2">{t('nav.library')}</h2>
      <p className="text-sm text-gray-600">{t('students.libraryTab.placeholder')}</p>
      <PrintFooter />
    </Card>
  );
}
