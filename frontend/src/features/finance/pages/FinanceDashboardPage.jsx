import React from 'react';
import FinanceDashboard from '../components/FinanceDashboard.jsx';
import { useFinanceRealtimeInvalidation } from '../useFinanceRealtimeInvalidation.js';

export default function FinanceDashboardPage() {
  useFinanceRealtimeInvalidation();
  return (
    <div className="space-y-6">
      <FinanceDashboard />
    </div>
  );
}
