import React from 'react';
import ExpenseManagement from '../components/ExpenseManagement.jsx';
import { useFinanceRealtimeInvalidation } from '../useFinanceRealtimeInvalidation';

export default function FinanceExpensesPage() {
  useFinanceRealtimeInvalidation();
  return (
    <div className="space-y-6">
      <ExpenseManagement />
    </div>
  );
}
