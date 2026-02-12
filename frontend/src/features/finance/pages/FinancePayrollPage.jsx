import React from 'react';
import PayrollManagement from '../components/PayrollManagement.jsx';
import { useFinanceRealtimeInvalidation } from '../useFinanceRealtimeInvalidation';

export default function FinancePayrollPage() {
  useFinanceRealtimeInvalidation();
  return (
    <div className="space-y-6">
      <PayrollManagement />
    </div>
  );
}
