import React from 'react';
import AccountManagement from '../components/AccountManagement.jsx';
import { useFinanceRealtimeInvalidation } from '../useFinanceRealtimeInvalidation';

export default function FinanceAccountsPage() {
  useFinanceRealtimeInvalidation();
  return (
    <div className="space-y-6">
      <AccountManagement />
    </div>
  );
}
