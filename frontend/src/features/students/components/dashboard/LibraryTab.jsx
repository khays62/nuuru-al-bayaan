import React from 'react';
import PrintHeader from '../../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../../shared/components/print/PrintFooter.jsx';
import Card from '../../../../shared/components/ui/Card.jsx';

export default function LibraryTab() {
  return (
    <Card className="p-4 with-print-header with-print-footer">
      <PrintHeader />
      <h2 className="text-lg font-medium mb-2">Library</h2>
      <p className="text-sm text-gray-600">Library interactions (borrows/returns) will appear here.</p>
      <PrintFooter />
    </Card>
  );
}
