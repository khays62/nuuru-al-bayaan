import React from 'react';
import StudentFees from '../components/StudentFees.jsx';
import { useFinanceRealtimeInvalidation } from '../useFinanceRealtimeInvalidation';

export default function FinanceStudentFinancePage() {
  useFinanceRealtimeInvalidation();

  return (
    <div className="space-y-6">
      <StudentFees />
    </div>
  );
}
