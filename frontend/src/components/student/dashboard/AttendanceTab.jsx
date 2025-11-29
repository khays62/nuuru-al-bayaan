import React from 'react';
import PrintHeader from '../../print/PrintHeader';
import PrintFooter from '../../print/PrintFooter';

export default function AttendanceTab() {
  return (
    <div className="bg-white p-4 rounded shadow with-print-header with-print-footer">
      <PrintHeader />
      <h2 className="text-lg font-medium mb-2">Attendance</h2>
      <p className="text-sm text-gray-600">Attendance records will appear here.</p>
      <PrintFooter />
    </div>
  );
}
